import React, { useState, useEffect, useRef } from 'react';
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
import { Alert } from './Alert';
import { Button } from './Button';

interface InstructorPresentationControlProps {
  moduleId: string;
  totalSlides: number;
  currentSlide: number;
  onSlideChange: (slide: number) => void;
  presentationTitle?: string;
}

interface ParticipantWithStatus extends SessionParticipant {
  isUpToDate: boolean;
  name?: string;
  email?: string;
}

const InstructorPresentationControl: React.FC<InstructorPresentationControlProps> = ({
  moduleId,
  totalSlides,
  currentSlide,
  onSlideChange,
  presentationTitle
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

  // Initialize sync manager
  useEffect(() => {
    const initializeSync = async () => {
      const success = await syncManager.initialize();
      if (!success) {
        setError('Failed to initialize sync manager');
      }
    };

    initializeSync();

    // Set up callbacks
    const callbacks: PresentationSyncCallbacks = {
      onSlideChange: (slide) => {
        onSlideChange(slide);
      },
      onSyncStatusChange: (status) => {
        setSyncStatus(status);
        if (status.isConnected && status.sessionId && !sessionStartTime) {
          setSessionStartTime(new Date());
        }
      },
      onParticipantUpdate: async (participantList) => {
        // Enhance participant data with user info and sync status
        const enhancedParticipants: ParticipantWithStatus[] = await Promise.all(
          participantList.map(async (participant) => {
            const isUpToDate = participant.last_seen_slide === syncStatus.currentSlide;
            
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
        
        setParticipants(enhancedParticipants);
      },
      onSessionEnd: () => {
        setIsSessionActive(false);
        setSessionStartTime(null);
        setParticipants([]);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      },
      onError: (errorMsg) => {
        setError(errorMsg);
      }
    };

    // Update callbacks
    syncManager.callbacks = callbacks;

    return () => {
      syncManager.disconnect();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [moduleId, onSlideChange, sessionStartTime, syncStatus.currentSlide]);

  // Start presentation session
  const startSession = async () => {
    if (!sessionName.trim()) {
      setError('Please enter a session name');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const sessionId = await syncManager.createSession(
        moduleId, 
        totalSlides, 
        sessionName.trim()
      );

      if (sessionId) {
        setIsSessionActive(true);
        setSessionStartTime(new Date());
      } else {
        setError('Failed to create session');
      }
    } catch (error) {
      setError(`Failed to start session: ${error}`);
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
      setSessionStartTime(null);
      setParticipants([]);
      
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Name
              </label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Enter session name (e.g., 'Module 1 - Introduction')"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#F98B3D] focus:border-transparent"
                disabled={isLoading}
              />
            </div>
            
            <Button
              onClick={startSession}
              disabled={isLoading || !sessionName.trim()}
              className="w-full"
              variant="primary"
            >
              <Play size={16} className="mr-2" />
              {isLoading ? 'Starting Session...' : 'Start Presentation Session'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-green-600">
                <Activity size={16} className="mr-1" />
                <span className="font-medium">Session Active</span>
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
              End Session
            </Button>
          </div>

          {/* Session Stats */}
          <div className="bg-gray-50 rounded-lg p-3">
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

        {/* Slide Jump */}
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Jump to:</label>
          <input
            type="number"
            min="1"
            max={totalSlides}
            value=""
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
  );
};

export default InstructorPresentationControl; 