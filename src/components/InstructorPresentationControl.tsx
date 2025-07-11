import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Square, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Eye, 
  EyeOff,
  Wifi,
  WifiOff,
  Settings,
  Activity,
  Clock,
  AlertCircle
} from 'lucide-react';
import { 
  PresentationSyncManager, 
  SyncStatus, 
  SessionParticipant,
  PresentationSyncCallbacks 
} from '../utils/presentationSyncManager';
import { supabase } from '../utils/supabase';
import Alert from './Alert';
import Button from './Button';

interface InstructorPresentationControlProps {
  moduleId: string;
  classId: string; // Added for course-level sessions
  totalSlides: number;
  currentSlide: number;
  onSlideChange: (slide: number) => void;
  presentationTitle?: string;
  stepNumber?: number; // Added to show current step
  currentStepId?: string; // Added to know which step is currently active
  onModuleSwitch?: (newModuleId: string) => void; // Callback when switching modules
  onStepSwitch?: (stepId: string) => void; // Callback when switching steps within same module
}

interface ParticipantWithStatus extends SessionParticipant {
  isUpToDate: boolean;
  name?: string;
  email?: string;
}

const InstructorPresentationControl: React.FC<InstructorPresentationControlProps> = ({
  moduleId,
  classId,
  totalSlides,
  currentSlide,
  onSlideChange,
  presentationTitle,
  stepNumber,
  currentStepId,
  onModuleSwitch,
  onStepSwitch
}) => {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [syncManager] = useState(() => new PresentationSyncManager());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isInstructor: false,
    isConnected: false,
    isSync: false,
    currentSlide: 1,
    totalSlides: 0,
    participantCount: 0
  });
  const [participants, setParticipants] = useState<ParticipantWithStatus[]>([]);
  const [sessionName, setSessionName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout>();
  
  // Course session state
  const [isCourseSession, setIsCourseSession] = useState(false);
  const [availableModules, setAvailableModules] = useState<any[]>([]);
  const [currentSessionModule, setCurrentSessionModule] = useState<string | null>(null);
  const [dropdownValue, setDropdownValue] = useState<string>('');
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  
  // Session conflict modal state
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<{
    existingSession: any;
    isOwnSession: boolean;
    moduleId: string;
    totalSlides: number;
    sessionName: string;
  } | null>(null);

  // Stable callback functions to prevent sync manager state loss
  const handleSlideChange = useCallback((slide: number) => {
    onSlideChange(slide);
  }, [onSlideChange]);

  const handleSyncStatusChange = useCallback((status: SyncStatus) => {
    setSyncStatus(status);
    if (status.isConnected && status.sessionId && !sessionStartTime) {
      setSessionStartTime(new Date());
    }
  }, [sessionStartTime, syncStatus]);

  const handleParticipantUpdate = useCallback(async (participantList: SessionParticipant[]) => {
    console.log('🔄 handleParticipantUpdate called with participant list:', participantList);
    console.log('📊 Current syncStatus.currentSlide:', syncStatus.currentSlide);
    console.log('📊 Current currentSlide prop:', currentSlide);
    
    // Get the most up-to-date current slide from sync manager
    const currentSyncStatus = syncManager.getSyncStatus();
    console.log('📊 SyncManager currentSlide:', currentSyncStatus.currentSlide);
    
    // Use the most reliable source for current slide comparison
    const instructorCurrentSlide = currentSyncStatus.currentSlide || syncStatus.currentSlide || currentSlide;
    console.log('📊 Using slide for comparison:', instructorCurrentSlide);
    
    // Enhance participant data with user info and sync status
    const enhancedParticipants: ParticipantWithStatus[] = await Promise.all(
      participantList.map(async (participant) => {
        const isUpToDate = participant.last_seen_slide === instructorCurrentSlide;
        console.log(`👤 Participant ${participant.student_id.slice(-4)}: last_seen=${participant.last_seen_slide}, instructor=${instructorCurrentSlide}, upToDate=${isUpToDate}`);
        
        // In a real implementation, you'd fetch user details here
        // For now, we'll use placeholder data
        return {
          ...participant,
          isUpToDate,
          name: `Student ${participant.student_id.slice(-4)}`,
          email: `student-${participant.student_id.slice(-4)}@example.com`
        };
      })
    );
    
    console.log('✅ Enhanced participants:', enhancedParticipants.map(p => ({ 
      id: p.student_id.slice(-4), 
      lastSlide: p.last_seen_slide, 
      isUpToDate: p.isUpToDate 
    })));
    
    setParticipants(enhancedParticipants);
  }, [syncStatus.currentSlide, currentSlide]);

  const handleSessionEnd = useCallback(() => {
    setIsSessionActive(false);
    setSessionStartTime(null);
    setParticipants([]);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  const handleError = useCallback((errorMsg: string) => {
    setError(errorMsg);
  }, []);

  // Initialize sync manager ONCE - critical to avoid callback reassignment
  useEffect(() => {
    const initializeSync = async () => {
      const success = await syncManager.initialize();
      if (!success) {
        setError('Failed to initialize sync manager');
        return;
      }

      // Set up callbacks ONCE and never reassign them
      const callbacks: PresentationSyncCallbacks = {
        onSlideChange: handleSlideChange,
        onSyncStatusChange: handleSyncStatusChange,
        onParticipantUpdate: handleParticipantUpdate,
        onSessionEnd: handleSessionEnd,
        onError: handleError
      };

      // Set callbacks only once to preserve sync manager state
      syncManager.callbacks = callbacks;
      
      // Check for existing instructor sessions for this module
      try {
        console.log('🔍 Checking for existing instructor sessions for module:', moduleId);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: existingSessions } = await supabase
            .from('presentation_sessions')
            .select('*')
            .eq('module_id', moduleId)
            .eq('instructor_id', user.id)
            .eq('is_active', true);

          if (existingSessions && existingSessions.length > 0) {
            const session = existingSessions[0];
            console.log('✅ Found existing instructor session:', session.id, 'at slide:', session.current_slide, 'name:', session.session_name);
            
            // Set session name from database
            setSessionName(session.session_name || 'Presentation Session');
            
            // Auto-rejoin the existing session
            const joinSuccess = await syncManager.joinExistingSession(session.id);
            if (joinSuccess) {
              setIsSessionActive(true);
              setSessionStartTime(new Date());
              
              // Sync PDF to current slide with multiple attempts for reliability
              const syncPDF = (attempt = 1) => {
                console.log(`🔄 Auto-rejoined session - syncing PDF to slide: ${session.current_slide} (attempt ${attempt})`);
                
                // Ensure we have a valid slide number
                const targetSlide = session.current_slide || 1;
                
                // Call onSlideChange to trigger PDF navigation
                onSlideChange(targetSlide);
                
                // Verify sync worked by checking again after a longer delay to allow PDF viewer to respond
                if (attempt < 4) { // Increased to 4 attempts
                  setTimeout(() => {
                    // Check if we're still trying to sync to the same slide
                    console.log('🔍 Auto-rejoin sync verification attempt', attempt + 1);
                    console.log('📊 Target slide:', targetSlide, 'Expected sync after delay');
                    
                    // Try again if we haven't reached max attempts
                    if (attempt < 3) {
                      console.log('⚠️ PDF auto-rejoin sync retry...');
                      syncPDF(attempt + 1);
                    } else {
                      console.log('ℹ️ Final auto-rejoin sync attempt completed');
                    }
                  }, 600 * attempt); // Increasing delays: 600ms, 1200ms, 1800ms
                }
              };
              
              // Wait for PDF viewer to be ready before syncing
              setTimeout(() => {
                console.log('🎯 Starting auto-rejoin PDF sync after initialization delay');
                syncPDF();
              }, 800); // Increased initial delay to ensure PDF viewer is ready
            }
          } else {
            console.log('❌ No existing instructor sessions found for this module');
          }
        }
      } catch (error) {
        console.error('Error checking for existing sessions:', error);
      }
      
      // Force status updates to ensure UI stays in sync
      setTimeout(() => {
        const currentStatus = syncManager.getSyncStatus();
        handleSyncStatusChange(currentStatus);
      }, 1000);
      
      setTimeout(() => {
        const currentStatus = syncManager.getSyncStatus();
        handleSyncStatusChange(currentStatus);
      }, 3000);
    };

    initializeSync();

    return () => {
      syncManager.disconnect();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []); // Remove all dependencies to prevent callback reassignment

  // Load available modules for course sessions
  const loadAvailableModules = useCallback(async () => {
    if (!classId) {
      console.log('❌ No classId provided to loadAvailableModules');
      return;
    }
    
    setIsLoadingModules(true);
    try {
      console.log('🔍 Loading modules for class:', classId);

      // First, let's check what's in the modules table for this class
      const { data: moduleCheck, error: moduleError } = await supabase
        .from('modules')
        .select('id, title, class_id')
        .eq('class_id', classId);
      
      console.log('📋 Modules in class:', moduleCheck);
      console.log('❌ Module query error:', moduleError);

      // Check what's in the steps table for this class
      if (moduleCheck && moduleCheck.length > 0) {
        const moduleIds = moduleCheck.map(m => m.id);
        const { data: stepsCheck, error: stepsError } = await supabase
          .from('steps')
          .select('id, step_number, title, slide_pdf_url, module_id')
          .in('module_id', moduleIds)
          .order('step_number');
        
        console.log('📋 Raw steps data:', stepsCheck);
        console.log('❌ Steps query error:', stepsError);
      }

      // Now try the steps query - include both PDF and video steps
      const { data: steps, error } = await supabase
        .from('steps')
        .select(`
          id,
          step_number,
          title,
          slide_pdf_url,
          video_url,
          content_type,
          module_id,
          modules!inner(
            id,
            title,
            class_id
          )
        `)
        .eq('modules.class_id', classId)
        .in('content_type', ['pdf', 'video'])
        .order('step_number');

      console.log('📊 Database response:', { steps, error });

      if (error) throw error;

      // Create entries for each individual step (not grouped by module)
      const allSteps = steps?.map(step => ({
        id: step.id, // Use step ID, not module ID
        moduleId: step.module_id, // Keep module ID for reference
        title: step.modules.title,
        stepNumber: step.step_number,
        stepTitle: step.title,
        contentType: step.content_type,
        hasPdf: !!step.slide_pdf_url,
        hasVideo: !!step.video_url,
        // For compatibility with existing code, add steps array with just this step
        steps: [{
          id: step.id,
          stepNumber: step.step_number,
          title: step.title,
          contentType: step.content_type,
          hasPdf: !!step.slide_pdf_url,
          hasVideo: !!step.video_url
        }]
      })) || [];

      // Deduplicate steps by step_number and title combination
      const seenSteps = new Map();
      const processedModules = allSteps.filter(step => {
        const key = `${step.stepNumber}-${step.stepTitle}`;
        if (seenSteps.has(key)) {
          console.log(`🔄 Removing duplicate step: Step ${step.stepNumber}: ${step.stepTitle} (ID: ${step.id})`);
          return false;
        }
        seenSteps.set(key, true);
        return true;
      });

      // Sort by step number to show sequential steps
      processedModules.sort((a, b) => a.stepNumber - b.stepNumber);

      setAvailableModules(processedModules);
      console.log('📚 Loaded available steps for course session:', processedModules);
      console.log('📊 Step breakdown:', processedModules.map(step => ({
        stepNumber: step.stepNumber,
        stepTitle: step.stepTitle,
        stepId: step.id,
        moduleId: step.moduleId,
        moduleTitle: step.title
      })));
    } catch (error) {
      console.error('❌ Failed to load modules:', error);
      setError(`Failed to load course modules: ${error.message}`);
    } finally {
      setIsLoadingModules(false);
    }
  }, [classId]);

  // Load modules when classId becomes available
  useEffect(() => {
    if (classId) {
      loadAvailableModules();
    }
  }, [classId, loadAvailableModules]);

  // Update dropdown value when moduleId or availableModules change
  useEffect(() => {
    console.log('🔄 useEffect triggered for dropdown value update:', {
      availableModulesLength: availableModules.length,
      moduleId,
      currentSessionModule,
      currentStepId,
      currentDropdownValue: dropdownValue
    });
    
    if (availableModules.length > 0) {
      const moduleIdToUse = currentSessionModule || moduleId;
      
      // First, try to find the current step by ID if provided
      let currentStep = null;
      if (currentStepId) {
        currentStep = availableModules.find(step => step.id === currentStepId);
        console.log('🔄 Looking for currentStepId:', currentStepId, 'found:', currentStep);
      }
      
      // If not found by ID, fall back to finding by module ID (first step of module)
      if (!currentStep) {
        currentStep = availableModules.find(step => step.moduleId === moduleIdToUse);
        console.log('🔄 Falling back to first step of module:', moduleIdToUse, 'found:', currentStep);
      }
      
      const newValue = currentStep ? currentStep.id : '';
      
      console.log('🔄 Dropdown value calculation details:', {
        moduleIdToUse,
        currentStepId,
        currentStep: currentStep ? {
          id: currentStep.id,
          stepNumber: currentStep.stepNumber,
          stepTitle: currentStep.stepTitle,
          moduleId: currentStep.moduleId
        } : null,
        oldValue: dropdownValue,
        newValue,
        willUpdate: newValue !== dropdownValue,
        allAvailableSteps: availableModules.map(step => ({
          id: step.id,
          stepNumber: step.stepNumber,
          stepTitle: step.stepTitle,
          moduleId: step.moduleId
        }))
      });
      
      console.log('🔄 DETAILED STEP ANALYSIS:');
      availableModules.forEach(step => {
        console.log(`  Step ${step.stepNumber}: ${step.stepTitle} (ID: ${step.id}, Module: ${step.moduleId})`);
      });
      console.log(`🔄 Current step search - stepId: ${currentStepId}, moduleId: ${moduleIdToUse}`);
      console.log(`🔄 Selected step ID will be: ${newValue}`);
      
      if (newValue !== dropdownValue) {
        console.log('🔄 Setting dropdown value from', dropdownValue, 'to', newValue);
        setDropdownValue(newValue);
      } else {
        console.log('🔄 Dropdown value unchanged:', dropdownValue);
      }
    } else {
      console.log('🔄 No available modules, skipping dropdown update');
    }
  }, [moduleId, currentSessionModule, currentStepId, availableModules]);

  // Start presentation session (enhanced for course sessions)
  const startSession = async () => {
    if (!sessionName.trim()) {
      setError('Please enter a session name');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('🚀 Starting course session with:', { classId, sessionName: sessionName.trim() });
      
      // Create course-level session
      const sessionId = await syncManager.createCourseSession(
        classId,
        sessionName.trim()
      );

      console.log('📋 Course session creation result:', sessionId);

      if (sessionId) {
        setIsSessionActive(true);
        setIsCourseSession(true);
        setSessionStartTime(new Date());
        
        // Switch to current module to start presentation
        const switchSuccess = await syncManager.switchToModule(moduleId, totalSlides, 1);
        if (switchSuccess) {
          setCurrentSessionModule(moduleId);
          
          // Ensure PDF starts at slide 1 for new session
          setTimeout(() => {
            console.log('🔄 Instructor started course session - ensuring PDF at slide 1');
            onSlideChange(1);
          }, 500);
        } else {
          setError('Session created but failed to start with current module');
        }
      } else {
        setError('Failed to create course session. Please try refreshing the page.');
      }
    } catch (error) {
      console.error('Course session creation error:', error);
      setError(`Failed to start course session: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Switch to a different step within the active course session
  const switchToModule = async (newStepId: string) => {
    console.log('🚀 switchToModule called with stepId:', newStepId);
    console.log('📊 Current session state:', { isSessionActive, isCourseSession });
    
    if (!isSessionActive || !isCourseSession) {
      const errorMsg = 'No active course session to switch steps';
      console.log('❌', errorMsg);
      setError(errorMsg);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get step info to determine the actual module ID
      const stepInfo = availableModules.find(m => m.id === newStepId);
      console.log('🔍 Found step info:', stepInfo);
      
      if (!stepInfo) {
        const errorMsg = 'Selected step not found';
        console.log('❌', errorMsg);
        setError(errorMsg);
        return;
      }

      // Use the moduleId from the step info
      const actualModuleId = stepInfo.moduleId;
      console.log('🔄 Switching to step:', newStepId, 'which belongs to module:', actualModuleId);
      console.log('📊 Step details:', {
        stepNumber: stepInfo.stepNumber,
        stepTitle: stepInfo.stepTitle,
        moduleId: actualModuleId
      });

      // For now, we'll assume same slide count - in production you'd fetch this
      console.log('🔧 Calling syncManager.switchToModule with:', { actualModuleId, totalSlides });
      const switchSuccess = await syncManager.switchToModule(actualModuleId, totalSlides, 1);
      console.log('📊 syncManager.switchToModule result:', switchSuccess);
      
      if (switchSuccess) {
        console.log('✅ Switch successful - updating session state');
        setCurrentSessionModule(actualModuleId);
        
        // Notify parent component about module switch
        if (onModuleSwitch) {
          console.log('🔄 Calling onModuleSwitch with:', actualModuleId);
          onModuleSwitch(actualModuleId);
        } else {
          console.log('⚠️ onModuleSwitch callback not provided');
        }
        
        // Reset to slide 1 for new module
        setTimeout(() => {
          console.log('🔄 Switched to new step/module - resetting to slide 1');
          onSlideChange(1);
        }, 500);
      } else {
        const errorMsg = 'Failed to switch to selected step';
        console.log('❌', errorMsg);
        setError(errorMsg);
      }
    } catch (error) {
      console.error('Step switch error:', error);
      setError(`Failed to switch steps: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // End presentation session
  const endSession = async () => {
    setIsLoading(true);
    
    try {
      await syncManager.endSession();
      setIsSessionActive(false);
      setIsCourseSession(false);
      setCurrentSessionModule(null);
      setSessionStartTime(null);
      setParticipants([]);
      setSessionName(''); // Clear session name when ending
      // Don't reset currentStepId - keep it for non-session navigation
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    } catch (error) {
      setError(`Failed to end session: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to specific slide
  const navigateToSlide = async (slideNumber: number) => {
    if (slideNumber < 1 || slideNumber > totalSlides) return;
    
    if (isSessionActive) {
      await syncManager.navigateToSlide(slideNumber);
    } else {
      onSlideChange(slideNumber);
    }
  };

  // Quick navigation functions
  const goToPrevSlide = () => navigateToSlide(Math.max(currentSlide - 1, 1));
  const goToNextSlide = () => navigateToSlide(Math.min(currentSlide + 1, totalSlides));
  const goToFirstSlide = () => navigateToSlide(1);
  const goToLastSlide = () => navigateToSlide(totalSlides);

  // Handle conflict modal actions
  const handleJoinExistingSession = async () => {
    if (!conflictInfo) return;
    
    setIsLoading(true);
    setShowConflictModal(false);
    setError(null);

    try {
      const success = await syncManager.joinExistingSession(conflictInfo.existingSession.id);
      
      if (success) {
        setIsSessionActive(true);
        setSessionStartTime(new Date());
        
        // Set session name from conflict info
        setSessionName(conflictInfo.existingSession.session_name || 'Presentation Session');
        
        // Ensure PDF syncs to current slide after joining with retry logic
        const syncPDF = (attempt = 1) => {
          const currentStatus = syncManager.getSyncStatus();
          const targetSlide = conflictInfo.existingSession.current_slide || currentStatus.currentSlide;
          console.log(`🔄 Manual join - syncing PDF to slide: ${targetSlide} (attempt ${attempt})`);
          
          // Call onSlideChange to trigger PDF navigation
          onSlideChange(targetSlide);
          
          // Verify sync worked by checking again after a longer delay to allow PDF viewer to respond
          if (attempt < 4) { // Increased to 4 attempts
            setTimeout(() => {
              console.log('🔍 Manual join sync verification attempt', attempt + 1);
              console.log('📊 Target slide:', targetSlide, 'Expected sync after delay');
              
              // Try again if we haven't reached max attempts
              if (attempt < 3) {
                console.log('⚠️ PDF manual join sync retry...');
                syncPDF(attempt + 1);
              } else {
                console.log('ℹ️ Final manual join sync attempt completed');
              }
            }, 600 * attempt); // Increasing delays: 600ms, 1200ms, 1800ms
          }
        };
        
        // Wait for PDF viewer to be ready before syncing
        setTimeout(() => {
          console.log('🎯 Starting manual join PDF sync after initialization delay');
          syncPDF();
        }, 800); // Increased initial delay to ensure PDF viewer is ready
      } else {
        setError('Failed to join existing session');
      }
    } catch (error) {
      console.error('Join session error:', error);
      setError(`Failed to join session: ${error}`);
    } finally {
      setIsLoading(false);
      setConflictInfo(null);
    }
  };

  const handleCloseCurrentSession = async () => {
    if (!conflictInfo) return;
    
    setIsLoading(true);
    setShowConflictModal(false);
    setError(null);

    try {
      const sessionId = await syncManager.endExistingAndCreateNew(
        conflictInfo.existingSession.id,
        conflictInfo.moduleId,
        conflictInfo.totalSlides,
        conflictInfo.sessionName
      );
      
      if (sessionId) {
        setIsSessionActive(true);
        setSessionStartTime(new Date());
        
        // Set session name for the new session
        setSessionName(conflictInfo.sessionName);
        
        // Ensure PDF starts at slide 1 for new session
        setTimeout(() => {
          console.log('🔄 Instructor created new session - resetting PDF to slide 1');
          onSlideChange(1);
        }, 500);
      } else {
        setError('Failed to create new session');
      }
    } catch (error) {
      console.error('Close and create session error:', error);
      setError(`Failed to create session: ${error}`);
    } finally {
      setIsLoading(false);
      setConflictInfo(null);
    }
  };

  const handleCancelConflictModal = () => {
    setShowConflictModal(false);
    setConflictInfo(null);
  };

  // Auto-advance functionality
  const startAutoAdvance = (intervalSeconds: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setAutoAdvanceTimer(intervalSeconds);
    
    timerRef.current = setInterval(() => {
      if (currentSlide < totalSlides) {
        navigateToSlide(currentSlide + 1);
      } else {
        // Stop auto-advance at the last slide
        stopAutoAdvance();
      }
    }, intervalSeconds * 1000);
  };

  const stopAutoAdvance = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
    setAutoAdvanceTimer(null);
  };

  // Calculate session duration
  const getSessionDuration = (): string => {
    if (!sessionStartTime) return '00:00';
    
    const now = new Date();
    const diffMs = now.getTime() - sessionStartTime.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get sync status summary
  const getSyncSummary = () => {
    const syncedCount = participants.filter(p => p.isUpToDate).length;
    const totalCount = participants.length;
    
    return {
      syncedCount,
      totalCount,
      syncPercentage: totalCount > 0 ? Math.round((syncedCount / totalCount) * 100) : 0
    };
  };

  const { syncedCount, totalCount, syncPercentage } = getSyncSummary();

  return (
    <>
      {/* Session Conflict Modal */}
      {showConflictModal && conflictInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-amber-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Session Already Running</h3>
                <p className="mt-2 text-sm text-gray-500">
                  {conflictInfo.isOwnSession ? (
                    <>You already have an active session "{conflictInfo.existingSession.session_name}" running for this module.</>
                  ) : (
                    <>Another instructor has an active session "{conflictInfo.existingSession.session_name}" running for this module.</>
                  )}
                </p>
              </div>
            </div>
            
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              {conflictInfo.isOwnSession ? (
                <>
                  <button
                    type="button"
                    className="flex-1 inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-[#F98B3D] border border-transparent rounded-md hover:bg-[#e07a2c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F98B3D]"
                    onClick={handleJoinExistingSession}
                    disabled={isLoading}
                  >
                    Join Running Session
                  </button>
                  <button
                    type="button"
                    className="flex-1 inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F98B3D]"
                    onClick={handleCloseCurrentSession}
                    disabled={isLoading}
                  >
                    Close Current Session
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="flex-1 inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F98B3D]"
                  onClick={handleCancelConflictModal}
                >
                  OK
                </button>
              )}
              
              {conflictInfo.isOwnSession && (
                <button
                  type="button"
                  className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F98B3D]"
                  onClick={handleCancelConflictModal}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Instructor Control Panel</h3>
            {presentationTitle && (
              <p className="text-sm text-gray-600">{presentationTitle}</p>
            )}
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            {syncStatus.isConnected ? (
              <div className="flex items-center text-green-600">
                <Wifi size={16} className="mr-1" />
                <span className="text-sm font-medium">Connected</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <WifiOff size={16} className="mr-1" />
                <span className="text-sm font-medium">Disconnected</span>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4">
          <Alert type="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </div>
      )}

      {/* Session Management */}
      {!isSessionActive ? (
        <div className="p-4 border-b border-gray-200">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Name
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="Enter session name (e.g., 'Module 1 - Introduction')"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-[#F98B3D] focus:border-transparent"
                  disabled={isLoading}
                />
                
                <Button
                  onClick={startSession}
                  disabled={isLoading || !sessionName.trim()}
                  variant="primary"
                  size="sm"
                >
                  <Play size={16} className="mr-2" />
                  {isLoading ? 'Starting...' : 'Start Presentation'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-green-600">
                <Activity size={16} className="mr-1" />
                <span className="font-medium">
                  {sessionName || 'Session'} Active
                  {isCourseSession && stepNumber && (
                    <span className="ml-2 text-sm text-gray-600">
                      (Step {stepNumber})
                    </span>
                  )}
                </span>
              </div>
              
              {sessionStartTime && (
                <div className="flex items-center text-gray-600">
                  <Clock size={16} className="mr-1" />
                  <span className="text-sm">{getSessionDuration()}</span>
                </div>
              )}
            </div>

            <Button
              onClick={endSession}
              disabled={isLoading}
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <Square size={16} className="mr-2" />
              End Course Session
            </Button>
          </div>
        </div>
      )}

      {/* Slide Navigation */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">Slide Navigation</h4>
          <div className="text-sm text-gray-600">
            {currentSlide} / {totalSlides}
          </div>
        </div>

        {/* Main Navigation Controls */}
        <div className="flex items-center space-x-2 mb-3">
          <Button
            onClick={goToFirstSlide}
            disabled={currentSlide === 1 || isLoading}
            variant="outline"
            size="sm"
          >
            ⏮
          </Button>
          
          <Button
            onClick={goToPrevSlide}
            disabled={currentSlide === 1 || isLoading}
            variant="outline"
            size="sm"
          >
            <ChevronLeft size={16} />
          </Button>

          <div className="flex-1 px-3 py-2 bg-gray-50 rounded text-center font-medium">
            Slide {currentSlide}
          </div>

          <Button
            onClick={goToNextSlide}
            disabled={currentSlide === totalSlides || isLoading}
            variant="outline"
            size="sm"
          >
            <ChevronRight size={16} />
          </Button>
          
          <Button
            onClick={goToLastSlide}
            disabled={currentSlide === totalSlides || isLoading}
            variant="outline"
            size="sm"
          >
            ⏭
          </Button>
        </div>

        {/* Step Navigation Controls */}
        {availableModules.length > 1 && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Jump to page:</label>
                <input
                  type="number"
                  min="1"
                  max={totalSlides}
                  placeholder={`1-${totalSlides}`}
                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-[#F98B3D] focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const targetSlide = parseInt(e.target.value);
                      if (targetSlide >= 1 && targetSlide <= totalSlides) {
                        onSlideChange(targetSlide);
                        e.target.value = '';
                      }
                    }
                  }}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">Step Navigation</span>
                <select
                  value={dropdownValue}
                  onChange={async (e) => {
                    console.log('🎯🎯🎯 DROPDOWN onChange TRIGGERED! 🎯🎯🎯');
                    console.log('🎯 Event details:', {
                      eventType: e.type,
                      targetValue: e.target.value,
                      targetTagName: e.target.tagName,
                      currentDropdownValue: dropdownValue,
                      timestamp: new Date().toISOString()
                    });
                    
                    const selectedStepId = e.target.value;
                    
                    // Update the dropdown value state immediately
                    setDropdownValue(selectedStepId);
                    
                    // Find the selected step
                    const selectedStep = availableModules.find(step => step.id === selectedStepId);
                    console.log('🎯 Selected step:', selectedStep);
                    
                    if (selectedStep) {
                      console.log('✅ Step selected - switching to:', selectedStep.moduleId);
                      
                      // Check if the selected step belongs to the same module
                      const isSameModule = selectedStep.moduleId === moduleId;
                      console.log('🔄 Same module check:', {
                        selectedStepModuleId: selectedStep.moduleId,
                        currentModuleId: moduleId,
                        isSameModule,
                        contentType: selectedStep.contentType
                      });
                      
                      if (isSameModule && isSessionActive) {
                        // Same module and session active - handle based on content type
                        if (selectedStep.contentType === 'video') {
                          // For video steps, just switch step without slide synchronization
                          console.log('🔄 Video step selected - switching without slide sync');
                          const switchSuccess = await syncManager.switchToStep(selectedStepId, 1, 1);
                          
                          if (switchSuccess) {
                            console.log('✅ Video step switch successful');
                            if (onStepSwitch) {
                              console.log('🔄 Calling onStepSwitch for video step UI update');
                              onStepSwitch(selectedStepId);
                            }
                          } else {
                            console.log('❌ Video step switch failed');
                            setError('Failed to switch to selected video step');
                          }
                        } else {
                          // For PDF steps, use normal slide synchronization
                          console.log('🔄 Using syncManager.switchToStep for PDF step navigation');
                          const switchSuccess = await syncManager.switchToStep(selectedStepId, totalSlides, 1);
                          
                          if (switchSuccess) {
                            console.log('✅ PDF step switch successful');
                            if (onStepSwitch) {
                              console.log('🔄 Calling onStepSwitch for PDF step UI update');
                              onStepSwitch(selectedStepId);
                            }
                          } else {
                            console.log('❌ PDF step switch failed');
                            setError('Failed to switch to selected PDF step');
                          }
                        }
                      } else if (isSameModule && onStepSwitch) {
                        // Same module but no session - use step navigation callback
                        console.log('🔄 Using onStepSwitch for same module navigation (no session)');
                        onStepSwitch(selectedStepId);
                      } else if (onModuleSwitch) {
                        // Different module - use module navigation
                        console.log('🔄 Using onModuleSwitch for different module navigation');
                        onModuleSwitch(selectedStep.moduleId);
                      } else {
                        console.log('❌ No navigation handler available');
                      }
                    }
                  }}
                  onFocus={() => {
                    console.log('🎯🔍 DROPDOWN onFocus TRIGGERED! 🔍🎯');
                  }}
                  onBlur={() => {
                    console.log('🎯🔍 DROPDOWN onBlur TRIGGERED! 🔍🎯');
                  }}
                  onMouseDown={() => {
                    console.log('🎯🖱️ DROPDOWN onMouseDown TRIGGERED! 🖱️🎯');
                  }}
                  onMouseUp={() => {
                    console.log('🎯🖱️ DROPDOWN onMouseUp TRIGGERED! 🖱️🎯');
                  }}
                  className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-[#F98B3D] focus:border-transparent"
                >
                  {availableModules.map((step) => (
                    <option key={step.id} value={step.id}>
                      Step {step.stepNumber}: {step.stepTitle} {step.contentType === 'video' ? '(Video)' : '(PDF)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Video Step Notice */}
            {availableModules.length > 0 && dropdownValue && (
              (() => {
                const selectedStep = availableModules.find(step => step.id === dropdownValue);
                if (selectedStep && selectedStep.contentType === 'video') {
                  return (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <div className="text-blue-600 mt-0.5">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-900">Video Step Selected</p>
                          <p className="text-xs text-blue-700 mt-1">
                            This step contains a video. Slide synchronization is not available for video content.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()
            )}
          </div>
        )}

        {/* Slide Jump - when no step navigation available */}
        {availableModules.length <= 1 && (
          <div className="flex items-center space-x-2 mb-3">
            <label className="text-sm text-gray-600">Jump to page:</label>
            <input
              type="number"
              min="1"
              max={totalSlides}
              placeholder={`1-${totalSlides}`}
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-[#F98B3D] focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const slideNum = parseInt((e.target as HTMLInputElement).value);
                  if (slideNum >= 1 && slideNum <= totalSlides) {
                    navigateToSlide(slideNum);
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
            />
          </div>
        )}

        {/* Auto-advance Controls */}
        {isSessionActive && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Auto-advance:</span>
              <div className="flex items-center space-x-2">
                {autoAdvanceTimer ? (
                  <Button
                    onClick={stopAutoAdvance}
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                  >
                    Stop ({autoAdvanceTimer}s)
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => startAutoAdvance(30)}
                      variant="outline"
                      size="sm"
                    >
                      30s
                    </Button>
                    <Button
                      onClick={() => startAutoAdvance(60)}
                      variant="outline"
                      size="sm"
                    >
                      1m
                    </Button>
                    <Button
                      onClick={() => startAutoAdvance(120)}
                      variant="outline"
                      size="sm"
                    >
                      2m
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Session Stats */}
      {isSessionActive && (
        <div className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-[#F98B3D]">{totalCount}</div>
              <div className="text-xs text-gray-600">Participants</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">{syncedCount}</div>
              <div className="text-xs text-gray-600">In Sync</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-600">{syncPercentage}%</div>
              <div className="text-xs text-gray-600">Sync Rate</div>
            </div>
          </div>
        </div>
      )}

      {/* Participants Section */}
      {isSessionActive && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 flex items-center">
              <Users size={16} className="mr-2" />
              Participants ({totalCount})
            </h4>
            <Button
              onClick={() => setShowParticipants(!showParticipants)}
              variant="ghost"
              size="sm"
            >
              {showParticipants ? <EyeOff size={16} /> : <Eye size={16} />}
            </Button>
          </div>

          {showParticipants && (
            <div className="space-y-2">
              {participants.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <Users size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No participants yet</p>
                  <p className="text-xs">Students will appear here when they join the session</p>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className={`flex items-center justify-between p-2 rounded-lg border ${
                        participant.isUpToDate
                          ? 'bg-green-50 border-green-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            participant.isUpToDate ? 'bg-green-500' : 'bg-yellow-500'
                          }`}
                        />
                        <div>
                          <div className="text-sm font-medium">
                            {participant.name || 'Student'}
                          </div>
                          <div className="text-xs text-gray-500">
                            Last seen: Slide {participant.last_seen_slide}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1">
                        {participant.is_synced ? (
                          <div className="text-green-600" title="Synced">
                            <Wifi size={14} />
                          </div>
                        ) : (
                          <div className="text-yellow-600" title="Not synced">
                            <AlertCircle size={14} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
};

export default InstructorPresentationControl; 