import { supabase } from './supabase';
import { logger } from '@/utils/logger';
import { SecureLogger } from './security';
import { createCache, CacheManager } from './cacheManager';
import { withDeduplication, generateRequestKey } from './requestDeduplication';

// Enhanced Section interface with all three content formats
export interface MedicalSection {
  id: string;
  slug: string;
  title: string;
  parent_slug: string | null;
  description: string | null;
  type: 'folder' | 'file-text' | 'markdown';
  icon: string;
  color: string;
  display_order: number;
  category?: string;
  image_url?: string;
  content_json?: any[];
  content_improved?: any[];
  content_html?: string;
  content_details?: string;
  has_content?: boolean;
  hierarchy_level?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ContentSection {
  type: string;
  title?: string;
  content?: string;
  term?: string;
  definition?: string;
  items?: string[];
  clinical_pearl?: string;
  clinical_relevance?: string;
}

export interface SearchResult {
  section: MedicalSection;
  matchType: 'title' | 'description' | 'content';
  snippet?: string;
}

// Cache configuration with memory limits and automatic cleanup
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const sectionCache: CacheManager<MedicalSection> = createCache({
  maxSize: 100, // Max 100 cached sections
  ttl: CACHE_DURATION,
  cleanupInterval: 5 * 60 * 1000, // Cleanup every 5 minutes
});

const listCache: CacheManager<MedicalSection[]> = createCache({
  maxSize: 50, // Max 50 cached lists
  ttl: CACHE_DURATION,
  cleanupInterval: 5 * 60 * 1000,
});

class MedicalContentService {
  /**
   * Sanitize search input to prevent SQL injection and XSS
   * @param query - Raw search query from user
   * @returns Sanitized query string or null if invalid
   */
  private sanitizeSearchQuery(query: string): string | null {
    // Check if query exists and is a string
    if (typeof query !== 'string') {
      SecureLogger.warn('Invalid search query type:', typeof query);
      return null;
    }

    // Trim whitespace
    let sanitized = query.trim();

    // Reject empty queries
    if (sanitized.length === 0) {
      return null;
    }

    // Enforce maximum length (prevent DoS)
    const MAX_QUERY_LENGTH = 100;
    if (sanitized.length > MAX_QUERY_LENGTH) {
      SecureLogger.warn(`Search query too long: ${sanitized.length} characters`);
      sanitized = sanitized.substring(0, MAX_QUERY_LENGTH);
    }

    // Enforce minimum length (prevent single character queries)
    const MIN_QUERY_LENGTH = 2;
    if (sanitized.length < MIN_QUERY_LENGTH) {
      return null;
    }

    // Remove potentially dangerous SQL keywords and special characters
    // While Supabase uses parameterized queries, we add extra protection
    const dangerousPatterns = [
      /--/g, // SQL comments
      /\/\*/g, // Multi-line comments start
      /\*\//g, // Multi-line comments end
      /;/g, // Statement terminators
      /\bDROP\b/gi, // DROP statements
      /\bDELETE\b/gi, // DELETE statements
      /\bUPDATE\b/gi, // UPDATE statements
      /\bINSERT\b/gi, // INSERT statements
      /\bEXEC\b/gi, // EXEC statements
      /\bUNION\b/gi, // UNION statements
      /<script/gi, // XSS attempts
      /javascript:/gi, // XSS attempts
      /on\w+=/gi, // Event handlers (XSS)
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(sanitized)) {
        SecureLogger.warn('Dangerous pattern detected in search query:', pattern.toString());
        sanitized = sanitized.replace(pattern, '');
      }
    }

    // Remove excessive special characters (keep only alphanumeric, space, hyphen, underscore, umlauts)
    // Allow German medical terms with umlauts: ä, ö, ü, ß
    sanitized = sanitized.replace(/[^a-zA-Z0-9\sÄäÖöÜüß\-_]/g, '');

    // Replace multiple spaces with single space
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    // Final check - if nothing left after sanitization, return null
    if (sanitized.length === 0) {
      return null;
    }

    return sanitized;
  }

