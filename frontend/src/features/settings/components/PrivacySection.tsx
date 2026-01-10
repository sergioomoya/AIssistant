/**
 * Sección de configuración de privacidad
 */

import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'
import { Toggle } from '@/components/ui'
import type { SettingsData } from '../hooks/useSettings'

interface PrivacySectionProps {
  settings?: SettingsData
  onUpdatePrivacy: (data: { auto_delete_audio_hours?: number; pii_redaction_enabled?: boolean }) => void
}

const AUTO_DELETE_OPTIONS = [
  { value: 0, label: 'Nunca' },
  { value: 1, label: '1 hora' },
  { value: 24, label: '24 horas' },
  { value: 168, label: '1 semana' },
  { value: 720, label: '30 días' },
]

export function PrivacySection({ settings, onUpdatePrivacy }: PrivacySectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-lg font-semibold text-white mb-2">
          Privacidad y seguridad
        </h2>
        <p className="text-surface-400">
          Controla cómo se manejan tus datos
        </p>
      </div>
      
      {/* Auto-eliminación de audio */}
      <div className="p-4 bg-surface-800/50 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-white">Auto-eliminación de audio</h3>
            <p className="text-sm text-surface-400">
              Eliminar archivos de audio automáticamente tras cierto tiempo
            </p>
          </div>
          <select
            value={settings?.auto_delete_audio_hours ?? 24}
            onChange={(e) => onUpdatePrivacy({
              auto_delete_audio_hours: Number(e.target.value)
            })}
            className="input w-auto"
          >
            {AUTO_DELETE_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Redacción de PII */}
      <div className="p-4 bg-surface-800/50 rounded-xl">
        <Toggle
          checked={settings?.pii_redaction_enabled ?? true}
          onChange={(checked) => onUpdatePrivacy({ pii_redaction_enabled: checked })}
          label="Redacción automática de PII"
          description="Ocultar información personal identificable en transcripciones"
        />
      </div>
      
      {/* Info de cumplimiento */}
      <GDPRComplianceCard />
    </motion.div>
  )
}

function GDPRComplianceCard() {
  return (
    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
      <div className="flex items-start gap-3">
        <Shield className="w-5 h-5 text-emerald-400 mt-0.5" />
        <div>
          <h3 className="font-medium text-emerald-400">Cumplimiento GDPR</h3>
          <p className="text-sm text-surface-300 mt-1">
            AIssistant está diseñado para cumplir con GDPR, HIPAA y otras 
            normativas de protección de datos. Tus datos están encriptados 
            en tránsito y en reposo.
          </p>
        </div>
      </div>
    </div>
  )
}

