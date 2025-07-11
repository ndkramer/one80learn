import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { 
  classifyError, 
  getUserFriendlyMessage, 
  createNetworkError, 
  createValidationError, 
  createAuthError,
  useRetry,
  useOfflineSupport,
  ErrorProvider,
  useErrorContext,
  withErrorHandling
} from '../errorUtils';
import { ErrorCodes } from '../../types';
import React from 'react';

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-123'),
  },
  writable: true,
});

// Mock useAuth
vi.mock('../authContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123' },
  }),
}));

describe('Error Classification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('classifyError', () => {
    it('classifies 404 errors as not_found', () => {
      const error = { status: 404, message: 'Not found' };
      const appError = classifyError(error);

      expect(appError.type).toBe('not_found');
      expect(appError.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
      expect(appError.retryable).toBe(false);
      expect(appError.recoverable).toBe(true);
    });

    it('classifies PGRST301 errors as not_found', () => {
      const error = { code: 'PGRST301', message: 'Not found' };
      const appError = classifyError(error);

      expect(appError.type).toBe('not_found');
      expect(appError.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
    });

    it('classifies 5xx errors as server errors', () => {
      const error = { status: 500, message: 'Internal server error' };
      const appError = classifyError(error);

      expect(appError.type).toBe('server');
      expect(appError.code).toBe(ErrorCodes.SERVER_ERROR);
      expect(appError.retryable).toBe(true);
    });

    it('classifies PGRST errors as server errors', () => {
      const error = { code: 'PGRST116', message: 'Database error' };
      const appError = classifyError(error);

      expect(appError.type).toBe('server');
      expect(appError.code).toBe(ErrorCodes.SERVER_ERROR);
    });

    it('classifies 401 errors as auth errors', () => {
      const error = { status: 401, message: 'Unauthorized' };
      const appError = classifyError(error);

      expect(appError.type).toBe('auth');
      expect(appError.code).toBe(ErrorCodes.INVALID_CREDENTIALS);
      expect(appError.retryable).toBe(false);
    });

    it('classifies invalid_grant errors as auth errors', () => {
      const error = { code: 'invalid_grant', message: 'Invalid credentials' };
      const appError = classifyError(error);

      expect(appError.type).toBe('auth');
      expect(appError.code).toBe(ErrorCodes.INVALID_CREDENTIALS);
    });

    it('classifies 403 errors as permission errors', () => {
      const error = { status: 403, message: 'Forbidden' };
      const appError = classifyError(error);

      expect(appError.type).toBe('permission');
      expect(appError.code).toBe(ErrorCodes.INSUFFICIENT_PERMISSIONS);
      expect(appError.retryable).toBe(false);
      expect(appError.recoverable).toBe(false);
    });

    it('classifies 4xx errors as validation errors', () => {
      const error = { status: 400, message: 'Bad request' };
      const appError = classifyError(error);

      expect(appError.type).toBe('validation');
      expect(appError.code).toBe(ErrorCodes.VALIDATION_ERROR);
      expect(appError.retryable).toBe(false);
    });

    it('classifies offline errors when navigator is offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      });

      const error = { message: 'Network error' };
      const appError = classifyError(error);

      expect(appError.type).toBe('offline');
      expect(appError.code).toBe(ErrorCodes.OFFLINE_ERROR);
      expect(appError.retryable).toBe(true);

      // Reset navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      });
    });

    it('classifies NetworkError as network error', () => {
      const error = { name: 'NetworkError', message: 'Network failed' };
      const appError = classifyError(error);

      expect(appError.type).toBe('network');
      expect(appError.code).toBe(ErrorCodes.NETWORK_ERROR);
      expect(appError.retryable).toBe(true);
    });

    it('classifies unknown errors with fallback', () => {
      const error = { message: 'Something weird happened' };
      const appError = classifyError(error);

      expect(appError.type).toBe('unknown');
      expect(appError.code).toBe(ErrorCodes.UNKNOWN_ERROR);
      expect(appError.retryable).toBe(true);
      expect(appError.details?.originalError).toBeDefined();
    });

    it('includes stack trace and error details', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test:1:1';
      
      const appError = classifyError(error);

      expect(appError.details?.originalError).toBeDefined();
      expect(appError.details?.stack).toBe(error.stack);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('returns user-friendly messages for known error codes', () => {
      const networkError = { 
        code: ErrorCodes.NETWORK_ERROR,
        message: 'Raw network error' 
      } as any;
      
      expect(getUserFriendlyMessage(networkError))
        .toBe('Connection problem. Please check your internet and try again.');

      const authError = { 
        code: ErrorCodes.INVALID_CREDENTIALS,
        message: 'Raw auth error' 
      } as any;
      
      expect(getUserFriendlyMessage(authError))
        .toBe('Invalid email or password. Please try again.');
    });

    it('falls back to error message for unknown codes', () => {
      const unknownError = { 
        code: 'UNKNOWN_CODE',
        message: 'Custom error message' 
      } as any;
      
      expect(getUserFriendlyMessage(unknownError))
        .toBe('Custom error message');
    });

    it('provides default message when no message is available', () => {
      const errorWithoutMessage = { 
        code: 'UNKNOWN_CODE' 
      } as any;
      
      expect(getUserFriendlyMessage(errorWithoutMessage))
        .toBe('Something went wrong. Please try again.');
    });
  });
});

