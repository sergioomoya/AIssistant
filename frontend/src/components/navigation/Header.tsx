import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { useMeetingStore } from '@/stores/meetingStore'
import { cn } from '@/utils/cn'
import { formatDuration } from '@/utils/format'
import {
  Search,
  Bell,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Shield,
  Cloud,
  Server,
} from 'lucide-react'

/**
 * Header de la aplicación
 */
export default function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { isRecording, elapsedTime } = useMeetingStore()
  
  const handleLogout = () => {
    logout()
    navigate('/login')
  }
  
  // Icono según modo de despliegue
  const DeploymentIcon = user?.deploymentMode === 'local' ? Shield
    : user?.deploymentMode === 'cloud' ? Cloud
    : Server
  
  const deploymentLabel = user?.deploymentMode === 'local' ? 'Local'
    : user?.deploymentMode === 'cloud' ? 'Nube'
    : 'Híbrido'
  
  return (
    <header className="h-16 px-6 flex items-center justify-between border-b border-surface-800 bg-surface-900/50 backdrop-blur-sm">
      {/* Lado izquierdo - Búsqueda */}
      <div className="flex items-center gap-4">
        {/* Indicador de grabación en vivo */}
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-full"
          >
            <span className="recording-indicator" />
            <span className="text-sm font-medium text-red-400">
              REC {formatDuration(elapsedTime)}
            </span>
          </motion.div>
        )}
        
        {/* Barra de búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="text"
            placeholder="Buscar reuniones..."
            className="w-64 pl-10 pr-4 py-2 bg-surface-800 border border-surface-700 rounded-lg text-sm text-white placeholder-surface-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
          />
        </div>
      </div>
      
      {/* Lado derecho - Acciones */}
      <div className="flex items-center gap-3">
        {/* Badge de modo de despliegue */}
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
          user?.deploymentMode === 'local' && "bg-emerald-500/10 text-emerald-400",
          user?.deploymentMode === 'hybrid' && "bg-primary-500/10 text-primary-400",
          user?.deploymentMode === 'cloud' && "bg-purple-500/10 text-purple-400",
        )}>
          <DeploymentIcon className="w-3.5 h-3.5" />
          <span>{deploymentLabel}</span>
        </div>
        
        {/* Notificaciones */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-surface-400 hover:text-white hover:bg-surface-800 rounded-lg transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-accent-500 rounded-full" />
          </button>
          
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-12 w-80 bg-surface-800 border border-surface-700 rounded-xl shadow-xl z-50"
              >
                <div className="p-4 border-b border-surface-700">
                  <h3 className="font-semibold text-white">Notificaciones</h3>
                </div>
                <div className="p-4 text-center text-surface-400">
                  <p className="text-sm">No tienes notificaciones nuevas</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Menú de usuario */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 hover:bg-surface-800 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <span className="text-sm font-bold text-white">
                {user?.fullName?.charAt(0) || 'U'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-surface-400" />
          </button>
          
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-12 w-56 bg-surface-800 border border-surface-700 rounded-xl shadow-xl z-50 overflow-hidden"
              >
                {/* Info del usuario */}
                <div className="p-4 border-b border-surface-700">
                  <p className="font-medium text-white truncate">
                    {user?.fullName}
                  </p>
                  <p className="text-sm text-surface-400 truncate">
                    {user?.email}
                  </p>
                </div>
                
                {/* Opciones */}
                <div className="p-2">
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      navigate('/settings')
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2 text-surface-300 hover:text-white hover:bg-surface-700 rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="text-sm">Configuración</span>
                  </button>
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Cerrar sesión</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}

