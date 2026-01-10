/**
 * Constantes y datos estáticos del onboarding
 */

import { Shield, Server, Cloud } from 'lucide-react'

export type DeploymentMode = 'local' | 'hybrid' | 'cloud'

export interface OnboardingData {
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

export const INITIAL_DATA: OnboardingData = {
  deploymentMode: 'hybrid',
  apiKeys: {
    openai: '',
    anthropic: '',
    google: '',
    deepgram: '',
    huggingface: '',
  },
  whisperModel: 'large-v3-turbo',
  llmModel: 'gpt-5',
}

export const STEPS = [
  { id: 'welcome', title: 'Bienvenida' },
  { id: 'deployment', title: 'Modo de despliegue' },
  { id: 'apikeys', title: 'API Keys' },
  { id: 'models', title: 'Modelos' },
  { id: 'complete', title: 'Completado' },
]

export const DEPLOYMENT_MODES = [
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

export const API_PROVIDERS = [
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

export const WHISPER_MODELS = [
  { id: 'tiny', name: 'Tiny', size: '~75MB', speed: 'Muy rápido', accuracy: 'Básica' },
  { id: 'base', name: 'Base', size: '~140MB', speed: 'Rápido', accuracy: 'Buena' },
  { id: 'small', name: 'Small', size: '~460MB', speed: 'Moderado', accuracy: 'Muy buena' },
  { id: 'medium', name: 'Medium', size: '~1.5GB', speed: 'Lento', accuracy: 'Excelente' },
  { id: 'large-v3', name: 'Large v3', size: '~3GB', speed: 'Muy lento', accuracy: 'Máxima' },
  { id: 'large-v3-turbo', name: 'Large v3 Turbo', size: '~3GB', speed: 'Optimizado', accuracy: 'Máxima', recommended: true },
]

export const LOCAL_LLM_MODELS = [
  { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'Ollama', recommended: true, released: '2025-01' },
  { id: 'llama4', name: 'LLaMA 4', provider: 'Ollama', released: '2025-04' },
  { id: 'llama3.2', name: 'LLaMA 3.2', provider: 'Ollama', released: '2024-09' },
  { id: 'qwen2.5', name: 'Qwen 2.5 72B', provider: 'Ollama', released: '2024-09' },
  { id: 'mistral-large', name: 'Mistral Large 2', provider: 'Ollama', released: '2024-07' },
  { id: 'phi4', name: 'Phi-4', provider: 'Ollama', released: '2024-12' },
]

export const CLOUD_LLM_MODELS = [
  // OpenAI
  { id: 'gpt-5', name: 'GPT-5', provider: 'OpenAI', recommended: true, released: '2025-08' },
  { id: 'o3', name: 'o3 (Reasoning)', provider: 'OpenAI', released: '2025-12' },
  { id: 'o1', name: 'o1 (Reasoning)', provider: 'OpenAI', released: '2024-12' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', released: '2024-05' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', released: '2024-07' },
  // Anthropic
  { id: 'claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'Anthropic', released: '2025-11' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', released: '2024-10' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic', released: '2024-03' },
  // Google
  { id: 'gemini-3-pro', name: 'Gemini 3 Pro', provider: 'Google', released: '2025-11' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', released: '2025-05' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', released: '2025-05' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Google', released: '2024-12' },
  // DeepSeek
  { id: 'deepseek-r1-api', name: 'DeepSeek R1 API', provider: 'DeepSeek', released: '2025-01' },
  { id: 'deepseek-v3', name: 'DeepSeek V3', provider: 'DeepSeek', released: '2024-12' },
  // xAI
  { id: 'grok-4', name: 'Grok 4', provider: 'xAI', released: '2025-07' },
]

export function getLlmModels(mode: DeploymentMode) {
  return mode === 'local' ? LOCAL_LLM_MODELS : CLOUD_LLM_MODELS
}

