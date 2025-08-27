import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronDown } from 'lucide-react-native';

export default function AddUpdate() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('normal');
  const [version, setVersion] = useState('');
  const [loading, setLoading] = useState(false);

  const categoryOptions = [
    { label: 'Allgemein', value: 'general' },
    { label: 'Neue Features', value: 'feature' },
    { label: 'Fehlerbehebung', value: 'bugfix' },
    { label: 'Ankündigung', value: 'announcement' }
  ];

  const priorityOptions = [
    { label: 'Niedrig', value: 'low' },
    { label: 'Normal', value: 'normal' },
    { label: 'Hoch', value: 'high' }
  ];

  const showCategoryPicker = () => {
    const options = categoryOptions.map(option => option.label);
    Alert.alert(
      'Kategorie wählen',
      '',
      [
        ...options.map((option, index) => ({
          text: option,
          onPress: () => setCategory(categoryOptions[index].value)
        })),
        { text: 'Abbrechen', style: 'cancel' }
      ]
    );
  };

  const showPriorityPicker = () => {
    const options = priorityOptions.map(option => option.label);
    Alert.alert(
      'Priorität wählen',
      '',
      [
        ...options.map((option, index) => ({
          text: option,
          onPress: () => setPriority(priorityOptions[index].value)
        })),
        { text: 'Abbrechen', style: 'cancel' }
      ]
    );
  };

  const getCategoryLabel = (value: string) => {
    return categoryOptions.find(option => option.value === value)?.label || value;
  };

  const getPriorityLabel = (value: string) => {
    return priorityOptions.find(option => option.value === value)?.label || value;
  };

  const handleSubmit = async () => {
    if (!title || !content) {
      Alert.alert('Fehler', 'Titel und Inhalt sind erforderlich');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('app_updates').insert({
        title,
        content,
        category,
        priority,
        version: version || null,
        author_id: user?.id,
        is_active: true
      });

      if (error) throw error;

      Alert.alert('Erfolg', 'Update wurde veröffentlicht!');
      // Reset form
      setTitle('');
      setContent('');
      setVersion('');
    } catch (error: any) {
      Alert.alert('Fehler', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.content}>
        <Text style={[styles.label, { color: colors.text }]}>Titel *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
          value={title}
          onChangeText={setTitle}
          placeholder="z.B. Neue Features verfügbar!"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={[styles.label, { color: colors.text }]}>Inhalt *</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: colors.card, color: colors.text }]}
          value={content}
          onChangeText={setContent}
          placeholder="Beschreibe die Änderungen..."
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={6}
        />

        <Text style={[styles.label, { color: colors.text }]}>Kategorie</Text>
        <TouchableOpacity 
          style={[styles.dropdown, { backgroundColor: colors.card }]}
          onPress={showCategoryPicker}
        >
          <Text style={[styles.dropdownText, { color: colors.text }]}>
            {getCategoryLabel(category)}
          </Text>
          <ChevronDown size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text style={[styles.label, { color: colors.text }]}>Priorität</Text>
        <TouchableOpacity 
          style={[styles.dropdown, { backgroundColor: colors.card }]}
          onPress={showPriorityPicker}
        >
          <Text style={[styles.dropdownText, { color: colors.text }]}>
            {getPriorityLabel(priority)}
          </Text>
          <ChevronDown size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text style={[styles.label, { color: colors.text }]}>Version (optional)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
          value={version}
          onChangeText={setVersion}
          placeholder="z.B. 2.1.0"
          placeholderTextColor={colors.textSecondary}
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Wird veröffentlicht...' : 'Update veröffentlichen'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
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
  },
  textArea: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  dropdown: {
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    flex: 1,
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});