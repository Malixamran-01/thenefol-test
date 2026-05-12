import React from 'react'

type Props = {
  name?: string
  children: React.ReactNode
}

type State = {
  hasError: boolean
  message: string
  stack: string
  componentStack: string
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '', stack: '', componentStack: '' }

  static getDerivedStateFromError(err: unknown): State {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? (err.stack || '') : ''
    return { hasError: true, message: msg, stack, componentStack: '' }
  }

  componentDidCatch(err: unknown, info: React.ErrorInfo) {
    const stack = err instanceof Error ? (err.stack || '') : ''
    const componentStack = info?.componentStack || ''
    this.setState((prev) => ({ ...prev, stack, componentStack }))
    // Keep console logging for debugging (Safari remote inspector)
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary] ${this.props.name || 'render'} error:`, err, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    // Minimal fallback (no long stack/pre) — avoids any chance of heavy re-render while debugging Safari.
    const label = this.props.name ? `${this.props.name}: ` : ''
    return (
      <div className="p-6 text-sm text-red-800" style={{ fontFamily: 'system-ui, sans-serif' }}>
        <p className="font-semibold">Error</p>
        <p className="mt-1">{label}{this.state.message || 'Unknown error'}</p>
        <button
          type="button"
          className="mt-3 rounded border border-gray-400 px-3 py-1.5 text-xs"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    )
  }
}

