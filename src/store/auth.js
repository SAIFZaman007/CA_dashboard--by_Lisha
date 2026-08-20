import { create } from 'zustand'
import { api, setAccessToken, onUnauthenticated } from '@/lib/api'

// One bootstrap per page load, no matter how many times it is called.
//
// React StrictMode double-invokes effects in development, so `bootstrap()` ran
// twice on every mount. Both calls hit /auth/refresh with the same cookie; the
// first rotated the token and the second presented one that had just been
// revoked — which the server read as a replay and signed the session out. That
// is why a reload logged you straight back out.
//
// The server now tolerates the race, but firing the second request at all is
// still waste. Holding the in-flight promise means later callers await the
// first result instead of starting another round trip.
let bootstrapPromise = null

/**
 * Session state for the dashboard.
 *
 * Two roles reach this app. A `coach` runs the day-to-day — reads records,
 * writes programmes, replies to messages. An `admin` can additionally open and
 * close accounts, change roles and edit pricing. A `client` is turned away at
 * sign-in rather than being shown a shell of a screen they cannot use.
 */
const STAFF_ROLES = ['coach', 'admin']

export const useAuth = create((set, get) => ({
  user: null,
  status: 'loading', // loading | authenticated | anonymous

  /** Runs once on app start; tries the refresh cookie for a silent sign-in. */
  bootstrap() {
    bootstrapPromise ??= get()
      ._doBootstrap()
      .finally(() => {
        bootstrapPromise = null
      })
    return bootstrapPromise
  },

  async _doBootstrap() {
    try {
      const { access_token } = await api.auth.refresh()
      setAccessToken(access_token)
      const user = await api.auth.me()

      if (!STAFF_ROLES.includes(user.role)) {
        setAccessToken(null)
        set({ user: null, status: 'anonymous' })
        return
      }
      set({ user, status: 'authenticated' })
    } catch {
      setAccessToken(null)
      set({ user: null, status: 'anonymous' })
    }
  },

  async login(credentials) {
    const { access_token } = await api.auth.login(credentials)
    setAccessToken(access_token)
    const user = await api.auth.me()

    if (!STAFF_ROLES.includes(user.role)) {
      // Sign the session straight back out — a client account must not be left
      // holding a live token against the admin API.
      await api.auth.logout().catch(() => {})
      setAccessToken(null)
      set({ user: null, status: 'anonymous' })
      throw new Error('That account does not have dashboard access.')
    }

    set({ user, status: 'authenticated' })
    return user
  },

  async logout() {
    try {
      await api.auth.logout()
    } finally {
      setAccessToken(null)
      bootstrapPromise = null
      set({ user: null, status: 'anonymous' })
    }
  },

  setUser: (user) => set({ user }),

  isAdmin: () => get().user?.role === 'admin',
}))

/** Convenience hook for gating the admin-only controls in a screen. */
export const useIsAdmin = () => useAuth((s) => s.user?.role === 'admin')

// If a refresh fails mid-session, drop the session cleanly rather than leaving
// the dashboard half-signed-in over someone's client record.
onUnauthenticated(() => useAuth.setState({ user: null, status: 'anonymous' }))