/**
 * Paso de bienvenida del onboarding
 */

import { motion } from 'framer-motion'
import { Sparkles, Lock, Zap, ArrowRight } from 'lucide-react'

interface WelcomeStepProps {
  onNext: () => void
}

const FEATURES = [
  { icon: Lock, label: 'Privacidad por diseño' },
  { icon: Zap, label: 'Transcripción en tiempo real' },
  { icon: Sparkles, label: 'Resúmenes con IA' },
]

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center"
    >
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
        <Sparkles className="w-10 h-10 text-white" />
      </div>
      
      <h1 className="text-4xl font-display font-bold text-white mb-4">
        ¡Bienvenido a AIssistant!
      </h1>
      
      <p className="text-xl text-surface-400 mb-8 max-w-2xl mx-auto">
        Vamos a configurar tu asistente de reuniones en unos pocos pasos.
        Podrás cambiar estas opciones en cualquier momento desde Configuración.
      </p>
      
      <div className="flex items-center justify-center gap-8 mb-10">
        {FEATURES.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-surface-300">
            <item.icon className="w-5 h-5 text-primary-400" />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      
      <button
        onClick={onNext}
        className="btn-primary text-lg px-8 py-3 flex items-center gap-2 mx-auto"
      >
        Comenzar configuración
        <ArrowRight className="w-5 h-5" />
      </button>
    </motion.div>
  )
}

