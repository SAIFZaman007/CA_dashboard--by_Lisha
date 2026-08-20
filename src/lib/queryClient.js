import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Shorter than the client portal's: a coach acts on what they see here,
      // so stale numbers are worse than an extra request.
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        // Never retry something the server has already refused on its merits.
        const status = error?.response?.status
        if (status >= 400 && status < 500) return false
        return failureCount < 2
      },
    },
    mutations: { retry: false },
  },
})

/** Query keys in one place so no invalidation ever misses a cache. */
export const keys = {
  overview: (days) => ['overview', days],
  clients: (params) => ['clients', params],
  client: (id) => ['client', id],
  clientActivity: (id) => ['client', id, 'activity'],
  plans: (clientId) => ['plans', clientId],
  mealPlans: (clientId) => ['meal-plans', clientId],
  programs: ['programs'],
  tutorials: (params) => ['tutorials', params],
  exercises: (params) => ['exercises', params],
  threads: (params) => ['threads', params],
  thread: (clientId) => ['thread', clientId],
  leads: (params) => ['leads', params],
  bookings: (params) => ['bookings', params],
}