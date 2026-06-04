import { useState, useCallback } from 'react'
import {
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from 'date-fns'

export type CalendarView = 'day' | 'workWeek' | 'week' | 'month'

export interface CalendarState {
  view: CalendarView
  currentDate: Date
  selectedProviders: string[]
  setView: (view: CalendarView) => void
  setCurrentDate: (date: Date) => void
  goToToday: () => void
  goToNext: () => void
  goToPrevious: () => void
  toggleProvider: (provider: string) => void
}

export function useCalendarState(): CalendarState {
  const [view, setView] = useState<CalendarView>('month')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [selectedProviders, setSelectedProviders] = useState<string[]>([
    'google',
    'microsoft',
    'local',
  ])

  const goToToday = useCallback(() => {
    setCurrentDate(new Date())
  }, [])

  const goToNext = useCallback(() => {
    setCurrentDate((prevDate) => {
      switch (view) {
        case 'month':
          return addMonths(prevDate, 1)
        case 'week':
        case 'workWeek':
          return addWeeks(prevDate, 1)
        case 'day':
          return addDays(prevDate, 1)
        default:
          return prevDate
      }
    })
  }, [view])

  const goToPrevious = useCallback(() => {
    setCurrentDate((prevDate) => {
      switch (view) {
        case 'month':
          return subMonths(prevDate, 1)
        case 'week':
        case 'workWeek':
          return subWeeks(prevDate, 1)
        case 'day':
          return subDays(prevDate, 1)
        default:
          return prevDate
      }
    })
  }, [view])

  const toggleProvider = useCallback((provider: string) => {
    setSelectedProviders((prev) => {
      if (prev.includes(provider)) {
        return prev.filter((p) => p !== provider)
      } else {
        return [...prev, provider]
      }
    })
  }, [])

  return {
    view,
    currentDate,
    selectedProviders,
    setView,
    setCurrentDate,
    goToToday,
    goToNext,
    goToPrevious,
    toggleProvider,
  }
}
