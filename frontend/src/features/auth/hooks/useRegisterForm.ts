/**
 * Hook para gestionar el formulario de registro
 */

import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/utils/api'
import toast from 'react-hot-toast'

export function useRegisterForm() {
  const navigate = useNavigate()
  
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const validateForm = useCallback(() => {
    if (!fullName || !email || !password || !confirmPassword) {
      toast.error('Por favor completa todos los campos')
      return false
    }
    
    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return false
    }
    
    if (password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return false
    }
    
    return true
  }, [fullName, email, password, confirmPassword])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    
    try {
      await api.post('/auth/register', {
        email,
        password,
        full_name: fullName,
      })
      
      toast.success('¡Cuenta creada! Ahora puedes iniciar sesión.')
      navigate('/login')
      
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Error al crear la cuenta'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [email, password, fullName, validateForm, navigate])

  return {
    fullName,
    setFullName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    isLoading,
    handleSubmit,
  }
}

