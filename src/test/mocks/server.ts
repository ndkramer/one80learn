import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Mock API handlers
const handlers = [
  // Mock Supabase Auth endpoints
  http.post('*/auth/v1/token', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' }
      }
    })
  }),

  // Mock Supabase REST API endpoints
  http.get('*/rest/v1/classes', () => {
    return HttpResponse.json([
      {
        id: 'test-class-123',
        title: 'Test React Course',
        description: 'Learn React fundamentals',
        instructor_name: 'John Instructor',
        enrollment_status: 'active',
        modules_count: 5,
        completed_modules_count: 2
      }
    ])
  }),

  http.get('*/rest/v1/modules', () => {
    return HttpResponse.json([
      {
        id: 'test-module-123',
        title: 'Introduction to React',
        description: 'Basic concepts of React',
        class_id: 'test-class-123',
        order_number: 1,
        is_completed: false,
        resource_type: 'pdf',
        resource_url: 'test-document.pdf'
      }
    ])
  }),

  http.get('*/rest/v1/notes', () => {
    return HttpResponse.json([
      {
        id: 'test-note-123',
        content: 'Test note content',
        module_id: 'test-module-123',
        user_id: 'test-user-123',
        created_at: new Date().toISOString()
      }
    ])
  }),

  http.post('*/rest/v1/notes', () => {
    return HttpResponse.json({
      id: 'new-note-123',
      content: 'New test note',
      module_id: 'test-module-123',
      user_id: 'test-user-123',
      created_at: new Date().toISOString()
    }, { status: 201 })
  }),

  http.get('*/rest/v1/presentation_sessions', () => {
    return HttpResponse.json([
      {
        id: 'test-session-123',
        module_id: 'test-module-123',
        instructor_id: 'test-instructor-123',
        current_slide: 1,
        total_slides: 10,
        is_active: true,
        session_name: 'Test Session'
      }
    ])
  }),

  // Mock error response for testing error handling
  http.get('*/rest/v1/error-test', () => {
    return HttpResponse.json(
      { message: 'Test error message' },
      { status: 500 }
    )
  }),
]

// Setup server with handlers
export const server = setupServer(...handlers)

// Export individual handlers for test-specific overrides
export { handlers } 