export const languageVoiceMap: Record<string, string> = {
    English: 'en-IN',
    Assamese: 'as-IN',
    Bengali: 'bn-IN',
    Gujarati: 'gu-IN',
    Hindi: 'hi-IN',
    Kannada: 'kn-IN',
    Malayalam: 'ml-IN',
    Marathi: 'mr-IN',
    Nepali: 'ne-NP',
    Odia: 'or-IN',
    Punjabi: 'pa-IN',
    Tamil: 'ta-IN',
    Telugu: 'te-IN',
    Urdu: 'ur-PK'
};

export const getLanguageCode = (language: string): string => {
    return languageVoiceMap[language] || 'en-IN';
};
