'use client';

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
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
  }
}

interface VoiceflowSupportWidgetProps {
  projectID?: string;
}

/**
 * Voiceflow Support Chat Widget
 *
 * This is a standalone support chat widget for the dashboard.
 * It uses a different project ID than the simulation widgets.
 * Only loads on web platform.
 */
export default function VoiceflowSupportWidget({
  projectID = '695939f1f022b12146822729',
}: VoiceflowSupportWidgetProps) {
  const isLoadedRef = useRef(false);
  const scriptIdRef = useRef('voiceflow-support-widget-script');

  useEffect(() => {
    // Only load on web
    if (Platform.OS !== 'web') {
      return;
    }

    // Check if script already exists
    if (document.getElementById(scriptIdRef.current)) {
      logger.info('Voiceflow support widget script already loaded');
      return;
    }

    // Don't load if already loaded
    if (isLoadedRef.current) {
      return;
    }

    logger.info('Loading Voiceflow support widget...');

    const script = document.createElement('script');
    script.id = scriptIdRef.current;
    script.type = 'text/javascript';
    script.src = 'https://cdn.voiceflow.com/widget-next/bundle.mjs';

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
        isLoadedRef.current = true;
        logger.info('Voiceflow support widget loaded successfully');
      }
    };

    script.onerror = (error) => {
      logger.error('Failed to load Voiceflow support widget script:', error);
    };

    document.body.appendChild(script);

    // Cleanup on unmount
    return () => {
      const existingScript = document.getElementById(scriptIdRef.current);
      if (existingScript) {
        existingScript.remove();
      }

      // Clean up Voiceflow widget
      if (window.voiceflow?.chat?.destroy) {
        try {
          window.voiceflow.chat.destroy();
        } catch (e) {
          logger.warn('Error destroying Voiceflow widget:', e);
        }
      }

      isLoadedRef.current = false;
    };
  }, [projectID]);

  // This component doesn't render anything - the widget is injected into the DOM
  return null;
}
