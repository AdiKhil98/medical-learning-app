'use client';

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { usePathname } from 'expo-router';
import { logger } from '@/utils/logger';

// Type declaration for Voiceflow
declare global {
  interface Window {
    voiceflow?: {
      chat: {
        load: (config: any) => void;
        open: () => void;
        close: () => void;
        hide: () => void;
        show: () => void;
        destroy?: () => void;
      };
    };
    voiceflowSupportLoaded?: boolean;
  }
}

interface VoiceflowSupportWidgetProps {
  projectID?: string;
}

/**
 * Voiceflow Support Chat Widget
 *
 * This is a standalone support chat widget for the dashboard ONLY.
 * It hides itself when on simulation pages.
 * Only loads on web platform.
 */
export default function VoiceflowSupportWidget({
  projectID = '695939f1f022b12146822729',
}: VoiceflowSupportWidgetProps) {
  const scriptIdRef = useRef('voiceflow-support-widget-script');
  const pathname = usePathname();

  // Check if we're on a simulation page
  const isSimulationPage = pathname?.includes('/simulation/kp') || pathname?.includes('/simulation/fsp');

  useEffect(() => {
    // Only load on web
    if (Platform.OS !== 'web') {
      return;
    }

    // If on simulation page, hide the widget and don't load
    if (isSimulationPage) {
      logger.info('Support widget: On simulation page, hiding widget');
      if (window.voiceflow?.chat?.hide) {
        window.voiceflow.chat.hide();
      }
      // Also hide the widget container directly
      const widgetElements = document.querySelectorAll(
        '#voiceflow-chat, [class*="vfrc-widget"], [class*="vfrc-launcher"]'
      );
      widgetElements.forEach((el) => {
        (el as HTMLElement).style.display = 'none';
      });
      return;
    }

    // Not on simulation page - show the widget
    logger.info('Support widget: Not on simulation page, showing widget');

    // If widget already loaded, just show it
    if (window.voiceflowSupportLoaded && window.voiceflow?.chat?.show) {
      window.voiceflow.chat.show();
      // Also show the widget container
      const widgetElements = document.querySelectorAll(
        '#voiceflow-chat, [class*="vfrc-widget"], [class*="vfrc-launcher"]'
      );
      widgetElements.forEach((el) => {
        (el as HTMLElement).style.display = '';
      });
      return;
    }

    // Check if script already exists
    if (document.getElementById(scriptIdRef.current)) {
      logger.info('Voiceflow support widget script already loaded');
      return;
    }

    // Defer loading to avoid blocking LCP - load after page is idle
    const loadWidget = () => {
      logger.info('Loading Voiceflow support widget...');

      const script = document.createElement('script');
      script.id = scriptIdRef.current;
      script.type = 'text/javascript';
      script.src = 'https://cdn.voiceflow.com/widget-next/bundle.mjs';
      script.async = true;

      script.onload = () => {
        if (window.voiceflow) {
          window.voiceflow.chat.load({
            verify: { projectID },
            url: 'https://general-runtime.voiceflow.com',
            versionID: 'production',
            voice: {
              url: 'https://runtime-api.voiceflow.com',
            },
          });
          window.voiceflowSupportLoaded = true;
          logger.info('Voiceflow support widget loaded successfully');
        }
      };

      script.onerror = (error) => {
        logger.error('Failed to load Voiceflow support widget script:', error);
      };

      document.body.appendChild(script);
    };

    // Use requestIdleCallback to defer loading, fallback to setTimeout
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(loadWidget, { timeout: 3000 });
    } else {
      setTimeout(loadWidget, 2000);
    }
  }, [projectID, isSimulationPage, pathname]);

  // This component doesn't render anything - the widget is injected into the DOM
  return null;
}
