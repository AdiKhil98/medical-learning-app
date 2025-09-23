import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

interface CleanContentProps {
  children: React.ReactNode;
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

interface ListProps {
  items: string[];
}

interface StepProps {
  title: string;
  description: string;
  details?: string[];
}

export function CleanContent({ children }: CleanContentProps) {
  return <View style={styles.container}>{children}</View>;
}

export function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function Paragraph({ children }: { children: React.ReactNode }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

export function BoldText({ children }: { children: React.ReactNode }) {
  return <Text style={styles.boldText}>{children}</Text>;
}

export function List({ items }: ListProps) {
  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <View key={index} style={styles.listItem}>
          <Text style={styles.listBullet}>•</Text>
          <Text style={styles.listText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function Step({ title, description, details }: StepProps) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepDescription}>{description}</Text>
      {details && <List items={details} />}
    </View>
  );
}

export function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.highlight}>
      <Text style={styles.highlightText}>{children}</Text>
    </View>
  );
}

export function TimeInfo({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.timeInfo}>
      <Text style={styles.timeText}>{children}</Text>
    </View>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#B87E70',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  paragraph: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 25.6,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  boldText: {
    fontWeight: '600',
    color: '#B15740',
  },
  list: {
    marginVertical: 8,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 8,
  },
  listBullet: {
    fontSize: 16,
    color: '#E5877E',
    marginRight: 12,
    lineHeight: 25.6,
    fontWeight: '600',
  },
  listText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 25.6,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  step: {
    marginBottom: 20,
    backgroundColor: 'rgba(184, 126, 112, 0.05)',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#B87E70',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#B15740',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  stepDescription: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 25.6,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  highlight: {
    backgroundColor: 'rgba(226, 130, 127, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(184, 126, 112, 0.2)',
  },
  highlightText: {
    fontSize: 16,
    color: '#B15740',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 25.6,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  timeInfo: {
    backgroundColor: 'rgba(181, 87, 64, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#B15740',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(184, 126, 112, 0.2)',
    marginVertical: 20,
  },
});