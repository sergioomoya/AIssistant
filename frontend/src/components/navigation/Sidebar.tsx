import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'
import {
  LayoutDashboard,
  Mic,
  Calendar,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { useMeetingStore } from '@/stores/meetingStore'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/meetings', icon: Calendar, label: 'Reuniones' },
  { path: '/settings', icon: Settings, label: 'Configuración' },
]

/**
 * Sidebar de navegación principal
 */
export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const location = useLocation()
  const isRecording = useMeetingStore((state) => state.isRecording)
  
  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="relative flex flex-col h-full bg-surface-900 border-r border-surface-800"
    >
      {/* Header con logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-surface-800">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xl font-display font-bold text-white"
          >
            AIssistant
          </motion.span>
        )}
      </div>
      
      {/* Botón de nueva reunión */}
      <div className="px-4 py-4">
        <NavLink
          to="/meetings/new"
          className={cn(
            "flex items-center justify-center gap-2 w-full py-3 rounded-xl",
            "bg-primary-600 hover:bg-primary-500 text-white font-medium",
            "transition-all duration-200 shadow-lg shadow-primary-600/25",
            isRecording && "bg-red-500 hover:bg-red-400 shadow-red-500/25"
          )}
        >
          {isRecording ? (
            <>
              <span className="recording-indicator" />
              {!isCollapsed && <span>En vivo</span>}
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              {!isCollapsed && <span>Nueva Reunión</span>}
            </>
          )}
        </NavLink>
      </div>
      
      {/* Navegación */}
      <nav className="flex-1 px-3 py-2">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl",
                  "transition-all duration-200",
                  isActive
                    ? "bg-primary-500/10 text-primary-400"
                    : "text-surface-400 hover:text-white hover:bg-surface-800"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t border-surface-800">
        <a
          href="#"
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl",
            "text-surface-400 hover:text-white hover:bg-surface-800",
            "transition-all duration-200"
          )}
        >
          <HelpCircle className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Ayuda</span>}
        </a>
      </div>
      
      {/* Botón de colapsar */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute -right-3 top-20 w-6 h-6 rounded-full",
          "bg-surface-800 border border-surface-700",
          "flex items-center justify-center",
          "text-surface-400 hover:text-white hover:bg-surface-700",
          "transition-all duration-200"
        )}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </motion.aside>
  )
}

