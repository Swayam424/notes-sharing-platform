import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Atelier ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      localStorage.removeItem('atelier_auth_token');
      localStorage.removeItem('atelier_student_session');
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#F4EFE8',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          color: '#171A18',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.85)',
            borderRadius: '16px',
            padding: '32px 24px',
            boxShadow: '0 12px 38px -6px rgba(70, 50, 30, 0.12)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(200, 75, 40, 0.12)',
              color: '#C84B28',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              margin: '0 auto 16px'
            }}>
              ✦
            </div>
            <h1 style={{
              fontFamily: "'Newsreader', Georgia, serif",
              fontSize: '24px',
              fontWeight: 600,
              margin: '0 0 8px',
              color: '#171A18'
            }}>
              Atelier Academic Studio
            </h1>
            <p style={{
              fontSize: '14px',
              color: '#4A453C',
              lineHeight: 1.5,
              margin: '0 0 20px'
            }}>
              An unexpected issue occurred while rendering this view.
            </p>
            {this.state.error?.message && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.04)',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: '#C84B28',
                textAlign: 'left',
                overflowX: 'auto',
                margin: '0 0 24px'
              }}>
                {this.state.error.message}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  background: '#C84B28',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '10px 22px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Reload Studio
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  background: 'transparent',
                  color: '#4A453C',
                  border: '1px solid rgba(0, 0, 0, 0.15)',
                  borderRadius: '9999px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Clear Cache & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
