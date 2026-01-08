"""
AIssistant - Endpoints de Resúmenes e Inteligencia IA
=====================================================
Generación de resúmenes, puntos clave, elementos de acción y análisis.
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import structlog

from core.database import get_db
from core.security import get_current_user
from core.config import settings
from models.meeting import Meeting, MeetingStatus
from models.transcript import Transcript
from models.action_item import ActionItem, ActionItemStatus
from features.summarization.llm_service import LLMService

router = APIRouter()
logger = structlog.get_logger()


# ========== Schemas ==========

class SummaryRequest(BaseModel):
    """Schema para solicitar generación de resumen."""
    custom_prompt: Optional[str] = None
    include_action_items: bool = True
    include_sentiment: bool = True
    max_length: Optional[int] = None


class SummaryResponse(BaseModel):
    """Schema de respuesta de resumen."""
    meeting_id: int
    summary: str
    key_points: List[str]
    decisions: List[str]
    sentiment: Optional[str]
    sentiment_score: Optional[float]


class ActionItemCreate(BaseModel):
    """Schema para crear elemento de acción manual."""
    title: str
    description: Optional[str] = None
    assignee_name: Optional[str] = None
    due_date: Optional[str] = None
    priority: str = "medium"


class ActionItemUpdate(BaseModel):
    """Schema para actualizar elemento de acción."""
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_name: Optional[str] = None
    due_date: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None


class ActionItemResponse(BaseModel):
    """Schema de respuesta de elemento de acción."""
    id: int
    meeting_id: int
    title: str
    description: Optional[str]
    assignee_name: Optional[str]
    due_date: Optional[str]
    status: str
    priority: str
    created_by: str
    
    class Config:
        from_attributes = True


class ChatMessage(BaseModel):
    """Schema para mensaje de chat con IA."""
    message: str
    context_type: str = "full"  # full, last_5_min, topic


class ChatResponse(BaseModel):
    """Schema de respuesta del chat con IA."""
    response: str
    sources: Optional[List[dict]] = None


# ========== Singleton de LLM Service ==========

_llm_service: Optional[LLMService] = None


async def get_llm_service() -> LLMService:
    """Obtener instancia singleton del servicio LLM."""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service


# ========== Endpoints ==========

@router.post("/{meeting_id}/generate", response_model=SummaryResponse)
async def generate_summary(
    meeting_id: int,
    request: SummaryRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generar resumen inteligente de una reunión.
    
    Incluye:
    - Resumen ejecutivo
    - Puntos clave
    - Decisiones tomadas
    - Análisis de sentimiento
    - Elementos de acción
    """
    # Verificar reunión
    result = await db.execute(
        select(Meeting).where(
            Meeting.id == meeting_id,
            Meeting.user_id == int(current_user["user_id"])
        )
    )
    meeting = result.scalar_one_or_none()
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Reunión no encontrada")
    
    # Obtener transcripción
    result = await db.execute(
        select(Transcript).where(Transcript.meeting_id == meeting_id)
    )
    transcript = result.scalar_one_or_none()
    
    if not transcript or not transcript.full_text:
        raise HTTPException(
            status_code=400,
            detail="No hay transcripción disponible para generar resumen"
        )
    
    # Generar resumen con LLM
    llm_service = await get_llm_service()
    
    summary_result = await llm_service.generate_meeting_summary(
        transcript_text=transcript.full_text,
        context=meeting.context_notes,
        custom_prompt=request.custom_prompt,
        max_length=request.max_length or settings.SUMMARY_MAX_TOKENS
    )
    
    # Actualizar reunión con resultados
    meeting.summary = summary_result["summary"]
    meeting.key_points = summary_result["key_points"]
    meeting.decisions = summary_result["decisions"]
    
    # Análisis de sentimiento si está habilitado
    if request.include_sentiment:
        sentiment_result = await llm_service.analyze_sentiment(transcript.full_text)
        meeting.sentiment = sentiment_result["sentiment"]
        meeting.sentiment_score = sentiment_result["score"]
    
    # Extraer elementos de acción si está habilitado
    if request.include_action_items:
        action_items = await llm_service.extract_action_items(transcript.full_text)
        
        for item in action_items:
            action = ActionItem(
                meeting_id=meeting_id,
                title=item["title"],
                description=item.get("description"),
                assignee_name=item.get("assignee"),
                due_date=item.get("due_date"),
                status=ActionItemStatus.PENDING.value,
                created_by="ai"
            )
            db.add(action)
    
    meeting.status = MeetingStatus.COMPLETED.value
    await db.commit()
    await db.refresh(meeting)
    
    logger.info("Resumen generado", meeting_id=meeting_id)
    
    return {
        "meeting_id": meeting_id,
        "summary": meeting.summary,
        "key_points": meeting.key_points or [],
        "decisions": meeting.decisions or [],
        "sentiment": meeting.sentiment,
        "sentiment_score": meeting.sentiment_score
    }


