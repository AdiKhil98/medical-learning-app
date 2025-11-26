import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bug, Lightbulb, Circle, Clock, CheckCircle2, Filter, MessageSquare, User, Calendar, Edit3, Save, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';

interface FeedbackItem {
  id: string;
  user_id: string;
  type: 'bug' | 'suggestion';
  title: string;
  description: string;
  status: 'new' | 'in_progress' | 'resolved';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  users?: {
    name: string;
    email: string;
  };
}

export default function FeedbackManagerScreen() {
  const router = useRouter();
  const { colors, isDarkMode, fontScale } = useTheme();
  const { user } = useAuth();
  
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNotes, setEditingNotes] = useState('');
  const [editingStatus, setEditingStatus] = useState<'new' | 'in_progress' | 'resolved'>('new');

  useEffect(() => {
    if (user?.role !== 'admin') {
      Alert.alert('Zugriff verweigert', 'Sie haben keine Berechtigung für diese Seite.');
      router.back();
      return;
    }
    
    loadFeedback();
  }, [user]);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('user_feedback')
        .select(`
          *,
          users (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      
      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error loading feedback:', error);
        Alert.alert('Fehler', 'Feedback konnte nicht geladen werden.');
        return;
      }

      setFeedback(data || []);
    } catch (error) {
      logger.error('Error loading feedback:', error);
      Alert.alert('Fehler', 'Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (feedbackId: string, newStatus: 'new' | 'in_progress' | 'resolved') => {
    try {
      const { error } = await supabase
        .from('user_feedback')
        .update({ status: newStatus })
        .eq('id', feedbackId);

      if (error) {
        logger.error('Error updating status:', error);
        Alert.alert('Fehler', 'Status konnte nicht aktualisiert werden.');
        return;
      }

      // Update local state
      setFeedback(prev => 
        prev.map(item => 
          item.id === feedbackId 
            ? { ...item, status: newStatus }
            : item
        )
      );
    } catch (error) {
      logger.error('Error updating status:', error);
      Alert.alert('Fehler', 'Ein unerwarteter Fehler ist aufgetreten.');
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedFeedback) return;

    try {
      const { error } = await supabase
        .from('user_feedback')
        .update({ 
          admin_notes: editingNotes,
          status: editingStatus
        })
        .eq('id', selectedFeedback.id);

      if (error) {
        logger.error('Error updating notes:', error);
        Alert.alert('Fehler', 'Notizen konnten nicht gespeichert werden.');
        return;
      }

      // Update local state
      setFeedback(prev => 
        prev.map(item => 
          item.id === selectedFeedback.id 
            ? { ...item, admin_notes: editingNotes, status: editingStatus }
            : item
        )
      );

      setModalVisible(false);
      setSelectedFeedback(null);
    } catch (error) {
      logger.error('Error updating notes:', error);
      Alert.alert('Fehler', 'Ein unerwarteter Fehler ist aufgetreten.');
    }
  };

  const openEditModal = (item: FeedbackItem) => {
    setSelectedFeedback(item);
    setEditingNotes(item.admin_notes || '');
    setEditingStatus(item.status);
    setModalVisible(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return colors.error;
      case 'in_progress': return colors.warning;
      case 'resolved': return colors.success;
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return Circle;
      case 'in_progress': return Clock;
      case 'resolved': return CheckCircle2;
      default: return Circle;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'bug' ? Bug : Lightbulb;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const gradientColors = isDarkMode
    ? ['#1F2937', '#111827', '#0F172A']
    : ['#F8F3E8', '#FBEEEC', '#FFFFFF'];  // White Linen to light coral to white

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    title: {
      fontFamily: 'Inter-Bold',
      fontSize: fontScale(28),
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontFamily: 'Inter-Regular',
      fontSize: fontScale(16),
      color: colors.textSecondary,
      marginBottom: 24,
      lineHeight: fontScale(24),
    },
    filtersContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    filterGroup: {
      flex: 1,
    },
    filterLabel: {
      fontFamily: 'Inter-Medium',
      fontSize: fontScale(14),
      color: colors.text,
      marginBottom: 4,
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    picker: {
      color: colors.text,
      backgroundColor: colors.surface,
    },
    feedbackCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    feedbackHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    typeIcon: {
      marginRight: 8,
    },
    feedbackTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: fontScale(16),
      color: colors.text,
      flex: 1,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusText: {
      fontFamily: 'Inter-Medium',
      fontSize: fontScale(12),
      marginLeft: 4,
    },
    feedbackMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 12,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    metaText: {
      fontFamily: 'Inter-Regular',
      fontSize: fontScale(12),
      color: colors.textSecondary,
      marginLeft: 4,
    },
    feedbackDescription: {
      fontFamily: 'Inter-Regular',
      fontSize: fontScale(14),
      color: colors.text,
      lineHeight: fontScale(20),
      marginBottom: 12,
    },
    feedbackActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionButtonText: {
      fontFamily: 'Inter-Medium',
      fontSize: fontScale(12),
      color: '#FFFFFF',
      marginLeft: 4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxHeight: '80%',
    },
    modalTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: fontScale(20),
      color: colors.text,
      marginBottom: 16,
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontFamily: 'Inter-Medium',
      fontSize: fontScale(14),
      color: colors.text,
      marginBottom: 8,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: fontScale(14),
      color: colors.text,
      backgroundColor: colors.surface,
      fontFamily: 'Inter-Regular',
      minHeight: 80,
      textAlignVertical: 'top',
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
    },
    modalButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveButton: {
      backgroundColor: colors.success,
    },
    cancelButton: {
      backgroundColor: colors.textSecondary,
    },
    modalButtonText: {
      fontFamily: 'Inter-Medium',
      fontSize: fontScale(14),
      color: '#FFFFFF',
      marginLeft: 4,
    },
    emptyState: {
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      fontFamily: 'Inter-Regular',
      fontSize: fontScale(16),
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 16,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <LinearGradient
        colors={gradientColors}
        style={styles.gradientBackground}
      />
      
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color={colors.primary} />
          </TouchableOpacity>
          
          <Text style={dynamicStyles.title}>Feedback Manager</Text>
          <Text style={dynamicStyles.subtitle}>
            Verwalten Sie Benutzerfeedback und Bug-Reports
          </Text>
        </View>

        {/* Filters */}
        <View style={dynamicStyles.filtersContainer}>
          <View style={dynamicStyles.filterGroup}>
            <Text style={dynamicStyles.filterLabel}>Status</Text>
            <View style={dynamicStyles.pickerContainer}>
              <Picker
                selectedValue={filterStatus}
                onValueChange={(value) => {
                  setFilterStatus(value);
                  loadFeedback();
                }}
                style={dynamicStyles.picker}
              >
                <Picker.Item label="Alle" value="all" />
                <Picker.Item label="Neu" value="new" />
                <Picker.Item label="In Bearbeitung" value="in_progress" />
                <Picker.Item label="Erledigt" value="resolved" />
              </Picker>
            </View>
          </View>
          
          <View style={dynamicStyles.filterGroup}>
            <Text style={dynamicStyles.filterLabel}>Typ</Text>
            <View style={dynamicStyles.pickerContainer}>
              <Picker
                selectedValue={filterType}
                onValueChange={(value) => {
                  setFilterType(value);
                  loadFeedback();
                }}
                style={dynamicStyles.picker}
              >
                <Picker.Item label="Alle" value="all" />
                <Picker.Item label="Bugs" value="bug" />
                <Picker.Item label="Vorschläge" value="suggestion" />
              </Picker>
            </View>
          </View>
        </View>

        {/* Feedback List */}
        {loading ? (
          <View style={dynamicStyles.emptyState}>
            <Text style={dynamicStyles.emptyText}>Lade Feedback...</Text>
          </View>
        ) : feedback.length === 0 ? (
          <View style={dynamicStyles.emptyState}>
            <MessageSquare size={48} color={colors.textSecondary} />
            <Text style={dynamicStyles.emptyText}>
              Kein Feedback gefunden
            </Text>
          </View>
        ) : (
          feedback.map((item) => {
            const StatusIcon = getStatusIcon(item.status);
            const TypeIcon = getTypeIcon(item.type);
            
            return (
              <View key={item.id} style={dynamicStyles.feedbackCard}>
                <View style={dynamicStyles.feedbackHeader}>
                  <TypeIcon 
                    size={20} 
                    color={item.type === 'bug' ? colors.error : colors.warning} 
                    style={dynamicStyles.typeIcon}
                  />
                  <Text style={dynamicStyles.feedbackTitle}>{item.title}</Text>
                  <View style={dynamicStyles.statusContainer}>
                    <StatusIcon size={16} color={getStatusColor(item.status)} />
                    <Text style={[dynamicStyles.statusText, { color: getStatusColor(item.status) }]}>
                      {item.status === 'new' ? 'Neu' : 
                       item.status === 'in_progress' ? 'Bearbeitung' : 'Erledigt'}
                    </Text>
                  </View>
                </View>
                
                <View style={dynamicStyles.feedbackMeta}>
                  <View style={dynamicStyles.metaItem}>
                    <User size={12} color={colors.textSecondary} />
                    <Text style={dynamicStyles.metaText}>
                      {item.users?.name || 'Unbekannt'}
                    </Text>
                  </View>
                  <View style={dynamicStyles.metaItem}>
                    <Calendar size={12} color={colors.textSecondary} />
                    <Text style={dynamicStyles.metaText}>
                      {formatDate(item.created_at)}
                    </Text>
                  </View>
                </View>
                
                <Text style={dynamicStyles.feedbackDescription} numberOfLines={3}>
                  {item.description}
                </Text>
                
                <View style={dynamicStyles.feedbackActions}>
                  <TouchableOpacity 
                    style={dynamicStyles.actionButton}
                    onPress={() => openEditModal(item)}
                  >
                    <Edit3 size={14} color="#FFFFFF" />
                    <Text style={dynamicStyles.actionButtonText}>Bearbeiten</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={dynamicStyles.modalOverlay}>
          <View style={dynamicStyles.modalContent}>
            <Text style={dynamicStyles.modalTitle}>Feedback bearbeiten</Text>
            
            <View style={dynamicStyles.inputGroup}>
              <Text style={dynamicStyles.inputLabel}>Status</Text>
              <View style={dynamicStyles.pickerContainer}>
                <Picker
                  selectedValue={editingStatus}
                  onValueChange={(value) => setEditingStatus(value as any)}
                  style={dynamicStyles.picker}
                >
                  <Picker.Item label="Neu" value="new" />
                  <Picker.Item label="In Bearbeitung" value="in_progress" />
                  <Picker.Item label="Erledigt" value="resolved" />
                </Picker>
              </View>
            </View>
            
            <View style={dynamicStyles.inputGroup}>
              <Text style={dynamicStyles.inputLabel}>Admin-Notizen</Text>
              <TextInput
                style={dynamicStyles.textInput}
                placeholder="Interne Notizen hinzufügen..."
                placeholderTextColor={colors.textSecondary}
                value={editingNotes}
                onChangeText={setEditingNotes}
                multiline
                numberOfLines={4}
              />
            </View>
            
            <View style={dynamicStyles.modalActions}>
              <TouchableOpacity 
                style={[dynamicStyles.modalButton, dynamicStyles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <X size={16} color="#FFFFFF" />
                <Text style={dynamicStyles.modalButtonText}>Abbrechen</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[dynamicStyles.modalButton, dynamicStyles.saveButton]}
                onPress={handleSaveNotes}
              >
                <Save size={16} color="#FFFFFF" />
                <Text style={dynamicStyles.modalButtonText}>Speichern</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 16,
  },
});