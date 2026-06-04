import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  formatISO,
} from 'date-fns'
import { api } from '@/utils/api'
import { CalendarView } from './useCalendarState'

export interface MeetingEvent {
  id: number
  title: string
  description?: string
  scheduled_start?: string
  scheduled_end?: string
  actual_start?: string
  actual_end?: string
  duration_seconds?: number
  status: string
  platform?: string
  sentiment?: string
  calendar_source?: string
  calendar_event_id?: string
  created_at: string
}

interface UseCalendarEventsProps {
  currentDate: Date
  view: CalendarView
  selectedProviders: string[]
}

export function useCalendarEvents({
  currentDate,
  view,
  selectedProviders,
}: UseCalendarEventsProps) {
  
  // Calcular el rango de fechas para la consulta en base a la vista actual
  const { start, end } = useMemo(() => {
    let start: Date
    let end: Date

    switch (view) {
      case 'month':
        // Rango ampliado para cubrir semanas incompletas al inicio/fin del mes
        start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 })
        end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })
        break
      case 'week':
      case 'workWeek':
        start = startOfWeek(currentDate, { weekStartsOn: 1 })
        end = endOfWeek(currentDate, { weekStartsOn: 1 })
        break
      case 'day':
        start = startOfDay(currentDate)
        end = endOfDay(currentDate)
        break
      default:
        start = startOfMonth(currentDate)
        end = endOfMonth(currentDate)
    }

    return { start, end }
  }, [currentDate, view])

  // Formatear las fechas en formato ISOString esperado por la API
  const startIso = start ? formatISO(start) : ''
  const endIso = end ? formatISO(end) : ''

  // Query a la API de reuniones
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['meetings', 'calendar', startIso, endIso],
    queryFn: async () => {
      if (!startIso || !endIso) return { meetings: [] }
      const response = await api.get('/meetings', {
        params: {
          start_date: startIso,
          end_date: endIso,
          limit: 1000,
        },
      })
      return response.data
    },
    // Mantener los datos anteriores mientras se cargan los nuevos para evitar parpadeos
    placeholderData: (previousData) => previousData,
  })

  const meetings: MeetingEvent[] = data?.meetings || []

  // Normalizar los eventos y filtrar según los proveedores seleccionados
  const filteredEvents = useMemo(() => {
    return meetings
      .map((meeting) => {
        const start = meeting.scheduled_start || meeting.actual_start || meeting.created_at
        
        // Si no hay fecha de fin, asumimos 1 hora a partir del inicio
        let end = meeting.scheduled_end || meeting.actual_end
        if (!end && start) {
          try {
            const startDate = new Date(start)
            startDate.setHours(startDate.getHours() + 1)
            end = startDate.toISOString()
          } catch (e) {
            end = start
          }
        }

        return {
          ...meeting,
          scheduled_start: start,
          scheduled_end: end,
        }
      })
      .filter((meeting) => {
        // Determinar el proveedor
        const source = meeting.calendar_source || 'local'
        return selectedProviders.includes(source)
      })
  }, [meetings, selectedProviders])

  return {
    events: filteredEvents,
    isLoading,
    error,
    refetch,
    dateRange: { start, end },
  }
}
