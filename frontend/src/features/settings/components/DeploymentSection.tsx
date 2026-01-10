/**
 * Sección de configuración del modo de despliegue
 */

import { motion } from 'framer-motion'
import { Shield, Server, Cloud } from 'lucide-react'
import { cn } from '@/utils/cn'

interface DeploymentMode {
  id: string
  label: string
  description: string
  icon: typeof Shield
  color: string
  features: string[]
}

const DEPLOYMENT_MODES: DeploymentMode[] = [
  {
    id: 'local',
    label: '100% Local',
    description: 'Máxima privacidad. Todo el procesamiento en tu dispositivo.',
    icon: Shield,
    color: 'emerald',
    features: ['Whisper local', 'Ollama LLM', 'Sin envío de datos'],
  },
  {
    id: 'hybrid',
    label: 'Híbrido',
    description: 'Balance perfecto. Captura local, procesamiento en nube.',
    icon: Server,
    color: 'primary',
    features: ['Captura local', 'APIs en la nube', 'Tus propias keys'],
  },
  {
    id: 'cloud',
    label: 'Nube',
    description: 'Máximo rendimiento. Solución SaaS completa.',
    icon: Cloud,
    color: 'purple',
    features: ['Sin instalación', 'Escalabilidad', 'Colaboración en equipo'],
  },
]

interface DeploymentSectionProps {
  currentMode?: string
  onModeChange: (mode: string) => void
  isPending: boolean
}

export function DeploymentSection({ currentMode, onModeChange, isPending }: DeploymentSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">
          Modo de despliegue
        </h2>
        <p className="text-surface-400">
          Elige cómo quieres que se procesen tus datos
        </p>
      </div>
      
      <div className="grid gap-4">
        {DEPLOYMENT_MODES.map((mode) => {
          const isActive = currentMode === mode.id
          const Icon = mode.icon
          
          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              disabled={isPending}
              className={cn(
                "flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left",
                isActive
                  ? `border-${mode.color}-500 bg-${mode.color}-500/10`
                  : "border-surface-700 hover:border-surface-600"
              )}
            >
              <div className={cn(
                "p-3 rounded-xl",
                isActive
                  ? `bg-${mode.color}-500/20 text-${mode.color}-400`
                  : "bg-surface-800 text-surface-400"
              )}>
                <Icon className="w-6 h-6" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">{mode.label}</h3>
                  {isActive && (
                    <span className={`badge ${mode.color === 'primary' ? 'badge-primary' : 'badge-success'}`}>
                      Activo
                    </span>
                  )}
                </div>
                <p className="text-sm text-surface-400 mt-1">
                  {mode.description}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {mode.features.map((feature, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 bg-surface-800 text-surface-300 rounded"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}

