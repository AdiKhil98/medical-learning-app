import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LearningPriority } from '@/types/evaluation';

interface Props {
  priorities: LearningPriority[];
}

export default function LearningPriorities({ priorities }: Props) {
  if (!priorities || priorities.length === 0) {
    return null;
  }

  const getPriorityStyle = (level: string) => {
    switch (level) {
      case 'DRINGEND':
        return {
          container: styles.urgentContainer,
          badge: styles.urgentBadge,
          text: styles.urgentText,
        };
      case 'WICHTIG':
        return {
          container: styles.importantContainer,
          badge: styles.importantBadge,
          text: styles.importantText,
        };
      case 'OPTIONAL':
        return {
          container: styles.optionalContainer,
          badge: styles.optionalBadge,
          text: styles.optionalText,
        };
      default:
        return {
          container: styles.optionalContainer,
          badge: styles.optionalBadge,
          text: styles.optionalText,
        };
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>📚 Lernprioritäten</Text>

      <View style={styles.list}>
        {priorities.map((priority, index) => {
          const priorityStyles = getPriorityStyle(priority.level);

          return (
            <View key={index} style={[styles.priorityCard, priorityStyles.container]}>
              <Text style={[styles.priorityBadge, priorityStyles.badge]}>
                {priority.emoji} {priority.level}
              </Text>
              <Text style={[styles.priorityText, priorityStyles.text]}>{priority.text}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  heading: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1e3a5f',
    marginBottom: 16,
  },
  list: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    padding: 20,
    gap: 15,
  },
  priorityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 15,
    padding: 20,
    borderRadius: 8,
    borderWidth: 2,
  },
  urgentContainer: {
    backgroundColor: '#fff5f5',
    borderColor: '#dc3545',
  },
  importantContainer: {
    backgroundColor: '#fffbf0',
    borderColor: '#ffc107',
  },
  optionalContainer: {
    backgroundColor: '#f0fdf4',
    borderColor: '#28a745',
  },
  priorityBadge: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  urgentBadge: {
    color: '#dc3545',
  },
  importantBadge: {
    color: '#d97706',
  },
  optionalBadge: {
    color: '#28a745',
  },
  priorityText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
    color: '#212529',
  },
  urgentText: {},
  importantText: {},
  optionalText: {},
});