describe('Error Creation Helpers', () => {
  it('creates NetworkError with correct properties', () => {
    const error = createNetworkError('Connection failed', true, false);
    
    expect(error.name).toBe('NetworkError');
    expect(error.message).toBe('Connection failed');
    expect(error.offline).toBe(true);
    expect(error.timeout).toBe(false);
  });

  it('creates ValidationError with field and errors', () => {
    const fieldErrors = [
      { field: 'email', message: 'Invalid email', code: 'INVALID_FORMAT' }
    ];
    const error = createValidationError('Validation failed', 'email', fieldErrors);
    
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Validation failed');
    expect(error.field).toBe('email');
    expect(error.errors).toEqual(fieldErrors);
  });

  it('creates AuthError with specified code', () => {
    const error = createAuthError('Account locked', 'account_locked');
    
    expect(error.name).toBe('AuthError');
    expect(error.message).toBe('Account locked');
    expect(error.code).toBe('account_locked');
  });

  it('creates AuthError with default code', () => {
    const error = createAuthError('Authentication failed');
    
    expect(error.code).toBe('invalid_credentials');
  });
});

describe('useRetry Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with correct default state', () => {
    const operation = vi.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useRetry(operation));

    expect(result.current.attempt).toBe(0);
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.canRetry).toBe(true);
    expect(result.current.lastError).toBeUndefined();
  });

  it('executes operation successfully on first try', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useRetry(operation));

    await act(async () => {
      await result.current.retry();
    });

    expect(operation).toHaveBeenCalledTimes(1);
    expect(result.current.attempt).toBe(1);
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.lastError).toBeUndefined();
  });

  it('retries on failure with exponential backoff', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValue('success');

    const { result } = renderHook(() => useRetry(operation, {
      maxAttempts: 3,
      delay: 1000,
      backoff: 'exponential'
    }));

    // First attempt (immediate)
    await act(async () => {
      try {
        await result.current.retry();
      } catch (error) {
        // Expected to fail
      }
    });
    
    expect(result.current.attempt).toBe(1);
    expect(result.current.canRetry).toBe(true);

    // Second attempt (after 1s delay)
    await act(async () => {
      try {
        await result.current.retry();
      } catch (error) {
        // Expected to fail
      }
    });

    expect(result.current.attempt).toBe(2);
    expect(result.current.canRetry).toBe(true);

    // Third attempt (after 2s delay) - should succeed
    await act(async () => {
      await result.current.retry();
    });

    expect(operation).toHaveBeenCalledTimes(3);
    expect(result.current.attempt).toBe(3);
    expect(result.current.lastError).toBeUndefined();
  });

  it('stops retrying after max attempts', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Always fails'));
    const { result } = renderHook(() => useRetry(operation, { maxAttempts: 2 }));

    // First attempt
    await act(async () => {
      try {
        await result.current.retry();
      } catch (error) {
        // Expected
      }
    });

    expect(result.current.canRetry).toBe(true);

    // Second attempt
    await act(async () => {
      try {
        await result.current.retry();
      } catch (error) {
        // Expected
      }
    });

    expect(result.current.canRetry).toBe(false);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('respects retryableErrors option', async () => {
    const operation = vi.fn().mockRejectedValue({ status: 403 });
    const { result } = renderHook(() => useRetry(operation, {
      retryableErrors: ['network', 'server'] // Not including 'permission'
    }));

    await act(async () => {
      try {
        await result.current.retry();
      } catch (error) {
        // Expected
      }
    });

    expect(result.current.canRetry).toBe(false); // Should not retry permission error
  });

  it('resets state correctly', () => {
    const operation = vi.fn().mockRejectedValue(new Error('Test'));
    const { result } = renderHook(() => useRetry(operation));

    act(() => {
      result.current.reset();
    });

    expect(result.current.attempt).toBe(0);
    expect(result.current.isRetrying).toBe(false);
    expect(result.current.canRetry).toBe(true);
    expect(result.current.lastError).toBeUndefined();
  });
});

