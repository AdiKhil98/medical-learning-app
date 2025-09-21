import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, RefreshControl, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  Eye,
  EyeOff,
  Save,
  X
} from 'lucide-react-native';

interface Section {
  id: string;
  title: string;
  slug: string;
  type: string;
  category?: string;
  parent_slug?: string;
  display_order: number;
  icon?: string;
  color?: string;
  is_visible: boolean;
  content?: string;
  created_at: string;
}

export default function ContentManagement() {
  const { colors } = useTheme();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [editForm, setEditForm] = useState({
    title: '',
    slug: '',
    type: '',
    category: '',
    parent_slug: '',
    display_order: 0,
    icon: '',
    color: '',
    content: '',
    is_visible: true
  });

  const sectionTypes = ['category', 'subcategory', 'content', 'link', 'separator'];

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sections')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSections(data || []);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to fetch sections: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSections();
    setRefreshing(false);
  };

  const openEditModal = (section?: Section) => {
    if (section) {
      setSelectedSection(section);
      setEditForm({
        title: section.title,
        slug: section.slug,
        type: section.type,
        category: section.category || '',
        parent_slug: section.parent_slug || '',
        display_order: section.display_order,
        icon: section.icon || '',
        color: section.color || '',
        content: section.content || '',
        is_visible: section.is_visible
      });
      setIsEditing(true);
    } else {
      setSelectedSection(null);
      setEditForm({
        title: '',
        slug: '',
        type: 'content',
        category: '',
        parent_slug: '',
        display_order: sections.length,
        icon: '',
        color: '',
        content: '',
        is_visible: true
      });
      setIsEditing(false);
    }
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setSelectedSection(null);
    setIsEditing(false);
  };

  const saveSection = async () => {
    try {
      if (!editForm.title || !editForm.slug || !editForm.type) {
        Alert.alert('Error', 'Title, slug, and type are required');
        return;
      }

      const sectionData = {
        title: editForm.title,
        slug: editForm.slug,
        type: editForm.type,
        category: editForm.category || null,
        parent_slug: editForm.parent_slug || null,
        display_order: editForm.display_order,
        icon: editForm.icon || null,
        color: editForm.color || null,
        content: editForm.content || null,
        is_visible: editForm.is_visible
      };

      if (isEditing && selectedSection) {
        const { error } = await supabase
          .from('sections')
          .update(sectionData)
          .eq('id', selectedSection.id);

        if (error) throw error;
        Alert.alert('Success', 'Section updated successfully');
      } else {
        const { error } = await supabase
          .from('sections')
          .insert([sectionData]);

        if (error) throw error;
        Alert.alert('Success', 'Section created successfully');
      }

      closeEditModal();
      await fetchSections();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save section: ' + error.message);
    }
  };

  const deleteSection = (section: Section) => {
    Alert.alert(
      'Delete Section',
      `Are you sure you want to delete "${section.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('sections')
                .delete()
                .eq('id', section.id);

              if (error) throw error;
              Alert.alert('Success', 'Section deleted successfully');
              await fetchSections();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete section: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const toggleVisibility = async (section: Section) => {
    try {
      const { error } = await supabase
        .from('sections')
        .update({ is_visible: !section.is_visible })
        .eq('id', section.id);

      if (error) throw error;
      await fetchSections();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update visibility: ' + error.message);
    }
  };

  const showTypeFilter = () => {
    Alert.alert(
      'Filter by Type',
      '',
      [
        { text: 'All', onPress: () => setFilterType('all') },
        ...sectionTypes.map(type => ({
          text: type.charAt(0).toUpperCase() + type.slice(1),
          onPress: () => setFilterType(type)
        })),
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const filteredSections = sections.filter(section => {
    const matchesSearch = section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         section.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || section.type === filterType;
    return matchesSearch && matchesType;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'category': return '#E2827F';
      case 'subcategory': return '#10B981';
      case 'content': return '#F59E0B';
      case 'link': return '#E2827F';
      case 'separator': return '#6B7280';
      default: return colors.textSecondary;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <FileText size={24} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Content Management</Text>
        <TouchableOpacity onPress={() => openEditModal()}>
          <Plus size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.filters, { backgroundColor: colors.card }]}>
        <View style={styles.searchContainer}>
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search sections..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <TouchableOpacity 
          style={[styles.filterButton, { backgroundColor: colors.background }]}
          onPress={showTypeFilter}
        >
          <Filter size={16} color={colors.textSecondary} />
          <Text style={[styles.filterText, { color: colors.text }]}>
            {filterType === 'all' ? 'All' : filterType.charAt(0).toUpperCase() + filterType.slice(1)}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: colors.text }]}>{sections.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Sections</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: '#10B981' }]}>
            {sections.filter(s => s.is_visible).length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Visible</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: '#EF4444' }]}>
            {sections.filter(s => !s.is_visible).length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Hidden</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading sections...</Text>
          </View>
        ) : (
          <>
            {filteredSections.map((section) => (
              <View key={section.id} style={[styles.sectionCard, { backgroundColor: colors.card }]}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionInfo}>
                    <View style={styles.sectionTitleRow}>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
                      <View style={[styles.typeBadge, { backgroundColor: getTypeColor(section.type) + '20' }]}>
                        <Text style={[styles.typeText, { color: getTypeColor(section.type) }]}>
                          {section.type}
                        </Text>
                      </View>
                    </View>
                    
                    <Text style={[styles.sectionSlug, { color: colors.textSecondary }]}>/{section.slug}</Text>
                    
                    {section.category && (
                      <Text style={[styles.sectionDetail, { color: colors.textSecondary }]}>
                        Category: {section.category}
                      </Text>
                    )}
                    
                    {section.parent_slug && (
                      <Text style={[styles.sectionDetail, { color: colors.textSecondary }]}>
                        Parent: {section.parent_slug}
                      </Text>
                    )}
                    
                    <Text style={[styles.sectionDetail, { color: colors.textSecondary }]}>
                      Order: {section.display_order} • Created: {formatDate(section.created_at)}
                    </Text>
                  </View>
                </View>

                <View style={styles.sectionActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: section.is_visible ? '#10B981' : '#6B7280' }]}
                    onPress={() => toggleVisibility(section)}
                  >
                    {section.is_visible ? (
                      <Eye size={16} color="white" />
                    ) : (
                      <EyeOff size={16} color="white" />
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#E2827F' }]}
                    onPress={() => openEditModal(section)}
                  >
                    <Edit size={16} color="white" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                    onPress={() => deleteSection(section)}
                  >
                    <Trash2 size={16} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {filteredSections.length === 0 && !loading && (
              <View style={styles.emptyContainer}>
                <FileText size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No sections found matching your criteria
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={closeEditModal}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isEditing ? 'Edit Section' : 'Create Section'}
            </Text>
            <TouchableOpacity onPress={saveSection}>
              <Save size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={[styles.label, { color: colors.text }]}>Title *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
              value={editForm.title}
              onChangeText={(text) => setEditForm({ ...editForm, title: text })}
              placeholder="Section title"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { color: colors.text }]}>Slug *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
              value={editForm.slug}
              onChangeText={(text) => setEditForm({ ...editForm, slug: text })}
              placeholder="section-slug"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { color: colors.text }]}>Type *</Text>
            <TouchableOpacity 
              style={[styles.input, { backgroundColor: colors.card }]}
              onPress={() => {
                Alert.alert(
                  'Select Type',
                  '',
                  sectionTypes.map(type => ({
                    text: type.charAt(0).toUpperCase() + type.slice(1),
                    onPress: () => setEditForm({ ...editForm, type })
                  }))
                );
              }}
            >
              <Text style={[styles.inputText, { color: colors.text }]}>
                {editForm.type || 'Select type'}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.label, { color: colors.text }]}>Category</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
              value={editForm.category}
              onChangeText={(text) => setEditForm({ ...editForm, category: text })}
              placeholder="Optional category"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { color: colors.text }]}>Parent Slug</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
              value={editForm.parent_slug}
              onChangeText={(text) => setEditForm({ ...editForm, parent_slug: text })}
              placeholder="Optional parent section"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { color: colors.text }]}>Display Order</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
              value={editForm.display_order.toString()}
              onChangeText={(text) => setEditForm({ ...editForm, display_order: parseInt(text) || 0 })}
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />

            <Text style={[styles.label, { color: colors.text }]}>Icon</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
              value={editForm.icon}
              onChangeText={(text) => setEditForm({ ...editForm, icon: text })}
              placeholder="Optional icon name"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { color: colors.text }]}>Color</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
              value={editForm.color}
              onChangeText={(text) => setEditForm({ ...editForm, color: text })}
              placeholder="#000000"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { color: colors.text }]}>Content</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.card, color: colors.text }]}
              value={editForm.content}
              onChangeText={(text) => setEditForm({ ...editForm, content: text })}
              placeholder="Optional content"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={6}
            />

            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={[styles.checkbox, { 
                  backgroundColor: editForm.is_visible ? colors.primary : colors.background,
                  borderColor: colors.primary
                }]}
                onPress={() => setEditForm({ ...editForm, is_visible: !editForm.is_visible })}
              >
                {editForm.is_visible && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
              <Text style={[styles.checkboxLabel, { color: colors.text }]}>Visible</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
  },
  filters: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionSlug: {
    fontSize: 14,
    marginBottom: 4,
  },
  sectionDetail: {
    fontSize: 12,
    marginBottom: 2,
  },
  sectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  inputText: {
    fontSize: 16,
  },
  textArea: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
});