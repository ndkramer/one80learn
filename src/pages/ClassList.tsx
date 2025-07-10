import React, { useState, useMemo } from 'react';
import { useClass } from '../utils/classContext';
import ClassCard from '../components/ClassCard';
import { Grid, List, Search, SlidersHorizontal } from 'lucide-react';
import Button from '../components/Button';

type ViewMode = 'grid' | 'list';
type SortOption = 'date-asc' | 'date-desc' | 'title-asc' | 'title-desc';

interface FilterOptions {
  search: string;
  instructor: string;
}

const ClassList: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    instructor: ''
  });
  const { enrolledClasses, isLoading } = useClass();

  // Get unique instructor names for filter dropdown
  const instructors = useMemo(() => {
    return Array.from(new Set(enrolledClasses.map(c => c.instructor_id)));
  }, [enrolledClasses]);

  // Apply filters and sorting
  const filteredAndSortedClasses = useMemo(() => {
    return enrolledClasses
      .filter(classItem => {
        const matchesSearch = filters.search === '' ||
          classItem.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          classItem.description.toLowerCase().includes(filters.search.toLowerCase());
        
        const matchesInstructor = filters.instructor === '' ||
          classItem.instructor_id === filters.instructor;
        
        return matchesSearch && matchesInstructor;
      })
      .sort((a, b) => {
        switch (sortOption) {
          case 'date-asc':
            return new Date(a.schedule_data?.startDate || '').getTime() - new Date(b.schedule_data?.startDate || '').getTime();
          case 'date-desc':
            return new Date(b.schedule_data?.startDate || '').getTime() - new Date(a.schedule_data?.startDate || '').getTime();
          case 'title-asc':
            return a.title.localeCompare(b.title);
          case 'title-desc':
            return b.title.localeCompare(a.title);
          default:
            return 0;
        }
      });
  }, [enrolledClasses, filters, sortOption]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Classes</h1>
          <p className="text-gray-600">
            Browse all your enrolled classes and continue your learning journey.
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'outline'}
            onClick={() => setViewMode('grid')}
            leftIcon={<Grid size={16} />}
          >
            Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'outline'}
            onClick={() => setViewMode('list')}
            leftIcon={<List size={16} />}
          >
            List
          </Button>
          <Button
            variant={showFilters ? 'primary' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            leftIcon={<SlidersHorizontal size={16} />}
          >
            Filters
          </Button>
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className={`bg-white rounded-lg shadow-sm border border-gray-100 mb-6 overflow-hidden transition-all duration-200 ${
        showFilters ? 'max-h-96' : 'max-h-0'
      }`}>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Search classes..."
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instructor
              </label>
              <select
                value={filters.instructor}
                onChange={(e) => setFilters(prev => ({ ...prev, instructor: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:border-transparent"
              >
                <option value="">All Instructors</option>
                {instructors.map(instructor => (
                  <option key={instructor} value={instructor}>
                    {instructor}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:border-transparent"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="title-asc">Title (A-Z)</option>
                <option value="title-desc">Title (Z-A)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Class List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedClasses.map((classItem) => (
            <ClassCard key={classItem.id} classItem={classItem} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedClasses.map((classItem) => (
            <div
              key={classItem.id}
              className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-start space-x-4">
                <div className="w-48 h-32 flex-shrink-0">
                  <img
                    src={classItem.thumbnailUrl}
                    alt={classItem.title}
                    className="w-full h-full object-cover rounded-md"
                  />
                </div>
                <div className="flex-grow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {classItem.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Instructor: {classItem.instructor}
                  </p>
                  <p className="text-sm text-gray-700 line-clamp-2 mb-4">
                    {classItem.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {classItem.modules.length} modules
                    </span>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/classes/${classItem.id}`)}
                    >
                      View Class
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {filteredAndSortedClasses.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">No classes found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};

export default ClassList;