import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday as dateFnsIsToday,
  format as dateFnsFormat,
  parseISO,
  addDays,
} from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Genera la matriz de días para renderizar la vista de mes (Grid de 7 columnas).
 * Comienza en Lunes y termina en Domingo.
 * Rellena con días del mes anterior/siguiente para completar la cuadrícula.
 */
export function getDaysForMonthView(date: Date): Date[] {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(monthStart)
  
  // Inicio de la semana del primer día del mes (Lunes = 1)
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 })
  // Fin de la semana del último día del mes (Domingo = 0)
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })
  
  return eachDayOfInterval({ start: startDate, end: endDate })
}

/**
 * Genera el rango de días para la vista de semana.
 * Si es semana laboral (Lunes a Viernes), devuelve 5 días.
 * Si es semana completa (Lunes a Domingo), devuelve 7 días.
 */
export function getDaysForWeekView(date: Date, workWeekOnly: boolean = false): Date[] {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 })
  
  if (workWeekOnly) {
    // Lunes a Viernes
    return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i))
  } else {
    // Lunes a Domingo
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }
}

/**
 * Formatea una fecha utilizando locale en español
 */
export function formatDate(date: Date | string, formatStr: string): string {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date
  return dateFnsFormat(parsedDate, formatStr, { locale: es })
}

/**
 * Determina si dos fechas son el mismo día
 */
export function isSameDate(dateA: Date | string, dateB: Date | string): boolean {
  const parsedA = typeof dateA === 'string' ? parseISO(dateA) : dateA
  const parsedB = typeof dateB === 'string' ? parseISO(dateB) : dateB
  return isSameDay(parsedA, parsedB)
}

/**
 * Determina si una fecha es el día de hoy
 */
export function isToday(date: Date | string): boolean {
  const parsed = typeof date === 'string' ? parseISO(date) : date
  return dateFnsIsToday(parsed)
}

/**
 * Formatea el rango de horas de un evento
 */
export function formatTimeRange(startStr?: string, endStr?: string): string {
  if (!startStr) return ''
  const start = parseISO(startStr)
  const formattedStart = dateFnsFormat(start, 'HH:mm')
  
  if (!endStr) return formattedStart
  const end = parseISO(endStr)
  const formattedEnd = dateFnsFormat(end, 'HH:mm')
  
  return `${formattedStart} - ${formattedEnd}`
}
