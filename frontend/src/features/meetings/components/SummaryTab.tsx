/**
 * Tab de resumen de reunión
 */

import { Sparkles, CheckCircle2 } from 'lucide-react'

interface SummaryTabProps {
  meeting: {
    summary?: string
    key_points?: string[]
    decisions?: string[]
    status: string
  }
}

export function SummaryTab({ meeting }: SummaryTabProps) {
  if (!meeting.summary) {
    return <EmptySummary status={meeting.status} />
  }

  return (
    <div className="space-y-6">
      <Section title="Resumen ejecutivo">
        <p className="text-surface-300 leading-relaxed">{meeting.summary}</p>
      </Section>
      
      {meeting.key_points && meeting.key_points.length > 0 && (
        <Section title="Puntos clave">
          <ul className="space-y-2">
            {meeting.key_points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-surface-300">
                <span className="text-primary-400 mt-1">•</span>
                {point}
              </li>
            ))}
          </ul>
        </Section>
      )}
      
      {meeting.decisions && meeting.decisions.length > 0 && (
        <Section title="Decisiones tomadas">
          <ul className="space-y-2">
            {meeting.decisions.map((decision, i) => (
              <li key={i} className="flex items-start gap-2 text-surface-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                {decision}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}

// ========== Sub-componentes ==========

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
      {children}
    </div>
  )
}

function EmptySummary({ status }: { status: string }) {
  return (
    <div className="text-center py-10">
      <Sparkles className="w-12 h-12 text-surface-500 mx-auto mb-4" />
      <p className="text-surface-400">
        {status === 'completed'
          ? 'Genera un resumen con IA para ver los puntos clave'
          : 'El resumen estará disponible cuando la reunión termine'}
      </p>
    </div>
  )
}

