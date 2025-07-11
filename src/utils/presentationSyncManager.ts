import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Database } from '../types/database';

// Type definitions for presentation sync
export interface PresentationSession {
  id: string;
  module_id: string;
  class_id?: string;
  current_module_id?: string;
  current_step_id?: string;
  instructor_id: string;
  current_slide: number;
  total_slides: number;
  is_active: boolean;
  session_name?: string;
  created_at: string;
  updated_at: string;
}

export interface SessionParticipant {
  id: string;
  session_id: string;
  student_id: string;
  is_synced: boolean;
  last_seen_slide: number;
  joined_at: string;
  last_activity: string;
}

export interface SyncStatus {
  isInstructor: boolean;
  isConnected: boolean;
  isSync: boolean;
  currentSlide: number;
  totalSlides: number;
  sessionId?: string;
  participantCount: number;
}

export interface PresentationSyncCallbacks {
  onSlideChange?: (slide: number) => void;
  onSyncStatusChange?: (status: SyncStatus) => void;
  onParticipantUpdate?: (participants: SessionParticipant[]) => void;
  onSessionEnd?: () => void;
  onError?: (error: string) => void;
  onModuleSwitch?: (newModuleId: string, startSlide: number) => void; // New callback for module switches
  onStepSwitch?: (stepId: string, startSlide: number) => void; // New callback for step switches
}

/**
 * PresentationSyncManager - Handles real-time presentation synchronization
 * 
 * Features:
 * - Real-time slide synchronization between instructor and students
 * - Session management (create, join, leave, end)
 * - Participant tracking and status updates
 * - Sync override capabilities for students
 * - Error handling and reconnection logic
 */
export class PresentationSyncManager {
  private channel: RealtimeChannel | null = null;
  private callbacks: PresentationSyncCallbacks;
  private currentSession: PresentationSession | null = null;
  private currentParticipant: SessionParticipant | null = null;
  private isInstructor: boolean = false;
  private userId: string | null = null;
  private syncStatus: SyncStatus;
  private participants: SessionParticipant[] = [];

  constructor(callbacks: PresentationSyncCallbacks = {}) {
    this.callbacks = callbacks;
    this.syncStatus = {
      isInstructor: false,
      isConnected: false,
      isSync: false,
      currentSlide: 1,
      totalSlides: 0,
      participantCount: 0
    };
  }

  /**
   * Initialize the sync manager with user authentication
   */
  async initialize(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        this.callbacks.onError?.('User not authenticated');
        return false;
      }
      
