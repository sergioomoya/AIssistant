import React from 'react'
import MiniCalendar from './MiniCalendar'
import { Calendar, Check } from 'lucide-react'
import { cn } from '@/utils/cn'

interface CalendarSidebarProps {
  currentDate: Date
  onDateSelect: (date: Date) => void
  selectedProviders: string[]
  onToggleProvider: (provider: string) => void
}

export default function CalendarSidebar({
  currentDate,
  onDateSelect,
  selectedProviders,
  onToggleProvider,
}: CalendarSidebarProps) {
  // Lista de proveedores con sus metadatos de estilo
  const providers = [
    {
      id: 'local',
      label: 'AIssistant (Grabaciones)',
      colorClass: 'bg-purple-500 border-purple-500 text-purple-400',
      checkBgClass: 'bg-purple-600 border-purple-600',
      dotClass: 'bg-purple-500',
    },
    {
      id: 'google',
      label: 'Google Calendar',
      colorClass: 'bg-blue-500 border-blue-500 text-blue-400',
      checkBgClass: 'bg-blue-600 border-blue-600',
      dotClass: 'bg-blue-500',
    },
    {
      id: 'microsoft',
      label: 'Outlook (Microsoft)',
      colorClass: 'bg-sky-500 border-sky-500 text-sky-400',
      checkBgClass: 'bg-sky-600 border-sky-600',
      dotClass: 'bg-sky-500',
    },
  ]

  return (
    <div className="w-full lg:w-[260px] flex-shrink-0 flex flex-col gap-6">
      {/* Mini Calendario */}
      <MiniCalendar currentDate={currentDate} onDateSelect={onDateSelect} />

      {/* Lista de Calendarios */}
      <div className="card">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary-400" />
          Mis calendarios
        </h3>

        <div className="space-y-3">
          {providers.map((p) => {
            const isChecked = selectedProviders.includes(p.id)

            return (
              <button
                key={p.id}
                onClick={() => onToggleProvider(p.id)}
                className="flex items-center gap-3 w-full text-left group"
              >
                {/* Custom Checkbox */}
                <div
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center transition-all",
                    isChecked
                      ? p.checkBgClass
                      : "border-surface-600 hover:border-surface-400 bg-transparent"
                  )}
                >
                  {isChecked && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                </div>

                {/* Leyenda de color y Nombre */}
                <div className="flex items-center gap-2 flex-1">
                  <span className={cn("w-2.5 h-2.5 rounded-full", p.dotClass)} />
                  <span
                    className={cn(
                      "text-xs font-medium transition-colors duration-200",
                      isChecked ? "text-surface-200" : "text-surface-500 group-hover:text-surface-300"
                    )}
                  >
                    {p.label}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
