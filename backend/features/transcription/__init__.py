"""Transcription feature - Motor de transcripción y procesamiento de audio."""

from features.transcription.whisper_engine import WhisperEngine
from features.transcription.realtime_transcriber import RealtimeTranscriber

__all__ = ["WhisperEngine", "RealtimeTranscriber"]

