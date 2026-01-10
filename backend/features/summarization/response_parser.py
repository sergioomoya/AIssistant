"""
AIssistant - Parser Robusto de Respuestas LLM
=============================================
Extracción robusta de JSON desde respuestas de LLM que pueden
contener texto adicional, markdown, o formatos mixtos.
"""

import json
import re
from typing import Any, Dict, List, Optional, TypeVar, Type
from pydantic import BaseModel, Field, ValidationError
import structlog

logger = structlog.get_logger()

T = TypeVar('T', bound=BaseModel)


# ============================================
# Schemas Pydantic para respuestas estructuradas
# ============================================

class ActionItem(BaseModel):
    """Elemento de acción extraído de una reunión."""
    title: str = Field(..., description="Descripción corta de la tarea")
    description: Optional[str] = Field(None, description="Detalles adicionales")
    assignee: Optional[str] = Field(None, description="Persona responsable")
    due_date: Optional[str] = Field(None, description="Fecha límite YYYY-MM-DD")
    priority: Optional[str] = Field("medium", description="Prioridad: high, medium, low")


class MeetingSummary(BaseModel):
    """Resumen estructurado de una reunión."""
    summary: str = Field(..., description="Resumen ejecutivo de la reunión")
    key_points: List[str] = Field(default_factory=list, description="Puntos clave discutidos")
    decisions: List[str] = Field(default_factory=list, description="Decisiones tomadas")
    action_items: List[ActionItem] = Field(default_factory=list, description="Elementos de acción")
    participants: List[str] = Field(default_factory=list, description="Participantes identificados")
    next_steps: List[str] = Field(default_factory=list, description="Próximos pasos")
    topics: List[str] = Field(default_factory=list, description="Temas principales")


class SentimentAnalysis(BaseModel):
    """Análisis de sentimiento."""
    sentiment: str = Field(..., description="positive, neutral, negative, mixed")
    score: float = Field(..., ge=0, le=1, description="Score 0-1")
    explanation: Optional[str] = Field(None, description="Explicación del análisis")


# ============================================
# Funciones de extracción de JSON
# ============================================

def extract_json_from_text(text: str) -> Optional[str]:
    """
    Extraer JSON de texto que puede contener markdown u otro contenido.
    
    Intenta múltiples estrategias:
    1. Buscar bloques de código JSON ```json ... ```
    2. Buscar el primer { o [ y encontrar su cierre correspondiente
    3. Intentar parsear el texto completo
    """
    if not text:
        return None
    
    text = text.strip()
    
    # Estrategia 1: Buscar bloques de código markdown
    json_block_patterns = [
        r'```json\s*([\s\S]*?)\s*```',
        r'```\s*([\s\S]*?)\s*```',
    ]
    
    for pattern in json_block_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            if match.strip().startswith(('{', '[')):
                return match.strip()
    
    # Estrategia 2: Encontrar JSON balanceado
    # Buscar el primer { o [
    start_obj = text.find('{')
    start_arr = text.find('[')
    
    if start_obj == -1 and start_arr == -1:
        return None
    
    # Elegir el que aparezca primero
    if start_obj == -1:
        start = start_arr
        open_char, close_char = '[', ']'
    elif start_arr == -1:
        start = start_obj
        open_char, close_char = '{', '}'
    else:
        if start_obj < start_arr:
            start = start_obj
            open_char, close_char = '{', '}'
        else:
            start = start_arr
            open_char, close_char = '[', ']'
    
    # Encontrar el cierre balanceado
    depth = 0
    in_string = False
    escape_next = False
    
    for i, char in enumerate(text[start:], start):
        if escape_next:
            escape_next = False
            continue
        
        if char == '\\':
            escape_next = True
            continue
        
        if char == '"' and not escape_next:
            in_string = not in_string
            continue
        
        if in_string:
            continue
        
        if char == open_char:
            depth += 1
        elif char == close_char:
            depth -= 1
            if depth == 0:
                return text[start:i + 1]
    
    # Si no encontramos cierre, devolver desde el inicio hasta el final
    return text[start:]


def parse_json_safely(text: str) -> Optional[Dict[str, Any]]:
    """
    Parsear JSON de forma segura, manejando errores comunes.
    """
    if not text:
        return None
    
    # Extraer JSON del texto
    json_str = extract_json_from_text(text)
    if not json_str:
        return None
    
    # Intentar parsear directamente
    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        pass
    
    # Limpiar problemas comunes
    cleaned = json_str
    
    # Remover trailing commas antes de } o ]
    cleaned = re.sub(r',\s*([}\]])', r'\1', cleaned)
    
    # Reemplazar single quotes por double quotes (cuidado con contenido)
    # Solo si no hay double quotes
    if '"' not in cleaned and "'" in cleaned:
        cleaned = cleaned.replace("'", '"')
    
    # Intentar de nuevo
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.warning("Error parseando JSON", error=str(e), text_preview=json_str[:200])
        return None


