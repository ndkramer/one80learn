import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  AppError, 
  ErrorType, 
  ErrorCode, 
  ErrorCodes, 
  ErrorContext as ErrorContextType, 
  UserAction, 
  RetryOptions, 
  UseRetryState, 
  UseOfflineState, 
  QueuedAction,
  APIError,
  NetworkError,
  ValidationError,
  AuthError
} from '../types';
import { useAuth } from './authContext';

// Error classification utilities
export const classifyError = (error: any): AppError => {
  const timestamp = new Date();
  const id = crypto.randomUUID();
  
  // Handle different error types
  if (error?.code === 'PGRST301' || error?.status === 404) {
    return {
      id,
      type: 'not_found',
      code: ErrorCodes.RESOURCE_NOT_FOUND,
      message: 'The requested resource was not found',
      timestamp,
      recoverable: true,
      retryable: false
    };
  }
  
  if (error?.code?.startsWith('PGRST') || error?.status >= 500) {
    return {
      id,
      type: 'server',
      code: ErrorCodes.SERVER_ERROR,
      message: 'Server error occurred. Please try again later.',
      timestamp,
      recoverable: true,
      retryable: true
    };
  }
  
  if (error?.status === 401 || error?.code === 'invalid_grant') {
    return {
      id,
      type: 'auth',
      code: ErrorCodes.INVALID_CREDENTIALS,
      message: 'Authentication failed. Please check your credentials.',
      timestamp,
      recoverable: true,
      retryable: false
    };
  }
  
  if (error?.status === 403) {
    return {
      id,
      type: 'permission',
      code: ErrorCodes.INSUFFICIENT_PERMISSIONS,
      message: 'You do not have permission to perform this action.',
      timestamp,
      recoverable: false,
      retryable: false
    };
  }
  
  if (error?.status >= 400 && error?.status < 500) {
    return {
      id,
      type: 'validation',
      code: ErrorCodes.VALIDATION_ERROR,
      message: error?.message || 'Invalid request data',
      timestamp,
      recoverable: true,
      retryable: false
    };
  }
  
  if (!navigator.onLine) {
    return {
      id,
      type: 'offline',
      code: ErrorCodes.OFFLINE_ERROR,
      message: 'You are currently offline. Some features may not be available.',
      timestamp,
      recoverable: true,
      retryable: true
    };
  }
  
  if (error?.name === 'NetworkError' || error?.code === 'NETWORK_ERROR') {
    return {
      id,
      type: 'network',
      code: ErrorCodes.NETWORK_ERROR,
      message: 'Network connection error. Please check your internet connection.',
      timestamp,
      recoverable: true,
      retryable: true
    };
  }
  
  // Default unknown error
  return {
    id,
    type: 'unknown',
    code: ErrorCodes.UNKNOWN_ERROR,
    message: error?.message || 'An unexpected error occurred',
    details: {
      originalError: error?.toString(),
      stack: error?.stack
    },
    timestamp,
    recoverable: true,
    retryable: true
  };
};

// Enhanced error creation helpers
export const createNetworkError = (message: string, offline = false, timeout = false): NetworkError => {
  const error = new Error(message) as NetworkError;
  error.name = 'NetworkError';
  error.offline = offline;
  error.timeout = timeout;
  return error;
};

export const createValidationError = (message: string, field?: string, errors: any[] = []): ValidationError => {
  const error = new Error(message) as ValidationError;
  error.name = 'ValidationError';
  error.field = field;
  error.errors = errors;
  return error;
};

export const createAuthError = (
  message: string, 
  code: AuthError['code'] = 'invalid_credentials'
): AuthError => {
  const error = new Error(message) as AuthError;
  error.name = 'AuthError';
  error.code = code;
  return error;
};

// User-friendly error messages
export const getUserFriendlyMessage = (error: AppError): string => {
  const errorMessages: Record<string, string> = {
    [ErrorCodes.NETWORK_ERROR]: 'Connection problem. Please check your internet and try again.',
    [ErrorCodes.OFFLINE_ERROR]: 'You\'re offline. Your changes will be saved when you reconnect.',
    [ErrorCodes.INVALID_CREDENTIALS]: 'Invalid email or password. Please try again.',
    [ErrorCodes.INSUFFICIENT_PERMISSIONS]: 'You don\'t have permission to do that.',
    [ErrorCodes.RESOURCE_NOT_FOUND]: 'The item you\'re looking for doesn\'t exist.',
    [ErrorCodes.SERVER_ERROR]: 'Something went wrong on our end. Please try again.',
    [ErrorCodes.VALIDATION_ERROR]: 'Please check your input and try again.',
    [ErrorCodes.OPERATION_FAILED]: 'The operation couldn\'t be completed. Please try again.',
    [ErrorCodes.TIMEOUT_ERROR]: 'The request took too long. Please try again.',
  };
  
  return errorMessages[error.code] || error.message || 'Something went wrong. Please try again.';
};

// Error Context Management
interface ErrorContextProviderType {
  errors: AppError[];
  addError: (error: any, context?: Partial<ErrorContextType>) => string;
  removeError: (id: string) => void;
  clearErrors: () => void;
  hasErrors: boolean;
}

const ErrorProviderContext = createContext<ErrorContextProviderType | undefined>(undefined);

export const useErrorContext = () => {
  const context = useContext(ErrorProviderContext);
  if (!context) {
    throw new Error('useErrorContext must be used within an ErrorProvider');
  }
  return context;
};

