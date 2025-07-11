import React, { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { useAuth } from './authContext';
import { Class } from '../types';

interface ClassContextType {
  enrolledClasses: Class[];
  isLoading: boolean;
  error: string | null;
  refreshClasses: () => Promise<void>;
  enrollInClass: (classId: string) => Promise<void>;
}

const ClassContext = createContext<ClassContextType | undefined>(undefined);

// React Query keys for consistent caching
const classKeys = {
  all: ['classes'] as const,
  enrolled: (userId?: string) => [...classKeys.all, 'enrolled', userId] as const,
  class: (classId: string) => [...classKeys.all, 'class', classId] as const,
};

// Optimized data fetching functions
const fetchEnrolledClasses = async (userId: string): Promise<Class[]> => {
  console.log('Fetching enrolled classes for user:', userId);
  
  // Get user's enrollments
  const { data: enrollments, error: enrollmentError } = await supabase
    .from('enrollments')
    .select('class_id')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (enrollmentError) throw enrollmentError;

  if (!enrollments || enrollments.length === 0) {
    console.log('No enrollments found for user');
    return [];
  }

  const classIds = enrollments.map(e => e.class_id);
  console.log('Fetching class details for IDs:', classIds);
  
  // Get class details with modules and resources
  const { data: classes, error: classesError } = await supabase
    .from('classes')
    .select(`
      id,
      title,
      description,
      instructor_id,
      thumbnail_url,
      instructor_image,
      instructor_bio,
      schedule_data,
      modules (
        id,
        title,
        description,
        slide_pdf_url,
        order,
        resources (
          id,
          title,
          type,
          url,
          description
        )
      )
    `)
    .in('id', classIds)
    .order('schedule_data->startDate', { ascending: false });

  if (classesError) throw classesError;

  // Transform data to match our interface
  const formattedClasses = classes?.map(c => ({
    id: c.id,
    title: c.title,
    description: c.description,
    instructor_id: c.instructor_id,
    instructor: 'Nick Kramer', // Default instructor name
    thumbnailUrl: c.thumbnail_url,
    instructorImage: c.instructor_image,
    instructorBio: c.instructor_bio,
    schedule_data: c.schedule_data,
    modules: c.modules?.map(m => ({
      id: m.id,
      title: m.title,
      description: m.description,
      slide_pdf_url: m.slide_pdf_url,
      order: m.order,
      resources: m.resources || []
    })) || []
  })) || [];

  console.log('Processed enrolled classes:', formattedClasses);
  return formattedClasses;
};

const enrollUserInClass = async ({ userId, classId }: { userId: string; classId: string }) => {
  console.log('Enrolling user in class:', { userId, classId });
  
  const { error } = await supabase
    .from('enrollments')
    .insert({
      user_id: userId,
      class_id: classId,
      status: 'active'
    });

  if (error) throw error;
  return { userId, classId };
};

export function ClassProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Use React Query for enrolled classes
  const {
    data: enrolledClasses = [],
    isLoading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: classKeys.enrolled(user?.id),
    queryFn: () => fetchEnrolledClasses(user!.id),
    enabled: !!user?.id && isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Enrollment mutation with optimistic updates
  const enrollMutation = useMutation({
    mutationFn: enrollUserInClass,
    onSuccess: (data) => {
      // Invalidate and refetch enrolled classes after successful enrollment
      queryClient.invalidateQueries({ queryKey: classKeys.enrolled(data.userId) });
    },
    onError: (error) => {
      console.error('Enrollment failed:', error);
    }
  });

  const refreshClasses = async () => {
    if (user?.id) {
      await refetch();
    }
  };

  const enrollInClass = async (classId: string) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    await enrollMutation.mutateAsync({ 
      userId: user.id, 
      classId 
    });
  };

  const value: ClassContextType = {
    enrolledClasses,
    isLoading: isLoading || enrollMutation.isPending,
    error: queryError?.message || enrollMutation.error?.message || null,
    refreshClasses,
    enrollInClass
  };

  return <ClassContext.Provider value={value}>{children}</ClassContext.Provider>;
}

export function useClass() {
  const context = useContext(ClassContext);
  if (context === undefined) {
    throw new Error('useClass must be used within a ClassProvider');
  }
  return context;
}