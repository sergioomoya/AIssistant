"""
AIssistant - Servicio de Redacción de PII
=========================================
Redacta información personal identificable (PII) usando Microsoft Presidio.
"""

from typing import Dict, List, Optional
import structlog

logger = structlog.get_logger()


class PIIScrubber:
    """
    Servicio para detectar y redactar PII en texto.
    
    Usa Microsoft Presidio para detectar:
    - DNI/NIE/NIF
    - Emails
    - Teléfonos
    - Tarjetas de crédito
    - Direcciones
    - Nombres de personas
    - Fechas de nacimiento
    """
    
    def __init__(self):
        """Inicializar analizador y anonimizador de Presidio."""
        self.analyzer = None
        self.anonymizer = None
        self._initialized = False
    
    async def _initialize(self):
        """Inicializar Presidio de forma asíncrona."""
        if self._initialized:
            return
        
        try:
            from presidio_analyzer import AnalyzerEngine
            from presidio_anonymizer import AnonymizerEngine
            
            # Inicializar analizador
            self.analyzer = AnalyzerEngine()
            
            # Inicializar anonimizador
            self.anonymizer = AnonymizerEngine()
            
            self._initialized = True
            logger.info("Presidio inicializado correctamente")
            
        except ImportError:
            logger.warning("Presidio no instalado. Redacción de PII deshabilitada.")
            self._initialized = True
        except Exception as e:
            logger.error("Error inicializando Presidio", error=str(e))
            self._initialized = True
    
    async def scrub_text(
        self,
        text: str,
        language: str = "es",
        entities: Optional[List[str]] = None
    ) -> Dict[str, any]:
        """
        Redactar PII de un texto.
        
        Args:
            text: Texto a analizar
            language: Idioma del texto (es, en, etc.)
            entities: Lista de entidades a detectar (None = todas)
            
        Returns:
            Dict con:
            - "scrubbed_text": Texto con PII redactado
            - "entities_found": Lista de entidades detectadas
            - "redaction_count": Número de redacciones realizadas
        """
        await self._initialize()
        
        if not self.analyzer or not self.anonymizer:
            # Si Presidio no está disponible, retornar texto original
            return {
                "scrubbed_text": text,
                "entities_found": [],
                "redaction_count": 0,
            }
        
        try:
            import asyncio
            
            # Presidio es síncrono, ejecutar en thread pool
            loop = asyncio.get_event_loop()
            
            def _sync_analyze():
                # Analizar texto
                results = self.analyzer.analyze(
                    text=text,
                    language=language,
                    entities=entities or None,
                )
                
                # Anonimizar
                anonymized = self.anonymizer.anonymize(
                    text=text,
                    analyzer_results=results,
                )
                
                return anonymized, results
            
            anonymized, results = await loop.run_in_executor(None, _sync_analyze)
            
            # Extraer entidades encontradas
            entities_found = [
                {
                    "type": result.entity_type,
                    "start": result.start,
                    "end": result.end,
                    "score": result.score,
                }
                for result in results
            ]
            
            logger.info(
                "PII redactado",
                entities_count=len(entities_found),
                language=language
            )
            
            return {
                "scrubbed_text": anonymized.text,
                "entities_found": entities_found,
                "redaction_count": len(entities_found),
            }
            
        except Exception as e:
            logger.error("Error redactando PII", error=str(e))
            # En caso de error, retornar texto original
            return {
                "scrubbed_text": text,
                "entities_found": [],
                "redaction_count": 0,
            }
    
    async def scrub_transcript(self, transcript_text: str, language: str = "es") -> str:
        """
        Redactar PII de una transcripción completa.
        
        Args:
            transcript_text: Texto de la transcripción
            language: Idioma de la transcripción
            
        Returns:
            Texto con PII redactado
        """
        result = await self.scrub_text(transcript_text, language)
        return result["scrubbed_text"]


# Instancia global
_pii_scrubber: Optional[PIIScrubber] = None


async def get_pii_scrubber() -> PIIScrubber:
    """Obtener instancia singleton del redactor de PII."""
    global _pii_scrubber
    if _pii_scrubber is None:
        _pii_scrubber = PIIScrubber()
        await _pii_scrubber._initialize()
    return _pii_scrubber

