"""
AIssistant - Endpoints de Exportación
=====================================
Exportar transcripciones y resúmenes a diferentes formatos.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import io
import structlog

from core.database import get_db
from core.security import get_current_user
from core.config import settings
from models.meeting import Meeting
from models.transcript import Transcript
from models.action_item import ActionItem
from features.export.document_generator import DocumentGenerator

router = APIRouter()
logger = structlog.get_logger()


# ========== Schemas ==========

class ExportRequest(BaseModel):
    """Schema para solicitud de exportación."""
    format: str = "docx"  # docx, txt, md, pdf
    include_transcript: bool = True
    include_summary: bool = True
    include_action_items: bool = True
    include_timestamps: bool = False


class ClipRequest(BaseModel):
    """Schema para crear clip de transcripción."""
    start_time: float
    end_time: float
    title: str
    description: Optional[str] = None


# ========== Endpoints ==========

@router.post("/{meeting_id}")
async def export_meeting(
    meeting_id: int,
    request: ExportRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Exportar reunión a archivo.
    
    Formatos soportados:
    - **docx**: Microsoft Word
    - **txt**: Texto plano
    - **md**: Markdown
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
    
    # Obtener transcripción si se solicita
    transcript_text = None
    if request.include_transcript:
        result = await db.execute(
            select(Transcript).where(Transcript.meeting_id == meeting_id)
        )
        transcript = result.scalar_one_or_none()
        if transcript:
            transcript_text = transcript.edited_text or transcript.full_text
    
    # Obtener action items si se solicitan
    action_items_list = []
    if request.include_action_items:
        result = await db.execute(
            select(ActionItem).where(ActionItem.meeting_id == meeting_id)
        )
        action_items_list = result.scalars().all()
    
    # Generar documento
    generator = DocumentGenerator()
    
    content = await generator.generate(
        format=request.format,
        meeting_title=meeting.title,
        meeting_date=meeting.actual_start or meeting.scheduled_start,
        summary=meeting.summary if request.include_summary else None,
        key_points=meeting.key_points if request.include_summary else None,
        decisions=meeting.decisions if request.include_summary else None,
        transcript=transcript_text,
        action_items=[
            {
                "title": item.title,
                "assignee": item.assignee_name,
                "due_date": str(item.due_date) if item.due_date else None,
                "status": item.status
            }
            for item in action_items_list
        ],
        include_timestamps=request.include_timestamps
    )
    
    # Determinar nombre de archivo y tipo MIME
    filename = f"AIssistant_{meeting.title[:30]}_{meeting_id}"
    
    mime_types = {
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "txt": "text/plain",
        "md": "text/markdown",
        "pdf": "application/pdf"
    }
    
    extensions = {
        "docx": ".docx",
        "txt": ".txt",
        "md": ".md",
        "pdf": ".pdf"
    }
    
    logger.info(
        "Documento exportado",
        meeting_id=meeting_id,
        format=request.format
    )
    
    return StreamingResponse(
        io.BytesIO(content),
        media_type=mime_types.get(request.format, "application/octet-stream"),
        headers={
            "Content-Disposition": f"attachment; filename={filename}{extensions.get(request.format, '')}"
        }
    )


@router.post("/{meeting_id}/clip")
async def create_clip(
    meeting_id: int,
    clip: ClipRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crear clip/momento destacado de una reunión.
    
    Selecciona un fragmento de la transcripción para compartir.
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
    
    # Obtener segmentos de transcripción en el rango
    from models.meeting import MeetingSegment
    
    segment = MeetingSegment(
        meeting_id=meeting_id,
        start_time=clip.start_time,
        end_time=clip.end_time,
        title=clip.title,
        description=clip.description,
        segment_type="highlight",
        created_by="user"
    )
    
    db.add(segment)
    await db.commit()
    await db.refresh(segment)
    
    return {
        "message": "Clip creado correctamente",
        "clip_id": segment.id,
        "title": segment.title,
        "duration_seconds": clip.end_time - clip.start_time
    }


@router.get("/{meeting_id}/clips")
async def get_meeting_clips(
    meeting_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtener clips/momentos destacados de una reunión."""
    from models.meeting import MeetingSegment
    
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
    
    # Obtener clips
    result = await db.execute(
        select(MeetingSegment).where(
            MeetingSegment.meeting_id == meeting_id,
            MeetingSegment.segment_type == "highlight"
        )
    )
    clips = result.scalars().all()
    
    return [
        {
            "id": clip.id,
            "title": clip.title,
            "description": clip.description,
            "start_time": clip.start_time,
            "end_time": clip.end_time,
            "created_by": clip.created_by,
            "created_at": clip.created_at
        }
        for clip in clips
    ]

