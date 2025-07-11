import React, { useState, useCallback } from 'react';
import { 
  AlertCircle, 
  Wifi, 
  RefreshCcw, 
  X, 
  AlertTriangle, 
  XCircle, 
  Lock, 
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { AppError, ErrorType } from '../types';
import { getUserFriendlyMessage } from '../utils/errorUtils';
import Button from './Button';
import Alert from './Alert';

interface ErrorDisplayProps {
  errors: AppError[];
  onDismiss: (id: string) => void;
  onRetry?: (error: AppError) => Promise<void>;
  className?: string;
  position?: 'top' | 'bottom' | 'center';
  maxVisible?: number;
}

interface SingleErrorProps {
  error: AppError;
  onDismiss: (id: string) => void;
  onRetry?: (error: AppError) => Promise<void>;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

// Error type to icon mapping
const getErrorIcon = (type: ErrorType): React.ReactNode => {
  const iconProps = { className: "w-5 h-5", "aria-hidden": true };
  
  switch (type) {
    case 'network':
    case 'offline':
      return <Wifi {...iconProps} />;
    case 'auth':
      return <Lock {...iconProps} />;
    case 'permission':
      return <Lock {...iconProps} />;
    case 'not_found':
      return <Search {...iconProps} />;
    case 'validation':
      return <AlertTriangle {...iconProps} />;
    case 'server':
    case 'unknown':
    default:
      return <AlertCircle {...iconProps} />;
  }
};

// Error type to color mapping (following brand guidelines)
const getErrorStyles = (type: ErrorType) => {
  switch (type) {
    case 'auth':
    case 'permission':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        iconColor: 'text-red-500'
      };
    case 'network':
    case 'offline':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        iconColor: 'text-blue-500'
      };
    case 'validation':
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800',
        iconColor: 'text-yellow-500'
      };
    case 'server':
    case 'unknown':
    default:
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-800',
        iconColor: 'text-gray-500'
      };
  }
};

