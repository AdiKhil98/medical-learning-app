import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { List, X, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface TableOfContentsItem {
  id: string;
  title: string;
  index: number;
}

interface TableOfContentsProps {
  sections: TableOfContentsItem[];
  onNavigateToSection: (sectionIndex: number) => void;
  buttonStyle?: any;
  iconSize?: number;
}

const TableOfContents: React.FC<TableOfContentsProps> = ({
  sections,
  onNavigateToSection,
  buttonStyle,
  iconSize = 20,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [isVisible, setIsVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;

  const openModal = () => {
    setIsVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
    });
  };

  const handleSectionPress = (sectionIndex: number) => {
    onNavigateToSection(sectionIndex);
    closeModal();
  };

  if (sections.length === 0) {
    return null;
  }

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const modalMaxWidth = Math.min(screenWidth * 0.9, 400);
  const modalMaxHeight = screenHeight * 0.7;

  return (
    <>
      {/* Navigation Button */}
      <TouchableOpacity
        style={[
          styles.navigationButton,
          {
            backgroundColor: colors.primary + '15',
            borderColor: colors.primary + '30',
          },
          buttonStyle,
        ]}
        onPress={openModal}
        activeOpacity={0.7}
        accessibilityLabel="Inhaltsverzeichnis öffnen"
        accessibilityRole="button"
      >
        <List size={iconSize} color={colors.primary} />
      </TouchableOpacity>

      {/* Table of Contents Modal */}
      <Modal
        visible={isVisible}
        transparent={true}
        animationType="none"
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeModal}
          >
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  maxWidth: modalMaxWidth,
                  maxHeight: modalMaxHeight,
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
                isDarkMode && styles.darkModalShadow,
              ]}
              onStartShouldSetResponder={() => true}
            >
              {/* Modal Header */}
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <View style={styles.headerLeft}>
                  <List size={18} color={colors.primary} style={styles.headerIcon} />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    Inhaltsverzeichnis
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.closeButton,
                    { backgroundColor: colors.textSecondary + '15' },
                  ]}
                  onPress={closeModal}
                  accessibilityLabel="Inhaltsverzeichnis schließen"
                  accessibilityRole="button"
                >
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Sections List */}
              <ScrollView
                style={styles.sectionsList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sectionsListContent}
              >
                {sections.map((section, index) => (
                  <TouchableOpacity
                    key={`${section.id}-${index}`}
                    style={[
                      styles.sectionItem,
                      {
                        backgroundColor: isDarkMode 
                          ? 'rgba(255, 255, 255, 0.03)' 
                          : 'rgba(0, 0, 0, 0.02)',
                        borderLeftColor: colors.primary,
                      },
                    ]}
                    onPress={() => handleSectionPress(section.index)}
                    activeOpacity={0.7}
                    accessibilityLabel={`Zu Abschnitt ${section.title} springen`}
                    accessibilityRole="button"
                  >
                    <View style={styles.sectionContent}>
                      <Text 
                        style={[
                          styles.sectionTitle, 
                          { color: colors.text }
                        ]} 
                        numberOfLines={2}
                      >
                        {section.title}
                      </Text>
                      <Text style={[styles.sectionNumber, { color: colors.textSecondary }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <ChevronRight 
                      size={14} 
                      color={colors.textSecondary} 
                      style={styles.sectionArrow}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Footer */}
              <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                  {sections.length} Abschnitte • Zum Navigieren tippen
                </Text>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  navigationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    margin: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    overflow: 'hidden',
  },
  darkModalShadow: {
    shadowColor: '#fff',
    shadowOpacity: 0.1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    marginRight: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionsList: {
    maxHeight: 400,
  },
  sectionsListContent: {
    paddingVertical: 8,
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginVertical: 2,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  sectionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
    flex: 1,
    marginRight: 8,
    lineHeight: 20,
  },
  sectionNumber: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    minWidth: 20,
    textAlign: 'center',
  },
  sectionArrow: {
    marginLeft: 8,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
});

export default TableOfContents;