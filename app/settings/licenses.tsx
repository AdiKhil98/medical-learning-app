import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronDown, Package, ExternalLink } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import Card from '@/components/ui/Card';
import { LinearGradient } from 'expo-linear-gradient';

interface Dependency {
  name: string;
  version: string;
  license: string;
  description?: string;
  homepage?: string;
  repository?: string;
}

// Common license texts
const LICENSE_TEXTS: Record<string, string> = {
  'MIT': `MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`,

  'Apache-2.0': `Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

1. Definitions.

"License" shall mean the terms and conditions for use, reproduction, and distribution as defined by Sections 1 through 9 of this document.

"Licensor" shall mean the copyright owner or entity granting the License.

"Legal Entity" shall mean the union of the acting entity and all other entities that control, are controlled by, or are under common control with that entity.

"You" (or "Your") shall mean an individual or Legal Entity exercising permissions granted by this License.

"Source" form shall mean the preferred form for making modifications, including but not limited to software source code, documentation source, and configuration files.

"Object" form shall mean any form resulting from mechanical transformation or translation of a Source form, including but not limited to compiled object code, generated documentation, and conversions to other media types.

"Work" shall mean the work of authorship, whether in Source or Object form, made available under the License, as indicated by a copyright notice that is included in or attached to the work.

"Derivative Works" shall mean any work, whether in Source or Object form, that is based upon (or derived from) the Work and for which the editorial revisions, annotations, elaborations, or other modifications represent, as a whole, an original work of authorship.

"Contribution" shall mean any work of authorship, including the original version of the Work and any modifications or additions to that Work or Derivative Works thereof, that is intentionally submitted to Licensor for inclusion in the Work by the copyright owner or by an individual or Legal Entity authorized to submit on behalf of the copyright owner.

2. Grant of Copyright License. Subject to the terms and conditions of this License, each Contributor hereby grants to You a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable copyright license to use, reproduce, modify, display, perform, sublicense, and distribute the Work and such Derivative Works in any medium or format.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.`,

  'BSD-3-Clause': `BSD 3-Clause License

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`,

  'ISC': `ISC License

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`,

  'GPL-3.0': `GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007

Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>
Everyone is permitted to copy and distribute verbatim copies of this license document, but changing it is not allowed.

Preamble

The GNU General Public License is a free, copyleft license for software and other kinds of works.

The licenses for most software and other practical works are designed to take away your freedom to share and change the works. By contrast, the GNU General Public License is intended to guarantee your freedom to share and change all versions of a program--to make sure it remains free software for all its users.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.`,
};

