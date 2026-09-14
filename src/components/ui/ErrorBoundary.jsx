import { Component } from 'react'
import { RefreshCw, TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/Button'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
    this.props.onError?.(error, info)
  }

  handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    if (this.props.fallback) {
      return typeof this.props.fallback === 'function'
        ? this.props.fallback(error, this.handleRetry)
        : this.props.fallback
    }

    return (
      <div
        role="alert"
        className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-5 py-16 text-center"
      >
        <span className="grid size-12 place-items-center rounded-full border border-ink-600 bg-ink-800">
          <TriangleAlert className="size-5 text-brand-500" aria-hidden="true" />
        </span>

        <h1 className="text-2xl font-bold text-chalk-50">This screen did not load</h1>

        <p className="max-w-md text-sm leading-relaxed text-chalk-400">
          Something broke while rendering this page. Nothing you were working on has been saved
          or lost by it. Reloading usually clears it — everything else in the dashboard is still
          available from the sidebar.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Reload
          </Button>
          <Button size="sm" variant="ghost" onClick={this.handleRetry}>
            Try again
          </Button>
        </div>

        {import.meta.env.DEV && (
          <pre className="mt-3 max-w-full overflow-auto rounded-md border border-ink-600 bg-ink-900 p-3 text-left text-[11px] text-chalk-400">
            {String(error?.stack ?? error)}
          </pre>
        )}
      </div>
    )
  }
}

export default ErrorBoundary