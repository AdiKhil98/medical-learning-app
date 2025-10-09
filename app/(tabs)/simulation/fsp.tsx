import React, { useRef, useEffect } from 'react';
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

export default function FSPSimulationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { canUseSimulation, subscriptionStatus, recordUsage, getSubscriptionInfo, checkAccess } = useSubscription(user?.id);
  const voiceflowController = useRef<VoiceflowController | null>(null);
  const [timerActive, setTimerActive] = React.useState(false);
  const [timeRemaining, setTimeRemaining] = React.useState(20 * 60); // 20 minutes in seconds
  const [timerEndTime, setTimerEndTime] = React.useState(0); // Absolute timestamp when timer should end
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const [sessionToken, setSessionToken] = React.useState<string | null>(null);
  const [usageMarked, setUsageMarked] = React.useState(false); // Track if we've marked usage at 10min
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null); // For security heartbeat

  // Timer warning system state
  const [timerWarningLevel, setTimerWarningLevel] = React.useState<'normal' | 'yellow' | 'orange' | 'red'>('normal');
  const [showWarningMessage, setShowWarningMessage] = React.useState(false);
  const [warningMessageText, setWarningMessageText] = React.useState('');
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Graceful end system state
  const [showFinalWarningModal, setShowFinalWarningModal] = React.useState(false);
  const [finalWarningCountdown, setFinalWarningCountdown] = React.useState(10);
  const [isGracefulShutdown, setIsGracefulShutdown] = React.useState(false);
  const [showSimulationCompleted, setShowSimulationCompleted] = React.useState(false);
  const finalCountdownInterval = useRef<NodeJS.Timeout | null>(null);

  // Resume simulation state
  const [showResumeModal, setShowResumeModal] = React.useState(false);
  const [resumeTimeRemaining, setResumeTimeRemaining] = React.useState(0);

  // Readiness checklist state
  const [showReadinessModal, setShowReadinessModal] = React.useState(true);
  const [checklistItems, setChecklistItems] = React.useState<Array<{id: string, label: string, checked: boolean}>>([]);
  const [allItemsChecked, setAllItemsChecked] = React.useState(false);

  // Early completion state
  const [showEarlyCompletionModal, setShowEarlyCompletionModal] = React.useState(false);
  const [earlyCompletionReason, setEarlyCompletionReason] = React.useState('');

  // Check for existing simulation on mount
  useEffect(() => {
    initializeChecklist();
    checkExistingSimulation();
  }, []);

  // Add Escape key listener for readiness modal
  useEffect(() => {
    if (!showReadinessModal) return;

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        console.log('🔑 FSP: Escape key pressed, closing readiness modal');
        cancelReadiness();
      }
    };

    window.addEventListener('keydown', handleEscapeKey);

    return () => {
      window.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showReadinessModal]);

  // Initialize Voiceflow widget when component mounts
  useEffect(() => {
    const initializeVoiceflow = async () => {
      if (Platform.OS === 'web') {
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

            // Only start timer if readiness checklist was completed
            if (!timerActive && !showReadinessModal) {
              console.log('🎯 FSP: Audio stream granted - voice call starting!');
              console.log('⏰ FSP: Starting 20-minute timer due to voice call');
              startSimulationTimer();
            } else if (showReadinessModal) {
              console.log('⏸️ FSP: Audio stream granted but readiness modal still showing');
            }

            // Monitor stream tracks for when they end
            const audioTracks = stream.getAudioTracks();
            audioTracks.forEach((track, index) => {
              console.log(`🎤 FSP: Monitoring audio track ${index + 1}`);
              
              track.addEventListener('ended', () => {
                console.log(`🔇 FSP: Audio track ${index + 1} ended - call likely finished`);
                
                // Check current timer state from the React ref
                const currentTimerActive = timerInterval.current !== null;
                console.log(`🔍 FSP: Track ended - checking timer interval:`, {
                  timerIntervalExists: !!timerInterval.current,
                  shouldStopTimer: currentTimerActive
                });
                
                if (currentTimerActive) {
                  console.log('🔇 FSP: Audio track ended - stopping timer');
                  stopSimulationTimer();
                } else {
                  console.log('⏰ FSP: Timer already stopped, no action needed');
                }
              });

              // Also monitor for track being stopped manually
              const originalStop = track.stop.bind(track);
              track.stop = () => {
                console.log(`🔇 FSP: Audio track ${index + 1} stopped manually`);
                originalStop();
                
                // Check current timer state immediately
                const currentTimerActive = timerInterval.current !== null;
                console.log(`🔍 FSP: Track stopped - checking timer interval:`, {
                  timerIntervalExists: !!timerInterval.current,
                  shouldStopTimer: currentTimerActive
                });
                
                if (currentTimerActive) {
                  console.log('🔇 FSP: Audio track stopped - stopping timer');
                  stopSimulationTimer();
                } else {
                  console.log('⏰ FSP: Timer already stopped, no action needed');
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
    if (timerActive) return; // Already running
    
    console.log('⏰ FSP: Starting 20-minute simulation timer');
    
    try {
      // Check if user can start simulation and get session token
      const canStart = await simulationTracker.canStartSimulation('fsp');
      if (!canStart.allowed) {
        Alert.alert('Simulationslimit', canStart.message || 'Simulation kann nicht gestartet werden');
        return;
      }

      // Start simulation tracking in database
      const result = await simulationTracker.startSimulation('fsp');
      if (!result.success) {
        Alert.alert('Fehler', result.error || 'Simulation-Tracking konnte nicht gestartet werden');
        return;
      }

      setSessionToken(result.sessionToken || null);
      setUsageMarked(false);

      // Save simulation state to localStorage
      if (result.sessionToken && typeof window !== 'undefined' && window.localStorage) {
        try {
          const startTime = Date.now();
          const duration = 20 * 60 * 1000; // 20 minutes in milliseconds
          const endTime = startTime + duration;
          setTimerEndTime(endTime);

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

      // Start heartbeat monitoring for security
      if (result.sessionToken) {
        startHeartbeat(result.sessionToken);
      }

    } catch (error) {
      console.error('❌ FSP: Failed to start simulation tracking:', error);
      // Continue with timer anyway for UX, but log the error
    }

    setTimerActive(true);
    setTimeRemaining(20 * 60); // Reset to 20 minutes

    // Use 100ms interval for better accuracy with absolute time calculation
    timerInterval.current = setInterval(() => {
      // Calculate remaining time based on absolute end time
      const endTime = timerEndTime;
      const remaining = endTime - Date.now();
      const remainingSeconds = Math.floor(remaining / 1000);

      // Get previous value for comparison
      const prev = timeRemaining;

      // Update time remaining
      if (remaining <= 0) {
        setTimeRemaining(0);
        clearInterval(timerInterval.current!);
        timerInterval.current = null;
        console.log('⏰ FSP: Timer finished - 20 minutes elapsed');
        console.log('🔚 FSP: Initiating graceful end sequence');
        initiateGracefulEnd();
        return;
      } else {
        setTimeRemaining(remainingSeconds);
      }

      // Mark as used at 10-minute mark (only trigger once)
      if (prev > 600 && remainingSeconds <= 600 && !usageMarked && sessionToken) {
        const clientElapsed = (20 * 60) - remainingSeconds;
        console.log('🔍 DEBUG: 10-minute mark reached, marking as used');
        console.log('🔍 DEBUG: Client calculated elapsed time:', clientElapsed, 'seconds');
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
    }, 100); // Check every 100ms for high accuracy
  };

  // Mark simulation as used at 10-minute mark with server-side validation
  const markSimulationAsUsed = async (clientElapsedSeconds: number) => {
    if (!sessionToken || usageMarked) return;
    
    console.log('📊 FSP: Marking simulation as used at 10-minute mark');
    console.log('🔍 DEBUG: Client elapsed seconds being sent:', clientElapsedSeconds);
    
    try {
      const result = await simulationTracker.markSimulationUsed(sessionToken, clientElapsedSeconds);
      if (result.success) {
        setUsageMarked(true);
        console.log('✅ FSP: Simulation usage recorded in database with server validation');
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
          if (!usageMarked) {
            finalStatus = 'incomplete'; // Ended before reaching 10-minute usage mark
            console.log('📊 FSP: Marking as incomplete - ended before 10-minute mark');
          } else {
            finalStatus = 'aborted'; // Ended after 10-minute mark, still counts as used
            console.log('📊 FSP: Marking as aborted - ended after 10-minute mark');
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
      
      // Stop timer and mark as aborted (sync version for cleanup)
      if (timerActive && sessionToken) {
        simulationTracker.updateSimulationStatus(sessionToken, 'aborted', (20 * 60) - timeRemaining)
          .then(() => console.log('📊 FSP: Session marked as aborted during cleanup'))
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

    // Reset all state variables
    setTimerActive(false);
    setTimeRemaining(20 * 60);
    setTimerEndTime(0);
    setSessionToken(null);
    setUsageMarked(false);

    // Reset timer warning states
    setTimerWarningLevel('normal');
    setShowWarningMessage(false);
    setWarningMessageText('');

    // Reset graceful end states
    setShowFinalWarningModal(false);
    setFinalWarningCountdown(10);
    setIsGracefulShutdown(false);
    setShowSimulationCompleted(false);

    // Clear any existing intervals
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }

    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
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

    // Reset getUserMedia override if it exists
    if ((window as any).fspOriginalGetUserMedia && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = (window as any).fspOriginalGetUserMedia;
      delete (window as any).fspOriginalGetUserMedia;
    }

    // Clear localStorage
    clearSimulationStorage();

    // Reset resume modal states
    setShowResumeModal(false);
    setResumeTimeRemaining(0);

    // Reset readiness checklist
    resetChecklist();
    setShowReadinessModal(true);

    // Reset early completion state
    setShowEarlyCompletionModal(false);
    setEarlyCompletionReason('');

    console.log('✅ FSP: Simulation state reset completed');
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

  // Initialize readiness checklist
  const initializeChecklist = () => {
    const items = [
      {
        id: 'quiet_environment',
        label: 'Ich befinde mich in einer ruhigen Umgebung',
        checked: false
      },
      {
        id: 'microphone_ready',
        label: 'Mein Mikrofon funktioniert einwandfrei',
        checked: false
      },
      {
        id: 'time_available',
        label: 'Ich habe 20 Minuten Zeit ohne Unterbrechungen',
        checked: false
      },
      {
        id: 'stable_connection',
        label: 'Meine Internetverbindung ist stabil',
        checked: false
      },
      {
        id: 'device_charged',
        label: 'Mein Gerät ist aufgeladen oder am Netzteil',
        checked: false
      }
    ];
    setChecklistItems(items);
    updateAllItemsChecked(items);
  };

  // Toggle checklist item
  const toggleChecklistItem = (itemId: string) => {
    const updatedItems = checklistItems.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    setChecklistItems(updatedItems);
    updateAllItemsChecked(updatedItems);
  };

  // Update all items checked status
  const updateAllItemsChecked = (items: Array<{id: string, label: string, checked: boolean}>) => {
    const allChecked = items.every(item => item.checked);
    setAllItemsChecked(allChecked);
  };

  // Reset checklist
  const resetChecklist = () => {
    const resetItems = checklistItems.map(item => ({ ...item, checked: false }));
    setChecklistItems(resetItems);
    setAllItemsChecked(false);
  };

  // Handle start simulation button
  const handleStartSimulation = () => {
    if (!allItemsChecked) {
      const uncheckedItems = checklistItems.filter(item => !item.checked);
      const uncheckedLabels = uncheckedItems.map(item => `• ${item.label}`).join('\n');
      Alert.alert(
        'Bereitschaftsprüfung',
        `Bitte bestätigen Sie alle Punkte:\n\n${uncheckedLabels}`,
        [{ text: 'OK' }]
      );
      return;
    }

    console.log('✅ FSP: All checklist items confirmed, hiding readiness modal');
    setShowReadinessModal(false);
    // Microphone detection will trigger timer start automatically
  };

  // Cancel readiness
  const cancelReadiness = () => {
    console.log('↩️ FSP: Closing readiness modal');

    // On web, use window.confirm for confirmation dialog
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Möchten Sie die Simulation wirklich verlassen?');
      if (confirmed) {
        setShowReadinessModal(false);
        resetChecklist();
        router.back();
      }
    } else {
      // On mobile, use Alert.alert
      Alert.alert(
        'Simulation verlassen',
        'Möchten Sie die Simulation wirklich verlassen?',
        [
          { text: 'Nein', style: 'cancel' },
          {
            text: 'Ja',
            style: 'destructive',
            onPress: () => {
              setShowReadinessModal(false);
              resetChecklist();
              router.back();
            }
          }
        ]
      );
    }
  };

  // Check for existing simulation on mount
  const checkExistingSimulation = () => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;

      const startTime = localStorage.getItem('sim_start_time_fsp');
      const endTime = localStorage.getItem('sim_end_time_fsp');
      const savedSessionToken = localStorage.getItem('sim_session_token_fsp');
      const durationMs = localStorage.getItem('sim_duration_ms_fsp');

      // If no saved simulation, show readiness modal
      if (!startTime || !savedSessionToken || !durationMs) {
        setShowReadinessModal(true);
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
        setShowReadinessModal(true);
        return;
      }

      // Time still remaining, offer to resume
      const remainingSeconds = Math.floor(remaining / 1000);
      console.log(`✅ FSP: Can resume simulation with ${remainingSeconds}s remaining`);
      setResumeTimeRemaining(remainingSeconds);

      // Hide readiness modal, show resume modal instead
      setShowReadinessModal(false);
      setShowResumeModal(true);

    } catch (error) {
      console.error('❌ FSP: Error checking existing simulation:', error);
      clearSimulationStorage();
      setShowReadinessModal(true);
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
      setTimeRemaining(Math.floor(remaining / 1000));
      setTimerEndTime(endTime); // Set absolute end time
      setSessionToken(savedSessionToken);

      // Start heartbeat monitoring for resumed session
      startHeartbeat(savedSessionToken);

      // Start timer interval for resumed session with absolute time calculation
      timerInterval.current = setInterval(() => {
        // Calculate remaining time based on absolute end time
        const remaining = endTime - Date.now();
        const remainingSeconds = Math.floor(remaining / 1000);

        // Get previous value for comparison
        const prev = timeRemaining;

        // Update time remaining
        if (remaining <= 0) {
          setTimeRemaining(0);
          clearInterval(timerInterval.current!);
          timerInterval.current = null;
          console.log('⏰ FSP: Timer finished - 20 minutes elapsed');
          console.log('🔚 FSP: Initiating graceful end sequence');
          initiateGracefulEnd();
          return;
        } else {
          setTimeRemaining(remainingSeconds);
        }

        // Mark as used at 10-minute mark (only trigger once)
        if (prev > 600 && remainingSeconds <= 600 && !usageMarked && savedSessionToken) {
          const clientElapsed = (20 * 60) - remainingSeconds;
          console.log('🔍 DEBUG: 10-minute mark reached, marking as used');
          console.log('🔍 DEBUG: Client calculated elapsed time:', clientElapsed, 'seconds');
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
      }, 100); // Check every 100ms for high accuracy

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
      {/* Readiness Modal */}
      {showReadinessModal && (
        <View style={styles.readinessOverlay}>
          <TouchableOpacity
            style={styles.overlayBackdrop}
            activeOpacity={1}
            onPress={cancelReadiness}
          />
          <View style={styles.readinessModal}>
            <View style={styles.readinessHeader}>
              <Text style={styles.headerIcon}>🎯</Text>
              <Text style={styles.readinessHeaderTitle}>Simulation Vorbereitung</Text>
              <Text style={styles.headerSubtitle}>Stellen Sie sicher, dass Sie bereit sind</Text>

              {/* Close Button (X) */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  console.log('🔘 FSP: Close button clicked');
                  cancelReadiness();
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.readinessScrollView}
              showsVerticalScrollIndicator={true}
              bounces={false}
            >
              <View style={styles.checklistContainer}>
                <Text style={styles.checklistIntro}>
                  Bitte bestätigen Sie folgende Punkte, bevor Sie beginnen:
                </Text>

                <View style={styles.checklistItems}>
                  {checklistItems.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.checklistItem}
                      onPress={() => toggleChecklistItem(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                        {item.checked && (
                          <View style={styles.checkmark}>
                            <Text style={styles.checkmarkText}>✓</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.itemLabel}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.readinessFooter}>
              <View style={styles.infoBoxReadiness}>
                <Text style={styles.infoIconText}>ℹ️</Text>
                <Text style={styles.infoBoxText}>
                  Die Simulation dauert 20 Minuten und kann nicht pausiert werden.
                </Text>
              </View>

              <View style={styles.buttonGroupReadiness}>
                <TouchableOpacity
                  style={[styles.startButton, !allItemsChecked && styles.startButtonDisabled]}
                  onPress={handleStartSimulation}
                  disabled={!allItemsChecked}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonIconText}>🎤</Text>
                  <Text style={styles.startButtonText}>Simulation starten</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButtonReadiness}
                  onPress={cancelReadiness}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Abbrechen</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Header with back button and title */}
      <LinearGradient
        colors={['#ef4444', '#dc2626']}
        style={styles.header}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Mic size={24} color="white" />
          <Text style={styles.headerTitle}>FSP-Simulation</Text>
        </View>

        <View style={styles.headerSpacer} />
      </LinearGradient>

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
  content: {
    flex: 1,
    flexDirection: 'column',
  },
  instructionsContainer: {
    flex: 2, // Takes up 2/3 of available space
    minHeight: 300,
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
  // Readiness Modal Styles
  readinessOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10002,
    padding: 20,
  },
  overlayBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  readinessModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxWidth: 600,
    width: '100%',
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.4,
    shadowRadius: 80,
    elevation: 20,
    zIndex: 1,
  },
  readinessScrollView: {
    maxHeight: 300,
  },
  readinessHeader: {
    backgroundColor: '#B15740',
    padding: 32,
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 5,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 24,
  },
  headerIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  readinessHeaderTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
    margin: 0,
  },
  checklistContainer: {
    padding: 32,
  },
  checklistIntro: {
    color: '#333333',
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 24,
    fontWeight: '500',
  },
  checklistItems: {
    gap: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: '#F8F3E8',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderWidth: 3,
    borderColor: '#B15740',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  checkboxChecked: {
    backgroundColor: '#B15740',
    borderColor: '#B15740',
  },
  checkmark: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  itemLabel: {
    color: '#333333',
    fontSize: 15,
    lineHeight: 21,
    flex: 1,
  },
  readinessFooter: {
    padding: 32,
    paddingTop: 24,
    backgroundColor: '#FAFAFA',
  },
  infoBoxReadiness: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFF4E6',
    borderWidth: 1,
    borderColor: '#FFD93D',
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
  },
  infoIconText: {
    fontSize: 20,
  },
  infoBoxText: {
    color: '#666666',
    fontSize: 14,
    flex: 1,
    lineHeight: 21,
  },
  buttonGroupReadiness: {
    gap: 12,
  },
  startButton: {
    backgroundColor: '#B15740',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: 'rgba(177, 87, 64, 0.3)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 6,
  },
  startButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    opacity: 0.6,
  },
  buttonIconText: {
    fontSize: 24,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  cancelButtonReadiness: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#CCCCCC',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
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
});