import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { OnboardingStep, ONBOARDING_STEPS } from './onboardingSteps';

const { width: SW, height: SH } = Dimensions.get('window');

interface MeasuredRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SpotlightOverlayProps {
  /** Record of refKey → React Native ref for each dashboard element */
  refs: Record<string, any>;
  /** Called when user completes or skips the tour */
  onDismiss: () => void;
}

export default function SpotlightOverlay({ refs, onDismiss }: SpotlightOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<MeasuredRect | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [visible, setVisible] = useState(false);

  const currentStep = ONBOARDING_STEPS[stepIndex];
  const isLast = stepIndex === ONBOARDING_STEPS.length - 1;

  console.log('[SpotlightOverlay] Mounted. Steps:', ONBOARDING_STEPS.length);
  console.log('[SpotlightOverlay] Current step:', stepIndex, currentStep?.refKey);
  console.log('[SpotlightOverlay] Available refs:', Object.keys(refs));

  // Fade in on mount after a short delay
  useEffect(() => {
    console.log('[SpotlightOverlay] Setting up fade-in timer (600ms delay)');
    const timer = setTimeout(() => {
      console.log('[SpotlightOverlay] Timer fired - setting visible to true');
      setVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        console.log('[SpotlightOverlay] Fade animation completed');
      });
    }, 600); // 600ms delay so dashboard renders first
    return () => clearTimeout(timer);
  }, [fadeAnim]);

  // Measure the current target element
  const measureTarget = useCallback(() => {
    if (!currentStep) {
      console.log('[SpotlightOverlay] No current step');
      return;
    }
    const ref = refs[currentStep.refKey];
    console.log('[SpotlightOverlay] Measuring ref:', currentStep.refKey, 'exists:', !!ref);
    if (ref && ref.measureInWindow) {
      ref.measureInWindow((x: number, y: number, w: number, h: number) => {
        console.log('[SpotlightOverlay] Measured (measureInWindow):', { x, y, w, h });
        if (w > 0 && h > 0) {
          const newRect = { x, y, width: w, height: h };
          console.log('[SpotlightOverlay] Setting rect:', newRect);
          setRect(newRect);
        } else {
          console.log('[SpotlightOverlay] Invalid dimensions (w or h is 0)');
        }
      });
    } else if (ref && ref.measure) {
      ref.measure((_x: number, _y: number, w: number, h: number, pageX: number, pageY: number) => {
        console.log('[SpotlightOverlay] Measured (measure):', { pageX, pageY, w, h });
        if (w > 0 && h > 0) {
          setRect({ x: pageX, y: pageY, width: w, height: h });
        } else {
          console.log('[SpotlightOverlay] Invalid dimensions (w or h is 0)');
        }
      });
    } else {
      console.log('[SpotlightOverlay] Ref not found or no measure method');
    }
  }, [stepIndex, currentStep, refs]);

  useEffect(() => {
    // Remeasure when step changes, with a small delay for layout
    const timer = setTimeout(measureTarget, 200);
    return () => clearTimeout(timer);
  }, [stepIndex, measureTarget]);

  // Also remeasure on layout changes
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', measureTarget);
    return () => sub?.remove();
  }, [measureTarget]);

  const goNext = () => {
    if (isLast) {
      // Fade out, then dismiss
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
        onDismiss();
      });
    } else {
      setRect(null); // clear while measuring next
      setStepIndex(stepIndex + 1);
    }
  };

  const skip = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      onDismiss();
    });
  };

  console.log('[SpotlightOverlay] Render check:', { visible, currentStep: !!currentStep, rect: !!rect });
  if (!visible || !currentStep) {
    console.log('[SpotlightOverlay] NOT rendering - visible:', visible, 'currentStep:', !!currentStep);
    return null;
  }
  console.log('[SpotlightOverlay] RENDERING overlay');

  // Calculate tooltip position
  const padding = 12; // padding around spotlight
  const tooltipWidth = Math.min(320, SW - 40);

  let tooltipTop = 0;
  let tooltipLeft = Math.max(20, (SW - tooltipWidth) / 2);
  let arrowLeft = tooltipWidth / 2;

  if (rect) {
    if (currentStep.tooltipPosition === 'below') {
      tooltipTop = rect.y + rect.height + padding + 12;
    } else {
      // above: tooltip bottom edge is above the spotlight
      tooltipTop = rect.y - padding - 12; // will be adjusted by tooltip height
    }
    // Try to center tooltip on the element
    const elementCenter = rect.x + rect.width / 2;
    tooltipLeft = Math.max(20, Math.min(elementCenter - tooltipWidth / 2, SW - tooltipWidth - 20));
    arrowLeft = elementCenter - tooltipLeft;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]} pointerEvents="box-none">
      {/* Background overlay - tappable to advance */}
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={goNext} />

      {/* Spotlight cutout */}
      {rect && (
        <View
          style={[
            styles.spotlight,
            {
              top: rect.y - padding,
              left: rect.x - padding,
              width: rect.width + padding * 2,
              height: rect.height + padding * 2,
              borderRadius: 16,
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Tooltip */}
      {rect && (
        <View
          style={[
            styles.tooltip,
            {
              top: currentStep.tooltipPosition === 'above' ? undefined : tooltipTop,
              bottom: currentStep.tooltipPosition === 'above' ? SH - (rect.y - padding - 12) : undefined,
              left: tooltipLeft,
              width: tooltipWidth,
            },
          ]}
        >
          {/* Arrow pointing to element */}
          {currentStep.tooltipPosition === 'below' && (
            <View style={[styles.arrowUp, { left: Math.max(16, Math.min(arrowLeft - 8, tooltipWidth - 24)) }]} />
          )}

          <View style={styles.tooltipCard}>
            {/* Header row */}
            <View style={styles.tooltipHeader}>
              <Text style={styles.tooltipEmoji}>{currentStep.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.tooltipTitle}>{currentStep.title}</Text>
              </View>
              <Text style={styles.stepCounter}>
                {stepIndex + 1}/{ONBOARDING_STEPS.length}
              </Text>
            </View>

            {/* Description */}
            <Text style={styles.tooltipDesc}>{currentStep.description}</Text>

            {/* Progress dots + buttons */}
            <View style={styles.tooltipFooter}>
              <View style={styles.dots}>
                {ONBOARDING_STEPS.map((_, i) => (
                  <View key={i} style={[styles.dot, { width: i === stepIndex ? 20 : 6 }]}>
                    {i === stepIndex ? (
                      <LinearGradient
                        colors={['#F97316', '#EF4444']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ flex: 1, borderRadius: 3 }}
                      />
                    ) : (
                      <View
                        style={{
                          flex: 1,
                          borderRadius: 3,
                          backgroundColor: i < stepIndex ? '#F9731666' : 'rgba(255,255,255,0.3)',
                        }}
                      />
                    )}
                  </View>
                ))}
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity onPress={skip} style={styles.skipBtn}>
                  <Text style={styles.skipText}>{isLast ? '' : 'Überspringen'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={goNext} activeOpacity={0.85}>
                  <LinearGradient
                    colors={['#F97316', '#EF4444']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.nextBtn}
                  >
                    <Text style={styles.nextText}>{isLast ? 'Verstanden!' : 'Weiter'}</Text>
                    {!isLast && <Ionicons name="arrow-forward" size={16} color="white" />}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Arrow pointing to element (below) */}
          {currentStep.tooltipPosition === 'above' && (
            <View style={[styles.arrowDown, { left: Math.max(16, Math.min(arrowLeft - 8, tooltipWidth - 24)) }]} />
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  spotlight: {
    position: 'absolute',
    // The spotlight creates a "hole" effect.
    // On web, use box-shadow trick. On native, we rely on the visual contrast.
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(249, 115, 22, 0.5)',
    ...Platform.select({
      web: {
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
      },
      default: {
        // On native, the overlay behind handles the dimming.
        // The spotlight border shows where to look.
      },
    }),
  },
  tooltip: {
    position: 'absolute',
    zIndex: 10000,
  },
  tooltipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: { elevation: 8 },
      web: { boxShadow: '0 8px 32px rgba(0,0,0,0.18)' },
    }),
  },
  arrowUp: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
    zIndex: -1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: -2, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      web: { boxShadow: '-2px -2px 4px rgba(0,0,0,0.06)' },
    }),
  },
  arrowDown: {
    position: 'absolute',
    bottom: -6,
    width: 16,
    height: 16,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
    zIndex: -1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      web: { boxShadow: '2px 2px 4px rgba(0,0,0,0.06)' },
    }),
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  tooltipEmoji: {
    fontSize: 24,
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  stepCounter: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  tooltipDesc: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
    marginBottom: 16,
  },
  tooltipFooter: {
    gap: 12,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  nextText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
