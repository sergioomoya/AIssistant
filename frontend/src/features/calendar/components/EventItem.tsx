import React from 'react'
import { useNavigate } from 'react-router-dom'
import { parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { MeetingEvent } from '../hooks/useCalendarEvents'
import { formatTimeRange } from '@/utils/date'
import { cn } from '@/utils/cn'
import { ExternalLink, Users, MessageSquare, Video, CheckCircle2, Clock } from 'lucide-react'

interface EventItemProps {
  event: MeetingEvent
  compact?: boolean // True en vista mensual, False en vistas día/semana
}

export default function EventItem({ event, compact = false }: EventItemProps) {
  const navigate = useNavigate()

  // Determinar color de origen del calendario
  const getSourceStyles = () => {
    const source = event.calendar_source || 'local'
    switch (source) {
      case 'google':
        return {
          bg: 'bg-blue-500/10 hover:bg-blue-500/15',
          border: 'border-blue-500',
          text: 'text-blue-300',
          dot: 'bg-blue-500',
        }
      case 'microsoft':
        return {
          bg: 'bg-sky-500/10 hover:bg-sky-500/15',
          border: 'border-sky-500',
          text: 'text-sky-300',
          dot: 'bg-sky-500',
        }
      case 'local':
      default:
        return {
          bg: 'bg-purple-500/10 hover:bg-purple-500/15',
          border: 'border-purple-500',
          text: 'text-purple-300',
          dot: 'bg-purple-500',
        }
    }
  }

  const styles = getSourceStyles()
  const timeStr = formatTimeRange(event.scheduled_start || event.actual_start, event.scheduled_end || event.actual_end)

  // Obtener día de la semana para orientar el tooltip
  const getTooltipPositionClass = () => {
    const dateStr = event.scheduled_start || event.actual_start
    if (!dateStr) return 'left-full ml-2'
    const dayOfWeek = parseISO(dateStr).getDay() // 0 = Domingo, 6 = Sábado
    // Si es jueves (4), viernes (5), sábado (6) o domingo (0), mostrar a la izquierda
    if (dayOfWeek === 0 || dayOfWeek >= 4) {
      return 'right-full mr-2'
    }
    return 'left-full ml-2'
  }

  // Traducir y estilizar el estado de la reunión
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <span className="badge bg-blue-500/10 text-blue-400 border border-blue-500/25">Programada</span>
      case 'in_progress':
        return <span className="badge bg-red-500/10 text-red-400 border border-red-500/25 animate-pulse">En vivo</span>
      case 'processing':
        return <span className="badge bg-amber-500/10 text-amber-400 border border-amber-500/25">Procesando</span>
      case 'completed':
        return <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">Completada</span>
      case 'failed':
        return <span className="badge bg-red-500/10 text-red-400 border border-red-500/25">Fallida</span>
      default:
        return <span className="badge bg-surface-700 text-surface-300">{status}</span>
    }
  }

  // Estilo del sentimiento
  const getSentimentIcon = (sentiment?: string) => {
    if (!sentiment) return null
    let color = 'text-surface-400'
    let text = 'Neutral'
    if (sentiment === 'positive') {
      color = 'text-emerald-400'
      text = 'Positivo'
    } else if (sentiment === 'negative') {
      color = 'text-red-400'
      text = 'Negativo'
    } else if (sentiment === 'mixed') {
      color = 'text-amber-400'
      text = 'Mixto'
    }
    return (
      <div className="flex items-center gap-1 mt-1 text-[11px] text-surface-400">
        <MessageSquare className={cn("w-3.5 h-3.5", color)} />
        Análisis: <span className={cn("font-medium", color)}>{text}</span>
      </div>
    )
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigate(`/meetings/${event.id}`)
  }

  if (compact) {
    // Renderizado simplificado para la vista mensual
    return (
      <div
        onClick={handleClick}
        className={cn(
          "group relative flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border-l-2 cursor-pointer transition-all",
          styles.bg,
          styles.border,
          styles.text
        )}
      >
        <span className="font-semibold text-white/90 truncate flex-shrink-0">
          {timeStr.split(' ')[0]}
        </span>
        <span className="truncate flex-1">
          {event.title}
        </span>

        {/* TOOLTIP PREMIUM */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute bottom-1/2 translate-y-1/2 z-[100] hidden group-hover:block w-72 p-4 rounded-xl",
            "bg-surface-900 border border-surface-700 shadow-2xl text-left cursor-default pointer-events-auto",
            getTooltipPositionClass()
          )}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="text-sm font-semibold text-white line-clamp-2">{event.title}</h4>
            <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1", styles.dot)} />
          </div>

          <p className="text-[11px] text-surface-400 flex items-center gap-1.5 mb-2">
            <Clock className="w-3.5 h-3.5 text-surface-500" />
            {event.scheduled_start || event.actual_start 
              ? format(parseISO(event.scheduled_start || event.actual_start || ''), "eeee, d 'de' MMMM, HH:mm", { locale: es })
              : 'Sin fecha'}
          </p>

          {event.description && (
            <p className="text-[11px] text-surface-400 line-clamp-3 mb-3 bg-surface-955 p-2 rounded border border-surface-800">
              {event.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2 items-center mb-3">
            {getStatusBadge(event.status)}
            {event.platform && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-800 text-surface-300 border border-surface-700">
                <Video className="w-3 h-3 text-primary-400" />
                {event.platform}
              </span>
            )}
          </div>

          {getSentimentIcon(event.sentiment)}

          {/* Acciones del Tooltip */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-surface-800">
            <button
              onClick={() => navigate(`/meetings/${event.id}`)}
              className="flex-1 py-1.5 text-center text-[11px] font-medium rounded bg-primary-600 hover:bg-primary-500 text-white transition-colors"
            >
              Ver Análisis
            </button>
            {event.platform && (
              <a
                href={event.description?.match(/https?:\/\/[^\s]+/)?.[0] || '#'}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "px-2.5 py-1.5 rounded bg-surface-800 hover:bg-surface-700 text-surface-200 transition-colors",
                  !event.description?.includes('http') && "opacity-50 pointer-events-none"
                )}
                title="Unirse a reunión virtual"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Renderizado completo para vistas semanales y diarias
  return (
    <div
      onClick={handleClick}
      className={cn(
        "group relative flex flex-col h-full w-full p-2 rounded-lg border-l-[3px] text-left cursor-pointer select-none transition-all",
        styles.bg,
        styles.border,
        styles.text
      )}
    >
      <div className="flex items-start justify-between gap-1.5 mb-1">
        <span className="text-xs font-semibold text-white truncate line-clamp-1 flex-1">
          {event.title}
        </span>
        <span className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-1", styles.dot)} />
      </div>

      <div className="text-[10px] text-surface-300 font-medium flex items-center gap-1 mb-1">
        <Clock className="w-3 h-3 text-surface-400" />
        {timeStr}
      </div>

      {event.platform && (
        <div className="text-[10px] text-surface-400 font-medium flex items-center gap-1 mt-auto">
          <Video className="w-3 h-3 text-primary-400" />
          <span className="capitalize">{event.platform}</span>
        </div>
      )}

      {/* TOOLTIP PREMIUM */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "absolute z-[100] hidden group-hover:block w-72 p-4 rounded-xl",
          "bg-surface-900 border border-surface-700 shadow-2xl text-left cursor-default pointer-events-auto top-2",
          getTooltipPositionClass()
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-sm font-semibold text-white line-clamp-2">{event.title}</h4>
          <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1", styles.dot)} />
        </div>

        <p className="text-[11px] text-surface-400 flex items-center gap-1.5 mb-2">
          <Clock className="w-3.5 h-3.5 text-surface-500" />
          {event.scheduled_start || event.actual_start 
            ? format(parseISO(event.scheduled_start || event.actual_start || ''), "eeee, d 'de' MMMM, HH:mm", { locale: es })
            : 'Sin fecha'}
        </p>

        {event.description && (
          <p className="text-[11px] text-surface-400 line-clamp-3 mb-3 bg-surface-955 p-2 rounded border border-surface-800">
            {event.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 items-center mb-3">
          {getStatusBadge(event.status)}
          {event.platform && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-800 text-surface-300 border border-surface-700">
              <Video className="w-3 h-3 text-primary-400" />
              {event.platform}
            </span>
          )}
        </div>

        {getSentimentIcon(event.sentiment)}

        {/* Acciones del Tooltip */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-surface-800">
          <button
            onClick={() => navigate(`/meetings/${event.id}`)}
            className="flex-1 py-1.5 text-center text-[11px] font-medium rounded bg-primary-600 hover:bg-primary-500 text-white transition-colors"
          >
            Ver Análisis
          </button>
          {event.platform && (
            <a
              href={event.description?.match(/https?:\/\/[^\s]+/)?.[0] || '#'}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "px-2.5 py-1.5 rounded bg-surface-800 hover:bg-surface-700 text-surface-200 transition-colors",
                (!event.description || !event.description.includes('http')) && "opacity-50 pointer-events-none"
              )}
              title="Unirse a reunión virtual"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

    </div>
  )
}
