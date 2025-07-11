import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Module, Resource } from '../types';
import { FileText, Link as LinkIcon, FileSpreadsheet, FileVideo, ArrowRight } from 'lucide-react';
import { handleKeyboardClick, announceToScreenReader, useUniqueId } from '../utils/accessibilityUtils';

interface ModuleCardProps {
  module: Module;
  classId: string;
}

// Memoize the resource icon function with accessibility
const getResourceIcon = (type: string, title: string) => {
  const iconProps = { className: "w-3 h-3", "aria-hidden": true as const };
  
  switch (type) {
    case 'pdf':
      return <FileText {...iconProps} className="w-3 h-3 text-red-500" />;
    case 'word':
      return <FileText {...iconProps} className="w-3 h-3 text-blue-500" />;
    case 'excel':
      return <FileSpreadsheet {...iconProps} className="w-3 h-3 text-green-500" />;
    case 'video':
      return <FileVideo {...iconProps} className="w-3 h-3 text-purple-500" />;
    default:
      return <LinkIcon {...iconProps} className="w-3 h-3 text-gray-500" />;
  }
};

// Helper to get resource type for screen readers
const getResourceTypeDescription = (type: string): string => {
  switch (type) {
    case 'pdf':
      return 'PDF document';
    case 'word':
      return 'Word document';
    case 'excel':
      return 'Excel spreadsheet';
    case 'video':
      return 'Video file';
    default:
      return 'Resource link';
  }
};

const ModuleCard: React.FC<ModuleCardProps> = React.memo(({ module, classId }) => {
  const navigate = useNavigate();
  const cardId = useUniqueId('module-card');
  const descriptionId = useUniqueId('module-desc');
  const resourcesId = useUniqueId('module-resources');

  const handleNavigation = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    navigate(`/classes/${classId}/modules/${module.id}`);
    announceToScreenReader(`Opening Module ${module.order}: ${module.title}`);
  }, [navigate, classId, module.id, module.order, module.title]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    handleKeyboardClick(e, handleNavigation);
  }, [handleNavigation]);

  const resourcesText = module.resources && module.resources.length > 0 
    ? `${module.resources.length} ${module.resources.length === 1 ? 'resource' : 'resources'} available`
    : 'No resources available';

  return (
    <article 
      className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200 focus-within:ring-2 focus-within:ring-[#F98B3D] focus-within:ring-opacity-50"
      aria-labelledby={cardId}
      aria-describedby={`${descriptionId} ${resourcesId}`}
    >
      {/* Module header */}
      <div className="flex items-center mb-2">
        <div 
          className="flex-shrink-0 bg-[#F98B3D] text-white w-8 h-8 rounded-full flex items-center justify-center mr-3"
          aria-hidden="true"
        >
          {module.order}
        </div>
        <h3 id={cardId} className="font-medium text-lg">
          Module {module.order}: {module.title}
        </h3>
      </div>
      
      {/* Module description */}
      <p id={descriptionId} className="text-gray-600 ml-11 mb-3">
        {module.description}
      </p>
      
      {/* Resource indicators */}
      {module.resources && module.resources.length > 0 && (
        <div className="ml-11 mb-3">
          <div 
            id={resourcesId}
            className="sr-only"
            aria-label={resourcesText}
          >
            Module resources: {module.resources.map(r => `${getResourceTypeDescription(r.type)} - ${r.title}`).join(', ')}
          </div>
          <div className="flex flex-wrap gap-2" aria-hidden="true">
            {module.resources.map((resource) => (
              <span
                key={resource.id}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                title={`${getResourceTypeDescription(resource.type)}: ${resource.title}`}
              >
                {getResourceIcon(resource.type, resource.title)}
                <span className="ml-1.5">{resource.title}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Action button */}
      <div className="mt-3 ml-11">
        <button 
          onClick={handleNavigation}
          onKeyDown={handleKeyDown}
          className="inline-flex items-center text-[#F98B3D] text-sm font-medium hover:text-[#e07a2c] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:ring-opacity-50 focus:ring-offset-2 rounded px-2 py-1"
          aria-label={`Open Module ${module.order}: ${module.title} - ${module.description}`}
          type="button"
        >
          <span>Open Module</span>
          <ArrowRight size={14} className="ml-1" aria-hidden="true" />
        </button>
      </div>
      
      {/* Hidden link for screen readers as alternative navigation */}
      <a
        href={`/classes/${classId}/modules/${module.id}`}
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-[#F98B3D] text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-white z-10"
        onClick={handleNavigation}
        aria-label={`Navigate to Module ${module.order}: ${module.title} - ${module.description}. ${resourcesText}`}
      >
        Go to Module {module.order}
      </a>
    </article>
  );
});

// Add display name for debugging
ModuleCard.displayName = 'ModuleCard';

export default ModuleCard;