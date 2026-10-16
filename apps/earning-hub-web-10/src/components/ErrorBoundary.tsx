import { Component, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  compact?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.compact) {
        return (
          <div className="flex items-center gap-2 p-3 rounded-xl border border-destructive/20 bg-destructive/5 text-sm">
            <span>⚠️</span>
            <span className="text-muted-foreground flex-1 text-xs">
              {this.props.fallbackTitle || 'Something went wrong'}
            </span>
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              <RotateCcw size={12} /> Retry
            </button>
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="text-4xl mb-4">😕</div>
          <h3 className="font-syne font-black text-lg text-foreground mb-2">
            {this.props.fallbackTitle || 'Something went wrong'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            This section encountered an unexpected issue. Your data is safe.
          </p>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 active:scale-95 transition-all"
          >
            <RotateCcw size={14} /> Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
