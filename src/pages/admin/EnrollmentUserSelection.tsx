import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import Button from '../../components/Button';
import Alert from '../../components/Alert';
import { ArrowLeft, Search, Users, Save, UserCheck, UserX, Mail } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';

interface User {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
}

interface UserWithEnrollment extends User {
  isEnrolled: boolean;
  enrollmentId?: string;
}

const EnrollmentUserSelection: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [users, setUsers] = useState<UserWithEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (courseId) {
      loadCourseAndUsers();
    }
  }, [courseId]);

  const loadCourseAndUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load course details
      const { data: courseData, error: courseError } = await supabase
        .from('classes')
        .select('id, title, description')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Load all users using the edge function
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch users: ${errorText}`);
      }

      const authUsersData = await response.json();

      // Load current enrollments for this course
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('id, user_id')
        .eq('class_id', courseId)
        .eq('status', 'active');

      if (enrollmentsError) throw enrollmentsError;

      // Create a map of enrolled users
      const enrolledUserIds = new Set(enrollmentsData?.map(e => e.user_id) || []);
      const enrollmentMap = new Map(enrollmentsData?.map(e => [e.user_id, e.id]) || []);

      // Combine user data with enrollment status
      const usersWithEnrollment: UserWithEnrollment[] = authUsersData.users.map((user: any) => ({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.user_metadata?.name,
        created_at: user.created_at,
        isEnrolled: enrolledUserIds.has(user.id),
        enrollmentId: enrollmentMap.get(user.id)
      }));
      
      // Sort users by created_at date (newest first)
      usersWithEnrollment.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setUsers(usersWithEnrollment);

      // Initialize selected users with currently enrolled users
      setSelectedUsers(new Set(enrolledUserIds));

    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedUsers(new Set(users.map(u => u.id)));
  };

  const handleDeselectAll = () => {
    setSelectedUsers(new Set());
  };

  const handleSaveEnrollments = async () => {
    if (!courseId) return;

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      // Get current enrollments
      const currentlyEnrolled = new Set(users.filter(u => u.isEnrolled).map(u => u.id));
      const newlySelected = selectedUsers;

      // Users to enroll (selected but not currently enrolled)
      const usersToEnroll = Array.from(newlySelected).filter(userId => !currentlyEnrolled.has(userId));

      // Users to unenroll (currently enrolled but not selected)
      const usersToUnenroll = Array.from(currentlyEnrolled).filter(userId => !newlySelected.has(userId));

      // Enroll new users
      if (usersToEnroll.length > 0) {
        const enrollmentInserts = usersToEnroll.map(userId => ({
          user_id: userId,
          class_id: courseId,
          status: 'active'
        }));

        const { error: enrollError } = await supabase
          .from('enrollments')
          .insert(enrollmentInserts);

        if (enrollError) throw enrollError;
      }

      // Unenroll users (update status to 'dropped' instead of deleting)
      if (usersToUnenroll.length > 0) {
        const { error: unenrollError } = await supabase
          .from('enrollments')
          .update({ status: 'dropped' })
          .eq('class_id', courseId)
          .in('user_id', usersToUnenroll);

        if (unenrollError) throw unenrollError;
      }

      setSuccess(`Successfully updated enrollments: ${usersToEnroll.length} enrolled, ${usersToUnenroll.length} unenrolled`);
      
      // Reload data to reflect changes
      await loadCourseAndUsers();

    } catch (err) {
      console.error('Error saving enrollments:', err);
      setError(err instanceof Error ? err.message : 'Failed to save enrollments');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) ||
      user.full_name?.toLowerCase().includes(searchLower)
    );
  });

  const enrolledCount = Array.from(selectedUsers).length;
  const totalUsers = filteredUsers.length;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6">
        <Alert type="error" title="Error">
          Course not found
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/enrollments')}
          className="flex items-center text-[#F98B3D] hover:text-[#e07a2c] mb-4"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Courses
        </button>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Manage Enrollments for {course.title}
            </h1>
            <p className="text-gray-600">
              Select users to enroll in this course. {enrolledCount} of {totalUsers} users selected.
            </p>
          </div>
          <Button 
            onClick={handleSaveEnrollments} 
            isLoading={isSaving}
            leftIcon={<Save size={16} />}
          >
            Save Changes
          </Button>
        </div>

        {/* Search and bulk actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F98B3D] focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSelectAll}
              leftIcon={<UserCheck size={16} />}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              onClick={handleDeselectAll}
              leftIcon={<UserX size={16} />}
            >
              Deselect All
            </Button>
          </div>
        </div>

        {error && (
          <Alert type="error" title="Error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert type="success" title="Success" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Users list */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No users found
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`p-4 hover:bg-gray-50 transition-colors duration-200 ${
                    selectedUsers.has(user.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => handleUserToggle(user.id)}
                        className="h-4 w-4 text-[#F98B3D] focus:ring-[#F98B3D] border-gray-300 rounded"
                      />
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <Users size={20} className="text-gray-500" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.full_name || 'No name provided'}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail size={14} className="mr-1" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {user.isEnrolled && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Currently Enrolled
                        </span>
                      )}
                      <span className="text-sm text-gray-500">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnrollmentUserSelection;