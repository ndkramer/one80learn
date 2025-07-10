import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../utils/authContext';
import { useClass } from '../utils/classContext';
import ClassCard from '../components/ClassCard';
import { ArrowRight } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { enrolledClasses, isLoading, error } = useClass();
  
  // Sort classes by date and take the first 3
  const featuredClasses = enrolledClasses
    .sort((a, b) => {
      const dateA = new Date(a.schedule_data?.startDate || '');
      const dateB = new Date(b.schedule_data?.startDate || '');
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 3);

  console.log('Dashboard - User:', user);
  console.log('Dashboard - Enrolled Classes:', enrolledClasses);
  console.log('Dashboard - Loading:', isLoading);
  console.log('Dashboard - Error:', error);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-medium text-red-600 mb-4">Error loading classes</h2>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome section */}
      <div className="bg-gray-100 p-6 mb-8 -mx-6 -mt-6 lg:-mx-8">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-gray-900 text-2xl md:text-3xl font-bold mb-2 text-center">
            Welcome back {user?.name}!
          </h1>
          <p className="text-gray-600 mb-4 text-center">
            Continue your learning journey. You have access to {enrolledClasses.length} classes.
          </p>
        </div>
      </div>
      
      {/* Featured classes */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Your Classes</h2>
          {enrolledClasses.length > 3 && (
            <Link 
              to="/classes" 
              className="text-[#F98B3D] hover:text-[#e07a2c] text-sm font-medium flex items-center"
            >
              View All
              <ArrowRight size={14} className="ml-1" />
            </Link>
          )}
        </div>
        
        {featuredClasses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredClasses.map((classItem) => (
              <ClassCard key={classItem.id} classItem={classItem} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <p className="text-gray-600">You are not enrolled in any classes yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;