export default function LicensesScreen() {
  const { colors, isDarkMode, fontScale } = useTheme();
  const router = useRouter();
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDep, setExpandedDep] = useState<string | null>(null);
  const [animatedValues] = useState(() => new Map<string, Animated.Value>());

  useEffect(() => {
    loadDependencies();
  }, []);

  const loadDependencies = async () => {
    try {
      setLoading(true);
      
      // Simulate loading dependencies from package.json
      // In a real implementation, you would read from package.json or use a library
      const mockDependencies: Dependency[] = [
        {
          name: 'react',
          version: '18.2.0',
          license: 'MIT',
          description: 'A JavaScript library for building user interfaces',
          homepage: 'https://reactjs.org/',
        },
        {
          name: 'expo',
          version: '~52.0.1',
          license: 'MIT',
          description: 'A platform for universal React applications',
          homepage: 'https://expo.dev/',
        },
        {
          name: 'expo-router',
          version: '3.4.6',
          license: 'MIT',
          description: 'File-based router for universal React Native apps',
          homepage: 'https://expo.github.io/router/',
        },
        {
          name: '@supabase/supabase-js',
          version: '^2.38.4',
          license: 'MIT',
          description: 'Supabase client library',
          homepage: 'https://supabase.com/',
        },
        {
          name: 'lucide-react-native',
          version: '^0.292.0',
          license: 'ISC',
          description: 'Beautiful & consistent icon toolkit made by the community',
          homepage: 'https://lucide.dev/',
        },
        {
          name: 'react-native-reanimated',
          version: '~3.6.1',
          license: 'Apache-2.0',
          description: 'React Native\'s Animated library reimplemented',
          homepage: 'https://docs.swmansion.com/react-native-reanimated/',
        },
        {
          name: 'expo-linear-gradient',
          version: '~12.7.1',
          license: 'MIT',
          description: 'Linear gradient component for React Native',
          homepage: 'https://docs.expo.dev/versions/latest/sdk/linear-gradient/',
        },
        {
          name: 'react-native-gesture-handler',
          version: '~2.14.0',
          license: 'MIT',
          description: 'Declarative API exposing platform native touch and gesture system',
          homepage: 'https://docs.swmansion.com/react-native-gesture-handler/',
        },
        {
          name: '@expo-google-fonts/inter',
          version: '^0.2.3',
          license: 'MIT',
          description: 'Inter font family for Expo',
          homepage: 'https://github.com/expo/google-fonts',
        },
        {
          name: 'react-native-safe-area-context',
          version: '4.8.2',
          license: 'MIT',
          description: 'A flexible way to handle safe area insets in React Native',
          homepage: 'https://github.com/th3rdwave/react-native-safe-area-context',
        },
        {
          name: 'expo-status-bar',
          version: '~1.11.1',
          license: 'MIT',
          description: 'Provides the same interface as the React Native StatusBar API',
          homepage: 'https://docs.expo.dev/versions/latest/sdk/status-bar/',
        },
        {
          name: 'react-native-webview',
          version: '13.6.4',
          license: 'MIT',
          description: 'React Native WebView component for iOS, Android, macOS, and Windows',
          homepage: 'https://github.com/react-native-webview/react-native-webview',
        },
        {
          name: 'lottie-react-native',
          version: '^6.4.1',
          license: 'Apache-2.0',
          description: 'Render After Effects animations natively on React Native',
          homepage: 'https://github.com/lottie-react-native/lottie-react-native',
        },
        {
          name: 'date-fns',
          version: '^4.1.0',
          license: 'MIT',
          description: 'Modern JavaScript date utility library',
          homepage: 'https://date-fns.org/',
        },
        {
          name: '@react-native-async-storage/async-storage',
          version: '^1.23.1',
          license: 'MIT',
          description: 'An asynchronous, persistent, key-value storage system for React Native',
          homepage: 'https://react-native-async-storage.github.io/async-storage/',
        },
      ];

      // Sort dependencies alphabetically
      const sortedDeps = mockDependencies.sort((a, b) => a.name.localeCompare(b.name));
      
      // Initialize animated values for each dependency
      sortedDeps.forEach(dep => {
        if (!animatedValues.has(dep.name)) {
          animatedValues.set(dep.name, new Animated.Value(0));
        }
      });

      setDependencies(sortedDeps);
    } catch (error) {
      logger.error('Error loading dependencies:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDependency = (depName: string) => {
    const isExpanding = expandedDep !== depName;
    
    // Collapse currently expanded dependency
    if (expandedDep && expandedDep !== depName) {
      const currentAnimValue = animatedValues.get(expandedDep);
      if (currentAnimValue) {
        Animated.timing(currentAnimValue, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }
    }

    // Toggle the selected dependency
    const animValue = animatedValues.get(depName);
    if (!animValue) return;

    if (isExpanding) {
      setExpandedDep(depName);
      Animated.timing(animValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(animValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        setExpandedDep(null);
      });
    }
  };

  const getLicenseText = (license: string): string => {
    return LICENSE_TEXTS[license] || `${license} License\n\nFull license text not available. Please visit the package homepage for more information.`;
  };

  const getLicenseColor = (license: string): string => {
    switch (license) {
      case 'MIT': return '#22C55E';
      case 'Apache-2.0': return '#EF4444';
      case 'BSD-3-Clause': return '#E2827F';
      case 'ISC': return '#E2827F';
      case 'GPL-3.0': return '#F59E0B';
      default: return colors.textSecondary;
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
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)',
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      marginRight: 16,
    },
    backText: {
      fontFamily: 'Inter-Medium',
      fontSize: fontScale(16),
      color: colors.primary,
      marginLeft: 4,
    },
    title: {
      fontFamily: 'Inter-Bold',
      fontSize: fontScale(20),
      color: colors.text,
      flex: 1,
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
      marginBottom: 24,
      lineHeight: fontScale(24),
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    loadingText: {
      fontFamily: 'Inter-Regular',
      fontSize: fontScale(16),
      color: colors.textSecondary,
      marginTop: 16,
    },
    statsContainer: {
      flexDirection: 'row',
      marginBottom: 24,
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0.3 : 0.05,
      shadowRadius: 8,
      elevation: 3,
    },
    statNumber: {
      fontFamily: 'Inter-Bold',
      fontSize: fontScale(24),
      color: colors.primary,
      marginBottom: 4,
    },
    statLabel: {
      fontFamily: 'Inter-Regular',
      fontSize: fontScale(12),
      color: colors.textSecondary,
      textAlign: 'center',
    },
    dependencyCard: {
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
    dependencyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    packageIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${colors.primary}20`,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    dependencyInfo: {
      flex: 1,
    },
    dependencyName: {
      fontFamily: 'Inter-Bold',
      fontSize: fontScale(16),
      color: colors.text,
      marginBottom: 2,
    },
    dependencyVersion: {
      fontFamily: 'Inter-Regular',
      fontSize: fontScale(14),
      color: colors.textSecondary,
    },
    licenseTag: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: 12,
    },
    licenseText: {
      fontFamily: 'Inter-Medium',
      fontSize: fontScale(12),
      color: '#FFFFFF',
    },
    chevronContainer: {
      padding: 4,
    },
    dependencyContent: {
      padding: 20,
      paddingTop: 0,
    },
    description: {
      fontFamily: 'Inter-Regular',
      fontSize: fontScale(14),
      color: colors.text,
      marginBottom: 16,
      lineHeight: fontScale(20),
    },
    licenseContent: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 16,
      marginBottom: 12,
    },
    licenseTitle: {
      fontFamily: 'Inter-Bold',
      fontSize: fontScale(14),
      color: colors.text,
      marginBottom: 8,
    },
    licenseFullText: {
      fontFamily: 'Inter-Regular',
      fontSize: fontScale(12),
      color: colors.textSecondary,
      lineHeight: fontScale(18),
      maxHeight: 200,
    },
    homepageLink: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    homepageLinkText: {
      fontFamily: 'Inter-Medium',
      fontSize: fontScale(14),
      color: colors.primary,
      flex: 1,
      marginRight: 8,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={dynamicStyles.container}>
        <LinearGradient
          colors={gradientColors}
          style={styles.gradientBackground}
        />
        
        <View style={dynamicStyles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={dynamicStyles.backButton}
          >
            <ChevronLeft size={24} color={colors.primary} />
            <Text style={dynamicStyles.backText}>Zurück</Text>
          </TouchableOpacity>
          <Text style={dynamicStyles.title}>Lizenzen</Text>
        </View>

        <View style={dynamicStyles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={dynamicStyles.loadingText}>Lade Abhängigkeiten...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const licenseTypes = [...new Set(dependencies.map(dep => dep.license))];

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
        <Text style={dynamicStyles.title}>Lizenzen</Text>
      </View>

      <ScrollView 
        style={dynamicStyles.content} 
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Text style={dynamicStyles.pageTitle}>Open Source Lizenzen</Text>
        <Text style={dynamicStyles.subtitle}>
          Diese App verwendet verschiedene Open-Source-Bibliotheken. Hier finden Sie eine vollständige Liste aller Abhängigkeiten und deren Lizenzen.
        </Text>

        {/* Statistics */}
        <View style={dynamicStyles.statsContainer}>
          <Card style={dynamicStyles.statCard}>
            <Text style={dynamicStyles.statNumber}>{dependencies.length}</Text>
            <Text style={dynamicStyles.statLabel}>Abhängigkeiten</Text>
          </Card>
          <Card style={dynamicStyles.statCard}>
            <Text style={dynamicStyles.statNumber}>{licenseTypes.length}</Text>
            <Text style={dynamicStyles.statLabel}>Lizenztypen</Text>
          </Card>
        </View>

        {/* Dependencies List */}
        {dependencies.map((dep) => {
          const isExpanded = expandedDep === dep.name;
          const animValue = animatedValues.get(dep.name);
          
          const animatedHeight = animValue?.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 400], // Adjust based on content
          });
          
          const rotateInterpolate = animValue?.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '180deg'],
          });

          return (
            <Card key={dep.name} style={dynamicStyles.dependencyCard}>
              <TouchableOpacity
                style={dynamicStyles.dependencyHeader}
                onPress={() => toggleDependency(dep.name)}
                activeOpacity={0.7}
              >
                <View style={dynamicStyles.packageIconContainer}>
                  <Package size={20} color={colors.primary} />
                </View>
                <View style={dynamicStyles.dependencyInfo}>
                  <Text style={dynamicStyles.dependencyName}>{dep.name}</Text>
                  <Text style={dynamicStyles.dependencyVersion}>v{dep.version}</Text>
                </View>
                <View style={[
                  dynamicStyles.licenseTag,
                  { backgroundColor: getLicenseColor(dep.license) }
                ]}>
                  <Text style={dynamicStyles.licenseText}>{dep.license}</Text>
                </View>
                <View style={dynamicStyles.chevronContainer}>
                  <Animated.View style={{ transform: [{ rotate: rotateInterpolate || '0deg' }] }}>
                    <ChevronDown size={20} color={colors.textSecondary} />
                  </Animated.View>
                </View>
              </TouchableOpacity>
              
              {isExpanded && animatedHeight && (
                <Animated.View style={[dynamicStyles.dependencyContent, { maxHeight: animatedHeight }]}>
                  {dep.description && (
                    <Text style={dynamicStyles.description}>{dep.description}</Text>
                  )}
                  
                  <View style={dynamicStyles.licenseContent}>
                    <Text style={dynamicStyles.licenseTitle}>{dep.license} Lizenz</Text>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                      <Text style={dynamicStyles.licenseFullText}>
                        {getLicenseText(dep.license)}
                      </Text>
                    </ScrollView>
                  </View>

                  {dep.homepage && (
                    <TouchableOpacity 
                      style={dynamicStyles.homepageLink}
                      onPress={() => {/* Open homepage */}}
                      activeOpacity={0.7}
                    >
                      <Text style={dynamicStyles.homepageLinkText}>
                        Projekt-Homepage besuchen
                      </Text>
                      <ExternalLink size={16} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </Animated.View>
              )}
            </Card>
          );
        })}

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