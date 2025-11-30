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
import { logger } from './logger';

export interface VoiceflowConfig {
  projectID: string;
  versionID?: string;
  url?: string;
  simulationType: SimulationType;
  title?: string;
  imageUrl?: string;

  /**
   * PRIVACY OPTION: Hash email before sending to Voiceflow
   *
   * - false (default): Send plain email in userID (current behavior)
   *   Use when Voiceflow agent needs to access/display the email
   *
   * - true: Send SHA-256 hash of email instead
   *   Use for GDPR compliance when agent doesn't need actual email
   *   Hash is consistent (same email = same hash) but one-way
   *
   * WARNING: If enabled, Voiceflow agent will only see hash, not email
   */
  hashEmail?: boolean;
}

export class VoiceflowController {
  private config: VoiceflowConfig;
  private isLoaded = false;
  private widget: any = null;
  private userId: string;
  private sessionId: string;
  private supabaseUserId?: string;
  private userEmail?: string;

  constructor(config: VoiceflowConfig, supabaseUserId?: string, userEmail?: string) {
    this.config = config;
    this.supabaseUserId = supabaseUserId;
    this.userEmail = userEmail;

    // Get or create persistent IDs, using Supabase user ID if provided
    const persistentIds = getPersistentIds(config.simulationType, supabaseUserId);
    this.userId = persistentIds.user_id;
    this.sessionId = persistentIds.session_id;

    logger.info(`🎮 VoiceflowController created for ${config.simulationType.toUpperCase()}:`, {
      user_id: this.userId,
      session_id: this.sessionId,
      user_email: this.userEmail || 'NOT_PROVIDED',
      email_status: this.userEmail ? '✅ Email available' : '⚠️ Will attempt fallback',
      projectID: config.projectID,
      supabase_synced: !!supabaseUserId,
    });
  }

