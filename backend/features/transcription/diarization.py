"""
AIssistant - Servicio de Diarización de Hablantes
==================================================
Identifica quién habla en cada momento del audio usando PyAnnote.
"""

import os
from typing import Dict, List, Optional
import structlog

from core.config import settings

logger = structlog.get_logger()


class DiarizationService:
    """
    Servicio para identificar y separar hablantes en audio.
    
    Usa PyAnnote Audio para diarización de hablantes.
    """
    
    def __init__(self, user_config: Optional[Dict] = None):
        """
        Inicializar pipeline de diarización.
        
        Args:
            user_config: Configuración del usuario con api_keys
        """
        self.pipeline = None
        self._initialized = False
        self.user_config = user_config or {}
    
    def _get_hf_token(self) -> Optional[str]:
        """Obtener token de HuggingFace del usuario o .env."""
        # Primero intentar desde la config del usuario
        user_keys = self.user_config.get('api_keys', {})
        if user_keys.get('huggingface'):
            return user_keys['huggingface']
        
        # Fallback a variables de entorno
        from core.config import settings
        return settings.HF_TOKEN or os.getenv("HF_TOKEN")
    
    async def _initialize(self):
        """Inicializar pipeline de forma asíncrona."""
        if self._initialized:
            return
        
        try:
            from pyannote.audio import Pipeline
            
            # Obtener token desde configuración del usuario o .env
            hf_token = self._get_hf_token()
            
            if not hf_token:
                logger.warning(
                    "HF_TOKEN no configurado. Diarización deshabilitada. "
                    "Obtén un token en https://huggingface.co/settings/tokens"
                )
                self._initialized = True
                return
            
            # Cargar pipeline de diarización
            self.pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=hf_token
            )
            
            # Mover a GPU si está disponible
            if settings.WHISPER_DEVICE == "cuda":
                self.pipeline = self.pipeline.to("cuda")
            
            self._initialized = True
            logger.info("Pipeline de diarización inicializado")
            
        except ImportError:
            logger.warning("pyannote.audio no instalado. Diarización deshabilitada.")
            self._initialized = True
        except Exception as e:
            logger.error("Error inicializando diarización", error=str(e))
            self._initialized = True
    
    async def run(self, audio_path: str) -> Dict:
        """
        Ejecutar diarización en archivo de audio.
        
        Args:
            audio_path: Ruta al archivo de audio
            
        Returns:
            Dict con segmentos de diarización:
            {
                "segments": [
                    {"start": 0.0, "end": 5.2, "speaker": "SPEAKER_00"},
                    ...
                ],
                "speakers": ["SPEAKER_00", "SPEAKER_01", ...]
            }
        """
        await self._initialize()
        
        if not self.pipeline:
            logger.warning("Pipeline no disponible, retornando diarización vacía")
            return {
                "segments": [],
                "speakers": []
            }
        
        try:
            import asyncio
            
            # PyAnnote es síncrono, ejecutar en thread pool
            loop = asyncio.get_event_loop()
            
            def _sync_diarize():
                diarization = self.pipeline(audio_path)
                return diarization
            
            diarization = await loop.run_in_executor(None, _sync_diarize)
            
            # Convertir a formato JSON serializable
            segments = []
            speakers = set()
            
            for turn, _, speaker in diarization.itertracks(yield_label=True):
                segments.append({
                    "start": turn.start,
                    "end": turn.end,
                    "speaker": speaker,
                })
                speakers.add(speaker)
            
            logger.info(
                "Diarización completada",
                audio_path=audio_path,
                segments_count=len(segments),
                speakers_count=len(speakers)
            )
            
            return {
                "segments": segments,
                "speakers": sorted(list(speakers)),
            }
            
        except Exception as e:
            logger.error("Error en diarización", error=str(e), audio_path=audio_path)
            return {
                "segments": [],
                "speakers": []
            }
    
    def get_speaker_for_time(
        self,
        start_time: float,
        end_time: float,
        diarization_result: Dict
    ) -> Optional[str]:
        """
        Obtener el hablante para un rango de tiempo específico.
        
        Args:
            start_time: Tiempo de inicio
            end_time: Tiempo de fin
            diarization_result: Resultado de diarización
            
        Returns:
            Nombre del hablante o None
        """
        if not diarization_result or not diarization_result.get("segments"):
            return None
        
        # Buscar segmento que contenga el tiempo medio
        mid_time = (start_time + end_time) / 2
        
        for segment in diarization_result["segments"]:
            if segment["start"] <= mid_time <= segment["end"]:
                return segment["speaker"]
        
        return None
    
    def get_speaker_count(self, diarization_result: Dict) -> int:
        """Obtener número de hablantes identificados."""
        if not diarization_result:
            return 0
        return len(diarization_result.get("speakers", []))

