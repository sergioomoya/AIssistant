/**
 * Hook para gestionar el formulario de login
 */

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/utils/api'
import toast from 'react-hot-toast'

export function useLoginForm() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('Por favor completa todos los campos')
      return
    }
    
    setIsLoading(true)
    
    try {
      const formData = new URLSearchParams()
      formData.append('username', email)
      formData.append('password', password)
      
      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
      
      const { access_token, user } = response.data
      
      login({
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        deploymentMode: user.deployment_mode,
        onboardingCompleted: user.onboarding_completed,
      }, access_token)
      
      toast.success('¡Bienvenido de vuelta!')
      
      if (user.onboarding_completed) {
        navigate('/')
      } else {
        navigate('/setup')
      }
      
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al iniciar sesión'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [email, password, login, navigate])

  return {
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    handleSubmit,
  }
}

