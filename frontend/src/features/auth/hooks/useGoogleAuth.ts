/**
 * Hook para autenticación con Google OAuth
 */

import { useState, useCallback } from 'react'
import { api } from '@/utils/api'
import toast from 'react-hot-toast'

export function useGoogleAuth() {
  const [isLoading, setIsLoading] = useState(false)

  const initiateGoogleAuth = useCallback(async () => {
    setIsLoading(true)
    
    try {
      const redirectUri = `${window.location.origin}/auth/google/callback`
      
      const response = await api.get('/oauth/google/auth-url', {
        params: { redirect_uri: redirectUri }
      })
      
      window.location.href = response.data.auth_url
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Google OAuth no está configurado'
      toast.error(message)
      setIsLoading(false)
    }
  }, [])

  return {
    isLoading,
    initiateGoogleAuth,
  }
}

