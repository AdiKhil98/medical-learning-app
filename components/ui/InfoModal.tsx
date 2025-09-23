import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions
} from 'react-native';
import { X } from 'lucide-react-native';

interface InfoModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export default function InfoModal({ visible, onClose, title, content }: InfoModalProps) {
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Handle ESC key on web
  useEffect(() => {
    if (Platform.OS === 'web' && visible) {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [visible, onClose]);

  const renderContent = () => {
    // Parse markdown-like content into styled components
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      if (!trimmedLine) {
        elements.push(<View key={index} style={styles.spacer} />);
        return;
      }

      // Main headers (#)
      if (trimmedLine.startsWith('# ')) {
        elements.push(
          <Text key={index} style={styles.mainTitle}>
            {trimmedLine.substring(2)}
          </Text>
        );
        return;
      }

      // Section headers (##)
      if (trimmedLine.startsWith('## ')) {
        elements.push(
          <Text key={index} style={styles.sectionHeader}>
            {trimmedLine.substring(3)}
          </Text>
        );
        return;
      }

      // Subsection headers (###)
      if (trimmedLine.startsWith('### ')) {
        elements.push(
          <Text key={index} style={styles.subsectionHeader}>
            {trimmedLine.substring(4)}
          </Text>
        );
        return;
      }

      // Horizontal rule (---)
      if (trimmedLine === '---') {
        elements.push(<View key={index} style={styles.divider} />);
        return;
      }

      // List items
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ') || trimmedLine.startsWith('✅ ') || trimmedLine.startsWith('📈 ') || trimmedLine.startsWith('💡 ')) {
        elements.push(
          <View key={index} style={styles.listItem}>
            <Text style={styles.listBullet}>•</Text>
            <Text style={styles.listText}>
              {parseInlineFormatting(trimmedLine.substring(2))}
            </Text>
          </View>
        );
        return;
      }

      // Regular paragraphs
      elements.push(
        <Text key={index} style={styles.bodyText}>
          {parseInlineFormatting(trimmedLine)}
        </Text>
      );
    });

    return elements;
  };

  const parseInlineFormatting = (text: string) => {
    // Simple bold text parsing (**text**)
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <Text key={index} style={styles.boldText}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      return part;
    });
  };

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isSmallScreen = screenWidth < 768;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        >
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [{ scale: scaleAnim }],
                width: isSmallScreen ? screenWidth - 32 : Math.min(800, screenWidth * 0.9),
                maxHeight: screenHeight * 0.85,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <X size={24} color="#B87E70" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {renderContent()}
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  overlayTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContainer: {
    backgroundColor: '#F8F3E8',
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 32,
    shadowColor: 'rgba(181, 87, 64, 0.2)',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 1,
    shadowRadius: 50,
    elevation: 20,
    margin: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#B15740',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(184, 126, 112, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#B15740',
    marginBottom: 16,
    lineHeight: 30,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '600',
    color: '#B87E70',
    marginTop: 24,
    marginBottom: 12,
    lineHeight: 26,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  subsectionHeader: {
    fontSize: 18,
    fontWeight: '500',
    color: '#B15740',
    marginTop: 16,
    marginBottom: 8,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  bodyText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 25.6,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  boldText: {
    fontWeight: '600',
    color: '#B15740',
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 8,
  },
  listBullet: {
    fontSize: 16,
    color: '#E5877E',
    marginRight: 12,
    lineHeight: 25.6,
    fontWeight: '600',
  },
  listText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 25.6,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(184, 126, 112, 0.2)',
    marginVertical: 20,
  },
  spacer: {
    height: 8,
  },
});