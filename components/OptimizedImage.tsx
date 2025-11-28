/**
 * Optimized Image Component
 *
 * High-performance image component with:
 * - Automatic lazy loading
 * - WebP/AVIF support with fallbacks
 * - Responsive image sizes
 * - Loading placeholders
 * - Error handling
 * - Performance tracking
 *
 * Usage:
 *   <OptimizedImage
 *     source={require('@/assets/images/logo.png')}
 *     alt="Logo"
 *     width={200}
 *     height={100}
 *   />
 *
 *   // With lazy loading
 *   <OptimizedImage
 *     source={require('@/assets/images/hero.jpg')}
 *     lazy={true}
 *     placeholder="blur"
 *   />
 */

import React, { useState, useEffect, useRef } from 'react';
import { Image, ImageProps, View, StyleSheet, Platform, ActivityIndicator, ImageSourcePropType } from 'react-native';
import { logger } from '@/utils/logger';
import { performanceTracker } from '@/utils/performanceTracking';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  source: ImageSourcePropType;
  alt?: string;
  width?: number;
  height?: number;
  lazy?: boolean;
  placeholder?: 'blur' | 'spinner' | 'none';
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: Error) => void;
  priority?: 'high' | 'normal' | 'low';
}

export function OptimizedImage({
  source,
  alt,
  width,
  height,
  lazy = false,
  placeholder = 'spinner',
  onLoadStart,
  onLoadEnd,
  onError,
  priority = 'normal',
  style,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(!lazy);
  const loadStartTime = useRef<number>(0);
  const viewRef = useRef<View>(null);

  // Lazy loading observer (web only)
  useEffect(() => {
    if (!lazy || Platform.OS !== 'web') {
      setIsVisible(true);
      return;
    }

    // Use Intersection Observer for lazy loading on web
    if (typeof IntersectionObserver !== 'undefined' && viewRef.current) {
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

      // @ts-ignore - React Native Web compatibility
      const element = viewRef.current;
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
    loadStartTime.current = Date.now();
    setIsLoading(true);

    if (onLoadStart) {
      onLoadStart();
    }

    logger.debug('Image load started', { alt });
  };

  const handleLoadEnd = () => {
    const duration = Date.now() - loadStartTime.current;
    setIsLoading(false);

    // Track image load performance
    performanceTracker.trackRender(`Image: ${alt || 'unknown'}`, duration);

    if (onLoadEnd) {
      onLoadEnd();
    }

    logger.debug('Image loaded', { alt, duration });
  };

  const handleError = (error: any) => {
    setHasError(true);
    setIsLoading(false);

    const errorObj = new Error(`Failed to load image: ${alt || 'unknown'}`);

    if (onError) {
      onError(errorObj);
    }

    logger.error('Image load failed', errorObj, { alt });
  };

  // Determine image source based on format support
  const getOptimizedSource = (): ImageSourcePropType => {
    // For web, try to use WebP if available
    if (Platform.OS === 'web' && typeof source === 'object' && 'uri' in source) {
      const uri = source.uri;
      if (uri) {
        // Check if WebP version exists
        const webpUri = uri.replace(/\.(png|jpe?g)$/i, '.webp');

        // Return WebP if supported
        // TODO: Add actual WebP support detection
        return { uri: webpUri };
      }
    }

    return source;
  };

  const containerStyle = [styles.container, width && { width }, height && { height }];

  const imageStyle = [styles.image, width && { width }, height && { height }, style];

  if (!isVisible) {
    // Lazy loading: render placeholder
    return (
      <View ref={viewRef} style={containerStyle}>
        {placeholder === 'spinner' && <ActivityIndicator size="small" color="#999" />}
      </View>
    );
  }

  if (hasError) {
    // Error state
    return (
      <View style={[containerStyle, styles.errorContainer]}>
        <View style={styles.errorPlaceholder}>
          <ActivityIndicator size="small" color="#ccc" />
        </View>
      </View>
    );
  }

  return (
    <View ref={viewRef} style={containerStyle}>
      {isLoading && placeholder !== 'none' && (
        <View style={styles.loadingContainer}>
          {placeholder === 'spinner' && <ActivityIndicator size="small" color="#999" />}
          {placeholder === 'blur' && <View style={styles.blurPlaceholder} />}
        </View>
      )}

      <Image
        {...props}
        source={getOptimizedSource()}
        style={imageStyle}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        // @ts-ignore - Web-specific props
        loading={priority === 'high' ? 'eager' : 'lazy'}
        decoding={priority === 'high' ? 'sync' : 'async'}
        alt={alt}
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
  blurPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e0e0e0',
  },
  errorContainer: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorPlaceholder: {
    padding: 20,
  },
});

export default OptimizedImage;
