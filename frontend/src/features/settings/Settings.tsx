import { useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/utils/api'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'
import {
  Shield,
  Cloud,
  Server,
  Key,
  Trash2,
  Eye,
  EyeOff,
  Check,
  Loader2,
  Globe,
  Bell,
  Palette,
  Lock,
  Database,
} from 'lucide-react'

/**
 * Página de configuración
 */
export default function Settings() {
  const queryClient = useQueryClient()
  const { user, updateUser } = useAuthStore()
  
  const [activeSection, setActiveSection] = useState('deployment')
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})
  
  // API Keys state
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    google: '',
    deepgram: '',
    huggingface: '',
  })
  
  // Fetch settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await api.get('/settings')
      return response.data
    },
  })
  
  // Fetch available models
  const { data: transcriptionModels } = useQuery({
    queryKey: ['models', 'transcription'],
    queryFn: async () => {
      const response = await api.get('/settings/models/transcription')
      return response.data
    },
  })
  
  const { data: llmModels } = useQuery({
    queryKey: ['models', 'llm'],
    queryFn: async () => {
      const response = await api.get('/settings/models/llm')
      return response.data
    },
  })
  
  // Update deployment mode
  const updateDeploymentMode = useMutation({
    mutationFn: async (mode: string) => {
      await api.patch('/settings/deployment-mode', { mode })
    },
    onSuccess: (_, mode) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      updateUser({ deploymentMode: mode as any })
      toast.success('Modo de despliegue actualizado')
    },
    onError: () => {
      toast.error('Error al actualizar el modo')
    },
  })
  
  // Update API keys
  const updateApiKeys = useMutation({
    mutationFn: async (keys: Record<string, string>) => {
      await api.patch('/settings/api-keys', {
        openai_api_key: keys.openai || undefined,
        anthropic_api_key: keys.anthropic || undefined,
        google_ai_api_key: keys.google || undefined,
        deepgram_api_key: keys.deepgram || undefined,
        huggingface_token: keys.huggingface || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      setApiKeys({ openai: '', anthropic: '', google: '', deepgram: '', huggingface: '' })
      toast.success('API keys actualizadas')
    },
    onError: () => {
      toast.error('Error al actualizar las keys')
    },
  })
  
  // Update privacy settings
  const updatePrivacy = useMutation({
    mutationFn: async (data: { auto_delete_audio_hours?: number; pii_redaction_enabled?: boolean }) => {
      await api.patch('/settings/privacy', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Configuración de privacidad actualizada')
    },
    onError: () => {
      toast.error('Error al actualizar la configuración')
    },
  })
  
  const sections = [
    { id: 'deployment', label: 'Modo de despliegue', icon: Server },
    { id: 'apikeys', label: 'API Keys', icon: Key },
    { id: 'privacy', label: 'Privacidad', icon: Lock },
    { id: 'preferences', label: 'Preferencias', icon: Palette },
  ]
  
  const deploymentModes = [
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
  
  const apiProviders = [
    { id: 'openai', name: 'OpenAI', hasKey: settings?.has_openai_key },
    { id: 'anthropic', name: 'Anthropic', hasKey: settings?.has_anthropic_key },
    { id: 'google', name: 'Google AI', hasKey: settings?.has_google_key },
    { id: 'deepgram', name: 'Deepgram', hasKey: settings?.has_deepgram_key },
    { id: 'huggingface', name: 'HuggingFace', hasKey: settings?.has_huggingface_token },
  ]
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    )
  }
  
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-white">
          Configuración
        </h1>
        <p className="text-surface-400">
          Personaliza AIssistant según tus necesidades
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar de navegación */}
        <div className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all",
                activeSection === section.id
                  ? "bg-primary-500/10 text-primary-400"
                  : "text-surface-400 hover:text-white hover:bg-surface-800"
              )}
            >
              <section.icon className="w-5 h-5" />
              <span className="font-medium">{section.label}</span>
            </button>
          ))}
        </div>
        
        {/* Contenido */}
        <div className="lg:col-span-3 card">
          {/* Modo de despliegue */}
          {activeSection === 'deployment' && (
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
                {deploymentModes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => updateDeploymentMode.mutate(mode.id)}
                    disabled={updateDeploymentMode.isPending}
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left",
                      user?.deploymentMode === mode.id
                        ? `border-${mode.color}-500 bg-${mode.color}-500/10`
                        : "border-surface-700 hover:border-surface-600"
                    )}
                  >
                    <div className={cn(
                      "p-3 rounded-xl",
                      user?.deploymentMode === mode.id
                        ? `bg-${mode.color}-500/20 text-${mode.color}-400`
                        : "bg-surface-800 text-surface-400"
                    )}>
                      <mode.icon className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{mode.label}</h3>
                        {user?.deploymentMode === mode.id && (
                          <span className={`badge badge-${mode.color === 'primary' ? 'primary' : 'success'}`}>
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
                ))}
              </div>
            </motion.div>
          )}
          
          {/* API Keys */}
          {activeSection === 'apikeys' && (
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
                {apiProviders.map((provider) => (
                  <div
                    key={provider.id}
                    className="p-4 bg-surface-800/50 rounded-xl"
                  >
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
                          type={showApiKeys[provider.id] ? 'text' : 'password'}
                          value={apiKeys[provider.id as keyof typeof apiKeys]}
                          onChange={(e) => setApiKeys({
                            ...apiKeys,
                            [provider.id]: e.target.value
                          })}
                          placeholder={provider.hasKey ? '••••••••••••••••' : 'Introduce tu API key'}
                          className="input pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKeys({
                            ...showApiKeys,
                            [provider.id]: !showApiKeys[provider.id]
                          })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
                        >
                          {showApiKeys[provider.id] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      
                      <button
                        onClick={() => updateApiKeys.mutate({ [provider.id]: apiKeys[provider.id as keyof typeof apiKeys] })}
                        disabled={!apiKeys[provider.id as keyof typeof apiKeys] || updateApiKeys.isPending}
                        className="btn-secondary px-4"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
          
          {/* Privacidad */}
          {activeSection === 'privacy' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">
                  Privacidad y seguridad
                </h2>
                <p className="text-surface-400">
                  Controla cómo se manejan tus datos
                </p>
              </div>
              
              {/* Auto-eliminación de audio */}
              <div className="p-4 bg-surface-800/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white">Auto-eliminación de audio</h3>
                    <p className="text-sm text-surface-400">
                      Eliminar archivos de audio automáticamente tras cierto tiempo
                    </p>
                  </div>
                  <select
                    value={settings?.auto_delete_audio_hours || 24}
                    onChange={(e) => updatePrivacy.mutate({
                      auto_delete_audio_hours: Number(e.target.value)
                    })}
                    className="input w-auto"
                  >
                    <option value={0}>Nunca</option>
                    <option value={1}>1 hora</option>
                    <option value={24}>24 horas</option>
                    <option value={168}>1 semana</option>
                    <option value={720}>30 días</option>
                  </select>
                </div>
              </div>
              
              {/* Redacción de PII */}
              <div className="p-4 bg-surface-800/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white">Redacción automática de PII</h3>
                    <p className="text-sm text-surface-400">
                      Ocultar información personal identificable en transcripciones
                    </p>
                  </div>
                  <button
                    onClick={() => updatePrivacy.mutate({
                      pii_redaction_enabled: !settings?.pii_redaction_enabled
                    })}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      settings?.pii_redaction_enabled
                        ? "bg-primary-500"
                        : "bg-surface-600"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform",
                      settings?.pii_redaction_enabled
                        ? "translate-x-6"
                        : "translate-x-0.5"
                    )} />
                  </button>
                </div>
              </div>
              
              {/* Info de cumplimiento */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-emerald-400 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-emerald-400">Cumplimiento GDPR</h3>
                    <p className="text-sm text-surface-300 mt-1">
                      AIssistant está diseñado para cumplir con GDPR, HIPAA y otras 
                      normativas de protección de datos. Tus datos están encriptados 
                      en tránsito y en reposo.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Preferencias */}
          {activeSection === 'preferences' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">
                  Preferencias
                </h2>
                <p className="text-surface-400">
                  Personaliza la experiencia de usuario
                </p>
              </div>
              
              {/* Idioma de transcripción */}
              <div className="p-4 bg-surface-800/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-surface-400" />
                    <div>
                      <h3 className="font-medium text-white">Idioma de transcripción</h3>
                      <p className="text-sm text-surface-400">
                        Idioma preferido para las transcripciones
                      </p>
                    </div>
                  </div>
                  <select className="input w-auto">
                    <option value="auto">Auto-detectar</option>
                    <option value="es">Español</option>
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="pt">Português</option>
                  </select>
                </div>
              </div>
              
              {/* Notificaciones */}
              <div className="p-4 bg-surface-800/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-surface-400" />
                    <div>
                      <h3 className="font-medium text-white">Notificaciones</h3>
                      <p className="text-sm text-surface-400">
                        Recibir alertas de reuniones y resúmenes
                      </p>
                    </div>
                  </div>
                  <button
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      settings?.preferences?.notifications_enabled
                        ? "bg-primary-500"
                        : "bg-surface-600"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform",
                      settings?.preferences?.notifications_enabled
                        ? "translate-x-6"
                        : "translate-x-0.5"
                    )} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

