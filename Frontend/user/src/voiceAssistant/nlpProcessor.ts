import { intents } from './intents';

export function detectIntent(text: string) {
  const normalized = text
    .toLowerCase()
    .replace(/[.,?!;:"'()\[\]{}_+\-\/*\\|<>`~@#$%^&=]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let matchedAction: string | null = null;
  let matchedPhrase = '';

  const entries = Object.entries(intents) as [string, string[]][];
  const flattened = entries
    .flatMap(([action, phrases]) => phrases.map(phrase => ({ phrase: phrase.toLowerCase().trim(), action })))
    .sort((a, b) => b.phrase.length - a.phrase.length);

  for (const item of flattened) {
    if (normalized.includes(item.phrase)) {
      matchedAction = item.action;
      matchedPhrase = item.phrase;
      break;
    }
  }

  return { matchedAction, matchedPhrase, normalized };
}

export function executeIntent(
  matchedAction: string,
  navigate: (path: string) => void,
  speak: (msg: string, lang?: string, cb?: () => void) => void,
  language: string,
  locationPathname: string
) {
  const executeNavigation = (path: string, announcement: string) => {
    speak(announcement, language, () => {
      navigate(path);
    });
  };

  const executeScrollHighlight = (deptId: string, serviceName: string) => {
    const isAlreadyOnServices = locationPathname === '/services';
    const announcement = `Showing ${serviceName} services.`;
    
    if (isAlreadyOnServices) {
      speak(announcement, language, () => {
        highlightDeptCard(deptId);
      });
    } else {
      speak(announcement, language, () => {
        navigate('/services');
        setTimeout(() => {
          highlightDeptCard(deptId);
        }, 350);
      });
    }
  };

  const highlightDeptCard = (deptId: string) => {
    const el = document.getElementById(`dept-card-${deptId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('dept-card-highlight');
    if (el instanceof HTMLElement) {
      el.focus();
    }
    setTimeout(() => {
      el.classList.remove('dept-card-highlight');
    }, 3000);
  };

  switch (matchedAction) {
    case 'HOME':
      executeNavigation('/', 'Going to home page.');
      break;
    case 'SERVICES':
      executeNavigation('/services', 'Opening services page.');
      break;
    case 'PAY_BILLS':
      executeNavigation('/pay-bills', 'Opening payment portal.');
      break;
    case 'TRACK':
      executeNavigation('/track', 'Opening application tracker.');
      break;
    case 'HELP':
      executeNavigation('/help', 'Opening voice assistant.');
      break;
    case 'HISTORY':
      executeNavigation('/history', 'Opening history.');
      break;
    case 'ASSISTANT':
      executeNavigation('/assistant', 'Opening voice assistant.');
      break;
    case 'ELECTRICITY_SERVICES':
      executeScrollHighlight('eb', 'electricity');
      break;
    case 'WATER_SERVICES':
      executeScrollHighlight('water', 'water');
      break;
    case 'GAS_SERVICES':
      executeScrollHighlight('gas', 'gas');
      break;
    case 'MUNICIPAL_SERVICES':
      executeScrollHighlight('municipal', 'municipal');
      break;
    default:
      speak('Command not recognized. Please try again.', language);
      break;
  }
}
