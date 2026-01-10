/**
 * Botón para autenticación con Google
 */

import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { GoogleIcon } from './GoogleIcon'

interface GoogleButtonProps {
  onClick: () => void
  isLoading: boolean
  label: string
}

export function GoogleButton({ onClick, isLoading, label }: GoogleButtonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mb-6"
    >
      <button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-xl border border-gray-200 transition-colors disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        {label}
      </button>
    </motion.div>
  )
}

