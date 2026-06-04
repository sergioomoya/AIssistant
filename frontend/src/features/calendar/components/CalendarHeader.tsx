import React from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { startOfWeek, endOfWeek, isSameMonth, isSameYear, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarView } from '../hooks/useCalendarState'
import { cn } from '@/utils/cn'

interface CalendarHeaderProps {
  currentDate: Date
  view: CalendarView
  onViewChange: (view: CalendarView) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

export default function CalendarHeader({
  currentDate,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
}: CalendarHeaderProps) {
  
  // Generar título dinámico y descriptivo
  const getHeaderTitle = () => {
    switch (view) {
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale: es })
      case 'day':
        return format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
      case 'week':
      case 'workWeek': {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 })
        const end = endOfWeek(currentDate, { weekStartsOn: 1 })
        
        if (isSameYear(start, end)) {
          if (isSameMonth(start, end)) {
            // Mismo mes y año: "1 - 7 de junio de 2026"
            return `${format(start, 'd')} - ${format(end, "d 'de' MMMM 'de' yyyy", { locale: es })}`
          } else {
            // Meses distintos, mismo año: "28 de junio - 4 de julio de 2026"
            return `${format(start, "d 'de' MMMM", { locale: es })} - ${format(end, "d 'de' MMMM 'de' yyyy", { locale: es })}`
          }
        } else {
          // Años distintos: "28 de diciembre de 2026 - 3 de enero de 2027"
          return `${format(start, "d 'de' MMMM 'de' yyyy", { locale: es })} - ${format(end, "d 'de' MMMM 'de' yyyy", { locale: es })}`
        }
      }
      default:
        return ''
    }
  }

  // Lista de opciones de vista
  const viewOptions: { id: CalendarView; label: string }[] = [
    { id: 'day', label: 'Día' },
    { id: 'workWeek', label: 'Semana laboral' },
    { id: 'week', label: 'Semana' },
    { id: 'month', label: 'Mes' },
  ]

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-800">
      
      {/* Navegación y Fecha */}
      <div className="flex items-center gap-3">
        {/* Botón Hoy */}
        <button
          onClick={onToday}
          className="btn-secondary px-3.5 py-1.5 text-xs font-medium rounded-lg"
        >
          Hoy
        </button>

        {/* Flechas Navegación */}
        <div className="flex items-center bg-surface-800 rounded-lg p-0.5 border border-surface-700">
          <button
            onClick={onPrev}
            className="p-1.5 hover:bg-surface-700 rounded text-surface-400 hover:text-white transition-colors"
            title="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onNext}
            className="p-1.5 hover:bg-surface-700 rounded text-surface-400 hover:text-white transition-colors"
            title="Siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Título del Rango */}
        <h2 className="text-base sm:text-lg font-semibold text-white capitalize flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary-400 hidden sm:inline" />
          {getHeaderTitle()}
        </h2>
      </div>

      {/* Selector de Vistas */}
      <div className="flex bg-surface-800 rounded-lg p-0.5 border border-surface-700 self-start sm:self-auto">
        {viewOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onViewChange(opt.id)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
              view === opt.id
                ? "bg-surface-700 text-white shadow-sm"
                : "text-surface-400 hover:text-white hover:bg-surface-700/50"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

    </div>
  )
}
