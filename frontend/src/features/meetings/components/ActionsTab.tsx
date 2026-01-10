/**
 * Tab de elementos de acción de reunión
 */

import { CheckCircle2 } from 'lucide-react'

interface ActionItem {
  id: number
  title: string
  description?: string
  assignee_name?: string
  due_date?: string
  status: string
}

interface ActionsTabProps {
  actionItems?: ActionItem[]
}

export function ActionsTab({ actionItems = [] }: ActionsTabProps) {
  if (actionItems.length === 0) {
    return (
      <div className="text-center py-10">
        <CheckCircle2 className="w-12 h-12 text-surface-500 mx-auto mb-4" />
        <p className="text-surface-400">
          No hay elementos de acción identificados
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {actionItems.map((item) => (
        <ActionItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}

function ActionItemCard({ item }: { item: ActionItem }) {
  return (
    <div className="flex items-start gap-4 p-4 bg-surface-800/50 rounded-xl">
      <input
        type="checkbox"
        checked={item.status === 'completed'}
        className="mt-1 rounded border-surface-600 bg-surface-700 text-primary-500"
        readOnly
      />
      <div className="flex-1">
        <h4 className="font-medium text-white">{item.title}</h4>
        {item.description && (
          <p className="text-sm text-surface-400 mt-1">{item.description}</p>
        )}
        <div className="flex items-center gap-4 mt-2 text-xs text-surface-500">
          {item.assignee_name && (
            <span>Asignado: {item.assignee_name}</span>
          )}
          {item.due_date && (
            <span>Fecha: {item.due_date}</span>
          )}
        </div>
      </div>
    </div>
  )
}

