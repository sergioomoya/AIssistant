import React, { useMemo, useEffect, useRef, useState } from 'react'
import { parseISO, format, differenceInMinutes, getMinutes, getHours } from 'date-fns'
import { es } from 'date-fns/locale'
import { getDaysForWeekView, isSameDate, isToday } from '@/utils/date'
import { MeetingEvent } from '../hooks/useCalendarEvents'
import EventItem from './EventItem'
import { cn } from '@/utils/cn'

interface WeekViewProps {
  currentDate: Date
  events: MeetingEvent[]
  workWeekOnly?: boolean // True: Lunes-Viernes, False: Lunes-Domingo
  onDateSelect: (date: Date) => void
}

const HOUR_HEIGHT = 68 // Altura en píxeles de cada bloque de 1 hora

export default function WeekView({
  currentDate,
  events,
  workWeekOnly = false,
  onDateSelect,
}: WeekViewProps) {
  const days = getDaysForWeekView(currentDate, workWeekOnly)
  const hours = Array.from({ length: 24 }, (_, i) => i)
  
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [nowPosition, setNowPosition] = useState<number>(-1)

  // Desplazar el contenedor a las 08:00 am al inicio
  useEffect(() => {
    if (scrollContainerRef.current) {
      // 8 horas * HOUR_HEIGHT
      scrollContainerRef.current.scrollTop = 8 * HOUR_HEIGHT - 40
    }
  }, [viewOnlyDependencyReset()]) // Se ejecuta una vez al montar

  // Auxiliar para disparar el scroll solo en el primer renderizado
  function viewOnlyDependencyReset() {
    return 0
  }

  // Actualizar la línea de "hora actual"
  useEffect(() => {
    const updatePosition = () => {
      const now = new Date()
      const currentHour = getHours(now)
      const currentMinute = getMinutes(now)
      const minutesSinceMidnight = currentHour * 60 + currentMinute
      
      // La posición es (minutosSinceMidnight / 60) * HOUR_HEIGHT
      const pos = (minutesSinceMidnight / 60) * HOUR_HEIGHT
      setNowPosition(pos)
    }

    updatePosition()
    const interval = setInterval(updatePosition, 60000) // cada minuto
    return () => clearInterval(interval)
  }, [])

  // Agrupar eventos por día formateado YYYY-MM-DD
  const eventsByDay = useMemo(() => {
    const map: Record<string, MeetingEvent[]> = {}
    events.forEach((event) => {
      const dateStr = event.scheduled_start || event.actual_start
      if (dateStr) {
        const key = dateStr.substring(0, 10)
        if (!map[key]) {
          map[key] = []
        }
        map[key].push(event)
      }
    })
    return map
  }, [events])

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface-900 border border-surface-800 rounded-xl overflow-hidden shadow-xl">
      
      {/* Cabecera superior: Títulos de días */}
      <div className="grid grid-cols-[60px_1fr] border-b border-surface-800 bg-surface-900/50 flex-shrink-0 z-20">
        {/* Celda vacía esquina superior izquierda */}
        <div className="border-r border-surface-800 py-3" />
        
        {/* Nombres y números de los días */}
        <div className={cn("grid divide-x divide-surface-800", workWeekOnly ? "grid-cols-5" : "grid-cols-7")}>
          {days.map((day, idx) => {
            const isDayToday = isToday(day)
            const isDaySelected = isSameDate(day, currentDate)

            return (
              <div
                key={idx}
                onClick={() => onDateSelect(day)}
                className={cn(
                  "py-3 flex flex-col items-center justify-center cursor-pointer select-none transition-colors",
                  "hover:bg-surface-800/30",
                  isDaySelected && "bg-primary-600/5"
                )}
              >
                <span className="text-[10px] font-semibold text-surface-400 uppercase tracking-wider mb-0.5">
                  {format(day, 'eee', { locale: es })}
                </span>
                <span
                  className={cn(
                    "w-8 h-8 text-sm font-bold rounded-full flex items-center justify-center transition-all",
                    isDayToday && "bg-primary-600 text-white shadow-md shadow-primary-600/20",
                    !isDayToday && isDaySelected && "border border-primary-500/40 text-primary-400",
                    !isDayToday && !isDaySelected && "text-surface-200"
                  )}
                >
                  {day.getDate()}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Grid del Calendario (Horas y Columnas) */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto relative no-scrollbar"
        style={{ height: '500px' }} // Altura por defecto y scroll
      >
        <div className="grid grid-cols-[60px_1fr] relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          
          {/* Columna de Horas (Fija a la izquierda) */}
          <div className="border-r border-surface-800 select-none bg-surface-900 flex-shrink-0">
            {hours.map((hour) => (
              <div
                key={hour}
                className="relative text-[10px] font-medium text-surface-500 text-right pr-2"
                style={{
                  height: `${HOUR_HEIGHT}px`,
                  top: `-6px` // Ajuste fino para centrar la etiqueta con la línea horizontal
                }}
              >
                {hour === 0 ? '' : `${hour.toString().padStart(2, '0')}:00`}
              </div>
            ))}
          </div>

          {/* Área principal de las columnas de días */}
          <div className="relative h-full">
            
            {/* Cuadrícula horizontal de líneas de hora */}
            <div className="absolute inset-0 flex flex-col pointer-events-none">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="border-b border-surface-800/60 w-full"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                />
              ))}
            </div>

            {/* Columnas del Grid de Días */}
            <div className={cn("absolute inset-0 grid divide-x divide-surface-800/80 h-full", workWeekOnly ? "grid-cols-5" : "grid-cols-7")}>
              {days.map((day, colIdx) => {
                const dayKey = format(day, 'yyyy-MM-dd')
                const dayEvents = eventsByDay[dayKey] || []
                const isDayToday = isToday(day)

                return (
                  <div key={colIdx} className="relative h-full select-none group">
                    
                    {/* Renderizado de eventos en esta columna */}
                    {dayEvents.map((event) => {
                      const startStr = event.scheduled_start || event.actual_start
                      const endStr = event.scheduled_end || event.actual_end
                      if (!startStr) return null

                      const start = parseISO(startStr)
                      const end = endStr ? parseISO(endStr) : new Date(start.getTime() + 60 * 60000)
                      
                      const startHour = getHours(start)
                      const startMinute = getMinutes(start)
                      
                      const startMins = startHour * 60 + startMinute
                      const duration = differenceInMinutes(end, start)
                      
                      // Calcular coordenadas en base al HOUR_HEIGHT (1 hora = HOUR_HEIGHT píxeles)
                      // top = (minutos / 60) * HOUR_HEIGHT
                      const top = (startMins / 60) * HOUR_HEIGHT
                      const height = Math.max((duration / 60) * HOUR_HEIGHT, 34) // Mínimo 34px para legibilidad

                      return (
                        <div
                          key={event.id}
                          className="absolute left-1 right-1 z-10"
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                          }}
                        >
                          <EventItem event={event} compact={false} />
                        </div>
                      )
                    })}

                    {/* Línea dinámica de la hora actual en el día de hoy */}
                    {isDayToday && nowPosition >= 0 && (
                      <div
                        className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                        style={{ top: `${nowPosition}px` }}
                      >
                        {/* Pequeña bolita roja al inicio de la línea */}
                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 border border-surface-900" />
                        <div className="flex-1 border-t-2 border-red-500 shadow-md shadow-red-500/35" />
                      </div>
                    )}

                  </div>
                )
              })}
            </div>

          </div>

        </div>
      </div>

    </div>
  )
}
