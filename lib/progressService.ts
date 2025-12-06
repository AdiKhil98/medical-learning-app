import { supabase } from './supabase';
import { logger } from '@/utils/logger';

export interface UserLessonProgress {
  id: string;
  user_id: string;
  lesson_slug: string;
  section_index: number;
  completed_at: string;
  updated_at: string;
}

export interface LessonProgressStats {
  lessonSlug: string;
  totalSections: number;
  completedSections: number;
  completedIndices: number[];
  percentage: number;
}

/**
 * Save/mark a section as complete for a specific lesson
 * Uses UPSERT to avoid duplicates
 */
export async function saveProgress(
  userId: string,
  lessonSlug: string,
  sectionIndex: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_lesson_progress')
      .upsert({
        user_id: userId,
        lesson_slug: lessonSlug,
        section_index: sectionIndex,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,lesson_slug,section_index',
        ignoreDuplicates: false, // Update the timestamp if already exists
      });

    if (error) {
      logger.error('Error saving progress:', error);
      return { success: false, error: error.message };
    }

    logger.info(`✅ Saved progress: user=${userId}, lesson=${lessonSlug}, section=${sectionIndex}`);
    return { success: true };
  } catch (error) {
    logger.error('Error saving progress:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Load all completed section indices for a specific lesson
 * Returns an array of section indices (e.g., [0, 2, 5])
 */
export async function loadProgress(
  userId: string,
  lessonSlug: string
): Promise<{ completedIndices: number[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('user_lesson_progress')
      .select('section_index')
      .eq('user_id', userId)
      .eq('lesson_slug', lessonSlug)
      .order('section_index', { ascending: true });

    if (error) {
      logger.error('Error loading progress:', error);
      return { completedIndices: [], error: error.message };
    }

    const indices = (data || []).map(item => item.section_index);
    logger.info(`📚 Loaded progress for ${lessonSlug}: ${indices.length} sections completed`);
    return { completedIndices: indices };
  } catch (error) {
    logger.error('Error loading progress:', error);
    return { completedIndices: [], error: String(error) };
  }
}

/**
 * Remove/unmark a section as complete
 */
export async function removeProgress(
  userId: string,
  lessonSlug: string,
  sectionIndex: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_lesson_progress')
      .delete()
      .eq('user_id', userId)
      .eq('lesson_slug', lessonSlug)
      .eq('section_index', sectionIndex);

    if (error) {
      logger.error('Error removing progress:', error);
      return { success: false, error: error.message };
    }

    logger.info(`🗑️ Removed progress: user=${userId}, lesson=${lessonSlug}, section=${sectionIndex}`);
    return { success: true };
  } catch (error) {
    logger.error('Error removing progress:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get progress statistics for a specific lesson
 */
export async function getProgressStats(
  userId: string,
  lessonSlug: string,
  totalSections: number
): Promise<LessonProgressStats> {
  try {
    const { completedIndices } = await loadProgress(userId, lessonSlug);
    const completedCount = completedIndices.length;
    const percentage = totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0;

    return {
      lessonSlug,
      totalSections,
      completedSections: completedCount,
      completedIndices,
      percentage,
    };
  } catch (error) {
    logger.error('Error getting progress stats:', error);
    return {
      lessonSlug,
      totalSections,
      completedSections: 0,
      completedIndices: [],
      percentage: 0,
    };
  }
}

/**
 * Clear all progress for a specific lesson
 */
export async function clearLessonProgress(
  userId: string,
  lessonSlug: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_lesson_progress')
      .delete()
      .eq('user_id', userId)
      .eq('lesson_slug', lessonSlug);

    if (error) {
      logger.error('Error clearing lesson progress:', error);
      return { success: false, error: error.message };
    }

    logger.info(`🧹 Cleared all progress for lesson: ${lessonSlug}`);
    return { success: true };
  } catch (error) {
    logger.error('Error clearing lesson progress:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get aggregated progress for all child lessons under a parent section
 * This is used to calculate the progress bar for parent sections/subsections
 *
 * For example, if a subsection has 10 child lessons and user completed:
 * - Lesson 1: 5/5 sections (100%)
 * - Lesson 2: 3/8 sections (37.5%)
 * - Lessons 3-10: 0% each
 *
 * The aggregate would be: (100 + 37.5 + 0 + ... + 0) / 10 = 13.75%
 */
export async function getAggregateProgressForParent(
  userId: string,
  childLessons: Array<{ slug: string; totalSections: number }>
): Promise<{ percentage: number; completedLessons: number; totalLessons: number }> {
  try {
    if (childLessons.length === 0) {
      return { percentage: 0, completedLessons: 0, totalLessons: 0 };
    }

    let totalPercentage = 0;
    let fullyCompletedCount = 0;

    for (const lesson of childLessons) {
      const stats = await getProgressStats(userId, lesson.slug, lesson.totalSections);
      totalPercentage += stats.percentage;

      if (stats.percentage === 100) {
        fullyCompletedCount++;
      }
    }

    const avgPercentage = Math.round(totalPercentage / childLessons.length);

    logger.info(`📊 Aggregate progress: ${avgPercentage}% (${fullyCompletedCount}/${childLessons.length} lessons complete)`);

    return {
      percentage: avgPercentage,
      completedLessons: fullyCompletedCount,
      totalLessons: childLessons.length,
    };
  } catch (error) {
    logger.error('Error calculating aggregate progress:', error);
    return { percentage: 0, completedLessons: 0, totalLessons: 0 };
  }
}

/**
 * Get all progress for a user (for analytics/dashboard)
 */
export async function getAllUserProgress(
  userId: string
): Promise<{ progress: UserLessonProgress[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('user_lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      logger.error('Error loading all user progress:', error);
      return { progress: [], error: error.message };
    }

    return { progress: (data as UserLessonProgress[]) || [] };
  } catch (error) {
    logger.error('Error loading all user progress:', error);
    return { progress: [], error: String(error) };
  }
}
