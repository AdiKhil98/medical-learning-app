import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Wand2, Sparkles, RefreshCw } from 'lucide-react-native';

interface MedicalSection {
  type: string;
  title: string;
  content: string;
  icon: string;
  order: number;
}

const MedicalContentTransformer: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformedCount, setTransformedCount] = useState(0);

  const detectMedicalSections = (text: string): MedicalSection[] => {
    if (!text) return [];
    
    const sections: MedicalSection[] = [];
    
    // Split content by paragraphs and analyze
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 10);
    
    const sectionPatterns = [
      {
        keywords: ['definition', 'klassifikation', 'begriff', 'ist eine', 'wird definiert'],
        type: 'definition',
        title: 'Definition und Klassifikation',
        icon: '📋'
      },
      {
        keywords: ['epidemiologie', 'häufigkeit', 'verteilung', 'prävalenz', 'inzidenz', 'prozent', 'beträgt'],
        type: 'epidemiology', 
        title: 'Epidemiologie',
        icon: '📊'
      },
      {
        keywords: ['ätiologie', 'ursache', 'pathophysiologie', 'entstehung', 'verursacht'],
        type: 'etiology',
        title: 'Ätiologie und Pathophysiologie', 
        icon: '🔬'
      },
      {
        keywords: ['symptom', 'klinik', 'beschwerden', 'zeichen', 'manifestiert'],
        type: 'symptoms',
        title: 'Klinische Symptomatik',
        icon: '🩺' 
      },
      {
        keywords: ['diagnostik', 'untersuchung', 'befund', 'labor', 'diagnose'],
        type: 'diagnosis',
        title: 'Diagnostik',
        icon: '🔍'
      },
      {
        keywords: ['therapie', 'behandlung', 'medikament', 'intervention'],
        type: 'therapy',
        title: 'Therapie',
        icon: '💊'
      },
      {
        keywords: ['prognose', 'verlauf', 'heilung', 'outcome'],
        type: 'prognosis',
        title: 'Prognose und Verlauf', 
        icon: '📈'
      },
      {
        keywords: ['alarm', 'notfall', 'komplikation', 'kritisch', 'lebensbedrohlich'],
        type: 'emergency',
        title: 'Alarmsymptome',
        icon: '🚨'
      }
    ];
    
    paragraphs.forEach((paragraph, index) => {
      const lowerText = paragraph.toLowerCase();
      let matchedSection = null;
      
      // Try to match with section patterns
      for (const pattern of sectionPatterns) {
        if (pattern.keywords.some(keyword => lowerText.includes(keyword))) {
          matchedSection = pattern;
          break;
        }
      }
      
      // If no match, create a general section
      if (!matchedSection) {
        matchedSection = {
          type: 'general',
          title: `Abschnitt ${sections.length + 1}`,
          icon: '📄'
        };
      }
      
      sections.push({
        ...matchedSection,
        content: paragraph.trim(),
        order: index
      });
    });
    
    return sections;
  };

  const enhanceTextWithMedicalFormatting = (text: string): string => {
    let enhanced = text;
    
    // Enhance numbers with badges
    enhanced = enhanced.replace(/(\d+[.,]?\d*)\s*(%|prozent|mg\/dl|mmol\/l|ms|stunden|tage|jahre)/gi, 
      '<span class="number">$1$2</span>');
    
    // Enhance medical terms
    const medicalTerms = [
      'AV-Block', 'ICD-10', 'KDIGO', 'QRS-Komplex', 'PQ-Zeit', 'EKG', 'Mobitz', 'Wenckebach',
      'Schrittmacher', 'Bradykardie', 'Asystolie', 'Herzrhythmus', 'Vorhof', 'Ventrikel',
      'Myokard', 'Koronar', 'Stenose', 'Infarkt', 'Ischämie', 'Hypertonie', 'Hypotonie'
    ];
    
    medicalTerms.forEach(term => {
      const regex = new RegExp(`\\b(${term})\\b`, 'gi');
      enhanced = enhanced.replace(regex, '<span class="medical-term">$1</span>');
    });
    
    // Enhance classifications
    enhanced = enhanced.replace(/(ICD-10\s+unter\s+[A-Z]\d+[.\d]*)/gi,
      '<span class="classification">$1</span>');
      
    // Enhance critical terms
    const criticalTerms = ['lebensbedrohlich', 'kritisch', 'sofort', 'umgehend', 'notfall'];
    criticalTerms.forEach(term => {
      const regex = new RegExp(`\\b(${term}\\w*)\\b`, 'gi');
      enhanced = enhanced.replace(regex, '<span class="critical">$1</span>');
    });
    
    return enhanced;
  };

  const generateEnhancedHTML = (title: string, sections: MedicalSection[]): string => {
    const sectionCards = sections.map(section => `
      <div class="section-card">
        <h2 class="section-title">
          <span class="section-icon">${section.icon}</span>
          ${section.title}
        </h2>
        <div class="content-text">
          <p>${enhanceTextWithMedicalFormatting(section.content)}</p>
        </div>
      </div>
    `).join('\n');
    
    return `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - KP Med</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #E2827F 0%, #B87E70 50%, #B15740 100%);
            color: #2c3e50;
            line-height: 1.6;
        }
        
        .content-wrapper {
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .content-header {
            background: linear-gradient(135deg, #E2827F 0%, #B87E70 100%);
            color: white;
            padding: 40px;
            border-radius: 20px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(226, 130, 127, 0.3);
        }
        
        .content-header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .content-header .subtitle {
            font-size: 1.1rem;
            opacity: 0.95;
        }
        
        .section-card {
            background: white;
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 25px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            border-left: 5px solid #66BB6A;
            transition: all 0.3s ease;
        }
        
        .section-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        
        .section-title {
            font-size: 1.5rem;
            color: #2c3e50;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e8f5e9;
        }
        
        .section-icon {
            font-size: 1.8rem;
        }
        
        .content-text {
            color: #4a5568;
            line-height: 1.8;
        }
        
        .content-text p {
            margin-bottom: 18px;
            text-align: justify;
        }
        
        /* Highlighting styles */
        .number {
            background: #E2827F;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.9em;
            display: inline-block;
            margin: 0 2px;
        }
        
        .medical-term {
            color: #9C27B0;
            font-weight: 600;
            border-bottom: 2px dotted #9C27B0;
            cursor: help;
        }
        
        .classification {
            background: linear-gradient(45deg, #4834d4, #686de0);
            color: white;
            padding: 3px 10px;
            border-radius: 15px;
            font-weight: 600;
            display: inline-block;
        }
        
        .critical {
            background: #f44336;
            color: white;
            padding: 4px 10px;
            border-radius: 8px;
            font-weight: bold;
            display: inline-block;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
        }
        
        @media (max-width: 768px) {
            .content-wrapper { padding: 10px; }
            .content-header { padding: 25px; }
            .section-card { padding: 20px; }
            .content-header h1 { font-size: 1.8rem; }
        }
    </style>
</head>
<body>
    <div class="content-wrapper">
        <!-- Header -->
        <div class="content-header">
            <h1>
                <span>🏥</span>
                ${title}
            </h1>
            <p class="subtitle">Vollständiger medizinischer Leitfaden für Kenntnissprüfung und Fachsprachprüfung</p>
        </div>
        
        ${sectionCards}
    </div>
</body>
</html>`;
  };

  const transformAllContent = async () => {
    if (!user) {
      Alert.alert('Fehler', 'Sie müssen angemeldet sein, um Inhalte zu transformieren.');
      return;
    }

    Alert.alert(
      'Inhalte transformieren',
      'Sollen alle medizinischen Inhalte in das erweiterte Format umgewandelt werden?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Transformieren',
          onPress: async () => {
            setIsTransforming(true);
            setTransformedCount(0);
            
            try {
              // Fetch all sections with content
              const { data: sections, error: fetchError } = await supabase
                .from('sections')
                .select('id, slug, title, content_details, content_improved, content_html')
                .not('content_details', 'is', null);
              
              if (fetchError) throw fetchError;
              
              if (!sections || sections.length === 0) {
                Alert.alert('Info', 'Keine Inhalte zum Transformieren gefunden.');
                return;
              }
              
              let count = 0;
              
              for (const section of sections) {
                // Skip if already has enhanced content
                if (section.content_html && section.content_html.includes('section-card')) {
                  continue;
                }
                
                const contentToTransform = section.content_details || '';
                if (contentToTransform.length < 20) continue;
                
                // Detect and structure medical sections
                const medicalSections = detectMedicalSections(contentToTransform);
                
                // Generate enhanced HTML
                const enhancedHTML = generateEnhancedHTML(section.title, medicalSections);
                
                // Create structured JSON
                const enhancedJSON = medicalSections.map((sec, index) => ({
                  type: sec.type,
                  title: sec.title,
                  content: sec.content,
                  order: index
                }));
                
                // Update the section
                const { error: updateError } = await supabase
                  .from('sections')
                  .update({
                    content_html: enhancedHTML,
                    content_improved: enhancedJSON
                  })
                  .eq('id', section.id);
                
                if (!updateError) {
                  count++;
                  setTransformedCount(count);
                }
                
                // Small delay to avoid overwhelming the database
                await new Promise(resolve => setTimeout(resolve, 100));
              }
              
              Alert.alert(
                'Transformation abgeschlossen',
                `${count} medizinische Inhalte wurden erfolgreich in das erweiterte Format umgewandelt.`,
                [{ text: 'OK' }]
              );
              
            } catch (error) {
              logger.error('Transformation error:', error);
              Alert.alert('Fehler', 'Ein Fehler ist bei der Transformation aufgetreten.');
            } finally {
              setIsTransforming(false);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Sparkles size={32} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>
          Medical Content Transformer
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Transform all medical content into enhanced format
        </Text>
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.infoTitle, { color: colors.text }]}>
          Was wird transformiert?
        </Text>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          • Automatische Erkennung von medizinischen Abschnitten{'\n'}
          • Hervorhebung von medizinischen Begriffen{'\n'}
          • Zahlen-Badges für Werte und Prozentangaben{'\n'}
          • Strukturierte HTML-Formatierung{'\n'}
          • Interaktive Navigationselemente{'\n'}
          • Responsive Design für alle Geräte
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.transformButton, { backgroundColor: colors.primary }]}
        onPress={transformAllContent}
        disabled={isTransforming}
      >
        {isTransforming ? (
          <RefreshCw size={24} color="white" />
        ) : (
          <Wand2 size={24} color="white" />
        )}
        <Text style={styles.transformButtonText}>
          {isTransforming 
            ? `Transformiere... (${transformedCount})` 
            : 'Alle Inhalte transformieren'
          }
        </Text>
      </TouchableOpacity>

      {isTransforming && (
        <View style={[styles.progressCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.progressText, { color: colors.text }]}>
            Transformiert: {transformedCount} Abschnitte
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  infoCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  transformButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  transformButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginLeft: 8,
  },
  progressCard: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
});

export default MedicalContentTransformer;