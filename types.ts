
export type DeviceCategory = 'Phone' | 'Laptop' | 'Printer' | 'Tablet' | 'Other';
export type RepairStatus = 'Pending' | 'In Progress' | 'Completed' | 'Unrepairable';
export type UserRole = 'super_admin' | 'admin' | 'staff' | 'manager';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type RegistrationStatus = 'unregistered' | 'pending_verification' | 'verified' | 'revoked';

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  company: string;
  role: UserRole;
  createdAt: number;
  aiUsageCount: number;
  subscriptionExpiry?: number;
  
  // Mandatory Compliance Fields
  registrationStatus: RegistrationStatus;
  cacNumber?: string;
  businessAddress?: string;
  ndpcStatus?: 'Registered' | 'In-Progress' | 'Not Registered';
  ndpcReference?: string;
  dpoName?: string;
  dpoEmail?: string;
  legalAcceptedTimestamp?: number;
  
  // Document Evidence (Base64)
  cacDocument?: string;
  ndpcDocument?: string;
  governmentId?: string;
  biometricSelfie?: string;
}

export interface RepairJob {
  id: string;
  userId: string; 
  company: string; 
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  deviceCategory: DeviceCategory;
  deviceBrand: string;
  deviceModel: string;
  serialNumber: string;
  initialCondition: string;
  faultDescription: string;
  status: RepairStatus;
  createdAt: number;
  updatedAt: number;
  clientSignature: string;
  technicianSignature: string;
  technicianNotes?: string;
  aiSuggestions?: AISuggestion[];
  isSynced: boolean;
  agreedAmount: number;
  initialDeposit: number;
  recordHash: string;
  prevRecordHash: string;
  timestampProof: string;
  
  // Forensic Legal Context
  businessCAC: string;
  technicianVerifiedId: string;
  
  // Visual Evidence
  devicePhotoFront?: string;
  devicePhotoBack?: string;
}

export interface DraftRepair {
  id: string;
  company: string;
  createdBy: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  category: DeviceCategory;
  brand: string;
  model: string;
  serial: string;
  initialCondition: string;
  fault: string;
  agreedAmount: string;
  initialDeposit: string;
  timestamp: number;
  
  // Visual Evidence
  devicePhotoFront?: string;
  devicePhotoBack?: string;
}

export interface AISuggestion {
  solution: string;
  accuracy: number;
  precision: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  description: string;
}

export interface SyncStats {
  pending: number;
  lastSynced: number | null;
}

export interface PaymentRequest {
  id: string;
  userId: string;
  userName: string;
  company: string;
  amount: number;
  confirmedAmount: number;
  plan: string;
  status: PaymentStatus;
  timestamp: number;
}

export interface AdminMessage {
  id: string;
  from: string;
  toCompany: string;
  content: string;
  timestamp: number;
}

export interface SMSLog {
  id: string;
  repairId: string;
  recipient: string;
  message: string;
  status: 'Sent' | 'Failed' | 'Delivered';
  timestamp: number;
  deliveryProof?: string;
}
