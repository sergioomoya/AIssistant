/**
 * Input de formulario con icono
 */

import { useState } from 'react'
import { Eye, EyeOff, type LucideIcon } from 'lucide-react'

interface FormInputProps {
  type: 'text' | 'email' | 'password'
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  icon: LucideIcon
  autoComplete?: string
  showPasswordToggle?: boolean
}

export function FormInput({
  type,
  label,
  value,
  onChange,
  placeholder,
  icon: Icon,
  autoComplete,
  showPasswordToggle = false,
}: FormInputProps) {
  const [showPassword, setShowPassword] = useState(false)
  
  const inputType = showPasswordToggle && showPassword ? 'text' : type

  return (
    <div>
      <label className="block text-sm font-medium text-surface-300 mb-2">
        {label}
      </label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`input pl-11 ${showPasswordToggle ? 'pr-11' : ''}`}
          autoComplete={autoComplete}
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
    </div>
  )
}

