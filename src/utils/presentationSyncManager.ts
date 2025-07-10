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
        .select('id')
        .eq('module_id', moduleId)
        .eq('is_active', true);

      if (existingSessions && existingSessions.length > 0) {
        this.callbacks.onError?.('An active session already exists for this module');
        return null;
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
        isSync: true
      };

      // Set up realtime channel for this session
      await this.setupRealtimeChannel(sessionData.id);

      this.callbacks.onSyncStatusChange?.(this.syncStatus);
      return sessionData.id;

    } catch (error) {
      this.callbacks.onError?.(`Failed to create session: ${error}`);
      return null;
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
      // Get session details and verify student enrollment
      const { data: sessionData } = await supabase
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

      if (!sessionData) {
        this.callbacks.onError?.('Session not found or not active');
        return false;
      }

      // Verify student enrollment
      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', this.userId)
        .eq('class_id', sessionData.modules.class_id)
        .eq('status', 'active')
        .single();

      if (!enrollmentData) {
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
          last_seen_slide: sessionData.current_slide
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
        isConnected: true
      };

      // Set up realtime channel
      await this.setupRealtimeChannel(sessionId);

      this.callbacks.onSyncStatusChange?.(this.syncStatus);
      this.callbacks.onSlideChange?.(sessionData.current_slide);
      
      return true;

    } catch (error) {
      this.callbacks.onError?.(`Failed to join session: ${error}`);
      return false;
    }
  }

  /**
   * Find and join active session for a module (Student helper)
   */
  async findAndJoinActiveSession(moduleId: string): Promise<boolean> {
    try {
      const { data: sessions } = await supabase
        .from('presentation_sessions')
        .select('id')
        .eq('module_id', moduleId)
        .eq('is_active', true);

      if (!sessions || sessions.length === 0) {
        return false; // No active session found
      }

      return await this.joinSession(sessions[0].id);
    } catch (error) {
      this.callbacks.onError?.(`Failed to find active session: ${error}`);
      return false;
    }
  }

  /**
   * Set up realtime channel for session updates
   */
  private async setupRealtimeChannel(sessionId: string): Promise<void> {
    // Remove existing channel if any
    if (this.channel) {
      await supabase.removeChannel(this.channel);
    }

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
          this.handleParticipantUpdate(payload);
        }
      )
      .subscribe((status) => {
        this.syncStatus.isConnected = status === 'SUBSCRIBED';
        this.callbacks.onSyncStatusChange?.(this.syncStatus);
      });
  }

  /**
   * Handle session updates from realtime
   */
  private handleSessionUpdate(session: PresentationSession): void {
    if (!session.is_active) {
      // Session ended
      this.callbacks.onSessionEnd?.();
      this.disconnect();
      return;
    }

    this.currentSession = session;
    this.syncStatus.currentSlide = session.current_slide;
    this.syncStatus.totalSlides = session.total_slides;

    // Only sync slide changes for students who are in sync mode
    if (!this.isInstructor && this.syncStatus.isSync) {
      this.callbacks.onSlideChange?.(session.current_slide);
      
      // Update participant's last seen slide
      if (this.currentParticipant) {
        this.updateParticipantSlide(session.current_slide);
      }
    }

    this.callbacks.onSyncStatusChange?.(this.syncStatus);
  }

  /**
   * Handle participant updates from realtime
   */
  private handleParticipantUpdate(payload: any): void {
    // Refresh participant list for instructors
    if (this.isInstructor) {
      this.refreshParticipantList();
    }
  }

  /**
   * Navigate to specific slide (Instructor only)
   */
  async navigateToSlide(slideNumber: number): Promise<boolean> {
    if (!this.isInstructor || !this.currentSession) {
      this.callbacks.onError?.('Only instructors can control slides');
      return false;
    }

    if (slideNumber < 1 || slideNumber > this.currentSession.total_slides) {
      this.callbacks.onError?.('Invalid slide number');
      return false;
    }

    try {
      const { error } = await supabase
        .from('presentation_sessions')
        .update({ current_slide: slideNumber })
        .eq('id', this.currentSession.id);

      if (error) throw error;

      // Update local state
      this.syncStatus.currentSlide = slideNumber;
      this.callbacks.onSlideChange?.(slideNumber);
      this.callbacks.onSyncStatusChange?.(this.syncStatus);

      return true;
    } catch (error) {
      this.callbacks.onError?.(`Failed to navigate to slide: ${error}`);
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
      this.callbacks.onError?.(`Failed to toggle sync: ${error}`);
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
    if (!this.isInstructor || !this.currentSession) return;

    try {
      const { data: participants } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', this.currentSession.id);

      this.participants = participants || [];
      this.syncStatus.participantCount = this.participants.length;
      
      this.callbacks.onParticipantUpdate?.(this.participants);
      this.callbacks.onSyncStatusChange?.(this.syncStatus);
    } catch (error) {
      console.warn('Failed to refresh participant list:', error);
    }
  }

  /**
   * End the presentation session (Instructor only)
   */
  async endSession(): Promise<boolean> {
    if (!this.isInstructor || !this.currentSession) {
      this.callbacks.onError?.('Only instructors can end sessions');
      return false;
    }

    try {
      const { error } = await supabase
        .from('presentation_sessions')
        .update({ is_active: false })
        .eq('id', this.currentSession.id);

      if (error) throw error;

      this.disconnect();
      return true;

    } catch (error) {
      this.callbacks.onError?.(`Failed to end session: ${error}`);
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
      this.callbacks.onError?.(`Failed to leave session: ${error}`);
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
   * Get current participants (Instructor only)
   */
  getParticipants(): SessionParticipant[] {
    return [...this.participants];
  }

  /**
   * Check if user is instructor for a specific module
   */
  async isModuleInstructor(moduleId: string): Promise<boolean> {
    if (!this.userId) return false;

    try {
      const { data } = await supabase
        .from('modules')
        .select('classes!inner(instructor_id)')
        .eq('id', moduleId)
        .single();

      return data?.classes?.instructor_id === this.userId;
    } catch {
      return false;
    }
  }
} 