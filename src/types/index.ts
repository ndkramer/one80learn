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

export interface Module extends Omit<DbModule, 'slide_pdf_url'> {
  slideUrl?: string;
  slide_pdf_url?: string;
  resources: Resource[];
  supports_sync?: boolean;
  pdf_total_pages?: number;
  presentation_title?: string;
}

export interface Resource extends DbResource {
  // All properties already match the database schema
}

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

// Function types for admin operations
export type CheckIsSuperAdminFunction = Database['public']['Functions']['check_is_super_admin'];
export type SetUserSuperAdminFunction = Database['public']['Functions']['set_user_super_admin'];