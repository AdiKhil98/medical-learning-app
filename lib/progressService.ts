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
 * Clears progress cache to ensure fresh calculations
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

    // Clear cache for this user so progress updates are reflected immediately
    clearProgressCache(userId);

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
 * Clears progress cache to ensure fresh calculations
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

    // Clear cache for this user so progress updates are reflected immediately
    clearProgressCache(userId);

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

// Cache for recursive progress calculations (5 minute TTL)
// Key format: "userId:sectionSlug"
const progressCache = new Map<string, { progress: number; timestamp: number }>();
const PROGRESS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clear progress cache for a specific user or all users
 */
export function clearProgressCache(userId?: string): void {
  if (userId) {
    // Clear only this user's cache entries
    const keysToDelete: string[] = [];
    progressCache.forEach((_, key) => {
      if (key.startsWith(`${userId}:`)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => progressCache.delete(key));
    logger.info(`🧹 Cleared progress cache for user ${userId}`);
  } else {
    progressCache.clear();
    logger.info('🧹 Cleared entire progress cache');
  }
}

/**
 * RECURSIVE HIERARCHICAL PROGRESS CALCULATION
 *
 * Calculates progress for a section by recursively traversing all descendants.
 * - If section is a leaf (has content): returns its direct completion percentage
 * - If section is a parent: returns average progress of all children (recursively)
 *
 * This creates cascading progress bars where parent sections show aggregate
 * progress of ALL descendants (not just immediate children).
 *
 * Example hierarchy:
 *   Sub-category (10%)
 *   ├── Section 1 (0%)
 *   │   └── Subsection 1 (0% - 10 lessons, none complete)
 *   ├── Section 2 (100%)
 *   │   └── Subsection 2 (100% - 10 lessons, all complete)
 *   └── ... (8 more sections at 0%)
 *
 * Sub-category shows 10% because (100 + 0 + 0 + ... + 0) / 10 = 10%
 *
 * PERFORMANCE: Results are cached for 5 minutes to avoid redundant calculations
 */
export async function getRecursiveProgressForSection(
  userId: string,
  sectionSlug: string,
  _visitedSlugs = new Set<string>() // Prevent infinite loops
): Promise<number> {
  try {
    // Prevent infinite recursion from circular references
    if (_visitedSlugs.has(sectionSlug)) {
      logger.warn(`Circular reference detected for section: ${sectionSlug}`);
      return 0;
    }
    _visitedSlugs.add(sectionSlug);

    // Check cache first (only for top-level calls, not recursive ones)
    const cacheKey = `${userId}:${sectionSlug}`;
    const now = Date.now();
    const cached = progressCache.get(cacheKey);

    if (cached && (now - cached.timestamp) < PROGRESS_CACHE_TTL) {
      logger.info(`💾 Cache hit for ${sectionSlug}: ${cached.progress}%`);
      return cached.progress;
    }

    // 1. Fetch the section
    const { data: section, error: sectionError } = await supabase
      .from('sections')
      .select('slug, content_improved')
      .eq('slug', sectionSlug)
      .maybeSingle();

    if (sectionError || !section) {
      logger.error(`Error fetching section ${sectionSlug}:`, sectionError);
      return 0;
    }

    // 2. Check if this is a LEAF node (has actual content)
    const hasContent = section.content_improved &&
      (typeof section.content_improved === 'object' || typeof section.content_improved === 'string');

    if (hasContent) {
      // LEAF NODE: Calculate direct progress
      try {
        let sections: any[] = [];
        const contentSource = section.content_improved;
        const contentString = typeof contentSource === 'string' ? contentSource : String(contentSource || '');

        if (contentString.startsWith('[') || contentString.startsWith('{')) {
          if (typeof contentSource === 'string') {
            sections = JSON.parse(contentSource);
          } else if (Array.isArray(contentSource)) {
            sections = contentSource;
          }
        } else {
          // Plain text - count as 1 section
          sections = [{ content: contentString }];
        }

        const totalSections = sections.filter(s => s.content && s.content.length > 0).length;

        if (totalSections > 0) {
          const stats = await getProgressStats(userId, sectionSlug, totalSections);
          logger.info(`📊 Leaf progress for ${sectionSlug}: ${stats.percentage}%`);

          // Cache the result
          progressCache.set(cacheKey, { progress: stats.percentage, timestamp: now });
          return stats.percentage;
        }

        // Cache zero progress
        progressCache.set(cacheKey, { progress: 0, timestamp: now });
        return 0;
      } catch (error) {
        logger.error(`Error parsing content for ${sectionSlug}:`, error);
        return 0;
      }
    }

    // 3. PARENT NODE: Fetch children
    const { data: children, error: childrenError } = await supabase
      .from('sections')
      .select('slug')
      .eq('parent_slug', sectionSlug)
      .order('display_order', { ascending: true });

    if (childrenError) {
      logger.error(`Error fetching children for ${sectionSlug}:`, childrenError);
      return 0;
    }

    if (!children || children.length === 0) {
      // No children and no content = empty parent
      logger.info(`📂 Empty parent node: ${sectionSlug}`);
      return 0;
    }

    // 4. RECURSIVELY calculate progress for each child
    const childProgressValues = await Promise.all(
      children.map(child =>
        getRecursiveProgressForSection(userId, child.slug, new Set(_visitedSlugs))
      )
    );

    // 5. Calculate average progress across all children
    const totalProgress = childProgressValues.reduce((sum, progress) => sum + progress, 0);
    const averageProgress = Math.round(totalProgress / children.length);

    logger.info(`📊 Parent progress for ${sectionSlug}: ${averageProgress}% (from ${children.length} children)`);

    // Cache the result
    progressCache.set(cacheKey, { progress: averageProgress, timestamp: now });
    return averageProgress;

  } catch (error) {
    logger.error(`Error in recursive progress calculation for ${sectionSlug}:`, error);
    return 0;
  }
}
