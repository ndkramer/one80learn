import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import Button from '../../components/Button';
import Alert from '../../components/Alert';
import { Users, Search, BookOpen, ArrowRight } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  schedule_data: {
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    timeZone: string;
    location: string;
  };
  created_at: string;
  enrollment_count?: number;
}

const EnrollmentCourseList: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load courses with enrollment counts
      const { data: coursesData, error: coursesError } = await supabase
        .from('classes')
        .select(`
          id,
          title,
          description,
          thumbnail_url,
          schedule_data,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;

      // Get enrollment counts for each course
      const coursesWithCounts = await Promise.all(
        (coursesData || []).map(async (course) => {
          const { count, error: countError } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', course.id)
            .eq('status', 'active');

          if (countError) {
            console.error('Error getting enrollment count:', countError);
          }

          return {
            ...course,
            enrollment_count: count || 0
          };
        })
      );

      setCourses(coursesWithCounts);
    } catch (err) {
      console.error('Error loading courses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCourses = courses.filter(course => {
    const searchLower = searchQuery.toLowerCase();
    return (
      course.title.toLowerCase().includes(searchLower) ||
      course.description.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Course Enrollments</h1>
            <p className="text-gray-600">Select a course to manage student enrollments.</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:border-transparent"
          />
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6">
          <Alert
            type="error"
            title="Error"
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        </div>
      )}

      {/* Courses List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-6 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No courses found
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                className="p-6 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                onClick={() => navigate(`/admin/enrollments/${course.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 flex-shrink-0">
                      <img
                        className="h-16 w-16 rounded-lg object-cover"
                        src={course.thumbnail_url}
                        alt={course.title}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {course.description}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Users size={16} className="mr-1" />
                          <span>{course.enrollment_count} enrolled</span>
                        </div>
                        <div>
                          {new Date(course.schedule_data.startDate).toLocaleDateString()} - {new Date(course.schedule_data.endDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Button
                      variant="outline"
                      rightIcon={<ArrowRight size={16} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/enrollments/${course.id}`);
                      }}
                    >
                      Manage Enrollments
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EnrollmentCourseList;