import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/navigation/Sidebar'
import Header from '@/components/navigation/Header'

/**
 * Layout principal de la aplicación
 * Incluye sidebar de navegación y header
 */
export default function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-950">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Contenido principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />
        
        {/* Área de contenido */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

