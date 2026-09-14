import { Suspense, useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router'

import { useAuth } from '@/store/auth'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { FullPageSpinner, Spinner } from '@/components/ui/Feedback'
import { ToastHost } from '@/components/ui/Toast'
import { clearChunkReloadFlag, lazyWithRetry } from '@/lib/lazyWithRetry'

const LoginPage = lazyWithRetry(() => import('@/pages/LoginPage'))
const OverviewPage = lazyWithRetry(() => import('@/pages/OverviewPage'))
const ClientsPage = lazyWithRetry(() => import('@/pages/clients/ClientsPage'))
const ClientDetailPage = lazyWithRetry(() => import('@/pages/clients/ClientDetailPage'))
const MessagesPage = lazyWithRetry(() => import('@/pages/MessagesPage'))
const LeadsPage = lazyWithRetry(() => import('@/pages/LeadsPage'))
const BookingsPage = lazyWithRetry(() => import('@/pages/BookingsPage'))
const TutorialsPage = lazyWithRetry(() => import('@/pages/TutorialsPage'))
const ExercisesPage = lazyWithRetry(() => import('@/pages/ExercisesPage'))
const GalleryPage = lazyWithRetry(() => import('@/pages/GalleryPage'))
const PlansPage = lazyWithRetry(() => import('@/pages/PlansPage'))
const NotFound = lazyWithRetry(() => import('@/pages/NotFound'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function DashboardOutlet() {
  const { pathname } = useLocation()

  return (
    <ErrorBoundary key={pathname}>
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner className="size-6 text-brand-500" />
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  )
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

  useEffect(() => {
    clearChunkReloadFlag()
  }, [])

  return (
    <>
      <ScrollToTop />
      <ToastHost />
      <ErrorBoundary>
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
              <Route element={<DashboardOutlet />}>
                <Route index element={<OverviewPage />} />
                <Route path="clients" element={<ClientsPage />} />
                <Route path="clients/:clientId" element={<ClientDetailPage />} />
                <Route path="messages" element={<MessagesPage />} />
                <Route path="enquiries" element={<LeadsPage />} />
                <Route path="bookings" element={<BookingsPage />} />
                <Route path="tutorials" element={<TutorialsPage />} />
                <Route path="exercises" element={<ExercisesPage />} />
                <Route path="gallery" element={<GalleryPage />} />
                <Route path="plans" element={<PlansPage />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  )
}