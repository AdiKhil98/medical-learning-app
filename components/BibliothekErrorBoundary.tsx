import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react-native';
import { SecureLogger } from '@/lib/security';
import { router } from 'expo-router';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary specifically for Bibliothek section
 * Catches errors and prevents entire app from crashing
 * Provides user-friendly error message and recovery options
 */
class BibliothekErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so next render shows fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    SecureLogger.error('Bibliothek Error Boundary caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleGoHome = () => {
    this.handleReset();
    router.push('/(tabs)/bibliothek');
  };

  handleGoBack = () => {
    this.handleReset();
    router.back();
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      const { fallbackTitle = 'Bibliothek Fehler' } = this.props;

      return (
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Error Icon */}
            <View style={styles.iconContainer}>
              <AlertTriangle size={64} color="#EF4444" />
            </View>

            {/* Error Title */}
            <Text style={styles.title}>{fallbackTitle}</Text>

            {/* User-friendly message */}
            <Text style={styles.message}>
              Ein unerwarteter Fehler ist aufgetreten. Die Anwendung läuft weiter, aber dieser Bereich kann möglicherweise nicht geladen werden.
            </Text>

            {/* Technical details (collapsed by default in production) */}
            {__DEV__ && error && (
              <View style={styles.detailsContainer}>
                <Text style={styles.detailsTitle}>Technische Details:</Text>
                <Text style={styles.errorText}>{error.toString()}</Text>
                {errorInfo && (
                  <Text style={styles.stackText} numberOfLines={10}>
                    {errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={this.handleReset}
                activeOpacity={0.7}
              >
                <RefreshCcw size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Erneut versuchen</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={this.handleGoHome}
                activeOpacity={0.7}
              >
                <Home size={20} color="#64748B" />
                <Text style={styles.secondaryButtonText}>Zur Bibliothek Startseite</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.tertiaryButton}
                onPress={this.handleGoBack}
                activeOpacity={0.7}
              >
                <Text style={styles.tertiaryButtonText}>Zurück</Text>
              </TouchableOpacity>
            </View>

            {/* Help Text */}
            <Text style={styles.helpText}>
              Wenn das Problem weiterhin besteht, versuchen Sie die App neu zu starten oder kontaktieren Sie den Support.
            </Text>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
  },
  iconContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  stackText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B8846A',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
  tertiaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  tertiaryButtonText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '500',
  },
  helpText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
});

export default BibliothekErrorBoundary;
