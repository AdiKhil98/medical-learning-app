/**
 * EvaluationWebView - Displays HTML evaluation reports in a WebView
 *
 * This component replaces the complex React Native parsing/rendering system
 * with a simple WebView that displays pre-generated HTML reports from Supabase.
 *
 * Benefits:
 * - 99% less JavaScript code
 * - Faster rendering
 * - Easier maintenance
 * - Consistent design across platforms
 */

import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  Platform,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import DOMPurify from 'isomorphic-dompurify';

interface Props {
  htmlReport: string;
  onClose: () => void;
  evaluationType?: string; // e.g., 'FSP Patient', 'KP Examiner'
  showLegacyWarning?: boolean; // Show warning if this is a legacy evaluation
}

export default function EvaluationWebView({
  htmlReport,
  onClose,
  evaluationType = 'Evaluation',
  showLegacyWarning = false,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);

  // Sanitize HTML before displaying (security best practice)
  const sanitizedHTML = React.useMemo(() => {
    try {
      return DOMPurify.sanitize(htmlReport, {
        ALLOWED_TAGS: [
          'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'style', 'br', 'hr', 'a', 'img',
        ],
        ALLOWED_ATTR: ['class', 'style', 'id', 'href', 'src', 'alt'],
        FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
      });
    } catch (err) {
      console.error('Error sanitizing HTML:', err);
      return '';
    }
  }, [htmlReport]);

  // Extract body content from complete HTML document
  const extractBodyContent = (html: string): string => {
    // If it's a complete HTML document, extract just the body content
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (bodyMatch) {
      return bodyMatch[1];
    }
    // Otherwise, assume it's already body content
    return html;
  };

  // Prepare HTML for WebView with responsive meta tags
  const preparedHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f7fa;
            overflow-x: hidden;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          /* Ensure container takes full width */
          .container {
            max-width: 100% !important;
            padding: 16px !important;
          }

          /* Loading animation */
          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          /* Mobile-specific adjustments */
          @media (max-width: 768px) {
            body {
              font-size: 14px;
            }

            .container {
              padding: 12px !important;
            }
          }
        </style>
      </head>
      <body>
        ${extractBodyContent(sanitizedHTML)}

        <script>
          // Disable zooming via double-tap
          document.addEventListener('touchstart', function(event) {
            if (event.touches.length > 1) {
              event.preventDefault();
            }
          }, { passive: false });

          // Post message to React Native when content is ready
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'contentLoaded',
              height: document.body.scrollHeight
            }));
          }
        </script>
      </body>
    </html>
  `;

  const handleLoadStart = () => {
    setLoading(true);
    setError(null);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    setError('Fehler beim Laden der Evaluation');
    setLoading(false);
  };

  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'contentLoaded') {
        console.log('WebView content loaded, height:', message.height);
      }
    } catch (err) {
      console.error('Error parsing WebView message:', err);
    }
  };

  // Show legacy warning for old evaluations
  if (showLegacyWarning) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#1f2937" />
          </TouchableOpacity>
        </View>

        <View style={styles.legacyWarning}>
          <View style={styles.warningIconContainer}>
            <Text style={styles.warningIcon}>⚠️</Text>
          </View>
          <Text style={styles.warningTitle}>Alte Evaluation</Text>
          <Text style={styles.warningText}>
            Diese Evaluation wurde mit dem alten Format erstellt. Bitte führen
            Sie die Simulation erneut durch, um die neue, verbesserte Darstellung
            mit detaillierten Erklärungen und modernem Design zu erhalten.
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.warningButton}>
            <Text style={styles.warningButtonText}>Verstanden</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#1f2937" />
          </TouchableOpacity>
        </View>

        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorTitle}>Fehler beim Laden</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => {
              setError(null);
              webViewRef.current?.reload();
            }}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Erneut versuchen</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with close button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{evaluationType}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#1f2937" />
        </TouchableOpacity>
      </View>

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Lade Evaluation...</Text>
        </View>
      )}

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ html: preparedHTML }}
        style={styles.webview}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onMessage={handleMessage}
        showsVerticalScrollIndicator={true}
        showsHorizontalScrollIndicator={false}
        bounces={true}
        scrollEnabled={true}
        scalesPageToFit={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        mixedContentMode="always"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        // iOS specific
        allowsBackForwardNavigationGestures={false}
        // Android specific
        {...(Platform.OS === 'android' && {
          overScrollMode: 'never',
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },

  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
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
    backgroundColor: '#f5f7fa',
    zIndex: 10,
  },

  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },

  errorIcon: {
    fontSize: 64,
    marginBottom: 20,
  },

  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ef4444',
    marginBottom: 12,
    textAlign: 'center',
  },

  errorText: {
    fontSize: 16,
    color: '#64748b',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
  },

  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  legacyWarning: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },

  warningIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },

  warningIcon: {
    fontSize: 48,
  },

  warningTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 16,
    textAlign: 'center',
  },

  warningText: {
    fontSize: 16,
    color: '#78350f',
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 400,
  },

  warningButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  warningButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
