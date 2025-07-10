import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Module, Resource } from '../types';
import { FileText, Link as LinkIcon, FileSpreadsheet, FileVideo } from 'lucide-react';

interface ModuleCardProps {
  module: Module;
  classId: string;
}

const getResourceIcon = (type: string) => {
  switch (type) {
    case 'pdf':
      return <FileText className="w-3 h-3 text-red-500" />;
    case 'word':
      return <FileText className="w-3 h-3 text-blue-500" />;
    case 'excel':
      return <FileSpreadsheet className="w-3 h-3 text-green-500" />;
    case 'video':
      return <FileVideo className="w-3 h-3 text-purple-500" />;
    default:
      return <LinkIcon className="w-3 h-3 text-gray-500" />;
  }
};

const ModuleCard: React.FC<ModuleCardProps> = ({ module, classId }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/classes/${classId}/modules/${module.id}`);
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-center mb-2">
        <div className="flex-shrink-0 bg-[#F98B3D] text-white w-8 h-8 rounded-full flex items-center justify-center mr-3">
          {module.order}
        </div>
        <h3 className="font-medium text-lg">{module.title}</h3>
      </div>
      <p className="text-gray-600 ml-11 mb-3">{module.description}</p>
      
      {/* Resource Bar */}
      {module.resources && module.resources.length > 0 && (
        <div className="ml-11 mb-3 flex flex-wrap gap-2">
          {module.resources.map((resource) => (
            <span
              key={resource.id}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
            >
              {getResourceIcon(resource.type)}
              <span className="ml-1.5">{resource.title}</span>
            </span>
          ))}
        </div>
      )}
      
      <div className="mt-3 ml-11">
        <button 
          className="text-[#F98B3D] text-sm font-medium hover:text-[#e07a2c] transition-colors duration-200"
        >
          Open Module
        </button>
      </div>
    </div>
  );
};

export default ModuleCard;