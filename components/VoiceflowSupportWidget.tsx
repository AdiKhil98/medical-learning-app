'use client';

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { logger } from '@/utils/logger';
import { disableVoiceflowCleanup, stopGlobalVoiceflowCleanup } from '@/utils/globalVoiceflowCleanup';

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

    // CRITICAL: Disable cleanup so the widget doesn't get removed
    disableVoiceflowCleanup();
    stopGlobalVoiceflowCleanup();
    logger.info('Support widget: Disabled Voiceflow cleanup');

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

    // Cleanup on unmount - but DON'T re-enable cleanup since we want the widget persistent
    return () => {
      // We intentionally don't clean up or re-enable cleanup here
      // because the widget should persist across the dashboard
      logger.info('Support widget: Component unmounting (widget persists)');
    };
  }, [projectID]);

  // This component doesn't render anything - the widget is injected into the DOM
  return null;
}
