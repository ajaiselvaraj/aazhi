import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { voiceEngine } from '../src/voice/VoiceEngine';

const getRouteFriendlyName = (pathname: string): string => {
  if (pathname === '/home' || pathname === '/') return 'Dashboard';
  if (pathname === '/services') return 'Government Schemes and Services';
  if (pathname === '/complaints' || pathname === '/municipal') return 'Complaint Registration';
  if (pathname.includes('/track')) return 'Complaint Tracking';
  if (pathname === '/pay-bills' || pathname === '/power' || pathname === '/gas') return 'Bill Payments';
  if (pathname === '/assistant') return 'AI Assistant';
  if (pathname === '/history' || pathname === '/status') return 'Status History';
  if (pathname === '/certificates') return 'Certificates and Documents';
  if (pathname === '/participation') return 'Public Participation';
  if (pathname === '/whistleblower') return 'Whistleblower Portal';
  if (pathname === '/elderly-home') return 'Senior Citizen Dashboard';
  if (pathname === '/selection' || pathname === '/choose-language') return 'Language Selection';
  return 'Page';
};

const getSmartPageSummary = (pathname: string): string => {
  if (pathname === '/home' || pathname === '/') return 'You can view active complaints, notices, schemes and services.';
  if (pathname === '/services') return 'You can browse and apply for government services and schemes.';
  if (pathname === '/complaints' || pathname === '/municipal') return 'You can register a new complaint or track an existing complaint.';
  if (pathname.includes('/track')) return 'You can check the real-time status of your registered complaints.';
  if (pathname === '/pay-bills' || pathname === '/power' || pathname === '/gas') return 'You can pay your utility bills securely.';
  if (pathname === '/assistant') return 'You can ask the AI assistant for help regarding any civic service.';
  if (pathname === '/history' || pathname === '/status') return 'You can view the history of your past transactions and applications.';
  if (pathname === '/elderly-home') return 'You can access simplified services designed for senior citizens.';
  return 'Navigate using the tab key to explore this page.';
};

const getStatusExplanation = (status: string): string => {
  const lower = status.toLowerCase();
  if (lower.includes('forwarded to department')) {
    return 'Your complaint has been sent to the responsible department for review.';
  }
  if (lower.includes('under review')) {
    return 'Your request is currently being reviewed by officials.';
  }
  if (lower.includes('resolved')) {
    return 'Your complaint has been resolved successfully.';
  }
  if (lower.includes('rejected')) {
    return 'Your request has been rejected. Please check the remarks for details.';
  }
  return status;
};

