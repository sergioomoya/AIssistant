"""
AIssistant - Generador de Documentos
====================================
Exportación a diferentes formatos (DOCX, TXT, MD).
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from io import BytesIO
import structlog

logger = structlog.get_logger()


class DocumentGenerator:
    """
    Generador de documentos para exportación de reuniones.
    
    Formatos soportados:
    - DOCX (Microsoft Word)
    - TXT (Texto plano)
    - MD (Markdown)
    """
    
    async def generate(
        self,
        format: str,
        meeting_title: str,
        meeting_date: Optional[datetime],
        summary: Optional[str] = None,
        key_points: Optional[List[str]] = None,
        decisions: Optional[List[str]] = None,
        transcript: Optional[str] = None,
        action_items: Optional[List[Dict]] = None,
        include_timestamps: bool = False
    ) -> bytes:
        """
        Generar documento en el formato especificado.
        
        Args:
            format: Formato de salida (docx, txt, md)
            meeting_title: Título de la reunión
            meeting_date: Fecha de la reunión
            summary: Resumen ejecutivo
            key_points: Lista de puntos clave
            decisions: Lista de decisiones
            transcript: Transcripción completa
            action_items: Lista de elementos de acción
            include_timestamps: Incluir marcas de tiempo en transcripción
            
        Returns:
            Bytes del documento generado
        """
        if format == "docx":
            return await self._generate_docx(
                meeting_title, meeting_date, summary, key_points,
                decisions, transcript, action_items
            )
        elif format == "md":
            return await self._generate_markdown(
                meeting_title, meeting_date, summary, key_points,
                decisions, transcript, action_items
            )
        else:  # txt por defecto
            return await self._generate_txt(
                meeting_title, meeting_date, summary, key_points,
                decisions, transcript, action_items
            )
    
    async def _generate_docx(
        self,
        title: str,
        date: Optional[datetime],
        summary: Optional[str],
        key_points: Optional[List[str]],
        decisions: Optional[List[str]],
        transcript: Optional[str],
        action_items: Optional[List[Dict]]
    ) -> bytes:
        """Generar documento DOCX."""
        from docx import Document
        from docx.shared import Inches, Pt
        from docx.enum.style import WD_STYLE_TYPE
        
        doc = Document()
        
        # Título
        doc.add_heading(f"📋 {title}", 0)
        
        # Metadatos
        if date:
            doc.add_paragraph(f"📅 Fecha: {date.strftime('%d/%m/%Y %H:%M')}")
        doc.add_paragraph(f"🤖 Generado por AIssistant")
        doc.add_paragraph("")
        
        # Resumen
        if summary:
            doc.add_heading("Resumen Ejecutivo", level=1)
            doc.add_paragraph(summary)
        
        # Puntos clave
        if key_points:
            doc.add_heading("Puntos Clave", level=1)
            for point in key_points:
                doc.add_paragraph(f"• {point}", style="List Bullet")
        
        # Decisiones
        if decisions:
            doc.add_heading("Decisiones Tomadas", level=1)
            for decision in decisions:
                doc.add_paragraph(f"✓ {decision}", style="List Bullet")
        
        # Elementos de acción
        if action_items:
            doc.add_heading("Elementos de Acción", level=1)
            
            # Crear tabla
            table = doc.add_table(rows=1, cols=4)
            table.style = "Table Grid"
            
            # Encabezados
            header_cells = table.rows[0].cells
            header_cells[0].text = "Tarea"
            header_cells[1].text = "Responsable"
            header_cells[2].text = "Fecha Límite"
            header_cells[3].text = "Estado"
            
            # Filas
            for item in action_items:
                row = table.add_row().cells
                row[0].text = item.get("title", "")
                row[1].text = item.get("assignee", "-")
                row[2].text = item.get("due_date", "-")
                row[3].text = item.get("status", "Pendiente")
        
        # Transcripción
        if transcript:
            doc.add_page_break()
            doc.add_heading("Transcripción Completa", level=1)
            
            # Dividir en párrafos para mejor formato
            paragraphs = transcript.split("\n\n")
            for para in paragraphs:
                if para.strip():
                    doc.add_paragraph(para.strip())
        
        # Guardar a bytes
        buffer = BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        
        return buffer.read()
    
    async def _generate_markdown(
        self,
        title: str,
        date: Optional[datetime],
        summary: Optional[str],
        key_points: Optional[List[str]],
        decisions: Optional[List[str]],
        transcript: Optional[str],
        action_items: Optional[List[Dict]]
    ) -> bytes:
        """Generar documento Markdown."""
        lines = []
        
        # Título
        lines.append(f"# 📋 {title}")
        lines.append("")
        
        # Metadatos
        if date:
            lines.append(f"**📅 Fecha:** {date.strftime('%d/%m/%Y %H:%M')}")
        lines.append("**🤖 Generado por:** AIssistant")
        lines.append("")
        lines.append("---")
        lines.append("")
        
        # Resumen
        if summary:
            lines.append("## Resumen Ejecutivo")
            lines.append("")
            lines.append(summary)
            lines.append("")
        
        # Puntos clave
        if key_points:
            lines.append("## Puntos Clave")
            lines.append("")
            for point in key_points:
                lines.append(f"- {point}")
            lines.append("")
        
        # Decisiones
        if decisions:
            lines.append("## Decisiones Tomadas")
            lines.append("")
            for decision in decisions:
                lines.append(f"- ✅ {decision}")
            lines.append("")
        
        # Elementos de acción
        if action_items:
            lines.append("## Elementos de Acción")
            lines.append("")
            lines.append("| Tarea | Responsable | Fecha Límite | Estado |")
            lines.append("|-------|-------------|--------------|--------|")
            for item in action_items:
                task = item.get("title", "")
                assignee = item.get("assignee", "-")
                due = item.get("due_date", "-")
                status = item.get("status", "Pendiente")
                lines.append(f"| {task} | {assignee} | {due} | {status} |")
            lines.append("")
        
        # Transcripción
        if transcript:
            lines.append("---")
            lines.append("")
            lines.append("## Transcripción Completa")
            lines.append("")
            lines.append("```")
            lines.append(transcript)
            lines.append("```")
        
        content = "\n".join(lines)
        return content.encode("utf-8")
    
    async def _generate_txt(
        self,
        title: str,
        date: Optional[datetime],
        summary: Optional[str],
        key_points: Optional[List[str]],
        decisions: Optional[List[str]],
        transcript: Optional[str],
        action_items: Optional[List[Dict]]
    ) -> bytes:
        """Generar documento de texto plano."""
        lines = []
        separator = "=" * 60
        
        # Título
        lines.append(separator)
        lines.append(f"  {title.upper()}")
        lines.append(separator)
        lines.append("")
        
        # Metadatos
        if date:
            lines.append(f"Fecha: {date.strftime('%d/%m/%Y %H:%M')}")
        lines.append("Generado por: AIssistant")
        lines.append("")
        
        # Resumen
        if summary:
            lines.append("-" * 40)
            lines.append("RESUMEN EJECUTIVO")
            lines.append("-" * 40)
            lines.append(summary)
            lines.append("")
        
        # Puntos clave
        if key_points:
            lines.append("-" * 40)
            lines.append("PUNTOS CLAVE")
            lines.append("-" * 40)
            for i, point in enumerate(key_points, 1):
                lines.append(f"  {i}. {point}")
            lines.append("")
        
        # Decisiones
        if decisions:
            lines.append("-" * 40)
            lines.append("DECISIONES TOMADAS")
            lines.append("-" * 40)
            for decision in decisions:
                lines.append(f"  [X] {decision}")
            lines.append("")
        
        # Elementos de acción
        if action_items:
            lines.append("-" * 40)
            lines.append("ELEMENTOS DE ACCIÓN")
            lines.append("-" * 40)
            for item in action_items:
                lines.append(f"  * {item.get('title', '')}")
                if item.get("assignee"):
                    lines.append(f"    Responsable: {item['assignee']}")
                if item.get("due_date"):
                    lines.append(f"    Fecha límite: {item['due_date']}")
                lines.append("")
        
        # Transcripción
        if transcript:
            lines.append(separator)
            lines.append("TRANSCRIPCIÓN COMPLETA")
            lines.append(separator)
            lines.append("")
            lines.append(transcript)
        
        content = "\n".join(lines)
        return content.encode("utf-8")

