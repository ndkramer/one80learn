import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { Database } from '../types/database';

// Type definitions for presentation sync
export interface PresentationSession {
  id: string;
  module_id: string;
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
   * Join an existing presentation session (Student)
   */
  async joinSession(sessionId: string): Promise<boolean> {
    console.log('🔗 joinSession called with sessionId:', sessionId, 'userId:', this.userId);
    
    if (!this.userId) {
      console.log('❌ User not authenticated');
      this.callbacks.onError?.('User not authenticated');
      return false;
    }

    try {
      // Get session details and verify student enrollment
      console.log('📊 Fetching session data...');
      const { data: sessionData, error: sessionError } = await supabase
        .from('presentation_sessions')
        .select(`
          *,
          modules!inner(
            class_id,
            classes!inner(id)
          )
        `)
        .eq('id', sessionId)
        .eq('is_active', true)
        .single();

      console.log('📊 Session data received:', sessionData);
      console.log('❌ Session query error:', sessionError);

      if (!sessionData) {
        console.log('❌ No session data found');
        this.callbacks.onError?.('Session not found or not active');
        return false;
      }

      // Verify student enrollment
      console.log('👨‍🎓 Checking student enrollment for class:', sessionData.modules.class_id);
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', this.userId)
        .eq('class_id', sessionData.modules.class_id)
        .eq('status', 'active')
        .single();

      console.log('📊 Enrollment data:', enrollmentData);
      console.log('❌ Enrollment error:', enrollmentError);

      if (!enrollmentData) {
        console.log('❌ User not enrolled in class');
        this.callbacks.onError?.('You are not enrolled in this class');
        return false;
      }

      this.currentSession = sessionData;
      this.isInstructor = false;

      // Add/update participant record
      const { data: participantData, error: participantError } = await supabase
        .from('session_participants')
        .upsert({
          session_id: sessionId,
          student_id: this.userId,
          is_synced: true,
          last_seen_slide: sessionData.current_slide,
          last_activity: new Date().toISOString()
        }, {
          onConflict: 'session_id,student_id'
        })
        .select()
        .single();

      if (participantError) throw participantError;

      this.currentParticipant = participantData;
      this.syncStatus = {
        ...this.syncStatus,
        isInstructor: false,
        currentSlide: sessionData.current_slide,
        totalSlides: sessionData.total_slides,
        sessionId: sessionData.id,
        isSync: true,
        isConnected: false // Will be set by realtime subscription callback
      };

      // Set up realtime channel
      this.setupRealtimeChannel(sessionId);

      this.callbacks.onSyncStatusChange?.(this.syncStatus);
      this.callbacks.onSlideChange?.(sessionData.current_slide);
      
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (error as any)?.message || String(error);
      console.error('joinSession error:', error);
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
      
      const { data: sessions, error: sessionError } = await supabase
        .from('presentation_sessions')
        .select('*')
        .eq('module_id', moduleId)
        .eq('is_active', true);

      console.log('📊 Active sessions found:', sessions);
      console.log('❌ Session query error:', sessionError);

      if (!sessions || sessions.length === 0) {
        console.log('❌ No active sessions found for module');
        return false; // No active session found
      }

      console.log('🎯 Attempting to join session:', sessions[0].id);
      const joinResult = await this.joinSession(sessions[0].id);
      console.log('🔗 Join session result:', joinResult);
      
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
        const isConnected = status === 'SUBSCRIBED';
        this.syncStatus.isConnected = isConnected;
        console.log('🔗 Setting isConnected to:', isConnected);
        this.callbacks.onSyncStatusChange?.(this.syncStatus);
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
    console.log('📊 Session is_active:', session.is_active, 'current_slide:', session.current_slide);
    console.log('👤 Current user - isInstructor:', this.isInstructor, 'isSync:', this.syncStatus.isSync);
    
    if (!session.is_active) {
      console.log('❌ Session is not active, ending session');
      // Session ended
      this.callbacks.onSessionEnd?.();
      this.disconnect();
      return;
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
      }
    } else {
      console.log('❌ Not calling onSlideChange - isInstructor:', this.isInstructor, 'isSync:', this.syncStatus.isSync);
    }

    console.log('🔄 Calling onSyncStatusChange with status:', this.syncStatus);
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
   * Get detailed debug info about current state
   */
  getDebugInfo() {
    return {
      hasCurrentSession: !!this.currentSession,
      currentSessionId: this.currentSession?.id,
      isInstructor: this.isInstructor,
      userId: this.userId,
      isConnected: this.syncStatus.isConnected,
      channelExists: !!this.channel,
      syncStatus: this.syncStatus
    };
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