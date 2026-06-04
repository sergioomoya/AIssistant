import React, { useMemo } from 'react'
import { isSameMonth, parseISO, format } from 'date-fns'
import { getDaysForMonthView, isSameDate, isToday } from '@/utils/date'
import { MeetingEvent } from '../hooks/useCalendarEvents'
import EventItem from './EventItem'
import { cn } from '@/utils/cn'

interface MonthViewProps {
  currentDate: Date
  events: MeetingEvent[]
  onDateSelect: (date: Date) => void
  onViewChange: (view: 'day' | 'workWeek' | 'week' | 'month') => void
}

export default function MonthView({
  currentDate,
  events,
  onDateSelect,
  onViewChange,
}: MonthViewProps) {
  const days = getDaysForMonthView(currentDate)
  const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

  // Agrupar los eventos por fecha formateada YYYY-MM-DD para acceso O(1)
  const eventsByDay = useMemo(() => {
    const map: Record<string, MeetingEvent[]> = {}
    events.forEach((event) => {
      const dateStr = event.scheduled_start || event.actual_start
      if (dateStr) {
        const key = dateStr.substring(0, 10) // YYYY-MM-DD
        if (!map[key]) {
          map[key] = []
        }
        map[key].push(event)
      }
    })
    return map
  }, [events])

  const handleDayClick = (day: Date) => {
    onDateSelect(day)
  }

  const handleDayDoubleClick = (day: Date) => {
    onDateSelect(day)
    onViewChange('day')
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface-900 border border-surface-800 rounded-xl overflow-hidden shadow-inner">
      {/* Cabecera del Grid (Días de la semana) */}
      <div className="grid grid-cols-7 border-b border-surface-800 bg-surface-900/50">
        {weekDays.map((wDay, idx) => (
          <div
            key={idx}
            className="py-3 text-center text-xs font-semibold text-surface-400 select-none uppercase tracking-wider"
          >
            {wDay}
          </div>
        ))}
      </div>

      {/* Grid de días del mes */}
      <div className="grid grid-cols-7 grid-rows-5 flex-1 divide-x divide-y divide-surface-800">
        {days.map((day, idx) => {
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isDayToday = isToday(day)
          const isDaySelected = isSameDate(day, currentDate)
          const dayKey = format(day, 'yyyy-MM-dd')
          const dayEvents = eventsByDay[dayKey] || []

          return (
            <div
              key={idx}
              onClick={() => handleDayClick(day)}
              onDoubleClick={() => handleDayDoubleClick(day)}
              className={cn(
                "min-h-[110px] p-2 flex flex-col transition-colors cursor-pointer relative select-none",
                isCurrentMonth ? "bg-surface-900/10" : "bg-surface-950/20 text-surface-600",
                "hover:bg-surface-800/30",
                isDaySelected && "bg-primary-600/5 hover:bg-primary-600/10"
              )}
            >
              {/* Indicador de número de día */}
              <div className="flex justify-end items-center mb-1.5">
                <span
                  className={cn(
                    "w-6 h-6 flex items-center justify-center text-xs font-semibold rounded-full",
                    !isCurrentMonth && "text-surface-600",
                    isCurrentMonth && !isDayToday && "text-surface-300",
                    isDayToday && "bg-primary-600 text-white font-bold shadow-md shadow-primary-600/20"
                  )}
                >
                  {day.getDate()}
                </span>
              </div>

              {/* Contenedor de eventos del día */}
              <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[85px] no-scrollbar">
                {dayEvents.map((event) => (
                  <EventItem key={event.id} event={event} compact={true} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
