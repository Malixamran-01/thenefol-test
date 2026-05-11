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

    return (
      <div className="mx-auto w-full max-w-xl px-4 py-10">
        <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-red-700">This page failed to load on your browser.</p>
          <p className="mt-1 text-xs text-gray-600">
            Please send this error text to support/dev so we can fix Safari compatibility.
          </p>
          <pre className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-red-50 p-3 text-[11px] text-red-800">
            {this.props.name ? `${this.props.name}: ` : ''}{this.state.message || 'Unknown error'}
            {this.state.stack ? `\n\nStack:\n${this.state.stack}` : ''}
            {this.state.componentStack ? `\n\nComponent stack:\n${this.state.componentStack}` : ''}
          </pre>
          <button
            className="mt-4 w-full rounded-xl bg-[#1B4965] px-4 py-2.5 text-sm font-semibold text-white"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}

