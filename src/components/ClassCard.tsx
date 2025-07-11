import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Class } from '../types';
import { ArrowRight } from 'lucide-react';
import { handleKeyboardClick, announceToScreenReader, useUniqueId } from '../utils/accessibilityUtils';

interface ClassCardProps {
  classItem: Class;
}

const ClassCard: React.FC<ClassCardProps> = React.memo(({ classItem }) => {
  const navigate = useNavigate();
  const cardId = useUniqueId('class-card');
  const descriptionId = useUniqueId('class-desc');
  const moduleCountId = useUniqueId('module-count');

  const handleNavigation = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    navigate(`/classes/${classItem.id}`);
    announceToScreenReader(`Navigating to ${classItem.title} class page`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    handleKeyboardClick(e, handleNavigation);
  };

  const moduleText = `${classItem.modules.length} ${classItem.modules.length === 1 ? 'module' : 'modules'}`;

  return (
    <article
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 focus-within:ring-2 focus-within:ring-[#F98B3D] focus-within:ring-opacity-50"
      aria-labelledby={cardId}
      aria-describedby={`${descriptionId} ${moduleCountId}`}
    >
      {/* Image section with proper alt text */}
      <div className="h-52 overflow-hidden relative">
        <img 
          src={classItem.thumbnailUrl} 
          alt={`${classItem.title} course thumbnail`}
          className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
          loading="lazy"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <h3 
            id={cardId}
            className="text-white font-bold text-lg"
          >
            {classItem.title}
          </h3>
        </div>
      </div>

      {/* Content section */}
      <div className="p-4 flex flex-col h-[220px]">
        <p 
          id={descriptionId}
          className="text-gray-800 line-clamp-4 flex-grow"
        >
          {classItem.description}
        </p>
        
        <div className="mt-auto pt-4 flex justify-between items-center">
          <span 
            id={moduleCountId}
            className="text-sm text-gray-500"
            aria-label={`This class contains ${moduleText}`}
          >
            {moduleText}
          </span>
          
          {/* Single accessible link/button */}
          <button
            onClick={handleNavigation}
            onKeyDown={handleKeyDown}
            className="inline-flex items-center px-3 py-1.5 text-sm bg-[#F98B3D] text-white rounded hover:bg-[#e07a2c] focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:ring-opacity-50 focus:ring-offset-2 transition-colors duration-200"
            aria-label={`View ${classItem.title} class details`}
            type="button"
          >
            <span>View Class</span>
            <ArrowRight size={14} className="ml-1.5" aria-hidden="true" />
          </button>
        </div>
      </div>
      
      {/* Hidden link for screen readers as alternative navigation */}
      <a
        href={`/classes/${classItem.id}`}
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-[#F98B3D] text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-white z-10"
        onClick={handleNavigation}
        aria-label={`Navigate to ${classItem.title} class - ${classItem.description.substring(0, 100)}...`}
      >
        Go to {classItem.title}
      </a>
    </article>
  );
});

// Add display name for debugging
ClassCard.displayName = 'ClassCard';

export default ClassCard;