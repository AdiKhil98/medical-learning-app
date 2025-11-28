/**
 * Screen-Level Error Boundary
 *
 * Wraps individual screens to catch and track errors at component level.
 * Provides more granular error tracking than root-level ErrorBoundary.
 *
 * Features:
 * - Tracks which specific screen failed
 * - Automatic retry with exponential backoff
 * - Local error recovery (doesn't crash entire app)
 * - PostHog analytics integration
 *
 * Usage:
 *   <ScreenErrorBoundary screenName="KP Simulation">
 *     <YourScreen />
 *   </ScreenErrorBoundary>
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { logger } from '@/utils/logger';
import { analytics, AnalyticsEvent } from '@/utils/analytics';
import { performanceTracker } from '@/utils/performanceTracking';

interface Props {
  children: ReactNode;
  screenName: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  isRetrying: boolean;
}

export class ScreenErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { screenName, onError } = this.props;

    this.setState({ error });

    // Log error with screen context
    logger.error(`Error in ${screenName}`, error, {
      screen: screenName,
      componentStack: errorInfo.componentStack?.substring(0, 500),
      retryCount: this.state.retryCount,
    });

    // Record error to performance tracker
    performanceTracker.recordError(screenName, error.message, error.name);

    // Track to PostHog with screen-specific context
    try {
      analytics.track(AnalyticsEvent.ERROR_OCCURRED, {
        errorType: error.name,
        errorMessage: error.message,
        errorStack: error.stack?.substring(0, 500),
        screen: screenName,
        componentStack: errorInfo.componentStack?.substring(0, 500),
        retryCount: this.state.retryCount,
        errorBoundary: 'screen',
      });
    } catch (analyticsError) {
      logger.warn('Failed to track screen error to analytics', {
        error: analyticsError,
      });
    }

    // Call optional error callback
    if (onError) {
      onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    const { retryCount } = this.state;
    const maxRetries = 3;

    if (retryCount >= maxRetries) {
      logger.warn('Maximum screen retry attempts reached', {
        screen: this.props.screenName,
        retryCount,
      });
      return;
    }

    this.setState({ isRetrying: true });

    // Exponential backoff: 500ms, 1s, 2s
    const backoffDelay = Math.min(500 * Math.pow(2, retryCount), 2000);

    logger.info('Retrying screen after error', {
      screen: this.props.screenName,
      retryCount,
      backoffDelay,
    });

    setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        retryCount: retryCount + 1,
        isRetrying: false,
      });
    }, backoffDelay);
  };

  render() {
    const { hasError, error, retryCount, isRetrying } = this.state;
    const { children, screenName, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Fehler auf diesem Bildschirm</Text>
            <Text style={styles.errorSubtitle}>
              {screenName} konnte nicht geladen werden.
            </Text>

            <TouchableOpacity
              style={[
                styles.retryButton,
                (isRetrying || retryCount >= 3) && styles.retryButtonDisabled,
              ]}
              onPress={this.handleRetry}
              disabled={isRetrying || retryCount >= 3}
            >
              <Text style={styles.retryButtonText}>
                {isRetrying
                  ? 'Wird wiederholt...'
                  : retryCount >= 3
                    ? 'Maximale Versuche erreicht'
                    : 'Erneut versuchen'}
              </Text>
            </TouchableOpacity>

            {retryCount > 0 && retryCount < 3 && (
              <Text style={styles.retryCountText}>
                Versuch {retryCount} von 3
              </Text>
            )}

            {__DEV__ && error && (
              <View style={styles.devErrorContainer}>
                <Text style={styles.devErrorText}>
                  {error.name}: {error.message}
                </Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    return children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e53e3e',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  retryButtonDisabled: {
    backgroundColor: '#999',
    opacity: 0.6,
  },
  retryCountText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  devErrorContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    maxWidth: '100%',
    marginTop: 16,
  },
  devErrorText: {
    fontSize: 11,
    color: '#333',
    fontFamily: 'monospace',
  },
});

export default ScreenErrorBoundary;
