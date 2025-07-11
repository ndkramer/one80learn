import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, Circle, FileText as NotesIcon, ArrowLeft, ArrowRight, Play, Pause, Info } from 'lucide-react';
import { Step, StepNote, StepCompletion } from '../types';
import { useAuth } from '../utils/authContext';
import { isModuleInstructor } from '../utils/instructorAuth';
import SlideViewer from './SlideViewer';
import SyncedSlideViewer from './SyncedSlideViewer';
import YouTubePlayer from './YouTubePlayer';
import InstructorPresentationControl from './InstructorPresentationControl';
import RichTextEditor from './RichTextEditor';
import Button from './Button';
import Alert from './Alert';
import LoadingSpinner from './LoadingSpinner';
import { supabase } from '../utils/supabase';
import { 
  PresentationSyncManager, 
  SyncStatus, 
  PresentationSyncCallbacks 
} from '../utils/presentationSyncManager';

interface StepViewerProps {
  step: Step;
  moduleId: string;
  classId: string; // Added for course-level sessions
  isCurrentStep: boolean;
  isCompleted: boolean;
  supportsSync?: boolean;
  onStepComplete: (stepId: string, completed: boolean) => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onStepSwitch?: (stepId: string) => void; // Added for step navigation within same module
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
  className?: string;
}

