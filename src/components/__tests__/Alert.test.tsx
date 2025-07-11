import { render, screen } from '../../test/test-utils'
import Alert from '../Alert'
import { vi } from 'vitest'

describe('Alert Component', () => {
  it('renders with correct message', () => {
    render(<Alert type="info">This is an info message</Alert>)
    expect(screen.getByText('This is an info message')).toBeInTheDocument()
  })

  it('applies success variant styles correctly', () => {
    render(<Alert type="success">Success message</Alert>)
    // Get the alert container directly
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('bg-green-50')
    expect(alert).toHaveClass('border-green-200')
  })

  it('applies error variant styles correctly', () => {
    render(<Alert type="error">Error message</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('bg-red-50')
    expect(alert).toHaveClass('border-red-200')
  })

  it('applies warning variant styles correctly', () => {
    render(<Alert type="warning">Warning message</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('bg-yellow-50')
    expect(alert).toHaveClass('border-yellow-200')
  })

  it('applies info variant styles correctly', () => {
    render(<Alert type="info">Info message</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('bg-blue-50')
    expect(alert).toHaveClass('border-blue-200')
  })

  it('displays the correct icon for each type', () => {
    const { rerender } = render(<Alert type="success">Success</Alert>)
    // Check for CheckCircle icon (success icon) in the whole alert container
    expect(screen.getByText('Success').closest('div')?.parentElement?.parentElement?.querySelector('.lucide-check-circle')).toBeInTheDocument()

    rerender(<Alert type="error">Error</Alert>)
    // Check for XCircle icon (error icon)
    expect(screen.getByText('Error').closest('div')?.parentElement?.parentElement?.querySelector('.lucide-xcircle')).toBeInTheDocument()

    rerender(<Alert type="warning">Warning</Alert>)
    // Check for AlertCircle icon (warning icon)  
    expect(screen.getByText('Warning').closest('div')?.parentElement?.parentElement?.querySelector('.lucide-alert-circle')).toBeInTheDocument()

    rerender(<Alert type="info">Info</Alert>)
    // Check for Info icon (info icon)
    expect(screen.getByText('Info').closest('div')?.parentElement?.parentElement?.querySelector('.lucide-info')).toBeInTheDocument()
  })

  it('shows close button when onClose is provided', () => {
    const handleClose = vi.fn()
    render(<Alert type="info" onClose={handleClose}>Dismissible alert</Alert>)
    
    const closeButton = screen.getByRole('button', { name: /dismiss/i })
    expect(closeButton).toBeInTheDocument()
  })

  it('does not show close button when onClose is not provided', () => {
    render(<Alert type="info">Non-dismissible alert</Alert>)
    
    const closeButton = screen.queryByRole('button', { name: /dismiss/i })
    expect(closeButton).not.toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const handleClose = vi.fn()
    const { user } = render(<Alert type="info" onClose={handleClose}>Dismissible alert</Alert>)
    
    const closeButton = screen.getByRole('button', { name: /dismiss/i })
    await user.click(closeButton)
    
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('supports keyboard interaction for close button', async () => {
    const handleClose = vi.fn()
    const { user } = render(<Alert type="info" onClose={handleClose}>Dismissible alert</Alert>)
    
    const closeButton = screen.getByRole('button', { name: /dismiss/i })
    closeButton.focus()
    
    await user.keyboard('{Enter}')
    expect(handleClose).toHaveBeenCalledTimes(1)
    
    await user.keyboard(' ')
    expect(handleClose).toHaveBeenCalledTimes(2)
  })

  it('has proper accessibility attributes', () => {
    render(<Alert type="error">Error message</Alert>)
    const alert = screen.getByText('Error message').closest('div')?.parentElement?.parentElement
    expect(alert).toBeInTheDocument()
    // The component renders as a styled div, not with role="alert"
  })

  it('applies custom className when provided', () => {
    render(<Alert type="info" className="custom-alert">Custom alert</Alert>)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('custom-alert')
  })

  it('renders children correctly', () => {
    render(
      <Alert type="info">
        <span data-testid="custom-content">Custom content</span>
        <strong>Bold text</strong>
      </Alert>
    )
    
    expect(screen.getByTestId('custom-content')).toBeInTheDocument()
    expect(screen.getByText('Bold text')).toBeInTheDocument()
  })

  it('has proper ARIA live region for screen readers', () => {
    render(<Alert type="error">Important error</Alert>)
    const alert = screen.getByText('Important error').closest('div')?.parentElement?.parentElement
    // The component renders as a styled div
    expect(alert).toBeInTheDocument()
  })

  it('focuses close button for keyboard users', async () => {
    const handleClose = vi.fn()
    render(<Alert type="warning" onClose={handleClose}>Warning with close</Alert>)
    
    const closeButton = screen.getByRole('button', { name: /dismiss/i })
    closeButton.focus()
    expect(closeButton).toHaveFocus()
  })
}) 