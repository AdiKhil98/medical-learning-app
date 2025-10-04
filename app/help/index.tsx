import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronDown,
  Mail,
  MessageCircle,
  HelpCircle,
  Lock,
  BarChart,
  User,
  Smartphone,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { LinearGradient } from 'expo-linear-gradient';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  icon: any;
}

const faqs: FAQ[] = [
  {
    id: '1',
    question: 'Wie kann ich mein Passwort zurücksetzen?',
    answer: 'Gehen Sie zu den Einstellungen > Persönliche Daten > Passwort ändern. Dort können Sie Ihr aktuelles Passwort eingeben und ein neues festlegen. Falls Sie Ihr aktuelles Passwort vergessen haben, kontaktieren Sie unseren Support.',
    icon: Lock,
  },
  {
    id: '2',
    question: 'Wo finde ich meinen Lernfortschritt?',
    answer: 'Ihren Lernfortschritt finden Sie im Tab "Fortschritt" in der unteren Navigation. Dort sehen Sie Ihre Lernserie, bearbeitete Fälle und detaillierte Statistiken zu Ihrem Lernverhalten.',
    icon: BarChart,
  },
  {
    id: '3',
    question: 'Wie funktioniert die Simulation?',
    answer: 'Die Simulation ist ein interaktives Lernwerkzeug, das realistische Patientenfälle simuliert. Tippen Sie auf den Simulation-Tab und folgen Sie den Anweisungen. Sie können mit dem virtuellen Patienten sprechen und Diagnosen stellen.',
    icon: Smartphone,
  },
  {
    id: '4',
    question: 'Kann ich meine Daten exportieren?',
    answer: 'Ja, Sie können Ihre Lerndaten exportieren. Gehen Sie zu Einstellungen > Persönliche Daten und wählen Sie "Daten exportieren". Sie erhalten eine E-Mail mit Ihren Daten im JSON-Format.',
    icon: User,
  },
  {
    id: '5',
    question: 'Wie kontaktiere ich den Support?',
    answer: 'Sie können uns per E-Mail unter support@kpmed.at erreichen oder den Chat-Button in dieser Hilfe-Sektion verwenden. Wir antworten normalerweise innerhalb von 24 Stunden.',
    icon: HelpCircle,
  },
];

