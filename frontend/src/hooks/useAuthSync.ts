/**
 * Hook para sincronizar el estado de autenticación con el backend
 * Verifica y actualiza el estado de onboarding desde el servidor
 */

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/utils/api'

export function useAuthSync() {
  const { isAuthenticated, token, setNeedsOnboarding, updateUser } = useAuthStore()

  useEffect(() => {
    // Solo verificar si está autenticado
    if (!isAuthenticated || !token) {
      return
    }

    const syncAuthState = async () => {
      try {
        // Obtener configuración actual del usuario desde el backend
        const response = await api.get('/settings/')
        const settings = response.data

        // Actualizar estado de onboarding si es diferente
        if (settings.onboarding_completed !== undefined) {
          setNeedsOnboarding(!settings.onboarding_completed)
          updateUser({ 
            onboardingCompleted: settings.onboarding_completed,
            deploymentMode: settings.deployment_mode 
          })
        }
      } catch (error) {
        // Si hay error (token expirado, etc.), no hacer nada
        // El interceptor de axios manejará el logout si es necesario
        console.warn('Error sincronizando estado de auth:', error)
      }
    }

    syncAuthState()
  }, [isAuthenticated, token, setNeedsOnboarding, updateUser])
}

