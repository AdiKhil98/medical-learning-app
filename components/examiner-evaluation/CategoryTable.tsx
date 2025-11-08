import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScoreBreakdown } from '@/types/evaluation';

interface Props {
  categories: ScoreBreakdown[];
  deductions: number | null;
  deductionReason?: string;
  finalScore: number;
  maxScore: number;
}

export default function CategoryTable({ categories, deductions, deductionReason, finalScore, maxScore }: Props) {
  const animatedWidths = useRef(categories.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = categories.map((category, index) =>
      Animated.timing(animatedWidths[index], {
        toValue: category.percentage,
        duration: 1000,
        delay: index * 100,
        useNativeDriver: false,
      })
    );

    Animated.parallel(animations).start();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>📊 Punkteverteilung</Text>

      <View style={styles.table}>
        {/* Table Header */}
        <LinearGradient
          colors={['#1e3a5f', '#2c5aa0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.tableHeader}
        >
          <Text style={[styles.headerCell, styles.categoryCell]}>Kategorie</Text>
          <Text style={[styles.headerCell, styles.pointsCell]}>Punkte</Text>
          <Text style={[styles.headerCell, styles.percentCell]}>Prozent</Text>
          <Text style={[styles.headerCell, styles.barCell]}>Visualisierung</Text>
        </LinearGradient>

        {/* Table Rows */}
        {categories.map((category, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.catName]}>{category.category}</Text>
            <Text style={[styles.tableCell, styles.catPoints]}>
              {category.score}/{category.maxScore}
            </Text>
            <Text style={[styles.tableCell, styles.catPercent]}>{category.percentage}%</Text>
            <View style={[styles.tableCell, styles.catBarContainer]}>
              <View style={styles.barBackground}>
                <Animated.View
                  style={[
                    styles.barFill,
                    {
                      width: animatedWidths[index].interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['#28a745', '#20c997']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.barGradient}
                  />
                </Animated.View>
              </View>
            </View>
          </View>
        ))}

        {/* Table Footer */}
        <View style={styles.tableFooter}>
          {deductions !== null && deductions > 0 && (
            <Text style={styles.deduction}>
              Abzüge: -{deductions} Punkte {deductionReason ? `(${deductionReason})` : ''}
            </Text>
          )}
          <Text style={styles.finalScore}>
            ENDSCORE: {finalScore}/{maxScore}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  heading: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1e3a5f',
    marginBottom: 16,
  },
  table: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  headerCell: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryCell: {
    flex: 2,
  },
  pointsCell: {
    flex: 1,
  },
  percentCell: {
    flex: 1,
  },
  barCell: {
    flex: 2,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    backgroundColor: '#ffffff',
  },
  tableCell: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  catName: {
    flex: 2,
    fontFamily: 'Inter-SemiBold',
    color: '#1e3a5f',
  },
  catPoints: {
    flex: 1,
    fontFamily: 'Inter-Bold',
    color: '#212529',
  },
  catPercent: {
    flex: 1,
    fontFamily: 'Inter-SemiBold',
    color: '#6c757d',
  },
  catBarContainer: {
    flex: 2,
    justifyContent: 'center',
  },
  barBackground: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barGradient: {
    flex: 1,
  },
  tableFooter: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderTopWidth: 2,
    borderTopColor: '#dee2e6',
  },
  deduction: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#dc3545',
    marginBottom: 8,
  },
  finalScore: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1e3a5f',
  },
});
