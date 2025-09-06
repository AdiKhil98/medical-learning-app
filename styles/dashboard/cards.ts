import { StyleSheet, Dimensions } from 'react-native';
import { MEDICAL_COLORS } from '@/constants/medicalColors';

const { width: screenWidth } = Dimensions.get('window');

export const cardStyles = StyleSheet.create({
  // Question Card Styles
  questionCard: {
    borderRadius: screenWidth > 768 ? 24 : 20,
    marginHorizontal: 0,
    marginVertical: screenWidth > 768 ? 16 : 12,
    overflow: 'hidden',
    shadowColor: MEDICAL_COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  questionCardGradient: {
    padding: screenWidth > 768 ? 28 : 24,
    minHeight: screenWidth > 768 ? 300 : 280,
  },
  questionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionIconBg: {
    width: screenWidth > 768 ? 56 : 52,
    height: screenWidth > 768 ? 56 : 52,
    borderRadius: screenWidth > 768 ? 28 : 26,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(255, 255, 255, 0.5)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  questionHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  questionCardTitle: {
    fontSize: screenWidth > 768 ? 22 : 20,
    fontFamily: 'Inter-Bold',
    color: 'white',
    marginBottom: 6,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 1.2,
  },
  questionCardSubtitle: {
    fontSize: screenWidth > 768 ? 16 : 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
    lineHeight: 1.4,
  },
  questionText: {
    fontSize: screenWidth > 768 ? 20 : 18,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
    lineHeight: screenWidth > 768 ? 28 : 26,
    marginBottom: screenWidth > 768 ? 24 : 20,
    fontWeight: '600',
  },

  // Answer Options
  answersContainer: {
    marginTop: screenWidth > 768 ? 8 : 4,
  },
  answerOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: screenWidth > 768 ? 16 : 14,
    padding: screenWidth > 768 ? 18 : 16,
    marginBottom: screenWidth > 768 ? 14 : 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  correctOption: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    borderColor: '#22C55E',
  },
  incorrectOption: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderColor: '#EF4444',
  },
  answerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionLetter: {
    fontSize: screenWidth > 768 ? 18 : 16,
    fontFamily: 'Inter-Bold',
    color: 'white',
    marginRight: screenWidth > 768 ? 16 : 14,
    fontWeight: '700',
    minWidth: screenWidth > 768 ? 28 : 24,
  },
  answerText: {
    fontSize: screenWidth > 768 ? 17 : 15,
    fontFamily: 'Inter-Medium',
    color: 'white',
    flex: 1,
    lineHeight: screenWidth > 768 ? 24 : 22,
    fontWeight: '500',
  },
  correctAnswerText: {
    color: 'white',
    fontWeight: '600',
  },
  incorrectAnswerText: {
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Explanation
  explanationContainer: {
    marginTop: screenWidth > 768 ? 24 : 20,
    padding: screenWidth > 768 ? 20 : 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: screenWidth > 768 ? 16 : 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  explanationTitle: {
    fontSize: screenWidth > 768 ? 18 : 16,
    fontFamily: 'Inter-Bold',
    color: 'white',
    marginBottom: screenWidth > 768 ? 12 : 10,
    fontWeight: '700',
  },
  explanationText: {
    fontSize: screenWidth > 768 ? 16 : 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: screenWidth > 768 ? 24 : 22,
  },

  // Daily Tip Card
  tipCard: {
    borderRadius: screenWidth > 768 ? 24 : 20,
    marginVertical: screenWidth > 768 ? 16 : 12,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  tipCardGradient: {
    padding: screenWidth > 768 ? 28 : 24,
    minHeight: screenWidth > 768 ? 200 : 180,
  },
  tipCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tipIconBg: {
    width: screenWidth > 768 ? 56 : 52,
    height: screenWidth > 768 ? 56 : 52,
    borderRadius: screenWidth > 768 ? 28 : 26,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  tipCardTitle: {
    fontSize: screenWidth > 768 ? 22 : 20,
    fontFamily: 'Inter-Bold',
    color: 'white',
    marginBottom: 6,
    fontWeight: '700',
  },
  tipCardSubtitle: {
    fontSize: screenWidth > 768 ? 16 : 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
  },
  tipContent: {
    fontSize: screenWidth > 768 ? 18 : 16,
    fontFamily: 'Inter-Regular',
    color: 'white',
    lineHeight: screenWidth > 768 ? 26 : 24,
    marginTop: 8,
  },

  // Quick Access Cards
  quickAccessCard: {
    flex: 1,
    borderRadius: screenWidth > 768 ? 20 : 16,
    marginHorizontal: screenWidth > 768 ? 8 : 6,
    marginVertical: screenWidth > 768 ? 12 : 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  quickAccessGradient: {
    padding: screenWidth > 768 ? 24 : 20,
    minHeight: screenWidth > 768 ? 140 : 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAccessIcon: {
    marginBottom: screenWidth > 768 ? 12 : 10,
  },
  quickAccessTitle: {
    fontSize: screenWidth > 768 ? 18 : 16,
    fontFamily: 'Inter-Bold',
    color: 'white',
    textAlign: 'center',
    fontWeight: '700',
  },
  quickAccessSubtitle: {
    fontSize: screenWidth > 768 ? 14 : 12,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
});