export const StepViewer: React.FC<StepViewerProps> = ({
  step,
  moduleId,
  classId,
  isCurrentStep,
  isCompleted,
  supportsSync = false,
  onStepComplete,
  onNavigate,
  onStepSwitch,
  canNavigatePrev,
  canNavigateNext,
  className = ''
}) => {
  const { user } = useAuth();
  const [noteContent, setNoteContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [initialNoteContent, setInitialNoteContent] = useState('');
  const [isNotesCollapsed, setIsNotesCollapsed] = useState(true);
  const [isMarking, setIsMarking] = useState(false);
  
  // Instructor presentation controls
  const [isInstructor, setIsInstructor] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(0);
  const [isCheckingInstructor, setIsCheckingInstructor] = useState(true);

  // Session management for video steps
  const [sessionManager] = useState(() => new PresentationSyncManager());
  const [sessionStatus, setSessionStatus] = useState<SyncStatus>({
    isInstructor: false,
    isConnected: false,
    isSync: false,
    currentSlide: 1,
    totalSlides: 0,
    participantCount: 0
  });
  const [sessionJoinAttempted, setSessionJoinAttempted] = useState(false);

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

  // Load step notes on mount and when step changes
  useEffect(() => {
    if (step.note) {
      setNoteContent(step.note.content);
      setInitialNoteContent(step.note.content);
    } else {
      setNoteContent('');
      setInitialNoteContent('');
    }
    setHasUnsavedChanges(false);
    setSaveStatus('idle');
    setNoteError(null);
    
    // Reset session state when step changes
    setSessionJoinAttempted(false);
    setSessionStatus({
      isInstructor: false,
      isConnected: false,
      isSync: false,
      currentSlide: 1,
      totalSlides: 0,
      participantCount: 0
    });
  }, [step.id]);

  // Initialize session management for video steps
  useEffect(() => {
    if (step.content_type === 'video' && supportsSync && !sessionJoinAttempted && !isInstructor) {
      console.log('🎥 Initializing session management for video step:', step.title);
      
      const initializeSessionForVideo = async () => {
        try {
          const success = await sessionManager.initialize();
          if (success) {
            // Set up callbacks for session management
            sessionManager.callbacks = {
              onSyncStatusChange: (status) => {
                console.log('📊 Video step session status changed:', status);
                setSessionStatus(status);
              },
              onStepSwitch: (stepId, startSlide) => {
                console.log('🔄 Video step switch callback:', stepId);
                if (onStepSwitch) {
                  onStepSwitch(stepId);
                }
              },
              onError: (error) => {
                console.error('❌ Video step session error:', error);
                setError(error);
              }
            };

            // Attempt to join active session
            let joined = await sessionManager.findAndJoinActiveSession(moduleId);
            if (!joined) {
              // Try course-level session
              const classIdMatch = window.location.pathname.match(/\/classes\/([^\/]+)\//);
              if (classIdMatch) {
                const classId = classIdMatch[1];
                joined = await sessionManager.findAndJoinActiveCourseSession(classId);
              }
            }

            console.log('🎥 Video step session join result:', joined);
            setSessionJoinAttempted(true);
          }
        } catch (error) {
          console.error('❌ Failed to initialize video step session:', error);
          setSessionJoinAttempted(true);
        }
      };

      initializeSessionForVideo();
    }
  }, [step.content_type, supportsSync, sessionJoinAttempted, isInstructor, moduleId, sessionManager, onStepSwitch]);

  // Cleanup session manager when component unmounts or step changes
  useEffect(() => {
    return () => {
      if (step.content_type === 'video' && sessionManager) {
        console.log('🧹 Cleaning up video step session manager');
        sessionManager.disconnect();
      }
    };
  }, [step.id, sessionManager]);

  // Auto-save logic
  useEffect(() => {
    if (hasUnsavedChanges && noteContent !== initialNoteContent) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleSaveNote();
      }, 2000); // Auto-save after 2 seconds of inactivity
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [noteContent, hasUnsavedChanges, initialNoteContent]);

  // Check if user is instructor for this module
  useEffect(() => {
    const checkInstructorStatus = async () => {
      if (!user?.id || !moduleId) {
        setIsInstructor(false);
        setIsCheckingInstructor(false);
        return;
      }

      try {
        setIsCheckingInstructor(true);
        const instructorStatus = await isModuleInstructor(moduleId);
        console.log('🎯 StepViewer instructor check result:', instructorStatus);
        setIsInstructor(instructorStatus);
      } catch (error) {
        console.error('Error checking instructor status:', error);
        setIsInstructor(false);
      } finally {
        setIsCheckingInstructor(false);
      }
    };

    checkInstructorStatus();
  }, [user?.id, moduleId]);

  const handleNoteChange = (content: string) => {
    setNoteContent(content);
    setHasUnsavedChanges(content !== initialNoteContent);
    setSaveStatus('idle');
    setNoteError(null);
  };

  const handleSaveNote = async () => {
    if (!user?.id || !hasUnsavedChanges) return;

    try {
      setIsSaving(true);
      setSaveStatus('saving');
      setNoteError(null);

      // Use upsert to handle both insert and update cases
      const { data, error } = await supabase
        .from('step_notes')
        .upsert({
          step_id: step.id,
          user_id: user.id,
          content: noteContent,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,step_id'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setInitialNoteContent(noteContent);
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
      setLastSaved(new Date().toLocaleTimeString());

      // Clear saved status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (err) {
      console.error('Error saving note:', err);
      setNoteError(err instanceof Error ? err.message : 'Failed to save note');
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleComplete = async () => {
    if (!user?.id || isMarking) return;

    try {
      setIsMarking(true);
      setError(null);

      const newCompleted = !isCompleted;

      // Update step completion
      const { error } = await supabase
        .from('step_completion')
        .upsert({
          user_id: user.id,
          step_id: step.id,
          completed: newCompleted,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,step_id'
        });

      if (error) {
        throw error;
      }

      onStepComplete(step.id, newCompleted);
    } catch (err) {
      console.error('Error updating step completion:', err);
      setError(err instanceof Error ? err.message : 'Failed to update step completion');
    } finally {
      setIsMarking(false);
    }
  };

  const toggleNotesCollapse = () => {
    setIsNotesCollapsed(!isNotesCollapsed);
  };

  const getFirstLineOfNotes = (htmlContent: string): string => {
    if (!htmlContent || htmlContent.trim() === '') return '';
    
    // Remove HTML tags and get plain text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    // Get first line (up to first line break or 100 characters)
    const firstLine = plainText.split('\n')[0];
    const maxLength = 100;
    
    if (firstLine.length > maxLength) {
      return firstLine.substring(0, maxLength) + '...';
    }
    
    return firstLine;
  };

  // Handle slide changes from instructor controls
  const handleSlideChange = (slideNumber: number) => {
    console.log('🎯 StepViewer handleSlideChange called with slide:', slideNumber);
    setCurrentSlide(slideNumber);
  };

  // Handle PDF load to get total slides
  const handlePdfLoad = (numPages: number) => {
    console.log('🎯 StepViewer handlePdfLoad called with numPages:', numPages);
    setTotalSlides(numPages);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Step Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <span className="bg-[#F98B3D] text-white px-3 py-1 rounded-full text-sm font-medium mr-3">
                Step {step.stepNumber}
              </span>
              {isCurrentStep && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                  Current
                </span>
              )}
              {isCompleted && (
                <CheckCircle className="w-5 h-5 text-green-500 ml-2" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{step.title}</h1>
            <p className="text-gray-600 mb-4">{step.description}</p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Mark Complete Button */}
            <Button
              onClick={handleToggleComplete}
              variant={isCompleted ? "secondary" : "primary"}
              size="medium"
              isLoading={isMarking}
              leftIcon={isCompleted ? <CheckCircle /> : <Circle />}
              className="whitespace-nowrap"
              aria-label={isCompleted ? "Mark step as incomplete" : "Mark step as complete"}
            >
              {isCompleted ? "Completed" : "Mark Complete"}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            onClick={() => onNavigate('prev')}
            variant="outline"
            size="medium"
            disabled={!canNavigatePrev}
            leftIcon={<ArrowLeft />}
          >
            Previous Step
          </Button>

          <div className="text-sm text-gray-500">
            Step {step.stepNumber}
          </div>

          <Button
            onClick={() => onNavigate('next')}
            variant="outline"
            size="medium"
            disabled={!canNavigateNext}
            rightIcon={<ArrowRight />}
          >
            Next Step
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert
          type="error"
          title="Error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Step Content */}
      {step.content && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Content</h2>
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: step.content }}
          />
        </div>
      )}

      {/* Media Section - PDF Slides or YouTube Video */}
      {(step.slide_pdf_url || step.video_url) && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-md overflow-hidden min-h-[600px]">
            {step.content_type === 'pdf' && step.slide_pdf_url ? (
              // PDF Slides - Use sync viewer if sync is supported
              supportsSync ? (
                <SyncedSlideViewer
                  title={`Slides for ${step.title}`}
                  moduleId={moduleId}
                  pdfUrl={step.slide_pdf_url}
                  currentSlide={currentSlide}
                  onPdfLoad={handlePdfLoad}
                  onStepSwitch={onStepSwitch}
                />
              ) : (
                <SlideViewer
                  title={`Slides for ${step.title}`}
                  pdfUrl={step.slide_pdf_url}
                  currentSlide={currentSlide}
                  onPdfLoad={handlePdfLoad}
                />
              )
            ) : step.content_type === 'video' && step.video_url ? (
              // YouTube Video - Always show video directly (no sync needed for video content)
              <div className="p-6">
                <div className="space-y-4">
                  {supportsSync && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                        <Info size={16} />
                        <span>Video content is not synchronized - students watch independently</span>
                      </div>
                      
                      {/* Session Status for Video Steps */}
                      {!isInstructor && (
                        <div className="flex items-center justify-between text-sm p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${sessionStatus.isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span className="font-medium">
                              {sessionStatus.isConnected ? 'Connected to session' : 'Not connected to session'}
                            </span>
                            {sessionStatus.isConnected && sessionStatus.participantCount > 0 && (
                              <span className="text-gray-500">
                                ({sessionStatus.participantCount} participants)
                              </span>
                            )}
                          </div>
                          
                          {!sessionStatus.isConnected && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                console.log('🔄 Manual session join attempt for video step');
                                let joined = await sessionManager.findAndJoinActiveSession(moduleId);
                                if (!joined) {
                                  const classIdMatch = window.location.pathname.match(/\/classes\/([^\/]+)\//);
                                  if (classIdMatch) {
                                    const classId = classIdMatch[1];
                                    joined = await sessionManager.findAndJoinActiveCourseSession(classId);
                                  }
                                }
                                if (!joined) {
                                  setError('No active session found to join');
                                }
                              }}
                            >
                              Join Session
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <YouTubePlayer
                    videoUrl={step.video_url}
                    title={step.title}
                    className="w-full"
                    onReady={() => {
                      console.log('🎥 YouTube video loaded for step:', step.title);
                    }}
                    onError={(error) => {
                      console.error('❌ YouTube video error:', error);
                      setError(`Video Error: ${error}`);
                    }}
                  />
                </div>
              </div>
            ) : (
              // Fallback for missing content
              <div className="p-6 text-center text-gray-500">
                <p>No media content available for this step.</p>
              </div>
            )}
          </div>

          {/* Instructor Presentation Controls - Only show for PDF steps with sync support */}
          {isInstructor && supportsSync && !isCheckingInstructor && step.content_type === 'pdf' && step.slide_pdf_url && (
            <InstructorPresentationControl
              moduleId={moduleId}
              classId={classId}
              totalSlides={totalSlides}
              currentSlide={currentSlide}
              onSlideChange={handleSlideChange}
              presentationTitle={`${step.title} - Step ${step.stepNumber}`}
              stepNumber={step.stepNumber}
              currentStepId={step.id}
              onModuleSwitch={(newModuleId) => {
                console.log('🔄🔄🔄 MODULE SWITCH CALLBACK CALLED! 🔄🔄🔄');
                console.log('🔄 Module switch requested to:', newModuleId);
                console.log('🔄 Current moduleId:', moduleId);
                console.log('🔄 Window location:', window.location);
                
                // Navigate instructor to the new module/step URL
                const currentPath = window.location.pathname;
                
                // Extract class ID from current URL (pattern: /classes/:classId/modules/:moduleId)
                const classIdMatch = currentPath.match(/\/classes\/([^\/]+)\//);
                if (classIdMatch) {
                  const classId = classIdMatch[1];
                  const newPath = `/classes/${classId}/modules/${newModuleId}`;
                  
                  console.log('🔄 Navigating instructor from', currentPath, 'to', newPath);
                  console.log('🔄 About to call window.location.href =', newPath);
                  
                  // Use window.location.href for immediate navigation
                  window.location.href = newPath;
                } else {
                  console.log('⚠️ Could not extract class ID from current path:', currentPath);
                  console.log('🔄 Fallback: Attempting to refresh page');
                  window.location.reload();
                }
              }}
              onStepSwitch={onStepSwitch}
            />
          )}
        </div>
      )}

      {/* Notes Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            <h2 className="text-xl font-bold text-gray-900 mr-3">Step Notes</h2>
            <button
              onClick={toggleNotesCollapse}
              className="p-1 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:ring-opacity-50 transition-colors duration-200"
              aria-label={isNotesCollapsed ? "Expand notes section" : "Collapse notes section"}
              aria-expanded={!isNotesCollapsed}
              aria-controls="step-notes-content"
            >
              {isNotesCollapsed ? (
                <ChevronDown className="w-5 h-5 text-[#F98B3D]" />
              ) : (
                <ChevronUp className="w-5 h-5 text-[#F98B3D]" />
              )}
            </button>
          </div>

          {/* Save Status */}
          <div className="flex items-center space-x-3 text-sm">
            {lastSaved && (
              <span className="text-gray-500">
                Last saved: {lastSaved}
              </span>
            )}
            {saveStatus === 'saving' && (
              <div className="flex items-center text-blue-600">
                <LoadingSpinner size="small" text="" className="mr-2" />
                Saving...
              </div>
            )}
            {saveStatus === 'saved' && (
              <span className="text-green-600">Saved</span>
            )}
            {saveStatus === 'error' && (
              <span className="text-red-600">Error saving</span>
            )}
            {hasUnsavedChanges && saveStatus === 'idle' && (
              <span className="text-orange-600">Unsaved changes</span>
            )}
          </div>
        </div>

        {/* Collapsed Preview */}
        {isNotesCollapsed && (
          <button
            onClick={toggleNotesCollapse}
            className="w-full border-l-4 border-[#F98B3D] bg-orange-50 px-4 py-3 mb-4 rounded-r-md hover:bg-orange-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:ring-opacity-50 text-left"
            aria-label="Click to expand notes and start editing"
          >
            <div className="flex items-start">
              <NotesIcon className="w-4 h-4 text-[#F98B3D] mr-2 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                {noteContent && getFirstLineOfNotes(noteContent) ? (
                  <p className="text-gray-700 text-sm truncate">
                    {getFirstLineOfNotes(noteContent)}
                  </p>
                ) : (
                  <p className="text-gray-500 text-sm italic">
                    No notes yet. Click to expand and start writing.
                  </p>
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-[#F98B3D] ml-2 flex-shrink-0" />
            </div>
          </button>
        )}

        {/* Notes Editor */}
        <div 
          id="step-notes-content"
          className={`transition-all duration-300 ease-in-out ${
            isNotesCollapsed 
              ? 'max-h-0 opacity-0 overflow-hidden' 
              : 'max-h-[600px] opacity-100 overflow-visible'
          }`}
          aria-hidden={isNotesCollapsed}
        >
          {noteError && (
            <Alert
              type="error"
              title="Note Error"
              message={noteError}
              onDismiss={() => setNoteError(null)}
              className="mb-4"
            />
          )}

          <RichTextEditor
            content={noteContent}
            onChange={handleNoteChange}
            placeholder={`Write your notes for ${step.title}...`}
            className="min-h-[300px]"
          />

          {hasUnsavedChanges && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                <span className="text-orange-600">*</span> You have unsaved changes
              </p>
              <Button
                onClick={handleSaveNote}
                isLoading={isSaving}
                size="small"
                variant="primary"
              >
                Save Notes
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StepViewer; 