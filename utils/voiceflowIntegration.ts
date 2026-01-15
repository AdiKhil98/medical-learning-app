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
import { supabase } from '@/lib/supabase';

// =====================================================
// VOICEFLOW CONFIG FROM SUPABASE
// =====================================================

interface VoiceflowActiveConfig {
  project_id: string;
  version_id: string;
}

const configCache: { FSP?: VoiceflowActiveConfig; KP?: VoiceflowActiveConfig } = {};
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getVoiceflowConfig(type: 'FSP' | 'KP'): Promise<VoiceflowActiveConfig> {
  const now = Date.now();

  // Return cached config if still valid
  if (configCache[type] && now - cacheTimestamp < CACHE_DURATION) {
    return configCache[type]!;
  }

  try {
    const { data, error } = await supabase
      .from('voiceflow_active_config')
      .select('project_id, version_id')
      .eq('type', type)
      .single();

    if (error) throw error;

    configCache[type] = data;
    cacheTimestamp = now;
    logger.info(`[Voiceflow] Loaded ${type} config from Supabase:`, data.project_id);
    return data;
  } catch (error) {
    logger.error(`[Voiceflow] Failed to fetch ${type} config from Supabase:`, error);

    // Fallback to hardcoded values if Supabase fetch fails
    const fallbacks: Record<string, VoiceflowActiveConfig> = {
      FSP: { project_id: '6952af1c54ef7466939ba7a9', version_id: '6952af1c54ef7466939ba7aa' },
      KP: { project_id: '694efb186f20de2ac2f80300', version_id: '694efb186f20de2ac2f80301' },
    };
    logger.warn(`[Voiceflow] Using fallback ${type} config`);
    return fallbacks[type];
  }
}

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

      // Load script if not present - check for both old and new CDN URLs
      if (!document.querySelector('script[src*="cdn.voiceflow.com"]')) {
        // CRITICAL FIX: If script is gone but window.voiceflow exists (from previous session),
        // we must delete it to allow proper re-initialization. The Voiceflow bundle skips
        // initialization when window.voiceflow already exists, leaving the widget broken.
        if (window.voiceflow) {
          logger.info('🧹 Clearing stale window.voiceflow before reloading script...');
          try {
            // Try to clean up any existing widget state
            if (window.voiceflow.chat) {
              window.voiceflow.chat.destroy?.();
            }
          } catch (e) {
            logger.warn('⚠️ Error during stale widget cleanup:', e);
          }
          delete (window as any).voiceflow;
          logger.info('✅ Stale window.voiceflow cleared');
        }
        logger.info('📡 Loading Voiceflow script from CDN...');
        const script = document.createElement('script');
        // UPDATED 2026: Use official Voiceflow CDN with new widget-next
        // Legacy widget was deprecated June 2025 - must use widget-next
        // Docs: https://docs.voiceflow.com/docs/web-chat-migration
        script.src = 'https://cdn.voiceflow.com/widget-next/bundle.mjs';
        script.type = 'text/javascript';

        // Add 45-second timeout (increased from 30s for slow mobile connections)
        const timeout = setTimeout(() => {
          logger.error('❌ Voiceflow script load timeout (45s)');
          reject(new Error('Voiceflow script load timeout'));
        }, 45000);

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
   * Check if user has network connectivity
   * Returns true if online, false if offline
   */
  private isOnline(): boolean {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    return true; // Assume online if navigator.onLine not available
  }

  /**
   * Initialize widget with modern Voiceflow configuration
   * Includes network check and improved error handling for mobile
   */
  private async initializeWidget(): Promise<void> {
    if (!window.voiceflow?.chat) {
      throw new Error('Voiceflow not available');
    }

    // Check network connectivity before attempting initialization
    if (!this.isOnline()) {
      logger.error('❌ No network connection detected');
      throw new Error('No internet connection. Please check your network and try again.');
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
        logger.info('   Hashed:', `${emailForUserID.substring(0, 16)}...`);
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

      // Load the widget with timeout wrapper
      // This catches internal Voiceflow "metadata timeout" errors
      logger.info('🔄 Loading Voiceflow chat widget...');

      await this.loadWidgetWithTimeout(widgetConfig, 30000);

      // Inject CSS to ensure widget is visible and above all content
      this.injectWidgetCSS();

      this.widget = window.voiceflow.chat;
      this.isLoaded = true;

      // Setup event listeners
      this.setupEventListeners();

      // Email is encoded in userID field (see above)
      const privacyStatus = this.config.hashEmail ? '(email hashed in userID)' : '(email in userID)';
      logger.info(`✅ Widget loaded and ready with persistent IDs ${privacyStatus}`);
    } catch (error) {
      // Enhanced error handling for specific Voiceflow errors
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('metadata timeout') || errorMessage.includes('timeout')) {
        logger.error('❌ Voiceflow metadata timeout - server may be slow or unreachable');
        throw new Error(
          'Die Simulation konnte nicht geladen werden (Timeout). ' +
            'Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.'
        );
      }

      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        logger.error('❌ Network error during Voiceflow initialization');
        throw new Error('Netzwerkfehler beim Laden der Simulation. ' + 'Bitte überprüfen Sie Ihre Internetverbindung.');
      }

      logger.error('❌ Failed to initialize Voiceflow widget:', error);
      throw error;
    }
  }

  /**
   * Load widget with timeout to catch internal Voiceflow timeouts
   * Voiceflow's internal timeout error ("metadata timeout") doesn't propagate properly,
   * so we add our own timeout wrapper
   */
  private loadWidgetWithTimeout(config: any, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      let resolved = false;

      // Set up timeout
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          logger.error(`❌ Widget load timed out after ${timeoutMs}ms`);
          reject(new Error('metadata timeout'));
        }
      }, timeoutMs);

      try {
        // Attempt to load the widget
        window.voiceflow.chat.load(config);

        // Check if widget container appears (indicates successful load)
        const checkWidgetLoaded = setInterval(() => {
          const widgetContainer =
            document.getElementById('voiceflow-chat') || document.querySelector('[class*="vfrc"]');

          if (widgetContainer) {
            clearInterval(checkWidgetLoaded);
            clearTimeout(timeout);
            if (!resolved) {
              resolved = true;
              logger.info('✅ Widget container detected - load successful');
              resolve();
            }
          }
        }, 500);

        // Maximum time to wait for container check
        setTimeout(() => {
          clearInterval(checkWidgetLoaded);
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            // If no container but no error either, assume success
            // (widget might render differently)
            logger.warn('⚠️ Widget container not detected, but no error - assuming success');
            resolve();
          }
        }, timeoutMs - 1000);
      } catch (error) {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          reject(error);
        }
      }
    });
  }

  /**
   * Inject CSS to ensure Voiceflow widget is visible and above all content
   */
  private injectWidgetCSS(): void {
    try {
      // Check if CSS is already injected
      if (document.getElementById('voiceflow-widget-override-css')) {
        logger.info('✅ Voiceflow widget CSS already injected');
        return;
      }

      logger.info('💅 Injecting Voiceflow widget CSS overrides');

      const style = document.createElement('style');
      style.id = 'voiceflow-widget-override-css';
      style.textContent = `
        /* Ensure Voiceflow widget container is visible and above all content */
        #voiceflow-chat {
          position: fixed !important;
          bottom: 20px !important;
          right: 20px !important;
          z-index: 999999 !important;
          pointer-events: auto !important;
          visibility: visible !important;
          opacity: 1 !important;
          display: block !important;
        }

        /* Ensure widget iframe/button is visible */
        #voiceflow-chat iframe,
        #voiceflow-chat button,
        #voiceflow-chat > div {
          z-index: 999999 !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }

        /* Override any potential overflow hidden from parent containers */
        body {
          overflow: visible !important;
        }
      `;

      document.head.appendChild(style);
      logger.info('✅ Voiceflow widget CSS injected successfully');
    } catch (error) {
      logger.error('❌ Error injecting Voiceflow widget CSS:', error);
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

      // Track WebRTC and AudioContext for proper cleanup
      this.setupMediaTracking();
    } catch (error) {
      logger.warn('⚠️ Could not set up Voiceflow event listeners:', error);
    }
  }

  /**
   * Setup tracking for WebRTC connections and AudioContexts
   * This allows us to properly close them when ending the conversation
   */
  private setupMediaTracking(): void {
    if (typeof window === 'undefined') return;

    try {
      // Initialize tracking arrays if they don't exist
      if (!(window as any).__voiceflowPeerConnections) {
        (window as any).__voiceflowPeerConnections = [];
      }
      if (!(window as any).__voiceflowAudioContexts) {
        (window as any).__voiceflowAudioContexts = [];
      }

      // Intercept RTCPeerConnection creation
      if (typeof RTCPeerConnection !== 'undefined' && !(window as any).__rtcIntercepted) {
        const OriginalRTCPeerConnection = RTCPeerConnection;
        (window as any).RTCPeerConnection = function (...args: any[]) {
          const pc = new OriginalRTCPeerConnection(...args);
          (window as any).__voiceflowPeerConnections.push(pc);
          logger.info('📡 Tracked new RTCPeerConnection');
          return pc;
        };
        // Copy static properties
        Object.setPrototypeOf((window as any).RTCPeerConnection, OriginalRTCPeerConnection);
        (window as any).__rtcIntercepted = true;
        logger.info('✅ RTCPeerConnection tracking enabled');
      }

      // Intercept AudioContext creation
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass && !(window as any).__audioContextIntercepted) {
        const OriginalAudioContext = AudioContextClass;
        const newAudioContext = function (...args: any[]) {
          const ctx = new OriginalAudioContext(...args);
          (window as any).__voiceflowAudioContexts.push(ctx);
          logger.info('🔊 Tracked new AudioContext');
          return ctx;
        };
        if (window.AudioContext) {
          (window as any).AudioContext = newAudioContext;
        }
        if ((window as any).webkitAudioContext) {
          (window as any).webkitAudioContext = newAudioContext;
        }
        (window as any).__audioContextIntercepted = true;
        logger.info('✅ AudioContext tracking enabled');
      }
    } catch (error) {
      logger.warn('⚠️ Could not setup media tracking:', error);
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
   * End the Voiceflow conversation/voice call properly
   * This sends an 'end' event to Voiceflow's backend to terminate the session
   * MUST be called before destroy() to ensure voice calls are properly terminated
   */
  async endConversation(): Promise<boolean> {
    logger.info(`📞 VoiceflowController: Ending conversation for ${this.config.simulationType.toUpperCase()}...`);

    if (typeof window === 'undefined' || !window.voiceflow?.chat) {
      logger.warn('⚠️ Cannot end conversation - Voiceflow not available');
      return false;
    }

    try {
      // Method 1: Send 'end' interaction to terminate the conversation on Voiceflow's backend
      if (typeof window.voiceflow.chat.interact === 'function') {
        logger.info('🔚 Sending end interaction to Voiceflow...');
        await window.voiceflow.chat.interact({ type: 'end' });
        logger.info('✅ End interaction sent successfully');
      }

      // Method 2: Clear any proactive messages
      if (window.voiceflow.chat.proactive?.clear) {
        logger.info('🧹 Clearing proactive messages...');
        window.voiceflow.chat.proactive.clear();
      }

      // Method 3: Close any active voice/audio connections
      // This targets the WebRTC peer connections used by Voiceflow voice
      if (typeof RTCPeerConnection !== 'undefined') {
        logger.info('🔌 Closing WebRTC peer connections...');
        // Get all RTCPeerConnection instances and close them
        const peerConnections = (window as any).__voiceflowPeerConnections || [];
        peerConnections.forEach((pc: RTCPeerConnection) => {
          if (pc && pc.connectionState !== 'closed') {
            pc.close();
            logger.info('✅ Closed RTCPeerConnection');
          }
        });
      }

      // Method 4: Stop all audio contexts (used by voice widgets)
      if (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined') {
        logger.info('🔇 Closing audio contexts...');
        const audioContexts = (window as any).__voiceflowAudioContexts || [];
        audioContexts.forEach((ctx: AudioContext) => {
          if (ctx && ctx.state !== 'closed') {
            ctx.close();
            logger.info('✅ Closed AudioContext');
          }
        });
      }

      // Small delay to ensure the end event is processed
      await new Promise((resolve) => setTimeout(resolve, 300));

      logger.info('✅ Conversation ended successfully');
      return true;
    } catch (error) {
      logger.error('❌ Error ending conversation:', error);
      return false;
    }
  }

  /**
   * Clean up widget properly (synchronous version for backward compatibility)
   * For proper voice call termination, call endConversation() first
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

          // Try to end conversation synchronously (best effort)
          if (typeof window.voiceflow.chat.interact === 'function') {
            try {
              window.voiceflow.chat.interact({ type: 'end' });
              logger.info('📞 Sent end interaction (sync)');
            } catch (e) {
              logger.warn('⚠️ Could not send end interaction:', e);
            }
          }

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
   * Async version of destroy that properly ends the conversation first
   * This is the RECOMMENDED method for ending simulations as it ensures
   * the voice call is properly terminated on Voiceflow's backend
   */
  async destroyAsync(): Promise<void> {
    logger.info(`🧹 VoiceflowController: Starting ASYNC cleanup for ${this.config.simulationType.toUpperCase()}...`);

    // Step 1: End the conversation on Voiceflow's backend
    await this.endConversation();

    // Step 2: Stop all media streams
    this.stopAllMediaStreams();

    // Step 3: Close all tracked WebRTC connections
    await this.closeAllWebRTCConnections();

    // Step 4: Close all tracked AudioContexts
    await this.closeAllAudioContexts();

    // Step 5: Run the synchronous cleanup
    this.destroy();

    logger.info('✅ VoiceflowController ASYNC cleanup completed');
  }

  /**
   * Close all tracked WebRTC peer connections
   */
  private async closeAllWebRTCConnections(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const peerConnections = (window as any).__voiceflowPeerConnections || [];
      logger.info(`🔌 Closing ${peerConnections.length} WebRTC connections...`);

      for (const pc of peerConnections) {
        if (pc && pc.connectionState !== 'closed') {
          try {
            // Stop all tracks first
            pc.getSenders?.().forEach((sender: RTCRtpSender) => {
              if (sender.track) {
                sender.track.stop();
              }
            });
            pc.getReceivers?.().forEach((receiver: RTCRtpReceiver) => {
              if (receiver.track) {
                receiver.track.stop();
              }
            });
            // Close the connection
            pc.close();
            logger.info('✅ Closed RTCPeerConnection');
          } catch (e) {
            logger.warn('⚠️ Error closing RTCPeerConnection:', e);
          }
        }
      }

      // Clear the tracking array
      (window as any).__voiceflowPeerConnections = [];
    } catch (error) {
      logger.warn('⚠️ Error closing WebRTC connections:', error);
    }
  }

  /**
   * Close all tracked AudioContexts
   */
  private async closeAllAudioContexts(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const audioContexts = (window as any).__voiceflowAudioContexts || [];
      logger.info(`🔇 Closing ${audioContexts.length} AudioContexts...`);

      for (const ctx of audioContexts) {
        if (ctx && ctx.state !== 'closed') {
          try {
            await ctx.close();
            logger.info('✅ Closed AudioContext');
          } catch (e) {
            logger.warn('⚠️ Error closing AudioContext:', e);
          }
        }
      }

      // Clear the tracking array
      (window as any).__voiceflowAudioContexts = [];
    } catch (error) {
      logger.warn('⚠️ Error closing AudioContexts:', error);
    }
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
 * Now fetches project/version IDs from Supabase with fallback to hardcoded values
 */
export async function createKPController(supabaseUserId?: string, userEmail?: string): Promise<VoiceflowController> {
  const kpConfig = await getVoiceflowConfig('KP');

  return new VoiceflowController(
    {
      projectID: kpConfig.project_id,
      versionID: kpConfig.version_id,
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
 * Now fetches project/version IDs from Supabase with fallback to hardcoded values
 */
export async function createFSPController(supabaseUserId?: string, userEmail?: string): Promise<VoiceflowController> {
  const fspConfig = await getVoiceflowConfig('FSP');

  return new VoiceflowController(
    {
      projectID: fspConfig.project_id,
      versionID: fspConfig.version_id,
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
