import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
      <p className="font-display text-6xl font-bold text-brand-500">404</p>
      <h1 className="mt-4 text-2xl">No screen at that address</h1>
      <p className="mt-2 max-w-sm text-sm text-chalk-400">
        The link may be out of date. The overview has everything current.
      </p>
      <Button to="/" className="mt-6" size="sm">
        Back to overview
      </Button>
    </div>
  )
}