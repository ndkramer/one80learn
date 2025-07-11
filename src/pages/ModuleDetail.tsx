import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useBeforeUnload, useLocation } from 'react-router-dom';
import { ChevronLeft, Download, AlertTriangle } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../utils/authContext';
import { useClass } from '../utils/classContext';
import { Step, ModuleProgress } from '../types';
import ModuleProgressBar from '../components/ModuleProgressBar';
import StepViewer from '../components/StepViewer';
import Button from '../components/Button';
import Alert from '../components/Alert';
import LoadingSpinner from '../components/LoadingSpinner';
import { isModuleInstructor, moduleSupportsSync } from '../utils/instructorAuth';
import { PDFDocument } from 'pdf-lib';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ModuleDetail: React.FC = () => {
  console.log('🎯 ModuleDetail component is mounting/rendering!');
  
  const { classId, moduleId } = useParams<{ classId: string; moduleId: string }>();
  console.log('🔍 ModuleDetail - URL params:', { classId, moduleId });
  
  const navigate = useNavigate();
  const { enrolledClasses, isLoading: classLoading } = useClass();
  const { user } = useAuth();

  // Multi-step state
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [moduleProgress, setModuleProgress] = useState<ModuleProgress | null>(null);
  const [isLoadingSteps, setIsLoadingSteps] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Presentation sync state
  const [supportsSync, setSupportsSync] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // For navigation warning
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showNavigationWarning, setShowNavigationWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const location = useLocation();
  
  const classItem = classId ? enrolledClasses.find(c => c.id === classId) : undefined;
  const module = classItem?.modules.find(m => m.id === moduleId);
  const currentStep = steps[currentStepIndex];
  
  // Debug logs
  console.log('Module Data:', {
    moduleId,
    module,
    stepsCount: steps.length,
    currentStepIndex,
    currentStep: currentStep?.title
  });

  // Set up beforeunload event to warn about unsaved changes
  useBeforeUnload(
    React.useCallback(
      (event) => {
        if (hasUnsavedChanges) {
          event.preventDefault();
          return 'You have unsaved notes. Are you sure you want to leave?';
        }
      },
      [hasUnsavedChanges]
    )
  );

  // Listen for location changes to intercept navigation
  useEffect(() => {
    setPendingNavigation(null);
    setShowNavigationWarning(false);
  }, [location]);

  // Handle navigation within the app
  const handleNavigateAway = (to: string) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(to);
      setShowNavigationWarning(true);
    } else {
      navigate(to);
    }
  };

  // Handle confirmation of navigation
  const handleConfirmNavigation = () => {
    if (pendingNavigation) {
      setShowNavigationWarning(false);
      navigate(pendingNavigation);
    }
  };

  // Handle cancellation of navigation
  const handleCancelNavigation = () => {
    setPendingNavigation(null);
    setShowNavigationWarning(false);
  };

  // Handle back button click
  const handleBackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (hasUnsavedChanges) {
      setPendingNavigation(`/classes/${classId}`);
      setShowNavigationWarning(true);
    } else {
        navigate(`/classes/${classId}`);
    }
  };

  // Load module steps and progress
  useEffect(() => {
    let isMounted = true;

    const loadModuleData = async () => {
      if (!moduleId || !user?.id) {
        return;
      }

      try {
        setIsLoadingSteps(true);
        setError(null);

        // Load steps for this module
        const { data: stepsData, error: stepsError } = await supabase
          .from('steps')
          .select(`
            *,
            step_notes!left(
              id,
              user_id,
              content,
              created_at,
              updated_at
            ),
            step_completion!left(
              id,
              user_id,
              completed,
              completed_at,
              created_at,
              updated_at
            )
          `)
          .eq('module_id', moduleId)
          .eq('step_notes.user_id', user.id)
          .eq('step_completion.user_id', user.id)
          .order('step_number');

        if (stepsError) {
          console.error('Error loading steps:', stepsError);
          throw new Error('Failed to load module steps');
        }

        // Transform database data to application format
        const transformedSteps: Step[] = (stepsData || []).map(step => ({
          id: step.id,
          moduleId: step.module_id,
          stepNumber: step.step_number,
          title: step.title,
          description: step.description,
          slideUrl: step.slide_pdf_url,
          slide_pdf_url: step.slide_pdf_url,
          content: step.content,
          createdAt: step.created_at,
          updatedAt: step.updated_at,
          completion: step.step_completion[0] ? {
            id: step.step_completion[0].id,
            userId: step.step_completion[0].user_id,
            stepId: step.id,
            completed: step.step_completion[0].completed,
            completedAt: step.step_completion[0].completed_at,
            createdAt: step.step_completion[0].created_at,
            updatedAt: step.step_completion[0].updated_at
          } : undefined,
          note: step.step_notes[0] ? {
            id: step.step_notes[0].id,
            userId: step.step_notes[0].user_id,
            stepId: step.id,
            content: step.step_notes[0].content,
            createdAt: step.step_notes[0].created_at,
            updatedAt: step.step_notes[0].updated_at
          } : undefined
        }));

        if (isMounted) {
          setSteps(transformedSteps);

          // Calculate module progress
          const completedSteps = transformedSteps.filter(step => step.completion?.completed).length;
          const totalSteps = transformedSteps.length;
          const progressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
          
          // Find next incomplete step
          const nextIncompleteStep = transformedSteps.find(step => !step.completion?.completed);

          const progress: ModuleProgress = {
            moduleId,
            totalSteps,
            completedSteps,
            progressPercentage,
            isCompleted: completedSteps === totalSteps && totalSteps > 0,
            nextStep: nextIncompleteStep ? {
              stepId: nextIncompleteStep.id,
              stepNumber: nextIncompleteStep.stepNumber,
              title: nextIncompleteStep.title
            } : undefined
          };

          setModuleProgress(progress);

          // Set current step to first incomplete step or first step
          const currentIndex = nextIncompleteStep 
            ? transformedSteps.findIndex(step => step.id === nextIncompleteStep.id)
            : 0;
          setCurrentStepIndex(Math.max(0, currentIndex));
        }

      } catch (err) {
        console.error('Error loading module data:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load module data');
        }
      } finally {
        if (isMounted) {
          setIsLoadingSteps(false);
        }
      }
    };

    // Check presentation sync capabilities
    const checkPresentationCapabilities = async () => {
      if (!moduleId) {
        setIsCheckingAuth(false);
        return;
      }

      try {
        setIsCheckingAuth(true);
        
        // Check if module supports sync
        const syncSupport = await moduleSupportsSync(moduleId);
        console.log('📊 Sync support result:', syncSupport);
        setSupportsSync(syncSupport);

      } catch (error) {
        console.error('Error checking presentation capabilities:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    loadModuleData();
    checkPresentationCapabilities();

    return () => {
      isMounted = false;
    };
  }, [moduleId, user?.id]);

  // Handle step navigation
  const handleStepNavigation = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? Math.max(0, currentStepIndex - 1)
      : Math.min(steps.length - 1, currentStepIndex + 1);
    
    setCurrentStepIndex(newIndex);
  };

  // Handle step selection from progress bar
  const handleStepClick = (stepNumber: number) => {
    const stepIndex = steps.findIndex(step => step.stepNumber === stepNumber);
    if (stepIndex !== -1) {
      setCurrentStepIndex(stepIndex);
    }
  };

  // Handle step switch by ID (for instructor dropdown)
  const handleStepSwitch = (stepIdentifier: string) => {
    console.log('🔄 ModuleDetail handleStepSwitch called with stepIdentifier:', stepIdentifier);
    
    // Check if it's a step ID (UUID format) or session name format
    let stepIndex = -1;
    
    if (stepIdentifier.includes('Step ')) {
      // It's a session name format like "Step 1: Introduction"
      const stepMatch = stepIdentifier.match(/Step (\d+):/);
      if (stepMatch) {
        const stepNumber = parseInt(stepMatch[1]);
        console.log('🔄 Parsed step number:', stepNumber);
        stepIndex = steps.findIndex(step => step.stepNumber === stepNumber);
        console.log('🔄 Found step index:', stepIndex, 'for step number:', stepNumber);
      }
    } else {
      // It's a step ID (UUID format)
      stepIndex = steps.findIndex(step => step.id === stepIdentifier);
      console.log('🔄 Found step index:', stepIndex, 'for stepId:', stepIdentifier);
    }
    
    if (stepIndex !== -1) {
      console.log('🔄 Setting currentStepIndex to:', stepIndex);
      setCurrentStepIndex(stepIndex);
    } else {
      console.log('❌ Step not found with identifier:', stepIdentifier);
    }
  };

  // Handle step completion toggle
  const handleStepComplete = async (stepId: string, completed: boolean) => {
    try {
      // Update local state immediately for responsive UI
      setSteps(prevSteps => 
        prevSteps.map(step => 
          step.id === stepId 
            ? {
                ...step,
                completion: {
                  id: step.completion?.id || '',
                  userId: user!.id,
                  stepId,
                  completed,
                  completedAt: completed ? new Date().toISOString() : undefined,
                  createdAt: step.completion?.createdAt || new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                }
              }
            : step
        )
      );

      // Update module progress
      if (moduleProgress) {
        const newCompletedSteps = completed 
          ? moduleProgress.completedSteps + 1 
          : moduleProgress.completedSteps - 1;
        
        const newProgressPercentage = Math.round((newCompletedSteps / moduleProgress.totalSteps) * 100);
        
        setModuleProgress({
          ...moduleProgress,
          completedSteps: newCompletedSteps,
          progressPercentage: newProgressPercentage,
          isCompleted: newCompletedSteps === moduleProgress.totalSteps
        });
      }

    } catch (error) {
      console.error('Error updating step completion:', error);
      // Revert local state on error
      setSteps(prevSteps => 
        prevSteps.map(step => 
          step.id === stepId 
            ? {
                ...step,
                completion: {
                  ...step.completion!,
                  completed: !completed
                }
              }
            : step
        )
      );
    }
  };

  // Handle PDF download (combining all step notes and slides)
  const handleDownloadPdf = async () => {
    if (!module || steps.length === 0) return;

    try {
      setIsDownloading(true);

      // Create a comprehensive PDF with all steps
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Add title page
      pdf.setFontSize(20);
      pdf.text(module.title, 20, 30);
      pdf.setFontSize(12);
      pdf.text(module.description, 20, 50);
      pdf.text(`${steps.length} Steps - ${moduleProgress?.progressPercentage}% Complete`, 20, 70);

      // Add each step's content and notes
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        
        pdf.addPage();
        pdf.setFontSize(16);
        pdf.text(`Step ${step.stepNumber}: ${step.title}`, 20, 30);
        
        pdf.setFontSize(12);
        pdf.text(step.description, 20, 50);
        
        if (step.note?.content) {
          // Convert HTML to plain text for PDF
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = step.note.content;
          const plainText = tempDiv.textContent || tempDiv.innerText || '';
          
          const lines = pdf.splitTextToSize(plainText, 170);
          pdf.text('Notes:', 20, 70);
          pdf.text(lines, 20, 85);
        }
      }

      pdf.save(`${module.title} - All Steps.pdf`);

    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  if (classLoading || isLoadingSteps) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner text="Loading module..." />
      </div>
    );
  }

  if (!classItem) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Class not found</h1>
        <p className="text-gray-600 mb-6">The class you're looking for doesn't exist or you don't have access to it.</p>
        <Link to="/dashboard" className="text-[#F98B3D] hover:text-[#e07a2c] underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Module not found</h1>
        <p className="text-gray-600 mb-6">The module you're looking for doesn't exist.</p>
        <Link to={`/classes/${classId}`} className="text-[#F98B3D] hover:text-[#e07a2c] underline">
          Return to Class
        </Link>
      </div>
    );
  }

  if (steps.length === 0 && !isLoadingSteps) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">No steps available</h1>
        <p className="text-gray-600 mb-6">This module doesn't have any steps configured yet.</p>
        <Link to={`/classes/${classId}`} className="text-[#F98B3D] hover:text-[#e07a2c] underline">
          Return to Class
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Warning Modal */}
      {showNavigationWarning && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertTriangle className="h-6 w-6 text-yellow-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Unsaved Changes
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        You have unsaved notes. Your changes will be lost if you leave this page.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleConfirmNavigation}
                >
                  Leave anyway
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F98B3D] sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleCancelNavigation}
                >
                  Stay on this page
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Navigation */}
      <nav className="mb-6">
        <Link 
          onClick={handleBackClick}
          to={`/classes/${classId}`}
          className="inline-flex items-center text-[#F98B3D] hover:text-[#e07a2c] font-medium"
        >
          <ChevronLeft size={16} className="mr-1" />
          Back to {classItem.title}
        </Link>
      </nav>
      
      {/* Module Header */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-[#F98B3D] text-white w-12 h-12 rounded-full flex items-center justify-center mr-4">
                <span className="font-bold">{module.order}</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{module.title}</h1>
                <p className="text-gray-600 mt-1">{module.description}</p>
                {moduleProgress && (
                  <p className="text-sm text-gray-500 mt-2">
                    {moduleProgress.completedSteps} of {moduleProgress.totalSteps} steps completed
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                onClick={handleDownloadPdf}
                isLoading={isDownloading}
                variant="outline"
                leftIcon={<Download size={16} />}
              >
                Download All Steps
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert
          type="error"
          title="Error"
          message={error}
          onDismiss={() => setError(null)}
          className="mb-6"
        />
      )}

      {/* Module Progress Bar */}
      {moduleProgress && (
        <ModuleProgressBar
          progress={moduleProgress}
          currentStepNumber={currentStep?.stepNumber}
          onStepClick={handleStepClick}
          className="mb-6"
        />
      )}

      {/* Current Step Content */}
      {currentStep && (
        <StepViewer
          step={currentStep}
          moduleId={moduleId!}
          classId={classId!}
          isCurrentStep={true}
          isCompleted={currentStep.completion?.completed || false}
          supportsSync={supportsSync}
          onStepComplete={handleStepComplete}
          onNavigate={handleStepNavigation}
          canNavigatePrev={currentStepIndex > 0}
          canNavigateNext={currentStepIndex < steps.length - 1}
          onStepSwitch={handleStepSwitch}
        />
      )}
    </div>
  );
};

export default ModuleDetail;