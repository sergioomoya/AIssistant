"""
AIssistant - Transcriptor en Tiempo Real
========================================
Procesamiento de audio en streaming con VAD y diarización básica.
"""

import asyncio
from typing import Optional, Dict, List
from collections import deque
import numpy as np
import structlog

from core.config import settings
from features.transcription.whisper_engine import WhisperEngine

logger = structlog.get_logger()


class RealtimeTranscriber:
    """
    Transcriptor en tiempo real con buffer de audio y VAD.
    
    Características:
    - Buffer circular para acumular audio
    - Voice Activity Detection básico
    - Distinción entre audio del usuario y otros (diarización simple)
    """
    
    # Constantes de configuración
    SAMPLE_RATE = 16000
    CHUNK_DURATION_MS = 3000  # Procesar cada 3 segundos
    MIN_SPEECH_DURATION_MS = 500  # Mínimo para considerar speech
    SILENCE_THRESHOLD = 0.01  # Umbral de silencio
    
    def __init__(self, whisper_engine: WhisperEngine):
        self.engine = whisper_engine
        
        # Buffer de audio
        chunk_samples = int(self.SAMPLE_RATE * self.CHUNK_DURATION_MS / 1000)
        self.audio_buffer = deque(maxlen=chunk_samples * 2)  # 2x para overlap
        
        # Estado de transcripción
        self.current_time = 0.0
        self.last_speech_end = 0.0
        self.partial_text = ""
        
        # Historial de segmentos
        self.segments: List[Dict] = []
        
        # Estadísticas
        self.total_speech_time = 0.0
        self.total_silence_time = 0.0
    
    async def process_chunk(
        self,
        audio_bytes: bytes,
        is_user_audio: bool = False
    ) -> Optional[Dict]:
        """
        Procesar chunk de audio recibido.
        
        Args:
            audio_bytes: Bytes de audio PCM 16-bit
            is_user_audio: True si viene del micrófono del usuario
            
        Returns:
            Dict con resultado de transcripción o None
        """
        # Convertir bytes a numpy array
        audio_data = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32)
        audio_data = audio_data / 32768.0  # Normalizar a [-1, 1]
        
        # Agregar al buffer
        self.audio_buffer.extend(audio_data)
        
        # Actualizar tiempo
        chunk_duration = len(audio_data) / self.SAMPLE_RATE
        self.current_time += chunk_duration
        
        # Detectar actividad de voz
        if not self._detect_speech(audio_data):
            self.total_silence_time += chunk_duration
            return None
        
        self.total_speech_time += chunk_duration
        
        # Verificar si tenemos suficiente audio para procesar
        min_samples = int(self.SAMPLE_RATE * self.CHUNK_DURATION_MS / 1000)
        if len(self.audio_buffer) < min_samples:
            return None
        
        # Extraer audio del buffer para procesar
        buffer_array = np.array(list(self.audio_buffer))
        
        # Transcribir
        try:
            result = await self.engine.transcribe_chunk(buffer_array)
            
            if result and result.get("text"):
                # Determinar si es transcripción parcial o final
                is_final = self._is_end_of_utterance(audio_data)
                
                segment = {
                    "type": "final" if is_final else "partial",
                    "text": result["text"],
                    "start_time": self.last_speech_end,
                    "end_time": self.current_time,
                    "speaker": "Tú" if is_user_audio else "Otro",
                    "confidence": result.get("confidence", 0.0),
                    "language": result.get("language", "unknown")
                }
                
                if is_final:
                    self.segments.append(segment)
                    self.last_speech_end = self.current_time
                    self.partial_text = ""
                    # Limpiar buffer tras segmento final
                    self.audio_buffer.clear()
                else:
                    self.partial_text = result["text"]
                
                return segment
                
        except Exception as e:
            logger.error("Error en transcripción de chunk", error=str(e))
        
        return None
    
    def _detect_speech(self, audio_data: np.ndarray) -> bool:
        """
        Detección simple de actividad de voz basada en energía.
        
        Args:
            audio_data: Array de audio normalizado
            
        Returns:
            True si se detecta voz
        """
        # Calcular energía RMS
        rms = np.sqrt(np.mean(audio_data ** 2))
        
        # Comparar con umbral
        return rms > self.SILENCE_THRESHOLD
    
    def _is_end_of_utterance(self, audio_data: np.ndarray) -> bool:
        """
        Detectar si el audio indica fin de frase/utterance.
        
        Heurística simple: baja energía al final del chunk
        """
        # Analizar último 20% del chunk
        tail_size = len(audio_data) // 5
        if tail_size == 0:
            return False
        
        tail = audio_data[-tail_size:]
        tail_rms = np.sqrt(np.mean(tail ** 2))
        
        # Si la energía al final es baja, probablemente terminó
        return tail_rms < self.SILENCE_THRESHOLD * 0.5
    
    def get_full_transcript(self) -> str:
        """Obtener transcripción completa acumulada."""
        texts = [seg["text"] for seg in self.segments]
        if self.partial_text:
            texts.append(f"[...{self.partial_text}]")
        return " ".join(texts)
    
    def get_stats(self) -> Dict:
        """Obtener estadísticas de la sesión."""
        total_time = self.total_speech_time + self.total_silence_time
        
        return {
            "total_duration_seconds": total_time,
            "speech_time_seconds": self.total_speech_time,
            "silence_time_seconds": self.total_silence_time,
            "speech_ratio": self.total_speech_time / total_time if total_time > 0 else 0,
            "segments_count": len(self.segments),
            "words_count": sum(len(seg["text"].split()) for seg in self.segments)
        }
    
    def reset(self):
        """Reiniciar estado del transcriptor."""
        self.audio_buffer.clear()
        self.current_time = 0.0
        self.last_speech_end = 0.0
        self.partial_text = ""
        self.segments.clear()
        self.total_speech_time = 0.0
        self.total_silence_time = 0.0

