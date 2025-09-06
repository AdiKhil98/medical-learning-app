import { StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

export const navigationStyles = StyleSheet.create({
  navigationContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: screenWidth > 768 ? 24 : 16,
    zIndex: 10,
    pointerEvents: 'box-none',
  },
  navArrow: {
    width: screenWidth > 768 ? 48 : 44,
    height: screenWidth > 768 ? 48 : 44,
    borderRadius: screenWidth > 768 ? 24 : 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledArrow: {
    opacity: 0.3,
  },
  sectionIndicators: {
    position: 'absolute',
    bottom: screenWidth > 768 ? 120 : 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  sectionDot: {
    width: screenWidth > 768 ? 12 : 10,
    height: screenWidth > 768 ? 12 : 10,
    borderRadius: screenWidth > 768 ? 6 : 5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: screenWidth > 768 ? 8 : 6,
  },
  activeSectionDot: {
    backgroundColor: 'white',
    width: screenWidth > 768 ? 24 : 20,
    borderRadius: screenWidth > 768 ? 12 : 10,
  },
});