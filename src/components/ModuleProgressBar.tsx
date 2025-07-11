import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';
import { ModuleProgress } from '../types';

interface ModuleProgressBarProps {
  progress: ModuleProgress;
  currentStepNumber?: number;
  onStepClick?: (stepNumber: number) => void;
  className?: string;
}

export const ModuleProgressBar: React.FC<ModuleProgressBarProps> = ({
  progress,
  currentStepNumber,
  onStepClick,
  className = ''
}) => {
  const { totalSteps, completedSteps, progressPercentage } = progress;

  // Generate array of step numbers for rendering
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  const getStepStatus = (stepNumber: number) => {
    if (stepNumber <= completedSteps) return 'completed';
    if (stepNumber === currentStepNumber) return 'current';
    return 'pending';
  };

  const getStepIcon = (stepNumber: number) => {
    const status = getStepStatus(stepNumber);
    
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-white" />;
      case 'current':
        return null;
      default:
        return <Circle className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStepClasses = (stepNumber: number) => {
    const status = getStepStatus(stepNumber);
    const baseClasses = 'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200';
    
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-[#F98B3D] border-[#F98B3D] hover:bg-[#e07a2c] hover:border-[#e07a2c] cursor-pointer`;
      case 'current':
        return `${baseClasses} bg-transparent border-transparent`;
      default:
        return `${baseClasses} bg-white border-gray-300 hover:border-gray-400 ${onStepClick ? 'cursor-pointer' : ''}`;
    }
  };

  const getConnectorClasses = (stepNumber: number) => {
    const isCompleted = stepNumber <= completedSteps;
    return `flex-1 h-1 mx-2 rounded-full transition-all duration-300 ${
      isCompleted ? 'bg-[#F98B3D]' : 'bg-gray-200'
    }`;
  };

  const handleStepClick = (stepNumber: number) => {
    if (onStepClick && (stepNumber <= completedSteps + 1)) {
      onStepClick(stepNumber);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Module Progress</h3>
          <p className="text-sm text-gray-600">
            {completedSteps} of {totalSteps} steps completed
          </p>
        </div>
        <div className="flex items-center">
          <div className="text-right mr-3">
            <div className="text-2xl font-bold text-[#F98B3D]">{progressPercentage}%</div>
            <div className="text-xs text-gray-500">Complete</div>
          </div>
          {progress.nextStep && (
            <button
              onClick={() => handleStepClick(progress.nextStep!.stepNumber)}
              className="bg-[#F98B3D] hover:bg-[#e07a2c] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:ring-opacity-50"
              aria-label={`Continue to ${progress.nextStep.title}`}
            >
              Continue
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-500">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-[#F98B3D] h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
            role="progressbar"
            aria-valuenow={progressPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Module progress: ${progressPercentage}% complete`}
          />
        </div>
      </div>

      {/* Step Indicators */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {steps.map((stepNumber, index) => (
            <React.Fragment key={stepNumber}>
              {/* Step Circle */}
              <div className="relative flex flex-col items-center">
                <button
                  onClick={() => handleStepClick(stepNumber)}
                  className={getStepClasses(stepNumber)}
                  disabled={!onStepClick || stepNumber > completedSteps + 1}
                  aria-label={`Step ${stepNumber}${
                    getStepStatus(stepNumber) === 'completed' ? ' (completed)' : ''
                  }${getStepStatus(stepNumber) === 'current' ? ' (current)' : ''}`}
                >
                  {getStepIcon(stepNumber)}
                </button>
                

              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className={getConnectorClasses(stepNumber)} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>



      {/* Accessibility Screen Reader Info */}
      <div className="sr-only">
        Module progress: {completedSteps} out of {totalSteps} steps completed ({progressPercentage}% complete).
        {progress.nextStep && ` Next step: ${progress.nextStep.title}`}
      </div>
    </div>
  );
};

export default ModuleProgressBar; 