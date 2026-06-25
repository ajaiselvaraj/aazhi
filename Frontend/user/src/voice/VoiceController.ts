import { VoiceAction } from './VoiceCommands';
import { voiceEngine } from './VoiceEngine';

class VoiceController {
  
  public handleAction(action: VoiceAction, lang: string, payload?: string) {
    console.log(`[VoiceController] Handling action: ${action}`, payload ? `with payload: ${payload}` : '');
    
    switch (action) {
      case VoiceAction.GO_HOME:
      case VoiceAction.OPEN_SERVICES:
      case VoiceAction.OPEN_COMPLAINTS:
      case VoiceAction.OPEN_FEEDBACK:
      case VoiceAction.OPEN_HISTORY:
      case VoiceAction.OPEN_DOCUMENTS:
      case VoiceAction.OPEN_BILLING:
      case VoiceAction.ASK_AI:
      case VoiceAction.BACK:
      case VoiceAction.EXIT:
      case VoiceAction.RESET_TIMER:
      case VoiceAction.EXTEND_SESSION:
        // Dispatch event for App.tsx to handle routing/state
        window.dispatchEvent(new CustomEvent('VOICE_ACTION', { detail: { action, payload } }));
        break;

      case VoiceAction.NEXT:
      case VoiceAction.PREVIOUS:
        this.handleScroll(action);
        break;

      case VoiceAction.SELECT_FIRST:
      case VoiceAction.SELECT_SECOND:
      case VoiceAction.SELECT_THIRD:
        this.handleSelect(action);
        break;

      case VoiceAction.INCREASE_FONT:
        document.documentElement.style.fontSize = '120%';
        break;

      case VoiceAction.DECREASE_FONT:
        document.documentElement.style.fontSize = '100%';
        break;

      case VoiceAction.READ_SCREEN:
        this.readScreen(lang);
        break;

      case VoiceAction.STOP_READING:
        voiceEngine.stopSpeaking();
        break;

      case VoiceAction.START_COMPLAINT:
        window.dispatchEvent(new CustomEvent('VOICE_ACTION', { detail: { action: VoiceAction.OPEN_COMPLAINTS } }));
        break;

      case VoiceAction.SUBMIT_FORM:
        const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        if (submitBtn) {
          submitBtn.click();
        } else {
          this.speakFeedback('No form found to submit', lang);
        }
        break;

      case VoiceAction.CLEAR_FORM:
        const forms = document.querySelectorAll('form');
        forms.forEach(f => f.reset());
        break;
    }
  }

  private handleScroll(action: VoiceAction) {
    const scrollAmount = window.innerHeight * 0.5;
    if (action === VoiceAction.NEXT) {
      window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    } else {
      window.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
    }
  }

  private handleSelect(action: VoiceAction) {
    // Basic heuristic: find all primary buttons or clickable cards
    const clickables = Array.from(document.querySelectorAll('button, a[href], [role="button"]')) as HTMLElement[];
    // Filter visible elements loosely
    const visibleClickables = clickables.filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    let index = 0;
    if (action === VoiceAction.SELECT_SECOND) index = 1;
    if (action === VoiceAction.SELECT_THIRD) index = 2;

    if (visibleClickables[index]) {
      visibleClickables[index].click();
    }
  }

  private readScreen(lang: string) {
    // Read main headings and readable content
    const headings = Array.from(document.querySelectorAll('h1, h2, h3'));
    let textToRead = headings.map(h => h.textContent).join('. ');
    
    if (!textToRead) {
      textToRead = document.body.innerText.substring(0, 500); // Read first 500 chars if no headings
    }
    
    if (textToRead) {
      voiceEngine.speak(textToRead, lang);
    }
  }

  private speakFeedback(text: string, lang: string) {
    voiceEngine.speak(text, lang);
  }
}

export const voiceController = new VoiceController();
