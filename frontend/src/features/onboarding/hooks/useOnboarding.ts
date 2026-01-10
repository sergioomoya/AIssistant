/**
 * Hook para manejar la lógica del onboarding
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/utils/api'
import toast from 'react-hot-toast'
import { STEPS, INITIAL_DATA, type OnboardingData, type DeploymentMode } from '../constants'

export function useOnboarding() {
  const navigate = useNavigate()
  const { updateUser, completeOnboarding } = useAuthStore()
  
  const [currentStep, setCurrentStep] = useState(0)
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA)
  
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
        onboarding_completed: true,
      })
    },
    onSuccess: () => {
      updateUser({ deploymentMode: data.deploymentMode, onboardingCompleted: true })
      completeOnboarding()
      toast.success('¡Configuración guardada!')
      navigate('/')
    },
    onError: () => {
      toast.error('Error al guardar la configuración')
    },
  })
  
  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }
  
  const setDeploymentMode = (mode: DeploymentMode) => {
    const newLlmModel = mode === 'local' ? 'deepseek-r1' : 'gpt-5'
    setData(prev => ({ ...prev, deploymentMode: mode, llmModel: newLlmModel }))
  }
  
  const setApiKey = (providerId: string, value: string) => {
    setData(prev => ({
      ...prev,
      apiKeys: { ...prev.apiKeys, [providerId]: value }
    }))
  }
  
  const toggleShowApiKey = (providerId: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }))
  }
  
  const setWhisperModel = (model: string) => {
    setData(prev => ({ ...prev, whisperModel: model }))
  }
  
  const setLlmModel = (model: string) => {
    setData(prev => ({ ...prev, llmModel: model }))
  }
  
  const hasApiKeys = Object.values(data.apiKeys).some(k => k.trim())
  const configuredKeysCount = Object.values(data.apiKeys).filter(k => k.trim()).length
  
  return {
    // Estado
    currentStep,
    totalSteps: STEPS.length,
    data,
    showApiKeys,
    
    // Derivados
    hasApiKeys,
    configuredKeysCount,
    progress: ((currentStep + 1) / STEPS.length) * 100,
    
    // Mutación
    saveConfig,
    isSaving: saveConfig.isPending,
    
    // Acciones
    nextStep,
    prevStep,
    setDeploymentMode,
    setApiKey,
    toggleShowApiKey,
    setWhisperModel,
    setLlmModel,
  }
}

