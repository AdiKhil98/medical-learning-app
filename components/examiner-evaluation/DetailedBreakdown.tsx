import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface Subcategory {
  name: string;
  score: number;
  max: number;
  comment?: string;
}

interface CategoryDetail {
  name: string;
  score: number;
  max: number;
  percentage: number;
  subcategories?: Subcategory[];
}

interface Props {
  categories: CategoryDetail[];
}

export default function DetailedBreakdown({ categories }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show if there are subcategories
  const hasSubcategories = categories.some(cat => cat.subcategories && cat.subcategories.length > 0);

  if (!hasSubcategories) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.headerTitle}>📊 Detaillierte Kategorienbewertung</Text>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#1e3a5f"
        />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.content}>
          {categories.map((category, catIndex) => {
            if (!category.subcategories || category.subcategories.length === 0) {
              return null;
            }

            return (
              <View key={catIndex} style={styles.categoryDetail}>
                <Text style={styles.categoryTitle}>
                  📊 {category.name.toUpperCase()}: {category.score}/{category.max} ({category.percentage}%)
                </Text>

                <View style={styles.subcategoriesList}>
                  {category.subcategories.map((subcat, subIndex) => {
                    const percentage = (subcat.score / subcat.max) * 100;

                    return (
                      <View key={subIndex} style={styles.subcatRow}>
                        <View style={styles.subcatInfo}>
                          <Text style={styles.subcatName}>{subcat.name}</Text>
                          <Text style={styles.subcatScore}>
                            {subcat.score}/{subcat.max}
                          </Text>
                        </View>

                        <View style={styles.subcatBarContainer}>
                          <View style={styles.subcatBarBackground}>
                            <View style={[styles.subcatBarFill, { width: `${percentage}%` }]}>
                              <LinearGradient
                                colors={['#2c5aa0', '#4a90e2']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.subcatBarGradient}
                              />
                            </View>
                          </View>
                        </View>

                        {subcat.comment && (
                          <Text style={styles.subcatComment}>{subcat.comment}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    marginHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1e3a5f',
  },
  content: {
    padding: 30,
  },
  categoryDetail: {
    marginBottom: 30,
  },
  categoryTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1e3a5f',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#dee2e6',
  },
  subcategoriesList: {
    gap: 12,
  },
  subcatRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  subcatInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subcatName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#495057',
  },
  subcatScore: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#1e3a5f',
    marginLeft: 15,
  },
  subcatBarContainer: {
    marginBottom: 8,
  },
  subcatBarBackground: {
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    overflow: 'hidden',
  },
  subcatBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  subcatBarGradient: {
    flex: 1,
  },
  subcatComment: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6c757d',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
