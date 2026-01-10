/**
 * Hook personalizado para la gestión de configuración
 * Encapsula toda la lógica de estado, queries y mutaciones
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/utils/api'
import toast from 'react-hot-toast'

export interface ApiKeysState {
  openai: string
  anthropic: string
  google: string
  deepgram: string
  huggingface: string
}

export interface SettingsData {
  deployment_mode: string
  auto_delete_audio_hours: number
  pii_redaction_enabled: boolean
  has_openai_key: boolean
  has_anthropic_key: boolean
  has_google_key: boolean
  has_deepgram_key: boolean
  has_huggingface_token: boolean
  preferences?: {
    notifications_enabled?: boolean
    transcription_language?: string
  }
}

export interface CalendarConnection {
  id: number
  provider: 'google' | 'outlook'
  account_email: string
  is_active: boolean
  last_sync_at?: string
  sync_error?: string
}

export function useSettings() {
  const queryClient = useQueryClient()
  const { user, updateUser } = useAuthStore()
  
  const [apiKeys, setApiKeys] = useState<ApiKeysState>({
    openai: '',
    anthropic: '',
    google: '',
    deepgram: '',
    huggingface: '',
  })
  
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})

  // ========== Queries ==========
  
  const settingsQuery = useQuery<SettingsData>({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await api.get('/settings')
      return response.data
    },
  })
  
  const calendarProvidersQuery = useQuery({
    queryKey: ['calendar', 'providers'],
    queryFn: async () => {
      const response = await api.get('/calendar/providers')
      return response.data
    },
  })
  
  const calendarConnectionsQuery = useQuery<CalendarConnection[]>({
    queryKey: ['calendar', 'connections'],
    queryFn: async () => {
      const response = await api.get('/calendar/connections')
      return response.data
    },
  })

  // ========== Mutaciones ==========
  
  const updateDeploymentMode = useMutation({
    mutationFn: async (mode: string) => {
      await api.patch('/settings/deployment-mode', { mode })
    },
    onSuccess: (_, mode) => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      updateUser({ deploymentMode: mode as 'local' | 'hybrid' | 'cloud' })
      toast.success('Modo de despliegue actualizado')
    },
    onError: () => {
      toast.error('Error al actualizar el modo')
    },
  })
  
  const updateApiKeysMutation = useMutation({
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
  
  const connectCalendar = useMutation({
    mutationFn: async (provider: string) => {
      const redirectUri = `${window.location.origin}/settings/calendar/callback`
      const response = await api.get(`/calendar/auth-url/${provider}`, {
        params: { redirect_uri: redirectUri }
      })
      return response.data
    },
    onSuccess: (data) => {
      window.location.href = data.auth_url
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Error al conectar calendario')
    },
  })
  
  const disconnectCalendar = useMutation({
    mutationFn: async (connectionId: number) => {
      await api.delete(`/calendar/connections/${connectionId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', 'connections'] })
      toast.success('Calendario desconectado')
    },
    onError: () => {
      toast.error('Error al desconectar calendario')
    },
  })
  
  const syncCalendars = useMutation({
    mutationFn: async () => {
      const response = await api.post('/calendar/sync')
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['calendar', 'connections'] })
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      toast.success(`Sincronización completada: ${data.meetings_created} nuevas, ${data.meetings_updated} actualizadas`)
    },
    onError: () => {
      toast.error('Error al sincronizar calendarios')
    },
  })

  // ========== Helpers ==========
  
  const toggleShowApiKey = (providerId: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }))
  }
  
  const updateApiKey = (providerId: string, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [providerId]: value
    }))
  }
  
  const saveApiKey = (providerId: string) => {
    const key = apiKeys[providerId as keyof ApiKeysState]
    if (key) {
      updateApiKeysMutation.mutate({ [providerId]: key })
    }
  }

  return {
    // Estado
    user,
    apiKeys,
    showApiKeys,
    
    // Queries
    settings: settingsQuery.data,
    isLoadingSettings: settingsQuery.isLoading,
    calendarProviders: calendarProvidersQuery.data,
    calendarConnections: calendarConnectionsQuery.data || [],
    isLoadingCalendars: calendarConnectionsQuery.isLoading,
    
    // Mutaciones
    updateDeploymentMode,
    updatePrivacy,
    connectCalendar,
    disconnectCalendar,
    syncCalendars,
    updateApiKeysMutation,
    
    // Helpers
    toggleShowApiKey,
    updateApiKey,
    saveApiKey,
  }
}

