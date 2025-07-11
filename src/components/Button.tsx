import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { handleKeyboardClick, useUniqueId } from '../utils/accessibilityUtils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  'aria-label'?: string;
  'aria-describedby'?: string;
  loadingText?: string;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  loadingText,
  onClick,
  onKeyDown,
  ...props
}) => {
  const loadingId = useUniqueId('loading');
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors duration-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-[#F98B3D] text-white hover:bg-[#e07a2c] focus:ring-[#F98B3D] focus:ring-opacity-50',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400 focus:ring-opacity-50',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-[#F98B3D] focus:ring-opacity-50',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-400 focus:ring-opacity-50'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  const isDisabled = disabled || isLoading;
  
  // Enhanced keyboard handling
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    // Call custom onKeyDown if provided
    onKeyDown?.(e);
    
    // Handle keyboard clicks (Enter and Space)
    if (onClick && !isDisabled) {
      handleKeyboardClick(e, onClick);
    }
  };
  
  // Determine ARIA attributes
  const ariaAttributes = {
    'aria-label': ariaLabel || (typeof children === 'string' ? undefined : 'button'),
    'aria-describedby': isLoading && loadingText ? `${ariaDescribedBy || ''} ${loadingId}`.trim() : ariaDescribedBy,
    'aria-disabled': isDisabled,
    'aria-busy': isLoading,
  };
  
  return (
    <button
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}
        ${className}
      `}
      disabled={isDisabled}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      type="button"
      {...ariaAttributes}
      {...props}
    >
      {/* Loading state with screen reader support */}
      {isLoading && (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
          {loadingText && (
            <span id={loadingId} className="sr-only">
              {loadingText}
            </span>
          )}
        </>
      )}
      
      {/* Left icon with proper accessibility */}
      {!isLoading && leftIcon && (
        <span className="mr-2" aria-hidden="true">
          {leftIcon}
        </span>
      )}
      
      {/* Button content */}
      <span className={isLoading && loadingText ? 'sr-only' : ''}>
        {children}
      </span>
      
      {/* Loading text for screen readers */}
      {isLoading && loadingText && (
        <span aria-live="polite" className="sr-only">
          {loadingText}
        </span>
      )}
      
      {/* Right icon with proper accessibility */}
      {!isLoading && rightIcon && (
        <span className="ml-2" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </button>
  );
};

export default Button;