describe('useOfflineSupport Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
    });
  });

  it('initializes with correct state', () => {
    const { result } = renderHook(() => useOfflineSupport());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.wasOffline).toBe(false);
    expect(result.current.pendingActions).toEqual([]);
  });

  it('adds pending actions when offline', () => {
    const { result } = renderHook(() => useOfflineSupport());

    act(() => {
      result.current.addPendingAction({
        type: 'save-note',
        operation: vi.fn(),
        data: { content: 'test note' }
      });
    });

    expect(result.current.pendingActions).toHaveLength(1);
    expect(result.current.pendingActions[0].type).toBe('save-note');
    expect(result.current.pendingActions[0].id).toBe('mock-uuid-123');
  });

  it('processes pending actions when coming back online', async () => {
    const mockOperation = vi.fn().mockResolvedValue('success');
    const { result } = renderHook(() => useOfflineSupport());

    // Add a pending action
    act(() => {
      result.current.addPendingAction({
        type: 'test-action',
        operation: mockOperation,
        data: {}
      });
    });

    expect(result.current.pendingActions).toHaveLength(1);

    // Process pending actions
    await act(async () => {
      await result.current.processPendingActions();
    });

    expect(mockOperation).toHaveBeenCalledTimes(1);
    expect(result.current.pendingActions).toHaveLength(0);
  });

  it('handles failed operations with retry logic', async () => {
    const mockOperation = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValue('success');

    const { result } = renderHook(() => useOfflineSupport());

    act(() => {
      result.current.addPendingAction({
        type: 'test-action',
        operation: mockOperation,
        data: {}
      });
    });

    // First processing attempt (should fail and increment retry count)
    await act(async () => {
      await result.current.processPendingActions();
    });

    expect(result.current.pendingActions).toHaveLength(1);
    expect(result.current.pendingActions[0].retries).toBe(1);

    // Second processing attempt (should succeed)
    await act(async () => {
      await result.current.processPendingActions();
    });

    expect(result.current.pendingActions).toHaveLength(0);
  });

  it('removes actions after too many retries', async () => {
    const mockOperation = vi.fn().mockRejectedValue(new Error('Always fails'));
    const { result } = renderHook(() => useOfflineSupport());

    act(() => {
      result.current.addPendingAction({
        type: 'test-action',
        operation: mockOperation,
        data: {}
      });
    });

    // Set initial retry count to 3 (will be removed after next failure)
    act(() => {
      result.current.pendingActions[0].retries = 3;
    });

    await act(async () => {
      await result.current.processPendingActions();
    });

    expect(result.current.pendingActions).toHaveLength(0); // Should be removed
  });
});

