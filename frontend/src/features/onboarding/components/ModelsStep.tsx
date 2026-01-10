/**
 * Paso de selección de modelos de IA
 */

import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'
import { WHISPER_MODELS, getLlmModels, type DeploymentMode } from '../constants'

interface ModelsStepProps {
  deploymentMode: DeploymentMode
  whisperModel: string
  llmModel: string
  onSelectWhisper: (model: string) => void
  onSelectLlm: (model: string) => void
}

export function ModelsStep({
  deploymentMode,
  whisperModel,
  llmModel,
  onSelectWhisper,
  onSelectLlm,
}: ModelsStepProps) {
  const llmModels = getLlmModels(deploymentMode)

  return (
    <motion.div
      key="models"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="text-2xl font-display font-bold text-white mb-2 text-center">
        Selecciona los modelos de IA
      </h2>
      <p className="text-surface-400 mb-8 text-center">
        Elige los modelos para transcripción y generación de resúmenes.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        {/* Whisper Model */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            Modelo de transcripción (Whisper)
          </h3>
          <div className="space-y-2">
            {WHISPER_MODELS.map((model) => (
              <ModelButton
                key={model.id}
                name={model.name}
                detail={`${model.speed} · Precisión ${model.accuracy}`}
                extra={model.size}
                recommended={model.recommended}
                selected={whisperModel === model.id}
                onClick={() => onSelectWhisper(model.id)}
              />
            ))}
          </div>
        </div>
        
        {/* LLM Model */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">
            Modelo de resúmenes (LLM)
          </h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {llmModels.map((model) => (
              <ModelButton
                key={model.id}
                name={model.name}
                detail={model.provider}
                recommended={model.recommended}
                selected={llmModel === model.id}
                onClick={() => onSelectLlm(model.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

interface ModelButtonProps {
  name: string
  detail: string
  extra?: string
  recommended?: boolean
  selected: boolean
  onClick: () => void
}

function ModelButton({ name, detail, extra, recommended, selected, onClick }: ModelButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-3 rounded-xl border text-left transition-all",
        selected
          ? "border-primary-500 bg-primary-500/10"
          : "border-surface-700 hover:border-surface-600"
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-white">{name}</span>
          {recommended && (
            <span className="ml-2 text-xs text-primary-400">Recomendado</span>
          )}
        </div>
        {extra && <span className="text-xs text-surface-500">{extra}</span>}
      </div>
      <div className="text-xs text-surface-400 mt-1">
        {detail}
      </div>
    </button>
  )
}

