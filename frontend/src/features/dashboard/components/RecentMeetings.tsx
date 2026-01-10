/**
 * Lista de reuniones recientes
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, ArrowRight, Mic, Loader2 } from 'lucide-react'
import { formatRelativeTime, formatDuration } from '@/utils/format'
import type { RecentMeeting } from '../hooks/useDashboard'

interface RecentMeetingsProps {
  meetings: RecentMeeting[]
  hasCalendars: boolean
  isLoading: boolean
}

export function RecentMeetings({ meetings, hasCalendars, isLoading }: RecentMeetingsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="lg:col-span-2 card"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">Reuniones recientes</h2>
        <Link to="/meetings" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
          Ver todas <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      
      {isLoading ? (
        <LoadingState />
      ) : meetings.length === 0 ? (
        <EmptyState hasCalendars={hasCalendars} />
      ) : (
        <MeetingList meetings={meetings} />
      )}
    </motion.div>
  )
}

// ========== Sub-componentes ==========

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
    </div>
  )
}

function EmptyState({ hasCalendars }: { hasCalendars: boolean }) {
  return (
    <div className="text-center py-10">
      <Calendar className="w-12 h-12 text-surface-600 mx-auto mb-3" />
      <p className="text-surface-400">No hay reuniones todavía</p>
      <p className="text-sm text-surface-500 mb-4">
        {hasCalendars 
          ? 'Tus reuniones de calendario aparecerán aquí' 
          : 'Conecta tu calendario o inicia una nueva reunión'}
      </p>
      <Link to="/meetings/new" className="btn-primary">
        <Mic className="w-4 h-4 mr-2" />
        Nueva reunión
      </Link>
    </div>
  )
}

function MeetingList({ meetings }: { meetings: RecentMeeting[] }) {
  return (
    <div className="space-y-4">
      {meetings.map((meeting) => (
        <MeetingItem key={meeting.id} meeting={meeting} />
      ))}
    </div>
  )
}

function MeetingItem({ meeting }: { meeting: RecentMeeting }) {
  const indicatorColor = getIndicatorColor(meeting)
  
  return (
    <Link
      to={`/meetings/${meeting.id}`}
      className="flex items-center gap-4 p-4 bg-surface-800/50 hover:bg-surface-800 rounded-xl transition-colors group"
    >
      <div className={`w-1.5 h-12 rounded-full ${indicatorColor}`} />
      
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-white truncate group-hover:text-primary-400 transition-colors">
          {meeting.title}
        </h3>
        <p className="text-sm text-surface-400">
          {formatRelativeTime(meeting.created_at)}
          {meeting.duration_seconds && ` · ${formatDuration(meeting.duration_seconds)}`}
        </p>
      </div>
      
      <ArrowRight className="w-5 h-5 text-surface-500 group-hover:text-primary-400 transition-colors" />
    </Link>
  )
}

function getIndicatorColor(meeting: RecentMeeting): string {
  if (meeting.sentiment === 'positive') return 'bg-emerald-500'
  if (meeting.sentiment === 'negative') return 'bg-red-500'
  if (meeting.status === 'processing') return 'bg-amber-500'
  if (meeting.status === 'in_progress') return 'bg-red-500'
  return 'bg-surface-500'
}

