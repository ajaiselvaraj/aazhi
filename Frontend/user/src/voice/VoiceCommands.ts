export enum VoiceAction {
  GO_HOME = 'GO_HOME',
  OPEN_SERVICES = 'OPEN_SERVICES',
  OPEN_SCHEMES = 'OPEN_SCHEMES',
  OPEN_HELP = 'OPEN_HELP',
  OPEN_COMPLAINTS = 'OPEN_COMPLAINTS',
  OPEN_FEEDBACK = 'OPEN_FEEDBACK',
  OPEN_BILLING = 'OPEN_BILLING',
  ASK_AI = 'ASK_AI',
  BACK = 'BACK',
  NEXT = 'NEXT',
  PREVIOUS = 'PREVIOUS',
  EXIT = 'EXIT',
  SELECT_FIRST = 'SELECT_FIRST',
  SELECT_SECOND = 'SELECT_SECOND',
  SELECT_THIRD = 'SELECT_THIRD',
  INCREASE_FONT = 'INCREASE_FONT',
  DECREASE_FONT = 'DECREASE_FONT',
  READ_SCREEN = 'READ_SCREEN',
  STOP_READING = 'STOP_READING',
  START_COMPLAINT = 'START_COMPLAINT',
  SUBMIT_FORM = 'SUBMIT_FORM',
  CLEAR_FORM = 'CLEAR_FORM',
  RESET_TIMER = 'RESET_TIMER',
  EXTEND_SESSION = 'EXTEND_SESSION',
  OPEN_HISTORY = 'OPEN_HISTORY',
  OPEN_DOCUMENTS = 'OPEN_DOCUMENTS',
  OPEN_TRACKER = 'OPEN_TRACKER',
  OPEN_WHISTLEBLOWER = 'OPEN_WHISTLEBLOWER',
  OPEN_AI_ASSISTANT = 'OPEN_AI_ASSISTANT',
  CONFIRM_YES = 'CONFIRM_YES',
  CONFIRM_NO = 'CONFIRM_NO'
}

type CommandMap = {
  [lang in string]: { [phrase: string]: VoiceAction };
};

