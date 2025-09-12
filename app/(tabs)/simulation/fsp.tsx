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
    
    // Method 1: Listen for window messages
    const messageListener = (event: MessageEvent) => {
      if (event.data && typeof event.data === 'object') {
        // Check for conversation start indicators
        if (
          event.data.type === 'voiceflow:conversation:start' ||
          event.data.type === 'voiceflow:call:start' ||
          event.data.type === 'chat:start' ||
          (event.data.action === 'start' && event.data.source === 'voiceflow') ||
          (event.data.message && (
            event.data.message.includes('call started') ||
            event.data.message.includes('conversation started') ||
            event.data.message.includes('simulation started')
          ))
        ) {
          console.log('🎯 FSP: Conversation start detected via message:', event.data);
          startSimulationTimer();
        }
        
        // Check for conversation end indicators
        if (
          event.data.type === 'voiceflow:conversation:end' ||
          event.data.type === 'voiceflow:call:end' ||
          event.data.type === 'chat:end' ||
          (event.data.action === 'end' && event.data.source === 'voiceflow')
        ) {
          console.log('🛑 FSP: Conversation end detected via message:', event.data);
          stopSimulationTimer();
        }
      }
    };

    // Method 2: Monitor DOM for widget interactions
    const domMonitor = setInterval(() => {
      if (typeof window !== 'undefined' && !timerActive) {
        // Look for active conversation indicators in DOM
        const conversationIndicators = [
          '.vfrc-chat--opened',
          '.vfrc-conversation--active',
          '.voiceflow-conversation-active',
          '[data-conversation="active"]',
          '.vf-conversation',
          '.vfrc-message--user', // User has sent a message
        ];

        for (const selector of conversationIndicators) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(`🎯 FSP: Active conversation detected via DOM selector: ${selector}`);
            startSimulationTimer();
            break;
          }
        }

        // Method 3: Check for widget state changes
        if (window.voiceflow?.chat) {
          try {
            // Try to access widget state (this varies by Voiceflow version)
            const widget = window.voiceflow.chat;
            if (widget.isOpen && widget.isOpen() && !timerActive) {
              // Check if there are any messages indicating an active conversation
              const messageElements = document.querySelectorAll('.vfrc-message, .vf-message');
              if (messageElements.length > 1) { // More than just welcome message
                console.log('🎯 FSP: Active conversation detected via widget state');
                startSimulationTimer();
              }
            }
          } catch (error) {
            // Widget state access might not be available, that's ok
          }
        }
      }
    }, 2000); // Check every 2 seconds

    window.addEventListener('message', messageListener);

    // Store references for cleanup
    (window as any).fspMessageListener = messageListener;
    (window as any).fspDomMonitor = domMonitor;
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
      if ((window as any).fspMessageListener) {
        window.removeEventListener('message', (window as any).fspMessageListener);
        delete (window as any).fspMessageListener;
      }
      
      // Clear DOM monitor
      if ((window as any).fspDomMonitor) {
        clearInterval((window as any).fspDomMonitor);
        delete (window as any).fspDomMonitor;
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