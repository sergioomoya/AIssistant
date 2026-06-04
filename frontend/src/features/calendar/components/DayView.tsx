import React, { useMemo, useEffect, useRef, useState } from 'react'
import { parseISO, format, differenceInMinutes, getMinutes, getHours } from 'date-fns'
import { es } from 'date-fns/locale'
import { isToday } from '@/utils/date'
import { MeetingEvent } from '../hooks/useCalendarEvents'
import EventItem from './EventItem'
import { cn } from '@/utils/cn'

interface DayViewProps {
  currentDate: Date
  events: MeetingEvent[]
}

const HOUR_HEIGHT = 80 // Altura en píxeles de cada hora (un poco más alto que en la semana para mayor legibilidad)

export default function DayView({ currentDate, events }: DayViewProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [nowPosition, setNowPosition] = useState<number>(-1)

  // Desplazar el contenedor a las 08:00 am al inicio
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 8 * HOUR_HEIGHT - 40
    }
  }, [viewOnlyDependencyReset()]) // Se ejecuta al montar

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
      
      const pos = (minutesSinceMidnight / 60) * HOUR_HEIGHT
      setNowPosition(pos)
    }

    updatePosition()
    const interval = setInterval(updatePosition, 60000)
    return () => clearInterval(interval)
  }, [])

  // Filtrar eventos de este día concreto
  const dayEvents = useMemo(() => {
    const targetKey = format(currentDate, 'yyyy-MM-dd')
    return events.filter((event) => {
      const dateStr = event.scheduled_start || event.actual_start
      return dateStr && dateStr.substring(0, 10) === targetKey
    })
  }, [events, currentDate])

  const isDayToday = isToday(currentDate)

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface-900 border border-surface-800 rounded-xl overflow-hidden shadow-xl">
      
      {/* Cabecera del día */}
      <div className="border-b border-surface-800 bg-surface-900/50 py-4 px-6 flex-shrink-0 z-20 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white capitalize">
            {format(currentDate, "EEEE d 'de' MMMM", { locale: es })}
          </h3>
          <p className="text-xs text-surface-400">
            {dayEvents.length === 1 
              ? '1 reunión programada'
              : `${dayEvents.length} reuniones programadas`}
          </p>
        </div>
        {isDayToday && (
          <span className="badge bg-primary-600/10 text-primary-400 border border-primary-500/20 text-xs py-1 px-3">
            Hoy
          </span>
        )}
      </div>

      {/* Contenedor de horas y eventos */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto relative no-scrollbar"
        style={{ height: '500px' }}
      >
        <div className="grid grid-cols-[80px_1fr] relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          
          {/* Eje de Horas */}
          <div className="border-r border-surface-800 select-none bg-surface-900 flex-shrink-0">
            {hours.map((hour) => (
              <div
                key={hour}
                className="relative text-xs font-semibold text-surface-500 text-right pr-4"
                style={{
                  height: `${HOUR_HEIGHT}px`,
                  top: `-8px`
                }}
              >
                {hour === 0 ? '' : `${hour.toString().padStart(2, '0')}:00`}
              </div>
            ))}
          </div>

          {/* Área del Día */}
          <div className="relative h-full">
            
            {/* Líneas horizontales de guía */}
            <div className="absolute inset-0 flex flex-col pointer-events-none">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="border-b border-surface-800/60 w-full"
                  style={{ height: `${HOUR_HEIGHT}px` }}
                />
              ))}
            </div>

            {/* Eventos */}
            <div className="absolute inset-0 h-full p-1 relative">
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
                
                const top = (startMins / 60) * HOUR_HEIGHT
                const height = Math.max((duration / 60) * HOUR_HEIGHT, 48) // Mínimo 48px para legibilidad

                return (
                  <div
                    key={event.id}
                    className="absolute left-2 right-6 z-10"
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                    }}
                  >
                    <EventItem event={event} compact={false} />
                  </div>
                )
              })}

              {/* Indicador de Hora Actual */}
              {isDayToday && nowPosition >= 0 && (
                <div
                  className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                  style={{ top: `${nowPosition}px` }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1 border border-surface-900" />
                  <div className="flex-1 border-t-2 border-red-500 shadow-md shadow-red-500/35" />
                </div>
              )}
            </div>

          </div>

        </div>
      </div>

    </div>
  )
}
