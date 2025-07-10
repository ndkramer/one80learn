import React, { createContext, useContext, useState, useEffect } from 'react';
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

export function ClassProvider({ children }: { children: React.ReactNode }) {
  const [enrolledClasses, setEnrolledClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      loadEnrolledClasses();
    } else {
      setEnrolledClasses([]);
      setIsLoading(false);
    }
  }, [isAuthenticated, user, authLoading]);

  const loadEnrolledClasses = async () => {
    try {
      setIsLoading(true);
      console.log('ClassProvider - Starting to load enrolled classes');
      
      if (!user) {
        console.log('ClassProvider - No authenticated user found');
        setEnrolledClasses([]);
        return;
      }

      console.log('ClassProvider - Fetching enrollments for user:', user.id);
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('class_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      console.log('ClassProvider - Raw enrollments data:', enrollments);
      console.log('ClassProvider - Enrollment error:', enrollmentError);
      if (enrollmentError) throw enrollmentError;

      if (!enrollments || enrollments.length === 0) {
        console.log('ClassProvider - No enrollments found for user');
        setEnrolledClasses([]);
        return;
      }

      const classIds = enrollments.map(e => e.class_id);
      console.log('ClassProvider - Extracted class IDs:', classIds);
      
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

      console.log('ClassProvider - Classes query executed');
      console.log('ClassProvider - Classes response:', { classes, error: classesError });
      if (classesError) throw classesError;

      // Map the database response to our Class interface
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

      console.log('ClassProvider - Processed classes:', formattedClasses);
      setEnrolledClasses(formattedClasses);
      
    } catch (err) {
      console.error('Error loading classes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load classes');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshClasses = async () => {
    if (isAuthenticated && user) {
      await loadEnrolledClasses();
    }
  };

  const enrollInClass = async (classId: string) => {
    try {
      setIsLoading(true);

      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('ClassProvider - Enrolling user in class:', { userId: user.id, classId });
      const { error } = await supabase
        .from('enrollments')
        .insert({
          user_id: user.id,
          class_id: classId,
          status: 'active'
        });

      console.log('ClassProvider - Enrollment result:', { error });
      if (error) throw error;

      await loadEnrolledClasses();
    } catch (err) {
      console.error('Error enrolling in class:', err);
      setError(err instanceof Error ? err.message : 'Failed to enroll in class');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    enrolledClasses,
    isLoading,
    error,
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