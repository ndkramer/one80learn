import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from './authContext';
import { Note } from '../types';

interface NoteContextType {
  isLoading: boolean;
  error: string | null;
  getNoteForModule: (moduleId: string) => Promise<Note | null>;
  getAllUserNotes: () => Promise<Note[]>;
  saveNote: (moduleId: string, content: string) => Promise<any>;
}

const NoteContext = createContext<NoteContextType | undefined>(undefined);

export function NoteProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const getNoteForModule = useCallback(async (moduleId: string): Promise<Note | null> => {
    if (!user?.id) return null;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('notes')
        .select('*')
        .eq('module_id', moduleId)
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (data) {
        return {
          id: data.id,
          userId: data.user_id,
          moduleId: data.module_id,
          content: data.content,
          created_at: data.created_at,
          updated_at: data.updated_at
        };
      }

      return null;
    } catch (err) {
      console.error('Error in getNoteForModule:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching notes');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const saveNote = useCallback(async (moduleId: string, content: string) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      setIsLoading(true);
      setError(null);

      // Use upsert to handle both insert and update cases
      const { data, error } = await supabase
        .from('notes')
        .upsert({
          module_id: moduleId,
          user_id: user.id,
          content,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,module_id'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        return {
          id: data.id,
          userId: data.user_id,
          moduleId: data.module_id,
          content: data.content,
          created_at: data.created_at,
          updated_at: data.updated_at
        };
      }
      
      return note;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving the note');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const getAllUserNotes = useCallback(async (): Promise<Note[]> => {
    if (!user?.id) return [];

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id);

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      return (data || []).map(note => ({
        id: note.id,
        userId: note.user_id,
        moduleId: note.module_id,
        content: note.content,
        created_at: note.created_at,
        updated_at: note.updated_at
      }));
    } catch (err) {
      console.error('Error in getAllUserNotes:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching notes');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const value = {
    isLoading,
    error,
    getNoteForModule,
    getAllUserNotes,
    saveNote,
  };

  return (
    <NoteContext.Provider value={value}>
      {children}
    </NoteContext.Provider>
  );
}

export function useNotes() {
  const context = useContext(NoteContext);
  if (context === undefined) {
    throw new Error('useNotes must be used within a NoteProvider');
  }
  return context;
}