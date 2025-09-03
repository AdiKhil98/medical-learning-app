import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

interface SplineViewerProps {
  onPress: () => void;
  isActive: boolean;
  size?: number;
}

export default function SplineViewer({ onPress, isActive, size = 160 }: SplineViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Load Spline viewer script
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://unpkg.com/@splinetool/viewer@1.10.55/build/spline-viewer.js';
      
      script.onload = () => {
        console.log('✅ Spline viewer loaded successfully');
        
        // Create the spline-viewer element
        if (containerRef.current) {
          const splineViewer = document.createElement('spline-viewer');
          splineViewer.setAttribute('url', 'https://prod.spline.design/0THgBYiB3LcdFrKo/scene.splinecode');
          
          // Style the viewer
          splineViewer.style.width = `${size}px`;
          splineViewer.style.height = `${size}px`;
          splineViewer.style.borderRadius = '50%';
          splineViewer.style.cursor = 'pointer';
          splineViewer.style.transition = 'all 0.3s ease';
          
          // Hide Spline watermark (Note: May violate Spline ToS - consider Pro subscription)
          setTimeout(() => {
            const hideWatermark = () => {
              const watermarks = document.querySelectorAll(
                '[class*="watermark"], [class*="logo"], [aria-label*="spline"], [title*="spline"], [href*="spline.design"]'
              );
              watermarks.forEach(el => {
                (el as HTMLElement).style.display = 'none';
                (el as HTMLElement).remove();
              });
            };
            
            hideWatermark();
            setTimeout(hideWatermark, 1000);
            setTimeout(hideWatermark, 3000);
          }, 500);
          
          // Add hover effects
          splineViewer.addEventListener('mouseenter', () => {
            splineViewer.style.transform = 'scale(1.05)';
            splineViewer.style.filter = 'brightness(1.1)';
          });
          
          splineViewer.addEventListener('mouseleave', () => {
            splineViewer.style.transform = isActive ? 'scale(1.1)' : 'scale(1)';
            splineViewer.style.filter = isActive ? 'brightness(1.2)' : 'brightness(1)';
          });
          
          // Add click handler
          splineViewer.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🎯 Spline viewer clicked');
            onPress();
          });
          
          // Apply active state styling
          if (isActive) {
            splineViewer.style.transform = 'scale(1.1)';
            splineViewer.style.filter = 'brightness(1.2) drop-shadow(0 0 20px rgba(76, 175, 80, 0.6))';
            splineViewer.style.boxShadow = '0 0 30px rgba(76, 175, 80, 0.4)';
          }
          
          // Clear container and add viewer
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(splineViewer);
        }
      };
      
      script.onerror = () => {
        console.error('❌ Failed to load Spline viewer script');
      };
      
      // Only add script if not already present
      if (!document.querySelector('script[src*="splinetool/viewer"]')) {
        document.head.appendChild(script);
      } else {
        // Script already exists, just create the viewer
        script.onload?.({} as Event);
      }
    }
  }, [onPress, size]);

  // Update active state styling
  useEffect(() => {
    if (Platform.OS === 'web' && containerRef.current) {
      const splineViewer = containerRef.current.querySelector('spline-viewer') as HTMLElement;
      if (splineViewer) {
        if (isActive) {
          splineViewer.style.transform = 'scale(1.1)';
          splineViewer.style.filter = 'brightness(1.2) drop-shadow(0 0 20px rgba(76, 175, 80, 0.6))';
          splineViewer.style.boxShadow = '0 0 30px rgba(76, 175, 80, 0.4)';
        } else {
          splineViewer.style.transform = 'scale(1)';
          splineViewer.style.filter = 'brightness(1)';
          splineViewer.style.boxShadow = 'none';
        }
      }
    }
  }, [isActive]);

  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.fallback, { width: size, height: size }]}>
        {/* Fallback for mobile - could be a placeholder or image */}
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <div
        ref={containerRef}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  fallback: {
    backgroundColor: '#4CAF50',
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
});