const SingleError: React.FC<SingleErrorProps> = ({ 
  error, 
  onDismiss, 
  onRetry, 
  isExpanded = false,
  onToggleExpanded 
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const styles = getErrorStyles(error.type);
  const userMessage = getUserFriendlyMessage(error);

  const handleRetry = useCallback(async () => {
    if (!onRetry || !error.retryable || isRetrying) return;
    
    setIsRetrying(true);
    try {
      await onRetry(error);
      onDismiss(error.id);
    } catch (retryError) {
      console.error('Retry failed:', retryError);
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, error, onDismiss, isRetrying]);

  const handleDismiss = useCallback(() => {
    onDismiss(error.id);
  }, [onDismiss, error.id]);

  return (
    <div 
      role="alert"
      aria-live="polite"
      className={`${styles.bg} ${styles.border} border rounded-lg p-4 mb-3 transition-all duration-200`}
    >
      <div className="flex items-start">
        <div className={`flex-shrink-0 ${styles.iconColor}`}>
          {getErrorIcon(error.type)}
        </div>
        
        <div className="ml-3 flex-1 min-w-0">
          <div className={`text-sm font-medium ${styles.text}`}>
            {userMessage}
          </div>
          
          {/* Error details (expandable) */}
          {(error.details || error.context) && (
            <div className="mt-2">
              <button
                onClick={onToggleExpanded}
                className={`inline-flex items-center text-xs ${styles.text} hover:underline focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:ring-opacity-50 rounded`}
                aria-expanded={isExpanded}
                aria-controls={`error-details-${error.id}`}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3 h-3 mr-1" />
                    Hide details
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3 mr-1" />
                    Show details
                  </>
                )}
              </button>
              
              {isExpanded && (
                <div 
                  id={`error-details-${error.id}`}
                  className={`mt-2 p-2 bg-white rounded text-xs ${styles.text} font-mono`}
                >
                  <div><strong>Error Code:</strong> {error.code}</div>
                  <div><strong>Type:</strong> {error.type}</div>
                  <div><strong>Time:</strong> {error.timestamp.toLocaleString()}</div>
                  {error.context && (
                    <div><strong>Context:</strong> {JSON.stringify(error.context, null, 2)}</div>
                  )}
                  {error.details && (
                    <div><strong>Details:</strong> {JSON.stringify(error.details, null, 2)}</div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Action buttons */}
          <div className="mt-3 flex flex-wrap gap-2">
            {error.retryable && onRetry && (
              <Button
                size="small"
                variant="outline"
                onClick={handleRetry}
                isLoading={isRetrying}
                loadingText="Retrying..."
                leftIcon={<RefreshCcw className="w-3 h-3" />}
                aria-label={`Retry ${error.type} operation`}
                className="text-xs"
              >
                Try Again
              </Button>
            )}
            
            {error.type === 'not_found' && (
              <Button
                size="small"
                variant="ghost"
                onClick={() => window.history.back()}
                leftIcon={<ExternalLink className="w-3 h-3" />}
                className="text-xs"
              >
                Go Back
              </Button>
            )}
            
            {(error.type === 'auth' || error.type === 'permission') && (
              <Button
                size="small"
                variant="ghost"
                onClick={() => window.location.href = '/login'}
                leftIcon={<Lock className="w-3 h-3" />}
                className="text-xs"
              >
                Sign In
              </Button>
            )}
            
            {error.type === 'server' && (
              <Button
                size="small"
                variant="ghost"
                onClick={() => window.location.reload()}
                leftIcon={<RefreshCcw className="w-3 h-3" />}
                className="text-xs"
              >
                Refresh Page
              </Button>
            )}
          </div>
        </div>
        
        {/* Dismiss button */}
        <div className="ml-auto pl-3 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className={`inline-flex rounded-md p-1.5 ${styles.text} hover:${styles.bg} focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:ring-opacity-50`}
            aria-label="Dismiss error"
          >
            <span className="sr-only">Dismiss</span>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  errors,
  onDismiss,
  onRetry,
  className = '',
  position = 'top',
  maxVisible = 5
}) => {
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  const toggleExpanded = useCallback((errorId: string) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(errorId)) {
        newSet.delete(errorId);
      } else {
        newSet.add(errorId);
      }
      return newSet;
    });
  }, []);

  const dismissAll = useCallback(() => {
    errors.forEach(error => onDismiss(error.id));
  }, [errors, onDismiss]);

  if (errors.length === 0) return null;

  // Sort errors by priority (auth/permission first, then by timestamp)
  const sortedErrors = [...errors].sort((a, b) => {
    const priorityOrder = ['auth', 'permission', 'server', 'network', 'offline', 'validation', 'not_found', 'unknown'];
    const aPriority = priorityOrder.indexOf(a.type);
    const bPriority = priorityOrder.indexOf(b.type);
    
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  const visibleErrors = sortedErrors.slice(0, maxVisible);
  const hiddenCount = sortedErrors.length - maxVisible;

  const positionClasses = {
    top: 'fixed top-4 left-4 right-4 z-50',
    bottom: 'fixed bottom-4 left-4 right-4 z-50',
    center: 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 max-w-lg w-full'
  };

  return (
    <div className={`${positionClasses[position]} ${className}`}>
      <div className="max-w-lg mx-auto">
        {/* Header with dismiss all */}
        {errors.length > 1 && (
          <div className="flex justify-between items-center mb-2 px-2">
            <span className="text-sm text-gray-600 font-medium">
              {errors.length} error{errors.length > 1 ? 's' : ''} occurred
            </span>
            <Button
              size="small"
              variant="ghost"
              onClick={dismissAll}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Dismiss All
            </Button>
          </div>
        )}
        
        {/* Error list */}
        {visibleErrors.map(error => (
          <SingleError
            key={error.id}
            error={error}
            onDismiss={onDismiss}
            onRetry={onRetry}
            isExpanded={expandedErrors.has(error.id)}
            onToggleExpanded={() => toggleExpanded(error.id)}
          />
        ))}
        
        {/* Hidden errors indicator */}
        {hiddenCount > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
            <span className="text-sm text-gray-600">
              {hiddenCount} more error{hiddenCount > 1 ? 's' : ''} hidden
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Offline indicator component
export const OfflineIndicator: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 shadow-lg">
        <div className="flex items-center">
          <Wifi className="w-5 h-5 text-yellow-500 mr-2" />
          <span className="text-sm text-yellow-800 font-medium">
            You're offline
          </span>
        </div>
        <p className="text-xs text-yellow-700 mt-1">
          Changes will be saved when you reconnect
        </p>
      </div>
    </div>
  );
};

// Loading error state component  
export const LoadingErrorState: React.FC<{
  error: AppError;
  onRetry?: () => void;
  className?: string;
}> = ({ error, onRetry, className = '' }) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const userMessage = getUserFriendlyMessage(error);

  const handleRetry = useCallback(async () => {
    if (!onRetry || isRetrying) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, isRetrying]);

  return (
    <div className={`text-center py-8 ${className}`}>
      <div className="max-w-md mx-auto">
        <div className="text-gray-400 mb-4">
          <XCircle className="w-12 h-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Something went wrong
        </h3>
        <p className="text-gray-600 mb-6">
          {userMessage}
        </p>
        {(error.retryable || onRetry) && (
          <Button
            onClick={handleRetry}
            isLoading={isRetrying}
            loadingText="Retrying..."
            leftIcon={<RefreshCcw className="w-4 h-4" />}
          >
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay; 