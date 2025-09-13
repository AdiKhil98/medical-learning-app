import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { createFSPController, VoiceflowController, globalVoiceflowCleanup } from '@/utils/voiceflowIntegration';
import { stopGlobalVoiceflowCleanup } from '@/utils/globalVoiceflowCleanup';

export default function FSPSimulationScreen() {
  const router = useRouter();
  const voiceflowController = useRef<VoiceflowController | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(20 * 60); // 20 minutes in seconds
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

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
    console.log('🔍 FSP: Setting up conversation monitoring...');

    // Method 1: Listen for custom Voiceflow events from the widget
    const voiceflowEventListener = (event: CustomEvent) => {
      console.log('🎯 FSP: Voiceflow event detected:', event.type, event.detail);
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
        console.log('📨 FSP: Window message received:', {
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
          console.log('🎯 FSP: Potential conversation start detected via message:', event.data);
          if (!timerActive) {
            startSimulationTimer();
          }
        }
      }
    };

    // Method 3: Comprehensive click detection with logging
    const clickListener = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Log EVERY click to see if we're capturing anything at all
      console.log('🖱️ FSP: ANY click detected:', {
        tagName: target.tagName,
        className: target.className,
        textContent: target.textContent?.slice(0, 30),
        id: target.id
      });
      
      // Check if click was on the specific "Start a call" button or its children
      const startCallButton = target.closest('button.vfrc-button');
      const hasStartCallText = target.textContent?.includes('Start a call') || 
                              target.closest('*')?.textContent?.includes('Start a call');

      if (startCallButton && hasStartCallText) {
        console.log('🎯 FSP: "Start a call" button clicked!', {
          button: startCallButton,
          className: startCallButton.className,
          textContent: startCallButton.textContent
        });
        
        if (!timerActive) {
          console.log('⏰ FSP: Starting 20-minute timer due to Start a call button click');
          startSimulationTimer();
        }
      }

      // Check for ANY button with vfrc class
      const anyVfrcButton = target.closest('button');
      if (anyVfrcButton && anyVfrcButton.className.includes('vfrc')) {
        console.log('🔍 FSP: VFRC button clicked (backup detection):', {
          className: anyVfrcButton.className,
          textContent: anyVfrcButton.textContent?.slice(0, 50)
        });
        
        if (!timerActive && anyVfrcButton.textContent?.includes('Start')) {
          console.log('⏰ FSP: Starting timer due to Start button detection');
          startSimulationTimer();
        }
      }
    };

    // Method 4: Periodic DOM check for widget changes
    const domChecker = setInterval(() => {
      if (!timerActive) {
        const voiceflowElements = document.querySelectorAll('[class*="vfrc"], [class*="voiceflow"]');
        if (voiceflowElements.length > 0) {
          voiceflowElements.forEach((element, index) => {
            if (index < 3) { // Log first 3 elements only
              console.log(`🔍 FSP: Found Voiceflow element ${index + 1}:`, {
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
    (window as any).fspVoiceflowListener = voiceflowEventListener;
    (window as any).fspMessageListener = messageListener;
    (window as any).fspClickListener = clickListener;
    (window as any).fspDomChecker = domChecker;
  };

  // Start the 20-minute simulation timer
  const startSimulationTimer = () => {
    if (timerActive) return; // Already running
    
    console.log('⏰ FSP: Starting 20-minute simulation timer');
    setTimerActive(true);
    setTimeRemaining(20 * 60); // Reset to 20 minutes
    
    timerInterval.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          console.log('⏰ FSP: Timer finished - 20 minutes elapsed');
          stopSimulationTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Stop the simulation timer
  const stopSimulationTimer = () => {
    console.log('🛑 FSP: Stopping simulation timer');
    setTimerActive(false);
    
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  };

  // Cleanup when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      console.log('🧹 FSP: Cleanup started');
      
      // Stop timer
      stopSimulationTimer();
      
      // Remove event listeners
      if ((window as any).fspVoiceflowListener) {
        window.removeEventListener('voiceflowWidgetOpened', (window as any).fspVoiceflowListener);
        window.removeEventListener('voiceflowUserInteraction', (window as any).fspVoiceflowListener);
        window.removeEventListener('voiceflowDOMActivity', (window as any).fspVoiceflowListener);
        delete (window as any).fspVoiceflowListener;
      }

      if ((window as any).fspMessageListener) {
        window.removeEventListener('message', (window as any).fspMessageListener);
        delete (window as any).fspMessageListener;
      }
      
      if ((window as any).fspClickListener) {
        document.removeEventListener('click', (window as any).fspClickListener, true);
        delete (window as any).fspClickListener;
      }

      if ((window as any).fspDomChecker) {
        clearInterval((window as any).fspDomChecker);
        delete (window as any).fspDomChecker;
      }
      
      // Cleanup Voiceflow controller
      if (voiceflowController.current) {
        console.log('🔧 FSP: Cleaning up Voiceflow controller');
        voiceflowController.current.destroy();
        voiceflowController.current = null;
      }
      
      // Run global cleanup to ensure widget is completely removed
      if (Platform.OS === 'web') {
        console.log('🌍 FSP: Running global Voiceflow cleanup');
        globalVoiceflowCleanup();
      }
      
      console.log('✅ FSP: Cleanup completed');
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
    backgroundColor: '#0077B6',
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