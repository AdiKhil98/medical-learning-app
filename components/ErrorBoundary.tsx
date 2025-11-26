import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { AuditLogger } from '@/lib/auditLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error securely without sensitive data
    this.logErrorToSupabase(error, errorInfo);
  }

  private async logErrorToSupabase(error: Error, errorInfo: React.ErrorInfo) {
    try {
      // Get current user without exposing sensitive data
      const { data: { user } } = await supabase.auth.getUser();
      
      // Sanitize error data - remove potential sensitive information
      const sanitizedError = {
        message: error.message,
        name: error.name,
        stack: __DEV__ ? error.stack : '[REDACTED]',
      };

      // Sanitize component stack - remove potential sensitive props/state
      const sanitizedComponentStack = errorInfo.componentStack
        ? this.sanitizeComponentStack(errorInfo.componentStack)
        : '[REDACTED]';

      // Log error using AuditLogger
      await AuditLogger.logErrorEvent(
        error,
        user?.id,
        'ErrorBoundary',
        {
          componentStack: sanitizedComponentStack,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'React Native',
          platform: 'mobile',
        }
      );
    } catch (logError) {
      logger.error('Failed to log error to Supabase', { error: logError });
    }
  }

  private sanitizeComponentStack(componentStack: string): string {
    // Remove potential sensitive data from component stack
    return componentStack
      .split('\n')
      .map(line => {
        // Remove anything that looks like props or state values
        return line.replace(/\{[^}]*\}/g, '{[SANITIZED]}')
                  .replace(/="[^"]*"/g, '="[SANITIZED]"')
                  .replace(/=\{[^}]*\}/g, '={[SANITIZED]}');
      })
      .join('\n');
  }

  private handleRetry = () => {
    const { retryCount } = this.state;
    const maxRetries = 3;

    if (retryCount >= maxRetries) {
      logger.warn('Maximum retry attempts reached', { retryCount });
      return;
    }

    this.setState({ isRetrying: true });

    // Exponential backoff: 1s, 2s, 4s
    const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 4000);

    logger.info('Retrying after error', { retryCount, backoffDelay });

    setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1,
        isRetrying: false,
      });
    }, backoffDelay);
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Ein Fehler ist aufgetreten</Text>
            <Text style={styles.errorSubtitle}>
              Entschuldigung, etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.
            </Text>
            
            <TouchableOpacity
              style={[styles.retryButton, this.state.isRetrying && styles.retryButtonDisabled]}
              onPress={this.handleRetry}
              disabled={this.state.isRetrying || this.state.retryCount >= 3}
            >
              <Text style={styles.retryButtonText}>
                {this.state.isRetrying
                  ? 'Wird wiederholt...'
                  : this.state.retryCount >= 3
                    ? 'Maximale Versuche erreicht'
                    : 'Erneut versuchen'}
              </Text>
            </TouchableOpacity>

            {this.state.retryCount > 0 && this.state.retryCount < 3 && (
              <Text style={styles.retryCountText}>
                Versuch {this.state.retryCount} von 3
              </Text>
            )}

            {__DEV__ && this.state.error && (
              <ScrollView style={styles.devErrorContainer}>
                <Text style={styles.devErrorTitle}>Development Error Details:</Text>
                <Text style={styles.devErrorText}>
                  {this.state.error.name}: {this.state.error.message}
                </Text>
                {this.state.error.stack && (
                  <Text style={styles.devErrorStack}>
                    Stack Trace:{'\n'}{this.state.error.stack}
                  </Text>
                )}
                {this.state.errorInfo?.componentStack && (
                  <Text style={styles.devErrorStack}>
                    Component Stack:{'\n'}{this.state.errorInfo.componentStack}
                  </Text>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
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
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e53e3e',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButtonDisabled: {
    backgroundColor: '#999',
    opacity: 0.6,
  },
  retryCountText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 12,
  },
  devErrorContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    maxHeight: 300,
    width: '100%',
    marginTop: 20,
  },
  devErrorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e53e3e',
    marginBottom: 8,
  },
  devErrorText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  devErrorStack: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
    lineHeight: 14,
  },
});

export default ErrorBoundary;