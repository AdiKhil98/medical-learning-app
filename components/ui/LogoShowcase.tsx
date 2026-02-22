import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Logo from './Logo';
import { MEDICAL_COLORS } from '@/constants/medicalColors';

export default function LogoShowcase() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Header Design Variations</Text>
      
      {/* Premium Header (Recommended) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Premium Header (Recommended)</Text>
        <LinearGradient
          colors={['rgba(76, 175, 80, 0.98)', 'rgba(102, 187, 106, 0.95)', 'rgba(129, 199, 132, 0.85)']}
          style={styles.headerPreview}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View style={styles.menuPlaceholder} />
            <Logo size="medium" variant="premium" textColor="white" animated={false} />
            <View style={styles.rightSection}>
              <View style={styles.xpBadge}>
                <Text style={styles.xpText}>2450</Text>
                <Text style={styles.xpLabel}>XP</Text>
              </View>
              <View style={styles.achievementPlaceholder} />
            </View>
          </View>
        </LinearGradient>
        <Text style={styles.description}>
          • Premium gradient with Heart + KP initials overlay{'\n'}
          • Professional medical training vibe{'\n'}
          • Perfect for German market{'\n'}
          • Shows user XP in header
        </Text>
      </View>

      {/* Modern Header */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Modern Medical Brand</Text>
        <LinearGradient
          colors={['rgba(76, 175, 80, 0.98)', 'rgba(102, 187, 106, 0.95)']}
          style={styles.headerPreview}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View style={styles.menuPlaceholder} />
            <Logo size="medium" variant="modern" textColor="white" animated={false} />
            <View style={styles.rightSection}>
              <View style={styles.xpBadge}>
                <Text style={styles.xpText}>2450</Text>
                <Text style={styles.xpLabel}>XP</Text>
              </View>
              <View style={styles.achievementPlaceholder} />
            </View>
          </View>
        </LinearGradient>
        <Text style={styles.description}>
          • KP|MED with "MEDICAL EXCELLENCE" tagline{'\n'}
          • Stethoscope icon in gradient box{'\n'}
          • Clean, professional typography{'\n'}
          • Medical authority positioning
        </Text>
      </View>

      {/* Badge Style Header */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Professional Badge Style</Text>
        <LinearGradient
          colors={['rgba(76, 175, 80, 0.98)', 'rgba(102, 187, 106, 0.95)']}
          style={styles.headerPreview}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View style={styles.menuPlaceholder} />
            <Logo size="medium" variant="badge" textColor="white" animated={false} />
            <View style={styles.rightSection}>
              <View style={styles.xpBadge}>
                <Text style={styles.xpText}>2450</Text>
                <Text style={styles.xpLabel}>XP</Text>
              </View>
              <View style={styles.achievementPlaceholder} />
            </View>
          </View>
        </LinearGradient>
        <Text style={styles.description}>
          • Shield icon suggests protection/trust{'\n'}
          • "MedMeister" + "Prüfungsvorbereitung"{'\n'}
          • Perfect for German exam prep focus{'\n'}
          • Official/institutional feel
        </Text>
      </View>

      {/* Minimalist Header */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Minimalist Premium</Text>
        <LinearGradient
          colors={['rgba(76, 175, 80, 0.98)', 'rgba(102, 187, 106, 0.95)']}
          style={styles.headerPreview}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View style={styles.menuPlaceholder} />
            <Logo size="medium" variant="minimalist" textColor="white" animated={false} />
            <View style={styles.rightSection}>
              <View style={styles.xpBadge}>
                <Text style={styles.xpText}>2450</Text>
                <Text style={styles.xpLabel}>XP</Text>
              </View>
              <View style={styles.achievementPlaceholder} />
            </View>
          </View>
        </LinearGradient>
        <Text style={styles.description}>
          • Clean "KP" with rotating plus icon{'\n'}
          • "Medical Training Platform" tagline{'\n'}
          • Tech/startup vibe{'\n'}
          • Modern and scalable
        </Text>
      </View>

      {/* Size Variations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Size Variations (Premium)</Text>
        <View style={styles.sizeContainer}>
          <View style={styles.sizeDemo}>
            <Text style={styles.sizeLabel}>Small</Text>
            <Logo size="small" variant="premium" textColor="#0F4C81" animated={false} />
          </View>
          <View style={styles.sizeDemo}>
            <Text style={styles.sizeLabel}>Medium</Text>
            <Logo size="medium" variant="premium" textColor="#2E7D32" animated={false} />
          </View>
          <View style={styles.sizeDemo}>
            <Text style={styles.sizeLabel}>Large</Text>
            <Logo size="large" variant="premium" textColor="#0F4C81" animated={false} />
          </View>
        </View>
      </View>

      {/* Dark vs Light */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dark vs Light Backgrounds</Text>
        
        {/* Dark Background */}
        <View style={[styles.backgroundDemo, { backgroundColor: '#1F2937' }]}>
          <Text style={[styles.backgroundLabel, { color: 'white' }]}>Dark Background</Text>
          <Logo size="medium" variant="premium" textColor="white" animated={false} />
        </View>
        
        {/* Light Background */}
        <View style={[styles.backgroundDemo, { backgroundColor: '#F8FAFC' }]}>
          <Text style={[styles.backgroundLabel, { color: '#1F2937' }]}>Light Background</Text>
          <Logo size="medium" variant="premium" textColor="#2E7D32" animated={false} />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Choose your preferred variant and I'll implement it in the main header!
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2E7D32',
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  headerPreview: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuPlaceholder: {
    width: 24,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  xpBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 60,
  },
  xpText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  xpLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginTop: -1,
  },
  achievementPlaceholder: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginLeft: 4,
  },
  sizeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sizeDemo: {
    alignItems: 'center',
  },
  sizeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  backgroundDemo: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  backgroundLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  footer: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 20,
    marginBottom: 40,
    padding: 20,
    borderRadius: 16,
  },
  footerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
  },
});