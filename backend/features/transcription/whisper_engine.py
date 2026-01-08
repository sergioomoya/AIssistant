"""
AIssistant - Motor de Transcripción Whisper
===========================================
Wrapper para Whisper (OpenAI) y faster-whisper.
"""

import asyncio
from typing import Optional, Dict, List, Any
from pathlib import Path
import numpy as np
import structlog

from core.config import settings

logger = structlog.get_logger()


class WhisperEngine:
    """
    Motor de transcripción basado en Whisper.
    
    Soporta:
    - Whisper original de OpenAI
    - faster-whisper (CTranslate2) para mejor rendimiento
    """
    
    def __init__(self):
        self.model = None
        self.model_size = settings.WHISPER_MODEL_SIZE
        self.device = settings.WHISPER_DEVICE
        self.compute_type = settings.WHISPER_COMPUTE_TYPE
        self._initialized = False
    
    async def initialize(self):
        """Cargar modelo de Whisper de forma asíncrona."""
        if self._initialized:
            return
        
        logger.info(
            "Inicializando motor Whisper",
            model_size=self.model_size,
            device=self.device
        )
        
        # Ejecutar carga en thread pool para no bloquear
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._load_model)
        
        self._initialized = True
        logger.info("Motor Whisper inicializado correctamente")
    
    def _load_model(self):
        """Cargar modelo de Whisper (sincrónico)."""
        try:
            # Intentar usar faster-whisper primero (más rápido)
            from faster_whisper import WhisperModel
            
            # Determinar dispositivo
            device = self.device
            if device == "auto":
                import torch
                device = "cuda" if torch.cuda.is_available() else "cpu"
            
            self.model = WhisperModel(
                self.model_size,
                device=device,
                compute_type=self.compute_type,
                download_root=settings.MODELS_PATH
            )
            self._use_faster_whisper = True
            
            logger.info(
                "Usando faster-whisper",
                device=device,
                compute_type=self.compute_type
            )
            
        except ImportError:
            # Fallback a whisper original
            import whisper
            
            self.model = whisper.load_model(
                self.model_size,
                download_root=settings.MODELS_PATH
            )
            self._use_faster_whisper = False
            
            logger.info("Usando whisper original")
    
    async def transcribe_file(
        self,
        audio_path: str,
        language: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Transcribir archivo de audio completo.
        
        Args:
            audio_path: Ruta al archivo de audio
            language: Código de idioma ISO (None = auto-detect)
            
        Returns:
            Dict con transcripción y metadatos
        """
        if not self._initialized:
            await self.initialize()
        
        loop = asyncio.get_event_loop()
        
        if self._use_faster_whisper:
            result = await loop.run_in_executor(
                None,
                self._transcribe_faster_whisper,
                audio_path,
                language
            )
        else:
            result = await loop.run_in_executor(
                None,
                self._transcribe_whisper,
                audio_path,
                language
            )
        
        return result
    
    def _transcribe_faster_whisper(
        self,
        audio_path: str,
        language: Optional[str]
    ) -> Dict[str, Any]:
        """Transcripción con faster-whisper."""
        segments, info = self.model.transcribe(
            audio_path,
            language=language if language != "auto" else None,
            beam_size=5,
            word_timestamps=True,
            vad_filter=True
        )
        
        # Procesar segmentos
        transcript_segments = []
        full_text_parts = []
        
        for segment in segments:
            transcript_segments.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip(),
                "confidence": segment.avg_logprob,
                "words": [
                    {
                        "word": word.word,
                        "start": word.start,
                        "end": word.end,
                        "probability": word.probability
                    }
                    for word in (segment.words or [])
                ]
            })
            full_text_parts.append(segment.text.strip())
        
        return {
            "full_text": " ".join(full_text_parts),
            "segments": transcript_segments,
            "language": info.language,
            "language_probability": info.language_probability,
            "duration": info.duration
        }
    
    def _transcribe_whisper(
        self,
        audio_path: str,
        language: Optional[str]
    ) -> Dict[str, Any]:
        """Transcripción con whisper original."""
        result = self.model.transcribe(
            audio_path,
            language=language if language != "auto" else None,
            word_timestamps=True,
            verbose=False
        )
        
        # Procesar segmentos
        transcript_segments = []
        
        for segment in result["segments"]:
            transcript_segments.append({
                "start": segment["start"],
                "end": segment["end"],
                "text": segment["text"].strip(),
                "confidence": segment.get("avg_logprob", 0),
                "words": segment.get("words", [])
            })
        
        return {
            "full_text": result["text"],
            "segments": transcript_segments,
            "language": result["language"],
            "language_probability": result.get("language_probability", 1.0),
            "duration": result["segments"][-1]["end"] if result["segments"] else 0
        }
    
    async def transcribe_chunk(
        self,
        audio_data: np.ndarray,
        sample_rate: int = 16000
    ) -> Optional[Dict[str, Any]]:
        """
        Transcribir chunk de audio para streaming en tiempo real.
        
        Args:
            audio_data: Array numpy con datos de audio
            sample_rate: Frecuencia de muestreo
            
        Returns:
            Dict con transcripción parcial o None si no hay speech
        """
        if not self._initialized:
            await self.initialize()
        
        # Asegurar formato correcto
        if audio_data.dtype != np.float32:
            audio_data = audio_data.astype(np.float32)
        
        # Normalizar si es necesario
        if audio_data.max() > 1.0:
            audio_data = audio_data / 32768.0
        
        loop = asyncio.get_event_loop()
        
        if self._use_faster_whisper:
            result = await loop.run_in_executor(
                None,
                self._transcribe_chunk_faster,
                audio_data
            )
        else:
            result = await loop.run_in_executor(
                None,
                self._transcribe_chunk_whisper,
                audio_data
            )
        
        return result
    
    def _transcribe_chunk_faster(self, audio_data: np.ndarray) -> Optional[Dict]:
        """Transcribir chunk con faster-whisper."""
        segments, info = self.model.transcribe(
            audio_data,
            beam_size=3,
            without_timestamps=True,
            vad_filter=True
        )
        
        text_parts = []
        for segment in segments:
            text_parts.append(segment.text.strip())
        
        if not text_parts:
            return None
        
        return {
            "text": " ".join(text_parts),
            "language": info.language,
            "confidence": info.language_probability
        }
    
    def _transcribe_chunk_whisper(self, audio_data: np.ndarray) -> Optional[Dict]:
        """Transcribir chunk con whisper original."""
        result = self.model.transcribe(
            audio_data,
            fp16=False,
            verbose=False
        )
        
        if not result["text"].strip():
            return None
        
        return {
            "text": result["text"].strip(),
            "language": result["language"],
            "confidence": result.get("language_probability", 1.0)
        }

