import { supabase } from './supabase';

/**
 * Instructor Authorization Utilities
 * 
 * Functions to verify instructor permissions for classes, modules,
 * and presentation sessions in the One80Learn platform.
 */

export interface InstructorInfo {
  userId: string;
  isInstructor: boolean;
  isSuperAdmin: boolean;
  instructedClasses: string[];
}

/**
 * Get comprehensive instructor information for the current user
 */
export async function getInstructorInfo(): Promise<InstructorInfo | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Check if user is super admin
    const isSuperAdmin = user.user_metadata?.is_super_admin === true;

    // Get classes where user is instructor
    const { data: instructedClasses } = await supabase
      .from('classes')
      .select('id')
      .eq('instructor_id', user.id);

    const classIds = instructedClasses?.map(c => c.id) || [];

    return {
      userId: user.id,
      isInstructor: classIds.length > 0 || isSuperAdmin,
      isSuperAdmin,
      instructedClasses: classIds
    };
  } catch (error) {
    console.error('Failed to get instructor info:', error);
    return null;
  }
}

/**
 * Check if the current user is an instructor for a specific class
 */
export async function isClassInstructor(classId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if super admin
    if (user.user_metadata?.is_super_admin === true) {
      return true;
    }

    // Check if user is the instructor of this class
    const { data: classData } = await supabase
      .from('classes')
      .select('instructor_id')
      .eq('id', classId)
      .single();

    return classData?.instructor_id === user.id;
  } catch (error) {
    console.error('Failed to check class instructor status:', error);
    return false;
  }
}

/**
 * Check if the current user is an instructor for a specific module
 */
export async function isModuleInstructor(moduleId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if super admin
    if (user.user_metadata?.is_super_admin === true) {
      return true;
    }

    // Get the module's class and check instructor
    const { data: moduleData } = await supabase
      .from('modules')
      .select('classes!inner(instructor_id)')
      .eq('id', moduleId)
      .single();

    return moduleData?.classes?.instructor_id === user.id;
  } catch (error) {
    console.error('Failed to check module instructor status:', error);
    return false;
  }
}

/**
 * Check if the current user can create/manage presentation sessions for a module
 */
export async function canManagePresentationSession(moduleId: string): Promise<boolean> {
  return await isModuleInstructor(moduleId);
}

/**
 * Check if the current user is enrolled in a class (student check)
 */
export async function isStudentEnrolled(classId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('class_id', classId)
      .eq('status', 'active')
      .single();

    return !!enrollment;
  } catch (error) {
    console.error('Failed to check student enrollment:', error);
    return false;
  }
}

/**
 * Check if the current user can view a specific module (enrolled or instructor)
 */
export async function canViewModule(moduleId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if super admin
    if (user.user_metadata?.is_super_admin === true) {
      return true;
    }

    // Get module's class
    const { data: moduleData } = await supabase
      .from('modules')
      .select('class_id, classes!inner(instructor_id)')
      .eq('id', moduleId)
      .single();

    if (!moduleData) return false;

    // Check if instructor
    if (moduleData.classes.instructor_id === user.id) {
      return true;
    }

    // Check if enrolled student
    return await isStudentEnrolled(moduleData.class_id);
  } catch (error) {
    console.error('Failed to check module view permission:', error);
    return false;
  }
}

/**
 * Get all classes where the current user is an instructor
 */
export async function getInstructedClasses(): Promise<any[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: classes } = await supabase
      .from('classes')
      .select('*')
      .eq('instructor_id', user.id);

    return classes || [];
  } catch (error) {
    console.error('Failed to get instructed classes:', error);
    return [];
  }
}

/**
 * Get all modules for classes where the current user is an instructor
 */
export async function getInstructedModules(): Promise<any[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: modules } = await supabase
      .from('modules')
      .select(`
        *,
        classes!inner(
          id,
          title,
          instructor_id
        )
      `)
      .eq('classes.instructor_id', user.id);

    return modules || [];
  } catch (error) {
    console.error('Failed to get instructed modules:', error);
    return [];
  }
}

/**
 * Check if a module supports presentation sync functionality
 */
export async function moduleSupportsSync(moduleId: string): Promise<boolean> {
  try {
    const { data: moduleData } = await supabase
      .from('modules')
      .select('supports_sync, slide_pdf_url')
      .eq('id', moduleId)
      .single();

    // Module supports sync if explicitly enabled AND has a PDF
    return !!(moduleData?.supports_sync && moduleData?.slide_pdf_url);
  } catch (error) {
    console.error('Failed to check module sync support:', error);
    return false;
  }
}

