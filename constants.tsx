
import React from 'react';
import { LayoutGrid, Zap, Droplets, Trash2, Flame, Search, FileText, AlertCircle, ShieldCheck } from 'lucide-react';
import { Department, Language, CityAlert } from './types';

export const DEPARTMENTS: Department[] = [
  {
    id: 'eb',
    name: 'Electricity Board',
    icon: 'Zap',
    services: ['New Connection', 'Billing Issue', 'Meter Fault', 'Load Change']
  },
  {
    id: 'water',
    name: 'Water Supply & Sewage',
    icon: 'Droplets',
    services: ['Water Connection', 'Sewage Block', 'Pipeline Leak', 'Bill Payment']
  },
  {
    id: 'gas',
    name: 'Gas Distribution',
    icon: 'Flame',
    services: ['New Connection', 'Refill Booking', 'Leakage Complaint', 'Address Change']
  },
  {
    id: 'municipal',
    name: 'Municipal Corp',
    icon: 'Trash2',
    services: ['Waste Management', 'Birth/Death Cert', 'Property Tax', 'Street Light']
  }
];

export const MOCK_ALERTS: CityAlert[] = [
  { id: 'AL-01', type: 'Power', severity: 'Critical', ward: '12', message: 'Planned maintenance in Ward 12 from 2PM - 5PM.' },
  { id: 'AL-02', type: 'Water', severity: 'Warning', ward: 'Global', message: 'Low pressure expected in Central Zone due to pipeline repair.' },
  { id: 'AL-03', type: 'Civic', severity: 'Info', ward: '12', message: 'Mobile Health Camp today at Gandhi Park (Ward 12).' }
];

export const APP_CONFIG = {
  TITLE: 'AAZHI',
  SUBTITLE: 'Smart Urban Digital Helpdesk Assistant (SUVIDHA)',
  TAGLINE: 'Accessible. Transparent. Efficient.'
};

export const MOCK_REQUESTS = [
  { id: 'AZ-1001', type: 'New Connection', department: 'Electricity Board', citizenName: 'Arun Kumar', status: 'Pending', timestamp: '2024-05-15 10:30', details: 'Phase 3 connection for residential property.' },
  { id: 'AZ-1002', type: 'Pipeline Leak', department: 'Water Supply', citizenName: 'Priya S', status: 'Resolved', timestamp: '2024-05-14 14:20', details: 'Leak reported near main road junction.' },
  { id: 'AZ-1003', type: 'Waste Management', department: 'Municipal Corp', citizenName: 'John Doe', status: 'In Progress', timestamp: '2024-05-15 09:15', details: 'Regular garbage pickup missed for 3 days.' }
];

