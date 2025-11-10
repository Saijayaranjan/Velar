/**
 * Error Boundary Component
 * Catches and handles React component errors
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AppError, createError, isOperationalError } from '../utils/errors';
import { logger } from '../utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Wraps components to catch and handle errors gracefully
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error
    const appError = createError(error);
    logger.error('React Error Boundary caught error:', {
      error: appError.toJSON(),
      componentStack: errorInfo.componentStack,
    });

    // Update state
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(appError, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props): void {
    // Reset error state if props change (optional behavior)
    if (this.props.resetOnPropsChange && this.state.hasError) {
      if (prevProps.children !== this.props.children) {
        this.reset();
      }
    }
  }

  private reportError(error: AppError, errorInfo: ErrorInfo): void {
    // Here you would send to your error tracking service
    // Example: Sentry, LogRocket, etc.
    console.error('Error reported:', {
      error: error.toJSON(),
      errorInfo,
    });
  }

  private reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.reset}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default Error Fallback UI
 */
interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}

function ErrorFallback({ error, errorInfo, onReset }: ErrorFallbackProps): JSX.Element {
  const isDev = process.env.NODE_ENV === 'development';
  const isOperational = error ? isOperationalError(error) : false;

  return (
    <div className="min-h-screen flex items-center justify-center bg-cluely-dark-bg p-6">
      <div className="max-w-2xl w-full">
        <div className="liquid-glass p-8 rounded-2xl border border-red-500/20">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-8 h-8 text-red-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-red-400 mb-2">
                {isOperational ? 'Something went wrong' : 'Unexpected Error'}
              </h1>
              <p className="text-cluely-text-secondary text-sm">
                {error?.message || 'An unexpected error occurred'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={onReset}
              className="flex-1 px-4 py-2 rounded-lg bg-cluely-accent-teal/20 hover:bg-cluely-accent-teal/30 border border-cluely-accent-teal/30 text-cluely-accent-teal font-medium transition-all"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-cluely-text-primary font-medium transition-all"
            >
              Reload App
            </button>
          </div>

          {/* Developer Info */}
          {isDev && error && (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-medium text-cluely-text-secondary hover:text-cluely-accent-teal mb-2">
                Show Error Details (Development Only)
              </summary>
              <div className="p-4 rounded-lg bg-black/40 border border-white/10 font-mono text-xs">
                <div className="mb-4">
                  <div className="text-red-400 font-semibold mb-1">Error:</div>
                  <div className="text-cluely-text-secondary">{error.toString()}</div>
                </div>
                {error.stack && (
                  <div className="mb-4">
                    <div className="text-red-400 font-semibold mb-1">Stack Trace:</div>
                    <pre className="text-cluely-text-secondary overflow-x-auto whitespace-pre-wrap">
                      {error.stack}
                    </pre>
                  </div>
                )}
                {errorInfo?.componentStack && (
                  <div>
                    <div className="text-red-400 font-semibold mb-1">Component Stack:</div>
                    <pre className="text-cluely-text-secondary overflow-x-auto whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Help Text */}
          <div className="mt-6 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <p className="text-xs text-cluely-text-secondary leading-relaxed">
              If this error persists, try restarting the application. For further assistance,
              please check the logs or contact support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * HOC to wrap component with Error Boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}
