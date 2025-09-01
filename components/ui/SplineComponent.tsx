import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';

interface SplineComponentProps {
  scene: string;
  width?: number | string;
  height?: number | string;
  style?: any;
}

export default function SplineComponent({ 
  scene, 
  width = '100%', 
  height = 300,
  style 
}: SplineComponentProps) {
  // Check if WebView is supported on current platform
  const isWebViewSupported = Platform.OS === 'ios' || Platform.OS === 'android';
  
  if (!isWebViewSupported) {
    // Fallback for web/unsupported platforms
    return (
      <View style={[styles.container, { width, height }, style]}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.fallbackContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.fallbackContent}>
            <View style={styles.fallbackIcon}>
              <Text style={styles.fallbackEmoji}>🏥</Text>
            </View>
            <Text style={styles.fallbackTitle}>3D Medizin Vorschau</Text>
            <Text style={styles.fallbackSubtitle}>
              Interaktive 3D-Szenen sind in der mobilen App verfügbar
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const splineHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: transparent;
          }
          #spline-container {
            width: 100vw;
            height: 100vh;
          }
        </style>
        <script type="module" src="https://unpkg.com/@splinetool/viewer@1.9.28/build/spline-viewer.js"></script>
      </head>
      <body>
        <div id="spline-container">
          <spline-viewer 
            url="${scene}"
            loading-anim-type="spinner-big-dark"
          ></spline-viewer>
        </div>
      </body>
    </html>
  `;

  return (
    <View style={[styles.container, { width, height }, style]}>
      <WebView
        source={{ html: splineHTML }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Loading 3D Scene...</Text>
          </View>
        )}
        startInLoadingState={true}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('Spline WebView error: ', nativeEvent);
        }}
        onLoadEnd={() => {
          console.log('Spline scene loaded successfully');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderRadius: 12,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  
  // Fallback styles for unsupported platforms
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  fallbackContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  fallbackIcon: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  fallbackEmoji: {
    fontSize: 24,
  },
  fallbackTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  fallbackSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 18,
  },
});