export default function HelpSupportScreen() {
  const { colors, isDarkMode, fontScale } = useTheme();
  const router = useRouter();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [animatedValues] = useState(() => 
    faqs.reduce((acc, faq) => {
      acc[faq.id] = new Animated.Value(0);
      return acc;
    }, {} as Record<string, Animated.Value>)
  );

  const toggleFAQ = (faqId: string) => {
    const isExpanding = expandedFAQ !== faqId;
    
    // Collapse currently expanded FAQ
    if (expandedFAQ && expandedFAQ !== faqId) {
      Animated.timing(animatedValues[expandedFAQ], {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }

    // Toggle the selected FAQ
    if (isExpanding) {
      setExpandedFAQ(faqId);
      Animated.timing(animatedValues[faqId], {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(animatedValues[faqId], {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        setExpandedFAQ(null);
      });
    }
  };

  const handleEmailSupport = async () => {
    const email = 'support@kpmed.at';
    const subject = 'KP Med App - Support Anfrage';
    const body = 'Hallo KP Med Team,\n\nIch benötige Hilfe bei:\n\n[Beschreiben Sie hier Ihr Problem]\n\nVielen Dank!';
    
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'E-Mail nicht verfügbar',
          `Bitte senden Sie eine E-Mail an: ${email}`,
          [
            { text: 'E-Mail kopieren', onPress: () => {/* Copy to clipboard logic */} },
            { text: 'OK' }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Fehler', 'E-Mail konnte nicht geöffnet werden.');
    }
  };

  const handleChatSupport = async () => {
    // Open email composer for chat support as well
    const email = 'support@kpmed.at';
    const subject = 'KP Med App - Chat Support Anfrage';
    const body = 'Hallo KP Med Team,\n\nIch möchte gerne mit dem Support-Team chatten bezüglich:\n\n[Beschreiben Sie hier Ihr Anliegen]\n\nBitte kontaktieren Sie mich für weitere Unterstützung.\n\nVielen Dank!';
    
    const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'E-Mail nicht verfügbar',
          `Bitte senden Sie eine E-Mail an: ${email}`,
          [
            { text: 'E-Mail kopieren', onPress: () => {/* Copy to clipboard logic */} },
            { text: 'OK' }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Fehler', 'E-Mail konnte nicht geöffnet werden.');
    }
  };


  const gradientColors = isDarkMode
    ? ['#1F2937', '#111827', '#0F172A']
    : ['#F8F3E8', '#FBEEEC', '#FFFFFF']; // White Linen to light coral to white

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      paddingTop: 60,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)',
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: 'rgba(249, 246, 242, 0.95)',
      shadowColor: 'rgba(181,87,64,0.3)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    backText: {
      fontFamily: 'Inter-Medium',
      fontSize: fontScale(16),
      color: '#B87E70',
      marginLeft: 4,
      fontWeight: '600',
    },
    content: {
      flex: 1,
      padding: 24,
    },
    pageTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: fontScale(28),
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontFamily: 'Inter-Regular',
      fontSize: fontScale(16),
      color: colors.textSecondary,
      marginBottom: 32,
      lineHeight: fontScale(24),
    },
    sectionTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: fontScale(22),
      color: colors.text,
      marginBottom: 16,
      marginTop: 24,
    },
    firstSectionTitle: {
      marginTop: 0,
    },
    faqCard: {
      marginBottom: 12,
      backgroundColor: colors.card,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.05,
      shadowRadius: 8,
      elevation: 3,
      overflow: 'hidden',
    },
    faqHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    faqIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${colors.primary}20`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    faqQuestion: {
      flex: 1,
      fontFamily: 'Inter-Bold',
      fontSize: fontScale(16),
      color: colors.text,
      lineHeight: fontScale(22),
    },
    chevronContainer: {
      padding: 4,
    },
    faqAnswer: {
      padding: 20,
      paddingTop: 0,
    },
    faqAnswerText: {
      fontFamily: 'Inter-Regular',
      fontSize: fontScale(15),
      color: colors.text,
      lineHeight: fontScale(22),
    },
    contactCard: {
      marginBottom: 24,
      backgroundColor: colors.card,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.3 : 0.1,
      shadowRadius: 12,
      elevation: 6,
    },
    contactHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    contactIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    contactTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: fontScale(20),
      color: colors.text,
    },
    contactSubtitle: {
      fontFamily: 'Inter-Regular',
      fontSize: fontScale(14),
      color: colors.textSecondary,
      marginTop: 2,
    },
    contactMethods: {
      gap: 12,
    },
    contactMethod: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    contactMethodIcon: {
      marginRight: 12,
    },
    contactMethodText: {
      flex: 1,
      fontFamily: 'Inter-Medium',
      fontSize: fontScale(16),
      color: colors.text,
    },
    chatButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      height: 48,
    },
    chatButtonText: {
      color: '#FFFFFF',
      fontFamily: 'Inter-Bold',
      fontSize: fontScale(16),
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <LinearGradient
        colors={gradientColors}
        style={styles.gradientBackground}
      />
      
      {/* Header */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={dynamicStyles.backButton}
        >
          <ChevronLeft size={24} color={colors.primary} />
          <Text style={dynamicStyles.backText}>Zurück</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={dynamicStyles.content} 
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Text style={dynamicStyles.pageTitle}>Hilfe & Support</Text>
        <Text style={dynamicStyles.subtitle}>
          Finden Sie Antworten auf häufige Fragen oder kontaktieren Sie unser Support-Team für persönliche Hilfe.
        </Text>

        {/* FAQs Section */}
        <Text style={[dynamicStyles.sectionTitle, dynamicStyles.firstSectionTitle]}>
          ❓ Häufig gestellte Fragen
        </Text>
        
        {faqs.map((faq) => {
          const isExpanded = expandedFAQ === faq.id;
          const animatedHeight = animatedValues[faq.id].interpolate({
            inputRange: [0, 1],
            outputRange: [0, 200], // Adjust based on content
          });
          
          const rotateInterpolate = animatedValues[faq.id].interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '180deg'],
          });

          return (
            <Card key={faq.id} style={dynamicStyles.faqCard}>
              <TouchableOpacity
                style={dynamicStyles.faqHeader}
                onPress={() => toggleFAQ(faq.id)}
                activeOpacity={0.7}
              >
                <View style={dynamicStyles.faqIconContainer}>
                  <faq.icon size={20} color={colors.primary} />
                </View>
                <Text style={dynamicStyles.faqQuestion}>{faq.question}</Text>
                <View style={dynamicStyles.chevronContainer}>
                  <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                    <ChevronDown size={20} color={colors.textSecondary} />
                  </Animated.View>
                </View>
              </TouchableOpacity>
              
              {isExpanded && (
                <Animated.View style={[dynamicStyles.faqAnswer, { maxHeight: animatedHeight }]}>
                  <Text style={dynamicStyles.faqAnswerText}>{faq.answer}</Text>
                </Animated.View>
              )}
            </Card>
          );
        })}

        {/* Contact Us Section */}
        <Text style={dynamicStyles.sectionTitle}>📞 Kontakt</Text>
        <Card style={dynamicStyles.contactCard}>
          <View style={dynamicStyles.contactHeader}>
            <View style={dynamicStyles.contactIconContainer}>
              <MessageCircle size={24} color="#FFFFFF" />
            </View>
            <View>
              <Text style={dynamicStyles.contactTitle}>Brauchen Sie weitere Hilfe?</Text>
              <Text style={dynamicStyles.contactSubtitle}>Unser Support-Team ist für Sie da</Text>
            </View>
          </View>
          
          <View style={dynamicStyles.contactMethods}>
            <TouchableOpacity 
              style={dynamicStyles.contactMethod}
              onPress={handleEmailSupport}
              activeOpacity={0.7}
            >
              <Mail size={20} color={colors.primary} style={dynamicStyles.contactMethodIcon} />
              <Text style={dynamicStyles.contactMethodText}>support@kpmed.at</Text>
            </TouchableOpacity>
            
            <Button
              title="Chat mit uns"
              onPress={handleChatSupport}
              icon={<MessageCircle size={20} color="#FFFFFF" />}
              style={dynamicStyles.chatButton}
              textStyle={dynamicStyles.chatButtonText}
            />
          </View>
        </Card>


        {/* Bottom spacing */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
});