import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router'
import { ShieldCheck } from 'lucide-react'

import { useAuth } from '@/store/auth'
import { errorMessage } from '@/lib/api'
import { Logo } from '@/components/layout/Logo'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'

export default function LoginPage() {
  const login = useAuth((s) => s.login)
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login({ email: email.trim(), password })
      navigate(location.state?.from ?? '/', { replace: true })
    } catch (failure) {
      // A thrown Error is the role check refusing a client account; anything
      // else came off the wire.
      setError(failure instanceof Error && !failure.response ? failure.message : errorMessage(failure))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink-950 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo size="hero" variant="full" to={null} className="mx-auto" />
          <p className="mt-3 font-display text-[11px] uppercase tracking-[0.22em] text-chalk-500">
            Coach Dashboard
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-xl border border-ink-600 bg-ink-850 p-6"
          noValidate
        >
          <div>
            <h1 className="text-2xl">Sign in</h1>
            <p className="mt-1.5 text-sm text-chalk-400">
              Coach and admin accounts only. Clients sign in on the portal.
            </p>
          </div>

          <Input
            label="Email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {error && (
            <p role="alert" className="rounded-md border border-brand-500/40 bg-brand-500/10 px-3 py-2 text-sm text-brand-400">
              {error}
            </p>
          )}

          <Button type="submit" fullWidth loading={busy} disabled={!email || !password}>
            Sign in
          </Button>

          <p className="flex items-start gap-2 pt-1 text-xs leading-relaxed text-chalk-500">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            This dashboard reads and writes real client records. Do not sign in on a shared
            machine, and sign out when you are done.
          </p>
        </form>
      </div>
    </div>
  )
}