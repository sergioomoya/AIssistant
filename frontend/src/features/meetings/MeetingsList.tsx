import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/utils/api'
import { formatDate, formatDuration, formatRelativeTime } from '@/utils/format'
import { cn } from '@/utils/cn'
import {
  Mic,
  Search,
  Filter,
  Calendar,
  Clock,
  Users,
  MoreVertical,
  Play,
  FileText,
  Trash2,
  ChevronRight,
  Loader2,
} from 'lucide-react'

interface Meeting {
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

/**
 * Lista de reuniones
 */
export default function MeetingsList() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  // Fetch meetings
  const { data, isLoading, error } = useQuery({
    queryKey: ['meetings', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {}
      const response = await api.get('/meetings', { params })
      return response.data
    },
  })
  
  const meetings: Meeting[] = data?.meetings || []
  
  // Filtrar por búsqueda
  const filteredMeetings = meetings.filter((meeting) =>
    meeting.title.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-500/10 text-blue-400',
    in_progress: 'bg-red-500/10 text-red-400',
    processing: 'bg-amber-500/10 text-amber-400',
    completed: 'bg-emerald-500/10 text-emerald-400',
    failed: 'bg-red-500/10 text-red-400',
  }
  
  const statusLabels: Record<string, string> = {
    scheduled: 'Programada',
    in_progress: 'En curso',
    processing: 'Procesando',
    completed: 'Completada',
    failed: 'Error',
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">
            Reuniones
          </h1>
          <p className="text-surface-400">
            Gestiona y revisa todas tus reuniones
          </p>
        </div>
        
        <Link to="/meetings/new" className="btn-primary flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Nueva reunión
        </Link>
      </div>
      
      {/* Filtros y búsqueda */}
      <div className="flex items-center gap-4">
        {/* Búsqueda */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar reuniones..."
            className="input pl-10"
          />
        </div>
        
        {/* Filtro de estado */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-surface-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="all">Todas</option>
            <option value="scheduled">Programadas</option>
            <option value="in_progress">En curso</option>
            <option value="completed">Completadas</option>
          </select>
        </div>
      </div>
      
      {/* Lista de reuniones */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-400">Error al cargar las reuniones</p>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 card"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-800 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-surface-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            No hay reuniones
          </h3>
          <p className="text-surface-400 mb-6">
            {searchQuery
              ? 'No se encontraron reuniones con ese término'
              : 'Comienza tu primera reunión para verla aquí'}
          </p>
          <Link to="/meetings/new" className="btn-primary">
            <Mic className="w-5 h-5 mr-2" />
            Nueva reunión
          </Link>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          {filteredMeetings.map((meeting, i) => (
            <motion.div
              key={meeting.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/meetings/${meeting.id}`}
                className="card-hover flex items-center gap-4 group"
              >
                {/* Indicador de sentimiento/estado */}
                <div className={cn(
                  "w-1.5 h-16 rounded-full",
                  meeting.status === 'in_progress' ? 'bg-red-500' :
                  meeting.sentiment === 'positive' ? 'bg-emerald-500' :
                  meeting.sentiment === 'negative' ? 'bg-red-500' :
                  'bg-surface-600'
                )} />
                
                {/* Contenido principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-white truncate group-hover:text-primary-400 transition-colors">
                      {meeting.title}
                    </h3>
                    <span className={cn(
                      "badge",
                      statusColors[meeting.status] || statusColors.scheduled
                    )}>
                      {statusLabels[meeting.status] || meeting.status}
                    </span>
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
                
                {/* Acciones */}
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
                
                <ChevronRight className="w-5 h-5 text-surface-500 group-hover:text-primary-400 transition-colors" />
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}

