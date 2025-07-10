# One80Learn Brand Guidelines & Design System

## 🎨 Brand Identity

### Brand Name
**One80Learn** - Student Learning Platform

### Brand Mission
A modern, responsive web application for delivering educational content through an interactive learning experience.

### Brand Values
- **Accessibility** - Inclusive learning for all
- **Clarity** - Clean, intuitive design
- **Engagement** - Interactive and dynamic experience
- **Professionalism** - Reliable and trustworthy platform

---

## 🌈 Color Palette

### Primary Colors
```css
/* Primary Orange */
--primary: #F98B3D
--primary-hover: #e07a2c
--primary-light: #F98B3D10 (10% opacity)

/* Usage: Buttons, links, active states, accents */
```

### Neutral Colors
```css
/* Backgrounds */
--bg-primary: #ffffff (white)
--bg-secondary: #f9fafb (gray-50)
--bg-sidebar: #f3f4f6 (gray-100)

/* Text Colors */
--text-primary: #111827 (gray-900)
--text-secondary: #374151 (gray-700)  
--text-muted: #6b7280 (gray-500)
--text-light: #9ca3af (gray-400)

/* Borders */
--border-light: #e5e7eb (gray-200)
--border-default: #d1d5db (gray-300)
```

### Semantic Colors
```css
/* Success */
--success-bg: #dcfce7 (green-50)
--success-border: #bbf7d0 (green-200)
--success-text: #166534 (green-800)
--success-icon: #22c55e (green-500)

/* Error */
--error-bg: #fef2f2 (red-50)
--error-border: #fecaca (red-200)
--error-text: #991b1b (red-800)
--error-icon: #ef4444 (red-500)

/* Warning */
--warning-bg: #fffbeb (yellow-50)
--warning-border: #fed7aa (yellow-200)
--warning-text: #92400e (yellow-800)
--warning-icon: #f59e0b (yellow-500)

/* Info */
--info-bg: #eff6ff (blue-50)
--info-border: #bfdbfe (blue-200)
--info-text: #1e40af (blue-800)
--info-icon: #3b82f6 (blue-500)
```

---

## 📝 Typography

### Font Family
- **Primary**: System font stack (Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)
- **Fallback**: Sans-serif

### Text Hierarchy
```css
/* Headings */
h1: text-2xl font-bold (32px, 700 weight)
h2: text-xl font-bold (24px, 700 weight)  
h3: text-lg font-medium (18px, 500 weight)

/* Body Text */
body: text-base (16px)
small: text-sm (14px)
tiny: text-xs (12px)

/* Font Weights */
font-medium: 500
font-bold: 700
```

### Text Styles
```css
/* Links */
.link-primary {
  color: #F98B3D;
  text-decoration: underline;
}
.link-primary:hover {
  color: #e07a2c;
}

/* Code/Monospace */
code, pre {
  font-family: 'Fira Code', monospace;
  background: #f3f4f6;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}
```

---

## 🧩 Component Styles

### Buttons

#### Primary Button
```css
.btn-primary {
  background: #F98B3D;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: all 200ms;
}
.btn-primary:hover {
  background: #e07a2c;
}
```

#### Secondary Button
```css
.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}
.btn-secondary:hover {
  background: #e5e7eb;
}
```

#### Button Sizes
- **Small**: `px-3 py-1.5 text-sm`
- **Medium**: `px-4 py-2 text-base`
- **Large**: `px-6 py-3 text-lg`