/**
 * Enable presentation sync for a module (Instructor only)
 */
export async function enableModuleSync(
  moduleId: string, 
  totalPages?: number,
  presentationTitle?: string
): Promise<boolean> {
  try {
    // Check permissions
    if (!await isModuleInstructor(moduleId)) {
      throw new Error('Unauthorized: Not the instructor of this module');
    }

    const updateData: any = { supports_sync: true };
    
    if (totalPages) {
      updateData.pdf_total_pages = totalPages;
    }
    
    if (presentationTitle) {
      updateData.presentation_title = presentationTitle;
    }

    const { error } = await supabase
      .from('modules')
      .update(updateData)
      .eq('id', moduleId);

    if (error) throw error;
    return true;

  } catch (error) {
    console.error('Failed to enable module sync:', error);
    return false;
  }
}

/**
 * Disable presentation sync for a module (Instructor only)
 */
export async function disableModuleSync(moduleId: string): Promise<boolean> {
  try {
    // Check permissions
    if (!await isModuleInstructor(moduleId)) {
      throw new Error('Unauthorized: Not the instructor of this module');
    }

    const { error } = await supabase
      .from('modules')
      .update({ supports_sync: false })
      .eq('id', moduleId);

    if (error) throw error;
    return true;

  } catch (error) {
    console.error('Failed to disable module sync:', error);
    return false;
  }
}

/**
 * Get active presentation sessions for instructor's modules
 */
export async function getInstructorActiveSessions(): Promise<any[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: sessions } = await supabase
      .from('active_presentation_sessions')
      .select('*')
      .eq('instructor_id', user.id);

    return sessions || [];
  } catch (error) {
    console.error('Failed to get instructor active sessions:', error);
    return [];
  }
}

/**
 * Get presentation sessions that the current user can join as a student
 */
export async function getAvailableStudentSessions(): Promise<any[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get sessions for classes where user is enrolled
    const { data: sessions } = await supabase
      .from('presentation_sessions')
      .select(`
        *,
        modules!inner(
          title,
          class_id,
          classes!inner(
            title
          )
        ),
        enrollments!inner(
          user_id
        )
      `)
      .eq('is_active', true)
      .eq('enrollments.user_id', user.id)
      .eq('enrollments.status', 'active');

    return sessions || [];
  } catch (error) {
    console.error('Failed to get available student sessions:', error);
    return [];
  }
}

/**
 * Check if user has any instructor permissions
 */
export async function hasInstructorPermissions(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if super admin
    if (user.user_metadata?.is_super_admin === true) {
      return true;
    }

    // Check if instructor of any class
    const { data: classes } = await supabase
      .from('classes')
      .select('id')
      .eq('instructor_id', user.id)
      .limit(1);

    return !!(classes && classes.length > 0);
  } catch (error) {
    console.error('Failed to check instructor permissions:', error);
    return false;
  }
}

/**
 * Validate presentation session access for current user
 */
export async function validateSessionAccess(sessionId: string): Promise<{
  canAccess: boolean;
  role: 'instructor' | 'student' | null;
  reason?: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { canAccess: false, role: null, reason: 'Not authenticated' };
    }

    // Get session details
    const { data: session } = await supabase
      .from('presentation_sessions')
      .select(`
        *,
        modules!inner(
          class_id,
          classes!inner(instructor_id)
        )
      `)
      .eq('id', sessionId)
      .single();

    if (!session) {
      return { canAccess: false, role: null, reason: 'Session not found' };
    }

    if (!session.is_active) {
      return { canAccess: false, role: null, reason: 'Session is not active' };
    }

    // Check if instructor
    if (session.modules.classes.instructor_id === user.id || user.user_metadata?.is_super_admin === true) {
      return { canAccess: true, role: 'instructor' };
    }

    // Check if enrolled student
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('class_id', session.modules.class_id)
      .eq('status', 'active')
      .single();

    if (enrollment) {
      return { canAccess: true, role: 'student' };
    }

    return { canAccess: false, role: null, reason: 'Not enrolled in this class' };

  } catch (error) {
    console.error('Failed to validate session access:', error);
    return { canAccess: false, role: null, reason: 'Validation error' };
  }
} 