/**
 * Hook para gestionar la lógica del dashboard
 */

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/utils/api'

export interface DashboardStats {
  meetings_this_month: number
  meetings_trend: number
  total_duration_hours: number
  duration_trend: number
  action_items_pending: number
  action_items_completed: number
  documents_generated: number
  documents_trend: number
}

export interface RecentMeeting {
  id: number
  title: string
  created_at: string
  duration_seconds?: number
  sentiment?: string
  status: string
}

export function useDashboard() {
  const user = useAuthStore((state) => state.user)
  
  // Fetch stats
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const response = await api.get('/meetings/stats')
      return response.data as DashboardStats
    },
  })
  
  // Fetch recent meetings
  const { data: meetingsData, isLoading: isLoadingMeetings } = useQuery({
    queryKey: ['meetings', 'recent'],
    queryFn: async () => {
      const response = await api.get('/meetings', { 
        params: { limit: 5, sort: 'created_at', order: 'desc' }
      })
      return response.data
    },
  })
  
  // Fetch calendar connections
  const { data: calendarData } = useQuery({
    queryKey: ['calendar', 'connections'],
    queryFn: async () => {
      const response = await api.get('/calendar/connections')
      return response.data
    },
  })
  
  const recentMeetings: RecentMeeting[] = meetingsData?.meetings || []
  const hasCalendars = (calendarData?.length || 0) > 0
  const calendarCount = calendarData?.length || 0
  
  return {
    user,
    statsData,
    recentMeetings,
    hasCalendars,
    calendarCount,
    isLoadingStats,
    isLoadingMeetings,
  }
}

