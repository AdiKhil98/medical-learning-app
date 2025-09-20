import { StyleSheet, Dimensions } from 'react-native';
import { MEDICAL_COLORS } from '@/constants/medicalColors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const layoutStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F3E8', // White Linen background
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: MEDICAL_COLORS.textSecondary,
    fontFamily: 'Inter-Regular',
  },
  scrollViewContainer: {
    flex: 1,
    paddingTop: 0,
  },
  sectionScrollView: {
    flex: 1,
  },
  section: {
    width: screenWidth,
    flex: 1,
  },
  sectionContainer: {
    width: screenWidth,
    flex: 1,
  },
  sectionContentInner: {
    paddingHorizontal: screenWidth > 768 ? 32 : 16,
    paddingBottom: screenWidth > 768 ? 32 : 20,
    paddingTop: screenWidth > 768 ? 24 : 16,
  },
  sectionHero: {
    paddingHorizontal: screenWidth > 768 ? 32 : 16,
    paddingVertical: screenWidth > 768 ? 32 : 20,
    marginBottom: screenWidth > 768 ? 24 : 16,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitleContainer: {
    marginBottom: 8,
  },
  heroSubtitleContainer: {
    marginTop: 4,
  },
});

export { screenWidth, screenHeight };