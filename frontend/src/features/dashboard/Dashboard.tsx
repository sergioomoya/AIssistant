import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/utils/api'
import { formatRelativeTime, formatDuration } from '@/utils/format'
import {
  Mic,
  Calendar,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Loader2,
  RefreshCw,
} from 'lucide-react'

interface DashboardStats {
  meetings_this_month: number
  meetings_trend: number
  total_duration_hours: number
  duration_trend: number
  action_items_pending: number
  action_items_completed: number
  documents_generated: number
  documents_trend: number
}

interface RecentMeeting {
  id: number
  title: string
  created_at: string
  duration_seconds?: number
  sentiment?: string
  status: string
}

/**
 * Dashboard principal de la aplicación
 */
export default function Dashboard() {
  const user = useAuthStore((state) => state.user)
  
  // Fetch stats from API
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
  
  // Fetch calendar connections to show sync status
  const { data: calendarData } = useQuery({
    queryKey: ['calendar', 'connections'],
    queryFn: async () => {
      const response = await api.get('/calendar/connections')
      return response.data
    },
  })
  
  const recentMeetings: RecentMeeting[] = meetingsData?.meetings || []
  const hasCalendars = calendarData?.length > 0
  
  // Construir stats array
  const stats = [
    { 
      label: 'Reuniones este mes', 
      value: statsData?.meetings_this_month?.toString() || '0', 
      icon: Calendar, 
      trend: statsData?.meetings_trend ? `+${statsData.meetings_trend}` : '-' 
    },
    { 
      label: 'Horas transcritas', 
      value: `${statsData?.total_duration_hours?.toFixed(1) || '0'}h`, 
      icon: Clock, 
      trend: statsData?.duration_trend ? `+${statsData.duration_trend.toFixed(1)}h` : '-' 
    },
    { 
      label: 'Tareas pendientes', 
      value: statsData?.action_items_pending?.toString() || '0', 
      icon: CheckCircle2, 
      trend: statsData?.action_items_completed ? `${statsData.action_items_completed} completadas` : '-' 
    },
    { 
      label: 'Documentos generados', 
      value: statsData?.documents_generated?.toString() || '0', 
      icon: FileText, 
      trend: statsData?.documents_trend ? `+${statsData.documents_trend}` : '-' 
    },
  ]
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }
  
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header de bienvenida */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            ¡Hola, {user?.fullName?.split(' ')[0] || 'Usuario'}! 👋
          </h1>
          <p className="text-surface-400">
            Aquí tienes un resumen de tu actividad reciente.
          </p>
        </div>
        
        <Link
          to="/meetings/new"
          className="btn-primary flex items-center gap-2"
        >
          <Mic className="w-5 h-5" />
          Nueva reunión
        </Link>
      </motion.div>
      
      {/* Tarjetas de estadísticas */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {isLoadingStats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-20 bg-surface-800 rounded" />
            </div>
          ))
        ) : (
          stats.map((stat, i) => (
            <div
              key={i}
              className="card-hover group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2.5 rounded-xl bg-primary-500/10 text-primary-400 group-hover:bg-primary-500/20 transition-colors`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                  {stat.trend}
                </span>
              </div>
              <p className="text-2xl font-display font-bold text-white mb-1">
                {stat.value}
              </p>
              <p className="text-sm text-surface-400">{stat.label}</p>
            </div>
          ))
        )}
      </motion.div>
      
      {/* Contenido principal - 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reuniones recientes */}
        <motion.div variants={itemVariants} className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Reuniones recientes</h2>
            <Link to="/meetings" className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
              Ver todas <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {isLoadingMeetings ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            </div>
          ) : recentMeetings.length === 0 ? (
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
          ) : (
            <div className="space-y-4">
              {recentMeetings.map((meeting) => (
                <Link
                  key={meeting.id}
                  to={`/meetings/${meeting.id}`}
                  className="flex items-center gap-4 p-4 bg-surface-800/50 hover:bg-surface-800 rounded-xl transition-colors group"
                >
                  {/* Indicador de sentimiento */}
                  <div className={`w-1.5 h-12 rounded-full ${
                    meeting.sentiment === 'positive' ? 'bg-emerald-500' :
                    meeting.sentiment === 'negative' ? 'bg-red-500' :
                    meeting.status === 'processing' ? 'bg-amber-500' :
                    meeting.status === 'in_progress' ? 'bg-red-500' :
                    'bg-surface-500'
                  }`} />
                  
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
              ))}
            </div>
          )}
        </motion.div>
        
        {/* Panel lateral */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Estado de calendarios */}
          {!hasCalendars && (
            <div className="card bg-gradient-to-br from-amber-600/20 to-orange-600/20 border-amber-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-medium text-amber-400">Sincroniza tus calendarios</span>
              </div>
              <p className="text-surface-200 text-sm mb-3">
                Conecta Google Calendar u Outlook para ver tus reuniones automáticamente.
              </p>
              <Link 
                to="/settings" 
                className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                Conectar calendario <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
          
          {hasCalendars && (
            <div className="card bg-gradient-to-br from-emerald-600/20 to-green-600/20 border-emerald-500/30">
              <div className="flex items-center gap-2 mb-3">
                <RefreshCw className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">Calendarios sincronizados</span>
              </div>
              <p className="text-surface-200 text-sm">
                {calendarData.length} calendario{calendarData.length > 1 ? 's' : ''} conectado{calendarData.length > 1 ? 's' : ''}.
                Tus reuniones se sincronizan automáticamente.
              </p>
            </div>
          )}
          
          {/* Consejo del día */}
          <div className="card bg-gradient-to-br from-primary-600/20 to-accent-600/20 border-primary-500/30">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary-400" />
              <span className="text-sm font-medium text-primary-400">Consejo</span>
            </div>
            <p className="text-surface-200 text-sm">
              Usa el modo "Micrófono + Sistema" para capturar tanto tu voz como 
              el audio de videoconferencias automáticamente.
            </p>
          </div>
          
          {/* Acciones rápidas */}
          <div className="card">
            <h3 className="font-semibold text-white mb-4">Acciones rápidas</h3>
            
            <div className="space-y-2">
              <Link
                to="/meetings/new"
                className="flex items-center gap-3 p-3 bg-surface-800/50 hover:bg-surface-800 rounded-lg transition-colors text-surface-300 hover:text-white"
              >
                <Mic className="w-5 h-5 text-primary-400" />
                <span className="text-sm">Iniciar nueva reunión</span>
              </Link>
              
              <Link
                to="/settings"
                className="flex items-center gap-3 p-3 bg-surface-800/50 hover:bg-surface-800 rounded-lg transition-colors text-surface-300 hover:text-white"
              >
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span className="text-sm">Configurar integraciones</span>
              </Link>
            </div>
          </div>
          
          {/* Estado del modo de despliegue */}
          <div className="card">
            <h3 className="font-semibold text-white mb-4">Tu configuración</h3>
            
            <div className="flex items-center gap-3 p-3 bg-surface-800/50 rounded-lg">
              <div className={`p-2 rounded-lg ${
                user?.deploymentMode === 'local' ? 'bg-emerald-500/10 text-emerald-400' :
                user?.deploymentMode === 'hybrid' ? 'bg-primary-500/10 text-primary-400' :
                'bg-purple-500/10 text-purple-400'
              }`}>
                {user?.deploymentMode === 'local' ? '🔒' :
                 user?.deploymentMode === 'hybrid' ? '⚡' : '☁️'}
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  Modo {user?.deploymentMode === 'local' ? '100% Local' :
                        user?.deploymentMode === 'hybrid' ? 'Híbrido' : 'Nube'}
                </p>
                <p className="text-xs text-surface-400">
                  {user?.deploymentMode === 'local' 
                    ? 'Máxima privacidad'
                    : user?.deploymentMode === 'hybrid'
                    ? 'Balance privacidad/potencia'
                    : 'Máximo rendimiento'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
