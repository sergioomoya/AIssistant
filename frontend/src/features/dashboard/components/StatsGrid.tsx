/**
 * Grid de tarjetas de estadísticas
 */

import { motion } from 'framer-motion'
import { Calendar, Clock, CheckCircle2, FileText, type LucideIcon } from 'lucide-react'
import type { DashboardStats } from '../hooks/useDashboard'

interface StatsGridProps {
  stats?: DashboardStats
  isLoading: boolean
}

interface StatItem {
  label: string
  value: string
  icon: LucideIcon
  trend: string
}

function buildStats(data?: DashboardStats): StatItem[] {
  return [
    { 
      label: 'Reuniones este mes', 
      value: data?.meetings_this_month?.toString() || '0', 
      icon: Calendar, 
      trend: data?.meetings_trend ? `+${data.meetings_trend}` : '-' 
    },
    { 
      label: 'Horas transcritas', 
      value: `${data?.total_duration_hours?.toFixed(1) || '0'}h`, 
      icon: Clock, 
      trend: data?.duration_trend ? `+${data.duration_trend.toFixed(1)}h` : '-' 
    },
    { 
      label: 'Tareas pendientes', 
      value: data?.action_items_pending?.toString() || '0', 
      icon: CheckCircle2, 
      trend: data?.action_items_completed ? `${data.action_items_completed} completadas` : '-' 
    },
    { 
      label: 'Documentos generados', 
      value: data?.documents_generated?.toString() || '0', 
      icon: FileText, 
      trend: data?.documents_trend ? `+${data.documents_trend}` : '-' 
    },
  ]
}

export function StatsGrid({ stats, isLoading }: StatsGridProps) {
  const statItems = buildStats(stats)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {isLoading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))
      ) : (
        statItems.map((stat, i) => (
          <StatCard key={i} stat={stat} />
        ))
      )}
    </motion.div>
  )
}

// ========== Sub-componentes ==========

function StatCard({ stat }: { stat: StatItem }) {
  const Icon = stat.icon
  
  return (
    <div className="card-hover group">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-xl bg-primary-500/10 text-primary-400 group-hover:bg-primary-500/20 transition-colors">
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
          {stat.trend}
        </span>
      </div>
      <p className="text-2xl font-display font-bold text-white mb-1">
        {stat.value}
      </p>
      <p className="text-sm text-surface-400">{stat.label}</p>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="h-20 bg-surface-800 rounded" />
    </div>
  )
}

