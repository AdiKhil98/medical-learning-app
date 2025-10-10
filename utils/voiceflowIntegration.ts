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
  private userId: string | null = null;
  private sessionToken: string | null = null;

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
        }
      });

      this.widget = window.voiceflow.chat;
      this.isLoaded = true;

      // Add event listeners for widget interactions
      this.setupEventListeners();

      console.log('✅ Widget loaded and ready');

    } catch (error) {
      console.error('Failed to initialize Voiceflow widget:', error);
      throw error;
    }
  }

  // Set up event listeners for widget interactions
  private setupEventListeners(): void {
    try {
      // Listen for widget events to detect simulation start
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

      // Alternative: Monitor DOM changes for widget activity
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

        // Store observer for cleanup
        (window as any).voiceflowObserver = observer;
      }
    } catch (error) {
      console.warn('⚠️ Could not set up Voiceflow event listeners:', error);
    }
  }

  // Start simulation programmatically
  async startSimulation(): Promise<boolean> {
    try {
      if (!this.isLoaded || !this.widget) {
        throw new Error('Widget not loaded');
      }

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

  // Update session variables in an active Voiceflow session
  // Call this when session token is generated after widget is loaded
  async updateSessionVariables(userId: string, sessionToken: string): Promise<boolean> {
    this.userId = userId;
    this.sessionToken = sessionToken;

    console.log('🔄 Updating Voiceflow session variables:', { userId, sessionToken });

    if (!this.isReady()) {
      console.error('❌ Voiceflow widget not ready for variable update');
      return false;
    }

    try {
      // Method 1: Try using interact to set variables
      if (this.widget.interact) {
        await this.widget.interact({
          type: 'launch',
          payload: {
            user_id: userId,
            session_token: sessionToken
          }
        });
        console.log('✅ Session variables updated via interact method');
        return true;
      }

      // Method 2: Try using send method as fallback
      if (this.widget.send) {
        await this.widget.send({
          type: 'launch',
          payload: {
            user_id: userId,
            session_token: sessionToken
          }
        });
        console.log('✅ Session variables updated via send method');
        return true;
      }

      console.error('❌ No suitable method found to update Voiceflow variables');
      return false;

    } catch (error) {
      console.error('❌ Failed to update Voiceflow session variables:', error);
      return false;
    }
  }

  // Open the widget
  open(): void {
    if (this.isReady()) {
      this.widget.show();
      console.log('📂 Voiceflow widget opened');
    } else {
      console.warn('⚠️ Cannot open widget - not ready');
    }
  }

  // Close the widget
  close(): void {
    if (this.isReady()) {
      this.widget.hide();
      console.log('📁 Voiceflow widget closed');
    } else {
      console.warn('⚠️ Cannot close widget - not ready');
    }
  }

  // Clean up widget properly
  destroy(): void {
    console.log('🧹 VoiceflowController: Starting cleanup...');
    
    if (typeof window !== 'undefined') {
      // Step 1: Call Voiceflow API cleanup methods
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

      // Step 2: Remove all Voiceflow DOM elements
      this.removeAllVoiceflowElements();

      // Step 3: Remove Voiceflow scripts
      this.removeVoiceflowScripts();

      // Step 4: Clean up observers
      if ((window as any).voiceflowObserver) {
        try {
          (window as any).voiceflowObserver.disconnect();
          delete (window as any).voiceflowObserver;
          console.log('✅ Cleaned up Voiceflow observer');
        } catch (error) {
          console.warn('⚠️ Could not clean up observer:', error);
        }
      }

      // Step 5: Clear global Voiceflow object
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
    this.userId = null;
    this.sessionToken = null;
    console.log('✅ VoiceflowController cleanup completed');
  }

  // Remove all Voiceflow DOM elements
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
      'div[style*="z-index: 1000"]',
      'div[style*="position: fixed"]',
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
        // Check if it's actually a Voiceflow element
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

  // Remove Voiceflow scripts
  private removeVoiceflowScripts(): void {
    const scripts = document.querySelectorAll('script[src*="voiceflow"]');
    scripts.forEach(script => {
      script.remove();
      console.log('🗑️ Removed Voiceflow script:', script.getAttribute('src'));
    });

    // Remove our injected style
    const styleElement = document.getElementById('hide-voiceflow-aggressive');
    if (styleElement) {
      styleElement.remove();
      console.log('🗑️ Removed injected Voiceflow hiding styles');
    }
  }
}

// Helper function to create controller for KP simulation
export function createKPController(): VoiceflowController {
  return new VoiceflowController({
    projectID: '68e66000c008b9d6daa7c0f8',  // Updated KP Project ID
    versionID: '68e66000c008b9d6daa7c0f9',  // Updated KP Version ID
    url: 'https://general-runtime.voiceflow.com',
    voice: {
      url: 'https://runtime-api.voiceflow.com'
    }
  });
}

// Helper function to create controller for FSP simulation
export function createFSPController(): VoiceflowController {
  return new VoiceflowController({
    projectID: '68e6600ae20ffc6d99af289f',  // Updated FSP Project ID
    versionID: '68e6600ae20ffc6d99af28a0',  // Updated FSP Version ID
    url: 'https://general-runtime.voiceflow.com',
    voice: {
      url: 'https://runtime-api.voiceflow.com'
    }
  });
}

// Global cleanup utility function
export function globalVoiceflowCleanup(): void {
  console.log('🌍 Global Voiceflow cleanup started...');
  
  if (typeof window !== 'undefined') {
    // Step 1: Call Voiceflow API cleanup methods
    if (window.voiceflow?.chat) {
      try {
        console.log('🔧 Global cleanup: Calling Voiceflow methods...');
        window.voiceflow.chat.hide && window.voiceflow.chat.hide();
        window.voiceflow.chat.close && window.voiceflow.chat.close();
        window.voiceflow.chat.destroy && window.voiceflow.chat.destroy();
      } catch (error) {
        console.warn('⚠️ Global Voiceflow API cleanup error:', error);
      }
    }

    // Step 2: Remove all Voiceflow elements
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
      'div[style*="z-index: 1000"]',
      'div[style*="position: fixed"]',
      '.widget-container',
      '#voiceflow-chat',
      '.vfrc-widget',
      '.vfrc-chat',
      '.vfrc-launcher'
    ];

    let removedCount = 0;
    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element: Element) => {
          // Check if it's actually a Voiceflow element
          const elementHTML = element as HTMLElement;
          const isVoiceflowElement = 
            element.id.includes('voiceflow') ||
            element.className.includes('voiceflow') ||
            element.className.includes('vfrc') ||
            elementHTML.innerHTML?.includes('voiceflow') ||
            (element as HTMLIFrameElement).src?.includes('voiceflow') ||
            (element as HTMLIFrameElement).src?.includes('general-runtime');

          if (isVoiceflowElement || selector.includes('voiceflow') || selector.includes('vfrc')) {
            element.remove();
            removedCount++;
          }
        });
      } catch (error) {
        console.warn(`⚠️ Error removing elements with selector ${selector}:`, error);
      }
    });
    
    console.log(`🗑️ Global cleanup: Removed ${removedCount} Voiceflow DOM elements`);

    // Step 3: Remove scripts
    try {
      const scripts = document.querySelectorAll('script[src*="voiceflow"]');
      scripts.forEach(script => {
        script.remove();
        console.log('🗑️ Global cleanup: Removed Voiceflow script');
      });
    } catch (error) {
      console.warn('⚠️ Error removing Voiceflow scripts:', error);
    }

    // Step 4: Remove injected styles
    try {
      const styleElement = document.getElementById('hide-voiceflow-aggressive');
      if (styleElement) {
        styleElement.remove();
        console.log('🗑️ Global cleanup: Removed injected styles');
      }
    } catch (error) {
      console.warn('⚠️ Error removing injected styles:', error);
    }

    // Step 5: Clear global objects
    try {
      if (window.voiceflow) {
        delete (window as any).voiceflow;
        console.log('✅ Global cleanup: Cleared global voiceflow object');
      }
    } catch (error) {
      console.warn('⚠️ Could not clear global voiceflow object:', error);
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