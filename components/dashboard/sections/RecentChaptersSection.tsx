import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, Clock, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { dashboardStyles as styles } from '@/styles/dashboard';
import { SectionErrorBoundary } from '../ErrorBoundary';

export interface MedicalContent {
  id: string;
  title: string;
  category?: string;
  lastViewed: string;
}

interface RecentChaptersSectionProps {
  recentMedicalContents: MedicalContent[];
}

const RecentChaptersSection = React.memo<RecentChaptersSectionProps>(({ 
  recentMedicalContents 
}) => {
  const router = useRouter();

  return (
    <SectionErrorBoundary>
      <View style={styles.section}>
        {/* Hero for Section 4 */}
        <View style={styles.sectionHero}>
          <View style={styles.heroContent}>
            <View style={styles.heroTitleContainer}>
              <Text style={styles.splitScreenHeroTitle}>
                Letzte Kapitel
              </Text>
            </View>
            <View style={styles.heroSubtitleContainer}>
              <Text style={styles.splitScreenHeroSubtitle}>
                Setze dort fort, wo du aufgehört hast
              </Text>
            </View>
            <View style={styles.heroButtonsContainer}>
              <TouchableOpacity 
                style={styles.primaryButton}
                onPress={() => router.push('/(tabs)/bibliothek')}
              >
                <Text style={styles.primaryButtonText}>Alle Kapitel</Text>
                <ArrowRight size={18} color="white" style={styles.buttonIcon} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Section content */}
        <View style={styles.sectionContentInner}>
          {recentMedicalContents.length > 0 ? (
            <View style={styles.letzteKapitelSection}>
              <View style={styles.modernStructuredSectionHeader}>
                <View style={styles.modernSectionTitleContainer}>
                  <View style={styles.sectionIconWrapper}>
                    <BookOpen size={26} color="#4A90E2" />
                  </View>
                  <View style={styles.titleAndBadgeContainer}>
                    <Text style={styles.modernStructuredSectionTitle}>Letzte Kapitel</Text>
                    <View style={styles.chapterCountBadge}>
                      <Text style={styles.chapterCountText}>{recentMedicalContents.length}</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.modernStructuredSectionSubtitle}>
                  Setze dort fort, wo du aufgehört hast
                </Text>
              </View>
              
              <View style={styles.modernChapterCardsContainer}>
                {recentMedicalContents.map((content, index) => (
                  <TouchableOpacity 
                    key={content.id} 
                    style={styles.modernChapterCard}
                    onPress={() => router.push('/(tabs)/bibliothek')}
                    activeOpacity={0.9}
                  >
                    <LinearGradient
                      colors={['#ffffff', '#f8fafc', '#e2e8f0']}
                      style={styles.modernChapterCardGradient}
                    >
                      <View style={styles.modernChapterCardHeader}>
                        <View style={styles.modernChapterIconContainer}>
                          <BookOpen size={20} color="#4A90E2" />
                        </View>
                        <View style={styles.chapterStatusRow}>
                          <View style={styles.difficultyBadge}>
                            <Text style={styles.difficultyText}>FSP</Text>
                          </View>
                          <View style={styles.modernProgressBadge}>
                            <Text style={styles.modernProgressText}>
                              {Math.floor(Math.random() * 100)}%
                            </Text>
                          </View>
                        </View>
                      </View>
                      
                      <View style={styles.modernChapterCardBody}>
                        <Text style={styles.modernChapterTitle}>{content.title}</Text>
                        <View style={styles.modernChapterMetaContainer}>
                          <View style={styles.modernChapterMeta}>
                            <Clock size={14} color="#64748B" />
                            <Text style={styles.modernChapterMetaText}>{content.lastViewed}</Text>
                          </View>
                          {content.category && (
                            <View style={styles.modernChapterCategory}>
                              <Text style={styles.modernChapterCategoryText}>
                                {content.category}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptyStateContainer}>
              <BookOpen size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>Keine kürzlich angesehenen Kapitel</Text>
              <Text style={styles.emptyStateSubtitle}>
                Beginne mit dem Lernen, um deine Fortschritte hier zu sehen
              </Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => router.push('/(tabs)/bibliothek')}
              >
                <Text style={styles.emptyStateButtonText}>Zur Bibliothek</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </SectionErrorBoundary>
  );
});

RecentChaptersSection.displayName = 'RecentChaptersSection';

export default RecentChaptersSection;