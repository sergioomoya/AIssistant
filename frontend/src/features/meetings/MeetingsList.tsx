/**
 * Lista de reuniones
 * 
 * Refactorizado: Lógica en useMeetingsList, UI en componentes separados
 */

import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { useMeetingsList } from './hooks/useMeetingsList'
import {
  MeetingsHeader,
  MeetingsFilters,
  MeetingCard,
  EmptyMeetings,
} from './components'

export default function MeetingsList() {
  const {
    meetings,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    isLoading,
    error,
  } = useMeetingsList()

  return (
    <div className="space-y-6">
      <MeetingsHeader />
      
      <MeetingsFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />
      
      <MeetingsContent
        meetings={meetings}
        isLoading={isLoading}
        error={error}
        searchQuery={searchQuery}
      />
    </div>
  )
}

// ========== Sub-componentes ==========

interface MeetingsContentProps {
  meetings: ReturnType<typeof useMeetingsList>['meetings']
  isLoading: boolean
  error: unknown
  searchQuery: string
}

function MeetingsContent({ meetings, isLoading, error, searchQuery }: MeetingsContentProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400">Error al cargar las reuniones</p>
      </div>
    )
  }
  
  if (meetings.length === 0) {
    return <EmptyMeetings hasSearchQuery={!!searchQuery} />
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      {meetings.map((meeting, i) => (
        <MeetingCard key={meeting.id} meeting={meeting} index={i} />
      ))}
    </motion.div>
  )
}
