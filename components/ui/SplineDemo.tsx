import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import SplineComponent from './SplineComponent';

export default function SplineDemo() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>3D Spline Integration Demo</Text>
        
        {/* Hero 3D Section */}
        <View style={styles.heroSection}>
          <SplineComponent
            scene="https://prod.spline.design/VnmRaIQjPhUrDlaa/scene.splinecode"
            height={300}
            width="100%"
            style={styles.splineContainer}
          />
          <View style={styles.overlayText}>
            <Text style={styles.heroTitle}>Interactive 3D Experience</Text>
            <Text style={styles.heroSubtitle}>Powered by Spline</Text>
          </View>
        </View>

        {/* Smaller 3D Component */}
        <View style={styles.cardSection}>
          <Text style={styles.cardTitle}>Compact 3D Element</Text>
          <SplineComponent
            scene="https://prod.spline.design/VnmRaIQjPhUrDlaa/scene.splinecode"
            height={200}
            width="100%"
            style={styles.cardSpline}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    textAlign: 'center',
    marginVertical: 24,
  },
  heroSection: {
    position: 'relative',
    marginBottom: 32,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  splineContainer: {
    borderRadius: 16,
  },
  overlayText: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  heroSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  cardSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  cardSpline: {
    borderRadius: 12,
  },
});