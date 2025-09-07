import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import {
  X,
  Save,
  Edit3,
  Trash2,
} from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SectionNotesModalProps {
  isVisible: boolean;
  sectionTitle: string;
  sectionId: string;
  currentNote?: string;
  onSave: (sectionId: string, note: string) => void;
  onDelete: (sectionId: string) => void;
  onClose: () => void;
}

const SectionNotesModal: React.FC<SectionNotesModalProps> = ({
  isVisible,
  sectionTitle,
  sectionId,
  currentNote = '',
  onSave,
  onDelete,
  onClose,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [noteText, setNoteText] = useState(currentNote);
  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    setNoteText(currentNote);
  }, [currentNote]);

  React.useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isVisible, fadeAnim, scaleAnim]);

  const handleSave = useCallback(() => {
    onSave(sectionId, noteText.trim());
    onClose();
  }, [sectionId, noteText, onSave, onClose]);

  const handleDelete = useCallback(() => {
    onDelete(sectionId);
    onClose();
  }, [sectionId, onDelete, onClose]);

  const handleClose = useCallback(() => {
    setNoteText(currentNote); // Reset to original note
    onClose();
  }, [currentNote, onClose]);

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <Animated.View
            style={[
              styles.modalContent,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={styles.modalContainer}>
                {/* Header */}
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.modalHeader}
                >
                  <View style={styles.headerContent}>
                    <View style={styles.headerLeft}>
                      <Edit3 size={20} color="white" />
                      <View style={styles.headerText}>
                        <Text style={styles.headerTitle}>Persönliche Notiz</Text>
                        <Text style={styles.headerSubtitle} numberOfLines={1}>
                          {sectionTitle}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                      <X size={24} color="white" />
                    </TouchableOpacity>
                  </View>
                </LinearGradient>

                {/* Content */}
                <View style={styles.modalBody}>
                  <Text style={styles.inputLabel}>
                    Ihre Notizen zu diesem Abschnitt:
                  </Text>
                  
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Fügen Sie hier Ihre persönlichen Notizen hinzu..."
                    placeholderTextColor="#9ca3af"
                    value={noteText}
                    onChangeText={setNoteText}
                    multiline
                    numberOfLines={8}
                    textAlignVertical="top"
                    autoFocus
                  />

                  <Text style={styles.characterCount}>
                    {noteText.length}/1000 Zeichen
                  </Text>
                </View>

                {/* Footer Actions */}
                <View style={styles.modalFooter}>
                  <View style={styles.footerActions}>
                    {currentNote.length > 0 && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={handleDelete}
                      >
                        <Trash2 size={16} color="#ef4444" />
                        <Text style={styles.deleteButtonText}>Löschen</Text>
                      </TouchableOpacity>
                    )}
                    
                    <View style={styles.primaryActions}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.cancelButton]}
                        onPress={handleClose}
                      >
                        <Text style={styles.cancelButtonText}>Abbrechen</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[styles.actionButton, styles.saveButton]}
                        onPress={handleSave}
                        disabled={noteText.length > 1000}
                      >
                        <Save size={16} color="white" />
                        <Text style={styles.saveButtonText}>Speichern</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContent: {
    width: Math.min(screenWidth - 40, 500),
    maxHeight: screenHeight * 0.8,
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    flex: 1,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  noteInput: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    minHeight: 120,
    maxHeight: 200,
  },
  characterCount: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
    marginTop: 8,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  primaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontWeight: '600',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#667eea',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default SectionNotesModal;