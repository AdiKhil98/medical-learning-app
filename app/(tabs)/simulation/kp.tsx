import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Brain, Clock, Info, Lock } from 'lucide-react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createKPController, VoiceflowController, globalVoiceflowCleanup } from '@/utils/voiceflowIntegration';
import {
  stopGlobalVoiceflowCleanup,
  disableVoiceflowCleanup,
  enableVoiceflowCleanup,
} from '@/utils/globalVoiceflowCleanup';
import { simulationTracker } from '@/lib/simulationTrackingService';
import { quotaService } from '@/lib/quotaService';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeRequiredModal } from '@/components/UpgradeRequiredModal';
import FlashcardCarousel from '@/components/ui/FlashcardCarousel';
import {
  SIMULATION_DURATION_SECONDS,
  USAGE_THRESHOLD_SECONDS,
  WARNING_5_MIN_REMAINING,
} from '@/constants/simulationConstants';
import { logger } from '@/utils/logger';
import { withErrorBoundary } from '@/components/withErrorBoundary';

function KPSimulationScreen() {
  console.log('🎯🎯🎯 KP SIMULATION COMPONENT RENDERING');
  const router = useRouter();
  const { user } = useAuth();
  console.log('🎯 User in component:', user ? `ID: ${user.id.substring(0, 8)}...` : 'NOT FOUND');
  const {
    canUseSimulation,
    subscriptionStatus,
    recordUsage,
    getSubscriptionInfo,
    checkAccess,
    applyOptimisticDeduction,
    resetOptimisticCount,
  } = useSubscription(user?.id);
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

  // Lock state for when limit is reached
  const [isSimulationLocked, setIsSimulationLocked] = useState(false);

  // Cleanup coordination flag
  const isCleaningUpRef = useRef(false);

  // Debug state for widget initialization
  const [widgetDebugLog, setWidgetDebugLog] = useState<string[]>([]);
  const addDebugLog = (message: string) => {
    setWidgetDebugLog((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    logger.info(`[WIDGET DEBUG] ${message}`);
  };

  // FIX: Helper to clear simulation storage (AsyncStorage + SecureStore)
  const clearSimulationStorage = async () => {
    try {
      // Clear AsyncStorage items
      await AsyncStorage.multiRemove(['sim_start_time_kp', 'sim_end_time_kp', 'sim_duration_ms_kp']);

      // Clear SecureStore items (sensitive data)
      await SecureStore.deleteItemAsync('sim_session_token_kp');
      await SecureStore.deleteItemAsync('sim_user_id_kp');

      logger.info('🧹 KP: Cleared simulation storage (AsyncStorage + SecureStore)');
    } catch (error) {
      logger.error('Error clearing simulation storage:', error);
    }
  };

  // Disable global Voiceflow cleanup as soon as component mounts
  useEffect(() => {
    logger.info('🛑 KP: Component mounted - disabling global Voiceflow cleanup');
    disableVoiceflowCleanup();
    stopGlobalVoiceflowCleanup();
  }, []);

  // SESSION RECOVERY: Check for active session before resetting optimistic count
  useEffect(() => {
    console.log('🚀🚀🚀 KP SESSION RECOVERY: useEffect triggered!');
    const recoverOrResetSession = async () => {
      try {
        console.log('🔍 KP SESSION RECOVERY: Starting recovery function...');
        console.log('[KP Session Recovery] Checking for active simulation session...');

        // Check if there's a saved session token in SecureStore
        const savedToken = await SecureStore.getItemAsync('sim_session_token_kp');
        const savedStartTime = await AsyncStorage.getItem('sim_start_time_kp');

        console.log('[KP Session Recovery] Storage check:', {
          hasToken: !!savedToken,
          hasStartTime: !!savedStartTime,
        });

        if (savedToken && savedStartTime) {
          console.log('[KP Session Recovery] Found saved session:', {
            token: `${savedToken.substring(0, 8)}...`,
            startTime: new Date(parseInt(savedStartTime)).toISOString(),
          });

          // Verify session is still active in database
          const status = await simulationTracker.getSimulationStatus(savedToken);
          console.log('[KP Session Recovery] Database status:', status);

          if (status && !status.ended_at) {
            const elapsed = Date.now() - parseInt(savedStartTime);
            const remaining = SIMULATION_DURATION_SECONDS * 1000 - elapsed;

            if (remaining > 0) {
              // Active session exists - KEEP optimistic state
              console.log('[KP Session Recovery] ✅ Active session found!', {
                elapsed: `${Math.floor(elapsed / 1000)}s`,
                remaining: `${Math.floor(remaining / 1000)}s`,
                counted: status.counted_toward_usage,
              });

              // Keep optimistic deduction if session was active
              applyOptimisticDeduction();

              // Set session token for potential continuation
              setSessionToken(savedToken);
              sessionTokenRef.current = savedToken;

              // Update usage marked state if already counted
              if (status.counted_toward_usage) {
                setUsageMarked(true);
                usageMarkedRef.current = true;
              }

              console.log('[KP Session Recovery] ✅ Session state restored. User can continue or start fresh.');
              return; // Don't reset optimistic count
            } else {
              console.log('[KP Session Recovery] Session expired (time exceeded), cleaning up...');
            }
          } else {
            console.log('[KP Session Recovery] Session already ended in database, cleaning up...');
          }
        } else {
          console.log('[KP Session Recovery] No saved session found');
        }

        // No active session found - clear storage and reset optimistic count
        console.log('[KP Session Recovery] Clearing stale session data and resetting counter...');
        await SecureStore.deleteItemAsync('sim_session_token_kp').catch(() => {});
        await AsyncStorage.multiRemove(['sim_start_time_kp', 'sim_end_time_kp', 'sim_duration_ms_kp']).catch(() => {});

        console.log('[KP Session Recovery] Calling resetOptimisticCount()...');
        resetOptimisticCount();
        console.log('[KP Session Recovery] ✅ Recovery complete');
      } catch (error) {
        console.error('[KP Session Recovery] ❌ Error during recovery:', error);
        // On error, safe default: reset optimistic count
        resetOptimisticCount();
      }
    };

    recoverOrResetSession();
  }, [resetOptimisticCount, applyOptimisticDeduction]);

  // Add state for initialization tracking
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const initializationAttemptsRef = useRef(0);
  const hasInitializedRef = useRef(false); // Prevent double initialization
  const maxRetryAttempts = 3;

  // Initialize Voiceflow widget when component mounts
  useEffect(() => {
    console.log('🟢🟢🟢 KP SIMULATION useEffect FIRED');
    console.log('Platform.OS:', Platform.OS);
    console.log('User:', user ? 'Present' : 'Missing');
    console.log('checkAccess function:', typeof checkAccess);
    console.log('widgetDebugLog state:', widgetDebugLog);

    const initializeVoiceflow = async () => {
      console.log('🚀🚀🚀 initializeVoiceflow() CALLED');
      console.log('About to call addDebugLog...');

      try {
        addDebugLog('useEffect fired - starting initialization');
        console.log('✅ addDebugLog called successfully');
      } catch (error) {
        console.error('❌ Error calling addDebugLog:', error);
      }

      const timestamp = new Date().toISOString();

      // ============================================
      // PREVENT DOUBLE INITIALIZATION
      // ============================================
      if (hasInitializedRef.current) {
        logger.info(`⚠️ [${timestamp}] Skipping initialization - already initialized`);
        addDebugLog('Already initialized - skipping');
        return;
      }

      // ============================================
      // STEP 1: VALIDATE USER DATA
      // ============================================
      logger.info(`🔐 [${timestamp}] Step 1: Validating user data...`);

      if (typeof window === 'undefined') {
        logger.error(`❌ [${timestamp}] Window object not available - must run in browser`);
        setInitializationError('Initialization failed: Not running in browser environment');
        return;
      }

      if (!user) {
        logger.error(`❌ [${timestamp}] No user object found`);
        setInitializationError('User not authenticated');
        Alert.alert('Authentifizierungsfehler', 'Bitte melden Sie sich an, um fortzufahren.', [
          { text: 'OK', onPress: () => router.push('/(tabs)/simulation') },
        ]);
        return;
      }

      if (!user.id) {
        logger.error(`❌ [${timestamp}] User object exists but user.id is missing:`, user);
        setInitializationError('User ID not found');
        Alert.alert('Authentifizierungsfehler', 'Benutzer-ID fehlt. Bitte melden Sie sich erneut an.', [
          { text: 'OK', onPress: () => router.push('/(tabs)/simulation') },
        ]);
        return;
      }

      logger.info(`✅ [${timestamp}] User validated - ID: ${user.id}`);
      addDebugLog(`User validated: ${user.id.substring(0, 8)}...`);

      // ============================================
      // STEP 2: CHECK ACCESS PERMISSIONS
      // ============================================
      logger.info(`🔒 [${timestamp}] Step 2: Checking access permissions...`);
      addDebugLog('Checking access permissions...');

      try {
        const accessCheck = await checkAccess();

        if (!accessCheck) {
          logger.error(`❌ [${timestamp}] Access check returned null/undefined`);
          addDebugLog('ERROR: Access check failed');
          setInitializationError('Failed to verify access permissions');
          Alert.alert(
            'Zugriffsfehler',
            'Zugriffsberechtigungen konnten nicht überprüft werden. Bitte versuchen Sie es erneut.',
            [{ text: 'OK' }]
          );
          return;
        }

        logger.info(`📊 [${timestamp}] Access check result:`, {
          canUse: accessCheck.canUseSimulation,
          remaining: accessCheck.remainingSimulations,
          limit: accessCheck.simulationLimit,
        });

        if (!accessCheck.canUseSimulation || accessCheck.remainingSimulations === 0) {
          logger.info(`🚫 [${timestamp}] Blocking Voiceflow initialization - no simulations remaining`);
          addDebugLog('BLOCKED: No simulations remaining');
          setInitializationError('No simulations remaining');
          return; // Do NOT initialize widget
        }

        logger.info(`✅ [${timestamp}] Access granted - ${accessCheck.remainingSimulations} simulations remaining`);
        addDebugLog(`Access granted: ${accessCheck.remainingSimulations} remaining`);
      } catch (accessError) {
        logger.error(`❌ [${timestamp}] Error checking access:`, accessError);
        addDebugLog(`ERROR: ${accessError instanceof Error ? accessError.message : String(accessError)}`);
        setInitializationError('Access check failed');
        Alert.alert(
          'Zugriffsfehler',
          'Fehler beim Überprüfen der Zugriffsberechtigungen. Bitte versuchen Sie es erneut.',
          [{ text: 'OK' }]
        );
        return;
      }

      // ============================================
      // STEP 2B: CHECK FOR ACTIVE SIMULATION (RESTORE SESSION)
      // ============================================
      logger.info(`🔍 [${timestamp}] Step 2b: Checking for active simulation to restore...`);

      try {
        const activeSimulation = await quotaService.getActiveSimulation(user.id);

        if (activeSimulation.has_active_simulation && activeSimulation.session_token && activeSimulation.started_at) {
          // Check if session is recent (within last 30 minutes)
          // Only restore recent sessions to avoid stale simulations from hours/days ago
          const sessionStart = new Date(activeSimulation.started_at).getTime();
          const now = Date.now();
          const ageMinutes = (now - sessionStart) / (1000 * 60);

          logger.info(`✅ [${timestamp}] Found active simulation:`, {
            sessionToken: `${activeSimulation.session_token.substring(0, 8)}...`,
            simulationType: activeSimulation.simulation_type,
            elapsedSeconds: activeSimulation.elapsed_seconds,
            ageMinutes: Math.round(ageMinutes),
          });

          // Only restore if session is fresh (within 30 minutes grace period)
          if (ageMinutes <= STALE_SESSION_GRACE_PERIOD_MINUTES) {
            // Restore session token only - don't auto-start timer
            // User must explicitly click "Start Timer" to resume
            setSessionToken(activeSimulation.session_token);
            sessionTokenRef.current = activeSimulation.session_token;

            logger.info(`✅ [${timestamp}] Session is recent (${Math.round(ageMinutes)}min old) - restored for resume`);
          } else {
            logger.warn(
              `⚠️ [${timestamp}] Session is stale (${Math.round(ageMinutes)}min old) - NOT restoring. Will create new session.`
            );

            // IMPORTANT: Clear AsyncStorage to prevent SESSION RECOVERY useEffect from restoring stale data
            try {
              await SecureStore.deleteItemAsync('sim_session_token_kp');
              await AsyncStorage.multiRemove(['sim_start_time_kp', 'sim_end_time_kp', 'sim_duration_ms_kp']);
              logger.info(`🧹 [${timestamp}] Cleared stale session data from AsyncStorage`);
            } catch (error) {
              logger.error(`❌ [${timestamp}] Error clearing AsyncStorage:`, error);
            }
          }

          // Continue with Voiceflow initialization
        } else {
          logger.info(`ℹ️ [${timestamp}] No active simulation found - will create new session`);

          // Clear any stale AsyncStorage data
          try {
            await SecureStore.deleteItemAsync('sim_session_token_kp');
            await AsyncStorage.multiRemove(['sim_start_time_kp', 'sim_end_time_kp', 'sim_duration_ms_kp']);
            logger.info(`🧹 [${timestamp}] Cleared any stale session data from AsyncStorage`);
          } catch (error) {
            logger.error(`❌ [${timestamp}] Error clearing AsyncStorage:`, error);
          }
        }
      } catch (error) {
        logger.error(`⚠️ [${timestamp}] Error checking for active simulation:`, error);
        // Continue with normal initialization if check fails
      }

      // ============================================
      // STEP 3: INITIALIZE WITH RETRY LOGIC (WEB ONLY)
      // ============================================
      if (Platform.OS === 'web') {
        logger.info(`🚀 [${timestamp}] Step 3: Starting Voiceflow initialization with retry logic...`);
        addDebugLog('Platform: web - initializing Voiceflow...');
        await initializeWithRetry(user.id, timestamp);
      } else {
        logger.info(`📱 [${timestamp}] Mobile platform detected - Voiceflow widget only available on web`);
        addDebugLog(`Platform: ${Platform.OS} - widget not available`);
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
        logger.info(`🔄 [${timestamp}] Attempt ${attempt}/${maxRetryAttempts}: Initializing Voiceflow...`);
        addDebugLog(`Attempt ${attempt}/${maxRetryAttempts} starting...`);
        setIsInitializing(true);
        setInitializationError(null);
        initializationAttemptsRef.current = attempt;

        // Disable global cleanup to allow widget
        logger.info(`🛑 [${timestamp}] Disabling global Voiceflow cleanup`);
        disableVoiceflowCleanup();
        stopGlobalVoiceflowCleanup();

        // ============================================
        // STEP 3A: GENERATE OR USE EXISTING SESSION TOKEN
        // ============================================
        if (sessionTokenRef.current) {
          // Session token already exists (restored from active simulation)
          logger.info(
            `🔑 [${timestamp}] Step 3a: Using restored session token: ${sessionTokenRef.current.substring(0, 8)}...`
          );
        } else {
          // No session token, generate new one
          logger.info(`🔑 [${timestamp}] Step 3a: Generating new session token before Voiceflow initialization`);

          const result = await simulationTracker.startSimulation('kp');

          logger.info(`📋 [${timestamp}] Session token generation result:`, {
            success: result.success,
            hasToken: !!result.sessionToken,
            error: result.error || 'none',
          });

          if (!result.success || !result.sessionToken) {
            throw new Error(`Session token generation failed: ${result.error || 'Unknown error'}`);
          }

          logger.info(
            `✅ [${timestamp}] Session token generated successfully: ${result.sessionToken.substring(0, 8)}...`
          );

          setSessionToken(result.sessionToken);
          sessionTokenRef.current = result.sessionToken;
        }

        // ============================================
        // STEP 3B: CREATE VOICEFLOW CONTROLLER
        // ============================================
        logger.info(`🎮 [${timestamp}] Step 3b: Creating Voiceflow controller with Supabase user ID and email`);
        logger.info(`📧 [${timestamp}] User object:`, {
          id: user.id,
          email: user.email,
          has_email: !!user.email,
          email_type: typeof user.email,
        });

        // FALLBACK: If email is not in user object, try to get it from Supabase session
        let userEmail = user.email;
        if (!userEmail) {
          logger.warn(`⚠️ [${timestamp}] Email not found in user object, fetching from Supabase session...`);
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user?.email) {
            userEmail = session.user.email;
            logger.info(`✅ [${timestamp}] Email retrieved from session: ${userEmail}`);
          } else {
            logger.error(`❌ [${timestamp}] Could not retrieve email from session!`);
          }
        }

        const controller = createKPController(user.id, userEmail);

        if (!controller) {
          throw new Error('Failed to create Voiceflow controller - returned null/undefined');
        }

        voiceflowController.current = controller;
        logger.info(`✅ [${timestamp}] Voiceflow controller created successfully`);

        // ============================================
        // STEP 3C: INITIALIZE VOICEFLOW WITH PERSISTENT IDS
        // ============================================
        logger.info(`🔗 [${timestamp}] Step 3c: Initializing Voiceflow with persistent session IDs`);

        // Get persistent IDs that will be used
        const persistentIds = controller.getIds();
        logger.info(`📤 [${timestamp}] Persistent IDs:`, {
          user_id: persistentIds.user_id,
          session_id: persistentIds.session_id,
        });

        const initialized = await controller.initialize();

        if (!initialized) {
          throw new Error('Voiceflow initialization returned false');
        }

        logger.info(`✅ [${timestamp}] Voiceflow initialized successfully with user credentials`);

        // ============================================
        // STEP 3D: VERIFY VOICEFLOW API AVAILABILITY
        // ============================================
        logger.info(`🔍 [${timestamp}] Step 3d: Verifying Voiceflow API availability`);

        if (!window.voiceflow) {
          throw new Error('Voiceflow API not available on window object after initialization');
        }

        if (!window.voiceflow.chat) {
          throw new Error('Voiceflow chat API not available after initialization');
        }

        logger.info(`✅ [${timestamp}] Voiceflow API verified and available`);

        // ============================================
        // STEP 3E: MAKE WIDGET VISIBLE
        // ============================================
        logger.info(`👁️ [${timestamp}] Step 3e: Making widget visible`);

        setTimeout(() => {
          try {
            if (window.voiceflow?.chat) {
              window.voiceflow.chat.show();
              logger.info(`✅ [${timestamp}] Widget made visible successfully`);
            } else {
              logger.warn(`⚠️ [${timestamp}] Voiceflow chat API not available during visibility check`);
            }
          } catch (visibilityError) {
            logger.error(`❌ [${timestamp}] Error making widget visible:`, visibilityError);
          }
        }, 1000);

        // ============================================
        // STEP 3F: SET UP CONVERSATION MONITORING
        // ============================================
        logger.info(`📡 [${timestamp}] Step 3f: Setting up conversation monitoring`);
        setupConversationMonitoring();
        logger.info(`✅ [${timestamp}] Conversation monitoring initialized`);

        // ============================================
        // STEP 3G: ADD VOICEFLOW MESSAGE LISTENER
        // ============================================
        logger.info(`🎧 [${timestamp}] Step 3g: Adding Voiceflow message event listener`);

        if (window.voiceflow?.chat) {
          // Listen for Voiceflow events (if available in the API)
          const voiceflowEventListener = (event: any) => {
            logger.info(`💬 [${new Date().toISOString()}] Voiceflow event received:`, {
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
              logger.info(`✅ [${timestamp}] Voiceflow message listener added`);
            } else {
              logger.info(`ℹ️ [${timestamp}] Voiceflow event listener API not available`);
            }
          } catch (listenerError) {
            logger.warn(`⚠️ [${timestamp}] Could not add Voiceflow event listener:`, listenerError);
          }
        }

        // ============================================
        // SUCCESS - RESET ERROR STATE
        // ============================================
        logger.info(`🎉 [${timestamp}] ========================================`);
        logger.info(`🎉 [${timestamp}] VOICEFLOW INITIALIZATION SUCCESSFUL!`);
        logger.info(`🎉 [${timestamp}] User ID: ${userId}`);
        logger.info(`🎉 [${timestamp}] Session Token: ${sessionTokenRef.current?.substring(0, 8)}...`);
        logger.info(`🎉 [${timestamp}] Attempts needed: ${attempt}/${maxRetryAttempts}`);
        logger.info(`🎉 [${timestamp}] ========================================`);

        // Mark as successfully initialized to prevent re-initialization
        hasInitializedRef.current = true;
        addDebugLog('✅ SUCCESS! Widget initialized');

        setIsInitializing(false);
        setInitializationError(null);
        return; // Success - exit retry loop
      } catch (error) {
        const timestamp = new Date().toISOString();
        const errorMessage = error instanceof Error ? error.message : String(error);

        logger.error(`❌ [${timestamp}] Attempt ${attempt}/${maxRetryAttempts} failed:`, {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        });
        addDebugLog(`❌ Attempt ${attempt} failed: ${errorMessage}`);

        // If this was the last attempt, show error to user
        if (attempt === maxRetryAttempts) {
          logger.error(`🚨 [${timestamp}] All ${maxRetryAttempts} initialization attempts failed`);

          // FIX: Clear storage on initialization failure
          clearSimulationStorage().catch((err) => logger.error('Error clearing storage after init failure:', err));

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
                  initializationAttemptsRef.current = 0;
                  initializeWithRetry(userId, timestamp);
                },
              },
            ]
          );

          return; // Exit - all attempts exhausted
        }

        // Calculate exponential backoff delay (1s, 2s, 3s)
        const delay = attempt * 1000;
        logger.info(`⏳ [${timestamp}] Waiting ${delay}ms before retry attempt ${attempt + 1}...`);

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };

  // Set up monitoring for conversation start
  const setupConversationMonitoring = () => {
    logger.info('🔍 KP: Setting up passive microphone detection...');

    // MEMORY LEAK FIX: Track listeners for cleanup
    const trackListeners: { track: MediaStreamTrack; handler: () => void }[] = [];
    (window as any).kpTrackListeners = trackListeners;

    // Method 1: Monitor for MediaStream creation and termination
    const originalGetUserMedia = navigator.mediaDevices?.getUserMedia;
    if (originalGetUserMedia) {
      navigator.mediaDevices.getUserMedia = async function (constraints) {
        logger.info('🎤 KP: MediaStream requested with constraints:', constraints);

        if (constraints?.audio) {
          try {
            const stream = await originalGetUserMedia.call(this, constraints);

            // Start timer when voice call begins (use ref to avoid closure issues)
            if (!timerActiveRef.current) {
              logger.info('🎯 KP: Audio stream granted - voice call starting!');
              logger.info('⏰ KP: Starting 20-minute timer due to voice call');
              logger.info('🔍 DEBUG: About to call startSimulationTimer()');
              startSimulationTimer();
            } else {
              logger.info('⏰ KP: Timer already active, not starting again');
            }

            // Monitor stream tracks for when they end
            const audioTracks = stream.getAudioTracks();
            audioTracks.forEach((track, index) => {
              logger.info(`🎤 KP: Monitoring audio track ${index + 1}`);

              // Create handler and store for cleanup
              const endedHandler = () => {
                logger.info(`🔇 KP: Audio track ${index + 1} ended - AUTOMATICALLY STOPPING TIMER`);

                // Automatically stop the timer when the call ends
                if (timerActiveRef.current) {
                  logger.info(`⏹️ KP: Call ended naturally - stopping simulation timer automatically`);
                  stopSimulationTimer('completed');
                }
              };

              track.addEventListener('ended', endedHandler);
              trackListeners.push({ track, handler: endedHandler });

              // Also monitor for track being stopped manually
              const originalStop = track.stop.bind(track);
              track.stop = () => {
                logger.info(`🔇 KP: Audio track ${index + 1} stopped manually - AUTOMATICALLY STOPPING TIMER`);
                originalStop();

                // Automatically stop the timer when the call ends
                if (timerActiveRef.current) {
                  logger.info(`⏹️ KP: Call ended - stopping simulation timer automatically`);
                  stopSimulationTimer('completed');
                }
              };
            });

            return stream;
          } catch (error) {
            logger.info('❌ KP: Failed to get audio stream:', error);
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
        logger.info('🎯 KP: Click detected on Voiceflow widget - waiting for voice call...');
        // Don't start timer immediately, wait for actual mic access
      }
    };

    document.addEventListener('click', clickListener, true);

    // Store references for cleanup
    (window as any).kpClickListener = clickListener;
    (window as any).kpOriginalGetUserMedia = originalGetUserMedia;
  };

  // Start the 20-minute simulation timer
  const startSimulationTimer = async () => {
    logger.info(
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
      logger.info('🔒 RACE CONDITION PREVENTED: Timer start already in progress, blocking concurrent call');
      return;
    }
    timerStartLockRef.current = true; // Set lock immediately

    try {
      // STEP 7: STRICT ACCESS CHECK - Verify access before starting timer
      logger.info('[Timer] KP: Attempting to start timer...');
      const accessCheck = await checkAccess();

      logger.info('[Timer] KP: Access check:', {
        canStart: accessCheck?.canUseSimulation,
        remaining: accessCheck?.remainingSimulations,
        total: accessCheck?.simulationLimit,
      });

      // CRITICAL: Block if access is denied
      if (!accessCheck || !accessCheck.canUseSimulation) {
        logger.error('[Timer] KP: ❌ ACCESS DENIED - Cannot start simulation');

        // Show upgrade modal
        setShowUpgradeModal(true);
        setIsSimulationLocked(true);

        Alert.alert('Simulationslimit erreicht', accessCheck?.message || 'Sie haben Ihr Simulationslimit erreicht.', [
          { text: 'Upgrade', onPress: () => router.push('subscription' as any) },
          { text: 'OK' },
        ]);

        return; // BLOCK timer start (lock released in finally)
      }

      // Access granted - proceed with timer
      logger.info('[Timer] KP: ✅ Access GRANTED - Starting timer...');

      // CRITICAL: Check if session token already exists (generated during initialization)
      if (!sessionTokenRef.current) {
        logger.error('❌ KP: No session token found - this should have been generated during initialization');
        return; // Lock released in finally
      }

      logger.info('✅ KP: Using existing session token from initialization:', sessionTokenRef.current);

      // IMPORTANT: Check if timer is ACTUALLY active by checking the interval, not just the ref
      // This prevents false positives from stale state
      if (timerActiveRef.current && timerInterval.current !== null) {
        logger.info('🔍 DEBUG: Timer already active (ref + interval exists), returning early');
        return; // Lock released in finally
      }

      // If ref is true but interval is null, we have stale state - reset it
      if (timerActiveRef.current && timerInterval.current === null) {
        logger.warn('⚠️ KP: Detected stale timer state, resetting...');
        timerActiveRef.current = false;
        setTimerActive(false);
      }

      logger.info('⏰ KP: Starting simulation timer');
      logger.info('🔍 KP DEBUG: Current timerActive state:', timerActive);
      logger.info('🔍 KP DEBUG: Current timerActiveRef:', timerActiveRef.current);
      logger.info('🔍 KP DEBUG: Current timerInterval:', timerInterval.current);

      // Check if this is a resumed session (check for active simulation)
      let remainingSeconds = SIMULATION_DURATION_SECONDS;
      let isResumingSession = false;

      try {
        const activeSimulation = await quotaService.getActiveSimulation(user.id);
        if (activeSimulation.has_active_simulation && activeSimulation.session_token === sessionTokenRef.current) {
          // This is a resumed session - calculate remaining time
          const elapsedSeconds = activeSimulation.elapsed_seconds || 0;
          remainingSeconds = Math.max(0, SIMULATION_DURATION_SECONDS - elapsedSeconds);
          isResumingSession = true;
          logger.info(`🔄 KP: Resuming session - elapsed: ${elapsedSeconds}s, remaining: ${remainingSeconds}s`);
        }
      } catch (error) {
        logger.error('⚠️ KP: Error checking for active simulation, starting fresh timer:', error);
      }

      // SET TIMER ACTIVE IMMEDIATELY - before any async operations that might fail
      logger.info('🔍 DEBUG: Setting timer active IMMEDIATELY');

      // Set ref FIRST to prevent race conditions
      timerActiveRef.current = true;
      previousTimeRef.current = remainingSeconds;

      // Then update React state
      setTimerActive(true);
      setTimeRemaining(remainingSeconds);

      logger.info('🔍 KP DEBUG: Timer state updated - timerActiveRef:', timerActiveRef.current);

      // Calculate end time upfront
      const startTime = Date.now();
      const duration = remainingSeconds * 1000;
      const endTime = startTime + duration;
      setTimerEndTime(endTime);
      timerEndTimeRef.current = endTime;
      previousTimeRef.current = remainingSeconds;

      try {
        // Apply optimistic counter deduction (show immediate feedback to user)
        applyOptimisticDeduction();

        // FIX: Save simulation state using AsyncStorage (non-sensitive) and SecureStore (sensitive data)
        try {
          // Non-sensitive data - use AsyncStorage
          await AsyncStorage.multiSet([
            ['sim_start_time_kp', startTime.toString()],
            ['sim_end_time_kp', endTime.toString()],
            ['sim_duration_ms_kp', duration.toString()],
          ]);

          // Sensitive data - use SecureStore (encrypted storage)
          await SecureStore.setItemAsync('sim_session_token_kp', sessionTokenRef.current);
          if (user?.id) {
            await SecureStore.setItemAsync('sim_user_id_kp', user.id);
          }

          logger.info('💾 KP: Saved simulation state securely (AsyncStorage + SecureStore)');
        } catch (error) {
          logger.error('❌ KP: Error saving simulation state:', error);
        }

        setUsageMarked(false);
        usageMarkedRef.current = false; // Initialize ref

        logger.info('✅ KP: Timer started with existing session token');
      } catch (error) {
        logger.error('❌ KP: Error during timer setup:', error);
      }

      logger.info('🔍 DEBUG: Timer already active, now starting timer interval');
      // NOTE: Heartbeat removed - deprecated/no-op in new system

      logger.info('🔍 DEBUG: Creating timer interval with absolute time calculation, endTime:', endTime);

      // Use 1000ms interval for better mobile compatibility (less battery drain)
      timerInterval.current = setInterval(() => {
        // Calculate remaining time based on absolute end time (use ref for mobile reliability)
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
          logger.info('⏰ KP: Timer finished - 20 minutes elapsed');
          logger.info('🔚 KP: Initiating graceful end sequence');
          initiateGracefulEnd();
          return;
        } else {
          setTimeRemaining(remainingSeconds);
          previousTimeRef.current = remainingSeconds;
        }

        // Log timer value every 10 seconds (only when value changes)
        if (remainingSeconds % 10 === 0 && remainingSeconds !== prev) {
          logger.info(
            '⏱️ DEBUG: Timer at',
            `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}`,
            `(${remainingSeconds} seconds)`
          );
        }

        // Mark as used at 5-minute mark (only trigger once)
        // NOTE: Total duration = SIMULATION_DURATION_SECONDS, so 5 minutes elapsed = (total-5) minutes REMAINING
        const fiveMinutesRemaining = SIMULATION_DURATION_SECONDS - USAGE_THRESHOLD_SECONDS;
        const currentSessionToken = sessionTokenRef.current; // Get from ref to avoid closure issues
        if (
          prev > fiveMinutesRemaining &&
          remainingSeconds <= fiveMinutesRemaining &&
          !usageMarkedRef.current &&
          currentSessionToken
        ) {
          const clientElapsed = SIMULATION_DURATION_SECONDS - remainingSeconds;
          logger.info('🔍 DEBUG: 5-minute mark reached, marking as used');
          logger.info('🔍 DEBUG: Remaining seconds:', remainingSeconds);
          logger.info('🔍 DEBUG: Client calculated elapsed time:', clientElapsed, 'seconds');
          logger.info('🔍 DEBUG: Using sessionToken from ref:', currentSessionToken);
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
      logger.error('❌ KP: Error in startSimulationTimer:', error);
      // CRITICAL: Rollback optimistic counter deduction on error
      resetOptimisticCount();
      logger.info('🔄 Rolled back optimistic counter deduction due to error');

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
      logger.info('🔓 Timer start lock released');
    }
  };

  // Mark simulation as used at 5-minute mark
  const markSimulationAsUsed = async (clientElapsedSeconds?: number) => {
    const token = sessionTokenRef.current; // Use ref instead of state
    if (!token || usageMarkedRef.current) return;

    logger.info('📊 KP: Marking simulation as used at 5-minute mark');
    logger.info('🔍 DEBUG: Client elapsed seconds:', clientElapsedSeconds);
    logger.info('🔍 DEBUG: Using session token:', token);

    try {
      const result = await simulationTracker.markSimulationUsed(token, clientElapsedSeconds);
      if (result.success) {
        setUsageMarked(true);
        usageMarkedRef.current = true; // Also update ref for cleanup closure
        logger.info('✅ KP: Simulation usage recorded in database with server validation');
        logger.info('✅ KP: Counter automatically incremented by database function');

        // NOTE: We do NOT call recordUsage() here because mark_simulation_counted
        // already increments the counter in the database. Calling recordUsage() would
        // result in double-counting (incrementing the counter twice).
      } else {
        logger.error('❌ KP: Failed to mark simulation as used:', result.error);

        // If server rejected due to time manipulation, flag it
        if (result.error?.includes('insufficient_time')) {
          logger.info('🛡️ SECURITY: Server blocked usage marking - possible time manipulation attempt');
        }
      }
    } catch (error) {
      logger.error('❌ KP: Error marking simulation as used:', error);
    }
  };

  // End the Voiceflow conversation
  const endVoiceflowConversation = () => {
    try {
      // Method 1: Try to close the Voiceflow widget
      if (window.voiceflow?.chat) {
        logger.info('🔚 KP: Attempting to close Voiceflow widget');
        window.voiceflow.chat.close && window.voiceflow.chat.close();
        window.voiceflow.chat.hide && window.voiceflow.chat.hide();
      }

      // Method 2: Try to stop any active media streams
      navigator.mediaDevices
        ?.getUserMedia({ audio: true })
        .then((stream) => {
          logger.info('🔚 KP: Stopping active audio streams');
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
            logger.info('🔚 KP: Found potential end call button, clicking it');
            button.click();
            break;
          }
        }
      }, 500);
    } catch (error) {
      logger.error('❌ KP: Error ending Voiceflow conversation:', error);
    }
  };

  // Stop the simulation timer
  const stopSimulationTimer = async (reason: 'completed' | 'aborted' = 'completed') => {
    logger.info('🛑 KP: Stopping simulation timer');

    const elapsedSeconds = 20 * 60 - timeRemaining;

    // If graceful shutdown is in progress, skip widget cleanup (already done)
    if (isGracefulShutdown && reason === 'completed') {
      // Just update database
      try {
        if (sessionToken) {
          await simulationTracker.updateSimulationStatus(sessionToken, 'completed', elapsedSeconds);
          logger.info(`📊 KP: Graceful shutdown - Simulation marked as completed (${elapsedSeconds}s elapsed)`);
        }
      } catch (error) {
        logger.error('❌ KP: Error updating session during graceful shutdown:', error);
      }

      // Reset state
      resetSimulationState();
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
        logger.info('📊 KP: Marking as incomplete - ended before 5-minute mark');

        // Reset optimistic counter since simulation ended before being charged
        logger.info('🔄 KP: Resetting optimistic count - simulation ended before being charged');
        resetOptimisticCount();
      } else {
        finalStatus = 'aborted';
        logger.info('📊 KP: Marking as aborted - ended after 5-minute mark (or usage already recorded)');
      }
    }

    // Use centralized cleanup
    await cleanupVoiceflowWidget({
      finalStatus,
      elapsedSeconds,
      skipDatabaseUpdate: false,
    });

    // Reset simulation state to allow restart
    resetSimulationState();

    // After a short delay, reinitialize the conversation monitoring for restart
    setTimeout(() => {
      if (voiceflowController.current) {
        logger.info('🔄 KP: Reinitializing conversation monitoring after stop');
        setupConversationMonitoring();
      }
    }, 1000);
  };

  // Initiate graceful end sequence
  const initiateGracefulEnd = () => {
    logger.info('🎬 KP: Starting graceful end sequence');

    // Prevent timer from continuing
    setIsGracefulShutdown(true);

    // Clear existing timer interval
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }

    // NOTE: Heartbeat cleanup removed - deprecated/no-op in new system

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
    logger.info('🏁 KP: Executing simulation end');

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
    resetSimulationState();

    // Show completion modal after cleanup
    setTimeout(() => {
      showCompletionModal();
    }, 500);
  };

  // Show completion modal
  const showCompletionModal = () => {
    logger.info('🎉 KP: Showing completion modal');
    setShowSimulationCompleted(true);
  };

  // Navigate to evaluation page (fetch latest evaluation for this user)
  const navigateToEvaluation = async () => {
    try {
      setShowSimulationCompleted(false);

      logger.info('Fetching latest KP evaluation for user...');

      // Fetch the most recent KP evaluation for this user
      const { data, error } = await supabase
        .from('evaluation_scores')
        .select('id')
        .eq('user_id', user?.id)
        .eq('exam_type', 'KP')
        .order('evaluation_timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        logger.error('Error fetching latest evaluation:', error);
        // Fallback to progress page if evaluation not found
        router.push('/(tabs)/progress');
        return;
      }

      logger.info('Found evaluation ID:', data.id);
      // Navigate to evaluation detail page
      router.push(`/evaluation/${data.id}` as any);
    } catch (err) {
      logger.error('Exception fetching evaluation:', err);
      // Fallback to progress page
      router.push('/(tabs)/progress');
    }
  };

  // Keep old function name for backward compatibility
  const navigateToProgress = navigateToEvaluation;

  // Close completion modal
  const closeCompletionModal = () => {
    setShowSimulationCompleted(false);
    resetSimulationState();
  };

  // Early completion functions
  const initiateEarlyCompletion = () => {
    logger.info('🏁 KP: User initiated early completion');
    setShowEarlyCompletionModal(true);
  };

  const confirmEarlyCompletion = () => {
    logger.info('✅ KP: User confirmed early completion');
    setShowEarlyCompletionModal(false);

    // Calculate elapsed time
    const elapsedSeconds = 20 * 60 - timeRemaining;
    logger.info(
      `📊 KP: Completed early after ${elapsedSeconds} seconds (${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, '0')})`
    );

    // Execute early completion sequence
    executeEarlyCompletion(elapsedSeconds);
  };

  const cancelEarlyCompletion = () => {
    logger.info('↩️ KP: User cancelled early completion');
    setShowEarlyCompletionModal(false);
    setEarlyCompletionReason('');
  };

  const executeEarlyCompletion = async (elapsedSeconds: number) => {
    logger.info('🏁 KP: Executing early completion');

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
        logger.info(
          `📊 KP: Early completion recorded (${elapsedSeconds}s elapsed, reason: ${earlyCompletionReason || 'user_finished_early'})`
        );

        // Reset optimistic counter if simulation ended before being charged (< 5 minutes)
        if (!usageMarked && elapsedSeconds < USAGE_THRESHOLD_SECONDS) {
          logger.info('🔄 KP: Early completion before 5-minute mark - resetting optimistic count');
          resetOptimisticCount();
        } else if (elapsedSeconds >= USAGE_THRESHOLD_SECONDS) {
          logger.info('✅ KP: Simulation reached 5-minute threshold - counter already deducted, no reset needed');
        }
      } catch (error) {
        logger.error('❌ KP: Error updating early completion status:', error);
      }
    }

    // Reset simulation state
    resetSimulationState();

    // Show completion modal after cleanup
    setTimeout(() => {
      showCompletionModal();
    }, 500);
  };

  // Cleanup when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      logger.info('🧹 KP: Component unmount cleanup started');

      // Determine final status based on whether usage was recorded
      const finalStatus = usageMarkedRef.current ? 'completed' : 'aborted';
      const elapsedSeconds = 20 * 60 - timeRemaining;

      logger.info(`🔍 KP: Cleanup - usageMarked=${usageMarkedRef.current}, marking session as ${finalStatus}`);

      // Use centralized cleanup (async but don't wait for it in cleanup)
      if (timerActiveRef.current && sessionTokenRef.current) {
        cleanupVoiceflowWidget({
          finalStatus,
          elapsedSeconds,
          skipDatabaseUpdate: false,
        })
          .then(() => {
            logger.info('✅ KP: Cleanup completed successfully');
          })
          .catch((error) => {
            logger.error('❌ KP: Error during cleanup:', error);
          });
      }

      // Remove event listeners
      if ((window as any).kpClickListener) {
        document.removeEventListener('click', (window as any).kpClickListener, true);
        delete (window as any).kpClickListener;
      }

      // MEMORY LEAK FIX: Clean up tracked audio track listeners
      if ((window as any).kpTrackListeners) {
        const trackListeners = (window as any).kpTrackListeners;
        trackListeners.forEach(({ track, handler }: { track: MediaStreamTrack; handler: () => void }) => {
          try {
            track.removeEventListener('ended', handler);
            logger.info('🧹 KP: Removed track event listener');
          } catch (error) {
            logger.warn('⚠️ KP: Error removing track listener:', error);
          }
        });
        trackListeners.length = 0; // Clear the array
        delete (window as any).kpTrackListeners;
      }

      // Restore original getUserMedia function
      if ((window as any).kpOriginalGetUserMedia && navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = (window as any).kpOriginalGetUserMedia;
        delete (window as any).kpOriginalGetUserMedia;
      }

      // Run global cleanup to ensure widget is completely removed
      if (Platform.OS === 'web') {
        logger.info('🌍 KP: Re-enabling global Voiceflow cleanup');
        enableVoiceflowCleanup();
        logger.info('🌍 KP: Running global Voiceflow cleanup with force=true');
        globalVoiceflowCleanup(true);
      }

      logger.info('✅ KP: Component unmount cleanup initiated');
    };
  }, []);

  // Handle navigation away from page with immediate cleanup
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (timerActive && sessionTokenRef.current) {
        // CRITICAL FIX: End simulation in database before page unloads
        // Use sendBeacon for reliability - guaranteed to send even during unload
        logger.info('🚨 KP: Page unloading with active simulation - ending session NOW');

        try {
          // Prepare the end session request
          const {
            data: { session },
          } = supabase.auth.getSession();
          if (session?.access_token && user?.id && sessionTokenRef.current) {
            const payload = {
              p_session_token: sessionTokenRef.current,
              p_user_id: user.id,
            };

            // Use sendBeacon to reliably end the simulation even if page closes
            // This is a synchronous, guaranteed-delivery API designed for page unload
            const beaconUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/rpc/end_simulation_session`;
            const beaconData = new Blob([JSON.stringify(payload)], { type: 'application/json' });

            // Send with authentication headers via fetch keepalive (sendBeacon doesn't support custom headers well)
            fetch(beaconUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify(payload),
              keepalive: true, // This ensures request completes even if page closes
            }).catch((err) => {
              logger.error('❌ KP: Failed to end simulation on unload:', err);
            });

            logger.info('✅ KP: Simulation end request sent (keepalive)');
          }
        } catch (error) {
          logger.error('❌ KP: Error ending simulation on unload:', error);
        }

        e.preventDefault();
        e.returnValue = 'Simulation läuft. Möchten Sie wirklich die Seite verlassen?';
        return e.returnValue;
      }
    };

    // Enhanced visibility change handler for immediate widget cleanup
    const handleVisibilityChange = async () => {
      if (timerActive && (document.visibilityState === 'hidden' || document.hidden)) {
        logger.info('🚫 KP: Attempted to leave page during simulation - BLOCKED');
        // For mobile apps, prevent backgrounding during simulation
        if (Platform.OS !== 'web') {
          Alert.alert('Simulation läuft', 'Sie können die App nicht verlassen, während die Simulation läuft.', [
            { text: 'OK' },
          ]);
        }
        return false;
      }

      // Re-validate access when user returns to tab
      if (document.visibilityState === 'visible' && !document.hidden) {
        logger.info('[Tab Visibility] KP: Tab became visible - re-validating access...');
        const accessCheck = await checkAccess();

        if (accessCheck && !accessCheck.canUseSimulation) {
          logger.warn('[Tab Visibility] KP: ⚠️ Access lost while away - locking simulation');
          setIsSimulationLocked(true);

          if (timerActive) {
            // Stop the simulation if it's running
            await stopSimulationTimer('aborted');
          }
        }
      }
    };

    // Handle route changes - BLOCK during active simulation
    const handlePopState = (e: PopStateEvent) => {
      if (timerActive) {
        logger.info('🚫 KP: Navigation blocked - simulation in progress');
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

  // Monitor subscription status for lock state
  useEffect(() => {
    logger.info('[Lock Monitor] KP: useEffect triggered', {
      hasSubscriptionStatus: !!subscriptionStatus,
      canUse: subscriptionStatus?.canUseSimulation,
      remaining: subscriptionStatus?.remainingSimulations,
      currentLockState: isSimulationLocked,
    });

    if (subscriptionStatus) {
      const shouldLock = !subscriptionStatus.canUseSimulation;
      logger.info('[Lock Monitor] KP: Subscription status changed:', {
        canUse: subscriptionStatus.canUseSimulation,
        remaining: subscriptionStatus.remainingSimulations,
        shouldLock,
        willUpdateLockState: shouldLock !== isSimulationLocked,
      });

      if (shouldLock !== isSimulationLocked) {
        logger.info(`[Lock Monitor] KP: 🔒 Setting lock state to: ${shouldLock}`);
        setIsSimulationLocked(shouldLock);
      }

      if (shouldLock && timerActive) {
        logger.warn('[Lock Monitor] KP: ⚠️ User ran out of simulations during active session!');
      }
    } else {
      logger.warn('[Lock Monitor] KP: No subscription status available yet');
    }
  }, [subscriptionStatus, timerActive, isSimulationLocked]);

  // Immediate cleanup function for navigation events
  const performImmediateCleanup = () => {
    try {
      logger.info('⚡ KP: Performing immediate cleanup');

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
          logger.info(`🗑️ KP: Immediately removed element: ${selector}`);
        });
      });

      // Stop any active media streams
      navigator.mediaDevices
        ?.getUserMedia({ audio: true })
        .then((stream) => {
          stream.getTracks().forEach((track) => {
            track.stop();
            logger.info('🔇 KP: Stopped audio track during immediate cleanup');
          });
        })
        .catch(() => {});

      logger.info('✅ KP: Immediate cleanup completed');
    } catch (error) {
      logger.error('❌ KP: Error during immediate cleanup:', error);
    }
  };

  // Reset simulation state for restart
  const resetSimulationState = () => {
    logger.info('🔄 KP: Resetting simulation state for restart');

    // CRITICAL: Clear intervals FIRST before resetting refs
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
      logger.info('✅ KP: Cleared timer interval');
    }

    // NOTE: Heartbeat cleanup removed - deprecated/no-op in new system

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
    setSessionToken(null);
    sessionTokenRef.current = null; // Also reset ref
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
    if ((window as any).kpOriginalGetUserMedia && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = (window as any).kpOriginalGetUserMedia;
      delete (window as any).kpOriginalGetUserMedia;
    }

    // Remove and re-add click listener for next run
    if ((window as any).kpClickListener) {
      document.removeEventListener('click', (window as any).kpClickListener, true);
      delete (window as any).kpClickListener;
    }

    // FIX: Clear storage (fire-and-forget for non-blocking reset)
    clearSimulationStorage().catch((err) => logger.error('Error clearing storage during reset:', err));

    // Reset early completion state
    setShowEarlyCompletionModal(false);
    setEarlyCompletionReason('');

    logger.info('✅ KP: Simulation state reset completed - ready for next run');
    logger.info(
      '🔍 KP: Post-reset state - timerActiveRef:',
      timerActiveRef.current,
      'timerInterval:',
      timerInterval.current
    );

    // Re-setup conversation monitoring for next run
    setTimeout(() => {
      if (voiceflowController.current) {
        logger.info('🔄 KP: Re-initializing conversation monitoring after reset');
        setupConversationMonitoring();
      }
    }, 500);
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
      logger.info('⚠️ KP: Cleanup already in progress, skipping...');
      return;
    }

    logger.info('🧹 KP: Starting centralized widget cleanup...');
    isCleaningUpRef.current = true;

    try {
      // Step 1: Stop all intervals immediately
      logger.info('🛑 KP: Step 1 - Clearing all intervals...');
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
      // NOTE: Heartbeat cleanup removed - deprecated/no-op in new system
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
      logger.info('🔚 KP: Step 3 - Closing Voiceflow widget...');
      if (window.voiceflow?.chat) {
        try {
          window.voiceflow.chat.close && window.voiceflow.chat.close();
          window.voiceflow.chat.hide && window.voiceflow.chat.hide();
          logger.info('✅ KP: Voiceflow widget closed');
        } catch (error) {
          logger.error('❌ KP: Error closing Voiceflow widget:', error);
        }
      }

      // Step 4: Wait for widget to close
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 5: Destroy controller
      logger.info('🔧 KP: Step 5 - Destroying controller...');
      if (voiceflowController.current) {
        try {
          voiceflowController.current.destroy();
          voiceflowController.current = null;
          logger.info('✅ KP: Controller destroyed');
        } catch (error) {
          logger.error('❌ KP: Error destroying controller:', error);
        }
      }

      // Step 6: Force remove DOM elements
      logger.info('🗑️ KP: Step 6 - Force removing DOM elements...');
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
              logger.info(`✅ KP: Removed element: ${selector}`);
            });
          });
        } catch (error) {
          logger.error('❌ KP: Error removing DOM elements:', error);
        }
      }

      // Step 7: Update database if needed
      if (!options.skipDatabaseUpdate && sessionToken && options.finalStatus) {
        logger.info('📊 KP: Step 7 - Updating database...');
        try {
          await simulationTracker.updateSimulationStatus(
            sessionToken,
            options.finalStatus,
            options.elapsedSeconds || 0
          );
          logger.info(`✅ KP: Database updated with status: ${options.finalStatus}`);
        } catch (error) {
          logger.error('❌ KP: Error updating database:', error);
        }
      }

      // Step 8: Clear storage (AsyncStorage + SecureStore)
      logger.info('💾 KP: Step 8 - Clearing simulation storage...');
      await clearSimulationStorage();

      logger.info('✅ KP: Centralized cleanup completed successfully');
    } catch (error) {
      logger.error('❌ KP: Error during centralized cleanup:', error);
    } finally {
      // CRITICAL: Always clear session token to prevent reuse
      sessionTokenRef.current = null;
      setSessionToken(null);
      logger.info('🔒 KP: Session token cleared');

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

  // Initialize readiness checklist

  // Show timer warning with color and message
  const showTimerWarning = (message: string, level: 'yellow' | 'orange' | 'red', isPulsing: boolean) => {
    logger.info(`⚠️ Timer warning: ${message} (${level})`);

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

  // Handle info button press
  const handleInfoPress = () => {
    Alert.alert(
      'Über die Simulation',
      'Diese KP-Simulation dauert 20 Minuten und testet Ihre medizinischen Kenntnisse durch realistische Patientenfälle. Klicken Sie auf "Start a call" im Widget unten, um zu beginnen.',
      [{ text: 'OK' }]
    );
  };

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
        {/* Lock Overlay - Shows when simulation limit is reached */}
        {isSimulationLocked && (
          <View style={styles.lockOverlay}>
            <View style={styles.lockOverlayContent}>
              <View style={styles.lockIconContainer}>
                <Text style={styles.lockIcon}>🔒</Text>
              </View>
              <Text style={styles.lockTitle}>Simulationslimit erreicht</Text>
              <Text style={styles.lockMessage}>
                {subscriptionStatus?.message || 'Sie haben Ihr Simulationslimit für diesen Zeitraum erreicht.'}
              </Text>
              <Text style={styles.lockSubMessage}>Upgraden Sie Ihren Plan, um mehr Simulationen zu erhalten.</Text>
              <TouchableOpacity style={styles.lockUpgradeButton} onPress={() => router.push('subscription' as any)}>
                <Text style={styles.lockUpgradeButtonText}>Upgrade durchführen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.lockBackButton} onPress={() => router.push('/(tabs)/simulation')}>
                <Text style={styles.lockBackButtonText}>Zurück zur Übersicht</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Header with back button and title */}
        <LinearGradient colors={['#4338ca', '#3730a3']} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)/simulation')}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Brain size={24} color="white" />
            <Text style={styles.headerTitle}>KP-Simulation</Text>
          </View>

          {/* Info button in header instead of floating */}
          <TouchableOpacity style={styles.headerInfoButton} onPress={handleInfoPress} activeOpacity={0.7}>
            <Info size={20} color="white" />
          </TouchableOpacity>
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
                timerWarningLevel === 'normal' && styles.timerNormal,
                timerWarningLevel === 'yellow' && styles.timerWarningYellow,
                timerWarningLevel === 'orange' && styles.timerWarningOrange,
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
            {/* Flashcard Carousel - Educational Content */}
            <View style={styles.instructionsContainer}>
              <FlashcardCarousel />
            </View>

            {/* Debug Panel - Visible Log */}
            {Platform.OS === 'web' && widgetDebugLog.length > 0 && (
              <View style={styles.debugPanel}>
                <Text style={styles.debugPanelTitle}>🔍 Widget Initialization Debug Log</Text>
                <ScrollView style={styles.debugLogContainer} nestedScrollEnabled>
                  {widgetDebugLog.map((log, index) => (
                    <Text key={index} style={styles.debugLogText}>
                      {log}
                    </Text>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Widget Area */}
            <View style={styles.widgetArea} nativeID="voiceflow-widget-container">
              {Platform.OS === 'web' ? (
                <>
                  {/* Voiceflow widget loads here automatically via script injection */}
                  {isInitializing && (
                    <Text style={styles.widgetStatusInitializing}>
                      🔄 Initialisiere Voiceflow Widget... (Versuch {initializationAttemptsRef.current}/
                      {maxRetryAttempts})
                    </Text>
                  )}
                  {initializationError && (
                    <Text style={styles.widgetStatusError}>
                      ❌ Fehler beim Laden: {initializationError}
                      {'\n'}Bitte Seite neu laden (F5)
                    </Text>
                  )}
                  {!isInitializing && !initializationError && (
                    <>
                      <Text style={styles.widgetPlaceholder}>💬 Voiceflow Widget sollte erscheinen</Text>
                      <Text style={styles.widgetHint}>
                        Falls das Widget nicht erscheint, öffnen Sie die Browser-Konsole (F12) für Details oder laden
                        Sie die Seite neu.
                      </Text>
                    </>
                  )}
                </>
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

              <View style={styles.timeInfo}>
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>Verstrichene Zeit:</Text>
                  <Text style={styles.timeValue}>{formatTime(20 * 60 - timeRemaining)}</Text>
                </View>
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>Verbleibende Zeit:</Text>
                  <Text style={styles.timeValue}>{formatTime(timeRemaining)}</Text>
                </View>
              </View>

              <View style={styles.warningBox}>
                <Text style={styles.warningIconText}>ℹ️</Text>
                <Text style={styles.warningBoxText}>
                  Ihre Simulation wird beendet und ausgewertet. Sie können nicht zur Simulation zurückkehren.
                </Text>
              </View>

              <View style={styles.reasonSection}>
                <Text style={styles.reasonLabel}>Grund (optional):</Text>
                <View style={styles.pickerContainer}>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      Alert.alert('Grund wählen', '', [
                        {
                          text: 'Alle Aufgaben abgeschlossen',
                          onPress: () => setEarlyCompletionReason('finished_all_tasks'),
                        },
                        {
                          text: 'Ausreichendes Gespräch geführt',
                          onPress: () => setEarlyCompletionReason('sufficient_conversation'),
                        },
                        { text: 'Technisches Problem', onPress: () => setEarlyCompletionReason('technical_issue') },
                        { text: 'Persönlicher Grund', onPress: () => setEarlyCompletionReason('personal_reason') },
                        { text: 'Sonstiges', onPress: () => setEarlyCompletionReason('other') },
                        { text: 'Abbrechen', style: 'cancel' },
                      ]);
                    }}
                  >
                    <Text style={styles.pickerButtonText}>
                      {earlyCompletionReason
                        ? earlyCompletionReason === 'finished_all_tasks'
                          ? 'Alle Aufgaben abgeschlossen'
                          : earlyCompletionReason === 'sufficient_conversation'
                            ? 'Ausreichendes Gespräch geführt'
                            : earlyCompletionReason === 'technical_issue'
                              ? 'Technisches Problem'
                              : earlyCompletionReason === 'personal_reason'
                                ? 'Persönlicher Grund'
                                : earlyCompletionReason === 'other'
                                  ? 'Sonstiges'
                                  : 'Bitte wählen...'
                        : 'Bitte wählen...'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.buttonGroupEarly}>
                <TouchableOpacity style={styles.confirmButton} onPress={confirmEarlyCompletion}>
                  <Text style={styles.buttonIconEarly}>✓</Text>
                  <Text style={styles.confirmButtonText}>Ja, beenden</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={cancelEarlyCompletion}>
                  <Text style={styles.buttonIconEarly}>↩</Text>
                  <Text style={styles.cancelButtonText}>Weiter üben</Text>
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
    backgroundColor: '#EDE9FE',
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
    backgroundColor: '#4338CA',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
    shadowColor: '#4338CA',
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
  headerInfoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
  debugPanel: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
    maxHeight: 300,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  debugPanelTitle: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  debugLogContainer: {
    maxHeight: 250,
  },
  debugLogText: {
    color: '#d1d5db',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
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
  widgetStatusInitializing: {
    fontSize: 14,
    color: '#3b82f6',
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 20,
  },
  widgetStatusError: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 20,
    lineHeight: 20,
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
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: 'rgba(76, 175, 80, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  finishButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    opacity: 0.5,
  },
  finishIcon: {
    fontSize: 20,
    color: 'white',
    fontWeight: '700',
  },
  finishButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  finishButtonHint: {
    fontSize: 12,
    color: '#999999',
    fontStyle: 'italic',
    textAlign: 'center',
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
    fontSize: 64,
    textAlign: 'center',
    marginBottom: 20,
  },
  earlyCompletionTitle: {
    color: '#B15740',
    fontSize: 24,
    fontWeight: '700',
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFF4E6',
    borderWidth: 2,
    borderColor: '#FFD93D',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  warningIconText: {
    fontSize: 20,
  },
  warningBoxText: {
    color: '#666666',
    fontSize: 14,
    flex: 1,
    lineHeight: 21,
  },
  reasonSection: {
    marginBottom: 24,
  },
  reasonLabel: {
    color: '#333333',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  pickerContainer: {
    width: '100%',
  },
  pickerButton: {
    width: '100%',
    padding: 12,
    borderWidth: 2,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  pickerButtonText: {
    fontSize: 15,
    color: '#333333',
  },
  buttonGroupEarly: {
    gap: 12,
  },
  confirmButton: {
    backgroundColor: '#B15740',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: 'rgba(177, 87, 64, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonIconEarly: {
    fontSize: 20,
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

export default withErrorBoundary(KPSimulationScreen, 'KP Simulation');