export const VOICE_COMMANDS: CommandMap = {
  English: {
    'go home': VoiceAction.GO_HOME,
    'open services': VoiceAction.OPEN_SERVICES,
    'open complaints': VoiceAction.OPEN_COMPLAINTS,
    'open feedback': VoiceAction.OPEN_FEEDBACK,
    'back': VoiceAction.BACK,
    'next': VoiceAction.NEXT,
    'previous': VoiceAction.PREVIOUS,
    'exit': VoiceAction.EXIT,
    'select first': VoiceAction.SELECT_FIRST,
    'select second': VoiceAction.SELECT_SECOND,
    'select third': VoiceAction.SELECT_THIRD,
    'increase font': VoiceAction.INCREASE_FONT,
    'decrease font': VoiceAction.DECREASE_FONT,
    'read screen': VoiceAction.READ_SCREEN,
    'stop reading': VoiceAction.STOP_READING,
    'start complaint': VoiceAction.START_COMPLAINT,
    'submit form': VoiceAction.SUBMIT_FORM,
    'clear form': VoiceAction.CLEAR_FORM,
    'reset timer': VoiceAction.RESET_TIMER,
    'extend session': VoiceAction.EXTEND_SESSION
  },
  Tamil: {
    'முகப்புக்குச் செல்': VoiceAction.GO_HOME,
    'சேவைகளைத் திற': VoiceAction.OPEN_SERVICES,
    'புகார்களைத் திற': VoiceAction.OPEN_COMPLAINTS,
    'கருத்துக்களைத் திற': VoiceAction.OPEN_FEEDBACK,
    'பின்னால்': VoiceAction.BACK,
    'அடுத்தது': VoiceAction.NEXT,
    'முந்தையது': VoiceAction.PREVIOUS,
    'வெளியேறு': VoiceAction.EXIT,
    'முதலாவதைத் தேர்ந்தெடு': VoiceAction.SELECT_FIRST,
    'இரண்டாவதைத் தேர்ந்தெடு': VoiceAction.SELECT_SECOND,
    'மூன்றாவதைத் தேர்ந்தெடு': VoiceAction.SELECT_THIRD,
    'எழுத்துருவை அதிகரி': VoiceAction.INCREASE_FONT,
    'எழுத்துருவைக் குறை': VoiceAction.DECREASE_FONT,
    'திரையைப் படி': VoiceAction.READ_SCREEN,
    'படிப்பதை நிறுத்து': VoiceAction.STOP_READING,
    'புகாரைத் தொடங்கு': VoiceAction.START_COMPLAINT,
    'படிவத்தைச் சமர்ப்பி': VoiceAction.SUBMIT_FORM,
    'படிவத்தை அழி': VoiceAction.CLEAR_FORM,
    'நேரத்தை மீட்டமை': VoiceAction.RESET_TIMER,
    'அமர்வை நீட்டி': VoiceAction.EXTEND_SESSION
  },
  Hindi: {
    'घर जाओ': VoiceAction.GO_HOME,
    'सेवाएं खोलें': VoiceAction.OPEN_SERVICES,
    'शिकायतें खोलें': VoiceAction.OPEN_COMPLAINTS,
    'फीडबैक खोलें': VoiceAction.OPEN_FEEDBACK,
    'पीछे': VoiceAction.BACK,
    'अगला': VoiceAction.NEXT,
    'पिछला': VoiceAction.PREVIOUS,
    'बाहर निकलें': VoiceAction.EXIT,
    'पहला चुनें': VoiceAction.SELECT_FIRST,
    'दूसरा चुनें': VoiceAction.SELECT_SECOND,
    'तीसरा चुनें': VoiceAction.SELECT_THIRD,
    'फ़ॉन्ट बढ़ाएं': VoiceAction.INCREASE_FONT,
    'फ़ॉन्ट घटाएं': VoiceAction.DECREASE_FONT,
    'स्क्रीन पढ़ें': VoiceAction.READ_SCREEN,
    'पढ़ना बंद करें': VoiceAction.STOP_READING,
    'शिकायत शुरू करें': VoiceAction.START_COMPLAINT,
    'फॉर्म जमा करें': VoiceAction.SUBMIT_FORM,
    'फॉर्म साफ़ करें': VoiceAction.CLEAR_FORM,
    'टाइमर रीसेट करें': VoiceAction.RESET_TIMER,
    'सत्र बढ़ाएं': VoiceAction.EXTEND_SESSION
  },
  Telugu: {
    'ఇంటికి వెళ్ళు': VoiceAction.GO_HOME,
    'సేవలను తెరవండి': VoiceAction.OPEN_SERVICES,
    'ఫిర్యాదులను తెరవండి': VoiceAction.OPEN_COMPLAINTS,
    'అభిప్రాయాన్ని తెరవండి': VoiceAction.OPEN_FEEDBACK,
    'వెనుకకు': VoiceAction.BACK,
    'తదుపరి': VoiceAction.NEXT,
    'మునుపటి': VoiceAction.PREVIOUS,
    'నిష్క్రమించు': VoiceAction.EXIT,
    'మొదటిది ఎంచుకోండి': VoiceAction.SELECT_FIRST,
    'రెండవది ఎంచుకోండి': VoiceAction.SELECT_SECOND,
    'మూడవది ఎంచుకోండి': VoiceAction.SELECT_THIRD,
    'ఫాంట్ పెంచండి': VoiceAction.INCREASE_FONT,
    'ఫాంట్ తగ్గించండి': VoiceAction.DECREASE_FONT,
    'స్క్రీన్ చదవండి': VoiceAction.READ_SCREEN,
    'చదవడం ఆపండి': VoiceAction.STOP_READING,
    'ఫిర్యాదు ప్రారంభించండి': VoiceAction.START_COMPLAINT,
    'ఫారమ్ సమర్పించండి': VoiceAction.SUBMIT_FORM,
    'ఫారమ్ క్లియర్ చేయండి': VoiceAction.CLEAR_FORM,
    'టైమర్ రీసెట్ చేయండి': VoiceAction.RESET_TIMER,
    'సెషన్ పొడిగించండి': VoiceAction.EXTEND_SESSION
  },
  Kannada: {
    'ಮನೆಗೆ ಹೋಗಿ': VoiceAction.GO_HOME,
    'ಸೇವೆಗಳನ್ನು ತೆರೆಯಿರಿ': VoiceAction.OPEN_SERVICES,
    'ದೂರುಗಳನ್ನು ತೆರೆಯಿರಿ': VoiceAction.OPEN_COMPLAINTS,
    'ಪ್ರತಿಕ್ರಿಯೆಯನ್ನು ತೆರೆಯಿರಿ': VoiceAction.OPEN_FEEDBACK,
    'ಹಿಂದೆ': VoiceAction.BACK,
    'ಮುಂದಿನ': VoiceAction.NEXT,
    'ಹಿಂದಿನ': VoiceAction.PREVIOUS,
    'ನಿರ್ಗಮಿಸಿ': VoiceAction.EXIT,
    'ಮೊದಲನೆಯದನ್ನು ಆಯ್ಕೆಮಾಡಿ': VoiceAction.SELECT_FIRST,
    'ಎರಡನೆಯದನ್ನು ಆಯ್ಕೆಮಾಡಿ': VoiceAction.SELECT_SECOND,
    'ಮೂರನೆಯದನ್ನು ಆಯ್ಕೆಮಾಡಿ': VoiceAction.SELECT_THIRD,
    'ಫಾಂಟ್ ಹೆಚ್ಚಿಸಿ': VoiceAction.INCREASE_FONT,
    'ಫಾಂಟ್ ಕಡಿಮೆ ಮಾಡಿ': VoiceAction.DECREASE_FONT,
    'ಪರದೆ ಓದಿ': VoiceAction.READ_SCREEN,
    'ಓದುವುದನ್ನು ನಿಲ್ಲಿಸಿ': VoiceAction.STOP_READING,
    'ದೂರು ಪ್ರಾರಂಭಿಸಿ': VoiceAction.START_COMPLAINT,
    'ಫಾರ್ಮ್ ಸಲ್ಲಿಸಿ': VoiceAction.SUBMIT_FORM,
    'ಫಾರ್ಮ್ ತೆರವುಗೊಳಿಸಿ': VoiceAction.CLEAR_FORM,
    'ಟೈಮರ್ ಮರುಹೊಂದಿಸಿ': VoiceAction.RESET_TIMER,
    'ಸೆಷನ್ ವಿಸ್ತರಿಸಿ': VoiceAction.EXTEND_SESSION
  },
  Malayalam: {
    'ഹോമിലേക്ക് പോവുക': VoiceAction.GO_HOME,
    'സേവനങ്ങൾ തുറക്കുക': VoiceAction.OPEN_SERVICES,
    'പരാതികൾ തുറക്കുക': VoiceAction.OPEN_COMPLAINTS,
    'ഫീഡ്‌ബാക്ക് തുറക്കുക': VoiceAction.OPEN_FEEDBACK,
    'പുറകിലേക്ക്': VoiceAction.BACK,
    'അടുത്തത്': VoiceAction.NEXT,
    'മുമ്പത്തേത്': VoiceAction.PREVIOUS,
    'പുറത്തുകടക്കുക': VoiceAction.EXIT,
    'ഒന്നാമത്തേത് തിരഞ്ഞെടുക്കുക': VoiceAction.SELECT_FIRST,
    'രണ്ടാമത്തേത് തിരഞ്ഞെടുക്കുക': VoiceAction.SELECT_SECOND,
    'മൂന്നാമത്തേത് തിരഞ്ഞെടുക്കുക': VoiceAction.SELECT_THIRD,
    'ഫോണ്ട് കൂട്ടുക': VoiceAction.INCREASE_FONT,
    'ഫോണ്ട് കുറയ്ക്കുക': VoiceAction.DECREASE_FONT,
    'സ്ക്രീൻ വായിക്കുക': VoiceAction.READ_SCREEN,
    'വായന നിർത്തുക': VoiceAction.STOP_READING,
    'പരാതി തുടങ്ങുക': VoiceAction.START_COMPLAINT,
    'ഫോം സമർപ്പിക്കുക': VoiceAction.SUBMIT_FORM,
    'ഫോം മായ്ക്കുക': VoiceAction.CLEAR_FORM,
    'ടൈമർ പുനഃസജ്ജമാക്കുക': VoiceAction.RESET_TIMER,
    'സെഷൻ നീട്ടുക': VoiceAction.EXTEND_SESSION
  },
  Bengali: {
    'হোমে যান': VoiceAction.GO_HOME,
    'পরিষেবা খুলুন': VoiceAction.OPEN_SERVICES,
    'অভিযোগ খুলুন': VoiceAction.OPEN_COMPLAINTS,
    'মতামত খুলুন': VoiceAction.OPEN_FEEDBACK,
    'পিছনে': VoiceAction.BACK,
    'পরবর্তী': VoiceAction.NEXT,
    'পূর্ববর্তী': VoiceAction.PREVIOUS,
    'প্রস্থান করুন': VoiceAction.EXIT,
    'প্রথম নির্বাচন করুন': VoiceAction.SELECT_FIRST,
    'দ্বিতীয় নির্বাচন করুন': VoiceAction.SELECT_SECOND,
    'তৃতীয় নির্বাচন করুন': VoiceAction.SELECT_THIRD,
    'ফন্ট বাড়ান': VoiceAction.INCREASE_FONT,
    'ফন্ট কমান': VoiceAction.DECREASE_FONT,
    'স্ক্রিন পড়ুন': VoiceAction.READ_SCREEN,
    'পড়া থামান': VoiceAction.STOP_READING,
    'অভিযোগ শুরু করুন': VoiceAction.START_COMPLAINT,
    'ফর্ম জমা দিন': VoiceAction.SUBMIT_FORM,
    'ফর্ম পরিষ্কার করুন': VoiceAction.CLEAR_FORM,
    'টাইমার রিসেট করুন': VoiceAction.RESET_TIMER,
    'সেশন বাড়ান': VoiceAction.EXTEND_SESSION
  },
  Marathi: {
    'मुख्यपृष्ठावर जा': VoiceAction.GO_HOME,
    'सेवा उघडा': VoiceAction.OPEN_SERVICES,
    'तक्रारी उघडा': VoiceAction.OPEN_COMPLAINTS,
    'प्रतिक्रिया उघडा': VoiceAction.OPEN_FEEDBACK,
    'मागे': VoiceAction.BACK,
    'पुढील': VoiceAction.NEXT,
    'मागील': VoiceAction.PREVIOUS,
    'बाहेर पडा': VoiceAction.EXIT,
    'पहिले निवडा': VoiceAction.SELECT_FIRST,
    'दुसरे निवडा': VoiceAction.SELECT_SECOND,
    'तिसरे निवडा': VoiceAction.SELECT_THIRD,
    'फॉन्ट वाढवा': VoiceAction.INCREASE_FONT,
    'फॉन्ट कमी करा': VoiceAction.DECREASE_FONT,
    'स्क्रीन वाचा': VoiceAction.READ_SCREEN,
    'वाचणे थांबवा': VoiceAction.STOP_READING,
    'तक्रार सुरू करा': VoiceAction.START_COMPLAINT,
    'फॉर्म सबमिट करा': VoiceAction.SUBMIT_FORM,
    'फॉर्म साफ करा': VoiceAction.CLEAR_FORM,
    'टाइमर रीसेट करा': VoiceAction.RESET_TIMER,
    'सत्र वाढवा': VoiceAction.EXTEND_SESSION
  },
  Gujarati: {
    'ઘરે જાઓ': VoiceAction.GO_HOME,
    'સેવાઓ ખોલો': VoiceAction.OPEN_SERVICES,
    'ફરિયાદો ખોલો': VoiceAction.OPEN_COMPLAINTS,
    'પ્રતિસાદ ખોલો': VoiceAction.OPEN_FEEDBACK,
    'પાછળ': VoiceAction.BACK,
    'આગળ': VoiceAction.NEXT,
    'અગાઉનું': VoiceAction.PREVIOUS,
    'બહાર નીકળો': VoiceAction.EXIT,
    'પ્રથમ પસંદ કરો': VoiceAction.SELECT_FIRST,
    'બીજું પસંદ કરો': VoiceAction.SELECT_SECOND,
    'ત્રીજું પસંદ કરો': VoiceAction.SELECT_THIRD,
    'ફોન્ટ વધારો': VoiceAction.INCREASE_FONT,
    'ફોન્ટ ઘટાડો': VoiceAction.DECREASE_FONT,
    'સ્ક્રીન વાંચો': VoiceAction.READ_SCREEN,
    'વાંચવાનું બંધ કરો': VoiceAction.STOP_READING,
    'ફરિયાદ શરૂ કરો': VoiceAction.START_COMPLAINT,
    'ફોર્મ સબમિટ કરો': VoiceAction.SUBMIT_FORM,
    'ફોર્મ સાફ કરો': VoiceAction.CLEAR_FORM,
    'ટાઈમર રીસેટ કરો': VoiceAction.RESET_TIMER,
    'સત્ર લંબાવો': VoiceAction.EXTEND_SESSION
  },
  Punjabi: {
    'ਘਰ ਜਾਓ': VoiceAction.GO_HOME,
    'ਸੇਵਾਵਾਂ ਖੋਲ੍ਹੋ': VoiceAction.OPEN_SERVICES,
    'ਸ਼ਿਕਾਇਤਾਂ ਖੋਲ੍ਹੋ': VoiceAction.OPEN_COMPLAINTS,
    'ਫੀਡਬੈਕ ਖੋਲ੍ਹੋ': VoiceAction.OPEN_FEEDBACK,
    'ਪਿੱਛੇ': VoiceAction.BACK,
    'ਅਗਲਾ': VoiceAction.NEXT,
    'ਪਿਛਲਾ': VoiceAction.PREVIOUS,
    'ਬਾਹਰ ਜਾਓ': VoiceAction.EXIT,
    'ਪਹਿਲਾ ਚੁਣੋ': VoiceAction.SELECT_FIRST,
    'ਦੂਜਾ ਚੁਣੋ': VoiceAction.SELECT_SECOND,
    'ਤੀਜਾ ਚੁਣੋ': VoiceAction.SELECT_THIRD,
    'ਫੌਂਟ ਵਧਾਓ': VoiceAction.INCREASE_FONT,
    'ਫੌਂਟ ਘਟਾਓ': VoiceAction.DECREASE_FONT,
    'ਸਕ੍ਰੀਨ ਪੜ੍ਹੋ': VoiceAction.READ_SCREEN,
    'ਪੜ੍ਹਨਾ ਬੰਦ ਕਰੋ': VoiceAction.STOP_READING,
    'ਸ਼ਿਕਾਇਤ ਸ਼ੁਰੂ ਕਰੋ': VoiceAction.START_COMPLAINT,
    'ਫਾਰਮ ਜਮ੍ਹਾਂ ਕਰੋ': VoiceAction.SUBMIT_FORM,
    'ਫਾਰਮ ਸਾਫ਼ ਕਰੋ': VoiceAction.CLEAR_FORM,
    'ਟਾਈਮਰ ਰੀਸੈਟ ਕਰੋ': VoiceAction.RESET_TIMER,
    'ਸੈਸ਼ਨ ਵਧਾਓ': VoiceAction.EXTEND_SESSION
  }
};

