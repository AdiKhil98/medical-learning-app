import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Brain, Clock, Info, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { createKPController, VoiceflowController, globalVoiceflowCleanup } from '@/utils/voiceflowIntegration';
import { stopGlobalVoiceflowCleanup } from '@/utils/globalVoiceflowCleanup';
import { simulationTracker } from '@/lib/simulationTrackingService';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeRequiredModal } from '@/components/UpgradeRequiredModal';
import InlineInstructions from '@/components/ui/InlineInstructions';
import { InlineContent, Section, Paragraph, BoldText, Step, InfoBox, TimeItem, TipsList, HighlightBox, TimeBadge } from '@/components/ui/InlineContent';

export default function KPSimulationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    canUseSimulation,
    subscriptionStatus,
    recordUsage,
    getSubscriptionInfo,
    checkAccess,
    applyOptimisticDeduction,
    resetOptimisticCount
  } = useSubscription(user?.id);
  const voiceflowController = useRef<VoiceflowController | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const timerActiveRef = useRef(false); // Ref to track timer state for closures
  const [timeRemaining, setTimeRemaining] = useState(20 * 60); // 20 minutes in seconds
  const [timerEndTime, setTimerEndTime] = useState(0); // Absolute timestamp when timer should end
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const timerEndTimeRef = useRef<number>(0); // Ref for end time to avoid closure issues on mobile
  const previousTimeRef = useRef<number>(20 * 60); // Track previous time value for comparisons
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const sessionTokenRef = useRef<string | null>(null); // Ref for sessionToken to avoid closure issues
  const [usageMarked, setUsageMarked] = useState(false); // Track if we've marked usage at 10min
  const usageMarkedRef = useRef(false); // Ref to track usage marked state for cleanup closure
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null); // For security heartbeat

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

  // Resume simulation state
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeTimeRemaining, setResumeTimeRemaining] = useState(0);

  // Early completion state
  const [showEarlyCompletionModal, setShowEarlyCompletionModal] = useState(false);
  const [earlyCompletionReason, setEarlyCompletionReason] = useState('');

  // Upgrade modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Lock state for when limit is reached
  const [isSimulationLocked, setIsSimulationLocked] = useState(false);

  // Cleanup coordination flag
  const isCleaningUpRef = useRef(false);

  // Reset optimistic count on page mount/refresh to show actual backend count
  useEffect(() => {
    console.log('[Mount] Resetting optimistic count to show actual backend data...');
    resetOptimisticCount();
  }, [resetOptimisticCount]);

  // Check for existing simulation on mount
  useEffect(() => {
    checkExistingSimulation();
  }, []);

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
        console.error(`❌ [${timestamp}] No user object found`);
        setInitializationError('User not authenticated');
        Alert.alert(
          'Authentifizierungsfehler',
          'Bitte melden Sie sich an, um fortzufahren.',
          [{ text: 'OK', onPress: () => router.push('/(tabs)/simulation') }]
        );
        return;
      }

      if (!user.id) {
        console.error(`❌ [${timestamp}] User object exists but user.id is missing:`, user);
        setInitializationError('User ID not found');
        Alert.alert(
          'Authentifizierungsfehler',
          'Benutzer-ID fehlt. Bitte melden Sie sich erneut an.',
          [{ text: 'OK', onPress: () => router.push('/(tabs)/simulation') }]
        );
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
          limit: accessCheck.simulationLimit
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
      // STEP 3: INITIALIZE WITH RETRY LOGIC
      // ============================================
      console.log(`🚀 [${timestamp}] Step 3: Starting Voiceflow initialization with retry logic...`);

      await initializeWithRetry(user.id, timestamp);
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

        // Stop global cleanup to allow widget
        console.log(`🛑 [${timestamp}] Stopping global Voiceflow cleanup`);
        stopGlobalVoiceflowCleanup();

        // ============================================
        // STEP 3A: GENERATE SESSION TOKEN
        // ============================================
        console.log(`🔑 [${timestamp}] Step 3a: Generating session token before Voiceflow initialization`);

        const result = await simulationTracker.startSimulation('kp');

        console.log(`📋 [${timestamp}] Session token generation result:`, {
          success: result.success,
          hasToken: !!result.sessionToken,
          error: result.error || 'none'
        });

        if (!result.success || !result.sessionToken) {
          throw new Error(`Session token generation failed: ${result.error || 'Unknown error'}`);
        }

        console.log(`✅ [${timestamp}] Session token generated successfully: ${result.sessionToken.substring(0, 8)}...`);

        setSessionToken(result.sessionToken);
        sessionTokenRef.current = result.sessionToken;

        // ============================================
        // STEP 3B: CREATE VOICEFLOW CONTROLLER
        // ============================================
        console.log(`🎮 [${timestamp}] Step 3b: Creating Voiceflow controller`);

        const controller = createKPController();

        if (!controller) {
          throw new Error('Failed to create Voiceflow controller - returned null/undefined');
        }

        voiceflowController.current = controller;
        console.log(`✅ [${timestamp}] Voiceflow controller created successfully`);

        // ============================================
        // STEP 3C: INITIALIZE VOICEFLOW WITH PERSISTENT IDS
        // ============================================
        console.log(`🔗 [${timestamp}] Step 3c: Initializing Voiceflow with persistent IDs from localStorage`);

        // Get persistent IDs that will be used
        const persistentIds = controller.getIds();
        console.log(`📤 [${timestamp}] Persistent IDs:`, {
          user_id: persistentIds.user_id,
          session_id: persistentIds.session_id
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
              hasSessionToken: !!event.session_token
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
          stack: error instanceof Error ? error.stack : undefined
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
                  initializationAttemptsRef.current = 0;
                  initializeWithRetry(userId, timestamp);
                }
              }
            ]
          );

          return; // Exit - all attempts exhausted
        }

        // Calculate exponential backoff delay (1s, 2s, 3s)
        const delay = attempt * 1000;
        console.log(`⏳ [${timestamp}] Waiting ${delay}ms before retry attempt ${attempt + 1}...`);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  // Set up monitoring for conversation start
  const setupConversationMonitoring = () => {
    console.log('🔍 KP: Setting up passive microphone detection...');

    // Method 1: Monitor for MediaStream creation and termination
    const originalGetUserMedia = navigator.mediaDevices?.getUserMedia;
    if (originalGetUserMedia) {
      navigator.mediaDevices.getUserMedia = async function(constraints) {
        console.log('🎤 KP: MediaStream requested with constraints:', constraints);
        
        if (constraints?.audio) {
          try {
            const stream = await originalGetUserMedia.call(this, constraints);

            // Start timer when voice call begins (use ref to avoid closure issues)
            if (!timerActiveRef.current) {
              console.log('🎯 KP: Audio stream granted - voice call starting!');
              console.log('⏰ KP: Starting 20-minute timer due to voice call');
              console.log('🔍 DEBUG: About to call startSimulationTimer()');
              startSimulationTimer();
            } else {
              console.log('⏰ KP: Timer already active, not starting again');
            }

            // Monitor stream tracks for when they end
            const audioTracks = stream.getAudioTracks();
            audioTracks.forEach((track, index) => {
              console.log(`🎤 KP: Monitoring audio track ${index + 1}`);
              
              track.addEventListener('ended', () => {
                console.log(`🔇 KP: Audio track ${index + 1} ended - but NOT stopping timer`);
                console.log(`ℹ️ KP: Timer continues - user must click "Ich bin fertig" or wait for 20min timer`);

                // DO NOT automatically stop the timer!
                // The user should control when the simulation ends via:
                // 1. "Ich bin fertig" button
                // 2. 20-minute timer expiration
                // 3. Manual navigation away from page
              });

              // Also monitor for track being stopped manually
              const originalStop = track.stop.bind(track);
              track.stop = () => {
                console.log(`🔇 KP: Audio track ${index + 1} stopped manually - but NOT stopping timer`);
                console.log(`ℹ️ KP: Timer continues - user must click "Ich bin fertig" or wait for 20min timer`);
                originalStop();

                // DO NOT automatically stop the timer!
                // Let the timer run until user explicitly ends the simulation
              };
            });

            return stream;
          } catch (error) {
            console.log('❌ KP: Failed to get audio stream:', error);
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
        console.log('🎯 KP: Click detected on Voiceflow widget - waiting for voice call...');
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
    console.log('🔍 DEBUG: startSimulationTimer called, timerActive:', timerActive, 'timerActiveRef:', timerActiveRef.current, 'sessionToken:', sessionTokenRef.current);

    // STEP 7: STRICT ACCESS CHECK - Verify access before starting timer
    console.log('[Timer] KP: Attempting to start timer...');
    const accessCheck = await checkAccess();

    console.log('[Timer] KP: Access check:', {
      canStart: accessCheck?.canUseSimulation,
      remaining: accessCheck?.remainingSimulations,
      total: accessCheck?.simulationLimit
    });

    // CRITICAL: Block if access is denied
    if (!accessCheck || !accessCheck.canUseSimulation) {
      console.error('[Timer] KP: ❌ ACCESS DENIED - Cannot start simulation');

      // Show upgrade modal
      setShowUpgradeModal(true);
      setIsSimulationLocked(true);

      Alert.alert(
        'Simulationslimit erreicht',
        accessCheck?.message || 'Sie haben Ihr Simulationslimit erreicht.',
        [
          { text: 'Upgrade', onPress: () => router.push('/(tabs)/profile') },
          { text: 'OK' }
        ]
      );

      return; // BLOCK timer start
    }

    // Access granted - proceed with timer
    console.log('[Timer] KP: ✅ Access GRANTED - Starting timer...');

    // CRITICAL: Check if session token already exists (generated during initialization)
    if (!sessionTokenRef.current) {
      console.error('❌ KP: No session token found - this should have been generated during initialization');
      return;
    }

    console.log('✅ KP: Using existing session token from initialization:', sessionTokenRef.current);

    // IMPORTANT: Check if timer is ACTUALLY active by checking the interval, not just the ref
    // This prevents false positives from stale state
    if (timerActiveRef.current && timerInterval.current !== null) {
      console.log('🔍 DEBUG: Timer already active (ref + interval exists), returning early');
      return;
    }

    // If ref is true but interval is null, we have stale state - reset it
    if (timerActiveRef.current && timerInterval.current === null) {
      console.warn('⚠️ KP: Detected stale timer state, resetting...');
      timerActiveRef.current = false;
      setTimerActive(false);
    }

    console.log('⏰ KP: Starting 20-minute simulation timer');
    console.log('🔍 KP DEBUG: Current timerActive state:', timerActive);
    console.log('🔍 KP DEBUG: Current timerActiveRef:', timerActiveRef.current);
    console.log('🔍 KP DEBUG: Current timerInterval:', timerInterval.current);

    // SET TIMER ACTIVE IMMEDIATELY - before any async operations that might fail
    console.log('🔍 DEBUG: Setting timer active IMMEDIATELY');

    // Set ref FIRST to prevent race conditions
    timerActiveRef.current = true;
    previousTimeRef.current = 20 * 60;

    // Then update React state
    setTimerActive(true);
    setTimeRemaining(20 * 60);

    console.log('🔍 KP DEBUG: Timer state updated - timerActiveRef:', timerActiveRef.current);

    // Calculate end time upfront
    const startTime = Date.now();
    const duration = 20 * 60 * 1000;
    const endTime = startTime + duration;
    setTimerEndTime(endTime);
    timerEndTimeRef.current = endTime;
    previousTimeRef.current = 20 * 60;

    try {
      // Apply optimistic counter deduction (show immediate feedback to user)
      applyOptimisticDeduction();

      // Save simulation state to localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          localStorage.setItem('sim_start_time_kp', startTime.toString());
          localStorage.setItem('sim_end_time_kp', endTime.toString());
          localStorage.setItem('sim_session_token_kp', sessionTokenRef.current);
          localStorage.setItem('sim_duration_ms_kp', duration.toString());
          if (user?.id) {
            localStorage.setItem('sim_user_id_kp', user.id);
          }
          console.log('💾 KP: Saved simulation state to localStorage');
        } catch (error) {
          console.error('❌ KP: Error saving to localStorage:', error);
        }
      }

      setUsageMarked(false);
      usageMarkedRef.current = false; // Initialize ref

      console.log('✅ KP: Timer started with existing session token');

    } catch (error) {
      console.error('❌ KP: Error during timer setup:', error);
    }

    console.log('🔍 DEBUG: Timer already active, now starting heartbeat and interval');

    // Start security heartbeat (every 60 seconds) - use closure to get latest sessionToken
    heartbeatInterval.current = setInterval(async () => {
      try {
        const token = sessionToken; // Will be set by database call if successful
        if (token) {
          await simulationTracker.sendHeartbeat(token);
          console.log('💓 DEBUG: Heartbeat sent');
        }
      } catch (error) {
        console.error('❌ DEBUG: Heartbeat failed:', error);
      }
    }, 60000); // Every 60 seconds

    console.log('🔍 DEBUG: Creating timer interval with absolute time calculation, endTime:', endTime);

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
        console.log('⏰ KP: Timer finished - 20 minutes elapsed');
        console.log('🔚 KP: Initiating graceful end sequence');
        initiateGracefulEnd();
        return;
      } else {
        setTimeRemaining(remainingSeconds);
        previousTimeRef.current = remainingSeconds;
      }

      // Log timer value every 10 seconds (only when value changes)
      if (remainingSeconds % 10 === 0 && remainingSeconds !== prev) {
        console.log('⏱️ DEBUG: Timer at', Math.floor(remainingSeconds / 60) + ':' + String(remainingSeconds % 60).padStart(2, '0'), `(${remainingSeconds} seconds)`);
      }

      // Mark as used at 5-minute mark (only trigger once)
      // NOTE: 20 minutes total = 1200 seconds, so 5 minutes elapsed = 900 seconds REMAINING
      const currentSessionToken = sessionTokenRef.current; // Get from ref to avoid closure issues
      if (prev > 900 && remainingSeconds <= 900 && !usageMarkedRef.current && currentSessionToken) {
        const clientElapsed = (20 * 60) - remainingSeconds;
        console.log('🔍 DEBUG: 5-minute mark reached (900s remaining = 5min elapsed), marking as used');
        console.log('🔍 DEBUG: Client calculated elapsed time:', clientElapsed, 'seconds');
        console.log('🔍 DEBUG: Using sessionToken from ref:', currentSessionToken);
        markSimulationAsUsed(clientElapsed);
      }

      // Timer warnings (only trigger once per threshold)
      if (prev > 300 && remainingSeconds <= 300) {
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
  };

  // Mark simulation as used at 5-minute mark
  const markSimulationAsUsed = async (clientElapsedSeconds?: number) => {
    const token = sessionTokenRef.current; // Use ref instead of state
    if (!token || usageMarkedRef.current) return;
    
    console.log('📊 KP: Marking simulation as used at 5-minute mark');
    console.log('🔍 DEBUG: Client elapsed seconds:', clientElapsedSeconds);
    console.log('🔍 DEBUG: Using session token:', token);

    try {
      const result = await simulationTracker.markSimulationUsed(token, clientElapsedSeconds);
      if (result.success) {
        setUsageMarked(true);
        usageMarkedRef.current = true; // Also update ref for cleanup closure
        console.log('✅ KP: Simulation usage recorded in database with server validation');
        console.log('✅ KP: Counter automatically incremented by database function');

        // NOTE: We do NOT call recordUsage() here because mark_simulation_counted
        // already increments the counter in the database. Calling recordUsage() would
        // result in double-counting (incrementing the counter twice).
      } else {
        console.error('❌ KP: Failed to mark simulation as used:', result.error);
        
        // If server rejected due to time manipulation, flag it
        if (result.error?.includes('insufficient_time')) {
          console.log('🛡️ SECURITY: Server blocked usage marking - possible time manipulation attempt');
        }
      }
    } catch (error) {
      console.error('❌ KP: Error marking simulation as used:', error);
    }
  };

  // End the Voiceflow conversation
  const endVoiceflowConversation = () => {
    try {
      // Method 1: Try to close the Voiceflow widget
      if (window.voiceflow?.chat) {
        console.log('🔚 KP: Attempting to close Voiceflow widget');
        window.voiceflow.chat.close && window.voiceflow.chat.close();
        window.voiceflow.chat.hide && window.voiceflow.chat.hide();
      }

      // Method 2: Try to stop any active media streams
      navigator.mediaDevices?.getUserMedia({ audio: true })
        .then((stream) => {
          console.log('🔚 KP: Stopping active audio streams');
          stream.getTracks().forEach(track => track.stop());
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
            console.log('🔚 KP: Found potential end call button, clicking it');
            button.click();
            break;
          }
        }
      }, 500);

    } catch (error) {
      console.error('❌ KP: Error ending Voiceflow conversation:', error);
    }
  };

  // Stop the simulation timer
  const stopSimulationTimer = async (reason: 'completed' | 'aborted' = 'completed') => {
    console.log('🛑 KP: Stopping simulation timer');

    const elapsedSeconds = (20 * 60) - timeRemaining;

    // If graceful shutdown is in progress, skip widget cleanup (already done)
    if (isGracefulShutdown && reason === 'completed') {
      // Just update database
      try {
        if (sessionToken) {
          await simulationTracker.updateSimulationStatus(sessionToken, 'completed', elapsedSeconds);
          console.log(`📊 KP: Graceful shutdown - Simulation marked as completed (${elapsedSeconds}s elapsed)`);
        }
      } catch (error) {
        console.error('❌ KP: Error updating session during graceful shutdown:', error);
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
      if (!usageMarked && elapsedSeconds < 300) {
        finalStatus = 'incomplete';
        console.log('📊 KP: Marking as incomplete - ended before 5-minute mark');

        // Reset optimistic counter since simulation ended before being charged
        console.log('🔄 KP: Resetting optimistic count - simulation ended before being charged');
        resetOptimisticCount();
      } else {
        finalStatus = 'aborted';
        console.log('📊 KP: Marking as aborted - ended after 5-minute mark (or usage already recorded)');
      }
    }

    // Use centralized cleanup
    await cleanupVoiceflowWidget({
      finalStatus: finalStatus,
      elapsedSeconds: elapsedSeconds,
      skipDatabaseUpdate: false
    });

    // Reset simulation state to allow restart
    resetSimulationState();

    // After a short delay, reinitialize the conversation monitoring for restart
    setTimeout(() => {
      if (voiceflowController.current) {
        console.log('🔄 KP: Reinitializing conversation monitoring after stop');
        setupConversationMonitoring();
      }
    }, 1000);
  };

  // Initiate graceful end sequence
  const initiateGracefulEnd = () => {
    console.log('🎬 KP: Starting graceful end sequence');

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
    console.log('🏁 KP: Executing simulation end');

    // Hide final warning modal
    setShowFinalWarningModal(false);

    // Calculate elapsed time
    const elapsedSeconds = (20 * 60) - timeRemaining;

    // Use centralized cleanup with database update
    await cleanupVoiceflowWidget({
      finalStatus: 'completed',
      elapsedSeconds: elapsedSeconds,
      skipDatabaseUpdate: false
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
    console.log('🎉 KP: Showing completion modal');
    setShowSimulationCompleted(true);
  };

  // Navigate to progress page
  const navigateToProgress = () => {
    setShowSimulationCompleted(false);
    router.push('/(tabs)/progress');
  };

  // Close completion modal
  const closeCompletionModal = () => {
    setShowSimulationCompleted(false);
    resetSimulationState();
  };

  // Early completion functions
  const initiateEarlyCompletion = () => {
    console.log('🏁 KP: User initiated early completion');
    setShowEarlyCompletionModal(true);
  };

  const confirmEarlyCompletion = () => {
    console.log('✅ KP: User confirmed early completion');
    setShowEarlyCompletionModal(false);

    // Calculate elapsed time
    const elapsedSeconds = (20 * 60) - timeRemaining;
    console.log(`📊 KP: Completed early after ${elapsedSeconds} seconds (${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, '0')})`);

    // Execute early completion sequence
    executeEarlyCompletion(elapsedSeconds);
  };

  const cancelEarlyCompletion = () => {
    console.log('↩️ KP: User cancelled early completion');
    setShowEarlyCompletionModal(false);
    setEarlyCompletionReason('');
  };

  const executeEarlyCompletion = async (elapsedSeconds: number) => {
    console.log('🏁 KP: Executing early completion');

    // Set graceful shutdown flag
    setIsGracefulShutdown(true);

    // Set timer state to inactive
    setTimerActive(false);
    timerActiveRef.current = false;

    // Use centralized cleanup with custom metadata
    await cleanupVoiceflowWidget({
      finalStatus: 'completed',
      elapsedSeconds: elapsedSeconds,
      skipDatabaseUpdate: false
    });

    // Handle early completion specific logic
    if (sessionToken) {
      try {
        // Update with metadata about early completion
        await simulationTracker.updateSimulationStatus(
          sessionToken,
          'completed',
          elapsedSeconds,
          {
            completion_type: 'early',
            completion_reason: earlyCompletionReason || 'user_finished_early'
          }
        );
        console.log(`📊 KP: Early completion recorded (${elapsedSeconds}s elapsed, reason: ${earlyCompletionReason || 'user_finished_early'})`);

        // Reset optimistic counter if simulation ended before being charged (< 5 minutes)
        if (!usageMarked && elapsedSeconds < 300) {
          console.log('🔄 KP: Early completion before 5-minute mark - resetting optimistic count');
          resetOptimisticCount();
        } else if (elapsedSeconds >= 300) {
          console.log('✅ KP: Simulation reached 5-minute threshold - counter already deducted, no reset needed');
        }
      } catch (error) {
        console.error('❌ KP: Error updating early completion status:', error);
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
      console.log('🧹 KP: Component unmount cleanup started');

      // Determine final status based on whether usage was recorded
      const finalStatus = usageMarkedRef.current ? 'completed' : 'aborted';
      const elapsedSeconds = (20 * 60) - timeRemaining;

      console.log(`🔍 KP: Cleanup - usageMarked=${usageMarkedRef.current}, marking session as ${finalStatus}`);

      // Use centralized cleanup (async but don't wait for it in cleanup)
      if (timerActiveRef.current && sessionTokenRef.current) {
        cleanupVoiceflowWidget({
          finalStatus: finalStatus,
          elapsedSeconds: elapsedSeconds,
          skipDatabaseUpdate: false
        }).then(() => {
          console.log('✅ KP: Cleanup completed successfully');
        }).catch(error => {
          console.error('❌ KP: Error during cleanup:', error);
        });
      }

      // Remove event listeners
      if ((window as any).kpClickListener) {
        document.removeEventListener('click', (window as any).kpClickListener, true);
        delete (window as any).kpClickListener;
      }

      // Restore original getUserMedia function
      if ((window as any).kpOriginalGetUserMedia && navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = (window as any).kpOriginalGetUserMedia;
        delete (window as any).kpOriginalGetUserMedia;
      }

      // Run global cleanup to ensure widget is completely removed
      if (Platform.OS === 'web') {
        console.log('🌍 KP: Running global Voiceflow cleanup with force=true');
        globalVoiceflowCleanup(true);
      }

      console.log('✅ KP: Component unmount cleanup initiated');
    };
  }, []);


  // Handle navigation away from page with immediate cleanup
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (timerActive) {
        e.preventDefault();
        e.returnValue = 'Simulation läuft. Möchten Sie wirklich die Seite verlassen?';
        return e.returnValue;
      }
    };

    // Enhanced visibility change handler for immediate widget cleanup
    const handleVisibilityChange = async () => {
      if (timerActive && (document.visibilityState === 'hidden' || document.hidden)) {
        console.log('🚫 KP: Attempted to leave page during simulation - BLOCKED');
        // For mobile apps, prevent backgrounding during simulation
        if (Platform.OS !== 'web') {
          Alert.alert(
            'Simulation läuft',
            'Sie können die App nicht verlassen, während die Simulation läuft.',
            [{ text: 'OK' }]
          );
        }
        return false;
      }

      // Re-validate access when user returns to tab
      if (document.visibilityState === 'visible' && !document.hidden) {
        console.log('[Tab Visibility] KP: Tab became visible - re-validating access...');
        const accessCheck = await checkAccess();

        if (accessCheck && !accessCheck.canUseSimulation) {
          console.warn('[Tab Visibility] KP: ⚠️ Access lost while away - locking simulation');
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
        console.log('🚫 KP: Navigation blocked - simulation in progress');
        e.preventDefault();
        // Push the current state back to prevent navigation
        window.history.pushState(null, '', window.location.href);
        Alert.alert(
          'Simulation läuft',
          'Sie können die Seite nicht verlassen, während die Simulation läuft.',
          [{ text: 'OK' }]
        );
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
    console.log('[Lock Monitor] KP: useEffect triggered', {
      hasSubscriptionStatus: !!subscriptionStatus,
      canUse: subscriptionStatus?.canUseSimulation,
      remaining: subscriptionStatus?.remainingSimulations,
      currentLockState: isSimulationLocked
    });

    if (subscriptionStatus) {
      const shouldLock = !subscriptionStatus.canUseSimulation;
      console.log('[Lock Monitor] KP: Subscription status changed:', {
        canUse: subscriptionStatus.canUseSimulation,
        remaining: subscriptionStatus.remainingSimulations,
        shouldLock,
        willUpdateLockState: shouldLock !== isSimulationLocked
      });

      if (shouldLock !== isSimulationLocked) {
        console.log(`[Lock Monitor] KP: 🔒 Setting lock state to: ${shouldLock}`);
        setIsSimulationLocked(shouldLock);
      }

      if (shouldLock && timerActive) {
        console.warn('[Lock Monitor] KP: ⚠️ User ran out of simulations during active session!');
      }
    } else {
      console.warn('[Lock Monitor] KP: No subscription status available yet');
    }
  }, [subscriptionStatus, timerActive, isSimulationLocked]);

  // Immediate cleanup function for navigation events
  const performImmediateCleanup = () => {
    try {
      console.log('⚡ KP: Performing immediate cleanup');
      
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
        '.vfrc-chat'
      ];
      
      widgetSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          element.remove();
          console.log(`🗑️ KP: Immediately removed element: ${selector}`);
        });
      });
      
      // Stop any active media streams
      navigator.mediaDevices?.getUserMedia({ audio: true })
        .then(stream => {
          stream.getTracks().forEach(track => {
            track.stop();
            console.log('🔇 KP: Stopped audio track during immediate cleanup');
          });
        })
        .catch(() => {});
      
      console.log('✅ KP: Immediate cleanup completed');
    } catch (error) {
      console.error('❌ KP: Error during immediate cleanup:', error);
    }
  };

  // Reset simulation state for restart
  const resetSimulationState = () => {
    console.log('🔄 KP: Resetting simulation state for restart');

    // CRITICAL: Clear intervals FIRST before resetting refs
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
      console.log('✅ KP: Cleared timer interval');
    }

    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
      console.log('✅ KP: Cleared heartbeat interval');
    }

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

    // Clear localStorage
    clearSimulationStorage();

    // Reset resume modal states
    setShowResumeModal(false);
    setResumeTimeRemaining(0);

    // Reset early completion state
    setShowEarlyCompletionModal(false);
    setEarlyCompletionReason('');

    console.log('✅ KP: Simulation state reset completed - ready for next run');
    console.log('🔍 KP: Post-reset state - timerActiveRef:', timerActiveRef.current, 'timerInterval:', timerInterval.current);

    // Re-setup conversation monitoring for next run
    setTimeout(() => {
      if (voiceflowController.current) {
        console.log('🔄 KP: Re-initializing conversation monitoring after reset');
        setupConversationMonitoring();
      }
    }, 500);
  };

  // Clear simulation localStorage
  const clearSimulationStorage = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('sim_start_time_kp');
        localStorage.removeItem('sim_end_time_kp');
        localStorage.removeItem('sim_session_token_kp');
        localStorage.removeItem('sim_duration_ms_kp');
        localStorage.removeItem('sim_user_id_kp');
        console.log('✅ KP: Cleared simulation localStorage');
      }
    } catch (error) {
      console.error('❌ KP: Error clearing localStorage:', error);
    }
  };

  // ============================================
  // CENTRALIZED VOICEFLOW WIDGET CLEANUP
  // ============================================
  const cleanupVoiceflowWidget = async (options: {
    skipDatabaseUpdate?: boolean;
    finalStatus?: 'completed' | 'aborted' | 'incomplete';
    elapsedSeconds?: number;
  } = {}) => {
    // Prevent concurrent cleanup operations
    if (isCleaningUpRef.current) {
      console.log('⚠️ KP: Cleanup already in progress, skipping...');
      return;
    }

    console.log('🧹 KP: Starting centralized widget cleanup...');
    isCleaningUpRef.current = true;

    try {
      // Step 1: Stop all intervals immediately
      console.log('🛑 KP: Step 1 - Clearing all intervals...');
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
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Close Voiceflow widget
      console.log('🔚 KP: Step 3 - Closing Voiceflow widget...');
      if (window.voiceflow?.chat) {
        try {
          window.voiceflow.chat.close && window.voiceflow.chat.close();
          window.voiceflow.chat.hide && window.voiceflow.chat.hide();
          console.log('✅ KP: Voiceflow widget closed');
        } catch (error) {
          console.error('❌ KP: Error closing Voiceflow widget:', error);
        }
      }

      // Step 4: Wait for widget to close
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 5: Destroy controller
      console.log('🔧 KP: Step 5 - Destroying controller...');
      if (voiceflowController.current) {
        try {
          voiceflowController.current.destroy();
          voiceflowController.current = null;
          console.log('✅ KP: Controller destroyed');
        } catch (error) {
          console.error('❌ KP: Error destroying controller:', error);
        }
      }

      // Step 6: Force remove DOM elements
      console.log('🗑️ KP: Step 6 - Force removing DOM elements...');
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        try {
          const widgetSelectors = [
            '[id*="voiceflow"]',
            '[class*="voiceflow"]',
            '[data-voiceflow]',
            'iframe[src*="voiceflow"]',
          ];

          widgetSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              el.remove();
              console.log(`✅ KP: Removed element: ${selector}`);
            });
          });
        } catch (error) {
          console.error('❌ KP: Error removing DOM elements:', error);
        }
      }

      // Step 7: Update database if needed
      if (!options.skipDatabaseUpdate && sessionToken && options.finalStatus) {
        console.log('📊 KP: Step 7 - Updating database...');
        try {
          await simulationTracker.updateSimulationStatus(
            sessionToken,
            options.finalStatus,
            options.elapsedSeconds || 0
          );
          console.log(`✅ KP: Database updated with status: ${options.finalStatus}`);
        } catch (error) {
          console.error('❌ KP: Error updating database:', error);
        }
      }

      // Step 8: Clear localStorage
      console.log('💾 KP: Step 8 - Clearing localStorage...');
      clearSimulationStorage();

      console.log('✅ KP: Centralized cleanup completed successfully');
    } catch (error) {
      console.error('❌ KP: Error during centralized cleanup:', error);
    } finally {
      // Always reset the cleanup flag
      isCleaningUpRef.current = false;
    }
  };

  // Show expired simulation message
  const showExpiredSimulationMessage = () => {
    Alert.alert(
      'Simulation abgelaufen',
      'Ihre vorherige Simulation ist abgelaufen.',
      [{ text: 'OK' }]
    );
  };

  // Format time display for resume modal
  const formatTimeDisplay = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize readiness checklist
  // Check for existing simulation on mount
  const checkExistingSimulation = () => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;

      const startTime = localStorage.getItem('sim_start_time_kp');
      const endTime = localStorage.getItem('sim_end_time_kp');
      const savedSessionToken = localStorage.getItem('sim_session_token_kp');
      const durationMs = localStorage.getItem('sim_duration_ms_kp');

      // If no saved simulation, just return
      if (!startTime || !savedSessionToken || !durationMs) {
        return;
      }

      console.log('🔍 KP: Found existing simulation in localStorage');

      // Calculate end time
      let calculatedEndTime: number;
      if (endTime) {
        calculatedEndTime = parseInt(endTime);
      } else {
        const startTimeInt = parseInt(startTime);
        const durationInt = parseInt(durationMs);
        calculatedEndTime = startTimeInt + durationInt;
      }

      // Calculate remaining time
      const remaining = calculatedEndTime - Date.now();

      // Check if time has already expired
      if (remaining <= 0) {
        console.log('⏰ KP: Saved simulation has expired');
        clearSimulationStorage();
        showExpiredSimulationMessage();
        setShowReadinessModal(true);
        return;
      }

      // Time still remaining, offer to resume
      const remainingSeconds = Math.floor(remaining / 1000);
      console.log(`✅ KP: Can resume simulation with ${remainingSeconds}s remaining`);
      setResumeTimeRemaining(remainingSeconds);

      // Show resume modal
      setShowResumeModal(true);

    } catch (error) {
      console.error('❌ KP: Error checking existing simulation:', error);
      clearSimulationStorage();
    }
  };

  // Resume simulation from localStorage
  const resumeSimulation = () => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;

      const startTime = localStorage.getItem('sim_start_time_kp');
      const savedEndTime = localStorage.getItem('sim_end_time_kp');
      const savedSessionToken = localStorage.getItem('sim_session_token_kp');
      const durationMs = localStorage.getItem('sim_duration_ms_kp');

      if (!startTime || !savedSessionToken || !durationMs) {
        setShowResumeModal(false);
        clearSimulationStorage();
        return;
      }

      console.log('▶️ KP: Resuming simulation');

      // Use saved end time if available, otherwise calculate
      let endTime: number;
      if (savedEndTime) {
        endTime = parseInt(savedEndTime);
      } else {
        const startTimeInt = parseInt(startTime);
        const durationInt = parseInt(durationMs);
        endTime = startTimeInt + durationInt;
      }

      // Calculate remaining time
      const remaining = endTime - Date.now();

      if (remaining <= 0) {
        setShowResumeModal(false);
        clearSimulationStorage();
        showExpiredSimulationMessage();
        return;
      }

      // Set timer state
      setTimerActive(true);
      timerActiveRef.current = true; // Update ref for closures
      const remainingSeconds = Math.floor(remaining / 1000);
      setTimeRemaining(remainingSeconds);
      setTimerEndTime(endTime); // Set absolute end time
      setSessionToken(savedSessionToken);
      sessionTokenRef.current = savedSessionToken; // Store in ref for timer closure
      previousTimeRef.current = remainingSeconds; // Initialize ref for resume
      timerEndTimeRef.current = endTime; // Store in ref for mobile reliability

      // Start security heartbeat for resumed session
      if (savedSessionToken) {
        heartbeatInterval.current = setInterval(async () => {
          try {
            await simulationTracker.sendHeartbeat(savedSessionToken);
            console.log('💓 DEBUG: Heartbeat sent');
          } catch (error) {
            console.error('❌ DEBUG: Heartbeat failed:', error);
          }
        }, 60000); // Every 60 seconds
      }

      // Start timer interval for resumed session with absolute time calculation
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
          console.log('⏰ KP: Timer finished - 20 minutes elapsed');
          console.log('🔚 KP: Initiating graceful end sequence');
          initiateGracefulEnd();
          return;
        } else {
          setTimeRemaining(remainingSeconds);
          previousTimeRef.current = remainingSeconds;
        }

        // Log timer value every 10 seconds (only when value changes)
        if (remainingSeconds % 10 === 0 && remainingSeconds !== prev) {
          console.log('⏱️ DEBUG: Timer at', Math.floor(remainingSeconds / 60) + ':' + String(remainingSeconds % 60).padStart(2, '0'), `(${remainingSeconds} seconds)`);
        }

        // Mark as used at 5-minute mark (only trigger once)
        // NOTE: 20 minutes total = 1200 seconds, so 5 minutes elapsed = 900 seconds REMAINING
        const currentSessionToken = sessionTokenRef.current; // Get from ref to avoid closure issues
        if (prev > 900 && remainingSeconds <= 900 && !usageMarkedRef.current && currentSessionToken) {
          const clientElapsed = (20 * 60) - remainingSeconds;
          console.log('🔍 DEBUG: 5-minute mark reached (900s remaining = 5min elapsed), marking as used');
          console.log('🔍 DEBUG: Client calculated elapsed time:', clientElapsed, 'seconds');
          console.log('🔍 DEBUG: Using sessionToken from ref:', currentSessionToken);
          markSimulationAsUsed(clientElapsed);
        }

        // Timer warnings (only trigger once per threshold)
        if (prev > 300 && remainingSeconds <= 300) {
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

      // Hide resume modal
      setShowResumeModal(false);

      console.log(`✅ KP: Resumed with ${Math.floor(remaining / 1000)}s remaining`);

    } catch (error) {
      console.error('❌ KP: Error resuming simulation:', error);
      setShowResumeModal(false);
      clearSimulationStorage();
    }
  };

  // Decline to resume simulation
  const declineResume = async () => {
    console.log('❌ KP: User declined to resume simulation');
    setShowResumeModal(false);

    try {
      // Mark session as abandoned in database
      const savedSessionToken = localStorage.getItem('sim_session_token_kp');
      if (savedSessionToken) {
        await simulationTracker.updateSimulationStatus(savedSessionToken, 'aborted', 0);
        console.log('📊 KP: Marked session as abandoned');
      }
    } catch (error) {
      console.error('❌ KP: Error marking session as abandoned:', error);
    }

    clearSimulationStorage();
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

  // Handle info button press
  const handleInfoPress = () => {
    Alert.alert(
      'Über die Simulation',
      'Diese KP-Simulation dauert 20 Minuten und testet Ihre medizinischen Kenntnisse durch realistische Patientenfälle. Klicken Sie auf "Start a call" im Widget unten, um zu beginnen.',
      [{ text: 'OK' }]
    );
  };

  // KP Simulation inline instructions content
  const kpInstructions = [
    {
      id: 'overview',
      title: 'Überblick',
      content: (
        <InlineContent>
          <Section title="🏥 Was ist die KP-Simulation?">
            <Paragraph>
              Willkommen zu Ihrem <BoldText>Krankenpräsentations-Training</BoldText>! Diese realistische Simulation bereitet Sie optimal auf professionelle Patientenvorstellungen vor.
            </Paragraph>

            <HighlightBox type="info">
              🎯 <BoldText>Hauptzweck:</BoldText> Systematische Krankenpräsentation unter realistischen Bedingungen trainieren
            </HighlightBox>

            <Paragraph>
              <BoldText>Ihre Vorteile auf einen Blick:</BoldText>
            </Paragraph>

            <View style={{ marginLeft: 16 }}>
              <Paragraph>• Strukturierte Patientenvorstellung</Paragraph>
              <Paragraph>• Professionelle Kommunikation mit Kollegen</Paragraph>
              <Paragraph>• Sofortiges, detailliertes Feedback</Paragraph>
              <Paragraph>• Praxisnahe Fallbearbeitung</Paragraph>
            </View>

            <InfoBox>
              📋 Diese Simulation testet Ihre Fähigkeit zur systematischen Krankenpräsentation in der klinischen Praxis
            </InfoBox>
          </Section>
        </InlineContent>
      )
    },
    {
      id: 'process',
      title: 'Ablauf',
      content: (
        <InlineContent>
          <Section title="📋 Simulation in 3 Schritten">
            <Step
              number="1"
              title="🔐 Benutzer-ID Verifizierung"
              description="Authentifizierung für personalisierte Auswertung"
              details={[
                "Eingabe Ihrer zugewiesenen ID",
                "Sicherung der korrekten Ergebniszuordnung"
              ]}
            />

            <Step
              number="2"
              title="📂 Fallauswahl"
              description="Auswahl eines geeigneten Patientenfalls"
              details={[
                "Verschiedene <BoldText>Fachbereiche</BoldText> verfügbar",
                "Schwierigkeitsgrad entsprechend Ihrem Level"
              ]}
            />

            <Step
              number="3"
              title="👩‍⚕️ Krankenpräsentation"
              description={
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text>Strukturierte Patientenvorstellung</Text>
                  <TimeBadge>(20 Min)</TimeBadge>
                </View>
              }
              details={[
                "<BoldText>Anamnese:</BoldText> Systematische Erhebung der Patientengeschichte",
                "<BoldText>Befunde:</BoldText> Präsentation relevanter Untersuchungsergebnisse",
                "<BoldText>Diagnose:</BoldText> Formulierung der Arbeits- oder Differentialdiagnose",
                "<BoldText>Therapie:</BoldText> Behandlungsplan und weiteres Vorgehen",
                "<BoldText>Ende:</BoldText> <BoldText>Sagen Sie 'Ich bin fertig'</BoldText> zum Abschluss"
              ]}
            />
          </Section>
        </InlineContent>
      )
    },
    {
      id: 'evaluation',
      title: 'Bewertung',
      content: (
        <InlineContent>
          <Section title="📊 Ihre Auswertung">
            <Paragraph>
              Nach der Simulation erhalten Sie eine detaillierte Analyse im <BoldText>Fortschrittsbereich</BoldText> Ihres Kontos.
            </Paragraph>

            <HighlightBox type="success">
              ⚡ <BoldText>Schnelle Auswertung:</BoldText> Ergebnisse innerhalb weniger Minuten verfügbar
            </HighlightBox>

            <Step
              number="✅"
              title="Struktur-Analyse"
              description="Bewertung Ihrer Präsentationsstruktur:"
              details={[
                "Vollständigkeit der Anamnese bewertet",
                "Logischer Aufbau der Präsentation",
                "Verwendung medizinischer Terminologie"
              ]}
            />

            <Step
              number="📈"
              title="Verbesserungsfelder"
              description="Gezielte Optimierungsempfehlungen:"
              details={[
                "Strukturelle Verbesserungsvorschläge",
                "Fachsprachliche Korrekturen",
                "Präsentationstechnik verfeinern"
              ]}
            />

            <Step
              number="💡"
              title="Entwicklungsplan"
              description="Ihr persönlicher Erfolgsweg:"
              details={[
                "Spezifische Übungsempfehlungen",
                "Weiterführende Ressourcen",
                "Tipps für die klinische Praxis"
              ]}
            />
          </Section>

          <Section title="⏱️ Zeitplan im Überblick">
            <View style={{ backgroundColor: 'rgba(75, 85, 176, 0.05)', padding: 16, borderRadius: 12, marginVertical: 8 }}>
              <TimeItem label="📅 Gesamtdauer" time="20 Minuten" />
              <TimeItem label="👩‍⚕️ Präsentation" time="Bis zu 20 Minuten" />
              <TimeItem label="📊 Auswertung verfügbar" time="2-5 Minuten nach Abschluss" />
            </View>
          </Section>
        </InlineContent>
      )
    },
    {
      id: 'tips',
      title: 'Tipps',
      content: (
        <InlineContent>
          <Section title="💡 Erfolgstipps">
            <HighlightBox type="warning">
              🎯 <BoldText>Profi-Strategien für optimale Krankenpräsentation</BoldText>
            </HighlightBox>

            <View style={{ marginVertical: 8 }}>
              <View style={{ backgroundColor: 'rgba(34, 197, 94, 0.05)', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#22c55e' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#16a34a', marginBottom: 8 }}>1. 📋 Systematisch strukturieren</Text>
                <Text style={{ fontSize: 15, color: '#333333', lineHeight: 24 }}>
                  <BoldText>SOAP-Schema verwenden</BoldText> – Subjektiv, Objektiv, Assessment, Plan für klare Struktur.
                </Text>
              </View>

              <View style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#3b82f6' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#2563eb', marginBottom: 8 }}>2. ⚕️ Präzise Fachsprache</Text>
                <Text style={{ fontSize: 15, color: '#333333', lineHeight: 24 }}>
                  <BoldText>Medizinische Terminologie korrekt</BoldText> – verwenden Sie präzise Fachbegriffe souverän.
                </Text>
              </View>

              <View style={{ backgroundColor: 'rgba(251, 146, 60, 0.05)', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#fb923c' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#ea580c', marginBottom: 8 }}>3. 🎯 Relevanz fokussieren</Text>
                <Text style={{ fontSize: 15, color: '#333333', lineHeight: 24 }}>
                  <BoldText>Auf Wesentliches konzentrieren</BoldText> – wichtige Informationen priorisieren und hervorheben.
                </Text>
              </View>

              <View style={{ backgroundColor: 'rgba(168, 85, 247, 0.05)', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#a855f7' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#9333ea', marginBottom: 8 }}>4. 🗣️ Klar kommunizieren</Text>
                <Text style={{ fontSize: 15, color: '#333333', lineHeight: 24 }}>
                  <BoldText>Deutlich und verständlich</BoldText> – auch komplexe Sachverhalte strukturiert vermitteln.
                </Text>
              </View>
            </View>
          </Section>

          <Section title="🚀 Jetzt starten?">
            <Paragraph>
              Jede KP-Simulation verbessert Ihre Präsentationskompetenz. <BoldText>Nutzen Sie die Chance</BoldText> – systematisches Training macht den Unterschied!
            </Paragraph>

            <HighlightBox type="success">
              🌟 <BoldText>Bereit für die Präsentation?</BoldText> Halten Sie Ihre Benutzer-ID bereit und beginnen Sie Ihr professionelles KP-Training!
            </HighlightBox>

            <View style={{ marginTop: 16, padding: 12, backgroundColor: 'rgba(75, 85, 176, 0.05)', borderRadius: 8 }}>
              <Text style={{ fontSize: 13, fontStyle: 'italic', color: '#4338ca', lineHeight: 20 }}>
                💼 Diese Simulation bietet realistische Krankenpräsentation mit sofortigem, professionellem Feedback für optimale Vorbereitung auf die klinische Praxis.
              </Text>
            </View>
          </Section>
        </InlineContent>
      )
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
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
            <Text style={styles.lockSubMessage}>
              Upgraden Sie Ihren Plan, um mehr Simulationen zu erhalten.
            </Text>
            <TouchableOpacity
              style={styles.lockUpgradeButton}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={styles.lockUpgradeButtonText}>Upgrade durchführen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.lockBackButton}
              onPress={() => router.push('/(tabs)/simulation')}
            >
              <Text style={styles.lockBackButtonText}>Zurück zur Übersicht</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Header with back button and title */}
      <LinearGradient
        colors={['#4338ca', '#3730a3']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/(tabs)/simulation')}
        >
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Brain size={24} color="white" />
          <Text style={styles.headerTitle}>KP-Simulation</Text>
        </View>

        {/* Info button in header instead of floating */}
        <TouchableOpacity
          style={styles.headerInfoButton}
          onPress={handleInfoPress}
          activeOpacity={0.7}
        >
          <Info size={20} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Subscription Counter Badge - always visible */}
      {getSubscriptionInfo() && (
        <View style={styles.counterBadgeContainer}>
          <View style={styles.counterBadge}>
            <Text style={styles.counterBadgeText}>
              {getSubscriptionInfo()?.usageText}
            </Text>
          </View>
        </View>
      )}

      {/* Timer display - only show when active */}
      {timerActive && (
        <View style={styles.timerSection}>
          <View style={[
            styles.timerContainer,
            timerWarningLevel === 'normal' && styles.timerNormal,
            timerWarningLevel === 'yellow' && styles.timerWarningYellow,
            timerWarningLevel === 'orange' && styles.timerWarningOrange,
            timerWarningLevel === 'red' && styles.timerWarningRed
          ]}>
            <Clock size={16} color={timerWarningLevel === 'red' ? 'white' : '#B15740'} />
            <Text style={[
              styles.timerText,
              timerWarningLevel === 'red' && styles.timerTextRed
            ]}>
              Simulation läuft: {formatTime(timeRemaining)}
            </Text>
          </View>

          {/* "Ich bin fertig" Button */}
          <TouchableOpacity
            style={[styles.finishButton, timeRemaining > 1140 && styles.finishButtonDisabled]}
            onPress={initiateEarlyCompletion}
            disabled={timeRemaining > 1140}
            activeOpacity={0.8}
          >
            <Text style={styles.finishIcon}>✓</Text>
            <Text style={styles.finishButtonText}>Ich bin fertig</Text>
          </TouchableOpacity>

          {timeRemaining > 1140 && (
            <Text style={styles.finishButtonHint}>Verfügbar nach 1 Minute</Text>
          )}
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
          {/* Inline Instructions Panel */}
          <View style={styles.instructionsContainer}>
            <InlineInstructions tabs={kpInstructions} />
          </View>

          {/* Widget Area */}
          <View style={styles.widgetArea}>
            {/* Widget loads here automatically */}
          </View>
        </View>
      </ScrollView>

      {/* Resume Simulation Modal */}
      {showResumeModal && (
        <View style={styles.resumeOverlay}>
          <View style={styles.resumeModal}>
            <Text style={styles.resumeIcon}>⏰</Text>
            <Text style={styles.resumeTitle}>Simulation fortsetzen?</Text>
            <Text style={styles.resumeMessage}>
              Sie haben eine laufende Simulation.
            </Text>
            <View style={styles.timeRemainingBox}>
              <Text style={styles.timeLabel}>Verbleibende Zeit:</Text>
              <Text style={styles.timeValue}>{formatTimeDisplay(resumeTimeRemaining)}</Text>
            </View>
            <Text style={styles.resumeWarning}>
              Wenn Sie nicht fortsetzen, wird die Simulation abgebrochen.
            </Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity style={styles.primaryButton} onPress={resumeSimulation}>
                <Text style={styles.primaryButtonText}>Fortsetzen</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={declineResume}>
                <Text style={styles.secondaryButtonText}>Abbrechen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

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
                <Text style={styles.timeValue}>{formatTime((20 * 60) - timeRemaining)}</Text>
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
                    Alert.alert(
                      'Grund wählen',
                      '',
                      [
                        { text: 'Alle Aufgaben abgeschlossen', onPress: () => setEarlyCompletionReason('finished_all_tasks') },
                        { text: 'Ausreichendes Gespräch geführt', onPress: () => setEarlyCompletionReason('sufficient_conversation') },
                        { text: 'Technisches Problem', onPress: () => setEarlyCompletionReason('technical_issue') },
                        { text: 'Persönlicher Grund', onPress: () => setEarlyCompletionReason('personal_reason') },
                        { text: 'Sonstiges', onPress: () => setEarlyCompletionReason('other') },
                        { text: 'Abbrechen', style: 'cancel' }
                      ]
                    );
                  }}
                >
                  <Text style={styles.pickerButtonText}>
                    {earlyCompletionReason ?
                      earlyCompletionReason === 'finished_all_tasks' ? 'Alle Aufgaben abgeschlossen' :
                      earlyCompletionReason === 'sufficient_conversation' ? 'Ausreichendes Gespräch geführt' :
                      earlyCompletionReason === 'technical_issue' ? 'Technisches Problem' :
                      earlyCompletionReason === 'personal_reason' ? 'Persönlicher Grund' :
                      earlyCompletionReason === 'other' ? 'Sonstiges' : 'Bitte wählen...'
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
            <Text style={styles.nextSteps}>
              Die Auswertung finden Sie in Kürze im Fortschrittsbereich.
            </Text>
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
  widgetArea: {
    flex: 1, // Takes up 1/3 of available space
    minHeight: 200,
    // This area is where the Voiceflow widget will appear
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
  timeLabel: {
    color: '#333333',
    fontSize: 15,
  },
  timeValue: {
    color: '#B15740',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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