  /**
   * DEBUG METHOD: Test basic database connectivity
   */
  async testDatabaseConnection(): Promise<any> {
    try {
      logger.info('🔍 TESTING DATABASE CONNECTION...');

      // Check auth session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      logger.info('📊 Auth Session:', {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        error: sessionError,
      });

      // Test simple query to see if sections table exists
      logger.info('🔍 Testing sections table access...');
      const {
        data: testData,
        error: testError,
        count,
      } = await supabase.from('sections').select('*', { count: 'exact' }).limit(5);

      logger.info('📊 Sections table test result:', {
        data: testData,
        error: testError,
        count,
        dataLength: testData?.length,
      });

      if (testError) {
        logger.error('❌ Cannot access sections table:', testError);
        return { success: false, error: testError };
      }

      // If we have data, log the first few records
      if (testData && testData.length > 0) {
        logger.info(
          '✅ Sample sections data:',
          testData.map((s) => ({
            id: s.id,
            slug: s.slug,
            title: s.title,
            parent_slug: s.parent_slug,
            type: s.type,
          }))
        );
      } else {
        logger.info('⚠️ Sections table is empty');
      }

      return { success: true, data: testData, count };
    } catch (error) {
      logger.error('💥 Database connection test failed:', error);
      return { success: false, error };
    }
  }

  /**
   * Get all root sections (categories)
   */
  async getRootSections(): Promise<MedicalSection[]> {
    const cacheKey = 'root_sections';
    const cached = listCache.get(cacheKey);

    if (cached) {
      logger.info('📋 Returning cached root sections', { count: cached.length });
      return cached;
    }

    try {
      logger.info('🔍 FETCHING ROOT SECTIONS FROM DATABASE...');

      // First run our debug test
      const dbTest = await this.testDatabaseConnection();
      if (!dbTest.success) {
        throw new Error(`Database connection failed: ${dbTest.error?.message || 'Unknown error'}`);
      }

      logger.info('🔍 Querying for root sections (parent_slug IS NULL)...');
      const { data, error } = await supabase
        .from('sections')
        .select(
          `
          id, slug, title, description, type, icon, color, display_order,
          category, image_url
        `
        )
        .is('parent_slug', null)
        .order('display_order', { ascending: true });

      logger.info('📊 Root sections query result:', {
        data: data?.map((s) => ({ slug: s.slug, title: s.title, type: s.type })),
        error,
        count: data?.length,
      });

      if (error) {
        logger.error('❌ Database error in getRootSections:', error);
        throw new Error(`Root sections query failed: ${error.message}`);
      }

      const sections = (data || []) as MedicalSection[];

      // Compute has_content for each section based on available content
      sections.forEach((section) => {
        section.has_content = this.hasAnyContent(section);
      });

      logger.info(`✅ Found ${sections.length} root sections`);

      // If no sections found, try to populate with basic data
      if (sections.length === 0) {
        logger.info('📝 No sections found, attempting to populate with basic medical categories...');
        try {
          await this.populateBasicSections();

          // Retry the query after populating
          logger.info('🔄 Retrying root sections query after population...');
          const { data: newData, error: newError } = await supabase
            .from('sections')
            .select(
              `
              id, slug, title, description, type, icon, color, display_order,
              category, image_url
            `
            )
            .is('parent_slug', null)
            .order('display_order', { ascending: true });

          if (newError) {
            logger.error('❌ Retry query failed:', newError);
          } else {
            const newSections = (newData || []) as MedicalSection[];

            // Compute has_content for each section
            newSections.forEach((section) => {
              section.has_content = this.hasAnyContent(section);
            });

            logger.info(`✅ After population, found ${newSections.length} root sections`);

            // Update cache with new data
            listCache.set(cacheKey, { data: newSections, timestamp: now });
            SecureLogger.log(`Auto-populated ${newSections.length} root sections`);
            return newSections;
          }
        } catch (populationError) {
          logger.error('❌ Failed to populate sections:', populationError);
        }
      }

      // Update cache
      listCache.set(cacheKey, { data: sections, timestamp: now });

      SecureLogger.log(`Fetched ${sections.length} root sections`);
      return sections;
    } catch (error) {
      SecureLogger.log('Error fetching root sections:', error);
      throw error;
    }
  }

  /**
   * Get hierarchical path for breadcrumb navigation
   */
  async getHierarchicalPath(slug: string): Promise<MedicalSection[]> {
    try {
      const path: MedicalSection[] = [];
      let currentSlug = slug;

      while (currentSlug) {
        const section = await this.getSectionBySlug(currentSlug);
        if (section) {
          path.unshift(section);
          currentSlug = section.parent_slug || '';
        } else {
          break;
        }
      }

      return path;
    } catch (error) {
      SecureLogger.log('Error getting hierarchical path:', error);
      return [];
    }
  }

  /**
   * Get sections by parent slug (for navigation)
   * @deprecated Use getSectionsByParentPaginated for better performance
   */
  async getSectionsByParent(parentSlug: string): Promise<MedicalSection[]> {
    // For backward compatibility, use pagination with large limit
    const result = await this.getSectionsByParentPaginated(parentSlug, { limit: 1000, offset: 0 });
    return result.sections;
  }

  /**
   * Get sections by parent slug with pagination (PERFORMANCE OPTIMIZED)
   */
  async getSectionsByParentPaginated(
    parentSlug: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ sections: MedicalSection[]; totalCount: number; hasMore: boolean }> {
    const limit = Math.min(options.limit || 20, 100); // Max 100 items per page
    const offset = options.offset || 0;
    const cacheKey = `parent_${parentSlug}_${limit}_${offset}`;

    // Check cache
    const cached = listCache.get(cacheKey);
    if (cached) {
      return cached as { sections: MedicalSection[]; totalCount: number; hasMore: boolean };
    }

    try {
      // Get total count first
      const { count: totalCount, error: countError } = await supabase
        .from('sections')
        .select('id', { count: 'exact', head: true })
        .eq('parent_slug', parentSlug);

      if (countError) throw countError;

      // Get paginated data
      const { data, error } = await supabase
        .from('sections')
        .select(
          `
          id, slug, title, description, type, icon, color, display_order,
          category, image_url
        `
        )
        .eq('parent_slug', parentSlug)
        .order('display_order', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const sections = (data || []) as MedicalSection[];

      // Compute has_content for each section
      sections.forEach((section) => {
        section.has_content = this.hasAnyContent(section);
      });

      const result = {
        sections,
        totalCount: totalCount || 0,
        hasMore: offset + limit < (totalCount || 0),
      };

      // Cache the result
      listCache.set(cacheKey, result);

      return result;
    } catch (error) {
      SecureLogger.error('Error fetching paginated sections by parent:', error);
      throw error;
    }
  }

  /**
   * Get sections by category
   * @deprecated Use getSectionsByCategoryPaginated for better performance
   */
  async getSectionsByCategory(category: string): Promise<MedicalSection[]> {
    // For backward compatibility, use pagination with large limit
    const result = await this.getSectionsByCategoryPaginated(category, { limit: 1000, offset: 0 });
    return result.sections;
  }

  /**
   * Get sections by category with pagination (PERFORMANCE OPTIMIZED)
   */
  async getSectionsByCategoryPaginated(
    category: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ sections: MedicalSection[]; totalCount: number; hasMore: boolean }> {
    const limit = Math.min(options.limit || 20, 100); // Max 100 items per page
    const offset = options.offset || 0;
    const cacheKey = `category_${category}_${limit}_${offset}`;

    // Check cache
    const cached = listCache.get(cacheKey);
    if (cached) {
      return cached as { sections: MedicalSection[]; totalCount: number; hasMore: boolean };
    }

    try {
      // Get total count first
      const { count: totalCount, error: countError } = await supabase
        .from('sections')
        .select('id', { count: 'exact', head: true })
        .eq('category', category);

      if (countError) throw countError;

      // Get paginated data
      const { data, error } = await supabase
        .from('sections')
        .select(
          `
          id, slug, title, description, type, icon, color, display_order,
          category, image_url
        `
        )
        .eq('category', category)
        .order('display_order', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const sections = (data || []) as MedicalSection[];

      // Compute has_content for each section
      sections.forEach((section) => {
        section.has_content = this.hasAnyContent(section);
      });

      const result = {
        sections,
        totalCount: totalCount || 0,
        hasMore: offset + limit < (totalCount || 0),
      };

      // Cache the result
      listCache.set(cacheKey, result);

      return result;
    } catch (error) {
      SecureLogger.error('Error fetching paginated sections by category:', error);
      throw error;
    }
  }

  /**
   * Get single section by slug (alias for getSection)
   */
  async getSectionBySlug(slug: string): Promise<MedicalSection | null> {
    return this.getSection(slug);
  }

  /**
   * Get child sections (alias for getSectionsByParent)
   */
  async getChildSections(parentSlug: string): Promise<MedicalSection[]> {
    return this.getSectionsByParent(parentSlug);
  }

  /**
   * Get single section with all content formats (WITH REQUEST DEDUPLICATION)
   */
  async getSection(slug: string): Promise<MedicalSection | null> {
    // Check cache first
    const cached = sectionCache.get(slug);
    if (cached) {
      return cached;
    }

    // Use request deduplication to prevent simultaneous duplicate requests
    const requestKey = generateRequestKey('getSection', slug);

    return withDeduplication(requestKey, async () => {
      try {
        const { data, error } = await supabase
          .from('sections')
          .select(
            `
            id, slug, title, description, type, icon, color, display_order,
            category, image_url, parent_slug, content_json, content_improved,
            content_html, content_details,
            hierarchy_level, created_at, updated_at
          `
          )
          .eq('slug', slug)
          .maybeSingle();

        if (error) {
          SecureLogger.error(`Database error in getSection(${slug}):`, error);
          // If columns don't exist, try a simpler query
          if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
            SecureLogger.log('Columns missing, trying fallback query');
            return await this.getSectionFallback(slug);
          }
          throw error;
        }
        if (!data) return null;

        const section = data as MedicalSection;

        // Compute has_content based on available content
        section.has_content = this.hasAnyContent(section);

        // Update cache
        sectionCache.set(slug, section);

        return section;
      } catch (error) {
        SecureLogger.error('Error fetching section:', error);
        throw error;
      }
    });
  }

  /**
   * EMERGENCY: Populate sections table if it's empty
   */
  async populateBasicSections(): Promise<void> {
    try {
      logger.info('🔧 POPULATING BASIC SECTIONS...');

      const basicSections = [
        {
          slug: 'innere-medizin',
          title: 'Innere Medizin',
          description: 'Systematische Übersicht der internistischen Erkrankungen',
          type: 'folder',
          icon: 'Stethoscope',
          color: '#E2827F',
          display_order: 1,
          parent_slug: null,
        },
        {
          slug: 'chirurgie',
          title: 'Chirurgie',
          description: 'Systematische Übersicht der chirurgischen Fachgebiete',
          type: 'folder',
          icon: 'Scissors',
          color: '#E5877E',
          display_order: 2,
          parent_slug: null,
        },
        {
          slug: 'notfallmedizin',
          title: 'Notfallmedizin',
          description: 'Systematische Übersicht der notfallmedizinischen Versorgung',
          type: 'folder',
          icon: 'AlertTriangle',
          color: '#EF4444',
          display_order: 3,
          parent_slug: null,
        },
      ];

      const { data, error } = await supabase.from('sections').insert(basicSections).select();

      if (error) {
        logger.error('❌ Error populating sections:', error);
        throw error;
      }

      logger.info('✅ Successfully populated sections:', data);
    } catch (error) {
      logger.error('💥 Failed to populate sections:', error);
      throw error;
    }
  }

  /**
   * Fallback method for when content columns don't exist yet
   */
  private async getSectionFallback(slug: string): Promise<MedicalSection | null> {
    try {
      const { data, error } = await supabase
        .from('sections')
        .select(
          `
          id, slug, title, description, type, icon, color, display_order,
          category, image_url, parent_slug, content_json,
          hierarchy_level, created_at, updated_at
        `
        )
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const section = data as MedicalSection;

      // Set empty values for missing columns
      section.content_improved = [];
      section.content_html = '';
      section.content_details = '';

      // Compute has_content based on available content
      section.has_content = this.hasAnyContent(section);

      return section;
    } catch (error) {
      SecureLogger.log(`Fallback query also failed for section ${slug}:`, error);
      return null;
    }
  }

  /**
   * Search sections by title, description, and content
   * @param query - User search query (will be sanitized)
   * @param limit - Maximum number of results to return
   * @returns Array of search results with match information
   */
  async searchSections(query: string, limit = 20): Promise<SearchResult[]> {
    // SECURITY: Sanitize search input to prevent SQL injection and XSS
    const sanitizedQuery = this.sanitizeSearchQuery(query);

    if (!sanitizedQuery) {
      SecureLogger.warn('Search query failed sanitization');
      return [];
    }

    try {
      // Enforce reasonable limit (prevent excessive data retrieval)
      const safeLimit = Math.min(Math.max(1, limit), 100);

      // Use sanitized query with ilike for case-insensitive search
      // Supabase handles proper parameterization, but we've pre-sanitized as defense-in-depth
      const searchTerm = `%${sanitizedQuery.toLowerCase()}%`;

      // Search in title and description using ilike
      const { data, error } = await supabase
        .from('sections')
        .select(
          `
          id, slug, title, description, type, icon, color, display_order,
          category, image_url
        `
        )
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .limit(safeLimit);

      if (error) {
        SecureLogger.error('Database error during search:', error);
        throw error;
      }

      const results: SearchResult[] = (data || []).map((section) => {
        const matchType = section.title.toLowerCase().includes(sanitizedQuery.toLowerCase())
          ? ('title' as const)
          : ('description' as const);

        const snippet =
          matchType === 'description' ? this.createSnippet(section.description || '', sanitizedQuery) : undefined;

        return {
          section: section as MedicalSection,
          matchType,
          snippet,
        };
      });

      SecureLogger.log(`Search completed: "${sanitizedQuery}" returned ${results.length} results`);
      return results;
    } catch (error) {
      SecureLogger.error('Error searching sections:', error);
      throw error;
    }
  }

  /**
   * Get all unique categories
   */
  async getCategories(): Promise<string[]> {
    const cacheKey = 'categories';
    const cached = listCache.get(cacheKey);

    if (cached) {
      return cached.map((item) => item.category || '').filter(Boolean);
    }

    try {
      const { data, error } = await supabase.from('sections').select('category').not('category', 'is', null);

      if (error) throw error;

      const categories = [...new Set(data?.map((item) => item.category).filter(Boolean) || [])];

      return categories;
    } catch (error) {
      SecureLogger.log('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Check if section has content in any format
   */
  hasAnyContent(section: MedicalSection): boolean {
    return !!(
      (Array.isArray(section.content_improved) && section.content_improved.length > 0) ||
      (Array.isArray(section.content_json) && section.content_json.length > 0) ||
      section.content_html ||
      section.content_details
    );
  }

  /**
   * Determine the best content format to display
   */
  getBestContentFormat(section: MedicalSection): 'html' | 'improved' | 'json' | 'details' | null {
    if (section.content_html) return 'html';
    if (Array.isArray(section.content_improved) && section.content_improved.length > 0) return 'improved';
    if (Array.isArray(section.content_json) && section.content_json.length > 0) return 'json';
    if (section.content_details) return 'details';
    return null;
  }

  /**
   * Create content snippet for search results
   */
  private createSnippet(text: string, query: string, maxLength = 150): string {
    if (!text) return '';

    const queryIndex = text.toLowerCase().indexOf(query.toLowerCase());
    if (queryIndex === -1) return `${text.substring(0, maxLength)  }...`;

    const start = Math.max(0, queryIndex - 50);
    const end = Math.min(text.length, queryIndex + query.length + 50);

    let snippet = text.substring(start, end);
    if (start > 0) snippet = `...${  snippet}`;
    if (end < text.length) snippet = `${snippet  }...`;

    return snippet;
  }

  /**
   * Clear cache for specific key or all cache
   */
  clearCache(key?: string): void {
    if (key) {
      sectionCache.delete(key);
      listCache.delete(key);
    } else {
      sectionCache.clear();
      listCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { sectionCacheSize: number; listCacheSize: number } {
    return {
      sectionCacheSize: sectionCache.size(),
      listCacheSize: listCache.size(),
    };
  }
}

// Export singleton instance
export const medicalContentService = new MedicalContentService();
