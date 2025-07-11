import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AppError, ErrorBoundaryState, ErrorCodes } from '../types';
import { classifyError } from '../utils/errorUtils';
import { LoadingErrorState } from './ErrorDisplay';
import Button from './Button';
import { RefreshCcw, Home, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: AppError; resetError: () => void; retryAction?: () => void }>;
  onError?: (error: AppError, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // Whether to isolate this boundary (don't bubble up)
}

interface EnhancedErrorBoundaryState extends ErrorBoundaryState {
  retryCount: number;
  errorId?: string;
}

class ErrorBoundary extends Component<Props, EnhancedErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  public state: EnhancedErrorBoundaryState = {
    hasError: false,
    retryCount: 0
  };

  public static getDerivedStateFromError(error: Error): Partial<EnhancedErrorBoundaryState> {
    // Convert the error to our AppError format
    const appError = classifyError(error);
    
    // Override error classification for rendering errors
    const renderingError: AppError = {
      ...appError,
      type: 'client',
      code: ErrorCodes.RENDERING_ERROR,
      message: 'A rendering error occurred while displaying this component',
      context: {
        component: 'ErrorBoundary',
        operation: 'render'
      }
    };

    return { 
      hasError: true, 
      error: renderingError,
      errorId: appError.id
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, isolate } = this.props;
    
    if (this.state.error) {
      // Enhanced error context with React error info
      const enhancedError: AppError = {
        ...this.state.error,
        details: {
          ...this.state.error.details,
          componentStack: errorInfo.componentStack,
          errorBoundary: errorInfo.errorBoundary?.name,
          eventType: errorInfo.eventType
        },
        stack: error.stack
      };

      // Call custom error handler if provided
      if (onError) {
        onError(enhancedError, errorInfo);
      }

      // Log error details for debugging
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Enhanced Error:', enhancedError);
      console.groupEnd();

      // Report to error tracking service (e.g., Sentry)
      if (typeof window !== 'undefined' && window.Sentry) {
        window.Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack
            },
            errorBoundary: {
              errorId: enhancedError.id,
              retryCount: this.state.retryCount
            }
          }
        });
      }

      // Update state with enhanced error
      this.setState({ error: enhancedError });
    }

    // Don't bubble up if isolated
    if (isolate) {
      console.log('Error boundary is isolated - not bubbling up');
    }
  }

  private resetError = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorId: undefined,
      retryCount: 0 
    });
    
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
      this.retryTimeoutId = null;
    }
  };

  private retryRender = () => {
    const maxRetries = 3;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      console.warn('Maximum retry attempts reached');
      return;
    }

    this.setState({ 
      retryCount: retryCount + 1,
      hasError: false,
      error: undefined 
    });

    // Add delay for exponential backoff
    const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
    this.retryTimeoutId = setTimeout(() => {
      // Force re-render after delay
      this.forceUpdate();
    }, delay);
  };

  private navigateHome = () => {
    window.location.href = '/dashboard';
  };

  private refreshPage = () => {
    window.location.reload();
  };

  public componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  public render() {
    const { hasError, error, retryCount } = this.state;
    const { children, fallback: CustomFallback } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (CustomFallback) {
        return (
          <CustomFallback 
            error={error} 
            resetError={this.resetError}
            retryAction={error.retryable ? this.retryRender : undefined}
          />
        );
      }

      // Check if this is a critical error that should show a full page
      const isCriticalError = error.type === 'auth' || error.type === 'permission' || retryCount >= 3;

      if (isCriticalError) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
              <div className="text-center">
                <div className="text-red-500 mb-4">
                  <AlertTriangle className="w-12 h-12 mx-auto" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {error.type === 'auth' ? 'Authentication Required' :
                   error.type === 'permission' ? 'Access Denied' :
                   'Application Error'}
                </h2>
                <p className="text-gray-600 mb-6">
                  {error.type === 'auth' 
                    ? 'Please sign in to continue using the application.'
                    : error.type === 'permission'
                    ? 'You don\'t have permission to access this part of the application.'
                    : retryCount >= 3
                    ? 'The application encountered multiple errors. Please refresh the page or contact support.'
                    : error.message
                  }
                </p>
                
                <div className="space-y-3">
                  {error.type === 'auth' && (
                    <Button
                      onClick={() => window.location.href = '/login'}
                      className="w-full"
                    >
                      Sign In
                    </Button>
                  )}
                  
                  {retryCount < 3 && error.retryable && (
                    <Button
                      onClick={this.retryRender}
                      variant="outline"
                      className="w-full"
                      leftIcon={<RefreshCcw className="w-4 h-4" />}
                    >
                      Try Again {retryCount > 0 && `(${retryCount}/3)`}
                    </Button>
                  )}
                  
                  <Button
                    onClick={this.navigateHome}
                    variant="ghost"
                    className="w-full"
                    leftIcon={<Home className="w-4 h-4" />}
                  >
                    Go to Dashboard
                  </Button>
                  
                  <Button
                    onClick={this.refreshPage}
                    variant="ghost"
                    className="w-full"
                    leftIcon={<RefreshCcw className="w-4 h-4" />}
                  >
                    Refresh Page
                  </Button>
                </div>

                {/* Error details for development */}
                {process.env.NODE_ENV === 'development' && (
                  <details className="mt-6 text-left">
                    <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                      Error Details (Development)
                    </summary>
                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(error, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        );
      }

      // For non-critical errors, use the LoadingErrorState component
      return (
        <LoadingErrorState
          error={error}
          onRetry={error.retryable ? this.retryRender : undefined}
          className="py-16"
        />
      );
    }

    return children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Async error boundary for handling async errors
export class AsyncErrorBoundary extends Component<Props, EnhancedErrorBoundaryState> {
  public state: EnhancedErrorBoundaryState = {
    hasError: false,
    retryCount: 0
  };

  componentDidMount() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    const appError = classifyError(event.reason);
    this.setState({
      hasError: true,
      error: appError,
      errorId: appError.id
    });
    
    // Prevent the default browser behavior
    event.preventDefault();
  };

  render() {
    return (
      <ErrorBoundary {...this.props} onError={this.props.onError}>
        {this.props.children}
      </ErrorBoundary>
    );
  }
}

export default ErrorBoundary;