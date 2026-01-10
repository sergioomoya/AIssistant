/**
 * Paso de configuración de API Keys
 */

import { motion } from 'framer-motion'
import { Shield, Eye, EyeOff } from 'lucide-react'
import { API_PROVIDERS, type DeploymentMode, type OnboardingData } from '../constants'

interface ApiKeysStepProps {
  deploymentMode: DeploymentMode
  apiKeys: OnboardingData['apiKeys']
  showApiKeys: Record<string, boolean>
  onSetApiKey: (providerId: string, value: string) => void
  onToggleShow: (providerId: string) => void
  hasAnyKey: boolean
}

export function ApiKeysStep({
  deploymentMode,
  apiKeys,
  showApiKeys,
  onSetApiKey,
  onToggleShow,
  hasAnyKey,
}: ApiKeysStepProps) {
  const isLocal = deploymentMode === 'local'

  return (
    <motion.div
      key="apikeys"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="text-2xl font-display font-bold text-white mb-2 text-center">
        Configura tus API Keys
      </h2>
      <p className="text-surface-400 mb-8 text-center">
        {isLocal 
          ? 'En modo local no necesitas API keys, pero puedes añadirlas como respaldo.'
          : 'Añade al menos una API key para generar resúmenes con IA.'}
      </p>
      
      {isLocal && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
          <p className="text-emerald-400">
            <Shield className="w-5 h-5 inline mr-2" />
            Modo local seleccionado - Las API keys son opcionales
          </p>
        </div>
      )}
      
      <div className="space-y-4 max-w-2xl mx-auto">
        {API_PROVIDERS.map((provider) => (
          <div
            key={provider.id}
            className="p-4 bg-surface-900 border border-surface-800 rounded-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{provider.name}</span>
                  {provider.recommended && (
                    <span className="badge badge-primary text-xs">Recomendado</span>
                  )}
                </div>
                <p className="text-sm text-surface-500">{provider.description}</p>
              </div>
              <a
                href={provider.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-400 hover:text-primary-300"
              >
                Obtener key →
              </a>
            </div>
            
            <div className="relative">
              <input
                type={showApiKeys[provider.id] ? 'text' : 'password'}
                value={apiKeys[provider.id as keyof typeof apiKeys]}
                onChange={(e) => onSetApiKey(provider.id, e.target.value)}
                placeholder={`sk-... o tu ${provider.name} API key`}
                className="input pr-10"
              />
              <button
                type="button"
                onClick={() => onToggleShow(provider.id)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
              >
                {showApiKeys[provider.id] ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {!isLocal && !hasAnyKey && (
        <p className="text-center text-amber-400 mt-4 text-sm">
          ⚠️ Sin API keys, no podrás generar resúmenes con IA
        </p>
      )}
    </motion.div>
  )
}