### Cards
```css
.card {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 200ms;
}
.card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

### Forms
```css
.form-input {
  width: 100%;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  transition: all 200ms;
}
.form-input:focus {
  outline: none;
  border-color: #F98B3D;
  box-shadow: 0 0 0 3px rgba(249, 139, 61, 0.1);
}
```

### Navigation
```css
.nav-item {
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  transition: all 200ms;
}
.nav-item:hover {
  background: #e5e7eb;
}
.nav-item.active {
  background: #F98B3D;
  color: white;
}
```

---

## 🎯 Brand Voice & Tone

### Voice Characteristics
- **Clear & Direct** - Communicate without jargon
- **Supportive** - Encouraging and helpful
- **Professional** - Authoritative yet approachable
- **Inclusive** - Welcoming to all learners

### Tone Guidelines

#### For Educational Content
- Use active voice
- Keep sentences concise
- Break complex concepts into steps
- Include encouraging language

#### For Interface Text
- Use action-oriented language ("View Class", "Start Learning")
- Be specific ("5 modules remaining" vs "Some modules left")
- Provide clear next steps

#### For Error Messages
- Be helpful, not punitive
- Explain what happened and how to fix it
- Offer alternative actions when possible

---

## 📐 Layout Principles

### Grid System
- **Container**: Max-width with centered content
- **Spacing**: 4px base unit (0.25rem)
- **Common spacing**: 4, 8, 12, 16, 24, 32, 48, 64px

### Responsive Breakpoints
```css
/* Mobile-first approach */
sm: 640px   /* Small devices */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
```

### Layout Patterns
- **Card Grids**: 1 col mobile, 2-3 cols tablet, 3-4 cols desktop
- **Sidebar**: 256px width, collapsible to 80px
- **Content**: Max-width 1200px, centered with padding

---

## 🔄 Motion & Transitions

### Animation Principles
- **Subtle**: Enhance UX without distraction
- **Fast**: 200ms for most interactions
- **Purposeful**: Guide user attention

### Common Transitions
```css
/* Hover states */
transition: all 200ms ease-in-out;

/* Loading states */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Slide animations */
transition: transform 200ms ease-in-out;
```

---

## 🎨 Iconography

### Icon Library
**Lucide React** - Consistent, modern icon set

### Icon Usage
- **Size**: 16px (small), 20px (medium), 24px (large)
- **Color**: Inherit from parent or use semantic colors
- **Spacing**: 8px margin from adjacent text

### Common Icons
- **Navigation**: `ChevronRight`, `ChevronDown`, `Menu`
- **Actions**: `Plus`, `Edit`, `Trash2`, `Download`
- **Status**: `CheckCircle`, `XCircle`, `AlertCircle`
- **Content**: `BookOpen`, `FileText`, `Video`

---

## 📱 Mobile Considerations

### Touch Targets
- **Minimum size**: 44px × 44px
- **Recommended**: 48px × 48px for primary actions

### Mobile Patterns
- **Collapsible sidebar** becomes slide-over menu
- **Card grids** stack to single column
- **Tables** become vertically scrollable
- **Forms** use full-width inputs

---

## ♿ Accessibility Guidelines

### Color Contrast
- **Text on white**: Minimum 4.5:1 ratio
- **Large text**: Minimum 3:1 ratio
- **Interactive elements**: Clear focus states

### Focus Management
- **Visible focus indicators** for all interactive elements
- **Logical tab order** through content
- **Skip links** for navigation

### ARIA Labels
- **Descriptive button text** ("Edit profile" not "Edit")
- **Form labels** properly associated
- **Status messages** announced to screen readers

---

## 🔧 Implementation Notes

### CSS Framework
**Tailwind CSS** - Utility-first approach

### Component Architecture
- **Reusable components** in `/src/components/`
- **Consistent props interface** across similar components
- **TypeScript definitions** for all component props

### File Organization
```
src/
├── components/     # Reusable UI components
├── pages/         # Route-specific components  
├── utils/         # Shared utilities and contexts
└── types/         # TypeScript definitions
```

---

## 📋 Component Checklist

When creating new components, ensure:

- [ ] **Consistent spacing** using design tokens
- [ ] **Proper color usage** from the defined palette
- [ ] **Responsive behavior** across all breakpoints
- [ ] **Accessibility features** (ARIA, focus management)
- [ ] **Loading states** for async operations
- [ ] **Error handling** with user-friendly messages
- [ ] **TypeScript definitions** for all props
- [ ] **Consistent animation** timing (200ms default)

---

## 🎯 Common Patterns

### Success States
- Use green semantic colors
- Include checkmark icon
- Provide clear confirmation message
- Offer logical next action

### Error States  
- Use red semantic colors
- Include error icon
- Explain what went wrong
- Provide solution or retry option

### Loading States
- Use orange spinner with brand color
- Show progress when possible
- Maintain layout stability
- Provide cancel option for long operations

### Empty States
- Use illustration or icon
- Explain why content is empty
- Provide clear call-to-action
- Make it easy to get started

---

**Last Updated**: January 2025
**Version**: 1.0
**Maintained by**: One80Learn Development Team 