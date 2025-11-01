/**
 * Modern Voiceflow Widget Integration with Persistent ID Management
 *
 * This implementation ensures:
 * - Persistent user_id and session_id across page reloads
 * - Proper tracking through Patient and Examiner evaluation flows
 * - Separate IDs for KP and FSP simulations
 * - Modern Voiceflow widget configuration
 */

import { getPersistentIds, resetSimulation, logCurrentIds, SimulationType } from './persistentIdManager';

export interface VoiceflowConfig {
  projectID: string;
  versionID?: string;
  url?: string;
  simulationType: SimulationType;
  title?: string;
  imageUrl?: string;
}

export class VoiceflowController {
  private config: VoiceflowConfig;
  private isLoaded = false;
  private widget: any = null;
  private userId: string;
  private sessionId: string;

  constructor(config: VoiceflowConfig) {
    this.config = config;

    // Get or create persistent IDs immediately
    const persistentIds = getPersistentIds(config.simulationType);
    this.userId = persistentIds.user_id;
    this.sessionId = persistentIds.session_id;

    console.log(`🎮 VoiceflowController created for ${config.simulationType.toUpperCase()}:`, {
      user_id: this.userId,
      session_id: this.sessionId,
      projectID: config.projectID
    });
  }

  /**
   * Initialize Voiceflow widget with persistent IDs
   */
  async initialize(): Promise<boolean> {
    return this.loadWidget();
  }

  /**
   * Load Voiceflow script and initialize widget with modern configuration
   */
  async loadWidget(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        console.log('❌ Voiceflow: Window is undefined (not in browser)');
        resolve(false);
        return;
      }

      // Check if already loaded
      if (window.voiceflow && this.isLoaded) {
        console.log('✅ Voiceflow: Already loaded');
        resolve(true);
        return;
      }

      console.log(`📦 Voiceflow: Loading widget for ${this.config.simulationType.toUpperCase()}...`);
      logCurrentIds(this.config.simulationType);

