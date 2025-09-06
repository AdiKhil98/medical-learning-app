import React from 'react';
import { View, Text, Animated } from 'react-native';
import { Lightbulb } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { dashboardStyles as styles } from '@/styles/dashboard';
import { SectionErrorBoundary } from '../ErrorBoundary';
import { SectionSkeleton } from '../LoadingSkeleton';
import type { DailyTip } from '@/hooks/useDailyContent';

interface DailyTipSectionProps {
  dailyTip: DailyTip | null;
  loading?: boolean;
  bounceAnim: Animated.Value;
}

const DailyTipSection = React.memo<DailyTipSectionProps>(({ 
  dailyTip, 
  loading = false, 
  bounceAnim 
}) => {
  if (loading) {
    return <SectionSkeleton />;
  }

  return (
    <SectionErrorBoundary>
      <View style={styles.section}>
        {/* Hero for Section 2 */}
        <View style={styles.sectionHero}>
          <View style={styles.heroContent}>
            <View style={styles.heroTitleContainer}>
              <Text style={styles.splitScreenHeroTitle}>
                Tipp des Tages
              </Text>
            </View>
            <View style={styles.heroSubtitleContainer}>
              <Text style={styles.splitScreenHeroSubtitle}>
                Erweitere dein medizinisches Wissen täglich
              </Text>
            </View>
          </View>
        </View>
        
        {/* Section content */}
        <View style={styles.sectionContentInner}>
          <View style={styles.structuredSection}>
            <View style={styles.structuredSectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Lightbulb size={24} color="#F59E0B" />
                <Text style={styles.structuredSectionTitle}>Tipp des Tages</Text>
              </View>
              <Text style={styles.structuredSectionSubtitle}>
                Erweitere dein medizinisches Wissen täglich
              </Text>
            </View>
            
            <View style={styles.tipCard}>
              <LinearGradient
                colors={['#FEF3C7', '#FDE68A', '#FBBF24']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.tipCardGradient}
              >
                <View style={styles.tipCardHeader}>
                  <View style={styles.tipIconBg}>
                    <Lightbulb size={28} color="white" />
                  </View>
                  <View style={styles.tipHeaderInfo}>
                    <Text style={styles.tipCardTitle}>Medizinischer Tipp</Text>
                    <Text style={styles.tipCardSubtitle}>Erweitere dein Wissen</Text>
                  </View>
                </View>
                
                {dailyTip ? (
                  <>
                    {dailyTip.title && (
                      <Text style={styles.tipTitleCard}>{dailyTip.title}</Text>
                    )}
                    
                    <Text style={styles.tipContent}>
                      {dailyTip.content || dailyTip.tip_content || dailyTip.tip}
                    </Text>
                    
                    {dailyTip.category && (
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{dailyTip.category}</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={styles.noContentText}>
                    Heute gibt es noch keinen Tipp. Schauen Sie später wieder vorbei!
                  </Text>
                )}
              </LinearGradient>
            </View>
            
            {/* Enhanced Navigation Arrow */}
            <Animated.View 
              style={[
                styles.sectionArrow,
                {
                  transform: [{
                    translateY: bounceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -8]
                    })
                  }],
                  opacity: 1
                }
              ]}
            />
          </View>
        </View>
      </View>
    </SectionErrorBoundary>
  );
});

DailyTipSection.displayName = 'DailyTipSection';

export default DailyTipSection;