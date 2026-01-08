
export type DeviceCategory = 'Phone' | 'Laptop' | 'Printer' | 'Tablet' | 'Other';
export type RepairStatus = 'Pending' | 'In Progress' | 'Completed' | 'Unrepairable';
export type UserRole = 'admin' | 'staff';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  company: string;
  role: UserRole;
  createdAt: number;
  aiUsageCount: number;
  subscriptionExpiry?: number; // timestamp
}

export interface PaymentRequest {
  id: string;
  userId: string;
  userName: string;
  company: string;
  amount: number;
  confirmedAmount: number; // The amount the user claims to have sent
  plan: string;
  status: PaymentStatus;
  timestamp: number;
}

export interface AdminMessage {
  id: string;
  from: string;
  toCompany: string | 'ALL';
  content: string;
  timestamp: number;
}

export interface AISuggestion {
  solution: string;
  accuracy: number;
  precision: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  description: string;
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
  dollarEquivalent?: number;
  recordHash: string;
  prevRecordHash: string;
  timestampProof: string;
}

export interface SyncStats {
  pending: number;
  lastSynced: number | null;
}
