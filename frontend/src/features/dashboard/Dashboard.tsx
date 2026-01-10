/**
 * Dashboard principal de la aplicación
 * 
 * Refactorizado: Lógica en useDashboard, UI en componentes separados
 */

import { motion } from 'framer-motion'
import { useDashboard } from './hooks/useDashboard'
import {
  WelcomeHeader,
  StatsGrid,
  RecentMeetings,
  SidebarWidgets,
} from './components'

export default function Dashboard() {
  const {
    user,
    statsData,
    recentMeetings,
    hasCalendars,
    calendarCount,
    isLoadingStats,
    isLoadingMeetings,
  } = useDashboard()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <WelcomeHeader userName={user?.fullName} />
      
      <StatsGrid stats={statsData} isLoading={isLoadingStats} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecentMeetings
          meetings={recentMeetings}
          hasCalendars={hasCalendars}
          isLoading={isLoadingMeetings}
        />
        
        <SidebarWidgets
          hasCalendars={hasCalendars}
          calendarCount={calendarCount}
          deploymentMode={user?.deploymentMode}
        />
      </div>
    </motion.div>
  )
}
