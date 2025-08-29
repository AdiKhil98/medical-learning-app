import { supabase } from './supabase';
import { SecureLogger } from './security';

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

// Cache configuration
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const sectionCache = new Map<string, { data: MedicalSection, timestamp: number }>();
const listCache = new Map<string, { data: MedicalSection[], timestamp: number }>();

class MedicalContentService {
  
  /**
   * DEBUG METHOD: Test basic database connectivity
   */
  async testDatabaseConnection(): Promise<any> {
    try {
      console.log('🔍 TESTING DATABASE CONNECTION...');
      
      // Check auth session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('📊 Auth Session:', { 
        hasSession: !!session, 
        userId: session?.user?.id, 
        email: session?.user?.email,
        error: sessionError 
      });

      // Test simple query to see if sections table exists
      console.log('🔍 Testing sections table access...');
      const { data: testData, error: testError, count } = await supabase
        .from('sections')
        .select('*', { count: 'exact' })
        .limit(5);

      console.log('📊 Sections table test result:', {
        data: testData,
        error: testError,
        count: count,
        dataLength: testData?.length
      });

      if (testError) {
        console.error('❌ Cannot access sections table:', testError);
        return { success: false, error: testError };
      }

      // If we have data, log the first few records
      if (testData && testData.length > 0) {
        console.log('✅ Sample sections data:', testData.map(s => ({ 
          id: s.id, 
          slug: s.slug, 
          title: s.title, 
          parent_slug: s.parent_slug, 
          type: s.type 
        })));
      } else {
        console.log('⚠️ Sections table is empty');
      }

