/**
 * Tabs de navegación para el detalle de reunión
 */

import { FileText, MessageSquare, CheckCircle2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { TabId } from '../hooks/useMeetingDetail'

interface MeetingTabsProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

const TABS = [
  { id: 'summary' as const, label: 'Resumen', icon: FileText },
  { id: 'transcript' as const, label: 'Transcripción', icon: MessageSquare },
  { id: 'actions' as const, label: 'Acciones', icon: CheckCircle2 },
]

export function MeetingTabs({ activeTab, onTabChange }: MeetingTabsProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-surface-800/50 rounded-xl w-fit">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeTab === tab.id
              ? "bg-primary-500 text-white"
              : "text-surface-400 hover:text-white"
          )}
        >
          <tab.icon className="w-4 h-4" />
          {tab.label}
        </button>
      ))}
    </div>
  )
}

