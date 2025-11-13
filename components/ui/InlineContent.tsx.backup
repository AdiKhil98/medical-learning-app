import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

interface InlineContentProps {
  children: React.ReactNode;
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

interface StepProps {
  number: string;
  title: string;
  description: string;
  details?: string[];
}

export function InlineContent({ children }: InlineContentProps) {
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

export function Step({ number, title, description, details }: StepProps) {
  return (
    <View style={styles.step}>
      <View style={styles.stepHeader}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>{number}</Text>
        </View>
        <Text style={styles.stepTitle}>{title}</Text>
      </View>
      <Text style={styles.stepDescription}>{description}</Text>
      {details && (
        <View style={styles.detailsList}>
          {details.map((detail, index) => (
            <View key={index} style={styles.detailItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.detailText}>{detail}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoText}>{children}</Text>
    </View>
  );
}

export function HighlightBox({ children, type = 'default' }: { children: React.ReactNode; type?: 'success' | 'warning' | 'info' | 'default' }) {
  return (
    <View style={[styles.highlightBox, styles[`highlightBox${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof styles]]}>
      <Text style={[styles.highlightText, styles[`highlightText${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof styles]]}>{children}</Text>
    </View>
  );
}

export function TimeBadge({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.timeBadge}>
      <Text style={styles.timeBadgeText}>{children}</Text>
    </View>
  );
}

export function TimeItem({ label, time }: { label: string; time: string }) {
  return (
    <View style={styles.timeItem}>
      <Text style={styles.timeLabel}>{label}:</Text>
      <Text style={styles.timeValue}>{time}</Text>
    </View>
  );
}

export function TipsList({ items }: { items: string[] }) {
  return (
    <View style={styles.tipsList}>
      {items.map((item, index) => (
        <View key={index} style={styles.tipItem}>
          <Text style={styles.tipNumber}>{index + 1}.</Text>
          <Text style={styles.tipText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20, // Increased from 18px as requested
    fontWeight: '700', // Increased from 600 to 700 as requested
    color: '#B15740',
    marginBottom: 24, // Increased from 12px to 24px as requested
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    letterSpacing: -0.5, // Added for better readability
  },
  paragraph: {
    fontSize: 15, // Slightly increased for better readability
    color: '#333333',
    lineHeight: 24, // Improved line height (1.6 ratio)
    marginBottom: 16, // Increased white space between concepts
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  boldText: {
    fontWeight: '600',
    color: '#B15740',
  },
  step: {
    marginBottom: 16,
    backgroundColor: 'rgba(184, 126, 112, 0.05)',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#B87E70',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#B15740',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#B87E70',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  stepDescription: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 21,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  detailsList: {
    marginTop: 8,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bullet: {
    fontSize: 14,
    color: '#B87E70',
    marginRight: 8,
    fontWeight: '600',
  },
  detailText: {
    fontSize: 13,
    color: '#555555',
    lineHeight: 19.5,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  infoBox: {
    backgroundColor: 'rgba(226, 130, 127, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(184, 126, 112, 0.2)',
    marginVertical: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#B15740',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 21,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  timeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(181, 87, 64, 0.05)',
    borderRadius: 8,
    marginBottom: 6,
  },
  timeLabel: {
    fontSize: 14,
    color: '#B87E70',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  timeValue: {
    fontSize: 14,
    color: '#B15740',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  tipsList: {
    marginTop: 8,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tipNumber: {
    fontSize: 14,
    color: '#B15740',
    fontWeight: '600',
    marginRight: 8,
    minWidth: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  tipText: {
    fontSize: 15, // Increased for better readability
    color: '#333333',
    lineHeight: 24, // Improved line height (1.6 ratio)
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  // Enhanced visual components
  highlightBox: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 12,
    borderWidth: 1,
  },
  highlightBoxDefault: {
    backgroundColor: 'rgba(184, 126, 112, 0.08)',
    borderColor: 'rgba(184, 126, 112, 0.3)',
  },
  highlightBoxSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  highlightBoxWarning: {
    backgroundColor: 'rgba(251, 146, 60, 0.08)',
    borderColor: 'rgba(251, 146, 60, 0.3)',
  },
  highlightBoxInfo: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  highlightText: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  highlightTextDefault: {
    color: '#B15740',
  },
  highlightTextSuccess: {
    color: '#16a34a',
  },
  highlightTextWarning: {
    color: '#ea580c',
  },
  highlightTextInfo: {
    color: '#2563eb',
  },
  timeBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  timeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});