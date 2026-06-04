/**
 * Tarjeta de reunión en la lista
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, Clock, Users, Play, FileText, ChevronRight, Mic } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatDate, formatDuration, formatRelativeTime } from '@/utils/format'
import type { Meeting } from '../hooks/useMeetingsList'

interface MeetingCardProps {
  meeting: Meeting
  index: number
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-500/10 text-blue-400',
  in_progress: 'bg-red-500/10 text-red-400',
  processing: 'bg-amber-500/10 text-amber-400',
  completed: 'bg-emerald-500/10 text-emerald-400',
  failed: 'bg-red-500/10 text-red-400',
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programada',
  in_progress: 'En curso',
  processing: 'Procesando',
  completed: 'Completada',
  failed: 'Error',
}

export function MeetingCard({ meeting, index }: MeetingCardProps) {
  const indicatorColor = getIndicatorColor(meeting)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        to={`/meetings/${meeting.id}`}
        className="card-hover flex items-center gap-4 group"
      >
        <div className={cn("w-1.5 h-16 rounded-full", indicatorColor)} />
        
        <MeetingInfo meeting={meeting} />
        
        <MeetingActions meeting={meeting} />
        
        <ChevronRight className="w-5 h-5 text-surface-500 group-hover:text-primary-400 transition-colors" />
      </Link>
    </motion.div>
  )
}

// ========== Sub-componentes ==========

function MeetingInfo({ meeting }: { meeting: Meeting }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-3 mb-1">
        <h3 className="font-semibold text-white truncate group-hover:text-primary-400 transition-colors">
          {meeting.title}
        </h3>
        <span className={cn("badge", STATUS_COLORS[meeting.status] || STATUS_COLORS.scheduled)}>
          {STATUS_LABELS[meeting.status] || meeting.status}
        </span>
        {meeting.has_audio && (
          <span className="badge bg-primary-500/10 text-primary-400 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5" />
            Grabación
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-4 text-sm text-surface-400">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          {meeting.scheduled_start 
            ? formatDate(meeting.scheduled_start, 'PPp')
            : formatRelativeTime(meeting.created_at)}
        </span>
        
        {meeting.duration_seconds && (
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {formatDuration(meeting.duration_seconds)}
          </span>
        )}
        
        {meeting.platform && (
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            {meeting.platform}
          </span>
        )}
      </div>
    </div>
  )
}

function MeetingActions({ meeting }: { meeting: Meeting }) {
  return (
    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      {meeting.status === 'completed' && (
        <button className="p-2 text-surface-400 hover:text-white hover:bg-surface-700 rounded-lg transition-colors">
          <FileText className="w-5 h-5" />
        </button>
      )}
      {meeting.status === 'scheduled' && (
        <button className="p-2 text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded-lg transition-colors">
          <Play className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}

function getIndicatorColor(meeting: Meeting): string {
  if (meeting.status === 'in_progress') return 'bg-red-500'
  if (meeting.sentiment === 'positive') return 'bg-emerald-500'
  if (meeting.sentiment === 'negative') return 'bg-red-500'
  return 'bg-surface-600'
}

