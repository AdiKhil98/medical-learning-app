/**
 * Optimized Image Component
 *
 * High-performance image component with:
 * - Automatic lazy loading (web)
 * - Loading placeholders
 * - Error handling
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Image,
  View,
  StyleSheet,
  Platform,
  ActivityIndicator,
  ImageSourcePropType,
  ImageStyle,
  StyleProp,
  ImageResizeMode,
} from 'react-native';
import { logger } from '@/utils/logger';

interface OptimizedImageProps {
  source: ImageSourcePropType;
  style?: StyleProp<ImageStyle>;
  alt?: string;
  width?: number;
  height?: number;
  lazy?: boolean;
  placeholder?: 'spinner' | 'none';
  priority?: 'high' | 'normal' | 'low';
  resizeMode?: ImageResizeMode;
}

export function OptimizedImage({
  source,
  style,
  alt,
  width,
  height,
  lazy = false,
  placeholder = 'spinner',
  priority = 'normal',
  resizeMode = 'cover',
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(!lazy);
  const containerRef = useRef<View>(null);

  // Lazy loading observer (web only)
  useEffect(() => {
    if (!lazy || Platform.OS !== 'web') {
      setIsVisible(true);
      return;
    }

    // Use Intersection Observer for lazy loading on web
    if (typeof IntersectionObserver !== 'undefined' && containerRef.current) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              observer.disconnect();
            }
          });
        },
        {
          rootMargin: '50px', // Start loading 50px before image is visible
        }
      );

      // Cast for web compatibility
      const element = containerRef.current as unknown as Element;
      if (element) {
        observer.observe(element);
      }

      return () => observer.disconnect();
    } else {
      // Fallback: load immediately
      setIsVisible(true);
    }
  }, [lazy]);

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    logger.error('Image load failed', new Error(`Failed to load: ${alt || 'unknown'}`));
  };

  const containerStyle = [
    styles.container,
    width !== undefined && { width },
    height !== undefined && { height },
  ];

  const imageStyle: StyleProp<ImageStyle> = [
    styles.image,
    width !== undefined && { width },
    height !== undefined && { height },
    style,
  ];

  // Not visible yet (lazy loading)
  if (!isVisible) {
    return (
      <View ref={containerRef} style={containerStyle}>
        {placeholder === 'spinner' && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#999" />
          </View>
        )}
      </View>
    );
  }

  // Error state
  if (hasError) {
    return (
      <View style={[containerStyle, styles.errorContainer]}>
        <ActivityIndicator size="small" color="#ccc" />
      </View>
    );
  }

  return (
    <View ref={containerRef} style={containerStyle}>
      {isLoading && placeholder === 'spinner' && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#999" />
        </View>
      )}

      <Image
        source={source}
        style={imageStyle}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        accessibilityLabel={alt}
        // Web-specific props for native lazy loading
        {...(Platform.OS === 'web' && {
          loading: priority === 'high' ? 'eager' : 'lazy',
          decoding: priority === 'high' ? 'sync' : 'async',
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  errorContainer: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default OptimizedImage;