// Fast Levenshtein distance for fuzzy typo matching
const levenshtein = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[a.length][b.length];
};

const fuzzyMatch = (token: string, target: string): boolean => {
  if (token === target) return true;
  if (target.length <= 4) return false;
  
  const maxDist = target.length > 7 ? 2 : 1;
  // MASSIVE LATENCY FIX: 95% reduction in Levenshtein calls
  if (Math.abs(token.length - target.length) > maxDist) return false;

  const dist = levenshtein(token, target);
  return dist <= maxDist;
};

const PATTERN_REGISTRY: Record<string, any> = {
  [VoiceAction.OPEN_HELP]: {
    indicators: ['help', 'assistance', 'support me', 'guide me', 'confused', "don't know", 'where to go', 'உதவி', 'मदद', 'సహాయం']
  },
  [VoiceAction.OPEN_COMPLAINTS]: {
    indicators: ['complaint', 'issue', 'problem', 'grievance', 'report', 'புகார்', 'शिकायत', 'ఫిర్యాదు'],
    problems: ['not working', 'not functioning', 'damaged', 'broken', 'stopped', 'overflow', 'leakage', 'no water', 'no electricity', 'not receiving service', 'not received', 'not coming'],
    nouns: ['road', 'streetlight', 'street light', 'drainage', 'sewage', 'garbage', 'water', 'drinking water', 'electricity', 'area', 'village', 'pothole']
  },
  [VoiceAction.OPEN_DOCUMENTS]: {
    indicators: ['certificate', 'proof', 'document', 'சான்றிதழ்', 'प्रमाणपत्र', 'సర్టిఫికెట్'],
    modifiers: ['birth', 'income', 'caste', 'age', 'community', 'residence', 'death']
  },
  [VoiceAction.OPEN_BILLING]: {
    indicators: ['bill', 'payment', 'tax', 'fee', 'kattanum', 'रसीद', 'बिल', 'ரசீது'],
    modifiers: ['electricity', 'water', 'property', 'utility', 'eb']
  },
  [VoiceAction.OPEN_SCHEMES]: {
    indicators: ['benefits', 'support', 'scheme', 'subsidy', 'pension', 'scholarship', 'financial', 'money', 'திட்டம்', 'योजना', 'పథకం'],
    groups: ['student', 'studies', 'higher education', 'senior citizen', 'farmer', 'women', 'eligible']
  },
  [VoiceAction.GO_HOME]: { indicators: ['home', 'main', 'dashboard', 'start', 'begin', 'take me home', 'முகப்பு', 'घर', 'మొదటి', 'ಮನೆ'] },
  [VoiceAction.OPEN_HISTORY]: { indicators: ['history', 'status', 'track', 'past', 'record', 'வரலாறு', 'स्थिति', 'చరిత్ర'] },
  [VoiceAction.OPEN_TRACKER]: { indicators: ['track app', 'track application', 'tracker'] },
  [VoiceAction.OPEN_WHISTLEBLOWER]: { indicators: ['civic integrity', 'integrity', 'whistleblower', 'whistle blower'] },
  [VoiceAction.OPEN_AI_ASSISTANT]: { indicators: ['assistant', 'ai', 'chatbot', 'chat', 'ask assistant', 'open assistant'] },
  [VoiceAction.OPEN_SERVICES]: { indicators: ['service', 'apply', 'registration', 'சேவை', 'सेवा', 'సేవ'] },
  [VoiceAction.EXIT]: { indicators: ['exit', 'close', 'quit', 'logout', 'end session', 'start over', 'restart', 'வெளியேறு', 'बाहर', 'నిష్క్రమించు'] },
  [VoiceAction.READ_SCREEN]: { indicators: ['read screen', 'read options', 'what is on this page', 'read menu', 'read page', 'speak', 'options', 'what options', 'திரையைப் படி', 'स्क्रीन पढ़ें'] },
  [VoiceAction.NEXT]: { indicators: ['next option', 'next', 'அடுத்த'] },
  [VoiceAction.PREVIOUS]: { indicators: ['previous option', 'previous', 'முந்தைய'] },
  [VoiceAction.CONFIRM_YES]: { indicators: ['confirm', 'yes', 'ok', 'ஆமாம்'] },
  [VoiceAction.CONFIRM_NO]: { indicators: ['cancel', 'no', 'stop', 'இல்லை'] },
  [VoiceAction.SELECT_FIRST]: { indicators: ['first', 'one', '1', 'select option', 'முதலாவது', 'पहला'] },
  [VoiceAction.BACK]: { indicators: ['back', 'return', 'பின்னால்', 'पीछे', 'వెనుకకు'] }
};

