import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface CaseViewProps {
  caseData: {
    id: string;
    title: string;
    category: string;
    subsection: string;
    scenario: string;
    anamnesis: string;
    exam: string;
    labs: string;
    imaging: string;
    answer: string;
  };
  onSubmit: (answer: string) => void;
}

export default function CaseView({ caseData, onSubmit }: CaseViewProps) {
  const [userAnswer, setUserAnswer] = useState('');
  const [activeTab, setActiveTab] = useState('scenario');

  const tabs = [
    { id: 'scenario', label: 'Fallbeschreibung' },
    { id: 'anamnesis', label: 'Anamnese' },
    { id: 'exam', label: 'Untersuchung' },
    { id: 'labs', label: 'Labor' },
    { id: 'imaging', label: 'Bildgebung' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'scenario':
        return <Text style={styles.tabContent}>{caseData.scenario}</Text>;
      case 'anamnesis':
        return <Text style={styles.tabContent}>{caseData.anamnesis}</Text>;
      case 'exam':
        return <Text style={styles.tabContent}>{caseData.exam}</Text>;
      case 'labs':
        return <Text style={styles.tabContent}>{caseData.labs}</Text>;
      case 'imaging':
        return <Text style={styles.tabContent}>{caseData.imaging}</Text>;
      default:
        return null;
    }
  };

  const handleSubmit = () => {
    onSubmit(userAnswer);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{caseData.title}</Text>
            <View style={styles.badges}>
              <Badge text={caseData.category} variant="primary" />
              <View style={{ width: 8 }} />
              <Badge text={caseData.subsection} variant="secondary" />
            </View>
          </View>
        </View>

        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
            {tabs.map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  activeTab === tab.id && styles.activeTab
                ]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    activeTab === tab.id && styles.activeTabLabel
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.contentContainer}>
          {renderTabContent()}
        </View>

        <View style={styles.answerContainer}>
          <Text style={styles.answerLabel}>Ihre Antwort (auf Deutsch):</Text>
          <TextInput
            style={styles.answerInput}
            multiline
            placeholder="Geben Sie Ihre Antwort hier ein..."
            placeholderTextColor="#9CA3AF"
            value={userAnswer}
            onChangeText={setUserAnswer}
            textAlignVertical="top"
          />
          <Button
            title="Antwort einreichen"
            onPress={handleSubmit}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  titleContainer: {
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    color: '#1F2937',
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabsScroll: {
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#0077B6',
  },
  tabLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6B7280',
  },
  activeTabLabel: {
    color: '#0077B6',
  },
  contentContainer: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  tabContent: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  answerContainer: {
    padding: 16,
    marginBottom: 32,
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  answerLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 8,
  },
  answerInput: {
    height: 160,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 8,
  },
});