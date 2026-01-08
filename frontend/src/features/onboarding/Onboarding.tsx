import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/utils/api'
import { cn } from '@/utils/cn'
import toast from 'react-hot-toast'
import {
  Shield,
  Cloud,
  Server,
  Key,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Sparkles,
  Lock,
  Zap,
} from 'lucide-react'

type DeploymentMode = 'local' | 'hybrid' | 'cloud'

interface OnboardingData {
  deploymentMode: DeploymentMode
  apiKeys: {
    openai: string
    anthropic: string
    google: string
    deepgram: string
    huggingface: string
  }
  whisperModel: string
  llmModel: string
}

const steps = [
  { id: 'welcome', title: 'Bienvenida' },
  { id: 'deployment', title: 'Modo de despliegue' },
  { id: 'apikeys', title: 'API Keys' },
  { id: 'models', title: 'Modelos' },
  { id: 'complete', title: 'Completado' },
]

/**
 * Pantalla de configuración inicial (Onboarding)
 */
export default function Onboarding() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuthStore()
  
  const [currentStep, setCurrentStep] = useState(0)
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})
  
  const [data, setData] = useState<OnboardingData>({
    deploymentMode: 'hybrid',
    apiKeys: {
      openai: '',
      anthropic: '',
      google: '',
      deepgram: '',
      huggingface: '',
    },
    whisperModel: 'base',
    llmModel: 'gpt-4o-mini',
  })
  
  // Guardar configuración
  const saveConfig = useMutation({
    mutationFn: async () => {
      // Guardar modo de despliegue
      await api.patch('/settings/deployment-mode', { 
        mode: data.deploymentMode 
      })
      
      // Guardar API keys si hay alguna
      const hasKeys = Object.values(data.apiKeys).some(k => k.trim())
      if (hasKeys) {
        await api.patch('/settings/api-keys', {
          openai_api_key: data.apiKeys.openai || undefined,
          anthropic_api_key: data.apiKeys.anthropic || undefined,
          google_ai_api_key: data.apiKeys.google || undefined,
          deepgram_api_key: data.apiKeys.deepgram || undefined,
          huggingface_token: data.apiKeys.huggingface || undefined,
        })
      }
      
      // Guardar preferencias de modelos
      await api.patch('/settings/preferences', {
        whisper_model: data.whisperModel,
        llm_model: data.llmModel,
      })
      
      // Marcar onboarding como completado
      await api.patch('/settings/preferences', {
        onboarding_completed: true,
      })
    },
    onSuccess: () => {
      updateUser({ deploymentMode: data.deploymentMode })
      toast.success('¡Configuración guardada!')
      navigate('/')
    },
    onError: () => {
      toast.error('Error al guardar la configuración')
    },
  })
  
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }
  
  const deploymentModes = [
    {
      id: 'local' as DeploymentMode,
      name: '100% Local',
      icon: Shield,
      color: 'emerald',
      description: 'Máxima privacidad. Todo se procesa en tu ordenador.',
      features: [
        'Sin envío de datos a la nube',
        'Whisper local para transcripción',
        'Ollama para resúmenes con IA',
        'Requiere más recursos del sistema',
      ],
      badge: '🔒 Más privado',
    },
    {
      id: 'hybrid' as DeploymentMode,
      name: 'Híbrido',
      icon: Server,
      color: 'primary',
      description: 'El mejor equilibrio entre privacidad y potencia.',
      features: [
        'Audio nunca sale de tu equipo',
        'Usa tus propias API keys',
        'Modelos de IA más potentes',
        'Configuración flexible',
      ],
      badge: '⚡ Recomendado',
    },
    {
      id: 'cloud' as DeploymentMode,
      name: 'Nube',
      icon: Cloud,
      color: 'purple',
      description: 'Máxima potencia y colaboración en equipo.',
      features: [
        'Sin instalación local',
        'Procesamiento en servidores',
        'Funciones colaborativas',
        'Escalabilidad ilimitada',
      ],
      badge: '🚀 Más potente',
    },
  ]
  
  const apiProviders = [
    { 
      id: 'openai', 
      name: 'OpenAI', 
      description: 'GPT-4, GPT-3.5 para resúmenes',
      url: 'https://platform.openai.com/api-keys',
      recommended: true,
    },
    { 
      id: 'anthropic', 
      name: 'Anthropic', 
      description: 'Claude para resúmenes',
      url: 'https://console.anthropic.com/',
    },
    { 
      id: 'google', 
      name: 'Google AI', 
      description: 'Gemini para resúmenes',
      url: 'https://makersuite.google.com/app/apikey',
    },
    { 
      id: 'deepgram', 
      name: 'Deepgram', 
      description: 'Transcripción rápida en tiempo real',
      url: 'https://console.deepgram.com/',
    },
    { 
      id: 'huggingface', 
      name: 'HuggingFace', 
      description: 'Token para diarización de hablantes (opcional)',
      url: 'https://huggingface.co/settings/tokens',
      recommended: false,
    },
  ]
  
  const whisperModels = [
    { id: 'tiny', name: 'Tiny', size: '~75MB', speed: 'Muy rápido', accuracy: 'Básica' },
    { id: 'base', name: 'Base', size: '~140MB', speed: 'Rápido', accuracy: 'Buena', recommended: true },
    { id: 'small', name: 'Small', size: '~460MB', speed: 'Moderado', accuracy: 'Muy buena' },
    { id: 'medium', name: 'Medium', size: '~1.5GB', speed: 'Lento', accuracy: 'Excelente' },
    { id: 'large-v3', name: 'Large v3', size: '~3GB', speed: 'Muy lento', accuracy: 'Máxima' },
  ]
  
  const llmModels = data.deploymentMode === 'local' ? [
    { id: 'llama3.2', name: 'Llama 3.2', provider: 'Ollama', recommended: true },
    { id: 'mistral', name: 'Mistral 7B', provider: 'Ollama' },
    { id: 'phi3', name: 'Phi-3', provider: 'Ollama' },
  ] : [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', recommended: true },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
    { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'Google' },
  ]
  
  return (
    <div className="min-h-screen bg-surface-950 flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-surface-800">
        <motion.div
          className="h-full bg-gradient-to-r from-primary-500 to-accent-500"
          initial={{ width: 0 }}
          animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl">
          <AnimatePresence mode="wait">
            {/* Step 0: Welcome */}
            {currentStep === 0 && (
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
                  {[
                    { icon: Lock, label: 'Privacidad por diseño' },
                    { icon: Zap, label: 'Transcripción en tiempo real' },
                    { icon: Sparkles, label: 'Resúmenes con IA' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-surface-300">
                      <item.icon className="w-5 h-5 text-primary-400" />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={nextStep}
                  className="btn-primary text-lg px-8 py-3 flex items-center gap-2 mx-auto"
                >
                  Comenzar configuración
                  <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}
            
            {/* Step 1: Deployment Mode */}
            {currentStep === 1 && (
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
                  {deploymentModes.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setData({ ...data, deploymentMode: mode.id })}
                      className={cn(
                        "relative p-6 rounded-2xl border-2 text-left transition-all",
                        data.deploymentMode === mode.id
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
                        data.deploymentMode === mode.id
                          ? `bg-${mode.color}-500/20 text-${mode.color}-400`
                          : "bg-surface-800 text-surface-400"
                      )}>
                        <mode.icon className="w-6 h-6" />
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
                  ))}
                </div>
              </motion.div>
            )}
            
            {/* Step 2: API Keys */}
            {currentStep === 2 && (
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
                  {data.deploymentMode === 'local' 
                    ? 'En modo local no necesitas API keys, pero puedes añadirlas como respaldo.'
                    : 'Añade al menos una API key para generar resúmenes con IA.'}
                </p>
                
                {data.deploymentMode === 'local' && (
                  <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                    <p className="text-emerald-400">
                      <Shield className="w-5 h-5 inline mr-2" />
                      Modo local seleccionado - Las API keys son opcionales
                    </p>
                  </div>
                )}
                
                <div className="space-y-4 max-w-2xl mx-auto">
                  {apiProviders.map((provider) => (
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
                          value={data.apiKeys[provider.id as keyof typeof data.apiKeys]}
                          onChange={(e) => setData({
                            ...data,
                            apiKeys: { ...data.apiKeys, [provider.id]: e.target.value }
                          })}
                          placeholder={`sk-... o tu ${provider.name} API key`}
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
                    </div>
                  ))}
                </div>
                
                {data.deploymentMode !== 'local' && !Object.values(data.apiKeys).some(k => k.trim()) && (
                  <p className="text-center text-amber-400 mt-4 text-sm">
                    ⚠️ Sin API keys, no podrás generar resúmenes con IA
                  </p>
                )}
              </motion.div>
            )}
            
            {/* Step 3: Models */}
            {currentStep === 3 && (
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
                      {whisperModels.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => setData({ ...data, whisperModel: model.id })}
                          className={cn(
                            "w-full p-3 rounded-xl border text-left transition-all",
                            data.whisperModel === model.id
                              ? "border-primary-500 bg-primary-500/10"
                              : "border-surface-700 hover:border-surface-600"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium text-white">{model.name}</span>
                              {model.recommended && (
                                <span className="ml-2 text-xs text-primary-400">Recomendado</span>
                              )}
                            </div>
                            <span className="text-xs text-surface-500">{model.size}</span>
                          </div>
                          <div className="text-xs text-surface-400 mt-1">
                            {model.speed} · Precisión {model.accuracy}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* LLM Model */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">
                      Modelo de resúmenes (LLM)
                    </h3>
                    <div className="space-y-2">
                      {llmModels.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => setData({ ...data, llmModel: model.id })}
                          className={cn(
                            "w-full p-3 rounded-xl border text-left transition-all",
                            data.llmModel === model.id
                              ? "border-primary-500 bg-primary-500/10"
                              : "border-surface-700 hover:border-surface-600"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-white">{model.name}</span>
                            {model.recommended && (
                              <span className="text-xs text-primary-400">Recomendado</span>
                            )}
                          </div>
                          <div className="text-xs text-surface-400 mt-1">
                            {model.provider}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Step 4: Complete */}
            {currentStep === 4 && (
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
                    <div className="flex justify-between">
                      <span className="text-surface-400">Modo:</span>
                      <span className="text-white font-medium">
                        {deploymentModes.find(m => m.id === data.deploymentMode)?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-400">Modelo Whisper:</span>
                      <span className="text-white font-medium">
                        {whisperModels.find(m => m.id === data.whisperModel)?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-400">Modelo LLM:</span>
                      <span className="text-white font-medium">
                        {llmModels.find(m => m.id === data.llmModel)?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-surface-400">API Keys:</span>
                      <span className="text-white font-medium">
                        {Object.values(data.apiKeys).filter(k => k.trim()).length} configuradas
                      </span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => saveConfig.mutate()}
                  disabled={saveConfig.isPending}
                  className="btn-primary text-lg px-8 py-3 flex items-center gap-2 mx-auto"
                >
                  {saveConfig.isPending ? (
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
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Navigation buttons */}
      {currentStep > 0 && currentStep < steps.length - 1 && (
        <div className="p-6 border-t border-surface-800">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button
              onClick={prevStep}
              className="btn-ghost flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Atrás
            </button>
            
            <div className="flex items-center gap-2">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    i === currentStep ? "bg-primary-500" : "bg-surface-700"
                  )}
                />
              ))}
            </div>
            
            <button
              onClick={nextStep}
              className="btn-primary flex items-center gap-2"
            >
              Siguiente
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

