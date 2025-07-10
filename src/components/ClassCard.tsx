import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Class } from '../types';
import { ArrowRight } from 'lucide-react';

interface ClassCardProps {
  classItem: Class;
}

const ClassCard: React.FC<ClassCardProps> = ({ classItem }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/classes/${classItem.id}`);
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 cursor-pointer"
      onClick={handleClick}
    >
      <div className="h-52 overflow-hidden relative">
        <img 
          src={classItem.thumbnailUrl} 
          alt={classItem.title} 
          className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
          <h3 className="text-white font-bold text-lg">{classItem.title}</h3>
        </div>
      </div>
      <div className="p-4 flex flex-col h-[220px]">
        <p className="text-gray-800 line-clamp-4">{classItem.description}</p>
        <div className="mt-auto pt-4 flex justify-between items-center">
          <span className="text-sm text-gray-500">{classItem.modules.length} modules</span>
          <button 
            className="inline-flex items-center px-3 py-1.5 text-sm bg-[#F98B3D] text-white rounded hover:bg-[#e07a2c] transition-colors duration-200"
          >
            <span>View Class</span>
            <ArrowRight size={14} className="ml-1.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassCard;