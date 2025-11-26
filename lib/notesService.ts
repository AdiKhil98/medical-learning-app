import { supabase } from './supabase';
import { logger } from '@/utils/logger';

export interface UserNote {
  id: string;
  user_id: string;
  lesson_id: string;
  lesson_title: string;
  note_content: string;
  created_at: string;
  updated_at: string;
}

/**
 * Save or update a note for a specific lesson section
 */
export async function saveNote(
  userId: string,
  lessonId: string,
  lessonTitle: string,
  noteContent: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if a note already exists for this user and lesson
    const { data: existingNote, error: fetchError } = await supabase
      .from('user_notes')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned", which is fine
      logger.error('Error checking existing note:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (existingNote) {
      // Update existing note
      const { error: updateError } = await supabase
        .from('user_notes')
        .update({
          note_content: noteContent,
          lesson_title: lessonTitle,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingNote.id);

      if (updateError) {
        logger.error('Error updating note:', updateError);
        return { success: false, error: updateError.message };
      }
    } else {
      // Insert new note
      const { error: insertError } = await supabase
        .from('user_notes')
        .insert({
          user_id: userId,
          lesson_id: lessonId,
          lesson_title: lessonTitle,
          note_content: noteContent,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        logger.error('Error inserting note:', insertError);
        return { success: false, error: insertError.message };
      }
    }

    return { success: true };
  } catch (error) {
    logger.error('Error saving note:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Load a note for a specific lesson section
 */
export async function loadNote(
  userId: string,
  lessonId: string
): Promise<{ note: UserNote | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('user_notes')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error loading note:', error);
      return { note: null, error: error.message };
    }

    return { note: data as UserNote | null };
  } catch (error) {
    logger.error('Error loading note:', error);
    return { note: null, error: String(error) };
  }
}

/**
 * Delete a note for a specific lesson section
 */
export async function deleteNote(
  userId: string,
  lessonId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_notes')
      .delete()
      .eq('user_id', userId)
      .eq('lesson_id', lessonId);

    if (error) {
      logger.error('Error deleting note:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    logger.error('Error deleting note:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Load all notes for a specific user
 */
export async function loadAllNotes(
  userId: string
): Promise<{ notes: UserNote[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('user_notes')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      logger.error('Error loading all notes:', error);
      return { notes: [], error: error.message };
    }

    return { notes: (data as UserNote[]) || [] };
  } catch (error) {
    logger.error('Error loading all notes:', error);
    return { notes: [], error: String(error) };
  }
}