export const TRANSLATIONS: Record<Language, any> = {
  [Language.ENGLISH]: {
    welcome: "Welcome",
    loginSubtitle: "Smart Urban Digital Helpdesk Assistant",
    enterId: "Enter Aadhaar Number or Official ID",
    aadhaarHint: "Citizens enter 12-digit Aadhaar. Officials use registered Department ID.",
    continue: "Continue",
    otpVerification: "Verification OTP",
    otpHint: "A 6-digit code has been sent to your Aadhaar-linked mobile.",
    loginCitizen: "Login as Citizen",
    officialPassword: "Official Password",
    accessAdmin: "Access Admin Panel",
    backToLang: "Back to Language Selection",
    adminDashboard: "Dashboard Overview",
    adminRequests: "Citizen Requests",
    adminComplaints: "Manage Complaints",
    welcomeBack: "Welcome back",
    citizensServed: "Citizens Served",
    pendingRequests: "Pending Requests",
    slaMet: "SLA Met",
    avgFeedback: "Avg Feedback",
    deptPerformance: "Department Performance",
    serviceDistribution: "Service Distribution",
    activeApps: "Active Applications",
    logout: "Logout Session",
    statusActive: "Cloud Sync Active",
    sysStatus: "System Status",
    // New Smart Feature Keys
    liveAlerts: "Live City Alerts",
    privacyShield: "Privacy Shield",
    waitMsg: "Wait Time",
    tokenIssued: "Token Issued",
    selfService: "Self Service",
    counterHelp: "Counter Help",
    scanAssistant: "Scanning Assistant"
  },
  [Language.TAMIL]: {
    welcome: "வரவேற்கிறோம்",
    loginSubtitle: "ஸ்மார்ட் நகர்ப்புற டிஜிட்டல் உதவி மையம்",
    enterId: "ஆதார் எண் அல்லது அதிகாரப்பூர்வ ஐடியை உள்ளிடவும்",
    aadhaarHint: "குடிமக்கள் 12 இலக்க ஆதாரை உள்ளிடவும். அதிகாரிகள் துறை ஐடியைப் பயன்படுத்தவும்.",
    continue: "தொடரவும்",
    otpVerification: "சரிபார்ப்பு OTP",
    otpHint: "உங்கள் ஆதாருடன் இணைக்கப்பட்ட மொபைலுக்கு 6 இலக்க குறியீடு அனுப்பப்பட்டுள்ளது.",
    loginCitizen: "குடிமகனாக உள்நுழையவும்",
    officialPassword: "அதிகாரப்பூர்வ கடவுச்சொல்",
    accessAdmin: "நிர்வாக குழுவை அணுகவும்",
    backToLang: "மொழித் தேர்வுக்குச் செல்லவும்",
    adminDashboard: "நிர்வாக மேலோட்டம்",
    adminRequests: "குடிமக்கள் கோரிக்கைகள்",
    adminComplaints: "புகார்களை நிர்வகிக்கவும்",
    welcomeBack: "மீண்டும் வருக",
    citizensServed: "சேவையளிக்கப்பட்ட குடிமக்கள்",
    pendingRequests: "நிலுவையில் உள்ள கோரிக்கைகள்",
    slaMet: "SLA எட்டப்பட்டது",
    avgFeedback: "சராசரி கருத்து",
    deptPerformance: "துறை செயல்திறன்",
    serviceDistribution: "சேவை விநியோகம்",
    activeApps: "செயலில் உள்ள விண்ணப்பங்கள்",
    logout: "வெளியேறவும்",
    statusActive: "கிளவுட் ஒத்திசைவு செயலில் உள்ளது",
    sysStatus: "கணினி நிலை",
    liveAlerts: "நேரடி விழிப்பூட்டல்கள்",
    privacyShield: "தனியுரிமை கவசம்",
    waitMsg: "காத்திருப்பு நேரம்",
    tokenIssued: "டோக்கன் வழங்கப்பட்டது",
    selfService: "சுய சேவை",
    counterHelp: "உதவி மையம்",
    scanAssistant: "ஸ்கேனிங் உதவியாளர்"
  },
  // Placeholders for other languages using English keys for now
  [Language.HINDI]: { welcome: "स्वागत है", loginSubtitle: "स्मार्ट शहरी डिजिटल सहायता केंद्र", continue: "जारी रखें", loginCitizen: "लॉगिन करें", officialPassword: "पासवर्ड", accessAdmin: "एडमिन", backToLang: "वापस", adminDashboard: "डैशबोर्ड", adminRequests: "अनुरोध", adminComplaints: "शिकायतें", welcomeBack: "स्वागत", citizensServed: "सेवा प्राप्त", pendingRequests: "लंबित", slaMet: "SLA", avgFeedback: "फीडबैक", deptPerformance: "प्रदर्शन", serviceDistribution: "वितरण", activeApps: "आवेदन", logout: "लॉगआउट", statusActive: "सक्रिय", sysStatus: "स्थिति", liveAlerts: "अलर्ट", privacyShield: "शील्ड", waitMsg: "प्रतीक्षा", tokenIssued: "टोकन", selfService: "स्व-सेवा", counterHelp: "सहायता", scanAssistant: "सहायक" },
  [Language.BENGALI]: { welcome: "স্বাগতম", loginSubtitle: "স্মার্ট আরবান ডিজিটাল হেল্পডেস্ক", continue: "এগিয়ে যান", loginCitizen: "লগইন", officialPassword: "পাসওয়ার্ড", accessAdmin: "অ্যাডমিন", backToLang: "ফিরে যান", adminDashboard: "ড্যাশবোর্ড", adminRequests: "অনুরোধ", adminComplaints: "অভিযোগ", welcomeBack: "স্বাগতম", citizensServed: "সেবা প্রাপ্ত", pendingRequests: "মুলতুবি", slaMet: "SLA", avgFeedback: "ফিডব্যাক", deptPerformance: "বিভাগ", serviceDistribution: "বন্টন", activeApps: "আবেদন", logout: "লগআউট", statusActive: "সক্রিয়", sysStatus: "স্থিতি", liveAlerts: "সতর্কবার্তা", privacyShield: "শিল্ড", waitMsg: "অপেক্ষা", tokenIssued: "টোকেন", selfService: "স্ব-সেবা", counterHelp: "সহায়তা", scanAssistant: "সহায়ক" },
  [Language.MARATHI]: { welcome: "स्वागत", loginSubtitle: "स्मार्ट शहरी डिजिटल मदत केंद्र", continue: "पुढे जा", loginCitizen: "लॉगिन", officialPassword: "पासवर्ड", accessAdmin: "अॅडमिन", backToLang: "परत", adminDashboard: "डॅशबोर्ड", adminRequests: "विनंत्या", adminComplaints: "तक्रारी", welcomeBack: "स्वागत", citizensServed: "नागरिक", pendingRequests: "लंबित", slaMet: "SLA", avgFeedback: "फीडबॅक", deptPerformance: "कामगिरी", serviceDistribution: "वितरण", activeApps: "अर्ज", logout: "लॉगआउट", statusActive: "सक्रिय", sysStatus: "स्थिती", liveAlerts: "सूचना", privacyShield: "शील्ड", waitMsg: "वेळ", tokenIssued: "टोकन", selfService: "स्व-सेवा", counterHelp: "मदत", scanAssistant: "सहाय्यक" },
  [Language.TELUGU]: { welcome: "స్వాగతం", loginSubtitle: "స్మార్ట్ అర్బన్ డిజిటల్ హెల్ప్‌డెస్క్", continue: "కొనసాగించు", loginCitizen: "లాగిన్", officialPassword: "పాస్‌వర్డ్", accessAdmin: "అడ్మిన్", backToLang: "తిరిగి", adminDashboard: "డ్యాష్‌బోర్డ్", adminRequests: "అభ్యర్థనలు", adminComplaints: "ఫిర్యాదులు", welcomeBack: "స్వాగతం", citizensServed: "పౌరులు", pendingRequests: "పెండింగ్", slaMet: "SLA", avgFeedback: "అభిప్రాయం", deptPerformance: "పనితీరు", serviceDistribution: "పంపిణీ", activeApps: "దరఖాస్తులు", logout: "లాగ్అవుట్", statusActive: "సక్రియం", sysStatus: "స్థితి", liveAlerts: "హెచ్చరికలు", privacyShield: "షీల్డ్", waitMsg: "సమయం", tokenIssued: "టోకెన్", selfService: "స్వయం సేవ", counterHelp: "సహాయం", scanAssistant: "సహాయకుడు" },
  [Language.GUJARATI]: { welcome: "સ્વાગત", loginSubtitle: "સ્માર્ટ અર્બન ડિજિટલ હેલ્પડેસ્ક", continue: "આગળ વધો", loginCitizen: "લોગિન", officialPassword: "પાસવર્ડ", accessAdmin: "એડમિન", backToLang: "પાછા", adminDashboard: "ડેશબોર્ડ", adminRequests: "વિનંતી", adminComplaints: "ફરિયાદ", welcomeBack: "સ્વાગત", citizensServed: "નાગરિકો", pendingRequests: "બાકી", slaMet: "SLA", avgFeedback: "પ્રતિસાદ", deptPerformance: "કામગીરી", serviceDistribution: "વિતરણ", activeApps: "અરજી", logout: "લોગઆઉટ", statusActive: "સક્રિય", sysStatus: "સ્થિતિ", liveAlerts: "સતર્કતા", privacyShield: "શીલ્ડ", waitMsg: "સમય", tokenIssued: "ટોકન", selfService: "સ્વ-સેવા", counterHelp: "મદદ", scanAssistant: "સહાયક" },
  [Language.MALAYALAM]: { welcome: "സ്വാഗതം", loginSubtitle: "സ്മാർട്ട് അർബൻ ഹെൽപ്പ് ഡെസ്ക്", continue: "തുടരുക", loginCitizen: "ലോഗിൻ", officialPassword: "പാസ്‌വേഡ്", accessAdmin: "അഡ്മിൻ", backToLang: "തിരികെ", adminDashboard: "ഡാഷ്‌ബോർഡ്", adminRequests: "അഭ്യർത്ഥനകൾ", adminComplaints: "പരാതികൾ", welcomeBack: "സ്വാഗതം", citizensServed: "പൗരന്മാർ", pendingRequests: "അപേക്ഷകൾ", slaMet: "SLA", avgFeedback: "പ്രതികരണം", deptPerformance: "പ്രവർത്തനം", serviceDistribution: "വിതരണം", activeApps: "അപേക്ഷ", logout: "ലോഗൗട്ട്", statusActive: "സജീവമാണ്", sysStatus: "നില", liveAlerts: "അലേർട്ടുകൾ", privacyShield: "ഷീൽഡ്", waitMsg: "സമയം", tokenIssued: "ടോക്കൺ", selfService: "സ്വയം സേവനം", counterHelp: "സഹായം", scanAssistant: "സഹായി" }
};
