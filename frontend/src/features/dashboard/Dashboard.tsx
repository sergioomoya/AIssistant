import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import {
  Mic,
  Calendar,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react'

/**
 * Dashboard principal de la aplicación
 */
export default function Dashboard() {
  const user = useAuthStore((state) => state.user)
  
  // Datos de ejemplo para las estadísticas
  const stats = [
    { label: 'Reuniones este mes', value: '12', icon: Calendar, trend: '+3' },
    { label: 'Horas transcritas', value: '8.5h', icon: Clock, trend: '+2h' },
    { label: 'Elementos de acción', value: '24', icon: CheckCircle2, trend: '6 completados' },
    { label: 'Documentos generados', value: '18', icon: FileText, trend: '+5' },
  ]
  
  // Reuniones recientes de ejemplo
  const recentMeetings = [
    { id: 1, title: 'Revisión de sprint Q1', date: 'Hace 2 horas', duration: '45 min', sentiment: 'positive' },
    { id: 2, title: 'Demo con cliente Acme Corp', date: 'Ayer', duration: '1h 15 min', sentiment: 'neutral' },
    { id: 3, title: 'Planning semanal', date: 'Hace 2 días', duration: '30 min', sentiment: 'positive' },
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
            ¡Hola, {user?.fullName?.split(' ')[0]}! 👋
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
        {stats.map((stat, i) => (
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
        ))}
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
                  'bg-surface-500'
                }`} />
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate group-hover:text-primary-400 transition-colors">
                    {meeting.title}
                  </h3>
                  <p className="text-sm text-surface-400">
                    {meeting.date} · {meeting.duration}
                  </p>
                </div>
                
                <ArrowRight className="w-5 h-5 text-surface-500 group-hover:text-primary-400 transition-colors" />
              </Link>
            ))}
          </div>
        </motion.div>
        
        {/* Panel lateral */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Consejo del día */}
          <div className="card bg-gradient-to-br from-primary-600/20 to-accent-600/20 border-primary-500/30">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary-400" />
              <span className="text-sm font-medium text-primary-400">Consejo</span>
            </div>
            <p className="text-surface-200 text-sm">
              Carga documentos de contexto antes de tus reuniones para obtener 
              transcripciones más precisas con terminología específica.
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

