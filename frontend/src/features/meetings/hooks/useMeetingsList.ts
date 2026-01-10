/**
 * Hook para gestionar la lista de reuniones
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/utils/api'

export interface Meeting {
  id: number
  title: string
  description?: string
  scheduled_start?: string
  actual_start?: string
  actual_end?: string
  duration_seconds?: number
  status: string
  platform?: string
  sentiment?: string
  created_at: string
}

export function useMeetingsList() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['meetings', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {}
      const response = await api.get('/meetings', { params })
      return response.data
    },
  })
  
  const meetings: Meeting[] = data?.meetings || []
  
  const filteredMeetings = useMemo(() => {
    return meetings.filter((meeting) =>
      meeting.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [meetings, searchQuery])

  return {
    meetings: filteredMeetings,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    isLoading,
    error,
  }
}

