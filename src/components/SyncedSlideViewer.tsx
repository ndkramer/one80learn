import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  Maximize2, 
  Minimize2, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut,
  Wifi,
  WifiOff,
  Link,
  Unlink,
  Users,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { supabase } from '../utils/supabase';
import { 
  PresentationSyncManager, 
  SyncStatus, 
  PresentationSyncCallbacks 
} from '../utils/presentationSyncManager';
import Alert from './Alert';
import Button from './Button';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface SyncedSlideViewerProps {
  title: string;
  moduleId: string;
  pdfUrl?: string;
  currentSlide?: number; // Add prop to control which slide to display
  onPdfLoad?: (numPages: number) => void; // Callback when PDF loads with total pages
  onStepSwitch?: (stepId: string) => void; // Add callback for step switching
}

interface SessionInfo {
  id: string;
  sessionName?: string;
  instructorName?: string;
  startTime: Date;
  participantCount: number;
}

const SyncedSlideViewer: React.FC<SyncedSlideViewerProps> = ({ 
  title, 
  moduleId, 
  pdfUrl,
  currentSlide,
  onPdfLoad,
  onStepSwitch
}) => {
  // Standard slide viewer state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync-related state
  const [syncManager] = useState(() => new PresentationSyncManager());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isInstructor: false,
    isConnected: false,
    isSync: false,
    currentSlide: 1,
    totalSlides: 0,
    participantCount: 0
  });
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);

  const [autoJoinAttempted, setAutoJoinAttempted] = useState(false);
  // Auto-join retry state
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [maxRetryAttempts] = useState(20); // Try for ~3 minutes (20 * 10s = 200s)
  const retryIntervalRef = useRef<NodeJS.Timeout>();

  // Manual slide override (when student navigates independently)
  const [manualSlideOverride, setManualSlideOverride] = useState(false);
  
  // Diagnostic state
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);

  // Initialize PDF loading
  useEffect(() => {
    if (!pdfUrl) {
      setPdfFile(null);
      setNumPages(0);
      setPageNumber(1);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const { data } = supabase.storage
        .from('slides-pdf')
        .getPublicUrl(pdfUrl);
      
      setPdfFile(data.publicUrl);
    } catch (err) {
      console.error('Error getting public URL:', err);
      setError('Failed to get public URL for PDF');
      setIsLoading(false);
    }
  }, [pdfUrl]);

  // Function to attempt auto-join (can be called multiple times)
  const attemptAutoJoin = async (): Promise<boolean> => {
    try {
      console.log('🔍 Attempting auto-join for module:', moduleId);
      
      // Check if user is instructor for this module first
      const isInstructor = await syncManager.isModuleInstructor(moduleId);
      console.log('👤 User instructor status:', isInstructor);
      
      if (isInstructor) {
        console.log('👨‍🏫 User is instructor, skipping auto-join');
        return false;
      }

      console.log('👨‍🎓 User is student, attempting auto-join...');
      let joined = await syncManager.findAndJoinActiveSession(moduleId);
      console.log('🔗 Module auto-join result:', joined);
      
      // If module-specific join failed, try course-level join as fallback
      if (!joined) {
        console.log('🔍 Module auto-join failed, trying course-level session...');
        try {
          // Get class ID from current URL
          const currentPath = window.location.pathname;
          const classIdMatch = currentPath.match(/\/classes\/([^\/]+)\//); 
          
          if (classIdMatch) {
            const classId = classIdMatch[1];
            console.log('🎓 Attempting course-level auto-join for class:', classId);
            joined = await syncManager.findAndJoinActiveCourseSession(classId);
            console.log('🔗 Course-level auto-join result:', joined);
          }
        } catch (courseJoinError) {
          console.log('❌ Course-level auto-join failed:', courseJoinError);
        }
      } 
      
      if (joined) {
        console.log('✅ Student successfully joined session');
        setRetryAttempts(0); // Reset retry counter on success
        return true;
      } else {
        console.log('❌ No active session found');
        return false;
      }
    } catch (error) {
      console.error('❌ Auto-join error:', error);
      return false;
    }
  };

  // Set up periodic auto-join retry for students
  useEffect(() => {
    // Only set up retry logic if:
    // 1. User is not connected to any session
    // 2. We haven't exceeded max retry attempts
    // 3. PDF is loaded (numPages > 0)
    if (!syncStatus.isConnected && retryAttempts < maxRetryAttempts && numPages > 0) {
      console.log(`🔄 Setting up auto-join retry #${retryAttempts + 1}/${maxRetryAttempts} in 10 seconds...`);
      
      retryIntervalRef.current = setTimeout(async () => {
        console.log(`🎯 Auto-join retry attempt #${retryAttempts + 1}`);
        
        const success = await attemptAutoJoin();
        if (!success) {
          setRetryAttempts(prev => prev + 1);
        }
      }, 10000); // Retry every 10 seconds
    } else if (syncStatus.isConnected) {
      // Connected - stop retrying
      console.log('✅ Student connected - stopping auto-join retries');
      if (retryIntervalRef.current) {
        clearTimeout(retryIntervalRef.current);
      }
      setRetryAttempts(0);
    } else if (retryAttempts >= maxRetryAttempts) {
      console.log('❌ Max auto-join attempts reached - stopping retries');
    }

    return () => {
      if (retryIntervalRef.current) {
        clearTimeout(retryIntervalRef.current);
      }
    };
  }, [syncStatus.isConnected, retryAttempts, maxRetryAttempts, numPages, moduleId]);

  // Initialize sync manager
  useEffect(() => {
    console.log('🎯 SyncedSlideViewer sync useEffect triggered');
    console.log('📊 Current state - moduleId:', moduleId, 'numPages:', numPages, 'autoJoinAttempted:', autoJoinAttempted);
    
    const initializeSync = async () => {
      console.log('🔧 Initializing sync manager...');
      const success = await syncManager.initialize();
      console.log('🔧 Sync manager initialization result:', success);
      
      if (!success) {
        console.warn('Failed to initialize sync manager');
        return;
      }

      // Set up callbacks
      const callbacks: PresentationSyncCallbacks = {
        onSlideChange: (slide) => {
          console.log('🎯 SyncedSlideViewer onSlideChange called with slide:', slide);
          console.log('📊 Current pageNumber before change:', pageNumber);
          setPageNumber(slide);
          setManualSlideOverride(false); // Reset override when syncing
          console.log('✅ Updated pageNumber to:', slide);
        },
        onSyncStatusChange: (status) => {
          console.log('🔄 SyncedSlideViewer onSyncStatusChange called - isInstructor:', status.isInstructor, 'isConnected:', status.isConnected);
          setSyncStatus(status);
          
          // Update session info when connected
          if (status.isConnected && status.sessionId) {
            updateSessionInfo(status.sessionId);
          } else {
            setSessionInfo(null);
          }
        },
        onSessionEnd: () => {
          setSessionInfo(null);
        },
        onError: (errorMsg) => {
          // Only show critical errors to students
          if (errorMsg.includes('Failed to join') || errorMsg.includes('Session not found')) {
            setError(errorMsg);
          }
        },
        onModuleSwitch: (newModuleId, startSlide) => {
          console.log('🔄 Module switch detected! Navigating to new module:', newModuleId, 'at slide:', startSlide);
          
          // Navigate to the new module/step URL
          // We need to construct the URL based on the current URL pattern
          const currentPath = window.location.pathname;
          
          // Extract class ID from current URL (pattern: /classes/:classId/modules/:moduleId)
          const classIdMatch = currentPath.match(/\/classes\/([^\/]+)\//);
          if (classIdMatch) {
            const classId = classIdMatch[1];
            const newPath = `/classes/${classId}/modules/${newModuleId}`;
            
            console.log('🔄 Navigating student from', currentPath, 'to', newPath);
            window.location.href = newPath;
          } else {
            console.log('⚠️ Could not extract class ID from current path:', currentPath);
          }
        },
        onStepSwitch: (stepIdentifier, startSlide) => {
          console.log('🔄 Step switch detected! stepIdentifier:', stepIdentifier, 'startSlide:', startSlide);
          
          if (onStepSwitch) {
            console.log('✅ Calling parent onStepSwitch callback');
            onStepSwitch(stepIdentifier);
          } else {
            console.log('⚠️ No parent onStepSwitch callback available');
          }
        }
      };

      // Use the public method to set callbacks
      Object.assign(syncManager, { callbacks });

      // Try initial auto-join for students
      if (!autoJoinAttempted && numPages > 0) {
        console.log('✅ Initial auto-join conditions met, proceeding...');
        setAutoJoinAttempted(true);
        
        // Use the new retry-capable auto-join function
        const success = await attemptAutoJoin();
        if (!success) {
          // If initial attempt fails, the periodic retry will take over
          console.log('🔄 Initial auto-join failed - periodic retries will continue');
        }
      } else {
        console.log('❌ Initial auto-join conditions not met - skipping auto-join');
      }
    };

    console.log('🎯 Checking if should initialize sync - numPages:', numPages);
    if (numPages > 0) {
      console.log('✅ numPages > 0, calling initializeSync');
      initializeSync();
    } else {
      console.log('❌ numPages is 0 or undefined, skipping initializeSync');
    }

    return () => {
      syncManager.disconnect();
    };
  }, [moduleId, numPages, autoJoinAttempted]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Handle external slide navigation (from instructor controls) - only for instructors
  useEffect(() => {
    // Only instructors should respond to currentSlide prop changes
    // Students should only get slide changes from their sync manager via realtime
    const isInstructorFromSyncManager = syncManager.getSyncStatus().isInstructor;
    
    console.log('🎯 External slide navigation useEffect triggered');
    console.log('📊 Props: currentSlide =', currentSlide, ', pageNumber =', pageNumber);
    console.log('📊 Instructor status: syncStatus.isInstructor =', syncStatus.isInstructor, ', syncManager =', isInstructorFromSyncManager);
    console.log('📊 PDF state: numPages =', numPages);
    console.log('📊 Session state: sessionId =', syncStatus.sessionId, ', isSync =', syncStatus.isSync);
    
    // Check if this is an instructor (either from sync status or sync manager)
    const isInstructor = syncStatus.isInstructor || isInstructorFromSyncManager;
    
    // For instructors: Always respond to currentSlide prop changes from controls
    // For students: Only respond to currentSlide prop changes when NOT in an active session
    // (Students in active sessions should only get slide changes via realtime sync)
    const shouldUpdateSlide = currentSlide && 
                              currentSlide !== pageNumber && 
                              currentSlide >= 1 && 
                              currentSlide <= numPages &&
                              (isInstructor || !syncStatus.sessionId); // Instructors always, students only when not in session
    
    if (shouldUpdateSlide) {
      if (isInstructor) {
        console.log('✅ Instructor updating slide from', pageNumber, 'to', currentSlide);
      } else {
        console.log('✅ Student (no session) updating slide from', pageNumber, 'to', currentSlide);
      }
      setPageNumber(currentSlide);
      setManualSlideOverride(false); // Reset override when externally controlled
    } else if (currentSlide && currentSlide !== pageNumber) {
      if (!isInstructor && syncStatus.sessionId) {
        console.log('👨‍🎓 Student in session ignoring external slide change via prop - keeping pageNumber at', pageNumber, 'instead of', currentSlide);
      } else {
        console.log('❌ Slide change blocked - currentSlide:', currentSlide, 'pageNumber:', pageNumber, 'numPages:', numPages, 'valid range:', currentSlide >= 1 && currentSlide <= numPages);
      }
    }
  }, [currentSlide, pageNumber, numPages, syncStatus.isInstructor, syncStatus.sessionId]);

  // Update session information
  const updateSessionInfo = async (sessionId: string) => {
    try {
      const { data: session } = await supabase
        .from('presentation_sessions')
        .select(`
          id,
          session_name,
          created_at,
          instructor_id
        `)
        .eq('id', sessionId)
        .single();

      if (session) {
        setSessionInfo({
          id: session.id,
          sessionName: session.session_name || 'Presentation Session',
          instructorName: 'Instructor', // In real implementation, fetch instructor name
          startTime: new Date(session.created_at),
          participantCount: syncStatus.participantCount
        });
      }
    } catch (error) {
      console.warn('Failed to fetch session info:', error);
    }
  };

  // PDF document handlers
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setIsLoading(false);
    setError(null);
    
    // Call the parent callback with total pages
    if (onPdfLoad) {
      onPdfLoad(numPages);
    }
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF document:', error);
    setError('Failed to load PDF document. Please try again later.');
    setIsLoading(false);
  };

  // Manual navigation (when not synced or override enabled)
  const goToPrevPage = () => {
    if (syncStatus.isSync && !manualSlideOverride) {
      setManualSlideOverride(true);
    }
    setPageNumber(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    if (syncStatus.isSync && !manualSlideOverride) {
      setManualSlideOverride(true);
    }
    setPageNumber(prev => Math.min(prev + 1, numPages));
  };

  // Zoom controls
  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const resetZoom = () => setScale(1.0);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.error('Error attempting to exit fullscreen:', err);
      });
    }
  };

  // Sync controls
  const toggleSync = async () => {
    if (syncStatus.sessionId) {
      await syncManager.toggleSync();
      if (!syncStatus.isSync) {
        setManualSlideOverride(false);
      }
    }
  };

  const rejoinSync = async () => {
    if (syncStatus.sessionId && syncStatus.isSync) {
      setPageNumber(syncStatus.currentSlide);
      setManualSlideOverride(false);
    }
  };

  const leaveSession = async () => {
    await syncManager.leaveSession();
    setSessionInfo(null);
    setManualSlideOverride(false);
  };

  // Catch up to instructor's current slide
  const catchUpToInstructor = async () => {
    console.log('🏃‍♀️ Catch Up button clicked!');
    console.log('📊 Current state:');
    console.log('  - pageNumber:', pageNumber);
    console.log('  - syncStatus.currentSlide:', syncStatus.currentSlide);
    console.log('  - syncStatus.sessionId:', syncStatus.sessionId);
    console.log('  - syncStatus.isSync:', syncStatus.isSync);
    console.log('  - manualSlideOverride:', manualSlideOverride);
    console.log('  - syncStatus.isInstructor:', syncStatus.isInstructor);
    
    if (!syncStatus.sessionId) {
      console.log('❌ No active session ID');
      return;
    }

    try {
      // Fetch the latest session data directly from database to get current instructor slide
      console.log('🔍 Fetching latest session data from database...');
      const { data: session, error } = await supabase
        .from('presentation_sessions')
        .select('current_slide')
        .eq('id', syncStatus.sessionId)
        .single();

      if (error) {
        console.error('❌ Error fetching session data:', error);
        return;
      }

      if (!session) {
        console.log('❌ Session not found');
        return;
      }

      const instructorCurrentSlide = session.current_slide;
      console.log('📊 Latest instructor slide from database:', instructorCurrentSlide);

      // Get the sync manager's current slide as fallback
      const currentSyncStatus = syncManager.getSyncStatus();
      console.log('📊 Sync manager current slide:', currentSyncStatus.currentSlide);
      
      // Use the database value as the primary source
      const targetSlide = instructorCurrentSlide || currentSyncStatus.currentSlide || syncStatus.currentSlide;
      
      if (targetSlide && targetSlide !== pageNumber) {
        console.log('✅ Moving from slide', pageNumber, 'to instructor slide', targetSlide);
        setPageNumber(targetSlide);
        setManualSlideOverride(false); // Ensure sync is enabled after catching up
        
        // Update the participant's last_seen_slide in the database
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && syncStatus.sessionId) {
            console.log('📝 Updating participant last_seen_slide to:', targetSlide);
            const { error: updateError } = await supabase
              .from('session_participants')
              .update({ 
                last_seen_slide: targetSlide,
                last_activity: new Date().toISOString() 
              })
              .eq('session_id', syncStatus.sessionId)
              .eq('student_id', user.id);
              
            if (updateError) {
              console.warn('⚠️ Failed to update participant slide:', updateError);
            } else {
              console.log('✅ Successfully updated participant slide in database');
            }
          }
        } catch (updateError) {
          console.warn('⚠️ Error updating participant slide:', updateError);
        }
        
        // Force a sync status update to ensure UI is consistent
        setTimeout(() => {
          const updatedStatus = syncManager.getSyncStatus();
          console.log('🔄 Post-catch-up sync status check:', updatedStatus);
        }, 100);
      } else {
        console.log('❌ No catch up needed or no target slide available');
        console.log('  - targetSlide:', targetSlide);
        console.log('  - pageNumber:', pageNumber);
      }
    } catch (error) {
      console.error('❌ Error in catchUpToInstructor:', error);
    }
  };

  // Calculate session duration
  const getSessionDuration = (): string => {
    if (!sessionInfo) return '00:00';
    
    const now = new Date();
    const diffMs = now.getTime() - sessionInfo.startTime.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Determine current slide status
  const getSlideStatus = () => {
    if (!syncStatus.sessionId) return null;
    
    if (!syncStatus.isSync) {
      return { type: 'warning', message: 'Sync disabled - navigating manually' };
    }
    
    if (manualSlideOverride) {
      return { type: 'info', message: 'Manual override - click sync to rejoin' };
    }
    
    if (pageNumber === syncStatus.currentSlide) {
      return { type: 'success', message: 'In sync with instructor' };
    }
    
    return { type: 'warning', message: `Behind by ${syncStatus.currentSlide - pageNumber} slide(s)` };
  };

  const slideStatus = getSlideStatus();

  // Diagnostic functions
  const runDiagnostics = async () => {
    console.log('🔍 Running sync diagnostics...');
    const results = await syncManager.diagnoseSyncIssues();
    setDiagnosticResults(results);
    console.log('📊 Diagnostic results:', results);
  };

  const forceSyncRefresh = async () => {
    console.log('🔄 Forcing sync refresh...');
    const success = await syncManager.forceSyncRefresh();
    if (success) {
      console.log('✅ Sync refresh successful');
      // Run diagnostics again to show updated state
      await runDiagnostics();
    } else {
      console.log('❌ Sync refresh failed');
    }
  };

  return (
    <div className="relative h-full bg-gray-100">
      {/* Sync Status Banner */}
      {syncStatus.sessionId && (
        <div className={`absolute top-0 left-0 right-0 z-20 p-3 text-sm ${
          syncStatus.isConnected 
            ? 'bg-green-50 border-b border-green-200 text-green-800'
            : 'bg-red-50 border-b border-red-200 text-red-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {syncStatus.isConnected ? (
                <Activity size={14} className="text-green-600" />
              ) : (
                <WifiOff size={14} className="text-red-600" />
              )}
              <span className="font-medium">
                {syncStatus.isConnected ? 'Connected to presentation session' : 'Connection lost'}
              </span>
              {sessionInfo && (
                <span className="text-xs opacity-75">
                  • {sessionInfo.sessionName} • {getSessionDuration()}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={leaveSession}
                variant="ghost"
                size="sm"
                className="text-xs text-red-600 hover:bg-red-100"
              >
                Leave
              </Button>
            </div>
          </div>

          {/* Slide Status */}
          {slideStatus && (
            <div className={`mt-2 flex items-center space-x-2 text-xs ${
              slideStatus.type === 'success' ? 'text-green-700' :
              slideStatus.type === 'warning' ? 'text-yellow-700' :
              'text-blue-700'
            }`}>
              {slideStatus.type === 'success' && <CheckCircle size={12} />}
              {slideStatus.type === 'warning' && <AlertCircle size={12} />}
              {slideStatus.type === 'info' && <Info size={12} />}
              <span>{slideStatus.message}</span>
              
              {manualSlideOverride && (
                <Button
                  onClick={rejoinSync}
                  variant="ghost"
                  size="sm"
                  className="text-xs ml-2 text-blue-600 hover:bg-blue-100"
                >
                  Rejoin Sync
                </Button>
              )}
              
              {/* Catch Up button for students who are behind */}
              {slideStatus.type === 'warning' && 
               slideStatus.message.includes('Behind by') && 
               !syncStatus.isInstructor && (
                <Button
                  onClick={catchUpToInstructor}
                  variant="ghost"
                  size="sm"
                  className="text-xs ml-2 text-[#F98B3D] hover:bg-orange-100"
                >
                  Catch Up
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Session Info Banner - Enhanced with diagnostics */}
      {sessionInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${syncStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium text-blue-900">
                {sessionInfo.sessionName}
              </span>
              <span className="text-xs text-blue-600">
                {syncStatus.isSync ? '🔗 Synced' : '🔓 Free Navigation'}
              </span>
              {syncStatus.participantCount > 0 && (
                <span className="text-xs text-blue-600">
                  {syncStatus.participantCount} participants
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {/* Diagnostic toggle button */}
              <button
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
                title="Show diagnostic information"
              >
                {showDiagnostics ? 'Hide' : 'Debug'}
              </button>
              
              <button
                onClick={toggleSync}
                className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1 rounded"
                disabled={!syncStatus.sessionId}
              >
                {syncStatus.isSync ? 'Disable Sync' : 'Enable Sync'}
              </button>
              
              {!syncStatus.isSync && (
                <button
                  onClick={catchUpToInstructor}
                  className="text-xs bg-green-100 hover:bg-green-200 text-green-800 px-2 py-1 rounded"
                  disabled={!syncStatus.sessionId}
                >
                  Catch Up
                </button>
              )}
            </div>
          </div>
          
          {/* Diagnostic panel */}
          {showDiagnostics && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <div className="mb-3">
                <button
                  onClick={runDiagnostics}
                  className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 px-2 py-1 rounded mr-2"
                >
                  Run Diagnostics
                </button>
                <button
                  onClick={forceSyncRefresh}
                  className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-800 px-2 py-1 rounded"
                >
                  Force Refresh
                </button>
              </div>
              
              {diagnosticResults && (
                <div className="bg-white rounded p-3 text-xs">
                  <div className="mb-2">
                    <span className={`inline-block px-2 py-1 rounded text-white text-xs ${
                      diagnosticResults.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {diagnosticResults.status === 'healthy' ? '✅ Healthy' : '⚠️ Issues Detected'}
                    </span>
                  </div>
                  
                  {diagnosticResults.issues.length > 0 && (
                    <div className="mb-2">
                      <strong className="text-red-600">Issues:</strong>
                      <ul className="text-red-600 ml-4">
                        {diagnosticResults.issues.map((issue: string, index: number) => (
                          <li key={index}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {diagnosticResults.recommendations.length > 0 && (
                    <div className="mb-2">
                      <strong className="text-blue-600">Recommendations:</strong>
                      <ul className="text-blue-600 ml-4">
                        {diagnosticResults.recommendations.map((rec: string, index: number) => (
                          <li key={index}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <details className="mt-2">
                    <summary className="cursor-pointer text-gray-600">Technical Details</summary>
                    <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(diagnosticResults.details, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}
        </div>
      )}



      {/* Controls */}
      <div className={`absolute right-4 z-10 flex items-center space-x-2 ${
        syncStatus.sessionId ? 'top-20' : 'top-4'
      }`}>
        {pdfFile && numPages > 0 && (
          <>
            {/* Sync Controls */}
            {syncStatus.sessionId && (
              <div className="flex items-center space-x-1 bg-white rounded-lg shadow-md p-1">
                <Button
                  onClick={toggleSync}
                  variant="ghost"
                  size="sm"
                  className={`${
                    syncStatus.isSync 
                      ? 'text-green-600 bg-green-50' 
                      : 'text-gray-600'
                  }`}
                  title={syncStatus.isSync ? 'Disable sync' : 'Enable sync'}
                >
                  {syncStatus.isSync ? <Link size={16} /> : <Unlink size={16} />}
                </Button>
                
                <div className="flex items-center px-2 text-xs text-gray-600">
                  <Users size={12} className="mr-1" />
                  {syncStatus.participantCount}
                </div>
              </div>
            )}

            {/* Zoom controls */}
            <div className="flex items-center space-x-1 bg-white rounded-lg shadow-md p-1">
              <Button
                onClick={zoomOut}
                variant="ghost"
                size="sm"
                title="Zoom out"
              >
                <ZoomOut size={16} />
              </Button>
              <Button
                onClick={resetZoom}
                variant="ghost"
                size="sm"
                title="Reset zoom"
                className="px-3 text-sm font-medium"
              >
                {Math.round(scale * 100)}%
              </Button>
              <Button
                onClick={zoomIn}
                variant="ghost"
                size="sm"
                title="Zoom in"
              >
                <ZoomIn size={16} />
              </Button>
            </div>

            {/* Page navigation - only show if not synced or manual override */}
            {(!syncStatus.isSync || manualSlideOverride) && numPages > 1 && (
              <div className="flex items-center space-x-1 bg-white rounded-lg shadow-md p-1">
                <Button
                  onClick={goToPrevPage}
                  disabled={pageNumber <= 1}
                  variant="ghost"
                  size="sm"
                  title="Previous page"
                >
                  <ChevronLeft size={16} />
                </Button>
                <span className="px-3 py-2 text-sm font-medium">
                  {pageNumber} / {numPages}
                </span>
                <Button
                  onClick={goToNextPage}
                  disabled={pageNumber >= numPages}
                  variant="ghost"
                  size="sm"
                  title="Next page"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            )}
          </>
        )}

        {/* Fullscreen toggle */}
        <Button
          onClick={toggleFullscreen}
          variant="ghost"
          className="bg-white rounded-full shadow-md p-2"
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="absolute top-4 left-4 right-4 z-10">
          <Alert type="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </div>
      )}

      {/* PDF Content */}
      <div className={`overflow-auto p-4 ${syncStatus.sessionId ? 'pt-20' : ''}`}>
        {!pdfFile ? (
          <div className="text-center text-gray-600 p-8">
            <p>No PDF document available</p>
          </div>
        ) : (
          <Document
            file={pdfFile}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="text-center text-gray-600 p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F98B3D] mx-auto mb-2"></div>
                <p>Loading PDF...</p>
              </div>
            }
            error={
              <div className="text-center text-red-600 p-8">
                <p>Failed to load PDF</p>
                <p className="text-sm mt-2">{error}</p>
                <Button
                  onClick={() => window.location.reload()}
                  variant="primary"
                  className="mt-4"
                >
                  Retry
                </Button>
              </div>
            }
          >
            <div className="flex justify-center">
              <Page
                pageNumber={pageNumber}
                scale={scale}
                className="shadow-lg"
              />
            </div>
          </Document>
        )}
      </div>
    </div>
  );
};

export default SyncedSlideViewer;