/**
 * Paso de selección del modo de despliegue
 */

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/utils/cn'
import { DEPLOYMENT_MODES, type DeploymentMode } from '../constants'

interface DeploymentStepProps {
  selectedMode: DeploymentMode
  onSelectMode: (mode: DeploymentMode) => void
}

export function DeploymentStep({ selectedMode, onSelectMode }: DeploymentStepProps) {
  return (
    <motion.div
      key="deployment"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="text-2xl font-display font-bold text-white mb-2 text-center">
        ¿Cómo quieres procesar tus datos?
      </h2>
      <p className="text-surface-400 mb-8 text-center">
        Elige el modo que mejor se adapte a tus necesidades de privacidad y rendimiento.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {DEPLOYMENT_MODES.map((mode) => {
          const isSelected = selectedMode === mode.id
          const Icon = mode.icon
          
          return (
            <button
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              className={cn(
                "relative p-6 rounded-2xl border-2 text-left transition-all",
                isSelected
                  ? `border-${mode.color}-500 bg-${mode.color}-500/10`
                  : "border-surface-700 hover:border-surface-600 bg-surface-900"
              )}
            >
              {mode.id === 'hybrid' && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-500 text-white text-xs font-medium rounded-full">
                  {mode.badge}
                </span>
              )}
              
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                isSelected
                  ? `bg-${mode.color}-500/20 text-${mode.color}-400`
                  : "bg-surface-800 text-surface-400"
              )}>
                <Icon className="w-6 h-6" />
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-2">
                {mode.name}
              </h3>
              
              <p className="text-sm text-surface-400 mb-4">
                {mode.description}
              </p>
              
              <ul className="space-y-2">
                {mode.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-surface-300">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}

