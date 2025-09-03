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
        resolve(false);
        return;
      }

      // Check if already loaded
      if (window.voiceflow && this.isLoaded) {
        resolve(true);
        return;
      }

      // Load script if not present
      if (!document.querySelector('script[src*="voiceflow.com"]')) {
        const script = document.createElement('script');
        script.src = 'https://cdn.voiceflow.com/widget-next/bundle.mjs';
        script.type = 'text/javascript';
        
        script.onload = () => {
          this.initializeWidget()
            .then(() => resolve(true))
            .catch(reject);
        };
        
        script.onerror = () => reject(new Error('Failed to load Voiceflow script'));
        document.head.appendChild(script);
      } else {
        this.initializeWidget()
          .then(() => resolve(true))
          .catch(reject);
      }
    });
  }

  private async initializeWidget(): Promise<void> {
    if (!window.voiceflow?.chat) {
      throw new Error('Voiceflow not available');
    }

    try {
      // Initialize widget with hidden configuration
      window.voiceflow.chat.load({
        verify: { projectID: this.config.projectID },
        url: this.config.url || 'https://general-runtime.voiceflow.com',
        versionID: this.config.versionID,
        voice: this.config.voice,
        // Hide the widget completely
        assistant: {
          stylesheet: `
            #voiceflow-chat { 
              display: none !important; 
              visibility: hidden !important;
              opacity: 0 !important;
              pointer-events: none !important;
            }
          `
        }
      });

      this.widget = window.voiceflow.chat;
      this.isLoaded = true;

      // Hide any visible elements after initialization
      setTimeout(() => {
        this.hideWidget();
      }, 100);

    } catch (error) {
      console.error('Failed to initialize Voiceflow widget:', error);
      throw error;
    }
  }

  // Ensure widget stays hidden
  private hideWidget(): void {
    if (typeof document !== 'undefined') {
      // Hide by CSS selector
      const widgets = document.querySelectorAll('[id*="voiceflow"], [class*="voiceflow"], [class*="vf-"], iframe[src*="voiceflow"]');
      widgets.forEach((element: Element) => {
        (element as HTMLElement).style.display = 'none';
        (element as HTMLElement).style.visibility = 'hidden';
        (element as HTMLElement).style.opacity = '0';
        (element as HTMLElement).style.pointerEvents = 'none';
      });

      // Inject CSS to ensure hiding
      const hideCSS = `
        #voiceflow-chat,
        [id*="voiceflow"],
        [class*="voiceflow"],
        [class*="vf-"],
        iframe[src*="voiceflow"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          position: absolute !important;
          left: -9999px !important;
          top: -9999px !important;
        }
      `;

      let styleElement = document.getElementById('hide-voiceflow');
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'hide-voiceflow';
        document.head.appendChild(styleElement);
      }
      styleElement.textContent = hideCSS;
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
    projectID: '68b40ab270a53105f6701677',
    versionID: '68b40ab270a53105f6701678',
    url: 'https://general-runtime.voiceflow.com'
  });
}

// Helper function to create controller for FSP simulation
export function createFSPController(): VoiceflowController {
  return new VoiceflowController({
    projectID: '68b40ab94a5a50553729c86b',
    versionID: '68b40ab94a5a50553729c86c',
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