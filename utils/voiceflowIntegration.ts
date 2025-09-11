// Utility functions for integrating with hidden Voiceflow widget

export interface VoiceflowConfig {
  projectID: string;
  versionID: string;
  url?: string;
  voice?: {
    url: string;
  };
}

export class VoiceflowController {
  private config: VoiceflowConfig;
  private isLoaded = false;
  private widget: any = null;

  constructor(config: VoiceflowConfig) {
    this.config = config;
  }

  // Load Voiceflow script and initialize hidden widget
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

      console.log('📦 Voiceflow: Loading widget for project:', this.config.projectID);

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

  private async initializeWidget(): Promise<void> {
    if (!window.voiceflow?.chat) {
      throw new Error('Voiceflow not available');
    }

    try {
      // Use the exact same configuration that works in the test page
      window.voiceflow.chat.load({
        verify: { projectID: this.config.projectID },
        url: 'https://general-runtime.voiceflow.com',
        versionID: 'production',
        voice: {
          url: "https://runtime-api.voiceflow.com"
        },
        assistant: {
          title: 'KP Simulation',
          description: 'Hidden widget for voice integration',
          stylesheet: `
            /* Make widget invisible but keep it functional in DOM */
            .vfrc-launcher {
              opacity: 0 !important;
              pointer-events: none !important;
              position: fixed !important;
              bottom: -200px !important;
              right: -200px !important;
              z-index: -1 !important;
              width: 1px !important;
              height: 1px !important;
            }
            
            .vfrc-widget {
              opacity: 0 !important;
              pointer-events: none !important;
              position: fixed !important;
              bottom: -500px !important;
              right: -500px !important;
              z-index: -1 !important;
            }
            
            /* But allow programmatic access to voice buttons */
            .vfrc-voice-button,
            [aria-label*="voice"],
            button[class*="voice"] {
              opacity: 1 !important;
              pointer-events: auto !important;
              position: absolute !important;
            }
          `
        }
      });

      this.widget = window.voiceflow.chat;
      this.isLoaded = true;

      // Widget is now styled to look like our custom microphone
      console.log('✅ Widget styled as custom microphone');

    } catch (error) {
      console.error('Failed to initialize Voiceflow widget:', error);
      throw error;
    }
  }

  // Ensure widget stays hidden
  private hideWidget(): void {
    if (typeof document !== 'undefined') {
      // More aggressive hiding approach
      const hideAllWidgets = () => {
        // Find and hide all possible Voiceflow elements
        const selectors = [
          '[id*="voiceflow"]',
          '[class*="voiceflow"]', 
          '[class*="vf-"]',
          '[class*="VF"]',
          '[data-testid*="chat"]',
          '[aria-label*="chat"]',
          'iframe[src*="voiceflow"]',
          'div[style*="z-index: 1000"]',
          'div[style*="position: fixed"]'
        ];

        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach((element: Element) => {
            const htmlEl = element as HTMLElement;
            htmlEl.style.setProperty('display', 'none', 'important');
            htmlEl.style.setProperty('visibility', 'hidden', 'important');
            htmlEl.style.setProperty('opacity', '0', 'important');
            htmlEl.style.setProperty('pointer-events', 'none', 'important');
            htmlEl.style.setProperty('position', 'absolute', 'important');
            htmlEl.style.setProperty('left', '-99999px', 'important');
            htmlEl.style.setProperty('top', '-99999px', 'important');
            htmlEl.style.setProperty('z-index', '-9999', 'important');
            htmlEl.remove(); // More aggressive - completely remove
          });
        });
      };

      // Run immediately and repeatedly
      hideAllWidgets();
      setTimeout(hideAllWidgets, 100);
      setTimeout(hideAllWidgets, 500);
      setTimeout(hideAllWidgets, 1000);

      // Inject comprehensive CSS
      const hideCSS = `
        /* Hide all Voiceflow elements */
        [id*="voiceflow"],
        [class*="voiceflow"], 
        [class*="vf-"],
        [class*="VF"],
        [data-testid*="chat"],
        [aria-label*="chat"],
        iframe[src*="voiceflow"],
        div[style*="z-index: 1000"],
        div[style*="position: fixed"]:has(iframe[src*="voiceflow"]) {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          position: absolute !important;
          left: -99999px !important;
          top: -99999px !important;
          z-index: -9999 !important;
          width: 0 !important;
          height: 0 !important;
          overflow: hidden !important;
        }
        
        /* Target common chat widget containers */
        body > div:last-child:has(iframe[src*="voiceflow"]) {
          display: none !important;
        }
        
        /* Hide any floating elements in bottom right */
        div[style*="bottom"][style*="right"] {
          display: none !important;
        }
      `;

      let styleElement = document.getElementById('hide-voiceflow-aggressive');
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'hide-voiceflow-aggressive';
        document.head.appendChild(styleElement);
      }
      styleElement.textContent = hideCSS;

      // Set up mutation observer to catch dynamically added widgets
      const observer = new MutationObserver(hideAllWidgets);
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  // Start simulation programmatically
  async startSimulation(): Promise<boolean> {
    try {
      if (!this.isLoaded || !this.widget) {
        throw new Error('Widget not loaded');
      }

      // Ensure widget is still hidden
      this.hideWidget();

      // Send the "Simulation starten" message programmatically
      if (this.widget.interact) {
        await this.widget.interact({
          type: 'text',
          payload: 'Simulation starten'
        });
      } else if (this.widget.send) {
        await this.widget.send({
          type: 'text',
          payload: 'Simulation starten'
        });
      } else {
        // Fallback method - trigger click on hidden button
        setTimeout(() => {
          const startButton = document.querySelector('[aria-label*="start"], [title*="start"], button:contains("starten")');
          if (startButton) {
            (startButton as HTMLElement).click();
          }
        }, 500);
      }

      return true;
    } catch (error) {
      console.error('Failed to start simulation:', error);
      return false;
    }
  }

  // Check if widget is ready
  isReady(): boolean {
    return this.isLoaded && !!this.widget;
  }

  // Clean up widget
  destroy(): void {
    if (typeof window !== 'undefined' && window.voiceflow?.chat?.destroy) {
      window.voiceflow.chat.destroy();
    }
    this.isLoaded = false;
    this.widget = null;
  }
}

// Helper function to create controller for KP simulation
export function createKPController(): VoiceflowController {
  return new VoiceflowController({
    projectID: '68c3061be0c49c3ff98ceb9e',
    versionID: '68c3061be0c49c3ff98ceb9f',
    url: 'https://general-runtime.voiceflow.com'
  });
}

// Helper function to create controller for FSP simulation
export function createFSPController(): VoiceflowController {
  return new VoiceflowController({
    projectID: '68c3061286edc166c7409034',
    versionID: '68c3061286edc166c7409035',
    url: 'https://general-runtime.voiceflow.com',
    voice: {
      url: 'https://runtime-api.voiceflow.com'
    }
  });
}

// Type declaration for window.voiceflow
declare global {
  interface Window {
    voiceflow: {
      chat: any;
    };
  }
}