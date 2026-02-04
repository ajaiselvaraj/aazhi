
export enum Language {
  TAMIL = 'Tamil',
  ENGLISH = 'English',
  HINDI = 'Hindi',
  BENGALI = 'Bengali',
  MARATHI = 'Marathi',
  TELUGU = 'Telugu',
  GUJARATI = 'Gujarati',
  MALAYALAM = 'Malayalam'
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

export interface ServiceRequest {
  id: string;
  type: string;
  department: string;
  citizenName: string;
  status: 'Pending' | 'In Progress' | 'Resolved' | 'Rejected';
  timestamp: string;
  details: string;
}

export interface Department {
  id: string;
  name: string;
  icon: string;
  services: string[];
}
