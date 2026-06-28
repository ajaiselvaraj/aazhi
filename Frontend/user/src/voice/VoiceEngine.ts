// Add type declarations for SpeechRecognition since it might not be in standard TS DOM
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export type VoiceEngineStatus = 'idle' | 'listening' | 'processing' | 'error';

export class VoiceEngine {
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening: boolean = false;
  
  public onResult: (text: string, confidence: number, isFinal: boolean) => void = () => {};
  public onError: (error: string) => void = () => {};
  public onStatusChange: (status: VoiceEngineStatus) => void = () => {};

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 5;
        
        this.recognition.onstart = () => {
          this.isListening = true;
          this.onStatusChange('listening');
        };

        this.recognition.onresult = (event: any) => {
          this.onStatusChange('processing');
          
          let finalTranscript = '';
          let interimTranscript = '';
          let highestConfidence = 0;
          let isFinal = false;

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
              isFinal = true;
              highestConfidence = event.results[i][0].confidence;
            } else {
              interimTranscript += event.results[i][0].transcript;
              // Provide a default confidence for interim if available
              highestConfidence = event.results[i][0].confidence || 0;
            }
          }
          
          const transcript = isFinal ? finalTranscript : interimTranscript;
          if (transcript) {
            this.onResult(transcript, highestConfidence, isFinal);
          }
          
          if (isFinal) {
             this.onStatusChange('listening');
          }
        };

        this.recognition.onerror = (event: any) => {
          this.isListening = false;
          let errorMessage = 'Recognition failed';
          if (event.error === 'not-allowed') {
            errorMessage = 'Microphone permission denied';
          } else if (event.error === 'no-speech') {
            errorMessage = 'No speech detected';
          } else if (event.error === 'network') {
            errorMessage = 'Network error';
          }
          this.onError(errorMessage);
          this.onStatusChange('error');
          
          setTimeout(() => {
            if (!this.isListening) {
              this.onStatusChange('idle');
            }
          }, 3000);
        };

        this.recognition.onend = () => {
          if (this.isListening) {
             // Restart for continuous listening
             try {
                this.recognition.start();
             } catch (e) {
                this.isListening = false;
                this.onStatusChange('idle');
             }
          } else {
             this.onStatusChange('idle');
          }
        };
      }
      
      this.synthesis = window.speechSynthesis;
    }
  }

  public isSupported(): boolean {
    return this.recognition !== null;
  }

  public setLanguage(langCode: string) {
    if (this.recognition) {
      // Map App language names to BCP 47
      const langMap: Record<string, string> = {
        'English': 'en-IN',
        'Tamil': 'ta-IN',
        'Hindi': 'hi-IN',
        'Telugu': 'te-IN',
        'Kannada': 'kn-IN',
        'Malayalam': 'ml-IN',
        'Bengali': 'bn-IN',
        'Marathi': 'mr-IN',
        'Gujarati': 'gu-IN',
        'Punjabi': 'pa-IN',
        'Assamese': 'as-IN'
      };
      const newLang = langMap[langCode] || 'en-IN';
      if (this.recognition.lang !== newLang) {
        this.recognition.lang = newLang;
        // If the mic is currently on, we must forcefully stop it 
        // so that the onend event automatically restarts it with the NEW language dictionary!
        if (this.isListening) {
          this.recognition.stop();
        }
      }
    }
  }

  public async start() {
    if (!this.recognition) {
      this.onError('Voice Navigation Not Supported');
      return;
    }
    if (this.isListening) return;
    
    // Native browser recognition start

    try {
      this.recognition.start();
    } catch (e: any) {
      if (e.message && e.message.includes('already started')) {
        this.isListening = true;
        this.onStatusChange('listening');
        return;
      }
      this.onError(e.message || 'Failed to start recognition');
    }
  }

  public stop() {
    if (this.recognition && this.isListening) {
      this.isListening = false;
      this.recognition.stop();
      this.onStatusChange('idle');
    }
  }

  public speak(text: string, langCode: string = 'English') {
    if (!this.synthesis) return;
    this.synthesis.cancel(); // Cancel any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    
    const langMap: Record<string, string> = {
      'English': 'en-IN',
      'Tamil': 'ta-IN',
      'Hindi': 'hi-IN',
      'Telugu': 'te-IN',
      'Kannada': 'kn-IN',
      'Malayalam': 'ml-IN',
      'Bengali': 'bn-IN',
      'Marathi': 'mr-IN',
      'Gujarati': 'gu-IN',
      'Punjabi': 'pa-IN',
      'Assamese': 'as-IN'
    };
    utterance.lang = langMap[langCode] || 'en-IN';
    this.synthesis.speak(utterance);
  }

  public stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }
}

// Singleton instance
export const voiceEngine = new VoiceEngine();
