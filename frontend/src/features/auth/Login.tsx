/**
 * Página de inicio de sesión
 * 
 * Refactorizado: Lógica en hooks, UI en componentes reutilizables
 */

import { motion } from 'framer-motion'
import { Mail, Lock } from 'lucide-react'
import { useLoginForm } from './hooks/useLoginForm'
import { useGoogleAuth } from './hooks/useGoogleAuth'
import {
  AuthHeader,
  GoogleButton,
  Divider,
  FormInput,
  SubmitButton,
  AuthFooter,
} from './components'

export default function Login() {
  const {
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    handleSubmit,
  } = useLoginForm()
  
  const { isLoading: isGoogleLoading, initiateGoogleAuth } = useGoogleAuth()

  return (
    <div>
      <AuthHeader
        title="Iniciar sesión"
        subtitle="Bienvenido de vuelta. Ingresa tus credenciales."
      />
      
      <GoogleButton
        onClick={initiateGoogleAuth}
        isLoading={isGoogleLoading}
        label="Continuar con Google"
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
          placeholder="••••••••"
          icon={Lock}
          autoComplete="current-password"
          showPasswordToggle
        />
        
        <RememberMeRow />
        
        <SubmitButton
          isLoading={isLoading}
          loadingText="Iniciando sesión..."
          text="Iniciar sesión"
        />
      </motion.form>
      
      <AuthFooter
        text="¿No tienes una cuenta?"
        linkText="Regístrate gratis"
        linkTo="/register"
      />
    </div>
  )
}

// ========== Sub-componentes ==========

function RememberMeRow() {
  return (
    <div className="flex items-center justify-between text-sm">
      <label className="flex items-center gap-2 text-surface-400">
        <input type="checkbox" className="rounded border-surface-600 bg-surface-800 text-primary-500" />
        Recordarme
      </label>
      <a href="#" className="text-primary-400 hover:text-primary-300">
        ¿Olvidaste tu contraseña?
      </a>
    </div>
  )
}
