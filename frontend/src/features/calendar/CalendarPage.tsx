import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader2, AlertCircle, RefreshCw, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '@/utils/api'
import { useCalendarState } from './hooks/useCalendarState'
import { useCalendarEvents } from './hooks/useCalendarEvents'

// Componentes locales
import CalendarSidebar from './components/CalendarSidebar'
import CalendarHeader from './components/CalendarHeader'
import MonthView from './components/MonthView'
import WeekView from './components/WeekView'
import DayView from './components/DayView'

export default function CalendarPage() {
  const {
    view,
    currentDate,
    selectedProviders,
    setView,
    setCurrentDate,
    goToToday,
    goToNext,
    goToPrevious,
    toggleProvider,
  } = useCalendarState()

  const {
    events,
    isLoading,
    error,
    refetch,
  } = useCalendarEvents({
    currentDate,
    view,
    selectedProviders,
  })

  const [isSyncing, setIsSyncing] = useState(false)

  // Sincronizar automáticamente en segundo plano al montar la página
  useEffect(() => {
    const autoSync = async () => {
      try {
        await api.post('/calendar/sync')
        refetch()
      } catch (e) {
        console.error('Error en sincronización automática:', e)
      }
    }
    autoSync()
  }, [refetch])

  // Sincronización manual interactiva
  const handleSyncCalendars = async () => {
    if (isSyncing) return
    setIsSyncing(true)
    const syncToast = toast.loading('Sincronizando calendarios externos...')
    
    try {
      const response = await api.post('/calendar/sync')
      const data = response.data
      toast.success(
        `Sincronización completada: ${data.meetings_created} nuevas, ${data.meetings_updated} actualizadas`,
        { id: syncToast }
      )
      refetch()
    } catch (e) {
      toast.error('Error al sincronizar los calendarios', { id: syncToast })
    } finally {
      setIsSyncing(false)
    }
  }

  // Renderizado del contenido del calendario según la vista activa
  const renderCalendarView = () => {
    switch (view) {
      case 'month':
        return (
          <MonthView
            currentDate={currentDate}
            events={events}
            onDateSelect={setCurrentDate}
            onViewChange={setView}
          />
        )
      case 'week':
        return (
          <WeekView
            currentDate={currentDate}
            events={events}
            workWeekOnly={false}
            onDateSelect={setCurrentDate}
          />
        )
      case 'workWeek':
        return (
          <WeekView
            currentDate={currentDate}
            events={events}
            workWeekOnly={true}
            onDateSelect={setCurrentDate}
          />
        )
      case 'day':
        return (
          <DayView
            currentDate={currentDate}
            events={events}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Cabecera Principal de Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Mi Calendario</h1>
          <p className="text-sm text-surface-400">
            Visualiza y gestiona todos tus eventos y reuniones sincronizados.
          </p>
        </div>
        
        {/* Botón de Sincronización Manual */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {isLoading && !isSyncing && (
            <div className="flex items-center gap-2 text-xs text-primary-400 bg-primary-500/10 px-3 py-1.5 rounded-lg border border-primary-500/25">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Sincronizando...
            </div>
          )}
          
          <button
            onClick={handleSyncCalendars}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-primary-600/25"
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Sincronizar ahora
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid Principal: Sidebar + Contenido del Calendario */}
      <div className="flex flex-col lg:flex-row gap-6 items-start flex-1 min-h-0">
        
        {/* Sidebar Izquierdo */}
        <CalendarSidebar
          currentDate={currentDate}
          onDateSelect={setCurrentDate}
          selectedProviders={selectedProviders}
          onToggleProvider={toggleProvider}
        />

        {/* Panel de Calendario Principal */}
        <div className="flex-1 w-full flex flex-col gap-4 self-stretch min-w-0">
          
          {/* Header de Navegación y Vistas */}
          <CalendarHeader
            currentDate={currentDate}
            view={view}
            onViewChange={setView}
            onPrev={goToPrevious}
            onNext={goToNext}
            onToday={goToToday}
          />

          {/* Área de Visualización */}
          <div className="flex-1 flex flex-col min-h-0 relative">
            
            {/* Pantalla de Error */}
            {error ? (
              <div className="flex-1 flex flex-col items-center justify-center card py-16 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
                <h3 className="text-lg font-semibold text-white mb-1">Error al sincronizar calendario</h3>
                <p className="text-sm text-surface-400 max-w-sm mb-4">
                  No pudimos cargar tus eventos. Por favor verifica tu conexión de red o vuelve a intentarlo.
                </p>
                <button
                  onClick={() => refetch()}
                  className="btn-secondary flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reintentar
                </button>
              </div>
            ) : isLoading && events.length === 0 ? (
              /* Pantalla de Carga Inicial */
              <div className="flex-1 flex items-center justify-center py-24">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
                  <span className="text-sm text-surface-400 font-medium">Cargando eventos...</span>
                </div>
              </div>
            ) : (
              /* Calendario Activo */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col min-h-0"
              >
                {renderCalendarView()}
              </motion.div>
            )}

          </div>

        </div>

      </div>

    </div>
  )
}
