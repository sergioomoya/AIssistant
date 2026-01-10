/**
 * Panel de participantes detectados
 */

import { Users } from 'lucide-react'

interface Participant {
  id: string
  name: string
  role: string
  initial: string
  color: 'primary' | 'accent'
}

const DEFAULT_PARTICIPANTS: Participant[] = [
  { id: '1', name: 'Tú', role: 'Host', initial: 'T', color: 'primary' },
  { id: '2', name: 'Otros', role: 'Participantes', initial: 'O', color: 'accent' },
]

interface ParticipantsPanelProps {
  participants?: Participant[]
}

export function ParticipantsPanel({ participants = DEFAULT_PARTICIPANTS }: ParticipantsPanelProps) {
  return (
    <div className="card">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-primary-400" />
        Participantes detectados
      </h3>
      
      <div className="space-y-3">
        {participants.map((participant) => (
          <ParticipantItem key={participant.id} participant={participant} />
        ))}
      </div>
    </div>
  )
}

function ParticipantItem({ participant }: { participant: Participant }) {
  const bgClass = participant.color === 'primary' ? 'bg-primary-500/20' : 'bg-accent-500/20'
  const textClass = participant.color === 'primary' ? 'text-primary-400' : 'text-accent-400'
  
  return (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg ${bgClass} flex items-center justify-center`}>
        <span className={`text-sm font-bold ${textClass}`}>{participant.initial}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-white">{participant.name}</p>
        <p className="text-xs text-surface-400">{participant.role}</p>
      </div>
    </div>
  )
}

