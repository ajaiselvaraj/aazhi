// Utility to scan the DOM for untranslated English text
// Useful for ensuring 100% translation coverage.
// You can import this or run it in the browser console.

export function scanDOMForEnglishText(): void {
  const allElements = document.querySelectorAll('*');
  let untranslatedFound = false;

  // Basic regex to detect English letters (A-Z, a-z)
  // We ignore purely numeric or symbol-only strings, but if it has letters, we flag it.
  const englishRegex = /[a-zA-Z]/;

  // Some common classes or elements to skip (like font-icons, scripts, styles)
  const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'SVG', 'PATH'];
  
  // Whitelisted words that might naturally appear even in Assamese mode
  // e.g., "SMS", "OTP", "ID", "PIN", etc.
  const whitelist = ['sms', 'otp', 'id', 'pin', 'qr', 'url', 'api'];

  console.groupCollapsed('🔍 DOM English Text Scan Results');

  allElements.forEach((el) => {
    if (skipTags.includes(el.tagName)) return;

    // We only care about direct text node children to avoid duplicate logging
    Array.from(el.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim() || '';
        
        if (text && englishRegex.test(text)) {
          // Check if it's entirely composed of whitelisted words, numbers, and symbols
          const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
          const isWhitelisted = words.length > 0 && words.every(word => whitelist.includes(word));
          
          if (!isWhitelisted) {
            console.warn('Untranslated text found:', text, el);
            untranslatedFound = true;
          }
        }
      }
    });

    // Also check placeholders
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      if (el.placeholder && englishRegex.test(el.placeholder)) {
        console.warn('Untranslated placeholder found:', el.placeholder, el);
        untranslatedFound = true;
      }
    }
  });

  if (!untranslatedFound) {
    console.log('✅ No untranslated English text found. 100% Coverage achieved.');
  } else {
    console.warn('❌ Untranslated English text detected! Please review the warnings above.');
  }

  console.groupEnd();
}

// Attach to window for easy debugging from console
if (typeof window !== 'undefined') {
  (window as any).scanDOMForEnglishText = scanDOMForEnglishText;
}
