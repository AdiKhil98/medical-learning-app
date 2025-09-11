// Voice integration service for custom microphone interface with Voiceflow
import { VoiceflowController } from './voiceflowIntegration';

export interface VoiceInteractionState {
  isInitialized: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  currentMessage: string;
  conversationHistory: string[];
  error: string | null;
}

export class VoiceInteractionService {
  private voiceflowController: VoiceflowController;
  private state: VoiceInteractionState;
  private stateListeners: Array<(state: VoiceInteractionState) => void> = [];
  private recognition: any = null;
  private speechSynthesis: SpeechSynthesis | null = null;
  private messageListener: ((event: MessageEvent) => void) | null = null;

  constructor(voiceflowController: VoiceflowController) {
    this.voiceflowController = voiceflowController;
    this.state = {
      isInitialized: false,
      isRecording: false,
      isProcessing: false,
      currentMessage: '',
      conversationHistory: [],
      error: null,
    };
    
    if (typeof window !== 'undefined') {
      this.speechSynthesis = window.speechSynthesis;
      this.setupVoiceflowMessageListener();
    }
  }

  // Initialize the voice interaction system
  async initialize(): Promise<boolean> {
    try {
      console.log('🎤 Initializing voice interaction service...');
      
      // Initialize Voiceflow widget (hidden)
      console.log('📦 Loading Voiceflow widget...');
      const voiceflowReady = await this.voiceflowController.loadWidget();
      if (!voiceflowReady) {
        console.error('❌ Voiceflow widget failed to load');
        throw new Error('Failed to initialize Voiceflow');
      }
      console.log('✅ Voiceflow widget loaded successfully');

      // Initialize speech recognition
      console.log('🎙️ Initializing speech recognition...');
      await this.initializeSpeechRecognition();
      console.log('✅ Speech recognition initialized');
      
      // Start the simulation in Voiceflow
      console.log('🚀 Starting simulation in Voiceflow...');
      const simulationStarted = await this.voiceflowController.startSimulation();
      if (simulationStarted) {
        console.log('✅ Simulation started successfully');
      } else {
        console.log('⚠️ Simulation start returned false');
      }
      
      this.updateState({ 
        isInitialized: true, 
        error: null 
      });
      
      console.log('✅ Voice interaction service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize voice interaction:', error);
      this.updateState({ 
        error: `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
      return false;
    }
  }

  // Initialize speech recognition
  private async initializeSpeechRecognition(): Promise<void> {
    if (typeof window === 'undefined') return;

    // First, check and request microphone permission
    console.log('🎙️ Checking microphone permissions...');
    
    try {
      // Check current permission status
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      console.log('📊 Current microphone permission status:', permission.state);
      
      if (permission.state === 'denied') {
        throw new Error('Microphone permission was denied. Please enable microphone access in your browser settings and refresh the page.');
      }
      
      // Request microphone access
      console.log('🎙️ Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone permission granted and working');
      
      // Stop the stream immediately as we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
    } catch (error) {
      console.error('❌ Microphone permission issue:', error);
      
      if (error.name === 'NotAllowedError') {
        throw new Error('Microphone access was denied. Please click the microphone icon in your browser\'s address bar and allow microphone access, then try again.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No microphone found. Please ensure you have a microphone connected.');
      } else {
        throw new Error(`Microphone access failed: ${error.message}`);
      }
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('Speech recognition not supported in this browser');
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.lang = 'de-DE'; // German for medical context
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      this.updateState({ isRecording: true });
    };

    this.recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        console.log('🗣️ Final transcript:', finalTranscript);
        this.sendMessageToVoiceflow(finalTranscript);
      }

      this.updateState({ 
        currentMessage: finalTranscript || interimTranscript 
      });
    };

    this.recognition.onerror = (event: any) => {
      console.error('❌ Speech recognition error:', event.error);
      this.updateState({ 
        isRecording: false,
        isProcessing: false,
        error: `Speech recognition error: ${event.error}` 
      });
    };

    this.recognition.onend = () => {
      console.log('🎤 Speech recognition ended');
      this.updateState({ isRecording: false });
    };
  }

  // Setup listener for Voiceflow messages
  private setupVoiceflowMessageListener(): void {
    this.messageListener = (event: MessageEvent) => {
      if (event.data && typeof event.data === 'object') {
        // Listen for Voiceflow responses
        if (event.data.type === 'voiceflow:response' || 
            event.data.type === 'voiceflow:message' ||
            (event.data.source === 'voiceflow' && event.data.message)) {
          
          const message = event.data.message || event.data.text || event.data.payload;
          if (message && typeof message === 'string') {
            console.log('🤖 Received Voiceflow response:', message);
            this.handleVoiceflowResponse(message);
          }
        }
      }
    };

    window.addEventListener('message', this.messageListener);
    
    // Also monitor DOM changes for Voiceflow responses
    this.monitorVoiceflowDOM();
  }

  // Monitor DOM for Voiceflow conversation updates
  private monitorVoiceflowDOM(): void {
    const checkForResponses = () => {
      // Look for new messages in hidden Voiceflow widget
      const messageSelectors = [
        '.vfrc-message--assistant',
        '.vf-message--bot',
        '[data-testid="assistant-message"]',
        '.assistant-message',
        '.bot-message'
      ];

      for (const selector of messageSelectors) {
        const messages = document.querySelectorAll(selector);
        const latestMessage = messages[messages.length - 1];
        
        if (latestMessage && latestMessage.textContent) {
          const messageText = latestMessage.textContent.trim();
          if (messageText && !this.state.conversationHistory.includes(messageText)) {
            console.log('🤖 Found new DOM response:', messageText);
            this.handleVoiceflowResponse(messageText);
            break;
          }
        }
      }
    };

    // Check periodically
    setInterval(checkForResponses, 1000);
  }

  // Send message to Voiceflow
  private async sendMessageToVoiceflow(message: string): Promise<void> {
    try {
      console.log('📤 Sending message to Voiceflow:', message);
      this.updateState({ 
        isProcessing: true,
        currentMessage: message,
        conversationHistory: [...this.state.conversationHistory, `User: ${message}`]
      });

      // Try different methods to send message to Voiceflow
      if (window.voiceflow && window.voiceflow.chat) {
        if (window.voiceflow.chat.interact) {
          await window.voiceflow.chat.interact({
            type: 'text',
            payload: message
          });
        } else if (window.voiceflow.chat.send) {
          await window.voiceflow.chat.send({
            type: 'text',
            payload: message
          });
        } else if (window.voiceflow.chat.sendMessage) {
          await window.voiceflow.chat.sendMessage(message);
        }
      }

      // Fallback: try to interact with hidden DOM elements
      setTimeout(() => {
        const inputSelectors = [
          'input[type="text"]',
          'textarea',
          '[contenteditable="true"]',
          '.vfrc-input',
          '.chat-input'
        ];

        for (const selector of inputSelectors) {
          const input = document.querySelector(selector) as HTMLInputElement;
          if (input) {
            input.value = message;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Try to find and click send button
            const sendSelectors = [
              'button[type="submit"]',
              '.send-button',
              '.vfrc-send',
              'button:contains("Send")',
              '[aria-label*="send"]'
            ];

            for (const sendSelector of sendSelectors) {
              const sendButton = document.querySelector(sendSelector) as HTMLElement;
              if (sendButton) {
                sendButton.click();
                break;
              }
            }
            break;
          }
        }
      }, 100);

    } catch (error) {
      console.error('❌ Error sending message to Voiceflow:', error);
      this.updateState({ 
        isProcessing: false,
        error: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  }

  // Handle Voiceflow response
  private handleVoiceflowResponse(message: string): void {
    console.log('🤖 Processing Voiceflow response:', message);
    
    this.updateState({
      isProcessing: false,
      conversationHistory: [...this.state.conversationHistory, `Assistant: ${message}`],
      currentMessage: message
    });

    // Speak the response
    this.speakMessage(message);
  }

  // Text-to-speech for responses
  private speakMessage(message: string): void {
    console.log('🔊 speakMessage called with:', message);
    
    if (!this.speechSynthesis) {
      console.error('❌ Speech synthesis not available');
      return;
    }

    try {
      // Cancel any ongoing speech
      this.speechSynthesis.cancel();
      console.log('🔇 Cancelled any existing speech');

      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'de-DE'; // German
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1.0; // Max volume
      
      console.log('🎛️ Speech settings:', {
        lang: utterance.lang,
        rate: utterance.rate,
        pitch: utterance.pitch,
        volume: utterance.volume
      });

      // Find a German voice if available
      const voices = this.speechSynthesis.getVoices();
      console.log('🎤 Available voices:', voices.length);
      
      const germanVoice = voices.find(voice => voice.lang.startsWith('de'));
      if (germanVoice) {
        utterance.voice = germanVoice;
        console.log('🇩🇪 Using German voice:', germanVoice.name);
      } else {
        console.log('⚠️ No German voice found, using default');
      }

      utterance.onstart = () => {
        console.log('🔊 Speech started');
      };

      utterance.onend = () => {
        console.log('🔊 Speech finished');
      };

      utterance.onerror = (error) => {
        console.error('❌ Speech synthesis error:', error);
      };

      console.log('🎯 About to speak message...');
      this.speechSynthesis.speak(utterance);
      
      // Double-check if speech is working
      setTimeout(() => {
        console.log('📊 Speech synthesis status:', {
          speaking: this.speechSynthesis.speaking,
          pending: this.speechSynthesis.pending,
          paused: this.speechSynthesis.paused
        });
      }, 100);
      
    } catch (error) {
      console.error('❌ Error in speakMessage:', error);
    }
  }

  // Start recording
  startRecording(): void {
    if (!this.state.isInitialized || !this.recognition) {
      console.warn('⚠️ Voice interaction not initialized');
      return;
    }

    if (this.state.isRecording) {
      console.warn('⚠️ Already recording');
      return;
    }

    try {
      this.recognition.start();
      console.log('🎤 Started recording');
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      this.updateState({ 
        error: `Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  }

  // Stop recording
  stopRecording(): void {
    if (!this.recognition || !this.state.isRecording) {
      return;
    }

    try {
      this.recognition.stop();
      console.log('🎤 Stopped recording');
    } catch (error) {
      console.error('❌ Error stopping recording:', error);
    }
  }

  // Get current state
  getState(): VoiceInteractionState {
    return { ...this.state };
  }

  // Subscribe to state changes
  subscribe(listener: (state: VoiceInteractionState) => void): () => void {
    this.stateListeners.push(listener);
    return () => {
      const index = this.stateListeners.indexOf(listener);
      if (index > -1) {
        this.stateListeners.splice(index, 1);
      }
    };
  }

  // Update state and notify listeners
  private updateState(updates: Partial<VoiceInteractionState>): void {
    this.state = { ...this.state, ...updates };
    this.stateListeners.forEach(listener => listener(this.state));
  }

  // Cleanup
  destroy(): void {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }

    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
    }

    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
      this.messageListener = null;
    }

    this.voiceflowController.destroy();
    this.stateListeners = [];
  }
}