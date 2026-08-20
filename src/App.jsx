import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'

import { useAuth } from '@/store/auth'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { FullPageSpinner } from '@/components/ui/Feedback'
import { ToastHost } from '@/components/ui/Toast'

const LoginPage = lazy(() => import('@/pages/LoginPage'))
const OverviewPage = lazy(() => import('@/pages/OverviewPage'))
const ClientsPage = lazy(() => import('@/pages/clients/ClientsPage'))
const ClientDetailPage = lazy(() => import('@/pages/clients/ClientDetailPage'))
const MessagesPage = lazy(() => import('@/pages/MessagesPage'))
const LeadsPage = lazy(() => import('@/pages/LeadsPage'))
const BookingsPage = lazy(() => import('@/pages/BookingsPage'))
const TutorialsPage = lazy(() => import('@/pages/TutorialsPage'))
const ExercisesPage = lazy(() => import('@/pages/ExercisesPage'))
const PlansPage = lazy(() => import('@/pages/PlansPage'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function RequireStaff({ children }) {
  const status = useAuth((s) => s.status)
  const location = useLocation()

  if (status === 'loading') return <FullPageSpinner label="Checking your session" />
  if (status === 'anonymous') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return children
}

function RedirectIfSignedIn({ children }) {
  const status = useAuth((s) => s.status)
  if (status === 'loading') return <FullPageSpinner />
  if (status === 'authenticated') return <Navigate to="/" replace />
  return children
}

export default function App() {
  const bootstrap = useAuth((s) => s.bootstrap)

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  return (
    <>
      <ScrollToTop />
      <ToastHost />
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          <Route
            path="/login"
            element={
              <RedirectIfSignedIn>
                <LoginPage />
              </RedirectIfSignedIn>
            }
          />

          <Route
            element={
              <RequireStaff>
                <AdminLayout />
              </RequireStaff>
            }
          >
            <Route index element={<OverviewPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="clients/:clientId" element={<ClientDetailPage />} />
            <Route path="messages" element={<MessagesPage />} />
            <Route path="enquiries" element={<LeadsPage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="tutorials" element={<TutorialsPage />} />
            <Route path="exercises" element={<ExercisesPage />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}