describe('ErrorProvider and useErrorContext', () => {
  const TestComponent = () => {
    const { errors, addError, removeError, clearErrors, hasErrors } = useErrorContext();
    
    return (
      <div>
        <div data-testid="error-count">{errors.length}</div>
        <div data-testid="has-errors">{hasErrors.toString()}</div>
        <button 
          data-testid="add-error" 
          onClick={() => addError(new Error('Test error'))}
        >
          Add Error
        </button>
        <button 
          data-testid="remove-error" 
          onClick={() => errors.length > 0 && removeError(errors[0].id)}
        >
          Remove Error
        </button>
        <button 
          data-testid="clear-errors" 
          onClick={clearErrors}
        >
          Clear Errors
        </button>
      </div>
    );
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ErrorProvider>{children}</ErrorProvider>
  );

  it('provides error context to children', () => {
    const { result } = renderHook(() => useErrorContext(), { wrapper });

    expect(result.current.errors).toEqual([]);
    expect(result.current.hasErrors).toBe(false);
    expect(typeof result.current.addError).toBe('function');
    expect(typeof result.current.removeError).toBe('function');
    expect(typeof result.current.clearErrors).toBe('function');
  });

  it('throws error when used outside provider', () => {
    expect(() => {
      renderHook(() => useErrorContext());
    }).toThrow('useErrorContext must be used within an ErrorProvider');
  });

  it('adds and removes errors correctly', async () => {
    const { render, screen } = await import('@testing-library/react');
    const userEvent = (await import('@testing-library/user-event')).default;
    const user = userEvent.setup();

    render(<TestComponent />, { wrapper });

    expect(screen.getByTestId('error-count')).toHaveTextContent('0');
    expect(screen.getByTestId('has-errors')).toHaveTextContent('false');

    await user.click(screen.getByTestId('add-error'));

    expect(screen.getByTestId('error-count')).toHaveTextContent('1');
    expect(screen.getByTestId('has-errors')).toHaveTextContent('true');

    await user.click(screen.getByTestId('remove-error'));

    expect(screen.getByTestId('error-count')).toHaveTextContent('0');
    expect(screen.getByTestId('has-errors')).toHaveTextContent('false');
  });

  it('clears all errors', async () => {
    const { render, screen } = await import('@testing-library/react');
    const userEvent = (await import('@testing-library/user-event')).default;
    const user = userEvent.setup();

    render(<TestComponent />, { wrapper });

    // Add multiple errors
    await user.click(screen.getByTestId('add-error'));
    await user.click(screen.getByTestId('add-error'));

    expect(screen.getByTestId('error-count')).toHaveTextContent('2');

    await user.click(screen.getByTestId('clear-errors'));

    expect(screen.getByTestId('error-count')).toHaveTextContent('0');
  });

  it('auto-removes non-critical errors after timeout', async () => {
    vi.useFakeTimers();
    
    const { result } = renderHook(() => useErrorContext(), { wrapper });

    act(() => {
      result.current.addError({ message: 'Network error', type: 'network' });
    });

    expect(result.current.errors).toHaveLength(1);

    // Fast-forward past the auto-remove timeout (10 seconds)
    act(() => {
      vi.advanceTimersByTime(11000);
    });

    await waitFor(() => {
      expect(result.current.errors).toHaveLength(0);
    });

    vi.useRealTimers();
  });

  it('does not auto-remove critical errors', async () => {
    vi.useFakeTimers();
    
    const { result } = renderHook(() => useErrorContext(), { wrapper });

    act(() => {
      result.current.addError({ message: 'Auth error', status: 401 });
    });

    expect(result.current.errors).toHaveLength(1);

    // Fast-forward past the auto-remove timeout
    act(() => {
      vi.advanceTimersByTime(11000);
    });

    // Auth errors should not be auto-removed
    expect(result.current.errors).toHaveLength(1);

    vi.useRealTimers();
  });
});

describe('withErrorHandling', () => {
  it('executes operation successfully and returns result', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    
    const result = await withErrorHandling(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('catches errors and returns null', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Test error'));
    const errorHandler = vi.fn();
    
    const result = await withErrorHandling(operation, errorHandler);
    
    expect(result).toBeNull();
    expect(errorHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'unknown',
        code: ErrorCodes.UNKNOWN_ERROR
      })
    );
  });

  it('calls error handler with classified error', async () => {
    const operation = vi.fn().mockRejectedValue({ status: 404 });
    const errorHandler = vi.fn();
    
    await withErrorHandling(operation, errorHandler);
    
    expect(errorHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'not_found',
        code: ErrorCodes.RESOURCE_NOT_FOUND
      })
    );
  });
}); 