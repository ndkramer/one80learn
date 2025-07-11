import { vi } from 'vitest'

// Mock Supabase client with all commonly used methods
export const mockSupabase = {
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ 
      data: { subscription: { unsubscribe: vi.fn() } } 
    })),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    rangeGt: vi.fn().mockReturnThis(),
    rangeGte: vi.fn().mockReturnThis(),
    rangeLt: vi.fn().mockReturnThis(),
    rangeLte: vi.fn().mockReturnThis(),
    rangeAdjacent: vi.fn().mockReturnThis(),
    overlaps: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    abortSignal: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    csv: vi.fn(),
    geojson: vi.fn(),
    explain: vi.fn(),
    rollback: vi.fn(),
    returns: vi.fn(),
  })),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    send: vi.fn(),
  })),
  removeChannel: vi.fn(),
  getChannels: vi.fn(() => []),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      download: vi.fn(),
      list: vi.fn(),
      remove: vi.fn(),
      createSignedUrl: vi.fn(),
      createSignedUrls: vi.fn(),
      getPublicUrl: vi.fn(),
      move: vi.fn(),
      copy: vi.fn(),
    })),
  },
}

// Mock successful auth responses
export const mockAuthSuccess = {
  data: {
    user: {
      id: 'test-user-123',
      email: 'test@example.com',
      user_metadata: { full_name: 'Test User' }
    },
    session: {
      access_token: 'mock-token',
      refresh_token: 'mock-refresh-token'
    }
  },
  error: null
}

// Mock auth error responses
export const mockAuthError = {
  data: { user: null, session: null },
  error: { message: 'Invalid credentials' }
}

// Mock database success responses
export const mockDbSuccess = (data: any) => ({
  data,
  error: null,
  count: null,
  status: 200,
  statusText: 'OK'
})

// Mock database error responses
export const mockDbError = (message: string) => ({
  data: null,
  error: { message },
  count: null,
  status: 400,
  statusText: 'Bad Request'
})

// Helper to reset all mocks
export const resetAllMocks = () => {
  vi.clearAllMocks()
  Object.values(mockSupabase.auth).forEach(fn => typeof fn === 'function' && fn.mockClear?.())
  mockSupabase.from.mockClear()
  mockSupabase.channel.mockClear()
  mockSupabase.removeChannel.mockClear()
}

// Mock the supabase module
vi.mock('../utils/supabase', () => ({
  supabase: mockSupabase,
}))

export default mockSupabase 