      this.userId = user.id;
      return true;
    } catch (error) {
      this.callbacks.onError?.(`Failed to initialize: ${error}`);
      return false;
    }
  }

  /**
   * Create a new presentation session (Instructor only)
   */
  async createSession(
    moduleId: string, 
    totalSlides: number, 
    sessionName?: string
  ): Promise<string | null> {
    if (!this.userId) {
      this.callbacks.onError?.('User not authenticated');
      return null;
    }

    try {
      // Verify instructor authorization by checking if user is instructor of the class
      const { data: moduleData } = await supabase
        .from('modules')
        .select('class_id, classes!inner(instructor_id)')
        .eq('id', moduleId)
        .single();

      if (!moduleData || moduleData.classes.instructor_id !== this.userId) {
        this.callbacks.onError?.('Unauthorized: You are not the instructor of this class');
        return null;
      }

      // Check for existing active session for this module
      const { data: existingSessions } = await supabase
        .from('presentation_sessions')
        .select('id, session_name, instructor_id')
        .eq('module_id', moduleId)
        .eq('is_active', true);

      if (existingSessions && existingSessions.length > 0) {
        const existingSession = existingSessions[0];
        // Return conflict info instead of auto-handling
        return { 
          conflict: true, 
          existingSession: existingSession,
          isOwnSession: existingSession.instructor_id === this.userId
        } as any;
      }

      // Create new session
      const { data: sessionData, error } = await supabase
        .from('presentation_sessions')
        .insert({
          module_id: moduleId,
          instructor_id: this.userId,
          total_slides: totalSlides,
          session_name: sessionName,
          current_slide: 1
        })
        .select()
        .single();

      if (error) throw error;

      this.currentSession = sessionData;
      this.isInstructor = true;
      this.syncStatus = {
        ...this.syncStatus,
        isInstructor: true,
        currentSlide: 1,
        totalSlides,
        sessionId: sessionData.id,
        isSync: true,
        isConnected: false // Will be set to true when realtime connects
      };

      // Set up realtime channel for this session
      try {
        this.setupRealtimeChannel(sessionData.id);
        // Connection status will be updated by the subscription callback
      } catch (error) {
        console.warn('Failed to setup realtime channel, but session is still valid:', error);
        this.syncStatus.isConnected = false;
        this.callbacks.onSyncStatusChange?.(this.syncStatus);
      }

      this.callbacks.onSyncStatusChange?.(this.syncStatus);
      
      console.log('Session created successfully:', sessionData.id);
      
      return sessionData.id;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as any)?.message || String(error);
      console.error('createSession error:', error);
      this.callbacks.onError?.(`Failed to create session: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Join existing session as instructor (when there's a conflict)
   */
  async joinExistingSession(sessionId: string): Promise<boolean> {
    if (!this.userId) {
      this.callbacks.onError?.('User not authenticated');
      return false;
    }

    try {
      // Get session details
      const { data: sessionData } = await supabase
        .from('presentation_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('is_active', true)
        .single();

      if (!sessionData) {
        this.callbacks.onError?.('Session not found or not active');
        return false;
      }

      // Verify instructor authorization
      if (sessionData.instructor_id !== this.userId) {
        this.callbacks.onError?.('You are not the instructor of this session');
        return false;
      }

      this.currentSession = sessionData;
      this.isInstructor = true;
      this.syncStatus = {
        ...this.syncStatus,
        isInstructor: true,
        currentSlide: sessionData.current_slide,
        totalSlides: sessionData.total_slides,
        sessionId: sessionData.id,
        isSync: true,
        isConnected: false // Will be set to true when realtime connects
      };

      // Set up realtime channel for this session
      try {
        this.setupRealtimeChannel(sessionData.id);
        // Connection status will be updated by the subscription callback
      } catch (error) {
        console.warn('Failed to setup realtime channel, but session join is still valid:', error);
        this.syncStatus.isConnected = false;
        this.callbacks.onSyncStatusChange?.(this.syncStatus);
      }

      this.callbacks.onSyncStatusChange?.(this.syncStatus);
      this.callbacks.onSlideChange?.(sessionData.current_slide);
      
      console.log('Joined existing session successfully:', sessionData.id);
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as any)?.message || String(error);
      console.error('joinExistingSession error:', error);
      this.callbacks.onError?.(`Failed to join existing session: ${errorMessage}`);
      return false;
    }
  }

  /**
   * End existing session and create new one
   */
  async endExistingAndCreateNew(
    existingSessionId: string,
    moduleId: string, 
    totalSlides: number, 
    sessionName?: string
  ): Promise<string | null> {
    try {
      // End the existing session
      await supabase
        .from('presentation_sessions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', existingSessionId);
      
      // Clean up participants
      await supabase
        .from('session_participants')
        .update({ is_synced: false })
        .eq('session_id', existingSessionId);
      
      console.log('Existing session ended, creating new session...');
      
      // Now create the new session (call the regular create method)
      return await this.createSession(moduleId, totalSlides, sessionName);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as any)?.message || String(error);
      console.error('endExistingAndCreateNew error:', error);
      this.callbacks.onError?.(`Failed to end existing session: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Create a course-level session that can span multiple modules (Enhanced)
   */
  async createCourseSession(
    classId: string,
    sessionName?: string
  ): Promise<string | null> {
    if (!this.userId) {
      this.callbacks.onError?.('User not authenticated');
      return null;
    }

    try {
      console.log('🎓 Creating course-level session for class:', classId);
      console.log('👤 Instructor ID:', this.userId);
      console.log('📝 Session name:', sessionName || 'Course Presentation');

      // Call the database function to create course session
      const { data, error } = await supabase.rpc('create_course_session', {
        p_class_id: classId,
        p_instructor_id: this.userId,
        p_session_name: sessionName || 'Course Presentation'
      });

      console.log('📊 Database response:', { data, error });

      if (error) {
        console.error('❌ Database function error:', error);
        throw error;
      }

      const sessionId = data;
      console.log('✅ Course session created:', sessionId);

      // Get the session data
      const { data: sessionData, error: sessionError } = await supabase
        .from('presentation_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      this.currentSession = sessionData;
      this.isInstructor = true;
      this.syncStatus = {
        ...this.syncStatus,
        isInstructor: true,
        currentSlide: 1,
        totalSlides: 1, // Will be updated when switching to first module
        sessionId: sessionData.id,
        isSync: true,
        isConnected: false // Will be set when realtime connects
      };

      // Set up realtime channel for this session
      this.setupRealtimeChannel(sessionData.id);
      this.callbacks.onSyncStatusChange?.(this.syncStatus);
      
      console.log('🎓 Course session setup complete:', sessionData.id);
      return sessionData.id;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as any)?.message || String(error);
      console.error('createCourseSession error:', error);
      this.callbacks.onError?.(`Failed to create course session: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Switch the active session to a different module within the same course
   */
  async switchToModule(
    moduleId: string,
    totalSlides: number,
    startSlide: number = 1
  ): Promise<boolean> {
    if (!this.currentSession?.id) {
      this.callbacks.onError?.('No active session to switch modules');
      return false;
    }

    if (!this.isInstructor) {
      this.callbacks.onError?.('Only instructors can switch modules');
      return false;
    }

    try {
      console.log('🔄 Switching session to module:', moduleId, 'with', totalSlides, 'slides');

      // Call the database function to switch modules
      const { data, error } = await supabase.rpc('switch_session_to_module', {
        p_session_id: this.currentSession.id,
        p_module_id: moduleId,
        p_total_slides: totalSlides,
        p_start_slide: startSlide
      });

      if (error) throw error;

      console.log('✅ Module switch successful');

      // Update local session state
      this.currentSession.current_module_id = moduleId;
      this.currentSession.module_id = moduleId; // For backward compatibility
      this.currentSession.total_slides = totalSlides;
      this.currentSession.current_slide = startSlide;

      this.syncStatus = {
        ...this.syncStatus,
        currentSlide: startSlide,
        totalSlides: totalSlides
      };

      // Notify listeners about the module switch
      this.callbacks.onSlideChange?.(startSlide);
      this.callbacks.onSyncStatusChange?.(this.syncStatus);

      console.log('🎯 Module switch completed - now presenting module:', moduleId);
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as any)?.message || String(error);
      console.error('switchToModule error:', error);
      this.callbacks.onError?.(`Failed to switch modules: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Switch the active session to a different step within the same module
   */
  async switchToStep(
    stepId: string,
    totalSlides: number,
    startSlide: number = 1
  ): Promise<boolean> {
    if (!this.currentSession?.id) {
      this.callbacks.onError?.('No active session to switch steps');
      return false;
    }

    if (!this.isInstructor) {
      this.callbacks.onError?.('Only instructors can switch steps');
      return false;
    }

    try {
      console.log('🔄 Switching session to step:', stepId, 'with', totalSlides, 'slides');

      // Get step details to validate and get module_id
      const { data: stepData, error: stepError } = await supabase
        .from('steps')
        .select('module_id, title, step_number, modules!inner(class_id)')
        .eq('id', stepId)
        .single();

      if (stepError || !stepData) {
        throw new Error(`Step not found: ${stepError?.message || 'Unknown error'}`);
      }

      console.log('📊 Step data retrieved:', stepData);

      // Verify step belongs to same class as session
      const { data: sessionData, error: sessionError } = await supabase
        .from('presentation_sessions')
        .select('class_id, module_id, current_module_id')
        .eq('id', this.currentSession.id)
        .single();

      if (sessionError || !sessionData) {
        throw new Error(`Session not found: ${sessionError?.message || 'Unknown error'}`);
      }

      const sessionClassId = sessionData.class_id;
      const stepClassId = stepData.modules.class_id;

      if (sessionClassId !== stepClassId) {
        throw new Error('Step does not belong to the same class as the session');
      }

      // Update session to point to new step
      // Note: Since current_step_id column doesn't exist yet, we'll use session_name 
      // to track the current step and trigger real-time updates
      const stepInfo = `Step ${stepData.step_number}: ${stepData.title}`;
      const { error: updateError } = await supabase
        .from('presentation_sessions')
        .update({
          // current_step_id: stepId, // Column doesn't exist yet, skip for now
          current_module_id: stepData.module_id,
          module_id: stepData.module_id, // Keep for backward compatibility
          total_slides: totalSlides,
          current_slide: startSlide,
          session_name: stepInfo, // Use session_name to track current step for now
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentSession.id);

      if (updateError) throw updateError;

      // Reset all participants to be in sync with new step
      const { error: participantsError } = await supabase
        .from('session_participants')
        .update({
          last_seen_slide: startSlide,
          is_synced: true,
          last_activity: new Date().toISOString()
        })
        .eq('session_id', this.currentSession.id);

      if (participantsError) {
        console.warn('Warning: Could not update participants sync status:', participantsError);
      }

      console.log('✅ Step switch successful');

      // Update local session state
      this.currentSession.current_step_id = stepId;
      this.currentSession.current_module_id = stepData.module_id;
      this.currentSession.module_id = stepData.module_id;
      this.currentSession.total_slides = totalSlides;
      this.currentSession.current_slide = startSlide;

      this.syncStatus = {
        ...this.syncStatus,
        currentSlide: startSlide,
        totalSlides: totalSlides
      };

      // Notify listeners about the step switch
      this.callbacks.onSlideChange?.(startSlide);
      this.callbacks.onSyncStatusChange?.(this.syncStatus);

      console.log('🎯 Step switch completed - now presenting step:', stepId);
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as any)?.message || String(error);
      console.error('switchToStep error:', error);
      this.callbacks.onError?.(`Failed to switch steps: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Get the current module being presented in the session
   */
  async getCurrentSessionModule(): Promise<{
    moduleId: string;
    moduleTitle: string;
    stepNumber: number;
    totalSlides: number;
    currentSlide: number;
  } | null> {
    if (!this.currentSession?.id) {
      return null;
    }

    try {
      const { data, error } = await supabase.rpc('get_session_current_module', {
        p_session_id: this.currentSession.id
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const moduleInfo = data[0];
        return {
          moduleId: moduleInfo.module_id,
          moduleTitle: moduleInfo.module_title,
          stepNumber: moduleInfo.step_number,
          totalSlides: moduleInfo.total_slides,
          currentSlide: moduleInfo.current_slide
        };
      }

      return null;
    } catch (error) {
      console.error('getCurrentSessionModule error:', error);
      return null;
    }
  }

  /**
   * Find and join active course session for a class (Student helper)
   */
  async findAndJoinActiveCourseSession(classId: string): Promise<boolean> {
    try {
      console.log('🔍 findAndJoinActiveCourseSession called for class:', classId);
      
      const { data: sessions, error: sessionError } = await supabase
        .from('presentation_sessions')
        .select('*')
        .eq('class_id', classId)
        .eq('is_active', true);

      console.log('📊 Active course sessions found:', sessions);
      console.log('❌ Session query error:', sessionError);

      if (!sessions || sessions.length === 0) {
        console.log('❌ No active course sessions found for class');
        return false; // No active session found
      }

      console.log('🎯 Attempting to join course session:', sessions[0].id);
      const joinResult = await this.joinSession(sessions[0].id);
      console.log('🔗 Join course session result:', joinResult);
      
      return joinResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as any)?.message || String(error);
      console.error('findAndJoinActiveCourseSession error:', error);
      this.callbacks.onError?.(`Failed to find active course session: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Join an existing presentation session (Student)
   */
  async joinSession(sessionId: string): Promise<boolean> {
    if (!this.userId) {
      this.callbacks.onError?.('User not authenticated');
      return false;
    }

    try {
      console.log('🎯 joinSession called for sessionId:', sessionId);
      console.log('👤 Student user ID:', this.userId);

      // Get session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('presentation_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('is_active', true)
        .single();

      console.log('📊 Session data retrieved:', sessionData);
      console.log('❌ Session query error:', sessionError);

      if (sessionError) throw sessionError;
      if (!sessionData) {
        this.callbacks.onError?.('Session not found or not active');
        return false;
      }

      // For course sessions, get class_id differently
      let classId = sessionData.class_id;
      if (!classId && sessionData.module_id) {
        console.log('🔍 Course session without class_id, getting from module...');
        const { data: moduleData } = await supabase
          .from('modules')
          .select('class_id')
          .eq('id', sessionData.module_id)
          .single();
        
        classId = moduleData?.class_id;
        console.log('📊 Retrieved class_id from module:', classId);
      }

      if (!classId) {
        console.log('❌ Could not determine class_id for session');
        this.callbacks.onError?.('Unable to determine class for session');
        return false;
      }

             // Check if student is enrolled in the class
       const { data: enrollmentData, error: enrollmentError } = await supabase
         .from('enrollments')
         .select('id')
         .eq('class_id', classId)
         .eq('user_id', this.userId)
         .single();

      console.log('📊 Enrollment check:', { enrollmentData, enrollmentError });

      if (enrollmentError || !enrollmentData) {
        this.callbacks.onError?.('You are not enrolled in this class');
        return false;
      }

      // Add/update participant record with enhanced logging
      console.log('📝 Creating/updating participant record...');
      const participantUpsertData = {
        session_id: sessionId,
        student_id: this.userId,
        is_synced: true, // ⭐ CRITICAL: Students start in sync mode
        last_seen_slide: sessionData.current_slide,
        last_activity: new Date().toISOString()
      };
      console.log('📊 Participant upsert data:', participantUpsertData);

      const { data: participantData, error: participantError } = await supabase
        .from('session_participants')
        .upsert(participantUpsertData, {
          onConflict: 'session_id,student_id'
        })
        .select()
        .single();

      console.log('📊 Participant upsert result:', { participantData, participantError });
      if (participantError) throw participantError;

      this.currentParticipant = participantData;
      this.currentSession = sessionData;
      this.isInstructor = false; // ⭐ CRITICAL: Set instructor flag
      
      // ⭐ CRITICAL: Set initial sync status correctly
      this.syncStatus = {
        ...this.syncStatus,
        isInstructor: false,
        currentSlide: sessionData.current_slide,
        totalSlides: sessionData.total_slides,
        sessionId: sessionData.id,
        isSync: true, // ⭐ Students start in sync mode
        isConnected: false // Will be set by realtime subscription callback
      };

      console.log('✅ Initial sync status set:', this.syncStatus);
      console.log('👤 Participant record created:', this.currentParticipant);

      // Set up realtime channel AFTER setting all state
      console.log('📡 Setting up real-time channel...');
      this.setupRealtimeChannel(sessionId);

      // Notify callbacks
      this.callbacks.onSyncStatusChange?.(this.syncStatus);
      this.callbacks.onSlideChange?.(sessionData.current_slide);
      
      console.log('✅ joinSession completed successfully for student');
      console.log('📊 Final state:', {
        isInstructor: this.isInstructor,
        isSync: this.syncStatus.isSync,
        currentSlide: this.syncStatus.currentSlide,
        sessionId: this.syncStatus.sessionId
      });
      
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as any)?.message || String(error);
      console.error('❌ joinSession error:', error);
      this.callbacks.onError?.(`Failed to join session: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Find and join active session for a module (Student helper)
   */
  async findAndJoinActiveSession(moduleId: string): Promise<boolean> {
    try {
      console.log('🔍 findAndJoinActiveSession called for module:', moduleId);
      
      // Step 1: Look for module-specific sessions first
      const { data: moduleSessions, error: moduleSessionError } = await supabase
        .from('presentation_sessions')
        .select('*')
        .eq('module_id', moduleId)
        .eq('is_active', true);

      console.log('📊 Module-specific sessions found:', moduleSessions);
      console.log('❌ Module session query error:', moduleSessionError);

      if (moduleSessions && moduleSessions.length > 0) {
        console.log('🎯 Found module session, attempting to join:', moduleSessions[0].id);
        const joinResult = await this.joinSession(moduleSessions[0].id);
        console.log('🔗 Module session join result:', joinResult);
        return joinResult;
      }

      // Step 2: No module sessions found, look for course-level sessions
      console.log('❌ No module-specific sessions found, checking for course-level sessions...');
      
      // First, get the class_id for this module
      const { data: moduleData, error: moduleError } = await supabase
        .from('modules')
        .select('class_id')
        .eq('id', moduleId)
        .single();

      if (moduleError || !moduleData) {
        console.log('❌ Failed to get class_id for module:', moduleError);
        return false;
      }

      console.log('🏫 Module belongs to class:', moduleData.class_id);

      // Now look for active course-level sessions for this class
      const { data: courseSessions, error: courseSessionError } = await supabase
        .from('presentation_sessions')
        .select('*')
        .eq('class_id', moduleData.class_id)
        .eq('is_active', true)
        .is('module_id', null); // Course sessions have module_id = NULL

      console.log('📊 Course-level sessions found:', courseSessions);
      console.log('❌ Course session query error:', courseSessionError);

      if (!courseSessions || courseSessions.length === 0) {
        console.log('❌ No active course sessions found for class');
        return false;
      }

      console.log('🎯 Found course session, attempting to join:', courseSessions[0].id);
      const joinResult = await this.joinSession(courseSessions[0].id);
      console.log('🔗 Course session join result:', joinResult);
      
      return joinResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as any)?.message || String(error);
      console.error('findAndJoinActiveSession error:', error);
      this.callbacks.onError?.(`Failed to find active session: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Set up realtime channel for session updates
   */
  private async setupRealtimeChannel(sessionId: string): Promise<void> {
    console.log('🔗 setupRealtimeChannel called for sessionId:', sessionId);
    console.log('👤 Current user state:', {
      isInstructor: this.isInstructor,
      userId: this.userId,
      sessionId: this.currentSession?.id
    });
    
    // Remove existing channel if any
    if (this.channel) {
      console.log('🗑️ Removing existing channel');
      await supabase.removeChannel(this.channel);
    }

    console.log('📡 Creating new realtime channel for session:', sessionId);
    this.channel = supabase
      .channel(`presentation_session_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'presentation_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          console.log('📡 Realtime session update received:', payload);
          console.log('🔍 Payload details:', {
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
            timestamp: new Date().toISOString()
          });
          this.handleSessionUpdate(payload.new as PresentationSession);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('📡 Realtime participant update received:', payload);
          this.handleParticipantUpdate(payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        console.log('🔍 Subscription details:', {
          status,
          sessionId,
          channelName: `presentation_session_${sessionId}`,
          timestamp: new Date().toISOString(),
          isInstructor: this.isInstructor,
          userId: this.userId
        });
        const isConnected = status === 'SUBSCRIBED';
        this.syncStatus.isConnected = isConnected;
        console.log('🔗 Setting isConnected to:', isConnected);
        this.callbacks.onSyncStatusChange?.(this.syncStatus);
        
        if (isConnected) {
          console.log('✅ Real-time channel successfully connected!');
        } else {
          console.log('❌ Real-time channel connection failed or disconnected');
        }
      });

    console.log('✅ Realtime channel setup complete');
    
    // For instructors, refresh participant list immediately after setting up realtime
    if (this.isInstructor) {
      console.log('👨‍🏫 Instructor detected - refreshing participant list immediately');
      await this.refreshParticipantList();
    }
  }

  /**
   * Handle session updates from realtime
   */
  private handleSessionUpdate(session: PresentationSession): void {
    console.log('🔄 handleSessionUpdate called with session:', session);
    console.log('📊 Session details:', {
      sessionId: session.id,
      isActive: session.is_active,
      currentSlide: session.current_slide,
      totalSlides: session.total_slides,
      moduleId: session.module_id,
      classId: session.class_id,
      currentModuleId: session.current_module_id,
      instructorId: session.instructor_id,
      sessionName: session.session_name // Add session_name to logging
    });
    console.log('👤 Current user state:', {
      isInstructor: this.isInstructor,
      userId: this.userId,
      isSync: this.syncStatus.isSync,
      isConnected: this.syncStatus.isConnected,
      currentParticipant: !!this.currentParticipant
    });
    console.log('📊 Previous sync status:', this.syncStatus);
    
    if (!session.is_active) {
      console.log('❌ Session is not active, ending session');
      // Session ended
      this.callbacks.onSessionEnd?.();
      this.disconnect();
      return;
    }

    // Check for module switch in course sessions (for students)
    const previousModuleId = this.currentSession?.module_id || this.currentSession?.current_module_id;
    const newModuleId = session.module_id || session.current_module_id;
    
    const hasModuleSwitched = !this.isInstructor && 
                             previousModuleId && 
                             newModuleId && 
                             previousModuleId !== newModuleId;

    if (hasModuleSwitched) {
      console.log('🔄 Module switch detected!');
      console.log('  - Previous module:', previousModuleId);
      console.log('  - New module:', newModuleId);
      console.log('  - New slide:', session.current_slide);
      
      // Update session reference first
      this.currentSession = session;
      this.syncStatus.currentSlide = session.current_slide;
      this.syncStatus.totalSlides = session.total_slides;
      
      // Notify student about module switch so they can navigate to new step
      if (this.callbacks.onModuleSwitch) {
        console.log('✅ Calling onModuleSwitch to navigate student to new module');
        this.callbacks.onModuleSwitch(newModuleId, session.current_slide);
      } else {
        console.log('⚠️ No onModuleSwitch callback available');
      }
      
      // Update sync status
      this.callbacks.onSyncStatusChange?.(this.syncStatus);
      return; // Exit early since we're handling the module switch
    }

    // Check for step switch within the same module (for students)
    // Since current_step_id doesn't exist yet, we'll detect step changes through session_name
    const previousSessionName = this.currentSession?.session_name;
    const newSessionName = session.session_name;

    console.log('🔍 Step switch detection check:', {
      isInstructor: this.isInstructor,
      previousSessionName,
      newSessionName,
      sessionNameChanged: previousSessionName !== newSessionName,
      includesStep: newSessionName?.includes('Step '),
      allConditionsMet: !this.isInstructor &&
                       previousSessionName &&
                       newSessionName &&
                       previousSessionName !== newSessionName &&
                       newSessionName?.includes('Step ')
    });

    const hasStepSwitched = !this.isInstructor &&
                             previousSessionName &&
                             newSessionName &&
                             previousSessionName !== newSessionName &&
                             newSessionName?.includes('Step '); // Only consider step-related session names

    if (hasStepSwitched) {
      console.log('🔄 Step switch detected via session_name!');
      console.log('  - Previous session name:', previousSessionName);
      console.log('  - New session name:', newSessionName);
      console.log('  - New slide:', session.current_slide);
      
      // Extract step number from session name (e.g., "Step 1: Introduction" -> 1)
      const stepMatch = newSessionName?.match(/Step (\d+):/);
      if (stepMatch) {
        const stepNumber = parseInt(stepMatch[1]);
        console.log('  - Detected step number:', stepNumber);
        
        // Update session reference first
        this.currentSession = session;
        this.syncStatus.currentSlide = session.current_slide;
        this.syncStatus.totalSlides = session.total_slides;
        
        // For now, we'll use the session_name to trigger navigation
        // In a real implementation, we'd need to map step numbers to step IDs
        // For the demo, we'll just trigger the step switch callback with the session name
        if (this.callbacks.onStepSwitch) {
          console.log('✅ Calling onStepSwitch to navigate student to new step');
          this.callbacks.onStepSwitch(newSessionName, session.current_slide);
        } else {
          console.log('⚠️ No onStepSwitch callback available');
        }
        
        // Update sync status
        this.callbacks.onSyncStatusChange?.(this.syncStatus);
        return; // Exit early since we're handling the step switch
      }
    }

    this.currentSession = session;
    this.syncStatus.currentSlide = session.current_slide;
    this.syncStatus.totalSlides = session.total_slides;

    console.log('📊 Updated syncStatus.currentSlide to:', session.current_slide);

    // Call onSlideChange for instructors and students in sync mode
    if (this.isInstructor) {
      console.log('✅ Instructor receiving slide change from realtime, calling onSlideChange with slide:', session.current_slide);
      this.callbacks.onSlideChange?.(session.current_slide);
    } else if (this.syncStatus.isSync) {
      console.log('✅ Student in sync mode, calling onSlideChange with slide:', session.current_slide);
      this.callbacks.onSlideChange?.(session.current_slide);
      
      // Update participant's last seen slide
      if (this.currentParticipant) {
        console.log('📝 Updating participant last seen slide to:', session.current_slide);
        this.updateParticipantSlide(session.current_slide);
      } else {
        console.log('⚠️ Student has no currentParticipant record - cannot update last seen slide');
      }
    } else {
      console.log('❌ Not calling onSlideChange - conditions not met:');
      console.log('  - isInstructor:', this.isInstructor);
      console.log('  - isSync:', this.syncStatus.isSync);
      console.log('  - Student should be in sync mode but is not');
    }

    console.log('🔄 Calling onSyncStatusChange with updated status:', this.syncStatus);
    this.callbacks.onSyncStatusChange?.(this.syncStatus);
  }

  /**
   * Handle participant updates from realtime
   */
  private handleParticipantUpdate(payload: any): void {
    console.log('📡 handleParticipantUpdate called with payload:', payload);
    // Refresh participant list for instructors
    if (this.isInstructor) {
      this.refreshParticipantList();
    }
  }

  /**
   * Navigate to specific slide (Instructor only)
   */
  async navigateToSlide(slideNumber: number): Promise<boolean> {
    console.log('🎯 navigateToSlide called with slide:', slideNumber);
    console.log('📊 Current session ID:', this.currentSession?.id);
    
    // More robust instructor check
    if (!this.currentSession) {
      console.log('❌ No active session');
      this.callbacks.onError?.('No active session');
      return false;
    }

    // Check if current user is the instructor of this session
    const { data: { user } } = await supabase.auth.getUser();
    console.log('👤 Current user ID:', user?.id);
    console.log('🏫 Session instructor ID:', this.currentSession.instructor_id);
    
    if (!user || user.id !== this.currentSession.instructor_id) {
      console.log('❌ User is not the session instructor');
      this.callbacks.onError?.('Only instructors can control slides');
      return false;
    }

    if (slideNumber < 1 || slideNumber > this.currentSession.total_slides) {
      console.log('❌ Invalid slide number:', slideNumber, 'total:', this.currentSession.total_slides);
      this.callbacks.onError?.('Invalid slide number');
      return false;
    }

    try {
      console.log('📝 Updating database with slide:', slideNumber, 'for session:', this.currentSession.id);
      const { error } = await supabase
        .from('presentation_sessions')
        .update({ 
          current_slide: slideNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.currentSession.id);

      console.log('📊 Database update result - error:', error);
      if (error) throw error;

      // Update local state
      this.currentSession.current_slide = slideNumber;
      this.syncStatus.currentSlide = slideNumber;
      console.log('✅ Updated local state to slide:', slideNumber);
      console.log('🔄 Calling onSlideChange and onSyncStatusChange callbacks');
      this.callbacks.onSlideChange?.(slideNumber);
      this.callbacks.onSyncStatusChange?.(this.syncStatus);

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as any)?.message || String(error);
      console.error('navigateToSlide error:', error);
      this.callbacks.onError?.(`Failed to navigate to slide: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Toggle sync mode for students
   */
  async toggleSync(): Promise<boolean> {
    if (this.isInstructor) {
      this.callbacks.onError?.('Instructors are always in sync mode');
      return false;
    }

    if (!this.currentParticipant) {
      this.callbacks.onError?.('Not participating in a session');
      return false;
    }

    try {
      const newSyncStatus = !this.syncStatus.isSync;
      
      const { error } = await supabase
        .from('session_participants')
        .update({ is_synced: newSyncStatus })
        .eq('id', this.currentParticipant.id);

      if (error) throw error;

      this.syncStatus.isSync = newSyncStatus;
      this.currentParticipant.is_synced = newSyncStatus;

      // If re-enabling sync, jump to current session slide
      if (newSyncStatus && this.currentSession) {
        this.callbacks.onSlideChange?.(this.currentSession.current_slide);
        this.updateParticipantSlide(this.currentSession.current_slide);
      }

      this.callbacks.onSyncStatusChange?.(this.syncStatus);
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as any)?.message || String(error);
      console.error('toggleSync error:', error);
      this.callbacks.onError?.(`Failed to toggle sync: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Update participant's last seen slide
   */
  private async updateParticipantSlide(slideNumber: number): Promise<void> {
    if (!this.currentParticipant) return;

    try {
      await supabase
        .from('session_participants')
        .update({ last_seen_slide: slideNumber })
        .eq('id', this.currentParticipant.id);
    } catch (error) {
      console.warn('Failed to update participant slide:', error);
    }
  }

  /**
   * Refresh participant list (Instructor only)
   */
  private async refreshParticipantList(): Promise<void> {
    console.log('🔄 refreshParticipantList called - isInstructor:', this.isInstructor, 'currentSession:', !!this.currentSession);
    
    if (!this.isInstructor || !this.currentSession) {
      console.log('❌ Skipping participant refresh - not instructor or no session');
      return;
    }

    try {
      console.log('📊 Querying session_participants for session:', this.currentSession.id);
      const { data: participants, error } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', this.currentSession.id);

      console.log('📊 Raw participants data:', participants);
      console.log('❌ Participants query error:', error);

      this.participants = participants || [];
      this.syncStatus.participantCount = this.participants.length;
      
      console.log('✅ Updated participant count to:', this.participants.length);
      console.log('📊 Participant list:', this.participants.map(p => ({ 
        student_id: p.student_id, 
        last_seen_slide: p.last_seen_slide, 
        is_synced: p.is_synced 
      })));
      
      this.callbacks.onParticipantUpdate?.(this.participants);
      this.callbacks.onSyncStatusChange?.(this.syncStatus);
      
      console.log('🔄 Called onParticipantUpdate and onSyncStatusChange callbacks');
    } catch (error) {
      console.error('❌ Failed to refresh participant list:', error);
    }
  }

  /**
   * End the presentation session (Instructor only)
   */
  async endSession(): Promise<boolean> {
    if (!this.currentSession) {
      this.callbacks.onError?.('No active session to end');
      return false;
    }

    try {
      // Verify current user is the instructor of this session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== this.currentSession.instructor_id) {
        this.callbacks.onError?.('Only instructors can end sessions');
        return false;
      }

      const { error } = await supabase
        .from('presentation_sessions')
        .update({ is_active: false })
        .eq('id', this.currentSession.id);

      if (error) throw error;

      this.disconnect();
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as any)?.message || String(error);
      console.error('endSession error:', error);
      this.callbacks.onError?.(`Failed to end session: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Leave the session (Student only)
   */
  async leaveSession(): Promise<boolean> {
    if (this.isInstructor) {
      this.callbacks.onError?.('Instructors should end the session instead');
      return false;
    }

    if (!this.currentParticipant) {
      this.callbacks.onError?.('Not participating in a session');
      return false;
    }

    try {
      await supabase
        .from('session_participants')
        .delete()
        .eq('id', this.currentParticipant.id);

      this.disconnect();
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as any)?.message || String(error);
      console.error('leaveSession error:', error);
      this.callbacks.onError?.(`Failed to leave session: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Disconnect from the session
   */
  async disconnect(): Promise<void> {
    if (this.channel) {
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }

    this.currentSession = null;
    this.currentParticipant = null;
    this.participants = [];
    this.syncStatus = {
      isInstructor: false,
      isConnected: false,
      isSync: false,
      currentSlide: 1,
      totalSlides: 0,
      participantCount: 0
    };

    this.callbacks.onSyncStatusChange?.(this.syncStatus);
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Get debug information for troubleshooting
   */
  getDebugInfo() {
    return {
      hasCurrentSession: !!this.currentSession,
      currentSessionId: this.currentSession?.id,
      isInstructor: this.isInstructor,
      userId: this.userId,
      currentSession: this.currentSession,
      currentParticipant: this.currentParticipant,
      syncStatus: this.syncStatus,
      isChannelConnected: this.channel?.state === 'joined',
      channelState: this.channel?.state,
      participantCount: this.participants.length,
      participants: this.participants
    };
  }

  /**
   * Comprehensive diagnostic check for sync issues
   */
  async diagnoseSyncIssues(): Promise<{
    status: string;
    issues: string[];
    recommendations: string[];
    details: any;
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const details: any = {};

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    details.user = user;
    if (!user) {
      issues.push('User not authenticated');
      recommendations.push('Ensure user is logged in');
    }

    // Check session existence
    details.currentSession = this.currentSession;
    if (!this.currentSession) {
      issues.push('No active session');
      recommendations.push('Join a session first');
    }

    // Check real-time connection
    details.channelState = this.channel?.state;
    details.isConnected = this.syncStatus.isConnected;
    if (!this.syncStatus.isConnected) {
      issues.push('Real-time channel not connected');
      recommendations.push('Check internet connection and Supabase real-time status');
    }

    // Check sync status for students
    if (!this.isInstructor) {
      details.isSync = this.syncStatus.isSync;
      details.currentParticipant = this.currentParticipant;
      
      if (!this.syncStatus.isSync) {
        issues.push('Student sync mode disabled');
        recommendations.push('Enable sync mode or manually catch up to instructor');
      }
      
      if (!this.currentParticipant) {
        issues.push('Student not registered as participant');
        recommendations.push('Re-join the session');
      }
    }

    // Check session activity
    if (this.currentSession && !this.currentSession.is_active) {
      issues.push('Session is not active');
      recommendations.push('Session may have ended');
    }

    const status = issues.length === 0 ? 'healthy' : 'issues_detected';
    
    return {
      status,
      issues,
      recommendations,
      details: {
        ...details,
        debugInfo: this.getDebugInfo(),
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Force sync status refresh for troubleshooting
   */
  async forceSyncRefresh(): Promise<boolean> {
    console.log('🔄 forceSyncRefresh called for troubleshooting');
    
    if (!this.currentSession) {
      console.log('❌ No active session to refresh');
      return false;
    }

    try {
      // Re-fetch session data from database
      const { data: sessionData, error } = await supabase
        .from('presentation_sessions')
        .select('*')
        .eq('id', this.currentSession.id)
        .single();

      if (error) throw error;
      if (!sessionData) {
        console.log('❌ Session not found in database');
        return false;
      }

      console.log('📊 Fresh session data from database:', sessionData);
      
      // Update local state
      this.handleSessionUpdate(sessionData);
      
      // For students, also refresh participant data
      if (!this.isInstructor && this.userId) {
        const { data: participantData } = await supabase
          .from('session_participants')
          .select('*')
          .eq('session_id', this.currentSession.id)
          .eq('student_id', this.userId)
          .single();
          
        if (participantData) {
          console.log('📊 Fresh participant data:', participantData);
          this.currentParticipant = participantData;
          this.syncStatus.isSync = participantData.is_synced;
        }
      }

      return true;
    } catch (error) {
      console.error('❌ forceSyncRefresh error:', error);
      return false;
    }
  }

  /**
   * Get current participants (Instructor only)
   */
  getParticipants(): SessionParticipant[] {
    return [...this.participants];
  }

  /**
   * Check if user is instructor for a specific module
   */
  async isModuleInstructor(moduleId: string): Promise<boolean> {
    console.log('🔍 SyncManager isModuleInstructor check - userId:', this.userId, 'moduleId:', moduleId);
    
    if (!this.userId) {
      console.log('❌ No userId available');
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('modules')
        .select('classes!inner(instructor_id)')
        .eq('id', moduleId)
        .single();

      console.log('📊 Module instructor query result:', data);
      console.log('❌ Module instructor query error:', error);

      const isInstructor = data?.classes?.instructor_id === this.userId;
      console.log('👤 Final instructor check result:', isInstructor);
      console.log('📝 Instructor ID from DB:', data?.classes?.instructor_id);
      console.log('📝 Current user ID:', this.userId);
      
      return isInstructor;
    } catch (error) {
      console.error('❌ isModuleInstructor error:', error);
      return false;
    }
  }
} 