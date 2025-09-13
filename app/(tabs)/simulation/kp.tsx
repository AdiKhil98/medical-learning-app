import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { createKPController, VoiceflowController, globalVoiceflowCleanup } from '@/utils/voiceflowIntegration';
import { stopGlobalVoiceflowCleanup } from '@/utils/globalVoiceflowCleanup';

export default function KPSimulationScreen() {
  const router = useRouter();
  const voiceflowController = useRef<VoiceflowController | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(20 * 60); // 20 minutes in seconds
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

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
    console.log('🔍 KP: Setting up conversation monitoring...');

    // Method 1: Listen for custom Voiceflow events from the widget
    const voiceflowEventListener = (event: CustomEvent) => {
      console.log('🎯 KP: Voiceflow event detected:', event.type, event.detail);
      if (!timerActive) {
        startSimulationTimer();
      }
    };

    window.addEventListener('voiceflowWidgetOpened', voiceflowEventListener as EventListener);
    window.addEventListener('voiceflowUserInteraction', voiceflowEventListener as EventListener);
    window.addEventListener('voiceflowDOMActivity', voiceflowEventListener as EventListener);
    
    // Method 2: Listen for ALL window messages - comprehensive logging
    const messageListener = (event: MessageEvent) => {
      // Log ALL messages to see what's actually being sent
      if (event.data) {
        console.log('📨 KP: Window message received:', {
          type: event.data.type,
          action: event.data.action,
          event: event.data.event,
          source: event.data.source,
          origin: event.origin,
          data: event.data
        });
      }
      
      if (event.data && typeof event.data === 'object') {
        // Check for any Voiceflow-related activity
        if (
          event.data.type?.includes('voiceflow') ||
          event.data.type?.includes('chat') ||
          event.data.type?.includes('call') ||
          event.data.source?.includes('voiceflow') ||
          event.data.action === 'start' ||
          event.data.event === 'start' ||
          (event.data.message && (
            event.data.message.includes('start') ||
            event.data.message.includes('call') ||
            event.data.message.includes('conversation')
          ))
        ) {
          console.log('🎯 KP: Potential conversation start detected via message:', event.data);
          if (!timerActive) {
            startSimulationTimer();
          }
        }
      }
    };

    // Method 3: Specific detection for "Start a call" button
    const clickListener = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if click was on the specific "Start a call" button or its children
      const startCallButton = target.closest('button.vfrc-button');
      const hasStartCallText = target.textContent?.includes('Start a call') || 
                              target.closest('*')?.textContent?.includes('Start a call');

      if (startCallButton && hasStartCallText) {
        console.log('🎯 KP: "Start a call" button clicked!', {
          button: startCallButton,
          className: startCallButton.className,
          textContent: startCallButton.textContent
        });
        
        if (!timerActive) {
          console.log('⏰ KP: Starting 20-minute timer due to Start a call button click');
          startSimulationTimer();
        }
      }

      // Also check for any vfrc-button clicks as backup
      if (target.closest('.vfrc-button') && !timerActive) {
        console.log('🔍 KP: Voiceflow button clicked (backup detection):', {
          className: target.className,
          textContent: target.textContent?.slice(0, 50)
        });
      }
    };

    // Method 4: Periodic DOM check for widget changes
    const domChecker = setInterval(() => {
      if (!timerActive) {
        const voiceflowElements = document.querySelectorAll('[class*="vfrc"], [class*="voiceflow"]');
        if (voiceflowElements.length > 0) {
          voiceflowElements.forEach((element, index) => {
            if (index < 3) { // Log first 3 elements only
              console.log(`🔍 KP: Found Voiceflow element ${index + 1}:`, {
                className: element.className,
                textContent: element.textContent?.slice(0, 100),
                visible: (element as HTMLElement).offsetWidth > 0
              });
            }
          });
        }
      }
    }, 5000); // Check every 5 seconds

    window.addEventListener('message', messageListener);
    document.addEventListener('click', clickListener, true);

    // Store references for cleanup
    (window as any).kpVoiceflowListener = voiceflowEventListener;
    (window as any).kpMessageListener = messageListener;
    (window as any).kpClickListener = clickListener;
    (window as any).kpDomChecker = domChecker;
  };

  // Start the 20-minute simulation timer
  const startSimulationTimer = () => {
    if (timerActive) return; // Already running
    
    console.log('⏰ KP: Starting 20-minute simulation timer');
    setTimerActive(true);
    setTimeRemaining(20 * 60); // Reset to 20 minutes
    
    timerInterval.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          console.log('⏰ KP: Timer finished - 20 minutes elapsed');
          stopSimulationTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Stop the simulation timer
  const stopSimulationTimer = () => {
    console.log('🛑 KP: Stopping simulation timer');
    setTimerActive(false);
    
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  };

  // Cleanup when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      console.log('🧹 KP: Cleanup started');
      
      // Stop timer
      stopSimulationTimer();
      
      // Remove event listeners
      if ((window as any).kpVoiceflowListener) {
        window.removeEventListener('voiceflowWidgetOpened', (window as any).kpVoiceflowListener);
        window.removeEventListener('voiceflowUserInteraction', (window as any).kpVoiceflowListener);
        window.removeEventListener('voiceflowDOMActivity', (window as any).kpVoiceflowListener);
        delete (window as any).kpVoiceflowListener;
      }

      if ((window as any).kpMessageListener) {
        window.removeEventListener('message', (window as any).kpMessageListener);
        delete (window as any).kpMessageListener;
      }
      
      if ((window as any).kpClickListener) {
        document.removeEventListener('click', (window as any).kpClickListener, true);
        delete (window as any).kpClickListener;
      }

      if ((window as any).kpDomChecker) {
        clearInterval((window as any).kpDomChecker);
        delete (window as any).kpDomChecker;
      }
      
      // Cleanup Voiceflow controller
      if (voiceflowController.current) {
        console.log('🔧 KP: Cleaning up Voiceflow controller');
        voiceflowController.current.destroy();
        voiceflowController.current = null;
      }
      
      // Run global cleanup to ensure widget is completely removed
      if (Platform.OS === 'web') {
        console.log('🌍 KP: Running global Voiceflow cleanup');
        globalVoiceflowCleanup();
      }
      
      console.log('✅ KP: Cleanup completed');
    };
  }, []);

  // Handle navigation away from page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (timerActive) {
        e.preventDefault();
        e.returnValue = 'Simulation läuft. Möchten Sie wirklich die Seite verlassen?';
        return e.returnValue;
      }
    };

    if (Platform.OS === 'web' && timerActive) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [timerActive]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Timer display - only show when active */}
        {timerActive && (
          <View style={styles.timerContainer}>
            <Text style={styles.timerText}>
              Simulation läuft: {formatTime(timeRemaining)}
            </Text>
          </View>
        )}
        
        {/* The page is intentionally blank - Voiceflow widget will appear here */}
        <View style={styles.widgetArea}>
          {/* Widget loads here automatically */}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  timerContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    zIndex: 1000,
  },
  timerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  widgetArea: {
    flex: 1,
    // This area is where the Voiceflow widget will appear
  },
});