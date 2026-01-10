/**
 * Sección de configuración de API Keys
 */

import { motion } from 'framer-motion'
import { Eye, EyeOff, Check } from 'lucide-react'
import type { ApiKeysState, SettingsData } from '../hooks/useSettings'

interface ApiProvider {
  id: keyof ApiKeysState
  name: string
  hasKey: boolean
}

interface ApiKeysSectionProps {
  settings?: SettingsData
  apiKeys: ApiKeysState
  showApiKeys: Record<string, boolean>
  onToggleShow: (providerId: string) => void
  onUpdateKey: (providerId: string, value: string) => void
  onSaveKey: (providerId: string) => void
  isPending: boolean
}

export function ApiKeysSection({
  settings,
  apiKeys,
  showApiKeys,
  onToggleShow,
  onUpdateKey,
  onSaveKey,
  isPending,
}: ApiKeysSectionProps) {
  const providers: ApiProvider[] = [
    { id: 'openai', name: 'OpenAI', hasKey: settings?.has_openai_key ?? false },
    { id: 'anthropic', name: 'Anthropic', hasKey: settings?.has_anthropic_key ?? false },
    { id: 'google', name: 'Google AI', hasKey: settings?.has_google_key ?? false },
    { id: 'deepgram', name: 'Deepgram', hasKey: settings?.has_deepgram_key ?? false },
    { id: 'huggingface', name: 'HuggingFace', hasKey: settings?.has_huggingface_token ?? false },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">
          API Keys
        </h2>
        <p className="text-surface-400">
          Configura tus propias API keys para el modo híbrido
        </p>
      </div>
      
      <div className="space-y-4">
        {providers.map((provider) => (
          <ApiKeyInput
            key={provider.id}
            provider={provider}
            value={apiKeys[provider.id]}
            isVisible={showApiKeys[provider.id] ?? false}
            onToggleVisibility={() => onToggleShow(provider.id)}
            onChange={(value) => onUpdateKey(provider.id, value)}
            onSave={() => onSaveKey(provider.id)}
            isPending={isPending}
          />
        ))}
      </div>
    </motion.div>
  )
}

// ========== Sub-componentes ==========

interface ApiKeyInputProps {
  provider: ApiProvider
  value: string
  isVisible: boolean
  onToggleVisibility: () => void
  onChange: (value: string) => void
  onSave: () => void
  isPending: boolean
}

function ApiKeyInput({
  provider,
  value,
  isVisible,
  onToggleVisibility,
  onChange,
  onSave,
  isPending,
}: ApiKeyInputProps) {
  return (
    <div className="p-4 bg-surface-800/50 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="font-medium text-white">{provider.name}</span>
          {provider.hasKey && (
            <span className="badge badge-success">
              <Check className="w-3 h-3 mr-1" />
              Configurada
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type={isVisible ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={provider.hasKey ? '••••••••••••••••' : 'Introduce tu API key'}
            className="input pr-10"
          />
          <button
            type="button"
            onClick={onToggleVisibility}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
          >
            {isVisible ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        
        <button
          onClick={onSave}
          disabled={!value || isPending}
          className="btn-secondary px-4"
        >
          Guardar
        </button>
      </div>
    </div>
  )
}

