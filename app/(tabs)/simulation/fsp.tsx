import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mic, Clock, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { createFSPController, VoiceflowController, globalVoiceflowCleanup } from '@/utils/voiceflowIntegration';
import { stopGlobalVoiceflowCleanup } from '@/utils/globalVoiceflowCleanup';
import { simulationTracker } from '@/lib/simulationTrackingService';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import InlineInstructions from '@/components/ui/InlineInstructions';
import { InlineContent, Section, Paragraph, BoldText, Step, InfoBox, TimeItem, TipsList, HighlightBox, TimeBadge } from '@/components/ui/InlineContent';
import { UpgradeRequiredModal } from '@/components/ui/UpgradeRequiredModal';
import { QuickDiagnostic } from '@/components/QuickDiagnostic';

export default function FSPSimulationScreen() {
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

  // Upgrade required modal state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Check for existing simulation on mount
  useEffect(() => {
    checkExistingSimulation();
  }, []);

  // Reset optimistic count on page mount/refresh to show actual backend count
  useEffect(() => {
    resetOptimisticCount();
  }, []);

  // Initialize Voiceflow widget when component mounts
  useEffect(() => {
    const initializeVoiceflow = async () => {
      if (typeof window !== 'undefined') {
        console.log('🏥 FSP: Initializing medical simulation');

        // Stop global cleanup to allow widget
        stopGlobalVoiceflowCleanup();
        
        // Create and load controller
        const controller = createFSPController();
        voiceflowController.current = controller;
        
        try {
          const loaded = await controller.loadWidget();
          if (loaded) {
            console.log('✅ FSP: Voiceflow widget loaded successfully');
            
            // Make sure widget is visible and functional
            setTimeout(() => {
              if (window.voiceflow?.chat) {
                window.voiceflow.chat.show();
                console.log('👁️ FSP: Widget made visible');
              }
            }, 1000);
            
            // Set up conversation monitoring
            setupConversationMonitoring();
          }
        } catch (error) {
          console.error('❌ FSP: Failed to load Voiceflow widget:', error);
        }
      }
    };

    initializeVoiceflow();
  }, []);

  // Set up monitoring for conversation start
  const setupConversationMonitoring = () => {
    console.log('🔍 FSP: Setting up passive microphone detection...');

    // Method 1: Monitor for MediaStream creation and termination
    const originalGetUserMedia = navigator.mediaDevices?.getUserMedia;
    if (originalGetUserMedia) {
      navigator.mediaDevices.getUserMedia = async function(constraints) {
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
              
              track.addEventListener('ended', () => {
                console.log(`🔇 FSP: Audio track ${index + 1} ended - but NOT stopping timer`);
                console.log(`ℹ️ FSP: Timer continues - user must click "Ich bin fertig" or wait for 20min timer`);

                // DO NOT automatically stop the timer!
                // The user should control when the simulation ends via:
                // 1. "Ich bin fertig" button
                // 2. 20-minute timer expiration
                // 3. Manual navigation away from page
              });

              // Also monitor for track being stopped manually
              const originalStop = track.stop.bind(track);
              track.stop = () => {
                console.log(`🔇 FSP: Audio track ${index + 1} stopped manually - but NOT stopping timer`);
                console.log(`ℹ️ FSP: Timer continues - user must click "Ich bin fertig" or wait for 20min timer`);
                originalStop();

                // DO NOT automatically stop the timer!
                // Let the timer run until user explicitly ends the simulation
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
    console.log('🔍 DEBUG: startSimulationTimer called, timerActive:', timerActive, 'timerActiveRef:', timerActiveRef.current, 'sessionToken:', sessionTokenRef.current);

    // ========================================================================
    // CHECKPOINT 1: ACCESS CONTROL - Check subscription limits BEFORE starting
    // ========================================================================
    console.log('[Access Control] CHECKPOINT 1: Verifying subscription access...');

    const accessStatus = await checkAccess();

    if (!accessStatus || !accessStatus.canUseSimulation) {
      console.error('[Access Control] ❌ BLOCKED - User cannot start simulation');
      console.error('[Access Control] Reason:', accessStatus?.message || 'Unknown');

      // Stop and close Voiceflow widget if it started
      if (window.voiceflow?.chat) {
        console.log('[Access Control] Closing Voiceflow widget due to access denial');
        try {
          window.voiceflow.chat.close();
          window.voiceflow.chat.hide();
        } catch (e) {
          console.error('[Access Control] Error closing widget:', e);
        }
      }

      // Show upgrade modal instead of alert
      setShowUpgradeModal(true);

      // DO NOT PROCEED - Exit function
      return;
    }

    console.log('[Access Control] ✅ CHECKPOINT 1 PASSED - Access granted');
    console.log('[Access Control] Remaining simulations:', accessStatus.remainingSimulations);

    // CRITICAL: Check if a session already exists to prevent duplicate database sessions
    if (sessionTokenRef.current) {
      console.log('🔍 DEBUG: Session already exists, returning early to prevent duplicates');
      return;
    }

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

    console.log('✅ FSP: Timer activated BEFORE database calls');

    try {
      // ========================================================================
      // CHECKPOINT 2: BACKEND VALIDATION - Double-check with backend
      // ========================================================================
      console.log('[Access Control] CHECKPOINT 2: Backend validation...');

      const canStart = await simulationTracker.canStartSimulation('fsp');
      console.log('[Access Control] Backend result:', canStart);

      if (!canStart.allowed) {
        console.error('[Access Control] ❌ BLOCKED by backend');
        console.error('[Access Control] Reason:', canStart.message);

        // Stop timer that was started
        setTimerActive(false);
        timerActiveRef.current = false;
        clearInterval(timerInterval.current!);
        timerInterval.current = null;

        // Close Voiceflow widget
        if (window.voiceflow?.chat) {
          try {
            window.voiceflow.chat.close();
            window.voiceflow.chat.hide();
          } catch (e) {
            console.error('[Access Control] Error closing widget:', e);
          }
        }

        // Show upgrade modal instead of alert
        setShowUpgradeModal(true);

        // DO NOT PROCEED
        return;
      }

      console.log('[Access Control] ✅ CHECKPOINT 2 PASSED - Backend approved');

      // Start simulation tracking in database
      const result = await simulationTracker.startSimulation('fsp');
      if (result.success) {
        // Success case: save session token and setup heartbeat
        setSessionToken(result.sessionToken || null);
        sessionTokenRef.current = result.sessionToken || null; // Store in ref for timer closure
        setUsageMarked(false);
        usageMarkedRef.current = false; // Initialize ref

        // Apply optimistic counter deduction (show immediate feedback to user)
        applyOptimisticDeduction();

        // Save simulation state to localStorage
        if (result.sessionToken && typeof window !== 'undefined' && window.localStorage) {
          try {
            localStorage.setItem('sim_start_time_fsp', startTime.toString());
            localStorage.setItem('sim_end_time_fsp', endTime.toString());
            localStorage.setItem('sim_session_token_fsp', result.sessionToken);
            localStorage.setItem('sim_duration_ms_fsp', duration.toString());
            if (user?.id) {
              localStorage.setItem('sim_user_id_fsp', user.id);
            }
            console.log('💾 FSP: Saved simulation state to localStorage');
          } catch (error) {
            console.error('❌ FSP: Error saving to localStorage:', error);
          }
        }

        // DEBUG: Check Voiceflow controller state before sending variables
        console.log('🔍 Voiceflow controller check:', {
          exists: !!voiceflowController.current,
          type: typeof voiceflowController.current,
          hasMethod: voiceflowController.current?.updateSessionVariables !== undefined,
          hasSessionToken: !!result.sessionToken,
          hasUserId: !!user?.id
        });

        // Send session variables to Voiceflow
        if (result.sessionToken && user?.id && voiceflowController.current) {
          try {
            console.log('📤 FSP: Sending session variables to Voiceflow...');
            const variablesUpdated = await voiceflowController.current.updateSessionVariables(
              user.id,
              result.sessionToken
            );
            if (variablesUpdated) {
              console.log('✅ FSP: Session variables successfully sent to Voiceflow');
            } else {
              console.warn('⚠️ FSP: Failed to send session variables to Voiceflow');
            }
          } catch (error) {
            console.error('❌ FSP: Error sending variables to Voiceflow:', error);
          }
        }

        // Start heartbeat monitoring for security
        if (result.sessionToken) {
          startHeartbeat(result.sessionToken);
        }
      } else {
        // Failure case: log error but continue timer
        console.error('❌ FSP: Failed to start simulation tracking:', result.error);
        console.log('⏰ FSP: Timer continues despite DB error for better UX');
      }

    } catch (error) {
      console.error('❌ FSP: Exception during simulation tracking:', error);
      console.log('⏰ FSP: Timer continues despite exception for better UX');
    }

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

        // NOTE: We do NOT call recordUsage() here because mark_simulation_counted
        // already increments the counter in the database. Calling recordUsage() would
        // result in double-counting (incrementing the counter twice).
      } else{
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
      navigator.mediaDevices?.getUserMedia({ audio: true })
        .then((stream) => {
          console.log('🔚 FSP: Stopping active audio streams');
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

  // Start heartbeat monitoring for session security
  const startHeartbeat = (sessionToken: string) => {
    console.log('💓 FSP: Starting heartbeat monitoring');

    heartbeatInterval.current = setInterval(async () => {
      try {
        // Check if sessionToken is still valid
        if (!sessionToken) {
          console.warn('💓 FSP: No session token available for heartbeat');
          return;
        }

        const result = await simulationTracker.sendHeartbeat(sessionToken);
        if (!result.success) {
          console.warn('💓 FSP: Heartbeat failed:', result.error);
          // Don't stop the timer on heartbeat failure, just log it
        }
      } catch (error) {
        console.error('💓 FSP: Heartbeat error:', error);
      }
    }, 30000); // Send heartbeat every 30 seconds
  };

  // Stop heartbeat monitoring
  const stopHeartbeat = () => {
    if (heartbeatInterval.current) {
      console.log('💓 FSP: Stopping heartbeat monitoring');
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  };

  // Stop the simulation timer
  const stopSimulationTimer = async (reason: 'completed' | 'aborted' = 'completed') => {
    console.log('🛑 FSP: Stopping simulation timer');

    // If graceful shutdown is in progress, skip voiceflow close
    if (isGracefulShutdown && reason === 'completed') {
      // Just update database
      try {
        const elapsedSeconds = (20 * 60) - timeRemaining;

        if (sessionToken) {
          await simulationTracker.updateSimulationStatus(sessionToken, 'completed', elapsedSeconds);
          console.log(`📊 FSP: Graceful shutdown - Simulation marked as completed (${elapsedSeconds}s elapsed)`);
        }
      } catch (error) {
        console.error('❌ FSP: Error updating session during graceful shutdown:', error);
      }

      // Reset state
      resetSimulationState();
      return;
    }

    // Stop heartbeat monitoring
    stopHeartbeat();
    
    // Update status in database if we have a session token
    if (sessionToken) {
      try {
        const elapsedSeconds = (20 * 60) - timeRemaining;
        
        // Determine the appropriate status based on usage and reason
        let finalStatus: 'completed' | 'aborted' | 'incomplete' = reason;
        
        if (reason === 'completed') {
          // If completed naturally (timer finished), it's completed
          finalStatus = 'completed';
        } else if (reason === 'aborted') {
          // If aborted, check if it was before 10-minute mark
          if (!usageMarked && elapsedSeconds < 300) {
            finalStatus = 'incomplete'; // Ended before reaching 10-minute usage mark
            console.log('📊 FSP: Marking as incomplete - ended before 5-minute mark');

            // Reset optimistic counter since simulation ended before being charged
            console.log('🔄 FSP: Resetting optimistic count - simulation ended before being charged');
            resetOptimisticCount();
          } else {
            finalStatus = 'aborted'; // Ended after 10-minute mark, still counts as used
            console.log('📊 FSP: Marking as aborted - ended after 5-minute mark (or usage already recorded)');
          }
        }
        
        await simulationTracker.updateSimulationStatus(sessionToken, finalStatus as any, elapsedSeconds);
        console.log(`📊 FSP: Simulation marked as ${finalStatus} in database (${elapsedSeconds}s elapsed)`);
      } catch (error) {
        console.error('❌ FSP: Error updating simulation status:', error);
      }
    }

    // Clear localStorage
    clearSimulationStorage();

    // Reset simulation state to allow restart
    resetSimulationState();

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
  const executeSimulationEnd = () => {
    console.log('🏁 FSP: Executing simulation end');

    // Hide final warning modal
    setShowFinalWarningModal(false);

    // Give Voiceflow 2 seconds to flush any pending messages
    setTimeout(() => {
      // Close Voiceflow conversation
      if (window.voiceflow?.chat) {
        try {
          console.log('🔚 FSP: Closing Voiceflow widget');
          window.voiceflow.chat.close && window.voiceflow.chat.close();
          window.voiceflow.chat.hide && window.voiceflow.chat.hide();
        } catch (error) {
          console.error('❌ FSP: Error closing voiceflow:', error);
        }
      }

      // Stop timer with completed status
      stopSimulationTimer('completed');

      // Show completion modal after brief delay
      setTimeout(() => {
        showCompletionModal();
      }, 500);
    }, 2000);
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
  const closeCompletionModal = () => {
    setShowSimulationCompleted(false);
    resetSimulationState();
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
    const elapsedSeconds = (20 * 60) - timeRemaining;

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

    // Stop timer
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }

    // Stop heartbeat
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }

    setTimerActive(false);
    timerActiveRef.current = false;

    // Give Voiceflow 2 seconds to flush any pending messages
    setTimeout(async () => {
      // Close Voiceflow conversation
      if (window.voiceflow?.chat) {
        try {
          console.log('🔚 FSP: Closing Voiceflow widget');
          window.voiceflow.chat.close && window.voiceflow.chat.close();
          window.voiceflow.chat.hide && window.voiceflow.chat.hide();
        } catch (error) {
          console.error('❌ FSP: Error closing voiceflow:', error);
        }
      }

      // Update database with early completion status
      if (sessionToken) {
        try {
          await simulationTracker.updateSimulationStatus(
            sessionToken,
            'completed',
            elapsedSeconds,
            {
              completion_type: 'early',
              completion_reason: earlyCompletionReason || 'user_finished_early'
            }
          );
          console.log(`📊 FSP: Early completion recorded (${elapsedSeconds}s elapsed, reason: ${earlyCompletionReason || 'user_finished_early'})`);

          // Reset optimistic counter if simulation ended before being charged (< 10 minutes)
          if (!usageMarked && elapsedSeconds < 300) {
            console.log('🔄 FSP: Early completion before 5-minute mark - resetting optimistic count');
            resetOptimisticCount();
          } else if (elapsedSeconds >= 300) {
            console.log('✅ FSP: Simulation reached 5-minute threshold - counter already deducted, no reset needed');
          }
        } catch (error) {
          console.error('❌ FSP: Error updating early completion status:', error);
        }
      }

      // Clear localStorage
      clearSimulationStorage();

      // Show completion modal after brief delay
      setTimeout(() => {
        showCompletionModal();
      }, 500);
    }, 2000);
  };

  // Cleanup when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      console.log('🧹 FSP: Cleanup started');

      // Stop heartbeat monitoring
      stopHeartbeat();

      // Stop timer and mark status based on whether usage was recorded
      if (timerActive && sessionToken) {
        // CRITICAL: If usage was already marked at 5-minute mark, treat as completed
        // This prevents silent refund from incorrectly refunding the counter
        const finalStatus = usageMarkedRef.current ? 'completed' : 'aborted';
        console.log(`🔍 FSP: Cleanup - usageMarked=${usageMarkedRef.current}, marking session as ${finalStatus}`);

        simulationTracker.updateSimulationStatus(sessionToken, finalStatus, (20 * 60) - timeRemaining)
          .then(() => console.log(`📊 FSP: Session marked as ${finalStatus} during cleanup`))
          .catch(error => console.error('❌ FSP: Error during cleanup:', error));
      }
      
      // Remove event listeners
      if ((window as any).fspClickListener) {
        document.removeEventListener('click', (window as any).fspClickListener, true);
        delete (window as any).fspClickListener;
      }

      // Restore original getUserMedia function
      if ((window as any).fspOriginalGetUserMedia && navigator.mediaDevices) {
        navigator.mediaDevices.getUserMedia = (window as any).fspOriginalGetUserMedia;
        delete (window as any).fspOriginalGetUserMedia;
      }
      
      // Cleanup Voiceflow controller
      if (voiceflowController.current) {
        console.log('🔧 FSP: Cleaning up Voiceflow controller');
        voiceflowController.current.destroy();
        voiceflowController.current = null;
      }
      
      // Run global cleanup to ensure widget is completely removed
      if (Platform.OS === 'web') {
        console.log('🌍 FSP: Running global Voiceflow cleanup with force=true');
        globalVoiceflowCleanup(true); // Force cleanup even on simulation page
      }
      
      console.log('✅ FSP: Cleanup completed');
    };
  }, []);

  // Check simulation access on page load
  useEffect(() => {
    if (user && !canUseSimulation) {
      const info = getSubscriptionInfo();
      Alert.alert(
        'Simulationslimit erreicht',
        subscriptionStatus?.message || 'Sie haben Ihr Simulationslimit erreicht.',
        [
          {
            text: info?.canUpgrade ? 'Plan upgraden' : 'OK',
            onPress: () => {
              if (info?.canUpgrade) {
                router.push('/subscription');
              } else {
                router.back();
              }
            }
          }
        ]
      );
    }
  }, [user, canUseSimulation]); // Removed subscriptionStatus and getSubscriptionInfo to prevent re-render loop

  // Handle navigation away from page with immediate cleanup
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (timerActive) {
        e.preventDefault();
        e.returnValue = 'Simulation läuft. Möchten Sie wirklich die Seite verlassen?';
        return e.returnValue;
      }
    };

    // Enhanced visibility change handler for navigation blocking
    const handleVisibilityChange = () => {
      if (timerActive && (document.visibilityState === 'hidden' || document.hidden)) {
        console.log('🚫 FSP: Attempted to leave page during simulation - BLOCKED');
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
    };

    // Handle route changes - BLOCK during active simulation
    const handlePopState = (e: PopStateEvent) => {
      if (timerActive) {
        console.log('🚫 FSP: Navigation blocked - simulation in progress');
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
        '.vfrc-chat'
      ];
      
      widgetSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          element.remove();
          console.log(`🗑️ FSP: Immediately removed element: ${selector}`);
        });
      });
      
      // Stop any active media streams
      navigator.mediaDevices?.getUserMedia({ audio: true })
        .then(stream => {
          stream.getTracks().forEach(track => {
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
  const resetSimulationState = () => {
    console.log('🔄 FSP: Resetting simulation state for restart');

    // CRITICAL: Clear intervals FIRST before resetting refs
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
      console.log('✅ FSP: Cleared timer interval');
    }

    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
      console.log('✅ FSP: Cleared heartbeat interval');
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
    if ((window as any).fspOriginalGetUserMedia && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = (window as any).fspOriginalGetUserMedia;
      delete (window as any).fspOriginalGetUserMedia;
    }

    // Remove and re-add click listener for next run
    if ((window as any).fspClickListener) {
      document.removeEventListener('click', (window as any).fspClickListener, true);
      delete (window as any).fspClickListener;
    }

    // Clear localStorage
    clearSimulationStorage();

    // Reset resume modal states
    setShowResumeModal(false);
    setResumeTimeRemaining(0);

    // Reset early completion state
    setShowEarlyCompletionModal(false);
    setEarlyCompletionReason('');

    console.log('✅ FSP: Simulation state reset completed - ready for next run');
    console.log('🔍 FSP: Post-reset state - timerActiveRef:', timerActiveRef.current, 'timerInterval:', timerInterval.current);

    // Re-setup conversation monitoring for next run
    setTimeout(() => {
      if (voiceflowController.current) {
        console.log('🔄 FSP: Re-initializing conversation monitoring after reset');
        setupConversationMonitoring();
      }
    }, 500);
  };

  // Clear simulation localStorage
  const clearSimulationStorage = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('sim_start_time_fsp');
        localStorage.removeItem('sim_end_time_fsp');
        localStorage.removeItem('sim_session_token_fsp');
        localStorage.removeItem('sim_duration_ms_fsp');
        localStorage.removeItem('sim_user_id_fsp');
        console.log('✅ FSP: Cleared simulation localStorage');
      }
    } catch (error) {
      console.error('❌ FSP: Error clearing localStorage:', error);
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

  // Check for existing simulation on mount
  const checkExistingSimulation = () => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;

      const startTime = localStorage.getItem('sim_start_time_fsp');
      const endTime = localStorage.getItem('sim_end_time_fsp');
      const savedSessionToken = localStorage.getItem('sim_session_token_fsp');
      const durationMs = localStorage.getItem('sim_duration_ms_fsp');

      // If no saved simulation, just return
      if (!startTime || !savedSessionToken || !durationMs) {
        return;
      }

      console.log('🔍 FSP: Found existing simulation in localStorage');

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
        console.log('⏰ FSP: Saved simulation has expired');
        clearSimulationStorage();
        showExpiredSimulationMessage();
        return;
      }

      // Time still remaining, offer to resume
      const remainingSeconds = Math.floor(remaining / 1000);
      console.log(`✅ FSP: Can resume simulation with ${remainingSeconds}s remaining`);
      setResumeTimeRemaining(remainingSeconds);

      // Show resume modal
      setShowResumeModal(true);

    } catch (error) {
      console.error('❌ FSP: Error checking existing simulation:', error);
      clearSimulationStorage();
    }
  };

  // Resume simulation from localStorage
  const resumeSimulation = () => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;

      const startTime = localStorage.getItem('sim_start_time_fsp');
      const savedEndTime = localStorage.getItem('sim_end_time_fsp');
      const savedSessionToken = localStorage.getItem('sim_session_token_fsp');
      const durationMs = localStorage.getItem('sim_duration_ms_fsp');

      if (!startTime || !savedSessionToken || !durationMs) {
        setShowResumeModal(false);
        clearSimulationStorage();
        return;
      }

      console.log('▶️ FSP: Resuming simulation');

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
      setTimeRemaining(Math.floor(remaining / 1000));
      setTimerEndTime(endTime); // Set absolute end time
      timerEndTimeRef.current = endTime;
      setSessionToken(savedSessionToken);
      sessionTokenRef.current = savedSessionToken; // Store in ref for timer closure
      previousTimeRef.current = Math.floor(remaining / 1000); // Initialize ref for resume

      // Start heartbeat monitoring for resumed session
      startHeartbeat(savedSessionToken);

      // Start timer interval for resumed session with absolute time calculation
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

      console.log(`✅ FSP: Resumed with ${Math.floor(remaining / 1000)}s remaining`);

    } catch (error) {
      console.error('❌ FSP: Error resuming simulation:', error);
      setShowResumeModal(false);
      clearSimulationStorage();
    }
  };

  // Decline to resume simulation
  const declineResume = async () => {
    console.log('❌ FSP: User declined to resume simulation');
    setShowResumeModal(false);

    try {
      // Mark session as abandoned in database
      const savedSessionToken = localStorage.getItem('sim_session_token_fsp');
      if (savedSessionToken) {
        await simulationTracker.updateSimulationStatus(savedSessionToken, 'aborted', 0);
        console.log('📊 FSP: Marked session as abandoned');
      }
    } catch (error) {
      console.error('❌ FSP: Error marking session as abandoned:', error);
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


  // FSP Simulation inline instructions content
  const fspInstructions = [
    {
      id: 'overview',
      title: 'Überblick',
      content: (
        <InlineContent>
          <Section title="🏥 Was ist die FSP-Simulation?">
            <Paragraph>
              Willkommen zu Ihrem <BoldText>Fachsprachprüfungs-Training</BoldText>! Diese realistische Simulation bereitet Sie optimal auf die FSP vor.
            </Paragraph>

            <HighlightBox type="info">
              🎯 <BoldText>Hauptzweck:</BoldText> Authentische Prüfungserfahrung sammeln und Selbstvertrauen aufbauen
            </HighlightBox>

            <Paragraph>
              <BoldText>Ihre Vorteile auf einen Blick:</BoldText>
            </Paragraph>

            <View style={{ marginLeft: 16 }}>
              <Paragraph>• Realistische Patientengespräche</Paragraph>
              <Paragraph>• Professionelle Prüfersituationen</Paragraph>
              <Paragraph>• Sofortiges, detailliertes Feedback</Paragraph>
              <Paragraph>• Gezieltes Kompetenz-Training</Paragraph>
            </View>

            <InfoBox>
              📋 Diese Simulation testet Ihre medizinische Kommunikationskompetenz in authentischen Situationen
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
          <Section title="📋 Simulation in 4 Schritten">
            <Step
              number="1"
              title="🔐 Benutzer-ID Verifizierung"
              description="Geben Sie zunächst Ihre zugewiesene Benutzer-ID an"
              details={[
                "Sichert korrekte Zuordnung zu Ihrem Konto",
                "Ermöglicht personalisierte Fortschrittsverfolgung"
              ]}
            />

            <Step
              number="2"
              title="📂 Fallauswahl"
              description="Wählen Sie gezielt medizinische Fälle zum Training"
              details={[
                "Auswahl nach <BoldText>Fachgebiet</BoldText>: Innere Medizin, Notfall, Neurologie",
                "Fokus auf persönliche Schwerpunkte möglich"
              ]}
            />

            <Step
              number="3"
              title="👨‍⚕️ Patientenanamnese"
              description={
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text>Führen Sie ein authentisches Patientengespräch</Text>
                  <TimeBadge>(10 Min)</TimeBadge>
                </View>
              }
              details={[
                "<BoldText>Start:</BoldText> Professionelle Begrüßung auf Deutsch",
                "<BoldText>Während:</BoldText> Vollständige Anamnese erheben (Hauptbeschwerde, Symptome, Vorgeschichte, Medikation, Allergien)",
                "<BoldText>Ende:</BoldText> <BoldText>Sagen Sie 'Ich bin fertig'</BoldText> zum Abschluss",
                "Automatische Übertragung zur Auswertung"
              ]}
            />

            <Step
              number="4"
              title="👩‍⚕️ Prüfergespräch"
              description={
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text>Gespräch mit Dr. Hoffmann (Oberarzt)</Text>
                  <TimeBadge>(10 Min)</TimeBadge>
                </View>
              }
              details={[
                "<BoldText>Vorstellung:</BoldText> Berichten Sie über Ihren Hintergrund",
                "<BoldText>Fallbesprechung:</BoldText> Diskutieren Sie Diagnose und Behandlung",
                "<BoldText>Fachwissen:</BoldText> Medizinische Terminologie anwenden",
                "<BoldText>Ende:</BoldText> <BoldText>Sagen Sie 'Ich bin fertig'</BoldText> oder <BoldText>'Können wir das beenden?'</BoldText>"
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
              title="Stärkenanalyse"
              description="Ihre erkannten Kompetenzen:"
              details={[
                "Kommunikationsstärken identifiziert",
                "Fachliche Kompetenz bestätigt",
                "Erfolgreiche Gesprächsführung dokumentiert"
              ]}
            />

            <Step
              number="📈"
              title="Optimierungsfelder"
              description="Gezielte Verbesserungsempfehlungen:"
              details={[
                "Konkrete Sprachkorrekturen",
                "Terminologie-Feedback",
                "Kommunikationstechniken verfeinern"
              ]}
            />

            <Step
              number="💡"
              title="Nächste Schritte"
              description="Ihr persönlicher Erfolgsplan:"
              details={[
                "Individuell abgestimmte Übungen",
                "Zusätzliche Lernressourcen",
                "Praxis-Tipps für die echte Prüfung"
              ]}
            />
          </Section>

          <Section title="⏱️ Zeitplan im Überblick">
            <View style={{ backgroundColor: 'rgba(181, 87, 64, 0.05)', padding: 16, borderRadius: 12, marginVertical: 8 }}>
              <TimeItem label="📅 Gesamtdauer" time="20 Minuten" />
              <TimeItem label="👨‍⚕️ Patientenanamnese" time="10 Minuten" />
              <TimeItem label="👩‍⚕️ Prüfergespräch" time="10 Minuten" />
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
              🎯 <BoldText>Profi-Strategien für maximalen Lernerfolg</BoldText>
            </HighlightBox>

            <View style={{ marginVertical: 8 }}>
              <View style={{ backgroundColor: 'rgba(34, 197, 94, 0.05)', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#22c55e' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#16a34a', marginBottom: 8 }}>1. 🗣️ Natürlich kommunizieren</Text>
                <Text style={{ fontSize: 15, color: '#333333', lineHeight: 24 }}>
                  <BoldText>Sprechen Sie authentisch</BoldText> – führen Sie ein echtes Gespräch, kein auswendig gelerntes Skript.
                </Text>
              </View>

              <View style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#3b82f6' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#2563eb', marginBottom: 8 }}>2. ⚕️ Fachsprache demonstrieren</Text>
                <Text style={{ fontSize: 15, color: '#333333', lineHeight: 24 }}>
                  <BoldText>Zeigen Sie Ihr medizinisches Deutsch</BoldText> – verwenden Sie präzise Fachterminologie souverän.
                </Text>
              </View>

              <View style={{ backgroundColor: 'rgba(251, 146, 60, 0.05)', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#fb923c' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#ea580c', marginBottom: 8 }}>3. ⏰ Effizient strukturieren</Text>
                <Text style={{ fontSize: 15, color: '#333333', lineHeight: 24 }}>
                  <BoldText>Gründlich, aber zeitbewusst</BoldText> – alle wichtigen Punkte in der verfügbaren Zeit abdecken.
                </Text>
              </View>

              <View style={{ backgroundColor: 'rgba(168, 85, 247, 0.05)', padding: 16, borderRadius: 12, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#a855f7' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#9333ea', marginBottom: 8 }}>4. 🧘‍♀️ Ruhe bewahren</Text>
                <Text style={{ fontSize: 15, color: '#333333', lineHeight: 24 }}>
                  <BoldText>Entspannt bleiben</BoldText> – die Simulation unterstützt Ihr Lernen und Ihre Entwicklung.
                </Text>
              </View>
            </View>
          </Section>

          <Section title="🚀 Jetzt starten?">
            <Paragraph>
              Jede Simulation bringt Sie Ihrem FSP-Erfolg näher. <BoldText>Vertrauen Sie dem Prozess</BoldText> – jede Übung stärkt Ihre Kompetenz!
            </Paragraph>

            <HighlightBox type="success">
              🌟 <BoldText>Bereit zum Training?</BoldText> Halten Sie Ihre Benutzer-ID bereit und starten Sie Ihr professionelles FSP-Training!
            </HighlightBox>

            <View style={{ marginTop: 16, padding: 12, backgroundColor: 'rgba(184, 126, 112, 0.05)', borderRadius: 8 }}>
              <Text style={{ fontSize: 13, fontStyle: 'italic', color: '#B87E70', lineHeight: 20 }}>
                💼 Diese Simulation bietet authentische Prüfungserfahrung mit sofortigem, professionellem Feedback für optimale FSP-Vorbereitung.
              </Text>
            </View>
          </Section>
        </InlineContent>
      )
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button and title */}
      <LinearGradient
        colors={['#ef4444', '#dc2626']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/(tabs)/simulation')}
        >
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
            <Text style={styles.counterBadgeText}>
              {getSubscriptionInfo()?.usageText}
            </Text>
          </View>
        </View>
      )}

      {/* Emergency Diagnostic Component */}
      <QuickDiagnostic />

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

          {/* Early completion button */}
          <TouchableOpacity
            style={[
              styles.finishButton,
              timeRemaining > 1140 && styles.finishButtonDisabled
            ]}
            onPress={initiateEarlyCompletion}
            disabled={timeRemaining > 1140}
            activeOpacity={0.8}
          >
            <Text style={styles.finishIcon}>✓</Text>
            <Text style={styles.finishButtonText}>Ich bin fertig</Text>
          </TouchableOpacity>

          {/* Hint when button is disabled */}
          {timeRemaining > 1140 && (
            <Text style={styles.finishButtonHint}>
              Verfügbar nach 1 Minute
            </Text>
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
            <InlineInstructions tabs={fspInstructions} />
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

            {/* Time Information */}
            <View style={styles.timeInfo}>
              <View style={styles.timeRow}>
                <Text style={styles.timeRowLabel}>Verstrichene Zeit:</Text>
                <Text style={styles.timeRowValue}>{formatTime((20 * 60) - timeRemaining)}</Text>
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
                Ihre Simulation wird beendet und zur Auswertung weitergeleitet. Das Gespräch wird gespeichert und analysiert.
              </Text>
            </View>

            {/* Reason Selector */}
            <View style={styles.reasonSection}>
              <Text style={styles.reasonLabel}>Grund (optional):</Text>
              <TouchableOpacity
                style={styles.reasonSelector}
                onPress={() => {
                  Alert.alert(
                    'Grund wählen',
                    'Warum möchten Sie die Simulation vorzeitig beenden?',
                    [
                      {
                        text: 'Alle Aufgaben abgeschlossen',
                        onPress: () => setEarlyCompletionReason('finished_all_tasks')
                      },
                      {
                        text: 'Ausreichendes Gespräch geführt',
                        onPress: () => setEarlyCompletionReason('sufficient_conversation')
                      },
                      {
                        text: 'Technisches Problem',
                        onPress: () => setEarlyCompletionReason('technical_issue')
                      },
                      {
                        text: 'Persönlicher Grund',
                        onPress: () => setEarlyCompletionReason('personal_reason')
                      },
                      {
                        text: 'Sonstiges',
                        onPress: () => setEarlyCompletionReason('other')
                      },
                      { text: 'Abbrechen', style: 'cancel' }
                    ]
                  );
                }}
              >
                <Text style={styles.reasonText}>
                  {earlyCompletionReason === 'finished_all_tasks' ? 'Alle Aufgaben abgeschlossen' :
                   earlyCompletionReason === 'sufficient_conversation' ? 'Ausreichendes Gespräch geführt' :
                   earlyCompletionReason === 'technical_issue' ? 'Technisches Problem' :
                   earlyCompletionReason === 'personal_reason' ? 'Persönlicher Grund' :
                   earlyCompletionReason === 'other' ? 'Sonstiges' :
                   'Tippen Sie, um einen Grund auszuwählen'}
                </Text>
                <Text style={styles.reasonArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Buttons */}
            <View style={styles.earlyCompletionButtons}>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmEarlyCompletion}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonIcon}>✓</Text>
                <Text style={styles.confirmButtonText}>Ja, beenden</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.continueButton}
                onPress={cancelEarlyCompletion}
                activeOpacity={0.7}
              >
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
        currentTier={subscriptionStatus?.subscriptionTier || null}
        remainingSimulations={subscriptionStatus?.remainingSimulations || 0}
        totalLimit={subscriptionStatus?.simulationLimit || 0}
        simulationsUsed={subscriptionStatus?.simulationsUsed || 0}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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