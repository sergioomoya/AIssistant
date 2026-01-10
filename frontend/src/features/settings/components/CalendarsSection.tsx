/**
 * Sección de configuración de calendarios
 */

import { motion } from 'framer-motion'
import { Calendar, Unlink, RefreshCw, ExternalLink, Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'
import { ProviderIconContainer, ProviderIcon } from '@/components/ui'
import type { CalendarConnection } from '../hooks/useSettings'

interface CalendarsSectionProps {
  connections: CalendarConnection[]
  providers?: { providers: Array<{ id: string; name: string }> }
  isLoading: boolean
  onConnect: (provider: string) => void
  onDisconnect: (connectionId: number) => void
  onSync: () => void
  isConnecting: boolean
  isDisconnecting: boolean
  isSyncing: boolean
}

export function CalendarsSection({
  connections,
  providers,
  isLoading,
  onConnect,
  onDisconnect,
  onSync,
  isConnecting,
  isDisconnecting,
  isSyncing,
}: CalendarsSectionProps) {
  const hasConnections = connections.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white mb-2">
            Calendarios conectados
          </h2>
          <p className="text-surface-400">
            Sincroniza tus calendarios para ver reuniones automáticamente
          </p>
        </div>
        
        {hasConnections && (
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
            Sincronizar
          </button>
        )}
      </div>
      
      {/* Lista de conexiones */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
        </div>
      ) : hasConnections ? (
        <div className="space-y-3">
          {connections.map((connection) => (
            <CalendarConnectionCard
              key={connection.id}
              connection={connection}
              onDisconnect={() => onDisconnect(connection.id)}
              isDisconnecting={isDisconnecting}
            />
          ))}
        </div>
      ) : (
        <EmptyCalendarsState />
      )}
      
      {/* Proveedores disponibles */}
      <div className="pt-4 border-t border-surface-700">
        <h3 className="text-sm font-medium text-surface-300 mb-4">
          Conectar nuevo calendario
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {providers?.providers?.map((provider) => {
            const isConnected = connections.some(
              (c) => c.provider === provider.id && c.is_active
            )
            
            return (
              <ProviderButton
                key={provider.id}
                provider={provider}
                isConnected={isConnected}
                isConnecting={isConnecting}
                onConnect={() => onConnect(provider.id)}
              />
            )
          })}
          
          {(!providers?.providers || providers.providers.length === 0) && (
            <div className="col-span-2 text-center py-4 text-surface-500">
              <p>No hay proveedores de calendario configurados en el servidor.</p>
              <p className="text-sm">Contacta al administrador para habilitar la integración.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Info adicional */}
      <div className="p-4 bg-primary-500/10 border border-primary-500/30 rounded-xl">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-primary-400 mt-0.5" />
          <div>
            <h3 className="font-medium text-primary-400">Sincronización automática</h3>
            <p className="text-sm text-surface-300 mt-1">
              Tus reuniones se sincronizarán automáticamente cada 15 minutos. 
              Las reuniones con enlaces de videoconferencia (Zoom, Meet, Teams) 
              se detectarán automáticamente.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ========== Sub-componentes ==========

function CalendarConnectionCard({ 
  connection, 
  onDisconnect, 
  isDisconnecting 
}: { 
  connection: CalendarConnection
  onDisconnect: () => void
  isDisconnecting: boolean
}) {
  const providerType = connection.provider === 'google' ? 'google' : 'outlook'
  
  return (
    <div className="flex items-center justify-between p-4 bg-surface-800/50 rounded-xl">
      <div className="flex items-center gap-4">
        <ProviderIconContainer provider={providerType}>
          <ProviderIcon provider={providerType} />
        </ProviderIconContainer>
        
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">
              {connection.provider === 'google' ? 'Google Calendar' : 'Outlook Calendar'}
            </span>
            {connection.is_active && (
              <span className="badge badge-success text-xs">Conectado</span>
            )}
          </div>
          <p className="text-sm text-surface-400">{connection.account_email}</p>
          {connection.last_sync_at && (
            <p className="text-xs text-surface-500">
              Última sincronización: {new Date(connection.last_sync_at).toLocaleString()}
            </p>
          )}
          {connection.sync_error && (
            <p className="text-xs text-red-400 mt-1">{connection.sync_error}</p>
          )}
        </div>
      </div>
      
      <button
        onClick={onDisconnect}
        disabled={isDisconnecting}
        className="btn-ghost text-red-400 hover:text-red-300 hover:bg-red-500/10"
      >
        <Unlink className="w-4 h-4 mr-2" />
        Desconectar
      </button>
    </div>
  )
}

function EmptyCalendarsState() {
  return (
    <div className="text-center py-8 text-surface-400">
      <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
      <p>No hay calendarios conectados</p>
      <p className="text-sm">Conecta un calendario para sincronizar tus reuniones</p>
    </div>
  )
}

function ProviderButton({
  provider,
  isConnected,
  isConnecting,
  onConnect,
}: {
  provider: { id: string; name: string }
  isConnected: boolean
  isConnecting: boolean
  onConnect: () => void
}) {
  const providerType = provider.id === 'google' ? 'google' : 'outlook'
  
  return (
    <button
      onClick={onConnect}
      disabled={isConnected || isConnecting}
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
        isConnected
          ? "border-surface-700 bg-surface-800/30 opacity-60 cursor-not-allowed"
          : "border-surface-700 hover:border-primary-500 hover:bg-surface-800"
      )}
    >
      <ProviderIconContainer provider={providerType}>
        <ProviderIcon provider={providerType} />
      </ProviderIconContainer>
      
      <div className="flex-1 text-left">
        <span className="font-medium text-white">{provider.name}</span>
        {isConnected && (
          <p className="text-xs text-surface-400">Ya conectado</p>
        )}
      </div>
      
      {!isConnected && (
        <ExternalLink className="w-4 h-4 text-surface-400" />
      )}
    </button>
  )
}

