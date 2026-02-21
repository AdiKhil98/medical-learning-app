import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, Platform, Linking } from 'react-native';

const STORAGE_KEY = 'transition_banner_closed';

export default function TransitionBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
      const closed = sessionStorage.getItem(STORAGE_KEY);
      if (!closed) {
        setVisible(true);
      }
    } else {
      // On native, always show (no sessionStorage equivalent)
      setVisible(true);
    }
  }, []);

  const handleClose = () => {
    setVisible(false);
    if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, '1');
    }
  };

  const handleNavigate = () => {
    const url = 'https://medmeister.eu';
    if (Platform.OS === 'web') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(url);
    }
  };

  if (!visible) return null;

  return (
    <View
      style={{
        backgroundColor: '#E53E3E',
        paddingVertical: 12,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 14,
            fontFamily: 'Inter-SemiBold',
            textAlign: 'center',
          }}
        >
          ⚠️ Wichtige Mitteilung: Ab dem 01.03.2026 wird diese Website eingestellt. Bitte wechseln Sie jetzt zu unserer
          neuen Plattform!
        </Text>
        <Pressable
          onPress={handleNavigate}
          style={{
            backgroundColor: '#FFFFFF',
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              color: '#E53E3E',
              fontSize: 14,
              fontFamily: 'Inter-Bold',
            }}
          >
            Zur neuen Website →
          </Text>
        </Pressable>
      </View>
      <Pressable
        onPress={handleClose}
        style={{
          marginLeft: 12,
          padding: 4,
        }}
        accessibilityLabel="Banner schließen"
        accessibilityRole="button"
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 20,
            fontWeight: 'bold',
            lineHeight: 20,
          }}
        >
          ✕
        </Text>
      </Pressable>
    </View>
  );
}
