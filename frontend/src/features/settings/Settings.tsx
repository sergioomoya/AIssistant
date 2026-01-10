/**
 * Página de configuración - Componente principal
 * 
 * Refactorizado: Lógica en useSettings hook, UI en componentes separados
 */

import { useState } from 'react'
import { Server, Key, Lock, Palette, Calendar, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSettings } from './hooks/useSettings'
import {
  DeploymentSection,
  CalendarsSection,
  ApiKeysSection,
  PrivacySection,
  PreferencesSection,
} from './components'

type SectionId = 'deployment' | 'calendars' | 'apikeys' | 'privacy' | 'preferences'

const SECTIONS = [
  { id: 'deployment' as const, label: 'Modo de despliegue', icon: Server },
  { id: 'calendars' as const, label: 'Calendarios', icon: Calendar },
  { id: 'apikeys' as const, label: 'API Keys', icon: Key },
  { id: 'privacy' as const, label: 'Privacidad', icon: Lock },
  { id: 'preferences' as const, label: 'Preferencias', icon: Palette },
]

export default function Settings() {
  const [activeSection, setActiveSection] = useState<SectionId>('deployment')
  
  const {
    user,
    apiKeys,
    showApiKeys,
    settings,
    isLoadingSettings,
    calendarProviders,
    calendarConnections,
    isLoadingCalendars,
    updateDeploymentMode,
    updatePrivacy,
    connectCalendar,
    disconnectCalendar,
    syncCalendars,
    updateApiKeysMutation,
    toggleShowApiKey,
    updateApiKey,
    saveApiKey,
  } = useSettings()

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-white">
          Configuración
        </h1>
        <p className="text-surface-400">
          Personaliza AIssistant según tus necesidades
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar de navegación */}
        <SettingsNav
          sections={SECTIONS}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        
        {/* Contenido */}
        <div className="lg:col-span-3 card">
          {activeSection === 'deployment' && (
            <DeploymentSection
              currentMode={user?.deploymentMode}
              onModeChange={(mode) => updateDeploymentMode.mutate(mode)}
              isPending={updateDeploymentMode.isPending}
            />
          )}
          
          {activeSection === 'calendars' && (
            <CalendarsSection
              connections={calendarConnections}
              providers={calendarProviders}
              isLoading={isLoadingCalendars}
              onConnect={(provider) => connectCalendar.mutate(provider)}
              onDisconnect={(id) => disconnectCalendar.mutate(id)}
              onSync={() => syncCalendars.mutate()}
              isConnecting={connectCalendar.isPending}
              isDisconnecting={disconnectCalendar.isPending}
              isSyncing={syncCalendars.isPending}
            />
          )}
          
          {activeSection === 'apikeys' && (
            <ApiKeysSection
              settings={settings}
              apiKeys={apiKeys}
              showApiKeys={showApiKeys}
              onToggleShow={toggleShowApiKey}
              onUpdateKey={updateApiKey}
              onSaveKey={saveApiKey}
              isPending={updateApiKeysMutation.isPending}
            />
          )}
          
          {activeSection === 'privacy' && (
            <PrivacySection
              settings={settings}
              onUpdatePrivacy={(data) => updatePrivacy.mutate(data)}
            />
          )}
          
          {activeSection === 'preferences' && (
            <PreferencesSection settings={settings} />
          )}
        </div>
      </div>
    </div>
  )
}

// ========== Sub-componentes ==========

interface SettingsNavProps {
  sections: typeof SECTIONS
  activeSection: SectionId
  onSectionChange: (id: SectionId) => void
}

function SettingsNav({ sections, activeSection, onSectionChange }: SettingsNavProps) {
  return (
    <div className="space-y-1">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => onSectionChange(section.id)}
          className={cn(
            "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all",
            activeSection === section.id
              ? "bg-primary-500/10 text-primary-400"
              : "text-surface-400 hover:text-white hover:bg-surface-800"
          )}
        >
          <section.icon className="w-5 h-5" />
          <span className="font-medium">{section.label}</span>
        </button>
      ))}
    </div>
  )
}
