import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

export const http = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // carries the HttpOnly refresh cookie
  timeout: 30000,
  headers: { Accept: 'application/json' },
})

// The access token is held in memory only. Nothing about a coach's session is
// written to localStorage, so an XSS bug cannot walk away with the keys to
// every client record in the system.
let accessToken = null
let onSessionLost = () => {}

export function setAccessToken(token) {
  accessToken = token
}
export function getAccessToken() {
  return accessToken
}
export function onUnauthenticated(handler) {
  onSessionLost = handler
}

http.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

// One shared refresh: a screen that fires six queries at once should not
// trigger six token rotations and invalidate five of them.
let refreshPromise = null

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status
    const isAuthRoute = original?.url?.includes('/auth/')

    if (status === 401 && !original?._retried && !isAuthRoute) {
      original._retried = true
      try {
        refreshPromise ??= http.post('/auth/refresh').finally(() => {
          refreshPromise = null
        })
        const { data } = await refreshPromise
        setAccessToken(data.access_token)
        original.headers.Authorization = `Bearer ${data.access_token}`
        return http(original)
      } catch {
        setAccessToken(null)
        onSessionLost()
      }
    }
    return Promise.reject(error)
  },
)

/** Turn any API failure into a sentence worth showing a person. */
export function errorMessage(error, fallback = 'Something went wrong. Try again.') {
  const data = error?.response?.data
  if (data?.fields) return Object.values(data.fields)[0]
  if (typeof data?.detail === 'string') return data.detail
  if (error?.response?.status === 403) return 'That action needs an admin account.'
  if (error?.code === 'ECONNABORTED') return 'That took too long. Check your connection and retry.'
  if (!error?.response) return 'Cannot reach the server. Check your connection.'
  return fallback
}

const get = (url, params) => http.get(url, { params }).then((r) => r.data)
const post = (url, body) => http.post(url, body).then((r) => r.data)
const put = (url, body) => http.put(url, body).then((r) => r.data)
const patch = (url, body) => http.patch(url, body).then((r) => r.data)
const del = (url, params) => http.delete(url, { params }).then((r) => r.data)

export const api = {
  auth: {
    login: (body) => post('/auth/login', body),
    refresh: () => post('/auth/refresh'),
    logout: () => post('/auth/logout'),
    me: () => get('/auth/me'),
    changePassword: (body) => post('/auth/change-password', body),
    forgotPassword: (body) => post('/auth/forgot-password', body),
  },

  overview: (days = 30) => get('/admin/overview', { days }),

  clients: {
    list: (params) => get('/admin/clients', params),
    create: (body) => post('/admin/clients', body),
    get: (id, days = 180) => get(`/admin/clients/${id}`, { days }),
    updateAccount: (id, body) => patch(`/admin/clients/${id}`, body),
    updateProfile: (id, body) => patch(`/admin/clients/${id}/profile`, body),
    // `hard` erases the record; the default deactivates and is reversible.
    remove: (id, hard = false) => del(`/admin/clients/${id}`, { hard }),
    resetPassword: (id, password) => post(`/admin/clients/${id}/reset-password`, { password }),
    activity: (id) => get(`/admin/clients/${id}/activity`),
    exportRecord: (id) => get(`/admin/clients/${id}/export`),
  },

  training: {
    plans: (clientId) => get(`/admin/clients/${clientId}/plans`),
    create: (clientId, body) => post(`/admin/clients/${clientId}/plans`, body),
    replace: (planId, body) => put(`/admin/plans/${planId}`, body),
    activate: (planId) => post(`/admin/plans/${planId}/activate`),
    duplicate: (planId) => post(`/admin/plans/${planId}/duplicate`),
    remove: (planId) => del(`/admin/plans/${planId}`),
  },

  nutrition: {
    plans: (clientId) => get(`/admin/clients/${clientId}/meal-plans`),
    create: (clientId, body) => post(`/admin/clients/${clientId}/meal-plans`, body),
    replace: (planId, body) => put(`/admin/meal-plans/${planId}`, body),
    activate: (planId) => post(`/admin/meal-plans/${planId}/activate`),
    remove: (planId) => del(`/admin/meal-plans/${planId}`),
  },

  programs: {
    list: () => get('/admin/programs'),
    create: (body) => post('/admin/programs', body),
    update: (id, body) => patch(`/admin/programs/${id}`, body),
    remove: (id, hard = false) => del(`/admin/programs/${id}`, { hard }),
    reorder: (ids) => post('/admin/programs/reorder', ids),
  },

  tutorials: {
    list: (params) => get('/admin/tutorials', params),
    create: (body) => post('/admin/tutorials', body),
    update: (id, body) => patch(`/admin/tutorials/${id}`, body),
    remove: (id) => del(`/admin/tutorials/${id}`),
    reorder: (ids) => post('/admin/tutorials/reorder', ids),
  },

  // The exercise library is shared with the client portal, so these are the
  // existing coach-only routes rather than anything under /admin.
  exercises: {
    list: (params) => get('/exercises', params),
    filters: () => get('/exercises/filters'),
    create: (body) => post('/exercises', body),
    update: (id, body) => patch(`/exercises/${id}`, body),
    retire: (id) => del(`/exercises/${id}`),
  },

  inbox: {
    threads: (params) => get('/admin/threads', params),
    thread: (clientId) => get(`/admin/clients/${clientId}/thread`),
    reply: (clientId, body) => post(`/admin/clients/${clientId}/thread`, body),
    leads: (params) => get('/admin/leads', params),
    updateLead: (id, body) => patch(`/admin/leads/${id}`, body),
    removeLead: (id) => del(`/admin/leads/${id}`),
    bookings: (params) => get('/admin/bookings', params),
    updateBooking: (id, body) => patch(`/admin/bookings/${id}`, body),
    removeBooking: (id) => del(`/admin/bookings/${id}`),
  },
}