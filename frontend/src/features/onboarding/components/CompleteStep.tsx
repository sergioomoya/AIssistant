/**
 * Paso de finalización del onboarding
 */

import { motion } from 'framer-motion'
import { Check, ArrowRight, Loader2 } from 'lucide-react'
import { DEPLOYMENT_MODES, WHISPER_MODELS, getLlmModels, type OnboardingData } from '../constants'

interface CompleteStepProps {
  data: OnboardingData
  configuredKeysCount: number
  onComplete: () => void
  isSaving: boolean
}

export function CompleteStep({ data, configuredKeysCount, onComplete, isSaving }: CompleteStepProps) {
  const selectedMode = DEPLOYMENT_MODES.find(m => m.id === data.deploymentMode)
  const selectedWhisper = WHISPER_MODELS.find(m => m.id === data.whisperModel)
  const llmModels = getLlmModels(data.deploymentMode)
  const selectedLlm = llmModels.find(m => m.id === data.llmModel)

  return (
    <motion.div
      key="complete"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center"
    >
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
        <Check className="w-10 h-10 text-emerald-400" />
      </div>
      
      <h2 className="text-3xl font-display font-bold text-white mb-4">
        ¡Todo listo!
      </h2>
      
      <p className="text-xl text-surface-400 mb-8">
        Tu AIssistant está configurado y listo para usar.
      </p>
      
      {/* Resumen de configuración */}
      <div className="max-w-md mx-auto mb-8 p-6 bg-surface-900 border border-surface-800 rounded-2xl text-left">
        <h3 className="font-semibold text-white mb-4">Resumen de configuración</h3>
        
        <div className="space-y-3 text-sm">
          <SummaryRow label="Modo" value={selectedMode?.name ?? 'No seleccionado'} />
          <SummaryRow label="Modelo Whisper" value={selectedWhisper?.name ?? 'No seleccionado'} />
          <SummaryRow label="Modelo LLM" value={selectedLlm?.name ?? 'No seleccionado'} />
          <SummaryRow label="API Keys" value={`${configuredKeysCount} configuradas`} />
        </div>
      </div>
      
      <button
        onClick={onComplete}
        disabled={isSaving}
        className="btn-primary text-lg px-8 py-3 flex items-center gap-2 mx-auto"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Guardando...
          </>
        ) : (
          <>
            Comenzar a usar AIssistant
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
    </motion.div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-surface-400">{label}:</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  )
}