const PRIORITY_ORDER = [
  VoiceAction.OPEN_HELP,
  VoiceAction.OPEN_COMPLAINTS,
  VoiceAction.OPEN_DOCUMENTS,
  VoiceAction.OPEN_BILLING,
  VoiceAction.OPEN_SCHEMES,
  VoiceAction.GO_HOME,
  VoiceAction.OPEN_HISTORY,
  VoiceAction.OPEN_TRACKER,
  VoiceAction.OPEN_WHISTLEBLOWER,
  VoiceAction.OPEN_AI_ASSISTANT,
  VoiceAction.OPEN_SERVICES,
  VoiceAction.EXIT,
  VoiceAction.READ_SCREEN,
  VoiceAction.NEXT,
  VoiceAction.PREVIOUS,
  VoiceAction.CONFIRM_YES,
  VoiceAction.CONFIRM_NO,
  VoiceAction.SELECT_FIRST,
  VoiceAction.BACK
];

const CONTEXTS = {
  negative: ['not', 'no', 'never', 'without', 'missing', 'stopped', 'failed', 'issue', 'problem', 'bad', 'damaged', 'broken', 'overflow', 'leakage', 'pending'],
  need: ['want', 'need', 'require', 'looking', 'apply', 'get', 'help', 'assist', 'support', 'how'],
  infrastructure: ['water', 'electricity', 'road', 'drainage', 'garbage', 'village', 'area', 'street', 'streetlight', 'sewage', 'pothole'],
  financial: ['money', 'funds', 'subsidy', 'studies', 'education', 'poor', 'student', 'farmer', 'women', 'senior citizen', 'pension', 'scholarship', 'financial', 'benefits'],
  documents: ['certificate', 'proof', 'document', 'birth', 'income', 'caste', 'age', 'community', 'residence', 'death', 'admission'],
  billing: ['bill', 'payment', 'tax', 'fee', 'eb', 'utility', 'property', 'due']
};