      // Load script if not present
      if (!document.querySelector('script[src*="voiceflow.com"]')) {
        console.log('📡 Loading Voiceflow script from CDN...');
        const script = document.createElement('script');
        script.src = 'https://cdn.voiceflow.com/widget-next/bundle.mjs';
        script.type = 'text/javascript';

        script.onload = () => {
          console.log('✅ Voiceflow script loaded from CDN');
          this.initializeWidget()
            .then(() => {
              console.log('✅ Widget initialized successfully');
              resolve(true);
            })
            .catch((error) => {
              console.error('❌ Widget initialization failed:', error);
              reject(error);
            });
        };

        script.onerror = (error) => {
          console.error('❌ Failed to load Voiceflow script:', error);
          reject(new Error('Failed to load Voiceflow script'));
        };
        document.head.appendChild(script);
      } else {
        console.log('📦 Voiceflow script already present, initializing widget...');
        this.initializeWidget()
          .then(() => {
            console.log('✅ Widget initialized successfully');
            resolve(true);
          })
          .catch((error) => {
            console.error('❌ Widget initialization failed:', error);
            reject(error);
          });
      }
    });
  }

  /**
   * Initialize widget with modern Voiceflow configuration
   */
  private async initializeWidget(): Promise<void> {
    if (!window.voiceflow?.chat) {
      throw new Error('Voiceflow not available');
    }

    try {
      // Log IDs being sent to Voiceflow
      console.log('🔐 Initializing Voiceflow with persistent IDs:', {
        user_id: this.userId,
        session_id: this.sessionId,
        simulation: this.config.simulationType.toUpperCase()
      });

      // Modern Voiceflow configuration with persistent IDs
      const widgetConfig: any = {
        verify: {
          projectID: this.config.projectID
        },
        url: this.config.url || 'https://general-runtime.voiceflow.com',
        versionID: this.config.versionID || 'production',

        // User configuration with persistent IDs
        user: {
          id: this.userId,
          data: {
            session_id: this.sessionId
          }
        },

        // Assistant configuration for UI and persistence
        assistant: {
          persistence: 'localStorage', // Enable conversation persistence
          header: {
            title: this.config.title || `${this.config.simulationType.toUpperCase()} Simulation Assistant`,
            imageUrl: this.config.imageUrl || undefined
          },
          inputPlaceholder: 'Geben Sie Ihre Nachricht ein...'
        },

        // Voice configuration
        voice: {
          url: 'https://runtime-api.voiceflow.com'
        }
      };

      // Log the ACTUAL configuration being sent to Voiceflow (not flattened)
      console.log('📤 Voiceflow configuration (ACTUAL STRUCTURE):', JSON.parse(JSON.stringify(widgetConfig)));

      // Load the widget
      window.voiceflow.chat.load(widgetConfig);

      this.widget = window.voiceflow.chat;
      this.isLoaded = true;

      // Setup event listeners
      this.setupEventListeners();

      console.log('✅ Widget loaded and ready with persistent IDs');

    } catch (error) {
      console.error('❌ Failed to initialize Voiceflow widget:', error);
      throw error;
    }
  }

  /**
   * Setup event listeners for widget interactions
   */
  private setupEventListeners(): void {
    try {
      if (this.widget && this.widget.listen) {
        this.widget.listen('open', () => {
          console.log('🎯 Voiceflow: Widget opened');
          window.dispatchEvent(new CustomEvent('voiceflowWidgetOpened'));
        });

        this.widget.listen('interact', (interaction: any) => {
          console.log('🎯 Voiceflow: User interaction detected:', interaction);
          window.dispatchEvent(new CustomEvent('voiceflowUserInteraction', { detail: interaction }));
        });

        this.widget.listen('message', (message: any) => {
          console.log('🎯 Voiceflow: Message received:', message);
          window.dispatchEvent(new CustomEvent('voiceflowMessage', { detail: message }));
        });
      }

      // DOM observer for widget activity
      if (typeof window !== 'undefined') {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node instanceof HTMLElement) {
                const hasVoiceflowActivity = node.querySelector('.vfrc-message, .vfrc-input, .vfrc-button');
                if (hasVoiceflowActivity) {
                  console.log('🎯 Voiceflow: DOM activity detected');
                  window.dispatchEvent(new CustomEvent('voiceflowDOMActivity'));
                }
              }
            });
          });
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });

        (window as any).voiceflowObserver = observer;
      }
    } catch (error) {
      console.warn('⚠️ Could not set up Voiceflow event listeners:', error);
    }
  }

  /**
   * Get current persistent IDs
   */
  getIds(): { user_id: string; session_id: string } {
    return {
      user_id: this.userId,
      session_id: this.sessionId
    };
  }

  /**
   * Check if widget is ready
   */
  isReady(): boolean {
    return this.isLoaded && !!this.widget;
  }

  /**
   * Open the widget
   */
  open(): void {
    if (this.isReady()) {
      this.widget.show();
      console.log('📂 Voiceflow widget opened');
    } else {
      console.warn('⚠️ Cannot open widget - not ready');
    }
  }

  /**
   * Close the widget
   */
  close(): void {
    if (this.isReady()) {
      this.widget.hide();
      console.log('📁 Voiceflow widget closed');
    } else {
      console.warn('⚠️ Cannot close widget - not ready');
    }
  }

  /**
   * Stop all active media streams (microphone, audio calls)
   */
  private stopAllMediaStreams(): void {
    try {
      console.log('🔇 Stopping all active media streams...');

      // Stop audio/video elements
      const audioElements = document.querySelectorAll('audio, video');
      audioElements.forEach((element: Element) => {
        const mediaElement = element as HTMLMediaElement;
        if (!mediaElement.paused) {
          mediaElement.pause();
          mediaElement.srcObject = null;
          console.log('⏸️ Paused media element:', mediaElement.tagName);
        }
      });

      // Stop MediaStream tracks in Voiceflow elements
      const voiceflowElements = document.querySelectorAll('[class*="vfrc"], [id*="voiceflow"]');
      voiceflowElements.forEach((element: Element) => {
        const htmlElement = element as any;

        if (htmlElement.srcObject && typeof htmlElement.srcObject.getTracks === 'function') {
          const tracks = htmlElement.srcObject.getTracks();
          tracks.forEach((track: MediaStreamTrack) => {
            track.stop();
            console.log('🛑 Stopped media track:', track.kind, track.label);
          });
          htmlElement.srcObject = null;
        }
      });

      console.log('✅ Media stream cleanup completed');
    } catch (error) {
      console.warn('⚠️ Error stopping media streams:', error);
    }
  }

  /**
   * Clean up widget properly
   */
  destroy(): void {
    console.log(`🧹 VoiceflowController: Starting cleanup for ${this.config.simulationType.toUpperCase()}...`);

    if (typeof window !== 'undefined') {
      // Stop all media streams
      this.stopAllMediaStreams();

      // Call Voiceflow API cleanup methods
      if (window.voiceflow?.chat) {
        try {
          console.log('🔧 Calling Voiceflow cleanup methods...');
          window.voiceflow.chat.hide && window.voiceflow.chat.hide();
          window.voiceflow.chat.close && window.voiceflow.chat.close();
          window.voiceflow.chat.destroy && window.voiceflow.chat.destroy();
        } catch (error) {
          console.warn('⚠️ Voiceflow API cleanup error:', error);
        }
      }

      // Remove Voiceflow DOM elements
      this.removeAllVoiceflowElements();

      // Remove Voiceflow scripts
      this.removeVoiceflowScripts();

      // Clean up observers
      if ((window as any).voiceflowObserver) {
        try {
          (window as any).voiceflowObserver.disconnect();
          delete (window as any).voiceflowObserver;
          console.log('✅ Cleaned up Voiceflow observer');
        } catch (error) {
          console.warn('⚠️ Could not clean up observer:', error);
        }
      }

      // Clear global Voiceflow object
      if (window.voiceflow) {
        try {
          delete (window as any).voiceflow;
          console.log('✅ Cleared global voiceflow object');
        } catch (error) {
          console.warn('⚠️ Could not clear global voiceflow object:', error);
        }
      }
    }

    this.isLoaded = false;
    this.widget = null;
    console.log('✅ VoiceflowController cleanup completed');
  }

  /**
   * Remove all Voiceflow DOM elements
   */
  private removeAllVoiceflowElements(): void {
    const selectors = [
      '[id*="voiceflow"]',
      '[class*="voiceflow"]',
      '[class*="vf-"]',
      '[class*="VF"]',
      '[class*="vfrc"]',
      '[data-testid*="chat"]',
      '[aria-label*="chat"]',
      'iframe[src*="voiceflow"]',
      'iframe[src*="general-runtime"]',
      '.widget-container',
      '#voiceflow-chat',
      '.vfrc-widget',
      '.vfrc-chat',
      '.vfrc-launcher'
    ];

    let removedCount = 0;
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element: Element) => {
        const isVoiceflowElement =
          element.id.includes('voiceflow') ||
          element.className.includes('voiceflow') ||
          element.className.includes('vfrc') ||
          (element as HTMLElement).innerHTML?.includes('voiceflow') ||
          (element as HTMLIFrameElement).src?.includes('voiceflow');

        if (isVoiceflowElement) {
          element.remove();
          removedCount++;
        }
      });
    });

    console.log(`🗑️ Removed ${removedCount} Voiceflow DOM elements`);
  }

  /**
   * Remove Voiceflow scripts
   */
  private removeVoiceflowScripts(): void {
    const scripts = document.querySelectorAll('script[src*="voiceflow"]');
    scripts.forEach(script => {
      script.remove();
    });

    const styleElement = document.getElementById('hide-voiceflow-aggressive');
    if (styleElement) {
      styleElement.remove();
    }
  }
}

