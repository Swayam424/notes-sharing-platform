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
          background: 'var(--color-base)',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          color: 'var(--color-deep)',
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
            boxShadow: '0 12px 38px -6px color-mix(in srgb, var(--color-deep) 12%, transparent)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
              color: 'var(--color-primary)',
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
              color: 'var(--color-deep)'
            }}>
              Atelier Academic Studio
            </h1>
            <p style={{
              fontSize: '14px',
              color: 'var(--color-deep)',
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
                color: 'var(--color-primary)',
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
                  background: 'var(--color-deep)',
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
                  color: 'var(--color-deep)',
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