export const useTalkBack = () => {
  const location = useLocation();
  const { i18n } = useTranslation();
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const lastPathnameRef = useRef<string>('');
  const isTalkBackEnabled = () => localStorage.getItem('kiosk_a11y') === 'true';

  const speak = (text: string) => {
    // voiceEngine maps standard language names like 'English', 'Hindi', 'Assamese'
    const langNames: Record<string, string> = {
      en: 'English',
      hi: 'Hindi',
      ta: 'Tamil',
      te: 'Telugu',
      kn: 'Kannada',
      ml: 'Malayalam',
      bn: 'Bengali',
      mr: 'Marathi',
      gu: 'Gujarati',
      pa: 'Punjabi',
      as: 'Assamese'
    };
    
    // Extract base language code (e.g., "en" from "en-US" or just "en")
    const baseLang = i18n.language ? i18n.language.split('-')[0] : 'en';
    const langName = langNames[baseLang] || 'English';
    
    if (isTalkBackEnabled()) {
      voiceEngine.speak(text, langName);
    }
  };

  // Announce route changes and handle custom events
  useEffect(() => {
    const announcePageContext = () => {
       const friendlyName = getRouteFriendlyName(location.pathname);
       const summary = getSmartPageSummary(location.pathname);
       speak(`You are now on ${friendlyName}. ${summary}`);
    };

    if (location.pathname !== lastPathnameRef.current) {
      lastPathnameRef.current = location.pathname;
      announcePageContext();
    }
    
    const handleForceSummary = () => {
       const summary = getSmartPageSummary(location.pathname);
       speak(summary);
    };

    window.addEventListener('announce_current_page', announcePageContext);
    window.addEventListener('force_summarize_page', handleForceSummary);

    return () => {
       window.removeEventListener('announce_current_page', announcePageContext);
       window.removeEventListener('force_summarize_page', handleForceSummary);
    };
  }, [location.pathname, i18n.language]);

  // Global focus listener
  useEffect(() => {
    const handleFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (!target || target === lastFocusedRef.current) return;
      
      // Skip if it's the document body or not really an interactive element without roles
      if (target.tagName === 'BODY' || target.tagName === 'HTML') return;

      lastFocusedRef.current = target;
      let announcement = '';

      const tagName = target.tagName.toLowerCase();
      const role = target.getAttribute('role');
      const ariaLabel = target.getAttribute('aria-label');
      const title = target.getAttribute('title');
      const innerText = target.innerText?.trim();
      const placeholder = target.getAttribute('placeholder');
      const ariaDescription = target.getAttribute('aria-description');
      const ariaDescribedBy = target.getAttribute('aria-describedby');

      let label = ariaLabel || title || innerText || placeholder || '';
      let guidance = ariaDescription || '';

      if (ariaDescribedBy) {
        const descElement = document.getElementById(ariaDescribedBy);
        if (descElement) guidance = descElement.innerText || guidance;
      }

      if (tagName === 'button' || role === 'button') {
        if (!label) {
            const inputVal = (target as HTMLInputElement).value;
            if (inputVal) label = inputVal;
        }
        announcement = `${label} button. Press Enter to activate.`;
      } else if (tagName === 'input' || tagName === 'textarea') {
        const type = target.getAttribute('type');
        
        if (type === 'checkbox' || type === 'radio') {
          const checked = (target as HTMLInputElement).checked;
          const state = checked ? 'Selected' : 'Not selected';
          const labels = (target as HTMLInputElement).labels;
          if (!label && labels && labels.length > 0) {
            label = labels[0].innerText;
          }
          announcement = `${label} ${type}. ${state}.`;
        } else {
          // text, email, number, etc.
          const labels = (target as HTMLInputElement).labels;
          if (!label && labels && labels.length > 0) {
            label = labels[0].innerText;
          }
          if (!guidance && placeholder) {
             guidance = `Enter ${placeholder}`;
          }
          announcement = `${label} field. ${guidance}`;
        }
      } else if (tagName === 'select' || role === 'listbox' || role === 'combobox') {
        const labels = (target as HTMLSelectElement).labels;
        if (!label && labels && labels.length > 0) {
          label = labels[0].innerText;
        }
        announcement = `${label} dropdown. Use arrow keys to select an option.`;
      } else if (tagName === 'tr' || role === 'row') {
        // Table row logic
        // Read cells
        const cells = Array.from(target.querySelectorAll('td, th')).map(c => (c as HTMLElement).innerText).filter(Boolean);
        if (cells.length > 0) {
          // Process cells, replace technical status if found
          const processedCells = cells.map(getStatusExplanation);
          announcement = processedCells.join('. ');
        }
      } else if (role === 'alert' || role === 'status' || target.getAttribute('aria-live')) {
        // Explicit alerts/notices
        announcement = `Important Notice. ${label}`;
      } else if (target.hasAttribute('tabindex')) {
        // Generic focusable
        if (label) {
           announcement = `${label}.`;
        }
      }

      if (announcement) {
        speak(announcement);
      }
    };

    document.addEventListener('focusin', handleFocus);
    return () => {
      document.removeEventListener('focusin', handleFocus);
    };
  }, [i18n.language]);

  return null;
};
