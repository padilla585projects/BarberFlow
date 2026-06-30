import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          color: '#fff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: 480,
            padding: '2rem',
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
              &#x26A0;&#xFE0F;
            </div>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              marginBottom: '0.75rem',
              color: '#C9A84C',
            }}>
              Algo salio mal
            </h1>
            <p style={{
              color: '#999',
              fontSize: '0.95rem',
              marginBottom: '1.5rem',
              lineHeight: 1.5,
            }}>
              {this.state.error?.message || 'Ha ocurrido un error inesperado.'}
            </p>
            <button
              onClick={this.handleReload}
              style={{
                background: '#C9A84C',
                color: '#0a0a0a',
                border: 'none',
                borderRadius: 8,
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity 0.2s',
              }}
              onMouseOver={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseOut={e => (e.currentTarget.style.opacity = '1')}
            >
              Reintentar
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export { ErrorBoundary }
export default ErrorBoundary
