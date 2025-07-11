import { render, screen } from '../../test/test-utils'
import LoadingSpinner from '../LoadingSpinner'

describe('LoadingSpinner Component', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />)
    const spinner = screen.getByRole('status')
    expect(spinner).toBeInTheDocument()
  })

  it('displays loading text when provided', () => {
    render(<LoadingSpinner text="Loading data..." />)
    // Check for the visible text (not screen reader only)
    const visibleText = screen.getByText('Loading data...', { selector: 'span:not(.sr-only)' })
    expect(visibleText).toBeInTheDocument()
  })

  it('applies small size correctly', () => {
    render(<LoadingSpinner size="sm" />)
    const spinner = screen.getByRole('status')
    // Check for small size classes
    expect(spinner.querySelector('svg')).toHaveClass('w-4', 'h-4')
  })

  it('applies medium size correctly (default)', () => {
    render(<LoadingSpinner size="md" />)
    const spinner = screen.getByRole('status')
    // Check for medium size classes
    expect(spinner.querySelector('svg')).toHaveClass('w-6', 'h-6')
  })

  it('applies large size correctly', () => {
    render(<LoadingSpinner size="lg" />)
    const spinner = screen.getByRole('status')
    // Check for large size classes
    expect(spinner.querySelector('svg')).toHaveClass('w-8', 'h-8')
  })

  it('has proper accessibility attributes', () => {
    render(<LoadingSpinner text="Loading..." />)
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveAttribute('role', 'status')
    expect(spinner).toHaveAttribute('aria-live', 'polite')
  })

  it('has screen reader text', () => {
    render(<LoadingSpinner />)
    // Check for sr-only text
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('uses custom text in screen reader when provided', () => {
    render(<LoadingSpinner text="Processing your request..." />)
    // Check for the screen reader text specifically
    const screenReaderText = screen.getByText('Processing your request...', { selector: '.sr-only' })
    expect(screenReaderText).toBeInTheDocument()
  })

  it('applies custom className when provided', () => {
    render(<LoadingSpinner className="custom-spinner" />)
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('custom-spinner')
  })

  it('shows spinning animation', () => {
    render(<LoadingSpinner />)
    const spinner = screen.getByRole('status')
    // Check for animate-spin class
    expect(spinner.querySelector('svg')).toHaveClass('animate-spin')
  })

  it('centers content when fullScreen is true', () => {
    render(<LoadingSpinner fullScreen />)
    const spinner = screen.getByRole('status')
    // Check for centering classes
    expect(spinner).toHaveClass('fixed', 'inset-0', 'flex', 'items-center', 'justify-center')
  })

  it('renders inline when fullScreen is false', () => {
    render(<LoadingSpinner fullScreen={false} />)
    const spinner = screen.getByRole('status')
    // Should not have fixed positioning classes
    expect(spinner).not.toHaveClass('fixed', 'inset-0')
  })

  it('has proper color styling', () => {
    render(<LoadingSpinner />)
    const spinner = screen.getByRole('status')
    const svg = spinner.querySelector('svg')
    // Check for orange color theme
    expect(svg).toHaveClass('text-[#F98B3D]')
  })

  it('renders without text when text prop is empty', () => {
    render(<LoadingSpinner text="" />)
    const spinner = screen.getByRole('status')
    expect(spinner).toBeInTheDocument()
    // Should still have sr-only fallback
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('maintains aspect ratio for different sizes', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />)
    let svg = screen.getByRole('status').querySelector('svg')
    expect(svg).toHaveClass('w-4', 'h-4')

    rerender(<LoadingSpinner size="lg" />)
    svg = screen.getByRole('status').querySelector('svg')
    expect(svg).toHaveClass('w-8', 'h-8')
  })
}) 