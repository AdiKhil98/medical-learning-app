# Fix for Subdivision Navigation Issue

## Problem Identified

The issue with not being able to view further subdivisions after subcategories is caused by the navigation logic in `/app/(tabs)/bibliothek/[slug].tsx` at lines 407-434.

### Root Cause:
1. When a section has both content AND child subdivisions, the `navigateToChild` function always routes to the **content page** (`/content/${childSlug}`) if there's any content.
2. The **content page** only displays the section's content but does NOT fetch or show child subdivisions for further navigation.
3. Users get "stuck" at content pages and cannot navigate deeper into subdivisions.

## Solution

### Option 1: Modify Content Page to Show Child Subdivisions

**File:** `/app/(tabs)/bibliothek/content/[slug].tsx`

1. **Add child sections state:**
```tsx
const [childSections, setChildSections] = useState<Section[]>([]);
```

2. **Modify fetchSection to fetch children in parallel:**
```tsx
const [sectionResult, childrenResult] = await Promise.all([
  supabase
    .from('sections')
    .select('*')
    .eq('slug', slug)
    .maybeSingle(),
  supabase
    .from('sections')
    .select('*')
    .eq('parent_slug', slug)
    .order('display_order', { ascending: true })
]);

const { data: sectionData, error } = sectionResult;
const { data: childrenData, error: childrenError } = childrenResult;

if (error) throw error;
if (childrenError) throw childrenError;
if (!sectionData) throw new Error('Abschnitt nicht gefunden');

setCurrentSection(sectionData);
setChildSections(childrenData || []);
```

3. **Add child navigation component after content:**
```tsx
{/* Add after AmboxMedicalContentRenderer */}
{childSections.length > 0 && (
  <View style={styles.childSectionsContainer}>
    <Text style={styles.childSectionsTitle}>Weitere Unterthemen:</Text>
    <View style={styles.childSectionsGrid}>
      {childSections.map((childSection) => (
        <TouchableOpacity
          key={childSection.slug}
          style={styles.childSectionCard}
          onPress={() => navigateToChildSection(childSection.slug)}
        >
          <Text style={styles.childSectionTitle}>{childSection.title}</Text>
          {childSection.description && (
            <Text style={styles.childSectionDescription}>
              {childSection.description}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  </View>
)}
```

4. **Add navigation function:**
```tsx
const navigateToChildSection = useCallback((childSlug: string) => {
  router.push(`/(tabs)/bibliothek/${childSlug}`);
}, [router]);
```

### Option 2: Improve Navigation Logic (Recommended)

**File:** `/app/(tabs)/bibliothek/[slug].tsx` (lines 407-434)

Modify the `navigateToChild` function to check if a section has children before deciding the route:

```tsx
const navigateToChild = useCallback(async (childSlug: string, childItem?: Section) => {
  const currentPath = `/(tabs)/bibliothek/${slug}`;
  
  // Check if child has any content
  const hasContent = childItem && !!(
    (childItem.content_improved && 
     (typeof childItem.content_improved === 'object' || 
      (typeof childItem.content_improved === 'string' && childItem.content_improved.trim()))) ||
    (childItem.content_html && childItem.content_html.trim()) ||
    (childItem.content_details && childItem.content_details.trim())
  );
  
  // Check if child has children (subdivisions)
  const { data: hasChildren } = await supabase
    .from('sections')
    .select('id')
    .eq('parent_slug', childSlug)
    .limit(1);
  
  const hasSubdivisions = hasChildren && hasChildren.length > 0;
  
  // Priority: If has children, always go to category page for navigation
  // Only go to content page if it has content but no children
  if (hasSubdivisions) {
    console.log('Navigating to category page for:', childSlug, 'hasChildren:', hasSubdivisions);
    router.push({
      pathname: `/(tabs)/bibliothek/${childSlug}`,
      params: { previousPage: currentPath }
    });
  } else if (hasContent) {
    console.log('Navigating to content page for:', childSlug, 'hasContent:', hasContent);
    router.push({
      pathname: `/(tabs)/bibliothek/content/${childSlug}`,
      params: { previousPage: currentPath }
    });
  } else {
    console.log('Navigating to category page for:', childSlug, 'no content or children');
    router.push({
      pathname: `/(tabs)/bibliothek/${childSlug}`,
      params: { previousPage: currentPath }
    });
  }
}, [router, slug, supabase]);
```

## Recommended Implementation

I recommend **Option 2** as it's cleaner and maintains the existing architecture while fixing the navigation issue. The logic should prioritize navigation to subdivisions over content display when both exist.

## Files to Modify

1. `/app/(tabs)/bibliothek/[slug].tsx` - Fix navigation logic
2. Optionally: `/app/(tabs)/bibliothek/content/[slug].tsx` - Add child section display

## Testing

After implementing the fix, test by:
1. Navigating to a main category (e.g., "Innere Medizin")
2. Going to a subcategory that has both content and subdivisions
3. Verifying that you can navigate deeper into subdivisions
4. Ensuring content is still accessible when appropriate