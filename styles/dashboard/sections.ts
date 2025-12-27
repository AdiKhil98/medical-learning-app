import { StyleSheet, Dimensions } from 'react-native';
import { MEDICAL_COLORS } from '@/constants/medicalColors';

const { width: screenWidth } = Dimensions.get('window');

export const sectionStyles = StyleSheet.create({
  // Section Headers
  structuredSection: {
    marginBottom: screenWidth > 768 ? 32 : 24,
  },
  structuredSectionHeader: {
    marginBottom: screenWidth > 768 ? 20 : 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: screenWidth > 768 ? 8 : 6,
  },
  structuredSectionTitle: {
    fontSize: screenWidth > 768 ? 28 : 24,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.textPrimary,
    marginLeft: 12,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  structuredSectionSubtitle: {
    fontSize: screenWidth > 768 ? 18 : 16,
    fontFamily: 'Inter-Medium',
    color: MEDICAL_COLORS.textSecondary,
    lineHeight: screenWidth > 768 ? 26 : 24,
    fontWeight: '500',
  },

  // Hero Text Styles
  splitScreenHeroTitle: {
    fontSize: screenWidth > 768 ? 32 : 28,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.textPrimary,
    textAlign: 'center',
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 1.15,
  },
  splitScreenHeroSubtitle: {
    fontSize: screenWidth > 768 ? 18 : 16,
    fontFamily: 'Inter-Medium',
    color: MEDICAL_COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 1.4,
    marginTop: 8,
  },

  // Quick Access Section
  quickAccessGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: screenWidth > 768 ? 8 : 4,
  },

  // Recent Content Section
  recentContentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: screenWidth > 768 ? 8 : 4,
  },
  recentContentCard: {
    width: screenWidth > 768 ? '48%' : '48%',
    backgroundColor: 'white',
    borderRadius: screenWidth > 768 ? 16 : 14,
    padding: screenWidth > 768 ? 20 : 16,
    marginBottom: screenWidth > 768 ? 16 : 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  recentContentTitle: {
    fontSize: screenWidth > 768 ? 18 : 16,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.textPrimary,
    marginBottom: 6,
    fontWeight: '700',
    lineHeight: 1.3,
  },
  recentContentCategory: {
    fontSize: screenWidth > 768 ? 14 : 12,
    fontFamily: 'Inter-Medium',
    color: MEDICAL_COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  recentContentDate: {
    fontSize: screenWidth > 768 ? 12 : 11,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
  },

  // Premium Disclaimer
  disclaimerCard: {
    borderRadius: 20,
    marginVertical: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  disclaimerGradient: {
    padding: 20,
  },
  disclaimerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disclaimerIcon: {
    marginRight: 12,
  },
  disclaimerTextContainer: {
    flex: 1,
  },
  disclaimerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: 'white',
    fontWeight: '700',
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
    lineHeight: 20,
  },

  // Missing section styles for dashboard components
  noContentText: {
    fontSize: screenWidth > 768 ? 16 : 14,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    textAlign: 'center' as const,
    padding: 16,
  },
  categoryBadge: {
    backgroundColor: MEDICAL_COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  categoryText: {
    fontSize: screenWidth > 768 ? 13 : 12,
    fontFamily: 'Inter-Medium',
    color: MEDICAL_COLORS.primary,
    fontWeight: '500',
  },
  sectionCompleteBadge: {
    backgroundColor: `${MEDICAL_COLORS.success  }20`,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  sectionCompleteText: {
    fontSize: screenWidth > 768 ? 13 : 12,
    fontFamily: 'Inter-Medium',
    color: MEDICAL_COLORS.success,
    fontWeight: '500',
    marginLeft: 4,
  },
  tipTitleCard: {
    backgroundColor: 'white',
    borderRadius: screenWidth > 768 ? 16 : 14,
    padding: screenWidth > 768 ? 20 : 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionArrow: {
    marginLeft: 8,
  },
  primaryButton: {
    backgroundColor: MEDICAL_COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  primaryButtonText: {
    fontSize: screenWidth > 768 ? 16 : 14,
    fontFamily: 'Inter-Bold',
    color: 'white',
    fontWeight: '700',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  quickAccessSectionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
  },
  modernSectionTitle: {
    fontSize: screenWidth > 768 ? 24 : 20,
    fontFamily: 'Inter-Bold',
    color: MEDICAL_COLORS.textPrimary,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  quickAccessBadgeText: {
    fontSize: screenWidth > 768 ? 13 : 12,
    fontFamily: 'Inter-Medium',
    color: MEDICAL_COLORS.primary,
    fontWeight: '500',
  },
  modernSectionSubtitle: {
    fontSize: screenWidth > 768 ? 16 : 14,
    fontFamily: 'Inter-Regular',
    color: MEDICAL_COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 22,
  },
  heroSubtitleContainer: {
    marginTop: 8,
  },
});
