/**
 * Sección de preferencias generales
 */

import { motion } from 'framer-motion'
import { Globe, Bell } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { SettingsData } from '../hooks/useSettings'

interface PreferencesSectionProps {
  settings?: SettingsData
}

const LANGUAGE_OPTIONS = [
  { value: 'auto', label: 'Auto-detectar' },
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pt', label: 'Português' },
]

export function PreferencesSection({ settings }: PreferencesSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">
          Preferencias
        </h2>
        <p className="text-surface-400">
          Personaliza la experiencia de usuario
        </p>
      </div>
      
      {/* Idioma de transcripción */}
      <div className="p-4 bg-surface-800/50 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-surface-400" />
            <div>
              <h3 className="font-medium text-white">Idioma de transcripción</h3>
              <p className="text-sm text-surface-400">
                Idioma preferido para las transcripciones
              </p>
            </div>
          </div>
          <select 
            className="input w-auto"
            defaultValue={settings?.preferences?.transcription_language ?? 'auto'}
          >
            {LANGUAGE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Notificaciones */}
      <div className="p-4 bg-surface-800/50 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-surface-400" />
            <div>
              <h3 className="font-medium text-white">Notificaciones</h3>
              <p className="text-sm text-surface-400">
                Recibir alertas de reuniones y resúmenes
              </p>
            </div>
          </div>
          <Toggle
            checked={settings?.preferences?.notifications_enabled ?? true}
            onChange={() => {/* TODO: Implement */}}
          />
        </div>
      </div>
    </motion.div>
  )
}