export const ErrorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [errors, setErrors] = useState<AppError[]>([]);
  const { user } = useAuth();

  const addError = useCallback((error: any, context?: Partial<ErrorContextType>): string => {
    const appError = classifyError(error);
    
    // Add context information
    if (context || user) {
      appError.context = {
        userId: user?.id,
        route: window.location.pathname,
        ...context
      };
    }
    
    // Add user action if applicable
    if (appError.retryable) {
      appError.userAction = {
        type: 'retry',
        label: 'Try Again',
        handler: () => {
          // This will be implemented by the component using the error
          console.log('Retry action triggered for error:', appError.id);
        }
      };
    }
    
    setErrors(prev => [...prev, appError]);
    
    // Auto-remove non-critical errors after delay
    if (appError.type !== 'auth' && appError.type !== 'permission') {
      setTimeout(() => {
        removeError(appError.id);
      }, 10000); // 10 seconds
    }
    
    return appError.id;
  }, [user]);

  const removeError = useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const value = {
    errors,
    addError,
    removeError,
    clearErrors,
    hasErrors: errors.length > 0
  };

  return <ErrorProviderContext.Provider value={value}>{children}</ErrorProviderContext.Provider>;
};

// Retry Hook
export const useRetry = (
  operation: () => Promise<any>,
  options: Partial<RetryOptions> = {}
): UseRetryState & { retry: () => Promise<void>; reset: () => void } => {
  const defaultOptions: RetryOptions = {
    maxAttempts: 3,
    delay: 1000,
    backoff: 'exponential',
    retryableErrors: ['network', 'server', 'offline', 'unknown']
  };
  
  const opts = { ...defaultOptions, ...options };
  const [state, setState] = useState<UseRetryState>({
    attempt: 0,
    isRetrying: false,
    canRetry: true,
    lastError: undefined
  });

  const retry = useCallback(async () => {
    if (!state.canRetry || state.isRetrying) return;
    
    setState(prev => ({ 
      ...prev, 
      isRetrying: true, 
      attempt: prev.attempt + 1 
    }));
    
    try {
      // Calculate delay with backoff
      const delay = opts.backoff === 'exponential' 
        ? opts.delay * Math.pow(2, state.attempt)
        : opts.delay * (state.attempt + 1);
      
      if (state.attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      await operation();
      
      setState(prev => ({ 
        ...prev, 
        isRetrying: false, 
        lastError: undefined 
      }));
    } catch (error) {
      const appError = classifyError(error);
      const canRetryMore = state.attempt < opts.maxAttempts - 1;
      const isRetryableError = opts.retryableErrors?.includes(appError.type) ?? true;
      
      setState(prev => ({
        ...prev,
        isRetrying: false,
        canRetry: canRetryMore && isRetryableError,
        lastError: error as Error
      }));
      
      if (!canRetryMore || !isRetryableError) {
        throw error;
      }
    }
  }, [operation, state.attempt, state.canRetry, state.isRetrying, opts]);

  const reset = useCallback(() => {
    setState({
      attempt: 0,
      isRetrying: false,
      canRetry: true,
      lastError: undefined
    });
  }, []);

  return { ...state, retry, reset };
};

// Offline Support Hook
export const useOfflineSupport = (): UseOfflineState & {
  addPendingAction: (action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>) => void;
  processPendingActions: () => Promise<void>;
} => {
  const [state, setState] = useState<UseOfflineState>({
    isOnline: navigator.onLine,
    wasOffline: false,
    pendingActions: []
  });

  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ 
        ...prev, 
        isOnline: true, 
        wasOffline: prev.wasOffline || !prev.isOnline 
      }));
    };

    const handleOffline = () => {
      setState(prev => ({ 
        ...prev, 
        isOnline: false 
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addPendingAction = useCallback((action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>) => {
    const queuedAction: QueuedAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      retries: 0
    };
    
    setState(prev => ({
      ...prev,
      pendingActions: [...prev.pendingActions, queuedAction]
    }));
  }, []);

  const processPendingActions = useCallback(async () => {
    if (!state.isOnline || state.pendingActions.length === 0) return;

    for (const action of state.pendingActions) {
      try {
        await action.operation();
        setState(prev => ({
          ...prev,
          pendingActions: prev.pendingActions.filter(a => a.id !== action.id)
        }));
      } catch (error) {
        console.error('Failed to process pending action:', action.type, error);
        
        // Increment retry count
        setState(prev => ({
          ...prev,
          pendingActions: prev.pendingActions.map(a => 
            a.id === action.id 
              ? { ...a, retries: a.retries + 1 }
              : a
          )
        }));
        
        // Remove action if too many retries
        if (action.retries >= 3) {
          setState(prev => ({
            ...prev,
            pendingActions: prev.pendingActions.filter(a => a.id !== action.id)
          }));
        }
      }
    }
  }, [state.isOnline, state.pendingActions]);

  // Auto-process pending actions when coming back online
  useEffect(() => {
    if (state.isOnline && state.wasOffline) {
      processPendingActions();
      setState(prev => ({ ...prev, wasOffline: false }));
    }
  }, [state.isOnline, state.wasOffline, processPendingActions]);

  return { 
    ...state, 
    addPendingAction, 
    processPendingActions 
  };
};

// Error Recovery Hook
export const useErrorRecovery = () => {
  const { addError, removeError } = useErrorContext();
  
  const withErrorRecovery = useCallback(async (
    operation: () => Promise<any>,
    context?: Partial<ErrorContext>
  ) => {
    try {
      return await operation();
    } catch (error) {
      const errorId = addError(error, context);
      throw { ...error, errorId };
    }
  }, [addError]);

  return {
    withErrorRecovery,
    addError,
    removeError
  };
};

// Safe async wrapper
export const withErrorHandling = async (
  operation: () => Promise<any>,
  errorHandler?: (error: AppError) => void
): Promise<any> => {
  try {
    return await operation();
  } catch (error) {
    const appError = classifyError(error);
    errorHandler?.(appError);
    console.error('Operation failed:', appError);
    return null;
  }
}; 