  /**
   * Validate email format
   * Returns true if email is valid, false otherwise
   */
  private isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }
    // Basic email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Hash email using SHA-256 for privacy
   * Creates a consistent, one-way hash that can't be reversed to get email
   *
   * @param email - The email to hash
   * @returns SHA-256 hash in hexadecimal format (64 characters)
   */
  private async hashEmail(email: string): Promise<string> {
    if (!email) {
      return '';
    }

    try {
      // Convert email to lowercase for consistent hashing
      const normalizedEmail = email.toLowerCase().trim();

      // Use Web Crypto API (available in browsers and modern environments)
      const encoder = new TextEncoder();
      const data = encoder.encode(normalizedEmail);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);

      // Convert buffer to hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      return hashHex;
    } catch (error) {
      logger.error('❌ Error hashing email:', error);
      // Fallback: return empty string on error (Voiceflow will receive userID without email)
      return '';
    }
  }

  /**
   * Fetch email from Supabase session as fallback if not provided
   * Called during initialization before widget load
   */
  private async fetchEmailFallback(): Promise<void> {
    if (this.userEmail) {
      // Validate existing email
      if (!this.isValidEmail(this.userEmail)) {
        logger.warn(`⚠️ Invalid email format: ${this.userEmail}`);
        this.userEmail = undefined; // Clear invalid email
      } else {
        // Email already provided and valid, no fallback needed
        return;
      }
    }

    try {
      logger.info('📧 Attempting to fetch email from Supabase session...');

      // Dynamically import supabase to avoid circular dependencies
      const { supabase } = await import('@/lib/supabase');

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        logger.error('❌ Error fetching Supabase session:', error);
        return;
      }

      if (session?.user?.email) {
        // Validate email before using it
        if (this.isValidEmail(session.user.email)) {
          this.userEmail = session.user.email;
          logger.info(`✅ Email fetched from Supabase session: ${this.userEmail}`);
        } else {
          logger.warn(`⚠️ Invalid email format from session: ${session.user.email}`);
        }
      } else {
        logger.warn('⚠️ No email found in Supabase session');
        logger.warn('⚠️ Voiceflow will initialize without user_email');
      }
    } catch (error) {
      logger.error('❌ Exception fetching email fallback:', error);
    }
  }

  /**
   * Initialize Voiceflow widget with persistent IDs
   * Attempts email fallback before loading widget
   */
  async initialize(): Promise<boolean> {
    // Try to fetch email from Supabase if not provided
    await this.fetchEmailFallback();
    return this.loadWidget();
  }

  /**
   * Load Voiceflow script and initialize widget with modern configuration
   */
  async loadWidget(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        logger.info('❌ Voiceflow: Window is undefined (not in browser)');
        resolve(false);
        return;
      }

      // Check if already loaded
      if (window.voiceflow && this.isLoaded) {
        logger.info('✅ Voiceflow: Already loaded');
        resolve(true);
        return;
      }

      logger.info(`📦 Voiceflow: Loading widget for ${this.config.simulationType.toUpperCase()}...`);
      logger.info(`📧 Email for widget: ${this.userEmail || 'NOT_AVAILABLE'}`);
      logCurrentIds(this.config.simulationType);

      // Load script if not present
      if (!document.querySelector('script[src*="voiceflow.com"]')) {
        logger.info('📡 Loading Voiceflow script from CDN...');
        const script = document.createElement('script');
        script.src = 'https://cdn.voiceflow.com/widget-next/bundle.mjs';
        script.type = 'text/javascript';

        // Add 30-second timeout to prevent hanging
        const timeout = setTimeout(() => {
          logger.error('❌ Voiceflow script load timeout (30s)');
          reject(new Error('Voiceflow script load timeout'));
        }, 30000);

        script.onload = () => {
          clearTimeout(timeout); // Clear timeout on success
          logger.info('✅ Voiceflow script loaded from CDN');
          this.initializeWidget()
            .then(() => {
              logger.info('✅ Widget initialized successfully');
              resolve(true);
            })
            .catch((error) => {
              logger.error('❌ Widget initialization failed:', error);
              reject(error);
            });
        };

        script.onerror = (error) => {
          clearTimeout(timeout); // Clear timeout on error
          logger.error('❌ Failed to load Voiceflow script:', error);
          reject(new Error('Failed to load Voiceflow script'));
        };

        // SAFETY: Check document.head exists before appending
        if (!document.head) {
          clearTimeout(timeout);
          logger.error('❌ document.head is not available');
          reject(new Error('Document head not available'));
          return;
        }
        document.head.appendChild(script);
      } else {
        logger.info('📦 Voiceflow script already present, initializing widget...');
        this.initializeWidget()
          .then(() => {
            logger.info('✅ Widget initialized successfully');
            resolve(true);
          })
          .catch((error) => {
            logger.error('❌ Widget initialization failed:', error);
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
      logger.info('🔐 Initializing Voiceflow with persistent IDs:', {
        user_id: this.userId,
        session_id: this.sessionId,
        user_email: this.userEmail || 'NOT_PROVIDED',
        email_will_be_sent: !!this.userEmail,
        simulation: this.config.simulationType.toUpperCase(),
      });

      // CRITICAL WARNING: If email is missing, log it prominently
      if (!this.userEmail) {
        logger.error('❌❌❌ CRITICAL: user_email is undefined! Email will NOT be sent to Voiceflow! ❌❌❌');
      }

      // Prepare email for userID (hash if privacy mode enabled)
      let emailForUserID = this.userEmail;
      if (this.userEmail && this.config.hashEmail) {
        emailForUserID = await this.hashEmail(this.userEmail);
        logger.info('🔒 PRIVACY MODE: Email hashed for Voiceflow (SHA-256)');
        logger.info('   Original:', this.userEmail);
        logger.info('   Hashed:', `${emailForUserID.substring(0, 16)  }...`);
      }

      // Voiceflow configuration with persistent IDs
      // Based on official docs: https://docs.voiceflow.com/docs/customization-configuration
      const widgetConfig: any = {
        verify: {
          projectID: this.config.projectID,
        },
        url: this.config.url || 'https://general-runtime.voiceflow.com',
        versionID: this.config.versionID || 'production',

        // User ID with email encoded (so Voiceflow definitely receives it)
        // Format: "userID|email|sessionID" - we can parse this in Voiceflow
        // If hashEmail is enabled, email will be SHA-256 hash instead of plain text
        userID: emailForUserID ? `${this.userId}|${emailForUserID}|${this.sessionId}` : this.userId,

        // Voice is REQUIRED - widget crashes without it
        voice: {
          url: 'https://runtime-api.voiceflow.com',
        },

        // Assistant configuration
        assistant: {
          persistence: 'memory', // Use 'memory' to reset on refresh (not 'localStorage')
          header: {
            title: this.config.title || `${this.config.simulationType.toUpperCase()} Simulation`,
          },
          inputPlaceholder: 'Geben Sie Ihre Nachricht ein...',
        },
      };

      // Log the ACTUAL configuration being sent to Voiceflow (not flattened)
      logger.info(
        `📤 ${this.config.simulationType.toUpperCase()} Voiceflow configuration (ACTUAL STRUCTURE):`,
        JSON.parse(JSON.stringify(widgetConfig))
      );
      logger.info(`🆔 ${this.config.simulationType.toUpperCase()} Project ID: ${this.config.projectID}`);
      logger.info(`🔢 ${this.config.simulationType.toUpperCase()} Version ID: ${this.config.versionID}`);

      // CRITICAL: Log encoded userID (contains email or hash)
      logger.info(`🎯 UserID (encoded):`, widgetConfig.userID);
      if (this.userEmail) {
        if (this.config.hashEmail) {
          logger.info(`🔒 Email hashed in userID (privacy mode enabled)`);
        } else {
          logger.info(`📧 Email encoded in userID: ${this.userEmail}`);
        }
      }

      // Load the widget
      window.voiceflow.chat.load(widgetConfig);

      this.widget = window.voiceflow.chat;
      this.isLoaded = true;

      // Setup event listeners
      this.setupEventListeners();

      // Email is encoded in userID field (see above)
      const privacyStatus = this.config.hashEmail ? '(email hashed in userID)' : '(email in userID)';
      logger.info(`✅ Widget loaded and ready with persistent IDs ${privacyStatus}`);
    } catch (error) {
      logger.error('❌ Failed to initialize Voiceflow widget:', error);
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
          logger.info('🎯 Voiceflow: Widget opened');
          window.dispatchEvent(new CustomEvent('voiceflowWidgetOpened'));
        });

        this.widget.listen('interact', (interaction: any) => {
          logger.info('🎯 Voiceflow: User interaction detected:', interaction);
          window.dispatchEvent(new CustomEvent('voiceflowUserInteraction', { detail: interaction }));
        });

        this.widget.listen('message', (message: any) => {
          logger.info('🎯 Voiceflow: Message received:', message);
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
                  logger.info('🎯 Voiceflow: DOM activity detected');
                  window.dispatchEvent(new CustomEvent('voiceflowDOMActivity'));
                }
              }
            });
          });
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });

        (window as any).voiceflowObserver = observer;
      }
    } catch (error) {
      logger.warn('⚠️ Could not set up Voiceflow event listeners:', error);
    }
  }

  /**
   * Send email to Voiceflow via interact API
   * This approach sends the email as an action after widget initialization
   */
  private async sendEmailViaAPI(): Promise<void> {
    try {
      logger.info('📧 Sending email to Voiceflow via interact API...');

      const interactPayload = {
        action: {
          type: 'set',
          payload: {
            user_email: this.userEmail,
            session_id: this.sessionId,
          },
        },
      };

      // Use the widget's interact method if available
      if (this.widget && typeof this.widget.interact === 'function') {
        await this.widget.interact(interactPayload);
        logger.info(`✅ Email sent via widget.interact: ${this.userEmail}`);
      } else {
        // Fallback: Use the Dialog API directly
        const response = await fetch(
          `${this.config.url}/interact/${this.config.projectID}/${this.config.versionID || 'production'}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userID: this.userId,
              action: {
                type: 'set',
                payload: {
                  user_email: this.userEmail,
                  session_id: this.sessionId,
                },
              },
            }),
          }
        );

        if (response.ok) {
          logger.info(`✅ Email sent via Dialog API: ${this.userEmail}`);
        } else {
          logger.error(`❌ Failed to send email via API: ${response.statusText}`);
        }
      }
    } catch (error) {
      logger.error('❌ Error sending email via API:', error);
      // Don't throw - widget should still work even if email fails
    }
  }

  /**
   * Get current persistent IDs
   */
  getIds(): { user_id: string; session_id: string } {
    return {
      user_id: this.userId,
      session_id: this.sessionId,
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
      logger.info('📂 Voiceflow widget opened');
    } else {
      logger.warn('⚠️ Cannot open widget - not ready');
    }
  }

  /**
   * Close the widget
   */
  close(): void {
    if (this.isReady()) {
      this.widget.hide();
      logger.info('📁 Voiceflow widget closed');
    } else {
      logger.warn('⚠️ Cannot close widget - not ready');
    }
  }

  /**
   * Stop all active media streams (microphone, audio calls)
   */
  private stopAllMediaStreams(): void {
    try {
      logger.info('🔇 Stopping all active media streams...');

      // Stop audio/video elements
      const audioElements = document.querySelectorAll('audio, video');
      audioElements.forEach((element: Element) => {
        const mediaElement = element as HTMLMediaElement;
        if (!mediaElement.paused) {
          mediaElement.pause();
          mediaElement.srcObject = null;
          logger.info('⏸️ Paused media element:', mediaElement.tagName);
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
            logger.info('🛑 Stopped media track:', track.kind, track.label);
          });
          htmlElement.srcObject = null;
        }
      });

      logger.info('✅ Media stream cleanup completed');
    } catch (error) {
      logger.warn('⚠️ Error stopping media streams:', error);
    }
  }

  /**
   * Clean up widget properly
   */
  destroy(): void {
    logger.info(`🧹 VoiceflowController: Starting cleanup for ${this.config.simulationType.toUpperCase()}...`);

    if (typeof window !== 'undefined') {
      // Stop all media streams
      this.stopAllMediaStreams();

      // Call Voiceflow API cleanup methods
      if (window.voiceflow?.chat) {
        try {
          logger.info('🔧 Calling Voiceflow cleanup methods...');
          window.voiceflow.chat.hide && window.voiceflow.chat.hide();
          window.voiceflow.chat.close && window.voiceflow.chat.close();
          window.voiceflow.chat.destroy && window.voiceflow.chat.destroy();
        } catch (error) {
          logger.warn('⚠️ Voiceflow API cleanup error:', error);
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
          logger.info('✅ Cleaned up Voiceflow observer');
        } catch (error) {
          logger.warn('⚠️ Could not clean up observer:', error);
        }
      }

      // Clear global Voiceflow object
      if (window.voiceflow) {
        try {
          delete (window as any).voiceflow;
          logger.info('✅ Cleared global voiceflow object');
        } catch (error) {
          logger.warn('⚠️ Could not clear global voiceflow object:', error);
        }
      }
    }

    this.isLoaded = false;
    this.widget = null;
    logger.info('✅ VoiceflowController cleanup completed');
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
      '.vfrc-launcher',
    ];

    let removedCount = 0;
    selectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element: Element) => {
        // SAFETY: Check element properties exist before accessing
        if (!element) return;

        const isVoiceflowElement =
          element.id?.includes('voiceflow') ||
          element.className?.includes?.('voiceflow') ||
          element.className?.includes?.('vfrc') ||
          (element as HTMLElement).innerHTML?.includes('voiceflow') ||
          (element as HTMLIFrameElement).src?.includes('voiceflow');

        if (isVoiceflowElement) {
          try {
            element.remove();
            removedCount++;
          } catch (error) {
            logger.warn('⚠️ Failed to remove element:', error);
          }
        }
      });
    });

    logger.info(`🗑️ Removed ${removedCount} Voiceflow DOM elements`);
  }

  /**
   * Remove Voiceflow scripts
   */
  private removeVoiceflowScripts(): void {
    const scripts = document.querySelectorAll('script[src*="voiceflow"]');
    scripts.forEach((script) => {
      try {
        if (script) {
          script.remove();
        }
      } catch (error) {
        logger.warn('⚠️ Failed to remove script:', error);
      }
    });

    const styleElement = document.getElementById('hide-voiceflow-aggressive');
    if (styleElement) {
      try {
        styleElement.remove();
      } catch (error) {
        logger.warn('⚠️ Failed to remove style element:', error);
      }
    }
  }
}

/**
 * Create controller for KP simulation
 */
export function createKPController(supabaseUserId?: string, userEmail?: string): VoiceflowController {
  return new VoiceflowController(
    {
      projectID: '6929a798906ea96d54f85c21', // KP57 Project ID (updated 2025-11-29)
      versionID: '6929a798906ea96d54f85c22', // KP57 Version ID
      url: 'https://general-runtime.voiceflow.com',
      simulationType: 'kp',
      title: 'KP Simulation Assistant',
    },
    supabaseUserId,
    userEmail
  );
}

/**
 * Create controller for FSP simulation
 */
export function createFSPController(supabaseUserId?: string, userEmail?: string): VoiceflowController {
  return new VoiceflowController(
    {
      projectID: '6929a79f906ea96d54f85c27', // FSP57 Project ID (updated 2025-11-29)
      versionID: '6929a79f906ea96d54f85c28', // FSP57 Version ID
      url: 'https://general-runtime.voiceflow.com',
      simulationType: 'fsp',
      title: 'FSP Simulation Assistant',
    },
    supabaseUserId,
    userEmail
  );
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
  logger.info('🌍 Global Voiceflow cleanup started...');

  if (typeof window !== 'undefined') {
    if (window.voiceflow?.chat) {
      try {
        window.voiceflow.chat.hide && window.voiceflow.chat.hide();
        window.voiceflow.chat.close && window.voiceflow.chat.close();
        window.voiceflow.chat.destroy && window.voiceflow.chat.destroy();
      } catch (error) {
        logger.warn('⚠️ Global Voiceflow API cleanup error:', error);
      }
    }

    // Remove all Voiceflow elements
    const selectors = [
      '[id*="voiceflow"]',
      '[class*="voiceflow"]',
      '[class*="vfrc"]',
      'iframe[src*="voiceflow"]',
      '.vfrc-widget',
    ];

    selectors.forEach((selector) => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element: Element) => element.remove());
      } catch (error) {
        logger.warn(`⚠️ Error removing elements with selector ${selector}:`, error);
      }
    });

    // Remove scripts
    const scripts = document.querySelectorAll('script[src*="voiceflow"]');
    scripts.forEach((script) => script.remove());

    // Clear global objects
    if (window.voiceflow) {
      delete (window as any).voiceflow;
    }
  }

  logger.info('✅ Global Voiceflow cleanup completed');
}

// Type declaration for window.voiceflow
declare global {
  interface Window {
    voiceflow: {
      chat: any;
    };
  }
}
