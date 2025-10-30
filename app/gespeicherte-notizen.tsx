import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Edit3, Trash2, Calendar, FileText } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { loadAllNotes, deleteNote, UserNote } from '@/lib/notesService';
import SectionNotesModal from '@/components/ui/SectionNotesModal';
import Toast from '@/components/ui/Toast';

export default function GespeicherteNotizenPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<UserNote | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<UserNote | null>(null);

  useEffect(() => {
    loadNotes();
  }, [user?.id]);

  const loadNotes = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { notes: loadedNotes, error } = await loadAllNotes(user.id);

    if (error) {
      setToastMessage('Fehler beim Laden der Notizen.');
      setToastVisible(true);
    } else {
      setNotes(loadedNotes);
    }

    setLoading(false);
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleEdit = (note: UserNote) => {
    setEditingNote(note);
    setModalVisible(true);
  };

  const handleDelete = (note: UserNote) => {
    setNoteToDelete(note);
    setDeleteConfirmVisible(true);
  };

  const confirmDelete = async () => {
    if (!user?.id || !noteToDelete) return;

    const result = await deleteNote(user.id, noteToDelete.lesson_id);

    if (result.success) {
      setNotes(prev => prev.filter(n => n.id !== noteToDelete.id));
      setToastMessage('Notiz erfolgreich gelöscht.');
      setToastVisible(true);
    } else {
      setToastMessage('Fehler beim Löschen der Notiz.');
      setToastVisible(true);
    }

    setDeleteConfirmVisible(false);
    setNoteToDelete(null);
  };

  const cancelDelete = () => {
    setDeleteConfirmVisible(false);
    setNoteToDelete(null);
  };

  const handleSaveNote = async (sectionId: string, noteContent: string) => {
    // The save is handled by the modal's callback
    // Just reload notes after save
    await loadNotes();
    setToastMessage('Notiz erfolgreich aktualisiert.');
    setToastVisible(true);
  };

  const toggleExpanded = (noteId: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return 'Unbekannt';
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: 'rgba(249, 246, 242, 0.95)',
      shadowColor: 'rgba(181,87,64,0.3)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      alignSelf: 'flex-start',
    },
    backButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#B87E70',
      marginLeft: 8,
    },
    titleContainer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 20,
    },
    pageTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    pageSubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    contentContainer: {
      flex: 1,
      paddingHorizontal: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 40,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: colors.textSecondary,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 60,
      paddingHorizontal: 40,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    noteCard: {
      marginBottom: 16,
      borderRadius: 16,
      backgroundColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
      overflow: 'hidden',
    },
    noteHeader: {
      padding: 16,
    },
    noteTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    noteIcon: {
      marginRight: 10,
    },
    noteTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '700',
      color: '#1F2937',
    },
    noteDateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    noteDateText: {
      fontSize: 14,
      color: '#6B7280',
      marginLeft: 6,
    },
    noteContentContainer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    noteContent: {
      fontSize: 15,
      color: '#374151',
      lineHeight: 22,
    },
    showMoreButton: {
      marginTop: 8,
      alignSelf: 'flex-start',
    },
    showMoreText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#F97316',
    },
    noteActions: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: '#F3F4F6',
      padding: 12,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      marginHorizontal: 4,
    },
    editButton: {
      backgroundColor: '#FEF3C7',
    },
    deleteButton: {
      backgroundColor: '#FEE2E2',
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 6,
    },
    editButtonText: {
      color: '#F59E0B',
    },
    deleteButtonText: {
      color: '#EF4444',
    },
    notesCount: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* Header with Back Button */}
      <View style={dynamicStyles.headerContainer}>
        <TouchableOpacity style={dynamicStyles.backButton} onPress={handleGoBack}>
          <ArrowLeft size={20} color="#B87E70" />
          <Text style={dynamicStyles.backButtonText}>Zurück</Text>
        </TouchableOpacity>
      </View>

      {/* Title Section */}
      <View style={dynamicStyles.titleContainer}>
        <Text style={dynamicStyles.pageTitle}>Gespeicherte Notizen</Text>
        <Text style={dynamicStyles.pageSubtitle}>
          Alle deine persönlichen Notizen zu Lektionen
        </Text>
        {!loading && notes.length > 0 && (
          <Text style={dynamicStyles.notesCount}>
            {notes.length} {notes.length === 1 ? 'Notiz' : 'Notizen'} gespeichert
          </Text>
        )}
      </View>

      {/* Content */}
      <ScrollView style={dynamicStyles.contentContainer}>
        {loading ? (
          <View style={dynamicStyles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={dynamicStyles.loadingText}>Lade Notizen...</Text>
          </View>
        ) : notes.length === 0 ? (
          <View style={dynamicStyles.emptyContainer}>
            <FileText size={64} color="#D1D5DB" style={dynamicStyles.emptyIcon} />
            <Text style={dynamicStyles.emptyTitle}>Keine Notizen vorhanden</Text>
            <Text style={dynamicStyles.emptyText}>
              Du hast noch keine Notizen gespeichert. Erstelle deine erste Notiz in einer
              Lektion, um sie hier zu sehen.
            </Text>
          </View>
        ) : (
          notes.map(note => {
            const isExpanded = expandedNotes.has(note.id);
            const shouldTruncate = note.note_content.length > 150;
            const displayContent = isExpanded || !shouldTruncate
              ? note.note_content
              : truncateText(note.note_content, 150);

            return (
              <View key={note.id} style={dynamicStyles.noteCard}>
                {/* Note Header */}
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={dynamicStyles.noteHeader}
                >
                  <View style={dynamicStyles.noteTitleRow}>
                    <FileText
                      size={20}
                      color="#FFFFFF"
                      style={dynamicStyles.noteIcon}
                    />
                    <Text style={[dynamicStyles.noteTitle, { color: '#FFFFFF' }]}>
                      {note.lesson_title}
                    </Text>
                  </View>
                  <View style={dynamicStyles.noteDateRow}>
                    <Calendar size={14} color="rgba(255,255,255,0.8)" />
                    <Text style={[dynamicStyles.noteDateText, { color: 'rgba(255,255,255,0.9)' }]}>
                      {formatDate(note.updated_at)}
                    </Text>
                  </View>
                </LinearGradient>

                {/* Note Content */}
                <View style={dynamicStyles.noteContentContainer}>
                  <Text style={dynamicStyles.noteContent}>{displayContent}</Text>
                  {shouldTruncate && (
                    <TouchableOpacity
                      style={dynamicStyles.showMoreButton}
                      onPress={() => toggleExpanded(note.id)}
                    >
                      <Text style={dynamicStyles.showMoreText}>
                        {isExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Actions */}
                <View style={dynamicStyles.noteActions}>
                  <TouchableOpacity
                    style={[dynamicStyles.actionButton, dynamicStyles.editButton]}
                    onPress={() => handleEdit(note)}
                  >
                    <Edit3 size={16} color="#F59E0B" />
                    <Text style={[dynamicStyles.actionButtonText, dynamicStyles.editButtonText]}>
                      Bearbeiten
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[dynamicStyles.actionButton, dynamicStyles.deleteButton]}
                    onPress={() => handleDelete(note)}
                  >
                    <Trash2 size={16} color="#EF4444" />
                    <Text style={[dynamicStyles.actionButtonText, dynamicStyles.deleteButtonText]}>
                      Löschen
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Modal */}
      {editingNote && (
        <SectionNotesModal
          isVisible={modalVisible}
          sectionTitle={editingNote.lesson_title}
          sectionId={editingNote.lesson_id}
          currentNote={editingNote.note_content}
          onSave={handleSaveNote}
          onDelete={async (sectionId) => {
            if (!user?.id) return;
            await deleteNote(user.id, sectionId);
            await loadNotes();
            setToastMessage('Notiz erfolgreich gelöscht.');
            setToastVisible(true);
          }}
          onClose={() => {
            setModalVisible(false);
            setEditingNote(null);
          }}
        />
      )}

      {/* Toast */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        onHide={() => setToastVisible(false)}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <Pressable style={styles.confirmOverlay} onPress={cancelDelete}>
          <Pressable style={styles.confirmModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.confirmHeader}>
              <Trash2 size={32} color="#EF4444" />
              <Text style={styles.confirmTitle}>Notiz löschen</Text>
            </View>
            <Text style={styles.confirmMessage}>
              Möchten Sie diese Notiz wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={cancelDelete}
              >
                <Text style={styles.cancelButtonText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.deleteConfirmButton]}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteConfirmButtonText}>Löschen</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  confirmHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 12,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  deleteConfirmButton: {
    backgroundColor: '#EF4444',
  },
  deleteConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
