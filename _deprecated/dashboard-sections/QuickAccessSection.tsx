import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, Target, TrendingUp, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { dashboardStyles as styles } from '@/styles/dashboard';

interface QuickAccessSectionProps {
  // Add any props needed for customization
}

const QuickAccessSection = React.memo<QuickAccessSectionProps>(() => {
  const router = useRouter();

  return (
    <View style={styles.section}>
      {/* Hero for Section 1 */}
      <View style={styles.sectionHero}>
        <View style={styles.heroContent}>
          <View style={styles.heroTitleContainer}>
            <Text style={styles.splitScreenHeroTitle}>Schnellzugriff zu deinen Lernmaterialien</Text>
          </View>
          <View style={styles.heroSubtitleContainer}>
            <Text style={styles.splitScreenHeroSubtitle}>Setze dein Lernen nahtlos fort</Text>
          </View>
          <View style={styles.heroButtonsContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(tabs)/bibliothek')}>
              <Text style={styles.primaryButtonText}>Zur Bibliothek</Text>
              <ArrowRight size={18} color="white" style={styles.buttonIcon} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Section content */}
      <View style={styles.sectionContentInner}>
        <View style={styles.quickAccessSection}>
          <View style={styles.quickAccessSectionHeader}>
            <View style={styles.quickAccessTitleRow}>
              <Text style={styles.modernSectionTitle}>Schnellzugriff</Text>
              <View style={styles.quickAccessBadge}>
                <Text style={styles.quickAccessBadgeText}>Neu</Text>
              </View>
            </View>
            <Text style={styles.modernSectionSubtitle}>Setze dein Lernen nahtlos fort</Text>
          </View>

          <View style={styles.quickAccessGrid}>
            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => router.push('/(tabs)/bibliothek')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#E2827F', '#B87E70', '#B15740']} // DRAMATIC coral gradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickAccessGradient}
              >
                <BookOpen size={24} color="white" style={styles.quickAccessIcon} />
                <Text style={styles.quickAccessTitle}>Bibliothek</Text>
                <Text style={styles.quickAccessSubtitle}>Lernmaterialien</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => router.push('/(tabs)/simulation')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#E2827F', '#B15740', '#B15740']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickAccessGradient}
              >
                <Target size={24} color="white" style={styles.quickAccessIcon} />
                <Text style={styles.quickAccessTitle}>Simulation</Text>
                <Text style={styles.quickAccessSubtitle}>Prüfungstraining</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Progress card hidden temporarily
            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => router.push('/(tabs)/progress')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#10B981', '#059669', '#047857']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.quickAccessGradient}
              >
                <TrendingUp size={24} color="white" style={styles.quickAccessIcon} />
                <Text style={styles.quickAccessTitle}>Fortschritt</Text>
                <Text style={styles.quickAccessSubtitle}>Deine Statistiken</Text>
              </LinearGradient>
            </TouchableOpacity>
            */}
          </View>
        </View>
      </View>
    </View>
  );
});

QuickAccessSection.displayName = 'QuickAccessSection';

export default QuickAccessSection;
