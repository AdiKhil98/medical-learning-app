import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, Dimensions } from 'react-native';
import { OnboardingFeature } from './onboardingData';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ARROW_HEIGHT = 12;

export interface TourRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface GuidedTourProps {
  currentFeature: OnboardingFeature;
  currentRect: TourRect | null;
  stepIndex: number;
  totalSteps: number;
  onFeatureTap: () => void;
  onSkip: () => void;
}

const GuidedTour: React.FC<GuidedTourProps> = ({
  currentFeature,
  currentRect,
  stepIndex,
  totalSteps,
  onFeatureTap,
  onSkip,
}) => {
  const spotlightPadding = 8;

  return (
    <View style={styles.overlay}>
      {/* Dark Overlay with Spotlight Cutout */}
      <View style={styles.darkOverlay}>
        {currentRect && (
          <>
            {/* Top */}
            <View style={[styles.overlaySection, { height: currentRect.y - spotlightPadding }]} />

            {/* Middle Row */}
            <View style={{ flexDirection: 'row' }}>
              {/* Left */}
              <View
                style={[
                  styles.overlaySection,
                  {
                    width: currentRect.x - spotlightPadding,
                    height: currentRect.height + spotlightPadding * 2,
                  },
                ]}
              />

              {/* Spotlight (transparent) */}
              <TouchableOpacity
                activeOpacity={1}
                onPress={onFeatureTap}
                style={{
                  width: currentRect.width + spotlightPadding * 2,
                  height: currentRect.height + spotlightPadding * 2,
                }}
              />

              {/* Right */}
              <View
                style={[
                  styles.overlaySection,
                  {
                    flex: 1,
                    height: currentRect.height + spotlightPadding * 2,
                  },
                ]}
              />
            </View>

            {/* Bottom */}
            <View style={[styles.overlaySection, { flex: 1 }]} />
          </>
        )}
      </View>

      {/* Floating Tooltip Card */}
      {currentRect && (
        <View
          style={[
            styles.tooltip,
            {
              top: currentRect.y + currentRect.height + spotlightPadding + ARROW_HEIGHT + 8,
              left: Math.max(16, Math.min(currentRect.x + currentRect.width / 2 - 160, SCREEN_WIDTH - 336)),
            },
          ]}
        >
          {/* Arrow */}
          <View
            style={[
              styles.arrow,
              {
                left:
                  currentRect.x +
                  currentRect.width / 2 -
                  Math.max(16, Math.min(currentRect.x + currentRect.width / 2 - 160, SCREEN_WIDTH - 336)) -
                  8,
              },
            ]}
          />

          {/* Content */}
          <View style={styles.tooltipHeader}>
            <Text style={styles.tooltipEmoji}>{currentFeature.emoji}</Text>
            <View style={styles.tooltipTextContainer}>
              <Text style={styles.tooltipTitle}>{currentFeature.title}</Text>
              <Text style={[styles.tooltipTagline, { color: currentFeature.color }]}>{currentFeature.tagline}</Text>
            </View>
          </View>

          <Pressable onPress={onFeatureTap} style={styles.ctaButton}>
            <Text style={styles.ctaText}>Tippen Sie hier, um mehr zu erfahren →</Text>
          </Pressable>

          {/* Progress Dots */}
          <View style={styles.progressContainer}>
            <View style={styles.dotsContainer}>
              {Array.from({ length: totalSteps }).map((_, index) => (
                <View key={index} style={[styles.dot, index === stepIndex && styles.dotActive]} />
              ))}
            </View>
            <Text style={styles.stepCounter}>
              {stepIndex + 1} von {totalSteps}
            </Text>
          </View>
        </View>
      )}

      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
        <Text style={styles.skipText}>Tour überspringen</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlaySection: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  tooltip: {
    position: 'absolute',
    width: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  arrow: {
    position: 'absolute',
    top: -ARROW_HEIGHT,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  tooltipEmoji: {
    fontSize: 40,
  },
  tooltipTextContainer: {
    flex: 1,
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  tooltipTagline: {
    fontSize: 14,
    fontWeight: '600',
  },
  ctaButton: {
    backgroundColor: '#FFF9F5',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F97316',
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F97316',
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    backgroundColor: '#F97316',
    width: 24,
  },
  stepCounter: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F97316',
  },
});

export default GuidedTour;