      return { success: true, data: testData, count };
    } catch (error) {
      console.error('💥 Database connection test failed:', error);
      return { success: false, error };
    }
  }

  /**
   * Get all root sections (categories)
   */
  async getRootSections(): Promise<MedicalSection[]> {
    const cacheKey = 'root_sections';
    const cached = listCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log('📋 Returning cached root sections:', cached.data.length);
      return cached.data;
    }

    try {
      console.log('🔍 FETCHING ROOT SECTIONS FROM DATABASE...');
      
      // First run our debug test
      const dbTest = await this.testDatabaseConnection();
      if (!dbTest.success) {
        throw new Error(`Database connection failed: ${dbTest.error?.message || 'Unknown error'}`);
      }

      console.log('🔍 Querying for root sections (parent_slug IS NULL)...');
      const { data, error } = await supabase
        .from('sections')
        .select(`
          id, slug, title, description, type, icon, color, display_order,
          category, image_url
        `)
        .is('parent_slug', null)
        .order('display_order', { ascending: true });

      console.log('📊 Root sections query result:', { 
        data: data?.map(s => ({ slug: s.slug, title: s.title, type: s.type })), 
        error, 
        count: data?.length 
      });

      if (error) {
        console.error('❌ Database error in getRootSections:', error);
        throw new Error(`Root sections query failed: ${error.message}`);
      }

      const sections = (data || []) as MedicalSection[];
      
      // Compute has_content for each section based on available content
      sections.forEach(section => {
        section.has_content = this.hasAnyContent(section);
      });
      
      console.log(`✅ Found ${sections.length} root sections`);

      // If no sections found, try to populate with basic data
      if (sections.length === 0) {
        console.log('📝 No sections found, attempting to populate with basic medical categories...');
        try {
          await this.populateBasicSections();
          
          // Retry the query after populating
          console.log('🔄 Retrying root sections query after population...');
          const { data: newData, error: newError } = await supabase
            .from('sections')
            .select(`
              id, slug, title, description, type, icon, color, display_order,
              category, image_url
            `)
            .is('parent_slug', null)
            .order('display_order', { ascending: true });

          if (newError) {
            console.error('❌ Retry query failed:', newError);
          } else {
            const newSections = (newData || []) as MedicalSection[];
            
            // Compute has_content for each section
            newSections.forEach(section => {
              section.has_content = this.hasAnyContent(section);
            });
            
            console.log(`✅ After population, found ${newSections.length} root sections`);
            
            // Update cache with new data
            listCache.set(cacheKey, { data: newSections, timestamp: now });
            SecureLogger.log(`Auto-populated ${newSections.length} root sections`);
            return newSections;
          }
        } catch (populationError) {
          console.error('❌ Failed to populate sections:', populationError);
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
   */
  async getSectionsByParent(parentSlug: string): Promise<MedicalSection[]> {
    const cacheKey = `parent_${parentSlug}`;
    const cached = listCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const { data, error } = await supabase
        .from('sections')
        .select(`
          id, slug, title, description, type, icon, color, display_order,
          category, image_url
        `)
        .eq('parent_slug', parentSlug)
        .order('display_order', { ascending: true });

      if (error) throw error;

      const sections = (data || []) as MedicalSection[];
      
      // Compute has_content for each section
      sections.forEach(section => {
        section.has_content = this.hasAnyContent(section);
      });
      
      // Update cache
      listCache.set(cacheKey, { data: sections, timestamp: now });
      
      return sections;
      
    } catch (error) {
      SecureLogger.log('Error fetching sections by parent:', error);
      throw error;
    }
  }

  /**
   * Get sections by category
   */
  async getSectionsByCategory(category: string): Promise<MedicalSection[]> {
    const cacheKey = `category_${category}`;
    const cached = listCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const { data, error } = await supabase
        .from('sections')
        .select(`
          id, slug, title, description, type, icon, color, display_order,
          category, image_url
        `)
        .eq('category', category)
        .order('display_order', { ascending: true });

      if (error) throw error;

      const sections = (data || []) as MedicalSection[];
      
      // Compute has_content for each section
      sections.forEach(section => {
        section.has_content = this.hasAnyContent(section);
      });
      
      // Update cache
      listCache.set(cacheKey, { data: sections, timestamp: now });
      
      return sections;
      
    } catch (error) {
      SecureLogger.log('Error fetching sections by category:', error);
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
   * Get single section with all content formats
   */
  async getSection(slug: string): Promise<MedicalSection | null> {
    const cached = sectionCache.get(slug);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const { data, error } = await supabase
        .from('sections')
        .select(`
          id, slug, title, description, type, icon, color, display_order,
          category, image_url, parent_slug, content_json, content_improved, 
          content_html, content_details,
          hierarchy_level, created_at, updated_at
        `)
        .eq('slug', slug)
        .maybeSingle();

      if (error) {
        SecureLogger.log(`Database error in getSection(${slug}):`, error);
        // If columns don't exist, try a simpler query
        if (error.message && (error.message.includes('column') && error.message.includes('does not exist'))) {
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
      sectionCache.set(slug, { data: section, timestamp: now });
      
      return section;
      
    } catch (error) {
      SecureLogger.log('Error fetching section:', error);
      throw error;
    }
  }

  /**
   * EMERGENCY: Populate sections table if it's empty
   */
  async populateBasicSections(): Promise<void> {
    try {
      console.log('🔧 POPULATING BASIC SECTIONS...');
      
      const basicSections = [
        {
          slug: 'innere-medizin',
          title: 'Innere Medizin',
          description: 'Systematische Übersicht der internistischen Erkrankungen',
          type: 'folder',
          icon: 'Stethoscope',
          color: '#0077B6',
          display_order: 1,
          parent_slug: null
        },
        {
          slug: 'chirurgie',
          title: 'Chirurgie', 
          description: 'Systematische Übersicht der chirurgischen Fachgebiete',
          type: 'folder',
          icon: 'Scissors',
          color: '#48CAE4',
          display_order: 2,
          parent_slug: null
        },
        {
          slug: 'notfallmedizin',
          title: 'Notfallmedizin',
          description: 'Systematische Übersicht der notfallmedizinischen Versorgung',
          type: 'folder',
          icon: 'AlertTriangle',
          color: '#EF4444',
          display_order: 3,
          parent_slug: null
        }
      ];

      const { data, error } = await supabase
        .from('sections')
        .insert(basicSections)
        .select();

      if (error) {
        console.error('❌ Error populating sections:', error);
        throw error;
      }

      console.log('✅ Successfully populated sections:', data);
    } catch (error) {
      console.error('💥 Failed to populate sections:', error);
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
        .select(`
          id, slug, title, description, type, icon, color, display_order,
          category, image_url, parent_slug, content_json,
          hierarchy_level, created_at, updated_at
        `)
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
   */
  async searchSections(query: string, limit = 20): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      
      // Search in title and description using ilike
      const { data, error } = await supabase
        .from('sections')
        .select(`
          id, slug, title, description, type, icon, color, display_order,
          category, image_url
        `)
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .limit(limit);

      if (error) throw error;

      const results: SearchResult[] = (data || []).map(section => {
        const matchType = section.title.toLowerCase().includes(query.toLowerCase()) 
          ? 'title' as const
          : 'description' as const;
        
        const snippet = matchType === 'description' 
          ? this.createSnippet(section.description || '', query)
          : undefined;

        return {
          section: section as MedicalSection,
          matchType,
          snippet
        };
      });

      return results;
      
    } catch (error) {
      SecureLogger.log('Error searching sections:', error);
      throw error;
    }
  }

  /**
   * Get all unique categories
   */
  async getCategories(): Promise<string[]> {
    const cacheKey = 'categories';
    const cached = listCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      return cached.data.map(item => item.category || '').filter(Boolean);
    }

    try {
      const { data, error } = await supabase
        .from('sections')
        .select('category')
        .not('category', 'is', null);

      if (error) throw error;

      const categories = [...new Set(data?.map(item => item.category).filter(Boolean) || [])];
      
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
    if (queryIndex === -1) return text.substring(0, maxLength) + '...';
    
    const start = Math.max(0, queryIndex - 50);
    const end = Math.min(text.length, queryIndex + query.length + 50);
    
    let snippet = text.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    
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
      sectionCacheSize: sectionCache.size,
      listCacheSize: listCache.size
    };
  }
}

// Export singleton instance
export const medicalContentService = new MedicalContentService();