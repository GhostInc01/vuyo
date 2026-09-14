import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    try {
      localStorage.removeItem('localbiz_selected_merchant');
    } catch (e) {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-page flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-paper rounded-3xl border border-ink/15 shadow-2xl p-8 text-center space-y-6 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-3xl bg-warning/15 text-warning flex items-center justify-center mx-auto border border-warning/30">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="font-display font-black text-2xl text-ink">
                Something went wrong
              </h2>
              <p className="text-xs text-ink-muted leading-relaxed">
                An unexpected interface issue occurred. Your data and account remain safe. You can reload this view or return to the marketplace home.
              </p>
            </div>

            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <div className="text-left bg-paper-warm p-3 rounded-xl border border-ink/10 text-[11px] font-mono text-warning overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 px-4 py-2.5 rounded-xl bg-ink text-paper font-bold text-xs hover:bg-ink-soft flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <RotateCcw size={14} />
                <span>Reload App</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 px-4 py-2.5 rounded-xl bg-paper-warm border border-ink/20 text-ink font-bold text-xs hover:bg-paper flex items-center justify-center gap-2 transition-all"
              >
                <Home size={14} />
                <span>Return Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
