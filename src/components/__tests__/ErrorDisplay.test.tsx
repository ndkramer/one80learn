import { render, screen, waitFor } from '../../test/test-utils';
import { vi } from 'vitest';
import ErrorDisplay, { OfflineIndicator, LoadingErrorState } from '../ErrorDisplay';
import { AppError, ErrorCodes } from '../../types';

// Mock icons to avoid SVG rendering issues in tests
vi.mock('lucide-react', () => ({
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  Wifi: () => <div data-testid="wifi-icon" />,
  RefreshCcw: () => <div data-testid="refresh-icon" />,
  X: () => <div data-testid="x-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  Lock: () => <div data-testid="lock-icon" />,
  Search: () => <div data-testid="search-icon" />,
  ExternalLink: () => <div data-testid="external-link-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
  Loader2: () => <div data-testid="loader2-icon" />,
}));

// Helper function to create mock errors - available to all test suites
const createMockError = (overrides: Partial<AppError> = {}): AppError => ({
  id: 'test-error-1',
  type: 'network',
  code: ErrorCodes.NETWORK_ERROR,
  message: 'Network connection error',
  timestamp: new Date(),
  recoverable: true,
  retryable: true,
  ...overrides,
});

describe('ErrorDisplay Component', () => {
  const mockOnDismiss = vi.fn();
  const mockOnRetry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when no errors are provided', () => {
    const { container } = render(
      <ErrorDisplay
        errors={[]}
        onDismiss={mockOnDismiss}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('displays error with correct icon and message', () => {
    const error = createMockError({
      type: 'network',
      message: 'Connection failed'
    });

    render(
      <ErrorDisplay
        errors={[error]}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Connection problem. Please check your internet and try again.')).toBeInTheDocument();
    expect(screen.getByTestId('wifi-icon')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows retry button for retryable errors', async () => {
    const error = createMockError({ retryable: true });
    const user = (await import('@testing-library/user-event')).default.setup();

    render(
      <ErrorDisplay
        errors={[error]}
        onDismiss={mockOnDismiss}
        onRetry={mockOnRetry}
      />
    );

    const retryButton = screen.getByRole('button', { name: /retry.*operation/i });
    expect(retryButton).toBeInTheDocument();

    await user.click(retryButton);
    expect(mockOnRetry).toHaveBeenCalledWith(error);
  });

  it('does not show retry button for non-retryable errors', () => {
    const error = createMockError({ retryable: false });

    render(
      <ErrorDisplay
        errors={[error]}
        onDismiss={mockOnDismiss}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', async () => {
    const error = createMockError();
    const user = (await import('@testing-library/user-event')).default.setup();

    render(
      <ErrorDisplay
        errors={[error]}
        onDismiss={mockOnDismiss}
      />
    );

    const dismissButton = screen.getByRole('button', { name: /dismiss error/i });
    await user.click(dismissButton);

    expect(mockOnDismiss).toHaveBeenCalledWith(error.id);
  });

  it('shows expandable error details when available', async () => {
    const error = createMockError({
      details: { requestId: '123', endpoint: '/api/test' },
      context: { userId: 'user-123' }
    });
    const user = (await import('@testing-library/user-event')).default.setup();

    render(
      <ErrorDisplay
        errors={[error]}
        onDismiss={mockOnDismiss}
      />
    );

    const showDetailsButton = screen.getByRole('button', { name: /show details/i });
    expect(showDetailsButton).toBeInTheDocument();

    await user.click(showDetailsButton);

    expect(screen.getByText('Hide details')).toBeInTheDocument();
    expect(screen.getByText(/requestId/)).toBeInTheDocument();
    expect(screen.getByText(/user-123/)).toBeInTheDocument();
  });

  it('displays correct icons for different error types', () => {
    const errors = [
      createMockError({ id: '1', type: 'auth', code: ErrorCodes.INVALID_CREDENTIALS }),
      createMockError({ id: '2', type: 'offline', code: ErrorCodes.OFFLINE_ERROR }),
      createMockError({ id: '3', type: 'validation', code: ErrorCodes.VALIDATION_ERROR }),
      createMockError({ id: '4', type: 'not_found', code: ErrorCodes.RESOURCE_NOT_FOUND }),
      createMockError({ id: '5', type: 'server', code: ErrorCodes.SERVER_ERROR }),
    ];

    render(
      <ErrorDisplay
        errors={errors}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getAllByTestId('lock-icon')).toHaveLength(2); // auth + permission errors
    expect(screen.getAllByTestId('wifi-icon')).toHaveLength(1); // offline error
    expect(screen.getAllByTestId('alert-triangle-icon')).toHaveLength(1); // validation error
    expect(screen.getAllByTestId('search-icon')).toHaveLength(1); // not found error
    expect(screen.getAllByTestId('alert-circle-icon')).toHaveLength(1); // server error
  });

  it('sorts errors by priority (auth/permission first)', () => {
    const errors = [
      createMockError({ id: '1', type: 'network', code: ErrorCodes.NETWORK_ERROR, timestamp: new Date('2023-01-01') }),
      createMockError({ id: '2', type: 'auth', code: ErrorCodes.INVALID_CREDENTIALS, timestamp: new Date('2023-01-02') }),
      createMockError({ id: '3', type: 'permission', code: ErrorCodes.INSUFFICIENT_PERMISSIONS, timestamp: new Date('2023-01-03') }),
    ];

    render(
      <ErrorDisplay
        errors={errors}
        onDismiss={mockOnDismiss}
      />
    );

    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(3);
    
    // Check that auth/permission errors appear first
    const errorTexts = alerts.map(alert => alert.textContent);
    expect(errorTexts[0]).toContain('Invalid email or password. Please try again.');
    expect(errorTexts[1]).toContain('You don\'t have permission to do that.');
    expect(errorTexts[2]).toContain('Connection problem');
  });

  it('limits visible errors to maxVisible prop', () => {
    const errors = Array.from({ length: 10 }, (_, i) => 
      createMockError({ id: `error-${i}` })
    );

    render(
      <ErrorDisplay
        errors={errors}
        onDismiss={mockOnDismiss}
        maxVisible={3}
      />
    );

    expect(screen.getAllByRole('alert')).toHaveLength(3);
    expect(screen.getByText('7 more errors hidden')).toBeInTheDocument();
  });

  it('shows dismiss all button for multiple errors', async () => {
    const errors = [
      createMockError({ id: '1' }),
      createMockError({ id: '2' }),
    ];
    const user = (await import('@testing-library/user-event')).default.setup();

    render(
      <ErrorDisplay
        errors={errors}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('2 errors occurred')).toBeInTheDocument();
    
    const dismissAllButton = screen.getByRole('button', { name: /dismiss all/i });
    await user.click(dismissAllButton);

    expect(mockOnDismiss).toHaveBeenCalledTimes(2);
    expect(mockOnDismiss).toHaveBeenCalledWith('1');
    expect(mockOnDismiss).toHaveBeenCalledWith('2');
  });

  it('shows contextual action buttons based on error type', () => {
    const authError = createMockError({ 
      id: '1', 
      type: 'auth', 
      code: ErrorCodes.INVALID_CREDENTIALS 
    });
    const notFoundError = createMockError({ 
      id: '2', 
      type: 'not_found', 
      code: ErrorCodes.RESOURCE_NOT_FOUND 
    });
    const serverError = createMockError({ 
      id: '3', 
      type: 'server', 
      code: ErrorCodes.SERVER_ERROR 
    });

    render(
      <ErrorDisplay
        errors={[authError, notFoundError, serverError]}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    const error = createMockError();

    render(
      <ErrorDisplay
        errors={[error]}
        onDismiss={mockOnDismiss}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
    
    const dismissButton = screen.getByRole('button', { name: /dismiss error/i });
    expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss error');
  });

  it('shows loading state during retry', async () => {
    const error = createMockError({ retryable: true });
    const user = (await import('@testing-library/user-event')).default.setup();
    
    // Mock retry function that takes time
    const slowRetry = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );

    render(
      <ErrorDisplay
        errors={[error]}
        onDismiss={mockOnDismiss}
        onRetry={slowRetry}
      />
    );

    const retryButton = screen.getByRole('button', { name: /retry.*operation/i });
    await user.click(retryButton);

    expect(screen.getAllByText('Retrying...')[0]).toBeInTheDocument();
    expect(retryButton).toBeDisabled();

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalledWith(error.id);
    });
  });
});

describe('OfflineIndicator Component', () => {
  it('renders when visible is true', () => {
    render(<OfflineIndicator isVisible={true} />);
    
    expect(screen.getByText('You\'re offline')).toBeInTheDocument();
    expect(screen.getByText('Changes will be saved when you reconnect')).toBeInTheDocument();
    expect(screen.getByTestId('wifi-icon')).toBeInTheDocument();
  });

  it('does not render when visible is false', () => {
    const { container } = render(<OfflineIndicator isVisible={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('has proper positioning and styling', () => {
    const { container } = render(<OfflineIndicator isVisible={true} />);
    const indicator = container.firstChild as HTMLElement;
    
    expect(indicator).toHaveClass('fixed', 'bottom-4', 'right-4', 'z-50');
  });
});

describe('LoadingErrorState Component', () => {
  const mockOnRetry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays error message and retry button', async () => {
    const error = createMockError({ 
      retryable: true,
      message: 'Something went wrong' 
    });
    const user = (await import('@testing-library/user-event')).default.setup();

    render(
      <LoadingErrorState
        error={error}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Connection problem. Please check your internet and try again.')).toBeInTheDocument();
    
    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();

    await user.click(retryButton);
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show retry button for non-retryable errors', () => {
    const error = createMockError({ retryable: false });

    render(
      <LoadingErrorState
        error={error}
      />
    );

    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('shows loading state during retry', async () => {
    const error = createMockError({ retryable: true });
    const user = (await import('@testing-library/user-event')).default.setup();
    
    const slowRetry = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );

    render(
      <LoadingErrorState
        error={error}
        onRetry={slowRetry}
      />
    );

    const retryButton = screen.getByRole('button', { name: /try again/i });
    await user.click(retryButton);

    expect(screen.getAllByText('Retrying...')[0]).toBeInTheDocument();
    expect(retryButton).toBeDisabled();

    await waitFor(() => {
      expect(slowRetry).toHaveBeenCalledTimes(1);
    }, { timeout: 200 });
  });

  it('applies custom className when provided', () => {
    const error = createMockError();

    const { container } = render(
      <LoadingErrorState
        error={error}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has proper semantic structure', () => {
    const error = createMockError();

    render(
      <LoadingErrorState
        error={error}
      />
    );

    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Something went wrong');
    expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument();
  });
}); 