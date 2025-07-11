import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '../utils/authContext'
import { ClassProvider } from '../utils/classContext'
import { ModuleProvider } from '../utils/moduleContext'
import { NoteProvider } from '../utils/noteContext'

// All providers wrapper
const AllProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ClassProvider>
          <ModuleProvider>
            <NoteProvider>
              {children}
            </NoteProvider>
          </ModuleProvider>
        </ClassProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

// Custom render function with providers
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const user = userEvent.setup()
  return {
    user,
    ...render(ui, { wrapper: AllProviders, ...options })
  }
}

// Mock user for testing
export const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User'
  }
}

// Mock class data
export const mockClass = {
  id: 'test-class-123',
  title: 'Test React Course',
  description: 'Learn React fundamentals',
  instructor_name: 'John Instructor',
  enrollment_status: 'active' as const,
  modules_count: 5,
  completed_modules_count: 2
}

// Mock module data
export const mockModule = {
  id: 'test-module-123',
  title: 'Introduction to React',
  description: 'Basic concepts of React',
  class_id: 'test-class-123',
  order_number: 1,
  is_completed: false,
  resource_type: 'pdf' as const,
  resource_url: 'test-document.pdf'
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'
export { customRender as render }

// Helper functions for common test scenarios
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 0))

export const expectElementToBeVisible = (element: HTMLElement) => {
  expect(element).toBeInTheDocument()
  expect(element).toBeVisible()
} 