/**
 * Create controller for KP simulation
 */
export function createKPController(): VoiceflowController {
  return new VoiceflowController({
    projectID: '690664399c414573ccceb427',  // New KP Project ID
    versionID: 'production',
    url: 'https://general-runtime.voiceflow.com',
    simulationType: 'kp',
    title: 'KP Simulation Assistant'
  });
}

/**
 * Create controller for FSP simulation
 */
export function createFSPController(): VoiceflowController {
  return new VoiceflowController({
    projectID: '690664339c414573ccceb410',  // New FSP Project ID
    versionID: 'production',
    url: 'https://general-runtime.voiceflow.com',
    simulationType: 'fsp',
    title: 'FSP Simulation Assistant'
  });
}

/**
 * Reset simulation (clear persistent IDs)
 */
export function resetKPSimulation(): void {
  resetSimulation('kp');
}

export function resetFSPSimulation(): void {
  resetSimulation('fsp');
}

/**
 * Global cleanup utility function
 */
export function globalVoiceflowCleanup(): void {
  console.log('🌍 Global Voiceflow cleanup started...');

  if (typeof window !== 'undefined') {
    if (window.voiceflow?.chat) {
      try {
        window.voiceflow.chat.hide && window.voiceflow.chat.hide();
        window.voiceflow.chat.close && window.voiceflow.chat.close();
        window.voiceflow.chat.destroy && window.voiceflow.chat.destroy();
      } catch (error) {
        console.warn('⚠️ Global Voiceflow API cleanup error:', error);
      }
    }

    // Remove all Voiceflow elements
    const selectors = [
      '[id*="voiceflow"]',
      '[class*="voiceflow"]',
      '[class*="vfrc"]',
      'iframe[src*="voiceflow"]',
      '.vfrc-widget'
    ];

    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element: Element) => element.remove());
      } catch (error) {
        console.warn(`⚠️ Error removing elements with selector ${selector}:`, error);
      }
    });

    // Remove scripts
    const scripts = document.querySelectorAll('script[src*="voiceflow"]');
    scripts.forEach(script => script.remove());

    // Clear global objects
    if (window.voiceflow) {
      delete (window as any).voiceflow;
    }
  }

  console.log('✅ Global Voiceflow cleanup completed');
}

// Type declaration for window.voiceflow
declare global {
  interface Window {
    voiceflow: {
      chat: any;
    };
  }
}
