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
    console.log('🔍 FSP: Setting up aggressive conversation monitoring...');
    
    // Method 1: Listen for ALL window messages and log them for debugging
    const messageListener = (event: MessageEvent) => {
      // Log all messages for debugging
      console.log('📨 FSP: Window message received:', event.data);
      
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

    // Method 2: Aggressive DOM monitoring for ANY widget interaction
    const domMonitor = setInterval(() => {
      if (typeof window !== 'undefined' && !timerActive) {
        // Look for ANY signs of widget activity
        const activitySelectors = [
          // Voiceflow widget classes
          '.vfrc-chat',
          '.vfrc-widget',
          '.vfrc-launcher',
          '.vfrc-conversation',
          '.vfrc-message',
          '.vfrc-input',
          '.vfrc-button',
          
          // Generic chat indicators
          '.chat-widget',
          '.chat-container',
          '.chat-active',
          '.conversation-active',
          '.widget-open',
          
          // Message indicators
          '[class*="message"]',
          '[class*="chat"]',
          '[class*="conversation"]',
          '[class*="voiceflow"]',
          '[class*="vfrc"]',
          '[class*="widget"]',
          
          // Input/interaction indicators  
          'input[placeholder*="message"]',
          'input[placeholder*="type"]',
          'textarea[placeholder*="message"]',
          'button[aria-label*="send"]',
          'button[title*="send"]'
        ];

        let foundActivity = false;
        for (const selector of activitySelectors) {
          try {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              // Check if any elements are visible/active
              for (const element of elements) {
                const rect = element.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0;
                const hasContent = element.textContent?.trim().length > 0;
                
                if (isVisible || hasContent) {
                  console.log(`🎯 FSP: Widget activity detected via selector: ${selector}`, {
                    element: element,
                    visible: isVisible,
                    content: element.textContent?.slice(0, 50)
                  });
                  foundActivity = true;
                  break;
                }
              }
              if (foundActivity) break;
            }
          } catch (error) {
            // Ignore selector errors
          }
        }

        if (foundActivity && !timerActive) {
          startSimulationTimer();
        }
      }
    }, 1000); // Check every second for faster detection

    // Method 3: Manual trigger - Add a test button (temporary for debugging)
    const addTestButton = () => {
      if (document.getElementById('fsp-test-timer')) return; // Already added
      
      const testButton = document.createElement('button');
      testButton.id = 'fsp-test-timer';
      testButton.textContent = '🧪 Test Timer (Debug)';
      testButton.style.cssText = `
        position: fixed;
        top: 60px;
        right: 20px;
        z-index: 9999;
        background: #0077B6;
        color: white;
        border: none;
        padding: 10px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 12px;
      `;
      testButton.onclick = () => {
        console.log('🧪 FSP: Manual timer start triggered');
        if (!timerActive) {
          startSimulationTimer();
        } else {
          stopSimulationTimer();
        }
      };
      document.body.appendChild(testButton);
    };

    // Method 4: Click detection on the entire page to catch widget interactions
    const clickListener = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target) {
        // Check if click was on or near Voiceflow elements
        const isVoiceflowClick = 
          target.closest('[class*="vfrc"]') ||
          target.closest('[class*="voiceflow"]') ||
          target.closest('[class*="chat"]') ||
          target.closest('[class*="widget"]') ||
          target.getAttribute('class')?.includes('vfrc') ||
          target.getAttribute('class')?.includes('voiceflow');

        if (isVoiceflowClick) {
          console.log('🎯 FSP: Click detected on Voiceflow element:', target);
          if (!timerActive) {
            setTimeout(() => startSimulationTimer(), 2000); // Small delay to let conversation start
          }
        }
      }
    };

    window.addEventListener('message', messageListener);
    document.addEventListener('click', clickListener, true); // Use capture phase
    
    // Add test button after a delay
    setTimeout(addTestButton, 2000);

    // Store references for cleanup
    (window as any).fspMessageListener = messageListener;
    (window as any).fspDomMonitor = domMonitor;
    (window as any).fspClickListener = clickListener;
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
      
      if ((window as any).fspClickListener) {
        document.removeEventListener('click', (window as any).fspClickListener, true);
        delete (window as any).fspClickListener;
      }
      
      // Clear DOM monitor
      if ((window as any).fspDomMonitor) {
        clearInterval((window as any).fspDomMonitor);
        delete (window as any).fspDomMonitor;
      }
      
      // Remove test button
      const testButton = document.getElementById('fsp-test-timer');
      if (testButton) {
        testButton.remove();
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