@router.get("/{meeting_id}/action-items", response_model=List[ActionItemResponse])
async def get_action_items(
    meeting_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtener elementos de acción de una reunión."""
    # Verificar reunión
    result = await db.execute(
        select(Meeting).where(
            Meeting.id == meeting_id,
            Meeting.user_id == int(current_user["user_id"])
        )
    )
    meeting = result.scalar_one_or_none()
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Reunión no encontrada")
    
    # Obtener action items
    result = await db.execute(
        select(ActionItem).where(ActionItem.meeting_id == meeting_id)
    )
    action_items = result.scalars().all()
    
    return action_items


@router.post("/{meeting_id}/action-items", response_model=ActionItemResponse)
async def create_action_item(
    meeting_id: int,
    item_data: ActionItemCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crear elemento de acción manual."""
    # Verificar reunión
    result = await db.execute(
        select(Meeting).where(
            Meeting.id == meeting_id,
            Meeting.user_id == int(current_user["user_id"])
        )
    )
    meeting = result.scalar_one_or_none()
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Reunión no encontrada")
    
    action_item = ActionItem(
        meeting_id=meeting_id,
        title=item_data.title,
        description=item_data.description,
        assignee_name=item_data.assignee_name,
        priority=item_data.priority,
        status=ActionItemStatus.PENDING.value,
        created_by="user"
    )
    
    db.add(action_item)
    await db.commit()
    await db.refresh(action_item)
    
    return action_item


@router.patch("/action-items/{item_id}", response_model=ActionItemResponse)
async def update_action_item(
    item_id: int,
    item_data: ActionItemUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Actualizar elemento de acción."""
    result = await db.execute(
        select(ActionItem).where(ActionItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Elemento de acción no encontrado")
    
    # Actualizar campos
    update_data = item_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)
    
    await db.commit()
    await db.refresh(item)
    
    return item


@router.post("/{meeting_id}/chat", response_model=ChatResponse)
async def chat_with_meeting(
    meeting_id: int,
    chat: ChatMessage,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Chat con IA sobre la reunión.
    
    Permite hacer preguntas como:
    - "Resume los últimos 5 minutos"
    - "¿Cuáles son los puntos de acción?"
    - "¿Se discutió el presupuesto?"
    """
    # Verificar reunión y obtener transcripción
    result = await db.execute(
        select(Meeting).where(
            Meeting.id == meeting_id,
            Meeting.user_id == int(current_user["user_id"])
        )
    )
    meeting = result.scalar_one_or_none()
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Reunión no encontrada")
    
    result = await db.execute(
        select(Transcript).where(Transcript.meeting_id == meeting_id)
    )
    transcript = result.scalar_one_or_none()
    
    if not transcript or not transcript.full_text:
        raise HTTPException(
            status_code=400,
            detail="No hay transcripción disponible"
        )
    
    # Obtener contexto según tipo
    context = transcript.full_text
    if chat.context_type == "last_5_min":
        # TODO: Implementar filtrado por tiempo
        pass
    
    # Generar respuesta con LLM
    llm_service = await get_llm_service()
    response = await llm_service.chat_about_meeting(
        transcript_text=context,
        user_message=chat.message,
        meeting_summary=meeting.summary
    )
    
    return {
        "response": response["answer"],
        "sources": response.get("sources")
    }

