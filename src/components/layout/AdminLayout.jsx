import { useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarClock,
  ExternalLink,
  LayoutDashboard,
  Menu,
  MessageSquare,
  PlayCircle,
  Tags,
  UserPlus,
  Users,
  X,
} from 'lucide-react'

import { api } from '@/lib/api'
import { keys } from '@/lib/queryClient'
import { initials } from '@/lib/utils'
import { useAuth } from '@/store/auth'
import { Logo } from '@/components/layout/Logo'
import { Badge } from '@/components/ui/Feedback'

/**
 * Navigation is grouped by the question the coach is answering, not by the
 * database table underneath it. "Who needs me" comes first because that is
 * what a coach opens this app to find out; "what we sell" is a monthly job and
 * sits at the bottom.
 */
const SECTIONS = [
  {
    heading: null,
    items: [{ to: '/', label: 'Overview', icon: LayoutDashboard, end: true }],
  },
  {
    heading: 'Coaching',
    items: [
      { to: '/clients', label: 'Clients', icon: Users },
      { to: '/messages', label: 'Messages', icon: MessageSquare, badge: 'unread' },
    ],
  },
  {
    heading: 'Pipeline',
    items: [
      { to: '/enquiries', label: 'Enquiries', icon: UserPlus, badge: 'leads' },
      { to: '/bookings', label: 'Consultations', icon: CalendarClock, badge: 'bookings' },
    ],
  },
  {
    heading: 'Content',
    items: [
      { to: '/tutorials', label: 'Video Tutorials', icon: PlayCircle },
      { to: '/exercises', label: 'Exercise Library', icon: Tags },
    ],
  },
  {
    heading: 'Business',
    items: [{ to: '/plans', label: 'Pricing Plans', icon: Tags }],
  },
]

const PORTAL_URL = import.meta.env.VITE_PORTAL_URL || 'https://autonomyfitness.press'
const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || 'production'

function NavItems({ counts, onNavigate }) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto" aria-label="Dashboard">
      {SECTIONS.map((section, index) => (
        <div key={section.heading ?? index}>
          {section.heading && (
            <p className="mb-1.5 px-3 font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-chalk-500">
              {section.heading}
            </p>
          )}
          <div className="space-y-0.5">
            {section.items.map(({ to, label, icon: Icon, end, badge }) => {
              const count = badge ? counts[badge] : 0
              return (
                <NavLink key={to} to={to} end={end} onClick={onNavigate} className="side-link">
                  <Icon className="size-4.25 shrink-0" aria-hidden="true" />
                  <span className="flex-1 truncate">{label}</span>
                  {count > 0 && (
                    <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

function AccountCard() {
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const name = user?.display_name || user?.full_name || 'Coach'

  return (
    <div className="mt-4 space-y-2 border-t border-ink-700 pt-4">
      {ENVIRONMENT !== 'production' && (
        <Badge tone="amber" className="w-full justify-center py-1 uppercase">
          {ENVIRONMENT}
        </Badge>
      )}

      <a
        href={PORTAL_URL}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-chalk-500 transition hover:text-white"
      >
        <ExternalLink className="size-3.5" aria-hidden="true" />
        Open client portal
      </a>

      <div className="flex items-center gap-2.5 rounded-lg bg-ink-800 px-3 py-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-500 text-xs font-bold text-white">
          {initials(name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-chalk-50">{name}</span>
          <span className="block text-[11px] capitalize text-chalk-500">{user?.role}</span>
        </span>
      </div>

      <button
        type="button"
        onClick={logout}
        className="w-full rounded-lg border border-ink-600 px-3 py-2 text-xs text-chalk-400 transition hover:border-ink-500 hover:text-chalk-50"
      >
        Sign out
      </button>
    </div>
  )
}

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  // One poll drives every badge in the sidebar. Six separate polls would put
  // six requests a minute on the API for numbers that change hourly.
  const { data: overview } = useQuery({
    queryKey: keys.overview(30),
    queryFn: () => api.overview(30),
    refetchInterval: 120_000,
  })

  const counts = {
    unread: overview?.counts?.unread_messages ?? 0,
    leads: overview?.counts?.new_leads ?? 0,
    bookings: overview?.counts?.pending_bookings ?? 0,
  }

  return (
    <div className="min-h-dvh bg-ink-950">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4">
        Skip to content
      </a>

      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-ink-700 bg-ink-900 p-3.5 lg:flex">
        <div className="mb-5 px-2 pt-1">
          <Logo size="sm" />
          <p className="mt-1 font-display text-[10px] uppercase tracking-[0.2em] text-chalk-500">
            Coach Dashboard
          </p>
        </div>
        <NavItems counts={counts} />
        <AccountCard />
      </aside>

      {/* Mobile bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink-700 bg-ink-900/95 px-4 py-3 backdrop-blur lg:hidden">
        <Logo size="sm" />
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          className="rounded-lg border border-ink-600 p-2 text-chalk-400 transition hover:text-chalk-50"
        >
          <Menu className="size-5" />
        </button>
      </header>

      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/75 lg:hidden"
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-72 flex-col border-l border-ink-700 bg-ink-900 p-4 lg:hidden">
            <div className="mb-5 flex items-center justify-between">
              <p className="font-display text-[10px] uppercase tracking-[0.2em] text-chalk-500">
                Menu
              </p>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-1.5 text-chalk-400 transition hover:text-chalk-50"
              >
                <X className="size-5" />
              </button>
            </div>
            <NavItems counts={counts} onNavigate={() => setMenuOpen(false)} />
            <AccountCard />
          </div>
        </>
      )}

      <div className="lg:pl-60">
        <main id="main" className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}