import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Brain, Clock, Info, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { createKPController, VoiceflowController, globalVoiceflowCleanup } from '@/utils/voiceflowIntegration';
import { stopGlobalVoiceflowCleanup } from '@/utils/globalVoiceflowCleanup';
import { simulationTracker } from '@/lib/simulationTrackingService';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import InlineInstructions from '@/components/ui/InlineInstructions';
import { InlineContent, Section, Paragraph, BoldText, Step, InfoBox, TimeItem, TipsList, HighlightBox, TimeBadge } from '@/components/ui/InlineContent';

export default function KPSimulationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { canUseSimulation, subscriptionStatus, recordUsage, getSubscriptionInfo, checkAccess } = useSubscription(user?.id);
  const voiceflowController = useRef<VoiceflowController | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(20 * 60); // 20 minutes in seconds
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [usageMarked, setUsageMarked] = useState(false); // Track if we've marked usage at 10min
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

  // Initialize Voiceflow widget when component mounts
  useEffect(() => {
    const initializeVoiceflow = async () => {
      if (Platform.OS === 'web') {
        console.log('🏥 KP: Initializing medical simulation');

        // Stop global cleanup to allow widget
        stopGlobalVoiceflowCleanup();

        // Create and load controller
        const controller = createKPController();
        voiceflowController.current = controller;
        
        try {
          const loaded = await controller.loadWidget();
          if (loaded) {
            console.log('✅ KP: Voiceflow widget loaded successfully');
            
            // Make sure widget is visible and functional
            setTimeout(() => {
              if (window.voiceflow?.chat) {
                window.voiceflow.chat.show();
                console.log('👁️ KP: Widget made visible');
              }
            }, 1000);
            
            // Set up conversation monitoring
            setupConversationMonitoring();
          }
        } catch (error) {
          console.error('❌ KP: Failed to load Voiceflow widget:', error);
        }
      }
    };

    initializeVoiceflow();
  }, []);

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
            
            if (!timerActive) {
              console.log('🎯 KP: Audio stream granted - voice call starting!');
              console.log('⏰ KP: Starting 20-minute timer due to voice call');
              console.log('🔍 DEBUG: About to call startSimulationTimer()');
              startSimulationTimer();
            }

            // Monitor stream tracks for when they end
            const audioTracks = stream.getAudioTracks();
            audioTracks.forEach((track, index) => {
              console.log(`🎤 KP: Monitoring audio track ${index + 1}`);
              
              track.addEventListener('ended', () => {
                console.log(`🔇 KP: Audio track ${index + 1} ended - call likely finished`);
                
                // Check current timer state from the React ref
                const currentTimerActive = timerInterval.current !== null;
                console.log(`🔍 KP: Track ended - checking timer interval:`, {
                  timerIntervalExists: !!timerInterval.current,
                  shouldStopTimer: currentTimerActive
                });
                
                if (currentTimerActive) {
                  console.log('🔇 KP: Audio track ended - stopping timer');
                  stopSimulationTimer();
                } else {
                  console.log('⏰ KP: Timer already stopped, no action needed');
                }
              });

              // Also monitor for track being stopped manually
              const originalStop = track.stop.bind(track);
              track.stop = () => {
                console.log(`🔇 KP: Audio track ${index + 1} stopped manually`);
                originalStop();
                
                // Check current timer state immediately
                const currentTimerActive = timerInterval.current !== null;
                console.log(`🔍 KP: Track stopped - checking timer interval:`, {
                  timerIntervalExists: !!timerInterval.current,
                  shouldStopTimer: currentTimerActive
                });
                
                if (currentTimerActive) {
                  console.log('🔇 KP: Audio track stopped - stopping timer');
                  stopSimulationTimer();
                } else {
                  console.log('⏰ KP: Timer already stopped, no action needed');
                }
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
    console.log('🔍 DEBUG: startSimulationTimer called, timerActive:', timerActive);
    if (timerActive) {
      console.log('🔍 DEBUG: Timer already active, returning early');
      return; // Already running
    }

    console.log('⏰ KP: Starting 20-minute simulation timer');
    
    try {
      console.log('🔍 DEBUG: About to check if can start simulation');
      
      // Check if user can start simulation and get session token
      const canStart = await simulationTracker.canStartSimulation('kp');
      console.log('🔍 DEBUG: canStart result:', canStart);
      
      if (!canStart.allowed) {
        console.error('❌ DEBUG: Cannot start simulation, showing alert');
        Alert.alert('Simulationslimit', canStart.message || 'Simulation kann nicht gestartet werden');
        return;
      }

      console.log('🔍 DEBUG: About to start simulation in database');
      
      // Start simulation tracking in database
      const result = await simulationTracker.startSimulation('kp');
      console.log('🔍 DEBUG: startSimulation result:', result);
      
      if (!result.success) {
        console.error('❌ DEBUG: Failed to start simulation, showing alert');
        Alert.alert('Fehler', result.error || 'Simulation-Tracking konnte nicht gestartet werden');
        return;
      }

      console.log('✅ DEBUG: Successfully got session token:', result.sessionToken);
      setSessionToken(result.sessionToken || null);
      setUsageMarked(false);
      
    } catch (error) {
      console.error('❌ KP: Failed to start simulation tracking:', error);
      // Continue with timer anyway for UX, but log the error
    }

    console.log('🔍 DEBUG: About to set timer active and start interval');
    setTimerActive(true);
    setTimeRemaining(20 * 60); // Reset to 20 minutes
    
    // Start security heartbeat (every 60 seconds)
    if (sessionToken) {
      console.log('🔍 DEBUG: Starting security heartbeat');
      heartbeatInterval.current = setInterval(async () => {
        try {
          await simulationTracker.sendHeartbeat(sessionToken);
          console.log('💓 DEBUG: Heartbeat sent');
        } catch (error) {
          console.error('❌ DEBUG: Heartbeat failed:', error);
        }
      }, 60000); // Every 60 seconds
    }
    
    console.log('🔍 DEBUG: Creating timer interval');
    timerInterval.current = setInterval(() => {
      setTimeRemaining((prev) => {
        // Log timer value every 10 seconds for debugging
        if (prev % 10 === 0) {
          console.log('⏱️ DEBUG: Timer at', Math.floor(prev / 60) + ':' + String(prev % 60).padStart(2, '0'), `(${prev} seconds)`);
        }

        // Timer warning triggers
        if (prev === 300) {
          showTimerWarning('5 Minuten verbleibend', 'yellow', false);
        }

        if (prev === 120) {
          showTimerWarning('2 Minuten verbleibend', 'orange', false);
        }

        if (prev === 60) {
          showTimerWarning('Nur noch 1 Minute!', 'red', false);
        }

        if (prev === 30) {
          showTimerWarning('30 Sekunden verbleibend', 'red', true);
        }

        if (prev === 10) {
          showTimerWarning('Simulation endet in 10 Sekunden', 'red', true);
        }

        // Mark as used at 10-minute mark (when timer shows 10:00 remaining)
        if (prev <= 600 && prev >= 595 && !usageMarked && sessionToken) { // Around 10:00 remaining = 10 minutes elapsed
          const clientElapsed = (20 * 60) - prev; // Calculate client-side elapsed time
          console.log('🔍 DEBUG: 10-minute mark reached (timer at', prev, 'seconds), marking as used');
          console.log('🔍 DEBUG: Client calculated elapsed time:', clientElapsed, 'seconds');
          markSimulationAsUsed(clientElapsed);
        }

        if (prev <= 1) {
          console.log('⏰ KP: Timer finished - 20 minutes elapsed');
          console.log('🔚 KP: Initiating graceful end sequence');
          initiateGracefulEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Mark simulation as used at 10-minute mark
  const markSimulationAsUsed = async (clientElapsedSeconds?: number) => {
    if (!sessionToken || usageMarked) return;
    
    console.log('📊 KP: Marking simulation as used at 10-minute mark');
    console.log('🔍 DEBUG: Client elapsed seconds:', clientElapsedSeconds);
    
    try {
      const result = await simulationTracker.markSimulationUsed(sessionToken, clientElapsedSeconds);
      if (result.success) {
        setUsageMarked(true);
        console.log('✅ KP: Simulation usage recorded in database with server validation');

        // Also record subscription usage
        console.log('💳 Recording subscription usage...');
        const subscriptionRecorded = await recordUsage();
        if (subscriptionRecorded) {
          console.log('✅ KP: Subscription usage recorded successfully');
        } else {
          console.error('❌ KP: Failed to record subscription usage');
        }
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

    // If graceful shutdown is in progress, skip voiceflow close
    if (isGracefulShutdown && reason === 'completed') {
      // Just update database
      try {
        const elapsedSeconds = (20 * 60) - timeRemaining;

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
            console.log('📊 KP: Marking as incomplete - ended before 10-minute mark');
          } else {
            finalStatus = 'aborted'; // Ended after 10-minute mark, still counts as used
            console.log('📊 KP: Marking as aborted - ended after 10-minute mark');
          }
        }
        
        await simulationTracker.updateSimulationStatus(sessionToken, finalStatus as any, elapsedSeconds);
        console.log(`📊 KP: Simulation marked as ${finalStatus} in database (${elapsedSeconds}s elapsed)`);
      } catch (error) {
        console.error('❌ KP: Error updating simulation status:', error);
      }
    }
    
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
  const executeSimulationEnd = () => {
    console.log('🏁 KP: Executing simulation end');

    // Hide final warning modal
    setShowFinalWarningModal(false);

    // Give Voiceflow 2 seconds to flush any pending messages
    setTimeout(() => {
      // Close Voiceflow conversation
      if (window.voiceflow?.chat) {
        try {
          console.log('🔚 KP: Closing Voiceflow widget');
          window.voiceflow.chat.close && window.voiceflow.chat.close();
          window.voiceflow.chat.hide && window.voiceflow.chat.hide();
        } catch (error) {
          console.error('❌ KP: Error closing voiceflow:', error);
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

  // Cleanup when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      console.log('🧹 KP: Cleanup started');
      
      // Stop timer and mark as aborted (sync version for cleanup)
      if (timerActive && sessionToken) {
        simulationTracker.updateSimulationStatus(sessionToken, 'aborted', (20 * 60) - timeRemaining)
          .then(() => console.log('📊 KP: Session marked as aborted during cleanup'))
          .catch(error => console.error('❌ KP: Error during cleanup:', error));
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
      
      // Cleanup Voiceflow controller
      if (voiceflowController.current) {
        console.log('🔧 KP: Cleaning up Voiceflow controller');
        voiceflowController.current.destroy();
        voiceflowController.current = null;
      }
      
      // Run global cleanup to ensure widget is completely removed
      if (Platform.OS === 'web') {
        console.log('🌍 KP: Running global Voiceflow cleanup with force=true');
        globalVoiceflowCleanup(true); // Force cleanup even on simulation page
      }
      
      console.log('✅ KP: Cleanup completed');
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

    // Enhanced visibility change handler for immediate widget cleanup
    const handleVisibilityChange = () => {
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

    // Reset all state variables
    setTimerActive(false);
    setTimeRemaining(20 * 60);
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
    if ((window as any).kpOriginalGetUserMedia && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = (window as any).kpOriginalGetUserMedia;
      delete (window as any).kpOriginalGetUserMedia;
    }

    console.log('✅ KP: Simulation state reset completed');
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
      {/* Header with back button and title */}
      <LinearGradient
        colors={['#4338ca', '#3730a3']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
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

      {/* Timer display - only show when active */}
      {timerActive && (
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
          <InlineInstructions tabs={kpInstructions} />
        </View>

        {/* Widget Area */}
        <View style={styles.widgetArea}>
          {/* Widget loads here automatically */}
        </View>
      </View>

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
});