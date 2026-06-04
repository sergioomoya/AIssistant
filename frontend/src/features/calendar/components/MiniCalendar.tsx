import React, { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  addMonths,
  subMonths,
  startOfMonth,
  isSameMonth,
} from 'date-fns'
import {
  getDaysForMonthView,
  formatDate,
  isSameDate,
  isToday,
} from '@/utils/date'
import { cn } from '@/utils/cn'

interface MiniCalendarProps {
  currentDate: Date
  onDateSelect: (date: Date) => void
}

export default function MiniCalendar({ currentDate, onDateSelect }: MiniCalendarProps) {
  // Estado local para saber qué mes está visualizando el mini calendario
  const [navDate, setNavDate] = useState<Date>(startOfMonth(currentDate))

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    setNavDate((prev) => subMonths(prev, 1))
  }

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    setNavDate((prev) => addMonths(prev, 1))
  }

  const days = getDaysForMonthView(navDate)
  const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  return (
    <div className="bg-surface-900 border border-surface-800 rounded-xl p-4 select-none">
      {/* Header del Mini Calendario */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-white capitalize">
          {formatDate(navDate, 'MMMM yyyy')}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-1 hover:bg-surface-800 rounded-lg text-surface-400 hover:text-white transition-colors"
            title="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 hover:bg-surface-800 rounded-lg text-surface-400 hover:text-white transition-colors"
            title="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cabecera de días de la semana */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {weekDays.map((day, idx) => (
          <span key={idx} className="text-[11px] font-medium text-surface-500">
            {day}
          </span>
        ))}
      </div>

      {/* Cuadrícula de días */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((day, idx) => {
          const isSelected = isSameDate(day, currentDate)
          const isCurrentMonth = isSameMonth(day, navDate)
          const isDayToday = isToday(day)

          return (
            <button
              key={idx}
              onClick={() => onDateSelect(day)}
              className={cn(
                "w-7 h-7 text-xs font-medium rounded-full flex items-center justify-center transition-all",
                "hover:bg-surface-800 hover:text-white",
                !isCurrentMonth && "text-surface-600 hover:text-surface-400",
                isCurrentMonth && !isSelected && !isDayToday && "text-surface-300",
                isDayToday && !isSelected && "text-primary-400 border border-primary-500/30 font-semibold",
                isSelected && "bg-primary-600 text-white font-bold shadow-md shadow-primary-600/20"
              )}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
