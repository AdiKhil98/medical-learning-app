import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BookOpen,
  Menu as MenuIcon,
} from 'lucide-react-native';
import Menu from '@/components/ui/Menu';
import Logo from '@/components/ui/Logo';
import UserAvatar from '@/components/ui/UserAvatar';
import AboutUsModal from '@/components/ui/AboutUsModal';
import { useRouter } from 'expo-router';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SlidingHomepageProps {
  onGetStarted?: () => void;
}

export default function SlidingHomepage({ onGetStarted }: SlidingHomepageProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAboutUs, setShowAboutUs] = useState(false);
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Clean gradient background */}
      <LinearGradient
        colors={['#F8FAFC', '#FFFFFF', '#F1F5F9']}
        style={styles.backgroundGradient}
      />

      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <LinearGradient
          colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setMenuOpen(true)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['rgba(251, 146, 60, 0.15)', 'rgba(239, 68, 68, 0.10)']}
                style={styles.menuButtonGradient}
              >
                <MenuIcon size={24} color="#FB923C" />
              </LinearGradient>
            </TouchableOpacity>
            <Logo size="medium" variant="medical" textColor="#FB923C" animated={true} />
            <UserAvatar size="medium" />
          </View>
        </LinearGradient>
      </View>

      {/* Main Content - Centered Welcome Card */}
      <View style={styles.mainContent}>
        <View style={styles.heroCard}>
          {/* Icon Container */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#FB923C', '#EF4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <BookOpen size={40} color="#FFFFFF" strokeWidth={2} />
            </LinearGradient>
          </View>

          {/* Heading */}
          <Text style={styles.heading}>
            Bestehen Sie Ihre KP & FSP{'\n'}Prüfung beim ersten Versuch
          </Text>

          {/* Subheading */}
          <Text style={styles.subheading}>
            Realistische Prüfungen • Persönliches Feedback • Relevante Inhalte
          </Text>

          {/* CTA Buttons */}
          <View style={styles.buttonsContainer}>
            {/* Button 1 - Simulation testen */}
            <TouchableOpacity
              style={styles.buttonWrapper}
              onPress={() => router.push('/(tabs)/simulation')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#FB923C', '#F97316', '#EF4444']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                <Text style={styles.buttonText}>Simulation testen</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Button 2 - Abonnieren */}
            <TouchableOpacity
              style={styles.buttonWrapper}
              onPress={() => router.push('/subscription')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#FCD34D', '#FBBF24', '#F59E0B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.secondaryButton}
              >
                <Text style={styles.buttonText}>Abonnieren</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Button 3 - Über KP Med */}
            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => setShowAboutUs(true)}
              activeOpacity={0.9}
            >
              <Text style={styles.outlineButtonText}>Über KP Med</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Menu */}
      <Menu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* About Us Modal */}
      <AboutUsModal
        visible={showAboutUs}
        onClose={() => setShowAboutUs(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: screenHeight,
  },

  // Header Styles
  modernHeader: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    zIndex: 1000,
  },
  headerGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingTop: 24,
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuButtonGradient: {
    padding: 14,
    borderRadius: 16,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },

  // Main Content Styles
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: screenWidth < 600 ? 32 : 40,
    width: '100%',
    maxWidth: 640,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 20,
    alignItems: 'center',
  },

  // Icon Styles
  iconContainer: {
    marginBottom: 24,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(251, 146, 60, 0.4)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },

  // Typography Styles
  heading: {
    fontSize: screenWidth < 600 ? 24 : 30,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: screenWidth < 600 ? 32 : 40,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: screenWidth < 600 ? 16 : 18,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: screenWidth < 600 ? 24 : 28,
    fontWeight: '400',
  },

  // Button Styles
  buttonsContainer: {
    width: '100%',
    gap: 16,
  },
  buttonWrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: 'rgba(251, 146, 60, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  outlineButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FB923C',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    color: '#FB923C',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
