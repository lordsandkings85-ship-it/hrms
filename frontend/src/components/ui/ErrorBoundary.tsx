import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-danger-light flex items-center justify-center mb-4">
            <AlertTriangle size={24} className="text-danger" />
          </div>
          <h2 className="text-lg font-semibold text-ink dark:text-white mb-1">Something went wrong</h2>
          <p className="text-sm text-muted dark:text-white/50 max-w-sm mb-5">
            {this.state.error?.message ?? 'An unexpected error occurred on this page.'}
          </p>
          <button onClick={this.handleReset} className="btn-secondary gap-2">
            <RotateCcw size={14} />
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