def parse_with_schema(
    text: str,
    schema: Type[T],
    fallback: Optional[T] = None
) -> T:
    """
    Parsear respuesta LLM y validar contra schema Pydantic.
    
    Args:
        text: Respuesta del LLM
        schema: Clase Pydantic para validación
        fallback: Valor por defecto si falla el parsing
        
    Returns:
        Instancia validada del schema o fallback
    """
    parsed = parse_json_safely(text)
    
    if parsed is None:
        if fallback is not None:
            return fallback
        # Intentar crear instancia con valores mínimos
        try:
            return schema()
        except ValidationError:
            raise ValueError(f"No se pudo parsear respuesta y no hay fallback: {text[:200]}")
    
    try:
        return schema(**parsed)
    except ValidationError as e:
        logger.warning(
            "Respuesta LLM no coincide con schema",
            schema=schema.__name__,
            errors=str(e),
            parsed_preview=str(parsed)[:200]
        )
        
        # Intentar mapear campos conocidos
        if isinstance(parsed, dict):
            # Intentar con campos parciales
            valid_fields = {}
            for field_name, field_info in schema.model_fields.items():
                if field_name in parsed:
                    valid_fields[field_name] = parsed[field_name]
            
            try:
                return schema(**valid_fields)
            except ValidationError:
                pass
        
        if fallback is not None:
            return fallback
        
        raise


def parse_meeting_summary(text: str) -> MeetingSummary:
    """
    Parsear respuesta de resumen de reunión con fallback robusto.
    """
    fallback = MeetingSummary(
        summary=text[:1000] if text else "No se pudo generar resumen",
        key_points=[],
        decisions=[],
        action_items=[],
    )
    
    return parse_with_schema(text, MeetingSummary, fallback)


def parse_action_items(text: str) -> List[ActionItem]:
    """
    Parsear lista de action items desde respuesta LLM.
    """
    parsed = parse_json_safely(text)
    
    if parsed is None:
        return []
    
    # Si es un dict con key 'action_items' o similar
    if isinstance(parsed, dict):
        for key in ['action_items', 'actions', 'items', 'tasks']:
            if key in parsed and isinstance(parsed[key], list):
                parsed = parsed[key]
                break
        else:
            # No encontramos lista, devolver vacío
            return []
    
    if not isinstance(parsed, list):
        return []
    
    # Validar cada item
    items = []
    for item in parsed:
        if isinstance(item, dict):
            try:
                items.append(ActionItem(**item))
            except ValidationError:
                # Intentar con campos mínimos
                if 'title' in item or 'description' in item:
                    items.append(ActionItem(
                        title=item.get('title') or item.get('description', 'Tarea sin título'),
                        description=item.get('description'),
                        assignee=item.get('assignee') or item.get('responsible'),
                        due_date=item.get('due_date') or item.get('deadline'),
                    ))
    
    return items


def parse_sentiment(text: str) -> SentimentAnalysis:
    """
    Parsear análisis de sentimiento con fallback.
    """
    fallback = SentimentAnalysis(
        sentiment="neutral",
        score=0.5,
        explanation="No se pudo analizar el sentimiento"
    )
    
    return parse_with_schema(text, SentimentAnalysis, fallback)


# ============================================
# Prompts optimizados para JSON output
# ============================================

MEETING_SUMMARY_JSON_PROMPT = """Analiza la transcripción y genera un resumen estructurado.

IMPORTANTE: Tu respuesta DEBE ser ÚNICAMENTE un objeto JSON válido, sin texto adicional.

Formato requerido:
```json
{
  "summary": "Resumen ejecutivo de 2-3 párrafos",
  "key_points": ["punto 1", "punto 2", ...],
  "decisions": ["decisión 1", "decisión 2", ...],
  "action_items": [
    {
      "title": "descripción corta",
      "assignee": "persona responsable o null",
      "due_date": "YYYY-MM-DD o null",
      "priority": "high/medium/low"
    }
  ],
  "topics": ["tema 1", "tema 2", ...],
  "next_steps": ["paso 1", "paso 2", ...]
}
```"""

ACTION_ITEMS_JSON_PROMPT = """Extrae los elementos de acción de la transcripción.

IMPORTANTE: Tu respuesta DEBE ser ÚNICAMENTE un array JSON válido, sin texto adicional.

Formato requerido:
```json
[
  {
    "title": "descripción corta de la tarea",
    "description": "detalles adicionales o null",
    "assignee": "persona responsable o null",
    "due_date": "YYYY-MM-DD o null",
    "priority": "high/medium/low"
  }
]
```"""

SENTIMENT_JSON_PROMPT = """Analiza el sentimiento general de la conversación.

IMPORTANTE: Tu respuesta DEBE ser ÚNICAMENTE un objeto JSON válido, sin texto adicional.

Formato requerido:
```json
{
  "sentiment": "positive/neutral/negative/mixed",
  "score": 0.0 a 1.0,
  "explanation": "breve explicación"
}
```"""

