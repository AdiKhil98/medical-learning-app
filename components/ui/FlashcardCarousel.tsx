import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface FlashcardData {
  number: number;
  title: string;
  subtitle: string;
  question: string;
  answerContent: React.ReactNode;
}

const FlashcardCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const flashcardsData: FlashcardData[] = [
    // Flashcard 1: Platform Overview
    {
      number: 1,
      title: 'Willkommen zur KP/FSP-Simulationsplattform',
      subtitle: 'Professionelles Training für deutsche Approbationsprüfungen',
      question: 'Was bietet diese Plattform?',
      answerContent: (
        <View>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>🎯</Text>
              </View>
              <Text style={styles.featureText}>
                Realistische medizinische Prüfungssimulationen mit authentischen Szenarien
              </Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>🤖</Text>
              </View>
              <Text style={styles.featureText}>
                KI-gestützte Patienten- und Prüfergespräche zur Vorbereitung auf echte Situationen
              </Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>📧</Text>
              </View>
              <Text style={styles.featureText}>Detaillierte Bewertung und konstruktives Feedback per E-Mail</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Text style={styles.featureIconText}>📚</Text>
              </View>
              <Text style={styles.featureText}>
                Gezieltes Training für Kenntnisprüfung (KP) und Fachsprachprüfung (FSP)
              </Text>
            </View>
          </View>

          <View style={styles.goalBox}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalIcon}>🎯</Text>
              <Text style={styles.goalTitle}>Unser Ziel</Text>
            </View>
            <Text style={styles.goalText}>
              Optimale Vorbereitung auf die deutsche Approbationsprüfung mit ehrlichem, konstruktivem Feedback. Lernen
              Sie systematisch aus Ihren Fehlern und erreichen Sie die notwendige Kompetenz für Ihre berufliche
              Zulassung in Deutschland.
            </Text>
          </View>
        </View>
      ),
    },

    // Flashcard 2: Technical Requirements
    {
      number: 2,
      title: 'Technische Voraussetzungen',
      subtitle: 'Optimale Vorbereitung für Ihre Simulation',
      question: 'Was brauche ich vor dem Start der Simulation?',
      answerContent: (
        <View>
          <View style={styles.requirementsList}>
            <View style={styles.requirementItem}>
              <View style={styles.requirementIcon}>
                <Text style={styles.requirementIconText}>🔇</Text>
              </View>
              <View style={styles.requirementContent}>
                <Text style={styles.requirementTitle}>Ruhiger Raum</Text>
                <Text style={styles.requirementDescription}>
                  Stellen Sie eine geräuschfreie Umgebung sicher, damit die Spracherkennung optimal funktioniert
                </Text>
              </View>
            </View>
            <View style={styles.requirementItem}>
              <View style={styles.requirementIcon}>
                <Text style={styles.requirementIconText}>📶</Text>
              </View>
              <View style={styles.requirementContent}>
                <Text style={styles.requirementTitle}>Stabile Internetverbindung</Text>
                <Text style={styles.requirementDescription}>
                  Eine zuverlässige Verbindung ist erforderlich für die Echtzeit-Sprachverarbeitung
                </Text>
              </View>
            </View>
            <View style={styles.requirementItem}>
              <View style={styles.requirementIcon}>
                <Text style={styles.requirementIconText}>🎤</Text>
              </View>
              <View style={styles.requirementContent}>
                <Text style={styles.requirementTitle}>Mikrofon-Zugriff</Text>
                <Text style={styles.requirementDescription}>
                  Erlauben Sie dem Browser den Zugriff auf Ihr Mikrofon in den Systemeinstellungen
                </Text>
              </View>
            </View>
            <View style={styles.requirementItem}>
              <View style={styles.requirementIcon}>
                <Text style={styles.requirementIconText}>💻</Text>
              </View>
              <View style={styles.requirementContent}>
                <Text style={styles.requirementTitle}>Desktop oder Laptop empfohlen</Text>
                <Text style={styles.requirementDescription}>
                  Für ein optimales Nutzererlebnis empfehlen wir die Verwendung eines Computers statt mobiler Geräte
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>⏰</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Wichtiger Hinweis zur Bewertung</Text>
              <Text style={styles.infoText}>
                Die ersten 5 Minuten jeder Simulation dienen als Aufwärmphase und werden nicht bewertet. Dies gibt Ihnen
                Zeit, sich mit dem System vertraut zu machen und Ihre Herangehensweise zu finden.
              </Text>
            </View>
          </View>
        </View>
      ),
    },

    // Flashcard 3: How to Start
    {
      number: 3,
      title: 'Simulation starten',
      subtitle: 'Schritt-für-Schritt Anleitung zum Start',
      question: 'Wie starte ich eine Simulation?',
      answerContent: (
        <View>
          <View style={styles.stepsList}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Dashboard öffnen</Text>
                <Text style={styles.stepDescription}>
                  Navigieren Sie zur Startseite und wählen Sie die gewünschte Simulationsart aus
                </Text>
              </View>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Simulation auswählen</Text>
                <Text style={styles.stepDescription}>
                  Klicken Sie auf "KP-Simulation" oder "FSP-Simulation" je nach Ihrem Trainingsziel
                </Text>
              </View>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Mikrofon-Widget abwarten</Text>
                <Text style={styles.stepDescription}>
                  Nach dem Start erscheint unten rechts ein rotes Telefon-Symbol (Mikrofon-Widget). Dies kann einige
                  Sekunden dauern
                </Text>
              </View>
            </View>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Mikrofon aktivieren</Text>
                <Text style={styles.stepDescription}>
                  Klicken Sie auf das Mikrofon-Symbol, um die Sprachaufnahme zu starten und mit der Simulation zu
                  beginnen
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.locationBox}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText}>
              <Text style={styles.locationTextBold}>Mikrofon-Widget Position:</Text> Unten rechts auf der Seite als
              rotes Telefon-Symbol
            </Text>
          </View>

          <View style={styles.troubleshootingBox}>
            <View style={styles.troubleshootingHeader}>
              <Text style={styles.troubleshootingIcon}>⚠️</Text>
              <Text style={styles.troubleshootingTitle}>Problemlösung</Text>
            </View>
            <View style={styles.troubleshootingContent}>
              <View style={styles.troubleshootingItem}>
                <Text style={styles.troubleshootingItemIcon}>❌</Text>
                <Text style={styles.troubleshootingText}>
                  <Text style={styles.troubleshootingTextBold}>Mikrofon-Widget erscheint nicht?</Text> Aktualisieren Sie
                  die Seite mit F5 oder dem Browser-Aktualisierungsbutton
                </Text>
              </View>
              <View style={styles.troubleshootingItem}>
                <Text style={styles.troubleshootingItemIcon}>🔒</Text>
                <Text style={styles.troubleshootingText}>
                  <Text style={styles.troubleshootingTextBold}>Mikrofon funktioniert nicht?</Text> Überprüfen Sie die
                  Browser-Berechtigungen für den Mikrofon-Zugriff in Ihren Systemeinstellungen
                </Text>
              </View>
              <View style={styles.troubleshootingItem}>
                <Text style={styles.troubleshootingItemIcon}>⏱️</Text>
                <Text style={styles.troubleshootingText}>
                  <Text style={styles.troubleshootingTextBold}>Widget lädt lange?</Text> Haben Sie Geduld, das Widget
                  kann bis zu 10 Sekunden zum Laden benötigen
                </Text>
              </View>
            </View>
          </View>
        </View>
      ),
    },

    // Flashcard 4: Case Selection
    {
      number: 4,
      title: 'Fallauswahl',
      subtitle: 'Effektive Kommunikation mit dem System',
      question: 'Wie wähle ich einen medizinischen Fall aus?',
      answerContent: (
        <View>
          <View style={styles.introTextBox}>
            <Text style={styles.introTextContent}>
              Sprechen Sie klar und deutlich in vollständigen Begriffen. Das System erkennt medizinische Fachbegriffe,
              Fachgebiete und spezifische Krankheitsbilder. Die Fallauswahl erfolgt automatisch nach Ihrer Eingabe.
            </Text>
          </View>

          <View style={styles.examplesContainer}>
            <View style={styles.examplesHeader}>
              <Text style={styles.examplesHeaderIcon}>✅</Text>
              <Text style={styles.examplesHeaderText}>Empfohlene Eingaben</Text>
            </View>
            <View style={styles.examplesGrid}>
              <View style={styles.exampleItem}>
                <Text style={styles.exampleIcon}>🫀</Text>
                <Text style={styles.exampleText}>"Kardiologie"</Text>
              </View>
              <View style={styles.exampleItem}>
                <Text style={styles.exampleIcon}>🏥</Text>
                <Text style={styles.exampleText}>"Innere Medizin Gastroenterologie"</Text>
              </View>
              <View style={styles.exampleItem}>
                <Text style={styles.exampleIcon}>💉</Text>
                <Text style={styles.exampleText}>"Diabetes mellitus Typ 2"</Text>
              </View>
              <View style={styles.exampleItem}>
                <Text style={styles.exampleIcon}>🚨</Text>
                <Text style={styles.exampleText}>"Herzinfarkt STEMI"</Text>
              </View>
              <View style={styles.exampleItem}>
                <Text style={styles.exampleIcon}>🧠</Text>
                <Text style={styles.exampleText}>"Neurologie Zentrale Erkrankungen"</Text>
              </View>
            </View>
          </View>

          <View style={styles.avoidContainer}>
            <View style={styles.avoidHeader}>
              <Text style={styles.avoidHeaderIcon}>❌</Text>
              <Text style={styles.avoidHeaderText}>Zu vermeiden</Text>
            </View>
            <View style={styles.avoidGrid}>
              <View style={styles.avoidItem}>
                <Text style={styles.avoidIcon}>🔇</Text>
                <Text style={styles.avoidText}>Undeutliches Murmeln oder leise Aussprache</Text>
              </View>
              <View style={styles.avoidItem}>
                <Text style={styles.avoidIcon}>✂️</Text>
                <Text style={styles.avoidText}>Unvollständige oder abgebrochene Wörter</Text>
              </View>
              <View style={styles.avoidItem}>
                <Text style={styles.avoidIcon}>📢</Text>
                <Text style={styles.avoidText}>Hintergrundgeräusche während der Spracheingabe</Text>
              </View>
            </View>
          </View>

          <View style={styles.tipBoxBlue}>
            <View style={styles.tipBoxHeader}>
              <Text style={styles.tipBoxIcon}>💡</Text>
              <Text style={styles.tipBoxTitle}>Wichtiger Hinweis</Text>
            </View>
            <Text style={styles.tipBoxText}>
              Haben Sie Geduld nach Ihrer Eingabe. Die Fallauswahl kann einige Sekunden in Anspruch nehmen, während das
              System die passenden medizinischen Szenarien aus der Datenbank lädt und vorbereitet.
            </Text>
          </View>
        </View>
      ),
    },

    // Flashcard 5: Patient Conversation
    {
      number: 5,
      title: 'Patientengespräch',
      subtitle: 'Anamneseerhebung mit KI-Patient',
      question: 'Was passiert in der Patientenphase?',
      answerContent: (
        <View>
          <View style={styles.roleBoxPurple}>
            <View style={styles.roleBoxHeader}>
              <Text style={styles.roleBoxIcon}>👨‍⚕️</Text>
              <Text style={styles.roleBoxTitle}>Ihre Rolle</Text>
            </View>
            <Text style={styles.roleBoxText}>
              Sie übernehmen die Rolle des Arztes und führen eine vollständige Anamnese durch. Der KI-Patient reagiert
              realistisch auf Ihre Fragen und gibt authentische medizinische Informationen.
            </Text>
          </View>

          <View style={styles.stepsContainer}>
            <View style={styles.stepsHeader}>
              <Text style={styles.stepsHeaderIcon}>📋</Text>
              <Text style={styles.stepsHeaderText}>Vorgehensweise</Text>
            </View>
            <View style={styles.stepsListSmall}>
              <View style={styles.stepItemSmall}>
                <View style={styles.stepNumberSmall}>
                  <Text style={styles.stepNumberTextSmall}>1</Text>
                </View>
                <Text style={styles.stepTextSmall}>
                  Begrüßen Sie den Patienten professionell: "Guten Tag, wie kann ich Ihnen helfen?"
                </Text>
              </View>
              <View style={styles.stepItemSmall}>
                <View style={styles.stepNumberSmall}>
                  <Text style={styles.stepNumberTextSmall}>2</Text>
                </View>
                <Text style={styles.stepTextSmall}>
                  Stellen Sie systematische Fragen zur Krankengeschichte und aktuellen Beschwerden
                </Text>
              </View>
              <View style={styles.stepItemSmall}>
                <View style={styles.stepNumberSmall}>
                  <Text style={styles.stepNumberTextSmall}>3</Text>
                </View>
                <Text style={styles.stepTextSmall}>Der Patient antwortet realistisch auf Ihre Fragen</Text>
              </View>
              <View style={styles.stepItemSmall}>
                <View style={styles.stepNumberSmall}>
                  <Text style={styles.stepNumberTextSmall}>4</Text>
                </View>
                <Text style={styles.stepTextSmall}>
                  Erstellen Sie ein vollständiges medizinisches Bild durch gezielte Anamneseführung
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.tipsGrid}>
            <View style={styles.tipsHeader}>
              <Text style={styles.tipsHeaderIcon}>💡</Text>
              <Text style={styles.tipsHeaderText}>Professionelle Hinweise</Text>
            </View>
            <View style={styles.tipItemsContainer}>
              <View style={styles.tipItemBox}>
                <Text style={styles.tipItemIcon}>🗣️</Text>
                <Text style={styles.tipItemText}>Sprechen Sie natürlich und fließend auf Deutsch</Text>
              </View>
              <View style={styles.tipItemBox}>
                <Text style={styles.tipItemIcon}>📝</Text>
                <Text style={styles.tipItemText}>Stellen Sie systematische und strukturierte Fragen</Text>
              </View>
              <View style={styles.tipItemBox}>
                <Text style={styles.tipItemIcon}>⏱️</Text>
                <Text style={styles.tipItemText}>Nehmen Sie sich ausreichend Zeit für eine gründliche Anamnese</Text>
              </View>
              <View style={styles.tipItemBox}>
                <Text style={styles.tipItemIcon}>🎯</Text>
                <Text style={styles.tipItemText}>
                  Fokussieren Sie auf die Erhebung aller relevanten medizinischen Informationen
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>⏰</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Wichtig: Aufwärmphase</Text>
              <Text style={styles.infoText}>
                Die ersten 5 Minuten des Patientengesprächs werden nicht bewertet. Diese Aufwärmphase dient dazu, dass
                Sie sich mit dem System vertraut machen und Ihre Gesprächsstrategie entwickeln können. Nutzen Sie diese
                Zeit ohne Bewertungsdruck.
              </Text>
            </View>
          </View>
        </View>
      ),
    },

    // Flashcard 6: Transition to Examiner
    {
      number: 6,
      title: 'Übergang zur Prüferphase',
      subtitle: 'Vom Patientengespräch zur Fallbesprechung',
      question: 'Wie gelange ich von der Patienten- zur Prüferphase?',
      answerContent: (
        <View>
          <View style={styles.phraseBox}>
            <Text style={styles.phraseLabel}>Schlüsselphrase für den Übergang</Text>
            <View style={styles.phraseTextBox}>
              <Text style={styles.phraseText}>"Ich habe keine weitere Fragen"</Text>
            </View>
          </View>

          <View style={styles.sequenceContainer}>
            <View style={styles.sequenceHeader}>
              <Text style={styles.sequenceHeaderIcon}>🔄</Text>
              <Text style={styles.sequenceHeaderText}>Ablauf des Übergangs</Text>
            </View>
            <View style={styles.sequenceSteps}>
              <View style={styles.sequenceStep}>
                <View style={styles.sequenceIconBox}>
                  <Text style={styles.sequenceIconText}>👨‍⚕️</Text>
                </View>
                <View style={styles.sequenceContent}>
                  <Text style={styles.sequenceContentTitle}>Sie sprechen die Schlüsselphrase</Text>
                  <Text style={styles.sequenceContentText}>Sagen Sie deutlich: "Ich habe keine weitere Fragen"</Text>
                </View>
              </View>
              <View style={styles.sequenceArrow}>
                <Text style={styles.sequenceArrowText}>↓</Text>
              </View>
              <View style={styles.sequenceStep}>
                <View style={styles.sequenceIconBox}>
                  <Text style={styles.sequenceIconText}>⏹️</Text>
                </View>
                <View style={styles.sequenceContent}>
                  <Text style={styles.sequenceContentTitle}>System beendet Patientengespräch</Text>
                  <Text style={styles.sequenceContentText}>
                    Das Patientensimulationssystem wird automatisch geschlossen
                  </Text>
                </View>
              </View>
              <View style={styles.sequenceArrow}>
                <Text style={styles.sequenceArrowText}>↓</Text>
              </View>
              <View style={styles.sequenceStep}>
                <View style={styles.sequenceIconBox}>
                  <Text style={styles.sequenceIconText}>🔄</Text>
                </View>
                <View style={styles.sequenceContent}>
                  <Text style={styles.sequenceContentTitle}>Automatischer Übergang</Text>
                  <Text style={styles.sequenceContentText}>Das System wechselt nahtlos zur Prüferphase</Text>
                </View>
              </View>
              <View style={styles.sequenceArrow}>
                <Text style={styles.sequenceArrowText}>↓</Text>
              </View>
              <View style={styles.sequenceStep}>
                <View style={styles.sequenceIconBox}>
                  <Text style={styles.sequenceIconText}>👔</Text>
                </View>
                <View style={styles.sequenceContent}>
                  <Text style={styles.sequenceContentTitle}>Dr. Bayer begrüßt Sie</Text>
                  <Text style={styles.sequenceContentText}>
                    Der Oberarzt (Dr. Bayer) leitet die Fallbesprechung ein
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.tipBoxBlue}>
            <View style={styles.tipBoxHeader}>
              <Text style={styles.tipBoxIcon}>⚠️</Text>
              <Text style={styles.tipBoxTitle}>Wichtiger Hinweis zum Timing</Text>
            </View>
            <Text style={styles.tipBoxText}>
              Verwenden Sie diese Schlüsselphrase nur, wenn Sie die Anamnese vollständig abgeschlossen haben und alle
              relevanten medizinischen Informationen erhoben wurden. Ein vorzeitiger Übergang kann sich negativ auf Ihre
              Bewertung auswirken.
            </Text>
          </View>
        </View>
      ),
    },

    // Flashcard 7: Examiner Phase
    {
      number: 7,
      title: 'Prüferphase mit Dr. Bayer',
      subtitle: 'Fallbesprechung mit dem Oberarzt',
      question: 'Was passiert in der Prüferphase?',
      answerContent: (
        <View>
          <View style={styles.roleBoxPurple}>
            <View style={styles.roleBoxHeader}>
              <Text style={styles.roleBoxIcon}>👔</Text>
              <Text style={styles.roleBoxTitle}>Fallbesprechung mit Dr. Bayer</Text>
            </View>
            <Text style={styles.roleBoxText}>
              In dieser Phase besprechen Sie den Fall mit Dr. Bayer, dem leitenden Oberarzt. Er stellt Ihnen gezielte
              Fragen zur Fallbeurteilung, Diagnostik und Behandlung. Die Fragen richten sich nach dem gewählten
              Prüfungstyp.
            </Text>
          </View>

          <View style={styles.examTypesContainer}>
            <View style={styles.examTypesHeader}>
              <Text style={styles.examTypesHeaderIcon}>📋</Text>
              <Text style={styles.examTypesHeaderText}>Prüfungsfokus je nach Typ</Text>
            </View>
            <View style={styles.examTypesGrid}>
              <View style={styles.examTypeCard}>
                <View style={styles.examTypeHeader}>
                  <Text style={styles.examTypeIcon}>🗣️</Text>
                  <View>
                    <Text style={styles.examTypeName}>FSP (Fachsprachprüfung)</Text>
                    <Text style={styles.examTypeFocus}>Fokus: Kommunikationskompetenz</Text>
                  </View>
                </View>
                <View style={styles.examTypeContent}>
                  <Text style={styles.examTypeItem}>• Erklärung der Diagnose in patientenfreundlicher Sprache</Text>
                  <Text style={styles.examTypeItem}>• Verwendung korrekter medizinischer Fachbegriffe</Text>
                  <Text style={styles.examTypeItem}>• Kommunikation komplexer medizinischer Konzepte</Text>
                  <Text style={styles.examTypeItem}>• Aufklärung und Beratung des Patienten</Text>
                </View>
              </View>

              <View style={styles.examTypeCard}>
                <View style={styles.examTypeHeader}>
                  <Text style={styles.examTypeIcon}>🩺</Text>
                  <View>
                    <Text style={styles.examTypeName}>KP (Kenntnisprüfung)</Text>
                    <Text style={styles.examTypeFocus}>Fokus: Medizinisches Fachwissen</Text>
                  </View>
                </View>
                <View style={styles.examTypeContent}>
                  <Text style={styles.examTypeItem}>• Differentialdiagnostische Überlegungen</Text>
                  <Text style={styles.examTypeItem}>• Therapeutische Entscheidungsfindung</Text>
                  <Text style={styles.examTypeItem}>• Fundierte medizinische Kenntnisse</Text>
                  <Text style={styles.examTypeItem}>• Klinisches Urteilsvermögen und Begründung</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>⏱️</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Mindestanzahl der Fragen</Text>
              <View style={styles.minimumQuestionsContent}>
                <View style={styles.minimumQuestionItem}>
                  <Text style={styles.minimumQuestionLabel}>FSP:</Text>
                  <Text style={styles.minimumQuestionValue}>Minimum 5 Fragen vom Prüfer</Text>
                </View>
                <View style={styles.minimumQuestionItem}>
                  <Text style={styles.minimumQuestionLabel}>KP:</Text>
                  <Text style={styles.minimumQuestionValue}>Minimum 7 Fragen vom Prüfer</Text>
                </View>
                <Text style={styles.minimumQuestionNote}>
                  Der Prüfer setzt das Gespräch fort, bis diese Mindestanzahl erreicht ist. Ein vorzeitiges Beenden ist
                  nicht möglich, um eine faire und umfassende Bewertung zu gewährleisten.
                </Text>
              </View>
            </View>
          </View>
        </View>
      ),
    },

    // Flashcard 8: Evaluation
    {
      number: 8,
      title: 'Bewertung und Feedback',
      subtitle: 'Detaillierte Auswertung Ihrer Leistung',
      question: 'Wie erhalte ich meine Bewertung?',
      answerContent: (
        <View>
          <View style={styles.deliveryBox}>
            <Text style={styles.deliveryIcon}>📧</Text>
            <Text style={styles.deliveryText}>
              Nach Abschluss der Simulation erhalten Sie eine detaillierte Bewertung und konstruktives Feedback per
              E-Mail
            </Text>
          </View>

          <View style={styles.reportSectionsContainer}>
            <View style={styles.reportSectionsHeader}>
              <Text style={styles.reportSectionsHeaderIcon}>📊</Text>
              <Text style={styles.reportSectionsHeaderText}>Inhalte des Bewertungsberichts</Text>
            </View>
            <View style={styles.reportSectionsGrid}>
              <View style={styles.reportSectionItem}>
                <View style={styles.reportSectionIcon}>
                  <Text style={styles.reportSectionIconText}>🎯</Text>
                </View>
                <View style={styles.reportSectionContent}>
                  <Text style={styles.reportSectionName}>Gesamtleistungsbewertung</Text>
                  <Text style={styles.reportSectionDescription}>
                    Übersichtliche Darstellung Ihrer Gesamtperformance mit Bewertungsskala
                  </Text>
                </View>
              </View>

              <View style={styles.reportSectionItem}>
                <View style={styles.reportSectionIcon}>
                  <Text style={styles.reportSectionIconText}>💪</Text>
                </View>
                <View style={styles.reportSectionContent}>
                  <Text style={styles.reportSectionName}>Identifizierte Stärken</Text>
                  <Text style={styles.reportSectionDescription}>
                    Bereiche, in denen Sie besonders gut abgeschnitten haben und weiter ausbauen können
                  </Text>
                </View>
              </View>

              <View style={styles.reportSectionItem}>
                <View style={styles.reportSectionIcon}>
                  <Text style={styles.reportSectionIconText}>📈</Text>
                </View>
                <View style={styles.reportSectionContent}>
                  <Text style={styles.reportSectionName}>Verbesserungspotenziale</Text>
                  <Text style={styles.reportSectionDescription}>
                    Konkrete Schwachstellen und Bereiche, die zusätzliche Aufmerksamkeit benötigen
                  </Text>
                </View>
              </View>

              <View style={styles.reportSectionItem}>
                <View style={styles.reportSectionIcon}>
                  <Text style={styles.reportSectionIconText}>💡</Text>
                </View>
                <View style={styles.reportSectionContent}>
                  <Text style={styles.reportSectionName}>Handlungsempfehlungen</Text>
                  <Text style={styles.reportSectionDescription}>
                    Spezifische, umsetzbare Verbesserungsvorschläge für Ihr weiteres Training
                  </Text>
                </View>
              </View>

              <View style={styles.reportSectionItem}>
                <View style={styles.reportSectionIcon}>
                  <Text style={styles.reportSectionIconText}>🎓</Text>
                </View>
                <View style={styles.reportSectionContent}>
                  <Text style={styles.reportSectionName}>Lernhinweise</Text>
                  <Text style={styles.reportSectionDescription}>
                    Ressourcen und Themen für Ihr gezieltes Selbststudium zur Kompetenzerweiterung
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.goalBox}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalIcon}>🎯</Text>
              <Text style={styles.goalTitle}>Unser Ansatz</Text>
            </View>
            <Text style={styles.goalText}>
              Die Bewertung erfolgt ehrlich und konstruktiv. Ziel ist nicht perfekte Leistung beim ersten Versuch,
              sondern systematische Verbesserung durch klares, umsetzbares Feedback. Lernen Sie aus jedem Fehler und
              entwickeln Sie schrittweise die erforderliche Kompetenz für Ihre Approbation.
            </Text>
          </View>
        </View>
      ),
    },

    // Flashcard 9: FSP vs KP Comparison
    {
      number: 9,
      title: 'FSP vs. KP im Vergleich',
      subtitle: 'Unterschiede zwischen den Prüfungstypen',
      question: 'Was ist der Unterschied zwischen FSP und KP?',
      answerContent: (
        <View>
          <View style={styles.comparisonGrid}>
            {/* FSP Card */}
            <View style={[styles.comparisonCard, styles.comparisonCardFSP]}>
              <View style={styles.comparisonHeader}>
                <Text style={styles.comparisonIcon}>🗣️</Text>
                <View>
                  <Text style={styles.comparisonName}>FSP</Text>
                  <Text style={styles.comparisonFullName}>Fachsprachprüfung</Text>
                </View>
              </View>

              <View style={styles.comparisonDetails}>
                <View style={styles.comparisonDetailItem}>
                  <Text style={styles.comparisonDetailLabel}>DAUER</Text>
                  <Text style={[styles.comparisonDetailValue, styles.comparisonDetailValueFSP]}>15-20 Minuten</Text>
                </View>
                <View style={styles.comparisonDetailItem}>
                  <Text style={styles.comparisonDetailLabel}>PRÜFUNGSFOKUS</Text>
                  <Text style={[styles.comparisonDetailValue, styles.comparisonDetailValueFSP]}>
                    Deutsche medizinische Fachsprache & Kommunikation
                  </Text>
                </View>
                <View style={styles.comparisonDetailItem}>
                  <Text style={styles.comparisonDetailLabel}>MINDESTFRAGEN PRÜFER</Text>
                  <Text style={[styles.comparisonDetailValue, styles.comparisonDetailValueFSP]}>Minimum 5 Fragen</Text>
                </View>
                <View style={styles.comparisonDetailItem}>
                  <Text style={styles.comparisonDetailLabel}>PATIENTENVERHALTEN</Text>
                  <Text style={[styles.comparisonDetailValue, styles.comparisonDetailValueFSP]}>
                    Kooperativ (einfaches Niveau)
                  </Text>
                </View>
              </View>

              <View style={styles.comparisonFocusBox}>
                <Text style={styles.comparisonFocusTitle}>Bewertungsschwerpunkte:</Text>
                <Text style={[styles.comparisonFocusItem, styles.comparisonFocusItemFSP]}>• Sprachliche Klarheit</Text>
                <Text style={[styles.comparisonFocusItem, styles.comparisonFocusItemFSP]}>
                  • Patientenkommunikation
                </Text>
                <Text style={[styles.comparisonFocusItem, styles.comparisonFocusItemFSP]}>• Fachterminologie</Text>
                <Text style={[styles.comparisonFocusItem, styles.comparisonFocusItemFSP]}>• Erklärungskompetenz</Text>
              </View>
            </View>

            {/* KP Card */}
            <View style={[styles.comparisonCard, styles.comparisonCardKP]}>
              <View style={styles.comparisonHeader}>
                <Text style={styles.comparisonIcon}>🩺</Text>
                <View>
                  <Text style={styles.comparisonName}>KP</Text>
                  <Text style={styles.comparisonFullName}>Kenntnisprüfung</Text>
                </View>
              </View>

              <View style={styles.comparisonDetails}>
                <View style={styles.comparisonDetailItem}>
                  <Text style={styles.comparisonDetailLabel}>DAUER</Text>
                  <Text style={[styles.comparisonDetailValue, styles.comparisonDetailValueKP]}>15-20 Minuten</Text>
                </View>
                <View style={styles.comparisonDetailItem}>
                  <Text style={styles.comparisonDetailLabel}>PRÜFUNGSFOKUS</Text>
                  <Text style={[styles.comparisonDetailValue, styles.comparisonDetailValueKP]}>
                    Medizinisches Fachwissen & klinische Kompetenz
                  </Text>
                </View>
                <View style={styles.comparisonDetailItem}>
                  <Text style={styles.comparisonDetailLabel}>MINDESTFRAGEN PRÜFER</Text>
                  <Text style={[styles.comparisonDetailValue, styles.comparisonDetailValueKP]}>Minimum 7 Fragen</Text>
                </View>
                <View style={styles.comparisonDetailItem}>
                  <Text style={styles.comparisonDetailLabel}>PATIENTENVERHALTEN</Text>
                  <Text style={[styles.comparisonDetailValue, styles.comparisonDetailValueKP]}>
                    Komplexer, anspruchsvoller
                  </Text>
                </View>
              </View>

              <View style={styles.comparisonFocusBox}>
                <Text style={styles.comparisonFocusTitle}>Bewertungsschwerpunkte:</Text>
                <Text style={[styles.comparisonFocusItem, styles.comparisonFocusItemKP]}>
                  • Medizinische Kenntnisse
                </Text>
                <Text style={[styles.comparisonFocusItem, styles.comparisonFocusItemKP]}>• Differentialdiagnostik</Text>
                <Text style={[styles.comparisonFocusItem, styles.comparisonFocusItemKP]}>• Therapieentscheidungen</Text>
                <Text style={[styles.comparisonFocusItem, styles.comparisonFocusItemKP]}>
                  • Klinisches Urteilsvermögen
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>🎯</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Kernunterschied</Text>
              <Text style={styles.infoText}>
                FSP prüft Ihre Fähigkeit, auf Deutsch mit Patienten und Kollegen zu kommunizieren. KP prüft Ihr
                medizinisches Fachwissen und Ihre klinische Kompetenz. Beide Prüfungen sind erforderlich für die
                vollständige Approbation in Deutschland.
              </Text>
            </View>
          </View>
        </View>
      ),
    },

    // Flashcard 10: Troubleshooting & Success Tips
    {
      number: 10,
      title: 'Problemlösung & Erfolgstipps',
      subtitle: 'Häufige Probleme und bewährte Strategien',
      question: 'Was tun bei technischen Problemen und wie optimiere ich meine Vorbereitung?',
      answerContent: (
        <View>
          <View style={styles.troubleshootingContainer}>
            <View style={styles.troubleshootingProblemsHeader}>
              <Text style={styles.troubleshootingProblemsHeaderIcon}>🔧</Text>
              <Text style={styles.troubleshootingProblemsHeaderText}>Häufige technische Probleme</Text>
            </View>
            <View style={styles.troubleshootingGrid}>
              <View style={styles.troubleshootingItemBox}>
                <View style={styles.troubleshootingItemHeader}>
                  <View style={styles.troubleshootingProblemIconBox}>
                    <Text style={styles.troubleshootingItemIconText}>❌</Text>
                  </View>
                  <Text style={styles.troubleshootingProblem}>Mikrofon-Widget erscheint nicht</Text>
                </View>
                <Text style={styles.troubleshootingSolution}>
                  Aktualisieren Sie die Seite (F5 oder Browser-Aktualisierungsbutton). Das Widget kann bis zu 10
                  Sekunden zum Laden benötigen.
                </Text>
              </View>

              <View style={styles.troubleshootingItemBox}>
                <View style={styles.troubleshootingItemHeader}>
                  <View style={styles.troubleshootingProblemIconBox}>
                    <Text style={styles.troubleshootingItemIconText}>🎤</Text>
                  </View>
                  <Text style={styles.troubleshootingProblem}>Spracherkennung funktioniert nicht</Text>
                </View>
                <Text style={styles.troubleshootingSolution}>
                  Überprüfen Sie die Mikrofon-Berechtigungen in Ihren Browser- und Systemeinstellungen. Sprechen Sie
                  lauter und deutlicher. Reduzieren Sie Hintergrundgeräusche.
                </Text>
              </View>

              <View style={styles.troubleshootingItemBox}>
                <View style={styles.troubleshootingItemHeader}>
                  <View style={styles.troubleshootingProblemIconBox}>
                    <Text style={styles.troubleshootingItemIconText}>⏸️</Text>
                  </View>
                  <Text style={styles.troubleshootingProblem}>Simulation reagiert nicht oder friert ein</Text>
                </View>
                <Text style={styles.troubleshootingSolution}>
                  Aktualisieren Sie die Seite und starten Sie eine neue Simulation. Es entsteht keine Strafe für einen
                  Neustart. Überprüfen Sie Ihre Internetverbindung.
                </Text>
              </View>

              <View style={styles.troubleshootingItemBox}>
                <View style={styles.troubleshootingItemHeader}>
                  <View style={styles.troubleshootingProblemIconBox}>
                    <Text style={styles.troubleshootingItemIconText}>📶</Text>
                  </View>
                  <Text style={styles.troubleshootingProblem}>Verbindungsprobleme während der Simulation</Text>
                </View>
                <Text style={styles.troubleshootingSolution}>
                  Stellen Sie eine stabile Internetverbindung sicher. Verwenden Sie LAN-Kabel statt WLAN wenn möglich.
                  Schließen Sie andere bandbreitenintensive Anwendungen.
                </Text>
              </View>

              <View style={styles.troubleshootingItemBox}>
                <View style={styles.troubleshootingItemHeader}>
                  <View style={styles.troubleshootingProblemIconBox}>
                    <Text style={styles.troubleshootingItemIconText}>📧</Text>
                  </View>
                  <Text style={styles.troubleshootingProblem}>Bewertungs-E-Mail nicht erhalten</Text>
                </View>
                <Text style={styles.troubleshootingSolution}>
                  Überprüfen Sie Ihren Spam-Ordner. Die E-Mail wird in der Regel innerhalb von 24 Stunden zugestellt.
                  Kontaktieren Sie den Support, falls die E-Mail nach 48 Stunden nicht angekommen ist.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.bestPracticesContainer}>
            <View style={styles.bestPracticesHeader}>
              <Text style={styles.bestPracticesHeaderIcon}>💡</Text>
              <Text style={styles.bestPracticesHeaderText}>Bewährte Strategien für optimale Ergebnisse</Text>
            </View>
            <View style={styles.bestPracticesGrid}>
              <View style={styles.bestPracticeItem}>
                <Text style={styles.bestPracticeIcon}>📚</Text>
                <Text style={styles.bestPracticeText}>
                  Überprüfen Sie die Bewertung jeder Simulation gründlich und identifizieren Sie konkrete
                  Verbesserungsbereiche
                </Text>
              </View>
              <View style={styles.bestPracticeItem}>
                <Text style={styles.bestPracticeIcon}>🎯</Text>
                <Text style={styles.bestPracticeText}>
                  Fokussieren Sie sich zwischen Simulationen auf 2-3 Hauptschwachstellen statt alle Bereiche
                  gleichzeitig zu verbessern
                </Text>
              </View>
              <View style={styles.bestPracticeItem}>
                <Text style={styles.bestPracticeIcon}>⏱️</Text>
                <Text style={styles.bestPracticeText}>
                  Nutzen Sie die 5-minütige Aufwärmphase bewusst zum Einstellen und Testen der Spracherkennung
                </Text>
              </View>
              <View style={styles.bestPracticeItem}>
                <Text style={styles.bestPracticeIcon}>🗣️</Text>
                <Text style={styles.bestPracticeText}>
                  Sprechen Sie klar, in natürlichem Tempo und verwenden Sie vollständige medizinische Fachbegriffe
                </Text>
              </View>
              <View style={styles.bestPracticeItem}>
                <Text style={styles.bestPracticeIcon}>📝</Text>
                <Text style={styles.bestPracticeText}>
                  Führen Sie eine systematische Anamnese durch, auch wenn der Patient kooperativ ist
                </Text>
              </View>
              <View style={styles.bestPracticeItem}>
                <Text style={styles.bestPracticeIcon}>🔄</Text>
                <Text style={styles.bestPracticeText}>
                  Wiederholen Sie Simulationen erst nach gezielter Vorbereitung auf identifizierte Schwachstellen
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.successBox}>
            <Text style={styles.successIcon}>🎓</Text>
            <Text style={styles.successTitle}>Sie sind bereit!</Text>
            <Text style={styles.successText}>
              Mit dieser Vorbereitung können Sie die Simulationen optimal nutzen. Betrachten Sie jeden Versuch als
              Lernmöglichkeit, nicht als Test. Systematische Verbesserung durch ehrliches Feedback führt zum Erfolg bei
              Ihrer deutschen Approbationsprüfung.
            </Text>
          </View>
        </View>
      ),
    },
  ];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : flashcardsData.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < flashcardsData.length - 1 ? prev + 1 : 0));
  };

  const currentCard = flashcardsData[currentIndex];

  return (
    <View style={styles.container}>
      {/* Card Counter */}
      <View style={styles.counterContainer}>
        <Text style={styles.counterText}>
          {currentIndex + 1} / {flashcardsData.length}
        </Text>
      </View>

      {/* Flashcard */}
      <View style={styles.flashcard}>
        {/* Card Header with Gradient */}
        <LinearGradient
          colors={['#6366f1', '#4f46e5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardHeader}
        >
          <View style={styles.cardNumber}>
            <Text style={styles.cardNumberText}>{currentCard.number}</Text>
          </View>
          <Text style={styles.cardTitle}>{currentCard.title}</Text>
          <Text style={styles.cardSubtitle}>{currentCard.subtitle}</Text>
        </LinearGradient>

        {/* Card Body */}
        <ScrollView
          style={styles.cardBody}
          contentContainerStyle={styles.cardBodyContent}
          showsVerticalScrollIndicator={true}
        >
          {/* Question Section */}
          <View style={styles.section}>
            <View style={styles.sectionLabel}>
              <Text style={styles.sectionLabelText}>FRAGE</Text>
            </View>
            <Text style={styles.questionText}>{currentCard.question}</Text>
          </View>

          {/* Answer Section */}
          <View style={styles.section}>
            <View style={styles.sectionLabel}>
              <Text style={styles.sectionLabelText}>ANTWORT</Text>
            </View>
            <View style={styles.answerContainer}>{currentCard.answerContent}</View>
          </View>
        </ScrollView>
      </View>

      {/* Navigation Controls */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity style={styles.navButton} onPress={handlePrevious} activeOpacity={0.7}>
          <ChevronLeft size={28} color="#6366f1" />
        </TouchableOpacity>

        <View style={styles.navIndicatorContainer}>
          {flashcardsData.map((_, index) => (
            <View key={index} style={[styles.navIndicator, index === currentIndex && styles.navIndicatorActive]} />
          ))}
        </View>

        <TouchableOpacity style={styles.navButton} onPress={handleNext} activeOpacity={0.7}>
          <ChevronRight size={28} color="#6366f1" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  counterContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  counterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },

  // Flashcard Container
  flashcard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  // Card Header (Purple Gradient)
  cardHeader: {
    paddingHorizontal: 45,
    paddingTop: 45,
    paddingBottom: 40,
  },
  cardNumber: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  cardNumberText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
  },
  cardTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 36,
    marginBottom: 15,
  },
  cardSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '500',
  },

  // Card Body
  cardBody: {
    maxHeight: 500,
  },
  cardBodyContent: {
    paddingHorizontal: 45,
    paddingVertical: 45,
  },

  // Sections
  section: {
    marginBottom: 40,
  },
  sectionLabel: {
    backgroundColor: '#f3f4f6',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 18,
  },
  sectionLabelText: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  questionText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 33,
  },

  // Answer Container
  answerContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 35,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },

  // Features List (Flashcard 1)
  featuresList: {
    marginBottom: 30,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  featureIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  featureIconText: {
    fontSize: 20,
  },
  featureText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    lineHeight: 25,
    paddingTop: 8,
  },

  // Goal Box (Flashcard 1)
  goalBox: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 28,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#f3f4f6',
  },
  goalIcon: {
    fontSize: 24,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  goalText: {
    fontSize: 15,
    lineHeight: 25,
    color: '#4b5563',
  },

  // Requirements List (Flashcard 2)
  requirementsList: {
    marginBottom: 30,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  requirementIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  requirementIconText: {
    fontSize: 20,
  },
  requirementContent: {
    flex: 1,
    paddingTop: 4,
  },
  requirementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  requirementDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
  },

  // Info Box (Flashcard 2)
  infoBox: {
    backgroundColor: '#fef3c7',
    borderWidth: 2,
    borderColor: '#fbbf24',
    borderRadius: 10,
    padding: 24,
    flexDirection: 'row',
    gap: 16,
  },
  infoIcon: {
    fontSize: 28,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 23,
    color: '#78350f',
  },

  // Steps List (Flashcard 3)
  stepsList: {
    marginBottom: 30,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  stepNumber: {
    width: 44,
    height: 44,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#6366f1',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366f1',
  },
  stepContent: {
    flex: 1,
    paddingTop: 4,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
  },

  // Location Box (Flashcard 3)
  locationBox: {
    backgroundColor: '#dbeafe',
    borderWidth: 2,
    borderColor: '#60a5fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationIcon: {
    fontSize: 20,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#1e3a8a',
    fontWeight: '500',
    lineHeight: 21,
  },
  locationTextBold: {
    fontWeight: '600',
  },

  // Troubleshooting Box (Flashcard 3)
  troubleshootingBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 2,
    borderColor: '#fca5a5',
    borderRadius: 10,
    padding: 24,
  },
  troubleshootingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#fecaca',
  },
  troubleshootingIcon: {
    fontSize: 24,
  },
  troubleshootingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991b1b',
  },
  troubleshootingContent: {
    gap: 12,
  },
  troubleshootingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  troubleshootingItemIcon: {
    fontSize: 16,
    marginTop: 2,
  },
  troubleshootingText: {
    flex: 1,
    fontSize: 14,
    color: '#7f1d1d',
    lineHeight: 22,
  },
  troubleshootingTextBold: {
    color: '#991b1b',
    fontWeight: '600',
  },

  // Intro Text Box (Flashcard 4)
  introTextBox: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 30,
  },
  introTextContent: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 25,
  },

  // Examples Container (Flashcard 4)
  examplesContainer: {
    marginBottom: 30,
  },
  examplesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  examplesHeaderIcon: {
    fontSize: 16,
  },
  examplesHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  examplesGrid: {
    gap: 12,
  },
  exampleItem: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exampleIcon: {
    fontSize: 20,
  },
  exampleText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#047857',
    fontFamily: 'Courier New',
  },

  // Avoid Container (Flashcard 4)
  avoidContainer: {
    marginBottom: 30,
  },
  avoidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  avoidHeaderIcon: {
    fontSize: 16,
  },
  avoidHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  avoidGrid: {
    gap: 12,
  },
  avoidItem: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#ef4444',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avoidIcon: {
    fontSize: 20,
  },
  avoidText: {
    fontSize: 14,
    color: '#991b1b',
    flex: 1,
  },

  // Blue Tip Box (Flashcard 4, 6)
  tipBoxBlue: {
    backgroundColor: '#dbeafe',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderRadius: 10,
    padding: 24,
  },
  tipBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  tipBoxIcon: {
    fontSize: 24,
  },
  tipBoxTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
  },
  tipBoxText: {
    fontSize: 14,
    color: '#1e3a8a',
    lineHeight: 23,
  },

  // Purple Role Box (Flashcard 5, 7)
  roleBoxPurple: {
    backgroundColor: '#ede9fe',
    borderWidth: 2,
    borderColor: '#8b5cf6',
    borderRadius: 10,
    padding: 24,
    marginBottom: 30,
  },
  roleBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  roleBoxIcon: {
    fontSize: 28,
  },
  roleBoxTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5b21b6',
  },
  roleBoxText: {
    fontSize: 15,
    color: '#6b21a8',
    lineHeight: 25,
  },

  // Small Steps Container (Flashcard 5)
  stepsContainer: {
    marginBottom: 30,
  },
  stepsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  stepsHeaderIcon: {
    fontSize: 16,
  },
  stepsHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  stepsListSmall: {
    gap: 0,
  },
  stepItemSmall: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  stepNumberSmall: {
    width: 36,
    height: 36,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#6366f1',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberTextSmall: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366f1',
  },
  stepTextSmall: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 23,
    paddingTop: 6,
  },

  // Tips Grid (Flashcard 5)
  tipsGrid: {
    marginBottom: 30,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  tipsHeaderIcon: {
    fontSize: 16,
  },
  tipsHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  tipItemsContainer: {
    gap: 12,
  },
  tipItemBox: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipItemIcon: {
    fontSize: 20,
  },
  tipItemText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
  },

  // Phrase Box (Flashcard 6)
  phraseBox: {
    backgroundColor: '#d1fae5',
    borderWidth: 3,
    borderColor: '#10b981',
    borderRadius: 12,
    padding: 28,
    marginBottom: 30,
    alignItems: 'center',
  },
  phraseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#047857',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
  },
  phraseTextBox: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 8,
  },
  phraseText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#065f46',
    fontFamily: 'Courier New',
  },

  // Sequence Container (Flashcard 6)
  sequenceContainer: {
    marginBottom: 30,
  },
  sequenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  sequenceHeaderIcon: {
    fontSize: 16,
  },
  sequenceHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  sequenceSteps: {
    gap: 0,
  },
  sequenceStep: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  sequenceArrow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  sequenceArrowText: {
    fontSize: 20,
    color: '#6366f1',
  },
  sequenceIconBox: {
    width: 44,
    height: 44,
    backgroundColor: '#ede9fe',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sequenceIconText: {
    fontSize: 22,
  },
  sequenceContent: {
    flex: 1,
  },
  sequenceContentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  sequenceContentText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 21,
  },

  // Exam Types (Flashcard 7)
  examTypesContainer: {
    marginBottom: 30,
  },
  examTypesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  examTypesHeaderIcon: {
    fontSize: 16,
  },
  examTypesHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  examTypesGrid: {
    gap: 16,
  },
  examTypeCard: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 24,
  },
  examTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#f3f4f6',
  },
  examTypeIcon: {
    fontSize: 24,
  },
  examTypeName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
  },
  examTypeFocus: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  examTypeContent: {
    gap: 8,
  },
  examTypeItem: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
  },

  // Minimum Questions (Flashcard 7)
  minimumQuestionsContent: {
    gap: 0,
  },
  minimumQuestionItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  minimumQuestionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78350f',
    minWidth: 60,
  },
  minimumQuestionValue: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
  },
  minimumQuestionNote: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 23,
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Delivery Box (Flashcard 8)
  deliveryBox: {
    backgroundColor: '#bfdbfe',
    borderWidth: 2,
    borderColor: '#3b82f6',
    borderRadius: 12,
    padding: 28,
    marginBottom: 30,
    alignItems: 'center',
  },
  deliveryIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  deliveryText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1e40af',
    lineHeight: 27,
    textAlign: 'center',
  },

  // Report Sections (Flashcard 8)
  reportSectionsContainer: {
    marginBottom: 30,
  },
  reportSectionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  reportSectionsHeaderIcon: {
    fontSize: 16,
  },
  reportSectionsHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  reportSectionsGrid: {
    gap: 14,
  },
  reportSectionItem: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  reportSectionIcon: {
    width: 44,
    height: 44,
    backgroundColor: '#ede9fe',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportSectionIconText: {
    fontSize: 22,
  },
  reportSectionContent: {
    flex: 1,
  },
  reportSectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  reportSectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
  },

  // Comparison Grid (Flashcard 9)
  comparisonGrid: {
    gap: 20,
    marginBottom: 30,
  },
  comparisonCard: {
    backgroundColor: 'white',
    borderWidth: 3,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 28,
  },
  comparisonCardFSP: {
    borderColor: '#8b5cf6',
  },
  comparisonCardKP: {
    borderColor: '#10b981',
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#f3f4f6',
  },
  comparisonIcon: {
    fontSize: 32,
  },
  comparisonName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  comparisonFullName: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  comparisonDetails: {
    gap: 16,
  },
  comparisonDetailItem: {
    gap: 6,
  },
  comparisonDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  comparisonDetailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 22,
  },
  comparisonDetailValueFSP: {
    color: '#7c3aed',
  },
  comparisonDetailValueKP: {
    color: '#059669',
  },
  comparisonFocusBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 14,
    marginTop: 16,
    gap: 6,
  },
  comparisonFocusTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  comparisonFocusItem: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 21,
  },
  comparisonFocusItemFSP: {
    color: '#6b21a8',
  },
  comparisonFocusItemKP: {
    color: '#047857',
  },

  // Troubleshooting (Flashcard 10)
  troubleshootingContainer: {
    marginBottom: 30,
  },
  troubleshootingProblemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  troubleshootingProblemsHeaderIcon: {
    fontSize: 16,
  },
  troubleshootingProblemsHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  troubleshootingGrid: {
    gap: 14,
  },
  troubleshootingItemBox: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 20,
  },
  troubleshootingItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 10,
  },
  troubleshootingProblemIconBox: {
    width: 40,
    height: 40,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  troubleshootingItemIconText: {
    fontSize: 20,
  },
  troubleshootingProblem: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#991b1b',
    lineHeight: 21,
  },
  troubleshootingSolution: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
    paddingLeft: 54,
  },

  // Best Practices (Flashcard 10)
  bestPracticesContainer: {
    marginBottom: 30,
  },
  bestPracticesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  bestPracticesHeaderIcon: {
    fontSize: 16,
  },
  bestPracticesHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  bestPracticesGrid: {
    gap: 12,
  },
  bestPracticeItem: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bestPracticeIcon: {
    fontSize: 22,
  },
  bestPracticeText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },

  // Success Box (Flashcard 10)
  successBox: {
    backgroundColor: '#a7f3d0',
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 12,
    padding: 28,
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#065f46',
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    fontSize: 15,
    color: '#047857',
    lineHeight: 25,
    textAlign: 'center',
  },

  // Navigation Controls
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e0e7ff',
  },
  navIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  navIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e0e7ff',
  },
  navIndicatorActive: {
    backgroundColor: '#6366f1',
    width: 24,
  },
});

export default FlashcardCarousel;