export const getActionForCommand = (phrase: string, lang: string): { action: VoiceAction, score: number } | null => {
  const normalizedPhrase = phrase.trim().toLowerCase();
  
  // Fast-Path Direct Overrides for explicitly requested commands
  if (normalizedPhrase.includes('civic integrity') || normalizedPhrase.includes('whistleblower')) {
    return { action: VoiceAction.OPEN_WHISTLEBLOWER, score: 10 };
  }
  if (normalizedPhrase.includes('open assistant') || normalizedPhrase.includes('chatbot') || normalizedPhrase.includes('ask ai')) {
    return { action: VoiceAction.OPEN_AI_ASSISTANT, score: 10 };
  }

  const commands = VOICE_COMMANDS[lang] || VOICE_COMMANDS['English'];
  
  if (commands[normalizedPhrase]) {
    return { action: commands[normalizedPhrase], score: 10 };
  }

  const phraseTokens = normalizedPhrase.split(/\s+/);
  
  // 1. Check for specific context signals
  const hasNegative = CONTEXTS.negative.some(c => normalizedPhrase.includes(c) || phraseTokens.some(t => fuzzyMatch(t, c)));
  const hasNeed = CONTEXTS.need.some(c => normalizedPhrase.includes(c) || phraseTokens.some(t => fuzzyMatch(t, c)));
  const hasInfra = CONTEXTS.infrastructure.some(c => normalizedPhrase.includes(c) || phraseTokens.some(t => fuzzyMatch(t, c)));
  const hasFinancial = CONTEXTS.financial.some(c => normalizedPhrase.includes(c) || phraseTokens.some(t => fuzzyMatch(t, c)));
  const hasDocs = CONTEXTS.documents.some(c => normalizedPhrase.includes(c) || phraseTokens.some(t => fuzzyMatch(t, c)));
  const hasBilling = CONTEXTS.billing.some(c => normalizedPhrase.includes(c) || phraseTokens.some(t => fuzzyMatch(t, c)));

  // 2. Situational Overrides (The core rules)
  // Infrastructure + Negative = Complaint Situation
  if (hasInfra && hasNegative) return { action: VoiceAction.OPEN_COMPLAINTS, score: 5 };
  
  // Financial + Need = Scheme Situation
  if (hasFinancial && hasNeed) return { action: VoiceAction.OPEN_SCHEMES, score: 5 };
  if (hasFinancial && !hasInfra && !hasNegative) return { action: VoiceAction.OPEN_SCHEMES, score: 4 };

  // Docs + Need = Document Situation
  if (hasDocs && hasNeed) return { action: VoiceAction.OPEN_DOCUMENTS, score: 5 };
  if (hasDocs && !hasInfra) return { action: VoiceAction.OPEN_DOCUMENTS, score: 4 };

  // Billing + Need/Negative = Billing Situation
  if (hasBilling && (hasNeed || hasNegative)) return { action: VoiceAction.OPEN_BILLING, score: 5 };
  if (hasBilling) return { action: VoiceAction.OPEN_BILLING, score: 4 };

  // Help / Confusion Situation
  if (hasNeed && !hasInfra && !hasFinancial && !hasDocs && !hasBilling) return { action: VoiceAction.OPEN_HELP, score: 4 };

  // 3. Fallback to existing PATTERN_REGISTRY for explicit commands (Back, Next, Exit, etc)
  for (const action of PRIORITY_ORDER) {
    const pattern = PATTERN_REGISTRY[action];
    if (!pattern) continue;
    
    let hasProblem = false;
    let hasNoun = false;
    let hasIndicator = false;
    let hasModifierOrGroup = false;

    if (pattern.problems) hasProblem = pattern.problems.some((p: string) => normalizedPhrase.includes(p) || phraseTokens.some(t => fuzzyMatch(t, p)));
    if (pattern.indicators) hasIndicator = pattern.indicators.some((i: string) => normalizedPhrase.includes(i) || phraseTokens.some(t => fuzzyMatch(t, i)));
    if (pattern.nouns) hasNoun = pattern.nouns.some((n: string) => normalizedPhrase.includes(n) || phraseTokens.some(t => fuzzyMatch(t, n)));
    if (pattern.modifiers) hasModifierOrGroup = pattern.modifiers.some((m: string) => normalizedPhrase.includes(m) || phraseTokens.some(t => fuzzyMatch(t, m)));
    if (pattern.groups) hasModifierOrGroup = hasModifierOrGroup || pattern.groups.some((g: string) => normalizedPhrase.includes(g) || phraseTokens.some(t => fuzzyMatch(t, g)));

    if (hasIndicator) return { action, score: 5 };
    if (hasProblem && hasNoun) return { action, score: 4 };
    if (hasModifierOrGroup) return { action, score: 3 };
  }

  // 4. Soft Fallback Protection
  // If the citizen expresses a clear need or suffering but we aren't completely sure where it goes, route to Help instead of AI.
  if (hasNegative || hasNeed) return { action: VoiceAction.OPEN_HELP, score: 3 };

  return null;
};
