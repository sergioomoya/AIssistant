import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useAuthSync } from '@/hooks/useAuthSync'

// Layouts
import MainLayout from '@/components/layouts/MainLayout'
import AuthLayout from '@/components/layouts/AuthLayout'

// Pages
import Dashboard from '@/features/dashboard/Dashboard'
import MeetingsList from '@/features/meetings/MeetingsList'
import MeetingDetail from '@/features/meetings/MeetingDetail'
import LiveMeeting from '@/features/meetings/LiveMeeting'
import Settings from '@/features/settings/Settings'
import CalendarCallback from '@/features/settings/CalendarCallback'
import Login from '@/features/auth/Login'
import Register from '@/features/auth/Register'
import GoogleCallback from '@/features/auth/GoogleCallback'
import Onboarding from '@/features/onboarding/Onboarding'
import CalendarPage from '@/features/calendar/CalendarPage'

/**
 * Componente de ruta protegida
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

/**
 * Ruta que requiere onboarding completado
 */
function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user)
  const needsOnboarding = useAuthStore((state) => state.needsOnboarding)
  
  // Si necesita onboarding, redirigir
  if (needsOnboarding) {
    return <Navigate to="/setup" replace />
  }
  
  return <>{children}</>
}

/**
 * Componente principal de la aplicación
 */
export default function App() {
  // Sincronizar estado de autenticación con el backend
  useAuthSync()

  return (
    <Routes>
      {/* Rutas de autenticación */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      
      {/* OAuth Callbacks */}
      <Route path="/auth/google/callback" element={<GoogleCallback />} />
      <Route 
        path="/settings/calendar/callback" 
        element={
          <ProtectedRoute>
            <CalendarCallback />
          </ProtectedRoute>
        } 
      />
      
      {/* Onboarding - Configuración inicial */}
      <Route
        path="/setup"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />
      
      {/* Rutas protegidas con onboarding completado */}
      <Route
        element={
          <ProtectedRoute>
            <RequireOnboarding>
              <MainLayout />
            </RequireOnboarding>
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/meetings" element={<MeetingsList />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/meetings/new" element={<LiveMeeting />} />
        <Route path="/meetings/:id" element={<MeetingDetail />} />
        <Route path="/meetings/:id/live" element={<LiveMeeting />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
