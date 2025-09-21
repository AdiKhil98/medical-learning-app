import React, { createContext, useState, useEffect, useContext, ReactNode, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, ActionSheetIOS, Alert } from 'react-native';

type Theme = 'light' | 'dark';
type FontSize = 'small' | 'medium' | 'large';

interface ThemeContextType {
  theme: Theme;
  isDarkMode: boolean;
  toggleTheme: () => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  fontScale: (baseSize: number) => number;
  showFontSizeSelector: () => void;
  colors: {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    text: string;
    textSecondary: string;
    border: string;
    card: string;
    error: string;
    success: string;
    warning: string;
  };
}

const lightColors = {
  background: '#FFFFFF',  // Pure white to match homepage
  surface: '#FFFFFF',
  primary: '#E2827F',     // Burning Sand - main brand color
  secondary: '#B87E70',   // Old Rose - dark accent
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  card: '#F9F6F2',        // Light beige/cream for cards to match homepage
  error: '#B15740',       // Brown Rust for errors
  success: '#22C55E',
  warning: '#E5877E',     // Tonys Pink for warnings/highlights
};

const darkColors = {
  background: '#111827',
  surface: '#1F2937',
  primary: '#E5877E',     // Tonys Pink - lighter for dark mode
  secondary: '#B87E70',   // Old Rose - consistent across themes
  text: '#F8F3E8', // White Linen background
  textSecondary: '#D1D5DB',
  border: '#374151',
  card: '#1F2937',
  error: '#E2827F',       // Burning Sand for dark mode errors
  success: '#34D399',
  warning: '#E5877E',     // Tonys Pink for warnings
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'app_theme';
const FONT_SIZE_STORAGE_KEY = 'app_font_size';

// Font scale multipliers
const FONT_SCALE_MAP: Record<FontSize, number> = {
  small: 0.85,
  medium: 1.0,
  large: 1.15,
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [fontSize, setFontSizeState] = useState<FontSize>('medium');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [savedTheme, savedFontSize] = await Promise.all([
        AsyncStorage.getItem(THEME_STORAGE_KEY),
        AsyncStorage.getItem(FONT_SIZE_STORAGE_KEY),
      ]);
      
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
      }
      
      if (savedFontSize === 'small' || savedFontSize === 'medium' || savedFontSize === 'large') {
        setFontSizeState(savedFontSize);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = useCallback(async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }, [theme]);

  const setFontSize = useCallback(async (size: FontSize) => {
    setFontSizeState(size);
    try {
      await AsyncStorage.setItem(FONT_SIZE_STORAGE_KEY, size);
    } catch (error) {
      console.error('Error saving font size:', error);
    }
  }, []);

  const fontScale = useCallback((baseSize: number): number => {
    return Math.round(baseSize * FONT_SCALE_MAP[fontSize]);
  }, [fontSize]);

  const showFontSizeSelector = useCallback(() => {
    const options = [
      { text: 'Klein', value: 'small' as FontSize },
      { text: 'Mittel', value: 'medium' as FontSize },
      { text: 'Groß', value: 'large' as FontSize },
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Abbrechen', ...options.map(o => o.text)],
          cancelButtonIndex: 0,
          title: 'Schriftgröße wählen',
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            const selectedOption = options[buttonIndex - 1];
            setFontSize(selectedOption.value);
          }
        }
      );
    } else {
      // For Android, cycle through options
      const currentIndex = options.findIndex(o => o.value === fontSize);
      const nextIndex = (currentIndex + 1) % options.length;
      setFontSize(options[nextIndex].value);
    }
  }, [fontSize, setFontSize]);

  const colors = useMemo(() => theme === 'light' ? lightColors : darkColors, [theme]);
  const isDarkMode = useMemo(() => theme === 'dark', [theme]);

  const contextValue = useMemo(() => ({
    theme,
    isDarkMode,
    toggleTheme,
    fontSize,
    setFontSize,
    fontScale,
    showFontSizeSelector,
    colors
  }), [theme, isDarkMode, toggleTheme, fontSize, setFontSize, fontScale, showFontSizeSelector, colors]);

  if (isLoading) {
    return null; // or a loading spinner
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}