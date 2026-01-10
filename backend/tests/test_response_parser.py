"""
AIssistant - Tests del Parser de Respuestas LLM
===============================================
Tests para el parsing robusto de respuestas JSON de LLMs.
"""

import pytest
from features.summarization.response_parser import (
    extract_json_from_text,
    parse_json_safely,
    parse_meeting_summary,
    parse_action_items,
    parse_sentiment,
    MeetingSummary,
    ActionItem,
    SentimentAnalysis,
)


class TestExtractJsonFromText:
    """Tests para extracción de JSON desde texto."""
    
    def test_extract_clean_json(self):
        """Test extraer JSON limpio."""
        text = '{"key": "value"}'
        result = extract_json_from_text(text)
        assert result == '{"key": "value"}'
    
    def test_extract_json_from_markdown_block(self):
        """Test extraer JSON de bloque markdown."""
        text = '''Aquí está el resultado:
```json
{"summary": "Este es el resumen", "key_points": ["punto 1"]}
```
Eso es todo.'''
        result = extract_json_from_text(text)
        assert '"summary"' in result
        assert '"key_points"' in result
    
    def test_extract_json_with_text_before(self):
        """Test extraer JSON con texto antes."""
        text = 'El análisis muestra: {"sentiment": "positive", "score": 0.8}'
        result = extract_json_from_text(text)
        assert '"sentiment"' in result
        assert '"positive"' in result
    
    def test_extract_json_array(self):
        """Test extraer array JSON."""
        text = '[{"title": "Tarea 1"}, {"title": "Tarea 2"}]'
        result = extract_json_from_text(text)
        assert result.startswith('[')
        assert '"Tarea 1"' in result
    
    def test_extract_nested_json(self):
        """Test extraer JSON anidado."""
        text = '{"outer": {"inner": {"value": 123}}}'
        result = extract_json_from_text(text)
        assert result == text
    
    def test_no_json_returns_none(self):
        """Test que texto sin JSON devuelve None."""
        text = 'Este es un texto sin JSON'
        result = extract_json_from_text(text)
        assert result is None


class TestParseJsonSafely:
    """Tests para parsing seguro de JSON."""
    
    def test_parse_valid_json(self):
        """Test parsear JSON válido."""
        text = '{"name": "test", "value": 42}'
        result = parse_json_safely(text)
        assert result == {"name": "test", "value": 42}
    
    def test_parse_json_with_trailing_comma(self):
        """Test parsear JSON con trailing comma."""
        text = '{"name": "test", "value": 42,}'
        result = parse_json_safely(text)
        assert result == {"name": "test", "value": 42}
    
    def test_parse_json_from_markdown(self):
        """Test parsear JSON desde markdown."""
        text = '''```json
{"result": true}
```'''
        result = parse_json_safely(text)
        assert result == {"result": True}
    
    def test_parse_invalid_returns_none(self):
        """Test que JSON inválido devuelve None."""
        text = 'not json at all'
        result = parse_json_safely(text)
        assert result is None


class TestParseMeetingSummary:
    """Tests para parsing de resúmenes de reunión."""
    
    def test_parse_complete_summary(self):
        """Test parsear resumen completo."""
        text = '''{
            "summary": "Reunión productiva",
            "key_points": ["Punto 1", "Punto 2"],
            "decisions": ["Decisión A"],
            "action_items": [{"title": "Tarea", "assignee": "Juan"}],
            "topics": ["Tema X"]
        }'''
        result = parse_meeting_summary(text)
        
        assert isinstance(result, MeetingSummary)
        assert result.summary == "Reunión productiva"
        assert len(result.key_points) == 2
        assert len(result.decisions) == 1
        assert len(result.action_items) == 1
    
    def test_parse_partial_summary(self):
        """Test parsear resumen parcial usa defaults."""
        text = '{"summary": "Solo resumen"}'
        result = parse_meeting_summary(text)
        
        assert result.summary == "Solo resumen"
        assert result.key_points == []
        assert result.action_items == []
    
    def test_parse_invalid_uses_fallback(self):
        """Test que texto inválido usa fallback."""
        text = "Este es texto sin JSON válido sobre la reunión."
        result = parse_meeting_summary(text)
        
        assert isinstance(result, MeetingSummary)
        assert "texto sin JSON" in result.summary


class TestParseActionItems:
    """Tests para parsing de action items."""
    
    def test_parse_action_items_array(self):
        """Test parsear array de action items."""
        text = '''[
            {"title": "Revisar código", "assignee": "Ana"},
            {"title": "Escribir docs", "due_date": "2026-01-15"}
        ]'''
        result = parse_action_items(text)
        
        assert len(result) == 2
        assert all(isinstance(item, ActionItem) for item in result)
        assert result[0].title == "Revisar código"
        assert result[0].assignee == "Ana"
        assert result[1].due_date == "2026-01-15"
    
    def test_parse_action_items_from_dict(self):
        """Test parsear action items desde dict con key."""
        text = '{"action_items": [{"title": "Tarea 1"}]}'
        result = parse_action_items(text)
        
        assert len(result) == 1
        assert result[0].title == "Tarea 1"
    
    def test_parse_empty_returns_empty_list(self):
        """Test que texto vacío devuelve lista vacía."""
        result = parse_action_items("")
        assert result == []
    
    def test_parse_invalid_returns_empty_list(self):
        """Test que JSON inválido devuelve lista vacía."""
        result = parse_action_items("no json here")
        assert result == []


class TestParseSentiment:
    """Tests para parsing de análisis de sentimiento."""
    
    def test_parse_complete_sentiment(self):
        """Test parsear sentimiento completo."""
        text = '{"sentiment": "positive", "score": 0.85, "explanation": "Tono optimista"}'
        result = parse_sentiment(text)
        
        assert isinstance(result, SentimentAnalysis)
        assert result.sentiment == "positive"
        assert result.score == 0.85
        assert result.explanation == "Tono optimista"
    
    def test_parse_invalid_uses_neutral_fallback(self):
        """Test que texto inválido usa fallback neutral."""
        text = "invalid json"
        result = parse_sentiment(text)
        
        assert result.sentiment == "neutral"
        assert result.score == 0.5


class TestRealWorldResponses:
    """Tests con respuestas reales de LLMs."""
    
    def test_gpt_style_response(self):
        """Test parsear respuesta estilo GPT con explicación."""
        text = '''Aquí está mi análisis de la reunión:

```json
{
  "summary": "La reunión cubrió el progreso del proyecto y los próximos pasos.",
  "key_points": [
    "El desarrollo va según lo planificado",
    "Se identificaron 2 riesgos menores"
  ],
  "decisions": ["Continuar con el plan actual"],
  "action_items": []
}
```

Espero que esto sea útil.'''
        
        result = parse_meeting_summary(text)
        assert "progreso del proyecto" in result.summary
        assert len(result.key_points) == 2
    
    def test_ollama_style_response(self):
        """Test parsear respuesta estilo Ollama (a veces sin formato)."""
        text = '''{"summary":"Reunión corta","key_points":["punto único"],"decisions":[],"action_items":[]}'''
        
        result = parse_meeting_summary(text)
        assert result.summary == "Reunión corta"
        assert len(result.key_points) == 1

