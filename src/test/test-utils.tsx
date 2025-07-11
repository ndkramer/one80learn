import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '../utils/authContext'
import { ClassProvider } from '../utils/classContext'
import { ModuleProvider } from '../utils/moduleContext'
import { NoteProvider } from '../utils/noteContext'

// Create a new QueryClient for each test to ensure test isolation
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Don't retry in tests
      gcTime: Infinity, // Disable garbage collection in tests
    },
    mutations: {
      retry: false,
    },
  },
})

const AllProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient()
  
  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  )
}

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