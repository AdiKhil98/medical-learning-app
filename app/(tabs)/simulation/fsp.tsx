import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mic, Clock, Lock, HelpCircle } from 'lucide-react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createFSPController, VoiceflowController, globalVoiceflowCleanup } from '@/utils/voiceflowIntegration';
import {
  stopGlobalVoiceflowCleanup,
  disableVoiceflowCleanup,
  enableVoiceflowCleanup,
} from '@/utils/globalVoiceflowCleanup';
import { simulationTracker } from '@/lib/simulationTrackingService';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeRequiredModal } from '@/components/UpgradeRequiredModal';
import FlashcardCarousel from '@/components/ui/FlashcardCarousel';
import QuotaExhaustedCard from '@/components/simulation/QuotaExhaustedCard';
import {
  SIMULATION_DURATION_SECONDS,
  USAGE_THRESHOLD_SECONDS,
  WARNING_5_MIN_REMAINING,
} from '@/constants/simulationConstants';
import { withErrorBoundary } from '@/components/withErrorBoundary';
import { colors } from '@/constants/colors';

// CRITICAL FIX: Track burned tokens to prevent reuse after cleanup failure
// Module-level Set persists across component re-renders within the same app session
const burnedTokens = new Set<string>();

function FSPSimulationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { canUseSimulation, subscriptionStatus, recordUsage, getSubscriptionInfo, checkAccess, resetOptimisticCount } =
    useSubscription(user?.id);
  const voiceflowController = useRef<VoiceflowController | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const timerActiveRef = useRef(false); // Ref to track timer state for closures
  const timerStartLockRef = useRef(false); // Atomic lock to prevent race conditions in timer start
  const [timeRemaining, setTimeRemaining] = useState(SIMULATION_DURATION_SECONDS); // 15 minutes in seconds
  const [timerEndTime, setTimerEndTime] = useState(0); // Absolute timestamp when timer should end
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const timerEndTimeRef = useRef<number>(0); // Ref for end time to avoid closure issues on mobile
  const previousTimeRef = useRef<number>(SIMULATION_DURATION_SECONDS); // Track previous time value for comparisons
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const sessionTokenRef = useRef<string | null>(null); // Ref for sessionToken to avoid closure issues
  const [usageMarked, setUsageMarked] = useState(false); // Track if we've marked usage at 10min
  const usageMarkedRef = useRef(false); // Ref to track usage marked state for cleanup closure
  // NOTE: heartbeatInterval removed - deprecated/no-op in new system
  // CRITICAL FIX: Cache auth session for synchronous access in beforeunload handler
  const cachedAuthSessionRef = useRef<{ access_token: string; user_id: string } | null>(null);

  // Timer warning system state
  const [timerWarningLevel, setTimerWarningLevel] = useState<'normal' | 'yellow' | 'orange' | 'red'>('normal');
  const [showWarningMessage, setShowWarningMessage] = useState(false);
  const [warningMessageText, setWarningMessageText] = useState('');
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Graceful end system state
  const [showFinalWarningModal, setShowFinalWarningModal] = useState(false);
  const [finalWarningCountdown, setFinalWarningCountdown] = useState(10);
  const [isGracefulShutdown, setIsGracefulShutdown] = useState(false);
  const [showSimulationCompleted, setShowSimulationCompleted] = useState(false);
  const finalCountdownInterval = useRef<NodeJS.Timeout | null>(null);

  // Early completion state
  const [showEarlyCompletionModal, setShowEarlyCompletionModal] = useState(false);
  const [earlyCompletionReason, setEarlyCompletionReason] = useState('');

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Cleanup coordination flag
  const isCleaningUpRef = useRef(false);

  // CRITICAL FIX: Session recovery lock to prevent race conditions
  const isRecoveringSessionRef = useRef(false);

  // CRITICAL FIX: Track tab visibility for timer continuation warning
  const tabHiddenTimeRef = useRef<number | null>(null);
  const lastVisibilityWarningRef = useRef<number>(0);

  // Lock state for when limit is reached
  const [isSimulationLocked, setIsSimulationLocked] = useState(false);

  // Tutorial visibility state
  const [showTutorial, setShowTutorial] = useState(true);
  const TUTORIAL_STORAGE_KEY = 'fsp_simulation_tutorial_dismissed';

  // Load tutorial visibility preference from localStorage
  useEffect(() => {
    const loadTutorialPreference = async () => {
      try {
        const dismissed = await AsyncStorage.getItem(TUTORIAL_STORAGE_KEY);
        if (dismissed === 'true') {
          setShowTutorial(false);
        }
      } catch (error) {
        console.error('Error loading tutorial preference:', error);
      }
    };
    loadTutorialPreference();
  }, []);

  // Handle tutorial dismiss
  const handleDismissTutorial = async () => {
    try {
      await AsyncStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
      setShowTutorial(false);
      console.log('✅ Tutorial dismissed and preference saved');
    } catch (error) {
      console.error('Error saving tutorial preference:', error);
    }
  };

  // Handle tutorial show (when help button is clicked)
  const handleShowTutorial = () => {
    setShowTutorial(true);
  };

  // Disable global Voiceflow cleanup as soon as component mounts
  useEffect(() => {
    console.log('🛑 FSP: Component mounted - disabling global Voiceflow cleanup');
    disableVoiceflowCleanup();
    stopGlobalVoiceflowCleanup();
  }, []);

  // PAGE-LEVEL ACCESS CONTROL: Check access when page loads
  // SESSION RECOVERY: Check for active session before resetting optimistic count
  useEffect(() => {
    console.log('🚀🚀🚀 FSP SESSION RECOVERY: useEffect triggered!');
    const recoverOrResetSession = async () => {
      // CRITICAL FIX: Set recovery lock to prevent race with start timer
      isRecoveringSessionRef.current = true;

      try {
        console.log('🔍 FSP SESSION RECOVERY: Starting recovery function...');
        console.log('[FSP Session Recovery] Checking for active simulation session...');

        // Check if there's a saved session token in SecureStore
        const savedToken = await SecureStore.getItemAsync('sim_session_token_fsp');
        const savedStartTime = await AsyncStorage.getItem('sim_start_time_fsp');

        console.log('[FSP Session Recovery] Storage check:', {
          hasToken: !!savedToken,
          hasStartTime: !!savedStartTime,
        });

        if (savedToken && savedStartTime) {
          console.log('[FSP Session Recovery] Found saved session:', {
            token: `${savedToken.substring(0, 8)}...`,
            startTime: new Date(parseInt(savedStartTime)).toISOString(),
          });

          // CRITICAL FIX: Check if token was already used to end a simulation
          if (burnedTokens.has(savedToken)) {
            console.log('[FSP Session Recovery] ⚠️ Token already burned (session ended), skipping recovery');
            console.log('[FSP Session Recovery] Cleaning up burned token from storage...');
            await SecureStore.deleteItemAsync('sim_session_token_fsp').catch(() => {});
            await AsyncStorage.multiRemove(['sim_start_time_fsp', 'sim_end_time_fsp', 'sim_duration_ms_fsp']).catch(
              () => {}
            );
            resetOptimisticCount();
            return;
          }

          // Verify session is still active in database
          const status = await simulationTracker.getSimulationStatus(savedToken);
          console.log('[FSP Session Recovery] Database status:', status);

          if (status && !status.ended_at) {
            const elapsed = Date.now() - parseInt(savedStartTime);
            const remaining = SIMULATION_DURATION_SECONDS * 1000 - elapsed;

            if (remaining > 0) {
              // Active session exists - KEEP optimistic state and potentially resume
              console.log('[FSP Session Recovery] ✅ Active session found!', {
                elapsed: `${Math.floor(elapsed / 1000)}s`,
                remaining: `${Math.floor(remaining / 1000)}s`,
                counted: status.counted_toward_usage,
              });

              // REMOVED: Optimistic deduction (new quota system handles this automatically)
              // The quota is already updated in database if simulation was counted

              // Set session token for potential continuation
              setSessionToken(savedToken);
              sessionTokenRef.current = savedToken;

              // Update usage marked state if already counted
              if (status.counted_toward_usage) {
                setUsageMarked(true);
                usageMarkedRef.current = true;
              }

              console.log('[FSP Session Recovery] ✅ Session state restored. User can continue or start fresh.');
              return; // Don't reset optimistic count
            } else {
              console.log('[FSP Session Recovery] Session expired (time exceeded), cleaning up...');
            }
          } else {
            console.log('[FSP Session Recovery] Session already ended in database, cleaning up...');
          }
        } else {
          console.log('[FSP Session Recovery] No saved session found');
        }

        // No active session found - clear storage and reset optimistic count
        console.log('[FSP Session Recovery] Clearing stale session data and resetting counter...');
        await SecureStore.deleteItemAsync('sim_session_token_fsp').catch(() => {});
        await AsyncStorage.multiRemove(['sim_start_time_fsp', 'sim_end_time_fsp', 'sim_duration_ms_fsp']).catch(
          () => {}
        );

        console.log('[FSP Session Recovery] Calling resetOptimisticCount()...');
        resetOptimisticCount();
        console.log('[FSP Session Recovery] ✅ Recovery complete');
      } catch (error) {
        console.error('[FSP Session Recovery] ❌ Error during recovery:', error);
        // On error, safe default: reset optimistic count
        resetOptimisticCount();
      } finally {
        // CRITICAL FIX: Always clear recovery lock
        isRecoveringSessionRef.current = false;
        console.log('[FSP Session Recovery] 🔓 Recovery lock released');
      }
    };

    recoverOrResetSession();
  }, [resetOptimisticCount]);

  // Monitor subscription status for lock state
  useEffect(() => {
    console.log('[Lock Monitor] FSP: useEffect triggered', {
      hasSubscriptionStatus: !!subscriptionStatus,
      canUse: subscriptionStatus?.canUseSimulation,
      remaining: subscriptionStatus?.remainingSimulations,
      currentLockState: isSimulationLocked,
    });

    if (subscriptionStatus) {
      const shouldLock = !subscriptionStatus.canUseSimulation;
      console.log('[Lock Monitor] FSP: Subscription status changed:', {
        canUse: subscriptionStatus.canUseSimulation,
        remaining: subscriptionStatus.remainingSimulations,
        shouldLock,
        willUpdateLockState: shouldLock !== isSimulationLocked,
      });

      if (shouldLock !== isSimulationLocked) {
        console.log(`[Lock Monitor] FSP: 🔒 Setting lock state to: ${shouldLock}`);
        setIsSimulationLocked(shouldLock);
      }

      // If locked and timer is active, show warning
      if (shouldLock && timerActive) {
        console.warn('[Lock Monitor] FSP: ⚠️ User ran out of simulations during active session!');
        // Note: Don't stop the current simulation, just prevent new ones
      }
    } else {
      console.warn('[Lock Monitor] FSP: No subscription status available yet');
    }
  }, [subscriptionStatus, timerActive, isSimulationLocked]);

  // CRITICAL FIX: Cache auth session for use in beforeunload handler
  useEffect(() => {
    const cacheAuthSession = async () => {
      if (user?.id) {
        try {
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();
          if (session?.access_token && !error) {
            cachedAuthSessionRef.current = {
              access_token: session.access_token,
              user_id: user.id,
            };
            console.log('✅ FSP: Auth session cached for beforeunload handler');
          } else {
            console.warn('⚠️ FSP: Failed to cache auth session:', error);
          }
        } catch (err) {
          console.error('❌ FSP: Error caching auth session:', err);
        }
      }
    };

    cacheAuthSession();

    // Re-cache when user changes
  }, [user]);

  // Add state for initialization tracking
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const initializationAttemptsRef = useRef(0);
  const hasInitializedRef = useRef(false); // Prevent double initialization
  const maxRetryAttempts = 3;

  // Initialize Voiceflow widget when component mounts
  useEffect(() => {
    const initializeVoiceflow = async () => {
      const timestamp = new Date().toISOString();

      // ============================================
      // PREVENT DOUBLE INITIALIZATION
      // ============================================
      if (hasInitializedRef.current) {
        console.log(`⚠️ [${timestamp}] Skipping initialization - already initialized`);
        return;
      }

      // ============================================
      // STEP 1: VALIDATE USER DATA
      // ============================================
      console.log(`🔐 [${timestamp}] Step 1: Validating user data...`);

      if (typeof window === 'undefined') {
        console.error(`❌ [${timestamp}] Window object not available - must run in browser`);
        setInitializationError('Initialization failed: Not running in browser environment');
        return;
      }

      if (!user) {
        console.warn(`⏳ [${timestamp}] User object not loaded yet, waiting...`);
        // Don't show error - user might still be loading
        // The useEffect will re-run when user loads (it's in dependencies)
        return;
      }

      if (!user.id) {
        console.error(`❌ [${timestamp}] User object exists but user.id is missing:`, user);
        setInitializationError('User ID not found');
        Alert.alert('Authentifizierungsfehler', 'Benutzer-ID fehlt. Bitte melden Sie sich erneut an.', [
          { text: 'OK', onPress: () => router.push('/(tabs)/simulation') },
        ]);
        return;
      }

      console.log(`✅ [${timestamp}] User validated - ID: ${user.id}`);

      // ============================================
      // STEP 2: CHECK ACCESS PERMISSIONS
      // ============================================
      console.log(`🔒 [${timestamp}] Step 2: Checking access permissions...`);

      try {
        const accessCheck = await checkAccess();

        if (!accessCheck) {
          console.error(`❌ [${timestamp}] Access check returned null/undefined`);
          setInitializationError('Failed to verify access permissions');
          Alert.alert(
            'Zugriffsfehler',
            'Zugriffsberechtigungen konnten nicht überprüft werden. Bitte versuchen Sie es erneut.',
            [{ text: 'OK' }]
          );
          return;
        }

        console.log(`📊 [${timestamp}] Access check result:`, {
          canUse: accessCheck.canUseSimulation,
          remaining: accessCheck.remainingSimulations,
          limit: accessCheck.simulationLimit,
        });

        if (!accessCheck.canUseSimulation || accessCheck.remainingSimulations === 0) {
          console.log(`🚫 [${timestamp}] Blocking Voiceflow initialization - no simulations remaining`);
          setInitializationError('No simulations remaining');
          return; // Do NOT initialize widget
        }

        console.log(`✅ [${timestamp}] Access granted - ${accessCheck.remainingSimulations} simulations remaining`);
      } catch (accessError) {
        console.error(`❌ [${timestamp}] Error checking access:`, accessError);
        setInitializationError('Access check failed');
        Alert.alert(
          'Zugriffsfehler',
          'Fehler beim Überprüfen der Zugriffsberechtigungen. Bitte versuchen Sie es erneut.',
          [{ text: 'OK' }]
        );
        return;
      }

      // ============================================
      // STEP 3: INITIALIZE WITH RETRY LOGIC (WEB ONLY)
      // ============================================
      if (Platform.OS === 'web') {
        console.log(`🚀 [${timestamp}] Step 3: Starting Voiceflow initialization with retry logic...`);
        await initializeWithRetry(user.id, timestamp);
      } else {
        console.log(`📱 [${timestamp}] Mobile platform detected - Voiceflow widget only available on web`);
      }
    };

    initializeVoiceflow();

    // Cleanup function to reset initialization flag on unmount
    return () => {
      hasInitializedRef.current = false;
    };
  }, [checkAccess, user]);

  // Enhanced initialization with retry logic and exponential backoff
  const initializeWithRetry = async (userId: string, initialTimestamp: string) => {
    for (let attempt = 1; attempt <= maxRetryAttempts; attempt++) {
      const timestamp = new Date().toISOString();

      try {
        console.log(`🔄 [${timestamp}] Attempt ${attempt}/${maxRetryAttempts}: Initializing Voiceflow...`);
        setIsInitializing(true);
        setInitializationError(null);
        initializationAttemptsRef.current = attempt;

        // Disable global cleanup to allow widget
        console.log(`🛑 [${timestamp}] Disabling global Voiceflow cleanup`);
        disableVoiceflowCleanup();
        stopGlobalVoiceflowCleanup();

        // ============================================
        // STEP 3A: GENERATE SESSION TOKEN
        // ============================================
        console.log(`🔑 [${timestamp}] Step 3a: Generating session token before Voiceflow initialization`);

        const result = await simulationTracker.startSimulation('fsp');

        console.log(`📋 [${timestamp}] Session token generation result:`, {
          success: result.success,
          hasToken: !!result.sessionToken,
          error: result.error || 'none',
        });

        if (!result.success || !result.sessionToken) {
          throw new Error(`Session token generation failed: ${result.error || 'Unknown error'}`);
        }

        console.log(
          `✅ [${timestamp}] Session token generated successfully: ${result.sessionToken.substring(0, 8)}...`
        );

        setSessionToken(result.sessionToken);
        sessionTokenRef.current = result.sessionToken;

        // ============================================
        // STEP 3B: CREATE VOICEFLOW CONTROLLER
        // ============================================
        console.log(`🎮 [${timestamp}] Step 3b: Creating Voiceflow controller with Supabase user ID and email`);
        console.log(`📧 [${timestamp}] User object:`, {
          id: user.id,
          email: user.email,
          has_email: !!user.email,
          email_type: typeof user.email,
        });

        // FALLBACK: If email is not in user object, try to get it from Supabase session
        let userEmail = user.email;
        if (!userEmail) {
          console.warn(`⚠️ [${timestamp}] Email not found in user object, fetching from Supabase session...`);
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user?.email) {
            userEmail = session.user.email;
            console.log(`✅ [${timestamp}] Email retrieved from session: ${userEmail}`);
          } else {
            console.error(`❌ [${timestamp}] Could not retrieve email from session!`);
          }
        }

        const controller = createFSPController(user.id, userEmail);

        if (!controller) {
          throw new Error('Failed to create Voiceflow controller - returned null/undefined');
        }

        voiceflowController.current = controller;
        console.log(`✅ [${timestamp}] Voiceflow controller created successfully`);

        // ============================================
        // STEP 3C: INITIALIZE VOICEFLOW WITH PERSISTENT IDS
        // ============================================
        console.log(`🔗 [${timestamp}] Step 3c: Initializing Voiceflow with persistent session IDs`);

        // Get persistent IDs that will be used
        const persistentIds = controller.getIds();
        console.log(`📤 [${timestamp}] Persistent IDs:`, {
          user_id: persistentIds.user_id,
          session_id: persistentIds.session_id,
        });

        const initialized = await controller.initialize();

        if (!initialized) {
          throw new Error('Voiceflow initialization returned false');
        }

        console.log(`✅ [${timestamp}] Voiceflow initialized successfully with user credentials`);

        // ============================================
        // STEP 3D: VERIFY VOICEFLOW API AVAILABILITY
        // ============================================
        console.log(`🔍 [${timestamp}] Step 3d: Verifying Voiceflow API availability`);

        if (!window.voiceflow) {
          throw new Error('Voiceflow API not available on window object after initialization');
        }

        if (!window.voiceflow.chat) {
          throw new Error('Voiceflow chat API not available after initialization');
        }

        console.log(`✅ [${timestamp}] Voiceflow API verified and available`);

        // ============================================
        // STEP 3E: MAKE WIDGET VISIBLE
        // ============================================
        console.log(`👁️ [${timestamp}] Step 3e: Making widget visible`);

        setTimeout(() => {
          try {
            if (window.voiceflow?.chat) {
              window.voiceflow.chat.show();
              console.log(`✅ [${timestamp}] Widget made visible successfully`);
            } else {
              console.warn(`⚠️ [${timestamp}] Voiceflow chat API not available during visibility check`);
            }
          } catch (visibilityError) {
            console.error(`❌ [${timestamp}] Error making widget visible:`, visibilityError);
          }
        }, 1000);

        // ============================================
        // STEP 3F: SET UP CONVERSATION MONITORING
        // ============================================
        console.log(`📡 [${timestamp}] Step 3f: Setting up conversation monitoring`);
        setupConversationMonitoring();
        console.log(`✅ [${timestamp}] Conversation monitoring initialized`);

        // ============================================
        // STEP 3G: ADD VOICEFLOW MESSAGE LISTENER
        // ============================================
        console.log(`🎧 [${timestamp}] Step 3g: Adding Voiceflow message event listener`);

        if (window.voiceflow?.chat) {
          // Listen for Voiceflow events (if available in the API)
          const voiceflowEventListener = (event: any) => {
            console.log(`💬 [${new Date().toISOString()}] Voiceflow event received:`, {
              type: event.type,
              timestamp: new Date().toISOString(),
              hasUserData: !!event.user_id,
              hasSessionToken: !!event.session_token,
            });
          };

          // Try to add event listener if supported
          try {
            if (typeof window.voiceflow.chat.on === 'function') {
              window.voiceflow.chat.on('message', voiceflowEventListener);
              console.log(`✅ [${timestamp}] Voiceflow message listener added`);
            } else {
              console.log(`ℹ️ [${timestamp}] Voiceflow event listener API not available`);
            }
          } catch (listenerError) {
            console.warn(`⚠️ [${timestamp}] Could not add Voiceflow event listener:`, listenerError);
          }
        }

        // ============================================
        // SUCCESS - RESET ERROR STATE
        // ============================================
        console.log(`🎉 [${timestamp}] ========================================`);
        console.log(`🎉 [${timestamp}] VOICEFLOW INITIALIZATION SUCCESSFUL!`);
        console.log(`🎉 [${timestamp}] User ID: ${userId}`);
        console.log(`🎉 [${timestamp}] Session Token: ${result.sessionToken.substring(0, 8)}...`);
        console.log(`🎉 [${timestamp}] Attempts needed: ${attempt}/${maxRetryAttempts}`);
        console.log(`🎉 [${timestamp}] ========================================`);

        // Mark as successfully initialized to prevent re-initialization
        hasInitializedRef.current = true;

        setIsInitializing(false);
        setInitializationError(null);
        return; // Success - exit retry loop
      } catch (error) {
        const timestamp = new Date().toISOString();
        const errorMessage = error instanceof Error ? error.message : String(error);

        console.error(`❌ [${timestamp}] Attempt ${attempt}/${maxRetryAttempts} failed:`, {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        });

        // If this was the last attempt, show error to user
        if (attempt === maxRetryAttempts) {
          console.error(`🚨 [${timestamp}] All ${maxRetryAttempts} initialization attempts failed`);

          setIsInitializing(false);
          setInitializationError(errorMessage);

          Alert.alert(
            'Initialisierungsfehler',
            `Voiceflow konnte nach ${maxRetryAttempts} Versuchen nicht initialisiert werden.\n\nFehler: ${errorMessage}\n\nBitte versuchen Sie es später erneut.`,
            [
              { text: 'Schließen', style: 'cancel' },
              {
                text: 'Erneut versuchen',
                onPress: () => {
                  hasInitializedRef.current = false;
                  initializeWithRetry(userId, initialTimestamp);
                },
              },
            ]
          );
          return;
        }

        // Not the last attempt - calculate backoff delay and retry
        const backoffDelay = attempt * 1000; // 1s, 2s, 3s
        console.log(`⏳ [${timestamp}] Retrying in ${backoffDelay}ms...`);

        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }
  };

  // Set up monitoring for conversation start
  const setupConversationMonitoring = () => {
    console.log('🔍 FSP: Setting up passive microphone detection...');

    // MEMORY LEAK FIX: Track listeners for cleanup
    const trackListeners: { track: MediaStreamTrack; handler: () => void }[] = [];
    (window as any).fspTrackListeners = trackListeners;

    // Method 1: Monitor for MediaStream creation and termination
    const originalGetUserMedia = navigator.mediaDevices?.getUserMedia;
    if (originalGetUserMedia) {
      navigator.mediaDevices.getUserMedia = async function (constraints) {
        console.log('🎤 FSP: MediaStream requested with constraints:', constraints);

        if (constraints?.audio) {
          try {
            const stream = await originalGetUserMedia.call(this, constraints);

            // Start timer when audio stream is granted
            if (!timerActiveRef.current) {
              console.log('🎯 FSP: Audio stream granted - voice call starting!');
              console.log('⏰ FSP: Starting 20-minute timer due to voice call');
              startSimulationTimer();
            } else {
              console.log('⏰ FSP: Timer already active, not starting again');
            }

            // Monitor stream tracks for when they end
            const audioTracks = stream.getAudioTracks();
            audioTracks.forEach((track, index) => {
              console.log(`🎤 FSP: Monitoring audio track ${index + 1}`);

              // MEMORY LEAK FIX: Store handler reference for cleanup
              const endedHandler = () => {
                console.log(`🔇 FSP: Audio track ${index + 1} ended - AUTOMATICALLY STOPPING TIMER`);

                // Automatically stop the timer when the call ends
                if (timerActiveRef.current) {
                  console.log(`⏹️ FSP: Call ended naturally - stopping simulation timer automatically`);
                  stopSimulationTimer('completed');
                }
              };

              track.addEventListener('ended', endedHandler);
              trackListeners.push({ track, handler: endedHandler });

              // Also monitor for track being stopped manually
              const originalStop = track.stop.bind(track);
              track.stop = () => {
                console.log(`🔇 FSP: Audio track ${index + 1} stopped manually - AUTOMATICALLY STOPPING TIMER`);
                originalStop();

                // Automatically stop the timer when the call ends
                if (timerActiveRef.current) {
                  console.log(`⏹️ FSP: Call ended - stopping simulation timer automatically`);
                  stopSimulationTimer('completed');
                }
              };
            });

            return stream;
          } catch (error) {
            console.log('❌ FSP: Failed to get audio stream:', error);
            throw error;
          }
        }

        return originalGetUserMedia.call(this, constraints);
      };
    }

    // Method 2: Simple click detection as backup
    const clickListener = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Only trigger on voiceflow-chat container clicks
      if (target.closest('#voiceflow-chat') && !timerActive) {
        console.log('🎯 FSP: Click detected on Voiceflow widget - waiting for voice call...');
        // Don't start timer immediately, wait for actual mic access
      }
    };

    document.addEventListener('click', clickListener, true);

    // Store references for cleanup
    (window as any).fspClickListener = clickListener;
    (window as any).fspOriginalGetUserMedia = originalGetUserMedia;
  };

  // Start the 20-minute simulation timer
  const startSimulationTimer = async () => {
    console.log(
      '🔍 DEBUG: startSimulationTimer called, timerActive:',
      timerActive,
      'timerActiveRef:',
      timerActiveRef.current,
      'sessionToken:',
      sessionTokenRef.current
    );

    // CRITICAL: Atomic lock to prevent race conditions
    // Check and set lock in one operation BEFORE any async operations
    if (timerStartLockRef.current) {
      console.log('🔒 RACE CONDITION PREVENTED: Timer start already in progress, blocking concurrent call');
      return;
    }

    // CRITICAL FIX: Block if session recovery is still in progress
    if (isRecoveringSessionRef.current) {
      console.log('🔒 RACE CONDITION PREVENTED: Session recovery in progress, blocking timer start');
      Alert.alert('Bitte warten', 'Sitzungswiederherstellung läuft... Bitte versuchen Sie es in einem Moment erneut.', [
        { text: 'OK' },
      ]);
      return;
    }

    timerStartLockRef.current = true; // Set lock immediately

    try {
      // STEP 7: STRICT ACCESS CHECK - Verify access before starting timer
      console.log('[Timer] Attempting to start timer...');
      const accessCheck = await checkAccess();

      console.log('[Timer] Access check:', {
        canStart: accessCheck?.canUseSimulation,
        remaining: accessCheck?.remainingSimulations,
        total: accessCheck?.simulationLimit,
      });

      // CRITICAL: Block if access is denied
      if (!accessCheck || !accessCheck.canUseSimulation) {
        console.error('[Timer] ❌ ACCESS DENIED - Cannot start simulation');
        console.error('[Timer] Reason:', accessCheck?.message || 'Unknown');

        // Show upgrade modal
        setShowUpgradeModal(true);
        setIsSimulationLocked(true);

        Alert.alert('Simulationslimit erreicht', accessCheck?.message || 'Sie haben Ihr Simulationslimit erreicht.', [
          {
            text: 'Upgrade',
            onPress: () => router.push('subscription' as any),
          },
          { text: 'OK' },
        ]);

        return; // BLOCK timer start
      }

      // Access granted - proceed with timer
      console.log('[Timer] ✅ Access GRANTED - Starting timer...');

      // CRITICAL: Check if session token already exists (generated during initialization)
      if (!sessionTokenRef.current) {
        console.error('❌ FSP: No session token found - this should have been generated during initialization');
        return;
      }

      console.log('✅ FSP: Using existing session token from initialization:', sessionTokenRef.current);

      // IMPORTANT: Check if timer is ACTUALLY active by checking the interval, not just the ref
      // This prevents false positives from stale state
      if (timerActiveRef.current && timerInterval.current !== null) {
        console.log('🔍 DEBUG: Timer already active (ref + interval exists), returning early');
        return;
      }

      // If ref is true but interval is null, we have stale state - reset it
      if (timerActiveRef.current && timerInterval.current === null) {
        console.warn('⚠️ FSP: Detected stale timer state, resetting...');
        timerActiveRef.current = false;
        setTimerActive(false);
      }

      console.log('⏰ FSP: Starting 20-minute simulation timer');
      console.log('🔍 FSP DEBUG: Current timerActive state:', timerActive);
      console.log('🔍 FSP DEBUG: Current timerActiveRef:', timerActiveRef.current);
      console.log('🔍 FSP DEBUG: Current timerInterval:', timerInterval.current);

      // CRITICAL FIX: Activate timer BEFORE async database calls
      // This ensures the timer always starts when audio is granted, regardless of DB call success/failure
      // Force state update immediately with flushSync-like behavior
      console.log('🔍 FSP DEBUG: About to call setTimerActive(true)');

      // Set ref FIRST to prevent race conditions
      timerActiveRef.current = true;
      previousTimeRef.current = 20 * 60;

      // Then update React state
      setTimerActive(true);
      setTimeRemaining(20 * 60);

      console.log('🔍 FSP DEBUG: Timer state updated - timerActiveRef:', timerActiveRef.current);

      // Calculate absolute end time for the timer
      const startTime = Date.now();
      const duration = 20 * 60 * 1000;
      const endTime = startTime + duration;
      setTimerEndTime(endTime);
      timerEndTimeRef.current = endTime;

      console.log('✅ FSP: Timer activated - using existing session token from initialization');

      // Session token already created during initialization - just use it
      const existingSessionToken = sessionTokenRef.current;

      if (!existingSessionToken) {
        console.error(
          '❌ FSP: No session token found - this should not happen as token is created during initialization'
        );
        return;
      }

      console.log(`🔑 FSP: Using session token from initialization: ${existingSessionToken.substring(0, 8)}...`);

      // Initialize usage tracking state
      setUsageMarked(false);
      usageMarkedRef.current = false;

      // CRITICAL FIX: Set timer start time in database
      // This ensures duration is calculated from when timer actually starts, not session creation
      try {
        const { data: timerStartResult, error: timerStartError } = await supabase.rpc('set_simulation_timer_start', {
          p_session_token: sessionTokenRef.current,
          p_user_id: user.id,
        });

        if (timerStartError) {
          console.error('❌ FSP: Error setting timer start time:', timerStartError);
        } else if (timerStartResult?.success) {
          console.log('✅ FSP: Timer start time recorded in database');
        } else {
          console.warn('⚠️ FSP: Timer start time not set:', timerStartResult?.message);
        }
      } catch (error) {
        console.error('❌ FSP: Exception setting timer start time:', error);
      }

      // REMOVED: Optimistic deduction (causes premature quota exceeded lock)
      // New quota system updates in real-time via database triggers
      // No need for optimistic UI - actual count will update when simulation ends

      // FIX: Save simulation state using AsyncStorage (non-sensitive) and SecureStore (sensitive data)
      try {
        // Non-sensitive data - use AsyncStorage
        await AsyncStorage.multiSet([
          ['sim_start_time_fsp', startTime.toString()],
          ['sim_end_time_fsp', endTime.toString()],
          ['sim_duration_ms_fsp', duration.toString()],
        ]);

        // Sensitive data - use SecureStore (encrypted storage)
        await SecureStore.setItemAsync('sim_session_token_fsp', existingSessionToken);
        if (user?.id) {
          await SecureStore.setItemAsync('sim_user_id_fsp', user.id);
        }

        console.log('💾 FSP: Saved simulation state securely (AsyncStorage + SecureStore)');
      } catch (error) {
        console.error('❌ FSP: Error saving simulation state:', error);
      }

      // NOTE: Heartbeat monitoring removed - deprecated/no-op in new system

      console.log('🔍 DEBUG: Creating timer interval with absolute time calculation, endTime:', endTime);
      // Use 1000ms interval for mobile compatibility
      timerInterval.current = setInterval(() => {
        // Calculate remaining time based on absolute end time (use ref to avoid closure issues)
        const currentEndTime = timerEndTimeRef.current || endTime;
        const remaining = currentEndTime - Date.now();
        const remainingSeconds = Math.floor(remaining / 1000);

        // Get previous value for comparison
        const prev = previousTimeRef.current;

        // Update time remaining
        if (remaining <= 0) {
          setTimeRemaining(0);
          previousTimeRef.current = 0;
          clearInterval(timerInterval.current!);
          timerInterval.current = null;
          console.log('⏰ FSP: Timer finished - 20 minutes elapsed');
          console.log('🔚 FSP: Initiating graceful end sequence');
          initiateGracefulEnd();
          return;
        } else {
          setTimeRemaining(remainingSeconds);
          previousTimeRef.current = remainingSeconds;
        }

        // Mark as used at 5-minute mark (only trigger once)
        // NOTE: Total duration = SIMULATION_DURATION_SECONDS, so 5 minutes elapsed = (total-5) minutes REMAINING
        const fiveMinutesRemaining = SIMULATION_DURATION_SECONDS - USAGE_THRESHOLD_SECONDS;
        const currentSessionToken = sessionTokenRef.current; // Get from ref to avoid closure issues

        // Calculate elapsed time for 5-minute check
        const clientElapsed = SIMULATION_DURATION_SECONDS - remainingSeconds;

        // DEBUG: Log every 10 seconds to diagnose 5-minute check
        if (remainingSeconds % 10 === 0) {
          console.log('🔍 5-MIN CHECK DEBUG:', {
            remainingSeconds,
            elapsedSeconds: clientElapsed,
            thresholdNeeded: USAGE_THRESHOLD_SECONDS,
            'elapsedSeconds >= threshold': clientElapsed >= USAGE_THRESHOLD_SECONDS,
            usageMarked: usageMarkedRef.current,
            hasToken: !!currentSessionToken,
          });
        }

        // Check if 5 minutes have elapsed (works regardless of session recovery)
        if (clientElapsed >= USAGE_THRESHOLD_SECONDS && !usageMarkedRef.current && currentSessionToken) {
          // CRITICAL: Set flag IMMEDIATELY to prevent race condition
          // Multiple timer ticks could pass the check simultaneously
          usageMarkedRef.current = true;
          setUsageMarked(true);

          console.log('🎯🎯🎯 5-MINUTE MARK REACHED - MARKING AS COUNTED!');
          console.log('🔍 DEBUG: Remaining seconds:', remainingSeconds);
          console.log('🔍 DEBUG: Client calculated elapsed time:', clientElapsed, 'seconds');
          console.log('🔍 DEBUG: Using sessionToken from ref:', currentSessionToken);
          markSimulationAsUsed(clientElapsed);
        }

        // Timer warnings (only trigger once per threshold)
        if (prev > WARNING_5_MIN_REMAINING && remainingSeconds <= WARNING_5_MIN_REMAINING) {
          showTimerWarning('5 Minuten verbleibend', 'yellow', false);
        }
        if (prev > 120 && remainingSeconds <= 120) {
          showTimerWarning('2 Minuten verbleibend', 'orange', false);
        }
        if (prev > 60 && remainingSeconds <= 60) {
          showTimerWarning('Nur noch 1 Minute!', 'red', false);
        }
        if (prev > 30 && remainingSeconds <= 30) {
          showTimerWarning('30 Sekunden verbleibend', 'red', true);
        }
        if (prev > 10 && remainingSeconds <= 10) {
          showTimerWarning('Simulation endet in 10 Sekunden', 'red', true);
        }
      }, 1000); // Check every 1000ms (1 second) for mobile compatibility
    } catch (error) {
      console.error('❌ FSP: Error in startSimulationTimer:', error);
      // CRITICAL: Rollback optimistic counter deduction on error
      resetOptimisticCount();
      console.log('🔄 Rolled back optimistic counter deduction due to error');

      // Reset timer state on error
      timerActiveRef.current = false;
      setTimerActive(false);
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
      throw error; // Re-throw to be caught by outer handler if needed
    } finally {
      // Always release the lock, even if function throws or returns early
      timerStartLockRef.current = false;
      console.log('🔓 Timer start lock released');
    }
  };

  // Mark simulation as used at 5-minute mark with server-side validation
  const markSimulationAsUsed = async (clientElapsedSeconds: number) => {
    const token = sessionTokenRef.current; // Use ref instead of state
    if (!token || usageMarkedRef.current) return;

    console.log('📊 FSP: Marking simulation as used at 5-minute mark');
    console.log('🔍 DEBUG: Client elapsed seconds being sent:', clientElapsedSeconds);
    console.log('🔍 DEBUG: Using session token:', token);

    try {
      const result = await simulationTracker.markSimulationUsed(token, clientElapsedSeconds);
      if (result.success) {
        setUsageMarked(true);
        usageMarkedRef.current = true; // Also update ref for cleanup closure
        console.log('✅ FSP: Simulation usage recorded in database with server validation');
        console.log('✅ FSP: Counter automatically incremented by database function');

        // CRITICAL FIX: Refresh quota display in real-time after counting
        try {
          console.log('🔄 Refreshing quota from backend...');
          await checkAccess(); // Fetch fresh data from backend

          // Wait for React state to update (state updates are async)
          // Retry up to 5 times with 200ms delay between attempts
          let quotaInfo = null;
          let attempts = 0;
          const maxAttempts = 5;

          while (!quotaInfo && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 200));
            quotaInfo = getSubscriptionInfo();
            attempts++;
            console.log(`🔄 Attempt ${attempts}/${maxAttempts}: quotaInfo =`, quotaInfo ? 'FOUND' : 'null');
          }

          if (quotaInfo) {
            console.warn('✅✅✅ QUOTA COUNTER REFRESHED:', quotaInfo);
            console.log({ used: quotaInfo?.simulationsUsed, limit: quotaInfo?.simulationsLimit });
          } else {
            console.error('🚨 QUOTA REFRESH TIMEOUT: State did not update after', maxAttempts, 'attempts');
          }
        } catch (refreshError) {
          console.error('🚨 ERROR REFRESHING QUOTA:', refreshError);
        }

        // NOTE: We do NOT call recordUsage() here because mark_simulation_counted
        // already increments the counter in the database. Calling recordUsage() would
        // result in double-counting (incrementing the counter twice).
      } else {
        console.error('❌ FSP: Failed to mark simulation as used:', result.error);
        // If server-side validation fails, this could be a security issue
        if (result.error?.includes('Server validation')) {
          console.warn('🛡️ SECURITY: Server-side validation failed - possible time manipulation');
        }
      }
    } catch (error) {
      console.error('❌ FSP: Error marking simulation as used:', error);
    }
  };

  // End the Voiceflow conversation
  const endVoiceflowConversation = () => {
    try {
      // Method 1: Try to close the Voiceflow widget
      if (window.voiceflow?.chat) {
        console.log('🔚 FSP: Attempting to close Voiceflow widget');
        window.voiceflow.chat.close && window.voiceflow.chat.close();
        window.voiceflow.chat.hide && window.voiceflow.chat.hide();
      }

      // Method 2: Try to stop any active media streams
      navigator.mediaDevices
        ?.getUserMedia({ audio: true })
        .then((stream) => {
          console.log('🔚 FSP: Stopping active audio streams');
          stream.getTracks().forEach((track) => track.stop());
        })
        .catch(() => {
          // No active streams, which is fine
        });

      // Method 3: Try to find and click any "End call" or "Hang up" buttons
      setTimeout(() => {
        const endButtons = document.querySelectorAll('button');
        for (const button of endButtons) {
          const buttonText = button.textContent?.toLowerCase();
          if (buttonText?.includes('end') || buttonText?.includes('hang') || buttonText?.includes('stop')) {
            console.log('🔚 FSP: Found potential end call button, clicking it');
            button.click();
            break;
          }
        }
      }, 500);
    } catch (error) {
      console.error('❌ FSP: Error ending Voiceflow conversation:', error);
    }
  };

  // NOTE: Heartbeat functions (startHeartbeat, stopHeartbeat) removed - deprecated/no-op in new system

  // Stop the simulation timer
  const stopSimulationTimer = async (reason: 'completed' | 'aborted' = 'completed') => {
    console.log('🛑 FSP: Stopping simulation timer');

    const elapsedSeconds = 20 * 60 - timeRemaining;

    // CRITICAL FIX: Mark token as burned BEFORE any cleanup to prevent reuse
    // This prevents recovery attempts even if cleanup fails
    if (sessionToken) {
      burnedTokens.add(sessionToken);
      console.log('[Token Security] 🔥 Token burned:', `${sessionToken.substring(0, 8)}...`);
    }

    // If graceful shutdown is in progress, skip widget cleanup (already done)
    if (isGracefulShutdown && reason === 'completed') {
      // Just update database
      try {
        if (sessionToken) {
          await simulationTracker.updateSimulationStatus(sessionToken, 'completed', elapsedSeconds);
          console.log(`📊 FSP: Graceful shutdown - Simulation marked as completed (${elapsedSeconds}s elapsed)`);
        }
      } catch (error) {
        console.error('❌ FSP: Error updating session during graceful shutdown:', error);
      }

      // Reset state
      await resetSimulationState();
      return;
    }

    // Determine the appropriate status based on usage and reason
    let finalStatus: 'completed' | 'aborted' | 'incomplete' = reason;

    if (reason === 'completed') {
      finalStatus = 'completed';
    } else if (reason === 'aborted') {
      // If aborted, check if it was before 5-minute mark
      if (!usageMarked && elapsedSeconds < USAGE_THRESHOLD_SECONDS) {
        finalStatus = 'incomplete';
        console.log('📊 FSP: Marking as incomplete - ended before 5-minute mark');

        // Reset optimistic counter since simulation ended before being charged
        console.log('🔄 FSP: Resetting optimistic count - simulation ended before being charged');
        resetOptimisticCount();
      } else {
        finalStatus = 'aborted';
        console.log('📊 FSP: Marking as aborted - ended after 5-minute mark (or usage already recorded)');
      }
    }

    // Use centralized cleanup
    await cleanupVoiceflowWidget({
      finalStatus,
      elapsedSeconds,
      skipDatabaseUpdate: false,
    });

    // Reset simulation state to allow restart
    await resetSimulationState();

    // After a short delay, reinitialize the conversation monitoring for restart
    setTimeout(() => {
      if (voiceflowController.current) {
        console.log('🔄 FSP: Reinitializing conversation monitoring after stop');
        setupConversationMonitoring();
      }
    }, 1000);
  };

  // Initiate graceful end sequence
  const initiateGracefulEnd = () => {
    console.log('🎬 FSP: Starting graceful end sequence');

    // Prevent timer from continuing
    setIsGracefulShutdown(true);

    // Clear existing timer interval
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }

    // Clear heartbeat interval
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }

    // Show 10-second warning modal
    setShowFinalWarningModal(true);
    setFinalWarningCountdown(10);

    // Start countdown in modal
    finalCountdownInterval.current = setInterval(() => {
      setFinalWarningCountdown((prev) => {
        if (prev <= 1) {
          if (finalCountdownInterval.current) {
            clearInterval(finalCountdownInterval.current);
            finalCountdownInterval.current = null;
          }
          executeSimulationEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Execute simulation end
  const executeSimulationEnd = async () => {
    console.log('🏁 FSP: Executing simulation end');

    // Hide final warning modal
    setShowFinalWarningModal(false);

    // Calculate elapsed time
    const elapsedSeconds = 20 * 60 - timeRemaining;

    // Use centralized cleanup with database update
    await cleanupVoiceflowWidget({
      finalStatus: 'completed',
      elapsedSeconds,
      skipDatabaseUpdate: false,
    });

    // Reset simulation state
    await resetSimulationState();

    // Show completion modal after cleanup
    setTimeout(() => {
      showCompletionModal();
    }, 500);
  };

  // Show completion modal
  const showCompletionModal = () => {
    console.log('🎉 FSP: Showing completion modal');
    setShowSimulationCompleted(true);
  };

  // Navigate to progress page
  const navigateToProgress = () => {
    setShowSimulationCompleted(false);
    router.push('/(tabs)/progress');
  };

  // Close completion modal
  const closeCompletionModal = async () => {
    setShowSimulationCompleted(false);
    await resetSimulationState();
  };

  // Early completion functions
  const initiateEarlyCompletion = () => {
    console.log('🏁 FSP: User initiated early completion');
    setShowEarlyCompletionModal(true);
  };

  const confirmEarlyCompletion = () => {
    console.log('✅ FSP: User confirmed early completion');
    setShowEarlyCompletionModal(false);

    // Calculate elapsed time
    const elapsedSeconds = 20 * 60 - timeRemaining;

    // Execute early completion
    executeEarlyCompletion(elapsedSeconds);
  };

  const cancelEarlyCompletion = () => {
    console.log('↩️ FSP: User cancelled early completion');
    setShowEarlyCompletionModal(false);
    setEarlyCompletionReason('');
  };

  const executeEarlyCompletion = async (elapsedSeconds: number) => {
    console.log('🏁 FSP: Executing early completion');

    // Set graceful shutdown flag
    setIsGracefulShutdown(true);

    // Set timer state to inactive
    setTimerActive(false);
    timerActiveRef.current = false;

    // Use centralized cleanup with custom metadata
    await cleanupVoiceflowWidget({
      finalStatus: 'completed',
      elapsedSeconds,
      skipDatabaseUpdate: false,
    });

    // Handle early completion specific logic
    if (sessionToken) {
      try {
        // Update with metadata about early completion
        await simulationTracker.updateSimulationStatus(sessionToken, 'completed', elapsedSeconds, {
          completion_type: 'early',
          completion_reason: earlyCompletionReason || 'user_finished_early',
        });
        console.log(
          `📊 FSP: Early completion recorded (${elapsedSeconds}s elapsed, reason: ${earlyCompletionReason || 'user_finished_early'})`
        );

        // Reset optimistic counter if simulation ended before being charged (< 5 minutes)
        if (!usageMarked && elapsedSeconds < USAGE_THRESHOLD_SECONDS) {
          console.log('🔄 FSP: Early completion before 5-minute mark - resetting optimistic count');
          resetOptimisticCount();
        } else if (elapsedSeconds >= USAGE_THRESHOLD_SECONDS) {
          console.log('✅ FSP: Simulation reached 5-minute threshold - counter already deducted, no reset needed');
        }
      } catch (error) {
        console.error('❌ FSP: Error updating early completion status:', error);
      }
    }

    // Reset simulation state
    await resetSimulationState();

    // Show completion modal after cleanup
    setTimeout(() => {
      showCompletionModal();
    }, 500);
  };

  // Cleanup when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      console.log('🧹 FSP: Component unmount cleanup started');

      // Determine final status based on whether usage was recorded
      const finalStatus = usageMarkedRef.current ? 'completed' : 'aborted';
      const elapsedSeconds = 20 * 60 - timeRemaining;

      console.log(`🔍 FSP: Cleanup - usageMarked=${usageMarkedRef.current}, marking session as ${finalStatus}`);

      // Use centralized cleanup (async but don't wait for it in cleanup)
      if (timerActiveRef.current && sessionTokenRef.current) {
        cleanupVoiceflowWidget({
          finalStatus,
          elapsedSeconds,
          skipDatabaseUpdate: false,
        })
          .then(() => {
            console.log('✅ FSP: Cleanup completed successfully');
          })
          .catch((error) => {
            console.error('❌ FSP: Error during cleanup:', error);
          });
      }

      // Remove event listeners
      if ((window as any).fspClickListener) {
        document.removeEventListener('click', (window as any).fspClickListener, true);
        delete (window as any).fspClickListener;
      }

      // MEMORY LEAK FIX: Clean up tracked audio track listeners
      if ((window as any).fspTrackListeners) {
        const trackListeners = (window as any).fspTrackListeners;
        trackListeners.forEach(({ track, handler }: { track: MediaStreamTrack; handler: () => void }) => {
          try {
            track.removeEventListener('ended', handler);
            console.log('🧹 FSP: Removed track event listener');
          } catch (error) {
            console.warn('⚠️ FSP: Error removing track listener:', error);
          }
        });
        trackListeners.length = 0; // Clear the array
        delete (window as any).fspTrackListeners;
      }

      // Restore original getUserMedia function
      if ((window as any).fspOriginalGetUserMedia && navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = (window as any).fspOriginalGetUserMedia;
        delete (window as any).fspOriginalGetUserMedia;
      }

      // Run global cleanup to ensure widget is completely removed
      if (Platform.OS === 'web') {
        console.log('🌍 FSP: Re-enabling global Voiceflow cleanup');
        enableVoiceflowCleanup();
        console.log('🌍 FSP: Running global Voiceflow cleanup with force=true');
        globalVoiceflowCleanup(true);
      }

      console.log('✅ FSP: Component unmount cleanup initiated');
    };
  }, []);

  // Handle navigation away from page with immediate cleanup
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (timerActive && sessionTokenRef.current) {
        // CRITICAL FIX: End simulation in database before page unloads
        // Use fetch with keepalive for reliability - guaranteed to send even during unload
        console.log('🚨 FSP: Page unloading with active simulation - ending session NOW');

        try {
          // Prepare the end session request
          // CRITICAL FIX: Use CACHED session instead of async getSession()
          const cachedAuth = cachedAuthSessionRef.current;
          if (cachedAuth && sessionTokenRef.current) {
            const payload = {
              p_session_token: sessionTokenRef.current,
              p_user_id: cachedAuth.user_id,
            };

            // Send with authentication headers via fetch keepalive
            // keepalive ensures request completes even if page closes
            const beaconUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/rpc/end_simulation_session`;

            fetch(beaconUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
                Authorization: `Bearer ${cachedAuth.access_token}`,
              },
              body: JSON.stringify(payload),
              keepalive: true, // This ensures request completes even if page closes
            }).catch((err) => {
              console.error('❌ FSP: Failed to end simulation on unload:', err);
            });

            console.log('✅ FSP: Simulation end request sent (keepalive)');
          } else {
            console.error('❌ FSP: Cannot end simulation - auth session not cached!');
          }
        } catch (error) {
          console.error('❌ FSP: Error ending simulation on unload:', error);
        }

        e.preventDefault();
        e.returnValue = 'Simulation läuft. Möchten Sie wirklich die Seite verlassen?';
        return e.returnValue;
      }
    };

    // Enhanced visibility change handler for navigation blocking
    const handleVisibilityChange = async () => {
      if (timerActive && (document.visibilityState === 'hidden' || document.hidden)) {
        // CRITICAL FIX: Record when tab was hidden for elapsed time warning
        tabHiddenTimeRef.current = Date.now();
        console.log('⚠️ FSP: Tab hidden during simulation - timer continues in background');
        console.log('🕒 FSP: Hidden at:', new Date().toLocaleTimeString());

        // For mobile apps, prevent backgrounding during simulation
        if (Platform.OS !== 'web') {
          Alert.alert('Simulation läuft', 'Sie können die App nicht verlassen, während die Simulation läuft.', [
            { text: 'OK' },
          ]);
        }
        return false;
      }

      // When tab becomes visible again, re-validate access
      if (document.visibilityState === 'visible' && !document.hidden) {
        console.log('[Tab Visibility] FSP: Tab became visible - re-validating access...');

        // CRITICAL FIX: Warn user if significant time elapsed while tab was hidden
        if (timerActive && tabHiddenTimeRef.current) {
          const now = Date.now();
          const elapsedWhileHidden = Math.floor((now - tabHiddenTimeRef.current) / 1000);

          // Only show warning if > 30 seconds elapsed and we haven't warned recently (avoid spam)
          const timeSinceLastWarning = now - lastVisibilityWarningRef.current;
          if (elapsedWhileHidden >= 30 && timeSinceLastWarning > 60000) {
            const minutes = Math.floor(elapsedWhileHidden / 60);
            const seconds = elapsedWhileHidden % 60;
            const timeString = minutes > 0 ? `${minutes} Min ${seconds} Sek` : `${seconds} Sek`;

            console.warn(`⏱️ FSP: User was away for ${elapsedWhileHidden}s - showing warning`);
            Alert.alert(
              'Achtung: Timer läuft weiter',
              `Die Simulation lief ${timeString} im Hintergrund weiter.\n\nDer Timer pausiert NICHT, wenn Sie den Tab wechseln oder die App verlassen.`,
              [{ text: 'Verstanden' }]
            );
            lastVisibilityWarningRef.current = now;
          }

          // Clear the hidden time tracker
          tabHiddenTimeRef.current = null;
        }

        const accessCheck = await checkAccess();

        if (accessCheck && !accessCheck.canUseSimulation) {
          console.warn('[Tab Visibility] FSP: ⚠️ Access lost while away - locking simulation');
          setIsSimulationLocked(true);
          if (timerActive) {
            await stopSimulationTimer('aborted');
          }
        }
      }
    };

    // Handle route changes - BLOCK during active simulation
    const handlePopState = (e: PopStateEvent) => {
      if (timerActive) {
        console.log('🚫 FSP: Navigation blocked - simulation in progress');
        e.preventDefault();
        // Push the current state back to prevent navigation
        window.history.pushState(null, '', window.location.href);
        Alert.alert('Simulation läuft', 'Sie können die Seite nicht verlassen, während die Simulation läuft.', [
          { text: 'OK' },
        ]);
        return false;
      }
    };

    if (Platform.OS === 'web') {
      if (timerActive) {
        // Block all navigation during simulation
        window.addEventListener('beforeunload', handleBeforeUnload);

        // Add history state to block back button
        window.history.pushState(null, '', window.location.href);
      }

      // Add listeners for navigation blocking
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [timerActive]);

  // Immediate cleanup function for navigation events
  const performImmediateCleanup = () => {
    try {
      console.log('⚡ FSP: Performing immediate cleanup');

      // Immediately hide and destroy Voiceflow widget
      if (window.voiceflow?.chat) {
        window.voiceflow.chat.hide();
        window.voiceflow.chat.close && window.voiceflow.chat.close();
      }

      // Force remove widget elements immediately
      const widgetSelectors = [
        '[id*="voiceflow"]',
        '[class*="voiceflow"]',
        '[class*="vfrc"]',
        '#voiceflow-chat',
        '.vfrc-widget',
        '.vfrc-chat',
      ];

      widgetSelectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
          element.remove();
          console.log(`🗑️ FSP: Immediately removed element: ${selector}`);
        });
      });

      // Stop any active media streams
      navigator.mediaDevices
        ?.getUserMedia({ audio: true })
        .then((stream) => {
          stream.getTracks().forEach((track) => {
            track.stop();
            console.log('🔇 FSP: Stopped audio track during immediate cleanup');
          });
        })
        .catch(() => {});

      console.log('✅ FSP: Immediate cleanup completed');
    } catch (error) {
      console.error('❌ FSP: Error during immediate cleanup:', error);
    }
  };

  // Reset simulation state for restart
  const resetSimulationState = async () => {
    console.log('🔄 FSP: Resetting simulation state for restart');

    // CRITICAL: Clear intervals FIRST before resetting refs
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
      console.log('✅ FSP: Cleared timer interval');
    }

    // NOTE: Heartbeat interval cleanup removed - deprecated/no-op in new system

    // Clear warning timeout
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }

    // Clear final countdown interval
    if (finalCountdownInterval.current) {
      clearInterval(finalCountdownInterval.current);
      finalCountdownInterval.current = null;
    }

    // THEN reset refs and state
    timerActiveRef.current = false;
    timerEndTimeRef.current = 0;
    previousTimeRef.current = 20 * 60;

    setTimerActive(false);
    setTimeRemaining(20 * 60);
    setTimerEndTime(0);
    setUsageMarked(false);
    usageMarkedRef.current = false; // Also reset ref

    // Reset timer warning states
    setTimerWarningLevel('normal');
    setShowWarningMessage(false);
    setWarningMessageText('');

    // Reset graceful end states
    setShowFinalWarningModal(false);
    setFinalWarningCountdown(10);
    setIsGracefulShutdown(false);
    setShowSimulationCompleted(false);

    // Reset getUserMedia override and re-register it for next run
    if ((window as any).fspOriginalGetUserMedia && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = (window as any).fspOriginalGetUserMedia;
      delete (window as any).fspOriginalGetUserMedia;
    }

    // Remove and re-add click listener for next run
    if ((window as any).fspClickListener) {
      document.removeEventListener('click', (window as any).fspClickListener, true);
      delete (window as any).fspClickListener;
    }

    // FIX: Clear storage (fire-and-forget for non-blocking reset)
    clearSimulationStorage().catch((err) => console.error('Error clearing storage during reset:', err));

    // Reset early completion state
    setShowEarlyCompletionModal(false);
    setEarlyCompletionReason('');

    // CRITICAL FIX: Generate new session token for next simulation
    // The old session is ended, we need a fresh token for the next run
    console.log('🔑 FSP: Generating new session token for next simulation');
    try {
      const result = await simulationTracker.startSimulation('fsp');

      if (!result.success || !result.sessionToken) {
        console.error('❌ FSP: Failed to generate new session token:', result.error);
        setSessionToken(null);
        sessionTokenRef.current = null;
      } else {
        console.log(`✅ FSP: New session token generated: ${result.sessionToken.substring(0, 8)}...`);
        setSessionToken(result.sessionToken);
        sessionTokenRef.current = result.sessionToken;
      }
    } catch (error) {
      console.error('❌ FSP: Exception generating new session token:', error);
      setSessionToken(null);
      sessionTokenRef.current = null;
    }

    console.log('✅ FSP: Simulation state reset completed - ready for next run');
    console.log(
      '🔍 FSP: Post-reset state - timerActiveRef:',
      timerActiveRef.current,
      'timerInterval:',
      timerInterval.current,
      'sessionToken:',
      sessionTokenRef.current ? `${sessionTokenRef.current.substring(0, 8)}...` : 'null'
    );

    // Re-setup conversation monitoring for next run
    setTimeout(() => {
      if (voiceflowController.current) {
        console.log('🔄 FSP: Re-initializing conversation monitoring after reset');
        setupConversationMonitoring();
      }
    }, 500);
  };

  // FIX: Clear simulation storage (AsyncStorage + SecureStore)
  const clearSimulationStorage = async () => {
    try {
      // Clear AsyncStorage items
      await AsyncStorage.multiRemove(['sim_start_time_fsp', 'sim_end_time_fsp', 'sim_duration_ms_fsp']);

      // Clear SecureStore items (sensitive data)
      await SecureStore.deleteItemAsync('sim_session_token_fsp');
      await SecureStore.deleteItemAsync('sim_user_id_fsp');

      console.log('✅ FSP: Cleared simulation storage (AsyncStorage + SecureStore)');
    } catch (error) {
      console.error('❌ FSP: Error clearing simulation storage:', error);
    }
  };

  // ============================================
  // CENTRALIZED VOICEFLOW WIDGET CLEANUP
  // ============================================
  const cleanupVoiceflowWidget = async (
    options: {
      skipDatabaseUpdate?: boolean;
      finalStatus?: 'completed' | 'aborted' | 'incomplete';
      elapsedSeconds?: number;
    } = {}
  ) => {
    // Prevent concurrent cleanup operations
    if (isCleaningUpRef.current) {
      console.log('⚠️ FSP: Cleanup already in progress, skipping...');
      return;
    }

    console.log('🧹 FSP: Starting centralized widget cleanup...');
    isCleaningUpRef.current = true;

    try {
      // Step 1: Stop all intervals immediately
      console.log('🛑 FSP: Step 1 - Clearing all intervals...');
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = null;
      }
      if (finalCountdownInterval.current) {
        clearInterval(finalCountdownInterval.current);
        finalCountdownInterval.current = null;
      }

      // Step 2: Wait briefly for any pending operations to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 3: Close Voiceflow widget
      console.log('🔚 FSP: Step 3 - Closing Voiceflow widget...');
      if (window.voiceflow?.chat) {
        try {
          window.voiceflow.chat.close && window.voiceflow.chat.close();
          window.voiceflow.chat.hide && window.voiceflow.chat.hide();
          console.log('✅ FSP: Voiceflow widget closed');
        } catch (error) {
          console.error('❌ FSP: Error closing Voiceflow widget:', error);
        }
      }

      // Step 4: Wait for widget to close
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 5: Destroy controller
      console.log('🔧 FSP: Step 5 - Destroying controller...');
      if (voiceflowController.current) {
        try {
          voiceflowController.current.destroy();
          voiceflowController.current = null;
          console.log('✅ FSP: Controller destroyed');
        } catch (error) {
          console.error('❌ FSP: Error destroying controller:', error);
        }
      }

      // Step 6: Force remove DOM elements
      console.log('🗑️ FSP: Step 6 - Force removing DOM elements...');
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        try {
          const widgetSelectors = [
            '[id*="voiceflow"]',
            '[class*="voiceflow"]',
            '[data-voiceflow]',
            'iframe[src*="voiceflow"]',
          ];

          widgetSelectors.forEach((selector) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach((el) => {
              el.remove();
              console.log(`✅ FSP: Removed element: ${selector}`);
            });
          });
        } catch (error) {
          console.error('❌ FSP: Error removing DOM elements:', error);
        }
      }

      // Step 7: Update database if needed
      if (!options.skipDatabaseUpdate && sessionToken && options.finalStatus) {
        console.log('📊 FSP: Step 7 - Updating database...');
        try {
          await simulationTracker.updateSimulationStatus(
            sessionToken,
            options.finalStatus,
            options.elapsedSeconds || 0
          );
          console.log(`✅ FSP: Database updated with status: ${options.finalStatus}`);
        } catch (error) {
          console.error('❌ FSP: Error updating database:', error);
        }
      }

      // Step 8: Clear storage (AsyncStorage + SecureStore)
      console.log('💾 FSP: Step 8 - Clearing simulation storage...');
      await clearSimulationStorage();

      console.log('✅ FSP: Centralized cleanup completed successfully');
    } catch (error) {
      console.error('❌ FSP: Error during centralized cleanup:', error);
    } finally {
      // CRITICAL: Always clear session token to prevent reuse
      sessionTokenRef.current = null;
      setSessionToken(null);
      console.log('🔒 FSP: Session token cleared');

      // Always reset the cleanup flag
      isCleaningUpRef.current = false;
    }
  };

  // Show expired simulation message
  const showExpiredSimulationMessage = () => {
    Alert.alert('Simulation abgelaufen', 'Ihre vorherige Simulation ist abgelaufen.', [{ text: 'OK' }]);
  };

  // Format time display for resume modal
  const formatTimeDisplay = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Show timer warning with color and message
  const showTimerWarning = (message: string, level: 'yellow' | 'orange' | 'red', isPulsing: boolean) => {
    console.log(`⚠️ Timer warning: ${message} (${level})`);

    // Update warning level
    setTimerWarningLevel(level);

    // Show warning message
    setWarningMessageText(message);
    setShowWarningMessage(true);

    // Clear any existing warning timeout
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Hide warning message after 3 seconds
    warningTimeoutRef.current = setTimeout(() => {
      setShowWarningMessage(false);
    }, 3000);
  };

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Dynamic styles for dark mode support
  const dynamicStyles = StyleSheet.create({
    container: {
      ...styles.container,
      backgroundColor: colors.background,
    },
    lockOverlayContent: {
      ...styles.lockOverlayContent,
      backgroundColor: colors.card,
    },
    lockIconContainer: {
      ...styles.lockIconContainer,
      backgroundColor: '#FEE2E2',
    },
    lockBackButton: {
      ...styles.lockBackButton,
      backgroundColor: '#F3F4F6',
    },
    timerNormal: {
      ...styles.timerNormal,
      backgroundColor: '#F8F3E8',
    },
    timerWarningYellow: {
      ...styles.timerWarningYellow,
      backgroundColor: '#FFF4E6',
    },
    timerWarningOrange: {
      ...styles.timerWarningOrange,
      backgroundColor: '#FFE8D6',
    },
  });

  return (
    <ErrorBoundary>
      <SafeAreaView style={dynamicStyles.container} edges={['top', 'bottom', 'left', 'right']}>
        {/* Header with back button and title */}
        <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)/simulation')}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Mic size={24} color="white" />
            <Text style={styles.headerTitle}>FSP-Simulation</Text>
          </View>

          <View style={styles.headerSpacer} />
        </LinearGradient>

        {/* Subscription Counter Badge - always visible */}
        {getSubscriptionInfo() && (
          <View style={styles.counterBadgeContainer}>
            <View style={styles.counterBadge}>
              <Text style={styles.counterBadgeText}>{getSubscriptionInfo()?.usageText}</Text>
            </View>
          </View>
        )}

        {/* Timer display - only show when active */}
        {timerActive && (
          <View style={styles.timerSection}>
            <View
              style={[
                styles.timerContainer,
                timerWarningLevel === 'normal' && dynamicStyles.timerNormal,
                timerWarningLevel === 'yellow' && dynamicStyles.timerWarningYellow,
                timerWarningLevel === 'orange' && dynamicStyles.timerWarningOrange,
                timerWarningLevel === 'red' && styles.timerWarningRed,
              ]}
            >
              <Clock size={16} color={timerWarningLevel === 'red' ? 'white' : '#B15740'} />
              <Text style={[styles.timerText, timerWarningLevel === 'red' && styles.timerTextRed]}>
                Simulation läuft: {formatTime(timeRemaining)}
              </Text>
            </View>
          </View>
        )}

        {/* Warning message notification */}
        {showWarningMessage && (
          <View style={styles.warningNotification}>
            <Text style={styles.warningNotificationText}>{warningMessageText}</Text>
          </View>
        )}

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          bounces={true}
          scrollEventThrottle={16}
        >
          <View style={styles.content}>
            {/* Quota Exhausted Card - Shows when limit reached */}
            {isSimulationLocked && subscriptionStatus && (
              <QuotaExhaustedCard
                simulationsUsed={subscriptionStatus.simulationsUsed || 0}
                totalSimulations={subscriptionStatus.simulationLimit || 0}
                subscriptionTier={(subscriptionStatus.subscriptionTier as 'free' | 'basic' | 'premium') || 'free'}
                periodEnd={subscriptionStatus.periodEnd ? new Date(subscriptionStatus.periodEnd) : undefined}
              />
            )}

            {/* Flashcard Carousel - Educational Content */}
            {showTutorial ? (
              <View style={styles.instructionsContainer}>
                <FlashcardCarousel onDismiss={handleDismissTutorial} />
              </View>
            ) : (
              <View style={styles.helpButtonContainer}>
                <TouchableOpacity style={styles.helpButton} onPress={handleShowTutorial} activeOpacity={0.7}>
                  <HelpCircle size={24} color="#6366f1" strokeWidth={2} />
                  <Text style={styles.helpButtonText}>Anleitung anzeigen</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Widget Area */}
            {!isSimulationLocked && (
              <View style={styles.widgetArea} nativeID="voiceflow-widget-container">
                {Platform.OS === 'web' ? (
                  <>{/* Voiceflow widget loads here automatically via script injection */}</>
                ) : (
                  <>
                    <Text style={styles.widgetPlaceholder}>📱 Mobil-Modus</Text>
                    <Text style={styles.widgetHint}>
                      Das Voiceflow-Widget ist nur in der Web-Version verfügbar. Öffnen Sie die App im Browser, um das
                      Widget zu nutzen.
                    </Text>
                  </>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Final Warning Modal */}
        {showFinalWarningModal && (
          <View style={styles.finalWarningOverlay}>
            <View style={styles.finalWarningModal}>
              <Text style={styles.warningIcon}>⏱️</Text>
              <Text style={styles.finalWarningTitle}>Simulation endet</Text>
              <Text style={styles.countdownText}>{finalWarningCountdown}</Text>
              <Text style={styles.infoText}>Ihre Antworten werden automatisch gespeichert</Text>
              <View style={styles.progressDots}>
                <View style={[styles.dot, styles.dot1]} />
                <View style={[styles.dot, styles.dot2]} />
                <View style={[styles.dot, styles.dot3]} />
              </View>
            </View>
          </View>
        )}

        {/* Early Completion Confirmation Modal */}
        {showEarlyCompletionModal && (
          <View style={styles.earlyCompletionOverlay}>
            <View style={styles.earlyCompletionModal}>
              <Text style={styles.modalIcon}>⚠️</Text>
              <Text style={styles.earlyCompletionTitle}>Simulation vorzeitig beenden?</Text>

              {/* Time Information */}
              <View style={styles.timeInfo}>
                <View style={styles.timeRow}>
                  <Text style={styles.timeRowLabel}>Verstrichene Zeit:</Text>
                  <Text style={styles.timeRowValue}>{formatTime(20 * 60 - timeRemaining)}</Text>
                </View>
                <View style={styles.timeRow}>
                  <Text style={styles.timeRowLabel}>Verbleibende Zeit:</Text>
                  <Text style={styles.timeRowValue}>{formatTime(timeRemaining)}</Text>
                </View>
              </View>

              {/* Warning Box */}
              <View style={styles.warningBox}>
                <Text style={styles.warningBoxIcon}>ℹ️</Text>
                <Text style={styles.warningBoxText}>
                  Ihre Simulation wird beendet und zur Auswertung weitergeleitet. Das Gespräch wird gespeichert und
                  analysiert.
                </Text>
              </View>

              {/* Reason Selector */}
              <View style={styles.reasonSection}>
                <Text style={styles.reasonLabel}>Grund (optional):</Text>
                <TouchableOpacity
                  style={styles.reasonSelector}
                  onPress={() => {
                    Alert.alert('Grund wählen', 'Warum möchten Sie die Simulation vorzeitig beenden?', [
                      {
                        text: 'Alle Aufgaben abgeschlossen',
                        onPress: () => setEarlyCompletionReason('finished_all_tasks'),
                      },
                      {
                        text: 'Ausreichendes Gespräch geführt',
                        onPress: () => setEarlyCompletionReason('sufficient_conversation'),
                      },
                      {
                        text: 'Technisches Problem',
                        onPress: () => setEarlyCompletionReason('technical_issue'),
                      },
                      {
                        text: 'Persönlicher Grund',
                        onPress: () => setEarlyCompletionReason('personal_reason'),
                      },
                      {
                        text: 'Sonstiges',
                        onPress: () => setEarlyCompletionReason('other'),
                      },
                      { text: 'Abbrechen', style: 'cancel' },
                    ]);
                  }}
                >
                  <Text style={styles.reasonText}>
                    {earlyCompletionReason === 'finished_all_tasks'
                      ? 'Alle Aufgaben abgeschlossen'
                      : earlyCompletionReason === 'sufficient_conversation'
                        ? 'Ausreichendes Gespräch geführt'
                        : earlyCompletionReason === 'technical_issue'
                          ? 'Technisches Problem'
                          : earlyCompletionReason === 'personal_reason'
                            ? 'Persönlicher Grund'
                            : earlyCompletionReason === 'other'
                              ? 'Sonstiges'
                              : 'Tippen Sie, um einen Grund auszuwählen'}
                  </Text>
                  <Text style={styles.reasonArrow}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* Buttons */}
              <View style={styles.earlyCompletionButtons}>
                <TouchableOpacity style={styles.confirmButton} onPress={confirmEarlyCompletion} activeOpacity={0.8}>
                  <Text style={styles.confirmButtonIcon}>✓</Text>
                  <Text style={styles.confirmButtonText}>Ja, beenden</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.continueButton} onPress={cancelEarlyCompletion} activeOpacity={0.7}>
                  <Text style={styles.continueButtonIcon}>↩</Text>
                  <Text style={styles.continueButtonText}>Weiter üben</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Completion Modal */}
        {showSimulationCompleted && (
          <View style={styles.completionOverlay}>
            <View style={styles.completionModal}>
              <View style={styles.successIcon}>
                <Text style={styles.successIconText}>✓</Text>
              </View>
              <Text style={styles.completionTitle}>Simulation abgeschlossen</Text>
              <Text style={styles.completionMessage}>
                Ihre Simulation wurde erfolgreich beendet und wird nun ausgewertet.
              </Text>
              <Text style={styles.nextSteps}>Die Auswertung finden Sie in Kürze im Fortschrittsbereich.</Text>
              <View style={styles.buttonGroup}>
                <TouchableOpacity style={styles.primaryButton} onPress={navigateToProgress}>
                  <Text style={styles.primaryButtonText}>Zur Auswertung</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={closeCompletionModal}>
                  <Text style={styles.secondaryButtonText}>Schließen</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Upgrade Required Modal */}
        <UpgradeRequiredModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentTier={subscriptionStatus?.subscriptionTier || 'free'}
          remainingSimulations={subscriptionStatus?.remainingSimulations || 0}
          totalLimit={subscriptionStatus?.simulationLimit || 0}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Lock Overlay Styles
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  lockOverlayContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  lockIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  lockIcon: {
    fontSize: 40,
  },
  lockTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  lockMessage: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 24,
  },
  lockSubMessage: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  lockUpgradeButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  lockUpgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  lockBackButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
  },
  lockBackButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  headerSpacer: {
    width: 40, // Same width as back button for symmetry
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 12,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Timer warning level styles
  timerNormal: {
    backgroundColor: '#F8F3E8',
    borderWidth: 0,
  },
  timerWarningYellow: {
    backgroundColor: '#FFF4E6',
    borderWidth: 2,
    borderColor: '#FFD93D',
  },
  timerWarningOrange: {
    backgroundColor: '#FFE8D6',
    borderWidth: 2,
    borderColor: '#FF9A3D',
  },
  timerWarningRed: {
    backgroundColor: '#B15740',
    borderWidth: 2,
    borderColor: '#8B2E1F',
  },
  timerTextRed: {
    color: 'white',
  },
  // Warning notification
  warningNotification: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: '#B15740',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(177, 87, 64, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 9999,
  },
  warningNotificationText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flexDirection: 'column',
    paddingBottom: 20,
  },
  instructionsContainer: {
    minHeight: 400,
  },
  helpButtonContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f0f0ff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  helpButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  widgetArea: {
    flex: 1, // Takes up 1/3 of available space
    minHeight: 600, // Increased to ensure widget has space
    width: '100%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    // This area is where the Voiceflow widget will appear
  },
  widgetPlaceholder: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  widgetHint: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  // Final Warning Modal Styles
  finalWarningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  finalWarningModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 48,
    maxWidth: 420,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 60,
    elevation: 10,
  },
  warningIcon: {
    fontSize: 72,
    marginBottom: 24,
  },
  finalWarningTitle: {
    color: '#B15740',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  countdownText: {
    fontSize: 64,
    fontWeight: '700',
    color: '#B15740',
    marginVertical: 24,
  },
  infoText: {
    color: '#666666',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 24,
  },
  dot: {
    width: 8,
    height: 8,
    backgroundColor: '#B15740',
    borderRadius: 4,
  },
  dot1: {
    opacity: 0.3,
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 1,
  },
  // Completion Modal Styles
  completionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  completionModal: {
    backgroundColor: '#F8F3E8',
    borderRadius: 16,
    padding: 48,
    maxWidth: 520,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 60,
    elevation: 10,
  },
  successIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#4CAF50',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 8,
  },
  successIconText: {
    fontSize: 48,
    color: 'white',
    fontWeight: '700',
  },
  completionTitle: {
    color: '#B15740',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  completionMessage: {
    color: '#333333',
    fontSize: 18,
    lineHeight: 28,
    marginBottom: 16,
    textAlign: 'center',
  },
  nextSteps: {
    color: '#666666',
    fontSize: 15,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#B15740',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    minWidth: 160,
    shadowColor: '#B15740',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#B15740',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    minWidth: 160,
  },
  secondaryButtonText: {
    color: '#B15740',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Resume Modal Styles
  resumeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10001,
  },
  resumeModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    maxWidth: 480,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 60,
    elevation: 10,
  },
  resumeIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  resumeTitle: {
    color: '#B15740',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  resumeMessage: {
    color: '#333333',
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  timeRemainingBox: {
    backgroundColor: '#F8F3E8',
    borderWidth: 2,
    borderColor: '#B15740',
    borderRadius: 12,
    padding: 20,
    marginVertical: 24,
    width: '100%',
    alignItems: 'center',
  },
  timeLabel: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  timeValue: {
    color: '#B15740',
    fontSize: 36,
    fontWeight: '700',
  },
  resumeWarning: {
    color: '#999999',
    fontSize: 13,
    marginBottom: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Early Completion Styles
  timerSection: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: 'rgba(76, 175, 80, 0.3)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  finishButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    opacity: 0.5,
  },
  finishIcon: {
    fontSize: 18,
    color: 'white',
    fontWeight: '700',
  },
  finishButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  finishButtonHint: {
    fontSize: 13,
    color: '#999999',
    fontStyle: 'italic',
  },
  earlyCompletionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10003,
    padding: 20,
  },
  earlyCompletionModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    maxWidth: 520,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.4,
    shadowRadius: 80,
    elevation: 20,
  },
  modalIcon: {
    fontSize: 56,
    textAlign: 'center',
    marginBottom: 16,
  },
  earlyCompletionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#B15740',
    textAlign: 'center',
    marginBottom: 24,
  },
  timeInfo: {
    backgroundColor: '#F8F3E8',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    gap: 12,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeRowLabel: {
    fontSize: 15,
    color: '#666666',
    fontWeight: '500',
  },
  timeRowValue: {
    fontSize: 18,
    color: '#B15740',
    fontWeight: '700',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFF4E6',
    borderWidth: 1,
    borderColor: '#FFD93D',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  warningBoxIcon: {
    fontSize: 20,
  },
  warningBoxText: {
    flex: 1,
    fontSize: 14,
    color: '#666666',
    lineHeight: 21,
  },
  reasonSection: {
    marginBottom: 24,
  },
  reasonLabel: {
    fontSize: 15,
    color: '#333333',
    fontWeight: '600',
    marginBottom: 8,
  },
  reasonSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F3E8',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 14,
  },
  reasonText: {
    flex: 1,
    fontSize: 15,
    color: '#333333',
  },
  reasonArrow: {
    fontSize: 12,
    color: '#999999',
  },
  earlyCompletionButtons: {
    gap: 12,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#B15740',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: 'rgba(177, 87, 64, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  confirmButtonIcon: {
    fontSize: 20,
    color: 'white',
    fontWeight: '700',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: 'rgba(76, 175, 80, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  continueButtonIcon: {
    fontSize: 20,
    color: 'white',
    fontWeight: '700',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
  },
  // Counter Badge Styles
  counterBadgeContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  counterBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: 'rgba(76, 175, 80, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  counterBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default withErrorBoundary(FSPSimulationScreen, 'FSP Simulation');
