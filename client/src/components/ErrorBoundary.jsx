import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-mesh text-ink p-4">
          <div className="w-full max-w-md rounded-2xl bg-white/80 p-8 shadow-lg backdrop-blur-xl text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-coral/10">
              <svg
                className="h-8 w-8 text-coral"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h1 className="mb-2 font-display text-xl font-semibold">Something went wrong</h1>
            <p className="mb-6 text-sm text-ink/60">
              An unexpected error occurred. Please try again or contact support if the problem persists.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleRetry}
                className="w-full rounded-xl bg-teal px-4 py-2.5 text-sm font-medium text-white hover:bg-teal/90 transition"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full rounded-xl bg-ink/5 px-4 py-2.5 text-sm font-medium text-ink hover:bg-ink/10 transition"
              >
                Reload Page
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-xs text-ink/50 hover:text-ink/70">
                  Error Details
                </summary>
                <pre className="mt-2 overflow-auto rounded-lg bg-ink/5 p-3 text-xs text-coral">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
