"""
AIssistant - Servicio de Estadísticas de Reuniones
==================================================
Lógica de negocio para calcular estadísticas del dashboard.
"""

from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from models.meeting import Meeting
from models.action_item import ActionItem, ActionItemStatus


class MeetingStatsService:
    """Servicio para calcular estadísticas de reuniones."""
    
    def __init__(self, db: AsyncSession, user_id: int):
        self.db = db
        self.user_id = user_id
        self.now = datetime.utcnow()
        self.first_day_this_month = self.now.replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        self.first_day_last_month = (
            self.first_day_this_month - timedelta(days=1)
        ).replace(day=1)
    
    async def get_dashboard_stats(self) -> dict:
        """Obtener todas las estadísticas del dashboard."""
        return {
            "meetings_this_month": await self._count_meetings_this_month(),
            "meetings_trend": await self._calculate_meetings_trend(),
            "total_duration_hours": await self._get_total_duration_hours(),
            "duration_trend": await self._calculate_duration_trend(),
            "action_items_pending": await self._count_action_items(ActionItemStatus.PENDING),
            "action_items_completed": await self._count_action_items(ActionItemStatus.COMPLETED),
            "documents_generated": await self._count_documents_this_month(),
            "documents_trend": await self._calculate_documents_trend(),
        }
    
    async def _count_meetings_this_month(self) -> int:
        """Contar reuniones del mes actual."""
        result = await self.db.execute(
            select(func.count(Meeting.id)).where(
                and_(
                    Meeting.user_id == self.user_id,
                    Meeting.created_at >= self.first_day_this_month
                )
            )
        )
        return result.scalar() or 0
    
    async def _count_meetings_last_month(self) -> int:
        """Contar reuniones del mes anterior."""
        result = await self.db.execute(
            select(func.count(Meeting.id)).where(
                and_(
                    Meeting.user_id == self.user_id,
                    Meeting.created_at >= self.first_day_last_month,
                    Meeting.created_at < self.first_day_this_month
                )
            )
        )
        return result.scalar() or 0
    
    async def _calculate_meetings_trend(self) -> int:
        """Calcular tendencia de reuniones (diferencia vs mes anterior)."""
        this_month = await self._count_meetings_this_month()
        last_month = await self._count_meetings_last_month()
        return this_month - last_month
    
    async def _get_total_duration_seconds(self, start_date: datetime, end_date: datetime = None) -> int:
        """Obtener duración total en segundos para un período."""
        query = select(func.coalesce(func.sum(Meeting.duration_seconds), 0)).where(
            and_(
                Meeting.user_id == self.user_id,
                Meeting.created_at >= start_date
            )
        )
        if end_date:
            query = query.where(Meeting.created_at < end_date)
        
        result = await self.db.execute(query)
        return result.scalar() or 0
    
    async def _get_total_duration_hours(self) -> float:
        """Obtener horas totales transcritas este mes."""
        seconds = await self._get_total_duration_seconds(self.first_day_this_month)
        return round(seconds / 3600, 1)
    
    async def _calculate_duration_trend(self) -> float:
        """Calcular tendencia de duración en horas."""
        this_month = await self._get_total_duration_seconds(self.first_day_this_month)
        last_month = await self._get_total_duration_seconds(
            self.first_day_last_month, 
            self.first_day_this_month
        )
        return round((this_month - last_month) / 3600, 1)
    
    async def _count_action_items(self, status: ActionItemStatus) -> int:
        """Contar action items por estado."""
        result = await self.db.execute(
            select(func.count(ActionItem.id)).where(
                and_(
                    ActionItem.meeting_id.in_(
                        select(Meeting.id).where(Meeting.user_id == self.user_id)
                    ),
                    ActionItem.status == status.value
                )
            )
        )
        return result.scalar() or 0
    
    async def _count_documents(self, start_date: datetime, end_date: datetime = None) -> int:
        """Contar reuniones con resumen generado."""
        query = select(func.count(Meeting.id)).where(
            and_(
                Meeting.user_id == self.user_id,
                Meeting.summary.isnot(None),
                Meeting.created_at >= start_date
            )
        )
        if end_date:
            query = query.where(Meeting.created_at < end_date)
        
        result = await self.db.execute(query)
        return result.scalar() or 0
    
    async def _count_documents_this_month(self) -> int:
        """Contar documentos generados este mes."""
        return await self._count_documents(self.first_day_this_month)
    
    async def _calculate_documents_trend(self) -> int:
        """Calcular tendencia de documentos."""
        this_month = await self._count_documents_this_month()
        last_month = await self._count_documents(
            self.first_day_last_month,
            self.first_day_this_month
        )
        return this_month - last_month

