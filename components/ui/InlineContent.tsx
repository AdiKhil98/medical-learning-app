import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
  description: string | React.ReactNode;
  details?: string[];
}

export function InlineContent({ children }: InlineContentProps) {
  return <View style={styles.container}>{children}</View>;
}

export function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.glassCard}>
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
        <LinearGradient
          colors={['#8b5cf6', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.stepNumber}
        >
          <Text style={styles.stepNumberText}>{number}</Text>
        </LinearGradient>
        <Text style={styles.stepTitle}>{title}</Text>
      </View>
      {typeof description === 'string' ? (
        <Text style={styles.stepDescription}>{description}</Text>
      ) : (
        <View style={styles.stepDescription}>{description}</View>
      )}
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
  const getBoxStyle = () => {
    switch (type) {
      case 'success':
        return styles.highlightBoxSuccess;
      case 'warning':
        return styles.highlightBoxWarning;
      case 'info':
        return styles.highlightBoxInfo;
      default:
        return styles.highlightBoxDefault;
    }
  };

  const getTextStyle = () => {
    switch (type) {
      case 'success':
        return styles.highlightTextSuccess;
      case 'warning':
        return styles.highlightTextWarning;
      case 'info':
        return styles.highlightTextInfo;
      default:
        return styles.highlightTextDefault;
    }
  };

  return (
    <View style={[styles.highlightBox, getBoxStyle()]}>
      <Text style={[styles.highlightText, getTextStyle()]}>{children}</Text>
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
  glassCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 30,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: 'rgba(0, 0, 0, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    marginBottom: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    letterSpacing: -0.5,
  },
  paragraph: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 26,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  boldText: {
    fontWeight: '700',
    color: '#7c3aed',
  },
  step: {
    marginBottom: 30,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 15,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  stepDescription: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 26,
    marginLeft: 55,
    marginBottom: 15,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  detailsList: {
    marginLeft: 55,
    marginTop: 8,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 16,
    color: '#7c3aed',
    marginRight: 12,
    fontWeight: '600',
  },
  detailText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 24,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  infoBox: {
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    marginVertical: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#7c3aed',
    fontWeight: '600',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  timeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  timeLabel: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  timeValue: {
    fontSize: 15,
    color: '#7c3aed',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  tipsList: {
    marginTop: 8,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tipNumber: {
    fontSize: 15,
    color: '#8b5cf6',
    fontWeight: '700',
    marginRight: 12,
    minWidth: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  tipText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 24,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  // Enhanced visual components with light theme
  highlightBox: {
    padding: 20,
    borderRadius: 12,
    marginVertical: 12,
    borderLeftWidth: 4,
    borderWidth: 1,
  },
  highlightBoxDefault: {
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderLeftColor: '#8b5cf6',
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  highlightBoxSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderLeftColor: '#10b981',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  highlightBoxWarning: {
    backgroundColor: 'rgba(251, 191, 36, 0.05)',
    borderLeftColor: '#fbbf24',
    borderColor: 'rgba(251, 191, 36, 0.2)',
  },
  highlightBoxInfo: {
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderLeftColor: '#3b82f6',
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  highlightText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  highlightTextDefault: {
    color: '#7c3aed',
  },
  highlightTextSuccess: {
    color: '#059669',
  },
  highlightTextWarning: {
    color: '#d97706',
  },
  highlightTextInfo: {
    color: '#2563eb',
  },
  timeBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  timeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});
