/**
 * Botón de submit para formularios
 */

import { Loader2 } from 'lucide-react'

interface SubmitButtonProps {
  isLoading: boolean
  loadingText: string
  text: string
}

export function SubmitButton({ isLoading, loadingText, text }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className="btn-primary w-full flex items-center justify-center gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          {loadingText}
        </>
      ) : (
        text
      )}
    </button>
  )
}

