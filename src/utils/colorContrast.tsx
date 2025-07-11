import React, { createContext, useContext, useEffect, useState } from 'react';
import { useHighContrast, getContrastRatio } from './accessibilityUtils';

// WCAG 2.1 compliant color palette
export const colors = {
  primary: {
    normal: '#F98B3D',
    highContrast: '#CC6600', // Higher contrast version
    hover: '#e07a2c',
    hoverHighContrast: '#B35900',
  },
  background: {
    normal: '#ffffff',
    highContrast: '#ffffff',
    light: '#f9fafb',
    lightHighContrast: '#f5f5f5',
  },
  text: {
    primary: '#111827',
    primaryHighContrast: '#000000',
    secondary: '#4B5563',
    secondaryHighContrast: '#1F2937',
    muted: '#6B7280',
    mutedHighContrast: '#374151',
  },
  border: {
    light: '#E5E7EB',
    lightHighContrast: '#D1D5DB',
    normal: '#D1D5DB',
    normalHighContrast: '#9CA3AF',
  },
  feedback: {
    success: {
      normal: '#10B981',
      highContrast: '#059669',
      background: '#ECFDF5',
      backgroundHighContrast: '#E6FFFA',
    },
    error: {
      normal: '#EF4444',
      highContrast: '#DC2626',
      background: '#FEF2F2',
      backgroundHighContrast: '#FFEBEE',
    },
    warning: {
      normal: '#F59E0B',
      highContrast: '#D97706',
      background: '#FFFBEB',
      backgroundHighContrast: '#FFF8E1',
    },
    info: {
      normal: '#3B82F6',
      highContrast: '#2563EB',
      background: '#EFF6FF',
      backgroundHighContrast: '#E3F2FD',
    },
  },
};

// Color contrast validation
export const validateContrast = (foreground: string, background: string): {
  ratio: number;
  wcagAA: boolean;
  wcagAAA: boolean;
  level: 'fail' | 'aa' | 'aaa';
} => {
  const ratio = getContrastRatio(foreground, background);
  const wcagAA = ratio >= 4.5;
  const wcagAAA = ratio >= 7;
  
  let level: 'fail' | 'aa' | 'aaa' = 'fail';
  if (wcagAAA) level = 'aaa';
  else if (wcagAA) level = 'aa';
  
  return { ratio, wcagAA, wcagAAA, level };
};

// High contrast context
interface HighContrastContextType {
  isHighContrast: boolean;
  toggleHighContrast: () => void;
  getColor: (colorPath: string) => string;
}

const HighContrastContext = createContext<HighContrastContextType | undefined>(undefined);

export const useHighContrastMode = () => {
  const context = useContext(HighContrastContext);
  if (!context) {
    throw new Error('useHighContrastMode must be used within a HighContrastProvider');
  }
  return context;
};

export const HighContrastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemPrefersHighContrast = useHighContrast();
  const [isHighContrast, setIsHighContrast] = useState(() => {
    const saved = localStorage.getItem('highContrastMode');
    return saved ? JSON.parse(saved) : systemPrefersHighContrast;
  });

  useEffect(() => {
    localStorage.setItem('highContrastMode', JSON.stringify(isHighContrast));
    
    // Update CSS custom properties for high contrast mode
    const root = document.documentElement;
    if (isHighContrast) {
      root.classList.add('high-contrast');
      // Set CSS custom properties for high contrast
      root.style.setProperty('--color-primary', colors.primary.highContrast);
      root.style.setProperty('--color-primary-hover', colors.primary.hoverHighContrast);
      root.style.setProperty('--color-text-primary', colors.text.primaryHighContrast);
      root.style.setProperty('--color-text-secondary', colors.text.secondaryHighContrast);
      root.style.setProperty('--color-text-muted', colors.text.mutedHighContrast);
      root.style.setProperty('--color-border-light', colors.border.lightHighContrast);
      root.style.setProperty('--color-border-normal', colors.border.normalHighContrast);
    } else {
      root.classList.remove('high-contrast');
      // Set normal colors
      root.style.setProperty('--color-primary', colors.primary.normal);
      root.style.setProperty('--color-primary-hover', colors.primary.hover);
      root.style.setProperty('--color-text-primary', colors.text.primary);
      root.style.setProperty('--color-text-secondary', colors.text.secondary);
      root.style.setProperty('--color-text-muted', colors.text.muted);
      root.style.setProperty('--color-border-light', colors.border.light);
      root.style.setProperty('--color-border-normal', colors.border.normal);
    }
  }, [isHighContrast]);

  const toggleHighContrast = () => {
    setIsHighContrast(prev => !prev);
  };

  const getColor = (colorPath: string): string => {
    const pathParts = colorPath.split('.');
    let current: any = colors;
    
    for (const part of pathParts) {
      current = current[part];
      if (!current) return colors.primary.normal; // fallback
    }
    
    // If it's an object with normal/highContrast variants
    if (typeof current === 'object' && current.normal && current.highContrast) {
      return isHighContrast ? current.highContrast : current.normal;
    }
    
    return current;
  };

  return (
    <HighContrastContext.Provider value={{ isHighContrast, toggleHighContrast, getColor }}>
      {children}
    </HighContrastContext.Provider>
  );
};

// High contrast toggle component
export const HighContrastToggle: React.FC = () => {
  const { isHighContrast, toggleHighContrast } = useHighContrastMode();

  return (
    <button
      onClick={toggleHighContrast}
      className={`
        inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        ${isHighContrast 
          ? 'bg-gray-900 text-white hover:bg-gray-800 focus:ring-gray-500' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400'
        }
      `}
      aria-label={`${isHighContrast ? 'Disable' : 'Enable'} high contrast mode`}
      aria-pressed={isHighContrast}
      type="button"
    >
      <svg
        className="w-4 h-4 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
      {isHighContrast ? 'High Contrast On' : 'High Contrast Off'}
    </button>
  );
};

// Color contrast checker component for development
export const ContrastChecker: React.FC<{
  foreground: string;
  background: string;
  text?: string;
}> = ({ foreground, background, text = 'Sample Text' }) => {
  const { ratio, wcagAA, wcagAAA, level } = validateContrast(foreground, background);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <div
        style={{ color: foreground, backgroundColor: background }}
        className="p-3 rounded mb-3 text-center font-medium"
      >
        {text}
      </div>
      <div className="space-y-1 text-sm">
        <div>Contrast Ratio: <strong>{ratio.toFixed(2)}:1</strong></div>
        <div className={`font-medium ${wcagAA ? 'text-green-600' : 'text-red-600'}`}>
          WCAG AA: {wcagAA ? '✓ Pass' : '✗ Fail'}
        </div>
        <div className={`font-medium ${wcagAAA ? 'text-green-600' : 'text-orange-600'}`}>
          WCAG AAA: {wcagAAA ? '✓ Pass' : '○ Enhance'}
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Level: <span className={`
            px-2 py-1 rounded text-white text-xs font-medium
            ${level === 'aaa' ? 'bg-green-600' : level === 'aa' ? 'bg-yellow-600' : 'bg-red-600'}
          `}>
            {level.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}; 