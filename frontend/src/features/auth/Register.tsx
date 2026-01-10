/**
 * Página de registro
 * 
 * Refactorizado: Lógica en hooks, UI en componentes reutilizables
 */

import { motion } from 'framer-motion'
import { Mail, Lock, User } from 'lucide-react'
import { useRegisterForm } from './hooks/useRegisterForm'
import { useGoogleAuth } from './hooks/useGoogleAuth'
import {
  AuthHeader,
  GoogleButton,
  Divider,
  FormInput,
  SubmitButton,
  AuthFooter,
} from './components'

export default function Register() {
  const {
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
  } = useRegisterForm()
  
  const { isLoading: isGoogleLoading, initiateGoogleAuth } = useGoogleAuth()

  return (
    <div>
      <AuthHeader
        title="Crear cuenta"
        subtitle="Comienza a transformar tus reuniones con IA."
      />
      
      <GoogleButton
        onClick={initiateGoogleAuth}
        isLoading={isGoogleLoading}
        label="Registrarse con Google"
      />
      
      <Divider />
      
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <FormInput
          type="text"
          label="Nombre completo"
          value={fullName}
          onChange={setFullName}
          placeholder="Tu nombre"
          icon={User}
          autoComplete="name"
        />
        
        <FormInput
          type="email"
          label="Email"
          value={email}
          onChange={setEmail}
          placeholder="tu@email.com"
          icon={Mail}
          autoComplete="email"
        />
        
        <FormInput
          type="password"
          label="Contraseña"
          value={password}
          onChange={setPassword}
          placeholder="Mínimo 8 caracteres"
          icon={Lock}
          autoComplete="new-password"
          showPasswordToggle
        />
        
        <FormInput
          type="password"
          label="Confirmar contraseña"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="Repite tu contraseña"
          icon={Lock}
          autoComplete="new-password"
        />
        
        <TermsCheckbox />
        
        <SubmitButton
          isLoading={isLoading}
          loadingText="Creando cuenta..."
          text="Crear cuenta"
        />
      </motion.form>
      
      <AuthFooter
        text="¿Ya tienes una cuenta?"
        linkText="Inicia sesión"
        linkTo="/login"
      />
    </div>
  )
}

// ========== Sub-componentes ==========

function TermsCheckbox() {
  return (
    <label className="flex items-start gap-2 text-sm text-surface-400">
      <input 
        type="checkbox" 
        className="mt-1 rounded border-surface-600 bg-surface-800 text-primary-500" 
        required 
      />
      <span>
        Acepto los{' '}
        <a href="#" className="text-primary-400 hover:text-primary-300">términos de servicio</a>
        {' '}y la{' '}
        <a href="#" className="text-primary-400 hover:text-primary-300">política de privacidad</a>
      </span>
    </label>
  )
}
