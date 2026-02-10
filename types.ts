
export enum Language {
  ENGLISH = 'English',
  ASSAMESE = 'Assamese',
  BENGALI = 'Bengali',
  BODO = 'Bodo',
  DOGRI = 'Dogri',
  GUJARATI = 'Gujarati',
  HINDI = 'Hindi',
  KANNADA = 'Kannada',
  KASHMIRI = 'Kashmiri',
  KONKANI = 'Konkani',
  MAITHILI = 'Maithili',
  MALAYALAM = 'Malayalam',
  MANIPURI = 'Manipuri',
  MARATHI = 'Marathi',
  NEPALI = 'Nepali',
  ODIA = 'Odia',
  PUNJABI = 'Punjabi',
  SANSKRIT = 'Sanskrit',
  SANTALI = 'Santali',
  SINDHI = 'Sindhi',
  TAMIL = 'Tamil',
  TELUGU = 'Telugu',
  URDU = 'Urdu'
}

export enum ViewState {
  LANDING = 'LANDING',
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  SERVICE_FORM = 'SERVICE_FORM',
  COMPLAINT_FORM = 'COMPLAINT_FORM',
  TRACK_STATUS = 'TRACK_STATUS',
  ADMIN = 'ADMIN',
  DOCUMENTATION = 'DOCUMENTATION'
}

export interface CityAlert {
  id: string;
  type: 'Power' | 'Water' | 'Road' | 'Weather' | 'Civic';
  severity: 'Critical' | 'Warning' | 'Info';
  message: string;
  ward: string;
}




export interface Bill {
  id: string;
  consumerId: string;
  serviceType: 'Electricity' | 'Water' | 'Gas' | 'Property';
  amount: number;
  units?: string;
  month: string;
  year: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  dueDate: string;
  cycle?: string; // e.g. "FEB-2026"
  readings?: { current: number; previous: number };
  paymentDate?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  mobile: string;
  aadhaar: string;
  address: string;
  ward: string; // e.g., "12"
  zone?: string; // e.g., "North"
  consumerIds: {
    elec: string;
    water: string;
    gas: string;
  };
}

export type IssueCategory = 'METER_FAULT' | 'BILLING_ERROR' | 'VOLTAGE_FLUCTUATION' | 'NO_WATER' | 'PIPE_LEAK' | 'GARBAGE_COLLECTION' | 'STREET_LIGHT' | 'GENERAL' | 'OTHER';


export interface SupportContact {
  department: string;
  phone: string;
  area: string;
  isEmergency?: boolean;
}

export interface TrackingStage {
  stage: string;
  status: "Completed" | "Current" | "Pending";
  updatedAt?: string;
}

export interface ServiceRequest {
  id: string;
  type: string;
  department: string; // This maps to 'category' in some contexts
  citizenName: string;
  citizenId?: string;
  status: 'Submitted' | 'Under Review' | 'Verification' | 'Approval Pending' | 'Completed' | 'Rejected';
  currentStage: string;
  stages: TrackingStage[];
  timestamp: string;
  details: string;
  messages?: Message[];
  issueCategory?: IssueCategory;
  ward?: string;
  phone?: string; // Added for tracker search
}

export interface Message {
  id: string;
  sender: 'Citizen' | 'Authority';
  text: string;
  timestamp: string;
  isRead?: boolean;
}


export interface Department {
  id: string;
  name: string;
  icon: string;
  services: string[];
}

export interface Kiosk {
  id: string;
  location: string;
  status: "Online" | "Offline";
  battery: number;
  network: "Good" | "Weak" | "Disconnected";
  userLoad: "Low" | "Medium" | "High";
  lastActive: string;
  todayUsers: number;
  complaintsToday: number;
}
