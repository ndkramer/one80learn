import { Database, Tables } from './database';

// Database table types
export type DbClass = Tables<'classes'>;
export type DbModule = Tables<'modules'>;
export type DbResource = Tables<'resources'>;
export type DbNote = Tables<'notes'>;
export type DbEnrollment = Tables<'enrollments'>;
export type DbModuleProgress = Tables<'module_progress'>;
export type DbCourseEvaluation = Tables<'course_evaluations'>;
export type DbStorageObject = Tables<'storage_objects'>;

// New step-related database types (to be added after migration)
export interface DbStep {
  id: string;
  module_id: string;
  step_number: number;
  title: string;
  description: string;
  slide_pdf_url?: string | null;
  video_url?: string | null;
  content_type: 'pdf' | 'video';
  content?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbStepCompletion {
  id: string;
  user_id: string;
  step_id: string;
  completed: boolean;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbStepNote {
  id: string;
  user_id: string;
  step_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// Application types derived from database types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  is_super_admin?: boolean;
  needs_password_set?: boolean;
  email_confirmed_at?: string | null;
}

export interface Class extends Omit<DbClass, 'schedule_data' | 'thumbnail_url'> {
  thumbnailUrl: string;
  instructor?: string;
  schedule_data?: {
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    timeZone: string;
    location: string;
  };
  modules: Module[];
}

// Updated Module interface to support steps
export interface Module extends Omit<DbModule, 'slide_pdf_url'> {
  slideUrl?: string;
  slide_pdf_url?: string;
  resources: Resource[];
  supports_sync?: boolean;
  pdf_total_pages?: number;
  presentation_title?: string;
  steps: Step[]; // NEW: Array of steps in this module
  progress?: ModuleProgress; // Progress summary for the current user
}

// NEW: Step interface
export interface Step {
  id: string;
  moduleId: string;
  stepNumber: number;
  title: string;
  description: string;
  slideUrl?: string;
  slide_pdf_url?: string;
  video_url?: string;
  content_type: 'pdf' | 'video';
  content?: string;
  createdAt: string;
  updatedAt: string;
  completion?: StepCompletion; // Completion status for current user
  note?: StepNote; // User's note for this step
}

// NEW: Step completion tracking
export interface StepCompletion {
  id: string;
  userId: string;
  stepId: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// NEW: Step-specific notes (replaces module-level notes)
export interface StepNote {
  id: string;
  userId: string;
  stepId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// NEW: Module progress summary based on step completion
export interface ModuleProgress {
  moduleId: string;
  totalSteps: number;
  completedSteps: number;
  progressPercentage: number;
  isCompleted: boolean;
  lastAccessedStep?: number;
  nextStep?: {
    stepId: string;
    stepNumber: number;
    title: string;
  };
}

export interface Resource extends DbResource {
  // All properties already match the database schema
}

// DEPRECATED: Module-level notes (kept for backward compatibility during migration)
export interface Note extends Omit<DbNote, 'user_id' | 'module_id'> {
  userId: string;
  moduleId: string;
}

// Additional application types
export interface Enrollment extends DbEnrollment {
  // All properties match the database schema
}

export interface ModuleProgress extends DbModuleProgress {
  // All properties match the database schema
}

export interface CourseEvaluation extends DbCourseEvaluation {
  // All properties match the database schema
}

export interface StorageObject extends DbStorageObject {
  // All properties match the database schema
}

// Type guards for runtime type checking
export const isValidResourceType = (type: string): type is Resource['type'] => {
  return ['pdf', 'word', 'excel', 'video', 'link'].includes(type);
};

export const isValidEnrollmentStatus = (status: string): status is NonNullable<Enrollment['status']> => {
  return ['active', 'completed', 'dropped'].includes(status);
};

// Utility types for forms and API operations
export type ClassInsert = Database['public']['Tables']['classes']['Insert'];
export type ClassUpdate = Database['public']['Tables']['classes']['Update'];
export type ModuleInsert = Database['public']['Tables']['modules']['Insert'];
export type ModuleUpdate = Database['public']['Tables']['modules']['Update'];
export type ResourceInsert = Database['public']['Tables']['resources']['Insert'];
export type ResourceUpdate = Database['public']['Tables']['resources']['Update'];
export type NoteInsert = Database['public']['Tables']['notes']['Insert'];
export type NoteUpdate = Database['public']['Tables']['notes']['Update'];

// NEW: Step-related insert/update types (to be added after migration)
export interface StepInsert {
  module_id: string;
  step_number: number;
  title: string;
  description?: string;
  slide_pdf_url?: string;
  video_url?: string;
  content_type: 'pdf' | 'video';
  content?: string;
}

export interface StepUpdate {
  step_number?: number;
  title?: string;
  description?: string;
  slide_pdf_url?: string;
  content?: string;
}

export interface StepCompletionInsert {
  user_id: string;
  step_id: string;
  completed?: boolean;
}

export interface StepCompletionUpdate {
  completed?: boolean;
}

export interface StepNoteInsert {
  user_id: string;
  step_id: string;
  content?: string;
}

export interface StepNoteUpdate {
  content?: string;
}

// Function types for admin operations
export type CheckIsSuperAdminFunction = Database['public']['Functions']['check_is_super_admin'];
export type SetUserSuperAdminFunction = Database['public']['Functions']['set_user_super_admin'];

// Enhanced Error Handling Types
export interface AppError {
  id: string;
  type: ErrorType;
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  context?: ErrorContext;
  stack?: string;
  recoverable: boolean;
  retryable: boolean;
  userAction?: UserAction;
}

export type ErrorType = 
  | 'network'
  | 'auth'
  | 'validation'
  | 'permission'
  | 'not_found'
  | 'server'
  | 'client'
  | 'offline'
  | 'unknown';

export interface ErrorContext {
  userId?: string;
  route?: string;
  component?: string;
  operation?: string;
  metadata?: Record<string, any>;
}

export interface UserAction {
  type: 'retry' | 'refresh' | 'navigate' | 'contact_support' | 'dismiss';
  label: string;
  handler: () => void | Promise<void>;
}

export interface RetryOptions {
  maxAttempts: number;
  delay: number;
  backoff: 'linear' | 'exponential';
  retryableErrors?: ErrorType[];
}

export interface ErrorDisplayOptions {
  showDetails: boolean;
  autoHide: boolean;
  hideDelay: number;
  position: 'top' | 'bottom' | 'center';
}

// Network and API Error Types
export interface APIError extends Error {
  status: number;
  code: string;
  details?: Record<string, any>;
}

export interface NetworkError extends Error {
  offline: boolean;
  timeout: boolean;
}

// Validation Error Types
export interface ValidationError extends Error {
  field?: string;
  errors: ValidationFieldError[];
}

export interface ValidationFieldError {
  field: string;
  message: string;
  code: string;
}

// Auth Error Types
export interface AuthError extends Error {
  code: 'invalid_credentials' | 'expired_token' | 'insufficient_permissions' | 'account_locked' | 'email_not_confirmed';
  details?: Record<string, any>;
}

// Response wrapper types for consistent error handling
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: Record<string, any>;
}

export interface ErrorResponse {
  success: false;
  error: AppError;
  meta?: Record<string, any>;
}

export type APIResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// Utility types for error handling hooks
export interface UseRetryState {
  attempt: number;
  isRetrying: boolean;
  canRetry: boolean;
  lastError?: Error;
}

export interface UseOfflineState {
  isOnline: boolean;
  wasOffline: boolean;
  pendingActions: QueuedAction[];
}

export interface QueuedAction {
  id: string;
  type: string;
  operation: () => Promise<any>;
  data: any;
  timestamp: Date;
  retries: number;
}

// Error boundary types
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: AppError;
  errorId?: string;
}

export interface ErrorBoundaryFallbackProps {
  error: AppError;
  resetError: () => void;
  retryAction?: () => void;
}

// Loading state types for better UX
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T = any> {
  data?: T;
  error?: AppError;
  loading: boolean;
  state: LoadingState;
}

// Error classification helpers
export const ErrorCodes = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR', 
  OFFLINE_ERROR: 'OFFLINE_ERROR',
  
  // Auth errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EXPIRED_TOKEN: 'EXPIRED_TOKEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  EMAIL_NOT_CONFIRMED: 'EMAIL_NOT_CONFIRMED',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Business logic errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  OPERATION_FAILED: 'OPERATION_FAILED',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  
  // Server errors
  SERVER_ERROR: 'SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  
  // Client errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  RENDERING_ERROR: 'RENDERING_ERROR'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];