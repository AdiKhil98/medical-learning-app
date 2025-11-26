// Voice integration service for custom microphone interface with Voiceflow
import { VoiceflowController } from './voiceflowIntegration';
import { logger } from './logger';

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
      logger.info('🎤 Initializing voice interaction service...');
      
      // Initialize Voiceflow widget (hidden)
      logger.info('📦 Loading Voiceflow widget...');
      const voiceflowReady = await this.voiceflowController.loadWidget();
      if (!voiceflowReady) {
        logger.error('❌ Voiceflow widget failed to load');
        throw new Error('Failed to initialize Voiceflow');
      }
      logger.info('✅ Voiceflow widget loaded successfully');

      // Initialize speech recognition
      logger.info('🎙️ Initializing speech recognition...');
      await this.initializeSpeechRecognition();
      logger.info('✅ Speech recognition initialized');
      
      // Start the simulation in Voiceflow
      logger.info('🚀 Starting simulation in Voiceflow...');
      const simulationStarted = await this.voiceflowController.startSimulation();
      if (simulationStarted) {
        logger.info('✅ Simulation started successfully');
      } else {
        logger.info('⚠️ Simulation start returned false');
      }
      
      this.updateState({ 
        isInitialized: true, 
        error: null 
      });
      
      logger.info('✅ Voice interaction service initialized successfully');
      return true;
    } catch (error) {
      logger.error('❌ Failed to initialize voice interaction:', error);
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
    logger.info('🎙️ Checking microphone permissions...');
    
    try {
      // Check current permission status
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      logger.info('📊 Current microphone permission status:', permission.state);
      
      if (permission.state === 'denied') {
        throw new Error('Microphone permission was denied. Please enable microphone access in your browser settings and refresh the page.');
      }
      
      // Request microphone access
      logger.info('🎙️ Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      logger.info('✅ Microphone permission granted and working');
      
      // Stop the stream immediately as we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
    } catch (error) {
      logger.error('❌ Microphone permission issue:', error);
      
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
      logger.info('🎤 Speech recognition started');
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
        logger.info('🗣️ Final transcript:', finalTranscript);
        this.sendMessageToVoiceflow(finalTranscript);
      }

      this.updateState({ 
        currentMessage: finalTranscript || interimTranscript 
      });
    };

    this.recognition.onerror = (event: any) => {
      logger.error('❌ Speech recognition error:', event.error);
      this.updateState({ 
        isRecording: false,
        isProcessing: false,
        error: `Speech recognition error: ${event.error}` 
      });
    };

    this.recognition.onend = () => {
      logger.info('🎤 Speech recognition ended');
      this.updateState({ isRecording: false });
    };
  }

  // Setup listener for Voiceflow messages
  private setupVoiceflowMessageListener(): void {
    this.messageListener = (event: MessageEvent) => {
      logger.info('📨 Received window message:', {
        origin: event.origin,
        data: event.data,
        type: typeof event.data
      });
      
      if (event.data && typeof event.data === 'object') {
        // Listen for Voiceflow responses - expanded patterns
        if (event.data.type === 'voiceflow:response' || 
            event.data.type === 'voiceflow:message' ||
            event.data.type === 'widget:message' ||
            event.data.type === 'chat:message' ||
            (event.data.source === 'voiceflow' && event.data.message) ||
            event.data.action === 'response') {
          
          const message = event.data.message || event.data.text || event.data.payload || event.data.content;
          if (message && typeof message === 'string') {
            logger.info('🤖 Received Voiceflow window message:', message);
            this.handleVoiceflowResponse(message);
          }
        }
        
        // Also check for any widget-related events with text content
        if (event.data.type && event.data.type.includes('widget') || 
            event.data.type && event.data.type.includes('chat')) {
          logger.info('🔍 Widget/Chat event:', event.data);
        }
      }
    };

    window.addEventListener('message', this.messageListener);
    logger.info('👂 Window message listener attached');
    
    // Also monitor DOM changes for Voiceflow responses
    this.monitorVoiceflowDOM();
  }

  // Monitor DOM for Voiceflow conversation updates
  private monitorVoiceflowDOM(): void {
    const checkForResponses = () => {
      // Look for new messages in hidden Voiceflow widget (reduced logging)
      const messageSelectors = [
        '.vfrc-message--assistant',
        '.vf-message--bot',
        '[data-testid="assistant-message"]',
        '.assistant-message',
        '.bot-message',
        '.vfrc-message',
        '.vfrc-chat-message',
        '[class*="message"]',
        '[class*="response"]',
        '[class*="assistant"]',
        '[class*="bot"]',
        'div[role="region"] p',
        'div[role="region"] span',
        '.vfrc-text',
        '.vfrc-system-response'
      ];

      let foundElements = 0;
      for (const selector of messageSelectors) {
        const messages = document.querySelectorAll(selector);
        foundElements += messages.length;
        
        // Only log if elements are found
        if (messages.length > 0) {
          logger.info(`🔍 Found ${messages.length} elements for selector: ${selector}`);
        }
        
        const latestMessage = messages[messages.length - 1];
        
        if (latestMessage && latestMessage.textContent) {
          const messageText = latestMessage.textContent.trim();
          logger.info(`📝 Latest message text: "${messageText}"`);
          logger.info(`📚 Current history:`, this.state.conversationHistory);
          
          if (messageText && !this.state.conversationHistory.includes(messageText)) {
            logger.info('🤖 Found new DOM response:', messageText);
            this.handleVoiceflowResponse(messageText);
            break;
          } else if (messageText) {
            logger.info('⏭️ Message already in history, skipping');
          }
        }
      }
      
      if (foundElements === 0) {
        // Only log this occasionally to reduce spam
        if (Math.random() < 0.1) {
          logger.info('❌ No Voiceflow message elements found in DOM');
        }
        
        // Fallback: check for ANY new text content in the page
        const allElements = document.querySelectorAll('*');
        let newTextFound = false;
        
        allElements.forEach(el => {
          if (el.textContent && el.textContent.trim().length > 10) {
            const text = el.textContent.trim();
            // Look for text that might be a Voiceflow response
            if (!this.state.conversationHistory.some(msg => msg.includes(text)) && 
                text !== 'Zum Sprechen tippen' && 
                text !== 'AKTIV' && 
                text !== 'Test Audio' &&
                text !== 'Simulation beenden' &&
                !text.includes('Checking DOM') &&
                !text.includes('Found 0 elements')) {
              
              logger.info('🔍 Found potential new text:', text.substring(0, 100));
              
              // Check if this could be a Voiceflow response
              if (text.length > 20 && text.length < 500) {
                logger.info('🤖 Treating as potential Voiceflow response:', text);
                this.handleVoiceflowResponse(text);
                newTextFound = true;
              }
            }
          }
        });
        
        if (!newTextFound) {
          logger.info('🔍 No new potential response text found in DOM');
        }
      }
    };

    // Check periodically - slower interval to reduce console spam
    logger.info('⏰ Starting DOM monitoring with 3-second intervals');
    setInterval(checkForResponses, 3000);
  }

  // Send message to Voiceflow
  private async sendMessageToVoiceflow(message: string): Promise<void> {
    try {
      logger.info('📤 Sending message to Voiceflow:', message);
      logger.info('🔧 Voiceflow object available:', !!window.voiceflow);
      logger.info('🔧 Voiceflow.chat available:', !!(window.voiceflow && window.voiceflow.chat));
      
      this.updateState({ 
        isProcessing: true,
        currentMessage: message,
        conversationHistory: [...this.state.conversationHistory, `User: ${message}`]
      });

      // Try different methods to send message to Voiceflow
      if (window.voiceflow && window.voiceflow.chat) {
        logger.info('🔧 Available methods:', {
          interact: !!window.voiceflow.chat.interact,
          send: !!window.voiceflow.chat.send,
          sendMessage: !!window.voiceflow.chat.sendMessage
        });
        
        if (window.voiceflow.chat.interact) {
          logger.info('📡 Using interact method');
          const response = await window.voiceflow.chat.interact({
            type: 'text',
            payload: message
          });
          logger.info('📡 Full interact response:', response);
          
          // Try to extract text from different response formats
          if (response) {
            if (typeof response === 'string') {
              logger.info('🎯 Direct string response:', response);
              this.handleVoiceflowResponse(response);
            } else if (response.text) {
              logger.info('🎯 Response.text:', response.text);
              this.handleVoiceflowResponse(response.text);
            } else if (response.message) {
              logger.info('🎯 Response.message:', response.message);
              this.handleVoiceflowResponse(response.message);
            } else if (response.payload) {
              logger.info('🎯 Response.payload:', response.payload);
              this.handleVoiceflowResponse(response.payload);
            } else if (Array.isArray(response) && response.length > 0) {
              logger.info('🎯 Array response:', response[0]);
              const firstResponse = response[0];
              if (firstResponse.text) {
                this.handleVoiceflowResponse(firstResponse.text);
              } else if (firstResponse.message) {
                this.handleVoiceflowResponse(firstResponse.message);
              }
            }
          }
        } else if (window.voiceflow.chat.send) {
          logger.info('📡 Using send method');
          const response = await window.voiceflow.chat.send({
            type: 'text',
            payload: message
          });
          logger.info('📡 Send response:', response);
        } else if (window.voiceflow.chat.sendMessage) {
          logger.info('📡 Using sendMessage method');
          const response = await window.voiceflow.chat.sendMessage(message);
          logger.info('📡 SendMessage response:', response);
        }
        
        // Try to manually trigger a response check after sending
        setTimeout(() => {
          logger.info('🔄 Manually checking for responses after message send...');
          this.checkForManualResponse();
        }, 2000);
      } else {
        logger.info('❌ Voiceflow not available, trying DOM fallback');
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
      logger.error('❌ Error sending message to Voiceflow:', error);
      this.updateState({ 
        isProcessing: false,
        error: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  }

  // Handle Voiceflow response
  private handleVoiceflowResponse(message: string): void {
    logger.info('🤖 Processing Voiceflow response:', message);
    
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
    logger.info('🔊 speakMessage called with:', message);
    
    if (!this.speechSynthesis) {
      logger.error('❌ Speech synthesis not available');
      return;
    }

    try {
      // Cancel any ongoing speech
      this.speechSynthesis.cancel();
      logger.info('🔇 Cancelled any existing speech');

      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'de-DE'; // German
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1.0; // Max volume
      
      logger.info('🎛️ Speech settings:', {
        lang: utterance.lang,
        rate: utterance.rate,
        pitch: utterance.pitch,
        volume: utterance.volume
      });

      // Find a German voice if available
      const voices = this.speechSynthesis.getVoices();
      logger.info('🎤 Available voices:', voices.length);
      
      const germanVoice = voices.find(voice => voice.lang.startsWith('de'));
      if (germanVoice) {
        utterance.voice = germanVoice;
        logger.info('🇩🇪 Using German voice:', germanVoice.name);
      } else {
        logger.info('⚠️ No German voice found, using default');
      }

      utterance.onstart = () => {
        logger.info('🔊 Speech started');
      };

      utterance.onend = () => {
        logger.info('🔊 Speech finished');
      };

      utterance.onerror = (error) => {
        logger.error('❌ Speech synthesis error:', error);
      };

      logger.info('🎯 About to speak message...');
      this.speechSynthesis.speak(utterance);
      
      // Double-check if speech is working
      setTimeout(() => {
        logger.info('📊 Speech synthesis status:', {
          speaking: this.speechSynthesis.speaking,
          pending: this.speechSynthesis.pending,
          paused: this.speechSynthesis.paused
        });
      }, 100);
      
    } catch (error) {
      logger.error('❌ Error in speakMessage:', error);
    }
  }

  // Test function to manually trigger speech synthesis
  testSpeech(): void {
    logger.info('🧪 Testing speech synthesis directly...');
    this.speakMessage('Dies ist ein Test der Sprachsynthese');
  }

  // Manual check for responses in Voiceflow widget
  private checkForManualResponse(): void {
    logger.info('🔄 Manual response check - looking for hidden Voiceflow content...');
    
    // Check all iframes for Voiceflow content
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe, index) => {
      try {
        logger.info(`🔍 Checking iframe ${index}:`, iframe.src);
        if (iframe.contentDocument) {
          const iframeDoc = iframe.contentDocument;
          const textContent = iframeDoc.body?.textContent || '';
          if (textContent.length > 10) {
            logger.info(`📄 Iframe ${index} content:`, textContent.substring(0, 200));
          }
        }
      } catch (e) {
        logger.info(`🚫 Cannot access iframe ${index} content (CORS)`, e.message);
      }
    });
    
    // Also check for any newly created elements
    const recentElements = document.querySelectorAll('[class*="vf"], [id*="vf"], [class*="chat"], [class*="widget"]');
    logger.info(`🔍 Found ${recentElements.length} potential Voiceflow elements`);
    
    recentElements.forEach((el, index) => {
      if (el.textContent && el.textContent.trim().length > 5) {
        logger.info(`📝 Element ${index} text:`, el.textContent.trim().substring(0, 100));
      }
    });
  }

  // Start recording
  startRecording(): void {
    if (!this.state.isInitialized || !this.recognition) {
      logger.warn('⚠️ Voice interaction not initialized');
      return;
    }

    if (this.state.isRecording) {
      logger.warn('⚠️ Already recording');
      return;
    }

    try {
      this.recognition.start();
      logger.info('🎤 Started recording');
    } catch (error) {
      logger.error('❌ Error starting recording:', error);
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
      logger.info('🎤 Stopped recording');
    } catch (error) {
      logger.error('❌ Error stopping recording:', error);
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