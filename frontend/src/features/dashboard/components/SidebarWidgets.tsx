/**
 * Widgets del panel lateral del dashboard
 */

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, ArrowRight, RefreshCw, Sparkles, Mic, TrendingUp } from 'lucide-react'

interface SidebarWidgetsProps {
  hasCalendars: boolean
  calendarCount: number
  deploymentMode?: string
}

export function SidebarWidgets({ hasCalendars, calendarCount, deploymentMode }: SidebarWidgetsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <CalendarStatusCard hasCalendars={hasCalendars} calendarCount={calendarCount} />
      <TipCard />
      <QuickActionsCard />
      <DeploymentModeCard mode={deploymentMode} />
    </motion.div>
  )
}

// ========== Sub-componentes ==========

function CalendarStatusCard({ hasCalendars, calendarCount }: { hasCalendars: boolean; calendarCount: number }) {
  if (hasCalendars) {
    return (
      <div className="card bg-gradient-to-br from-emerald-600/20 to-green-600/20 border-emerald-500/30">
        <div className="flex items-center gap-2 mb-3">
          <RefreshCw className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400">Calendarios sincronizados</span>
        </div>
        <p className="text-surface-200 text-sm">
          {calendarCount} calendario{calendarCount > 1 ? 's' : ''} conectado{calendarCount > 1 ? 's' : ''}.
          Tus reuniones se sincronizan automáticamente.
        </p>
      </div>
    )
  }

  return (
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
  )
}

function TipCard() {
  return (
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
  )
}

function QuickActionsCard() {
  return (
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
  )
}

function DeploymentModeCard({ mode }: { mode?: string }) {
  const config = {
    local: { emoji: '🔒', label: '100% Local', description: 'Máxima privacidad', colorClass: 'bg-emerald-500/10 text-emerald-400' },
    hybrid: { emoji: '⚡', label: 'Híbrido', description: 'Balance privacidad/potencia', colorClass: 'bg-primary-500/10 text-primary-400' },
    cloud: { emoji: '☁️', label: 'Nube', description: 'Máximo rendimiento', colorClass: 'bg-purple-500/10 text-purple-400' },
  }
  
  const modeConfig = config[mode as keyof typeof config] || config.hybrid

  return (
    <div className="card">
      <h3 className="font-semibold text-white mb-4">Tu configuración</h3>
      
      <div className="flex items-center gap-3 p-3 bg-surface-800/50 rounded-lg">
        <div className={`p-2 rounded-lg ${modeConfig.colorClass}`}>
          {modeConfig.emoji}
        </div>
        <div>
          <p className="text-sm font-medium text-white">Modo {modeConfig.label}</p>
          <p className="text-xs text-surface-400">{modeConfig.description}</p>
        </div>
      </div>
    </div>
  )
}

