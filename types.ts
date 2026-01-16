
export type DeviceCategory = 'Phone' | 'Laptop' | 'Printer' | 'Tablet' | 'Other';
export type RepairStatus = 'Pending' | 'In Progress' | 'Completed' | 'Unrepairable';
export type UserRole = 'super_admin' | 'admin' | 'staff' | 'manager';
export type PaymentStatus = 'pending' | 'approved' | 'rejected';
export type RegistrationStatus = 'unregistered' | 'pending_verification' | 'verified' | 'revoked';

export const APP_FEATURES = [
  "AI Forensic Diagnostics (Gemini)",
  "Offline Drafts & Caching",
  "NDPR Compliance Logging",
  "Cryptographic Record Hashing",
  "Client SMS Notifications",
  "WhatsApp Trust Receipts",
  "Biometric Officer Auth",
  "Cloud Synchronization",
  "PDF Report Generation",
  "HQ Broadcast Receiver",
  "Justice Mode Evidence Export"
];

export const TIER_FEATURES = {
  FREE: {
    name: "Free Trial",
    limitJobs: 5,
    allowAI: false,
    allowSMS: false,
    allowReceipt: false, // Watermarked/Basic only
    allowLegal: false,
    allowDispute: false
  },
  BASIC: {
    name: "Basic",
    limitJobs: Infinity,
    allowAI: true,
    allowSMS: true,
    allowReceipt: true,
    allowLegal: false,
    allowDispute: false
  },
  PRO: {
    name: "Pro",
    limitJobs: Infinity,
    allowAI: true,
    allowSMS: true,
    allowReceipt: true,
    allowLegal: false,
    allowDispute: true
  },
  ENTERPRISE: {
    name: "Enterprise",
    limitJobs: Infinity,
    allowAI: true,
    allowSMS: true,
    allowReceipt: true,
    allowLegal: true,
    allowDispute: true
  }
};

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  company: string;
  role: UserRole;
  createdAt: number;
  aiUsageCount: number;
  
  // Subscription
  currentPlanId?: string; // 'free', 'basic', 'pro', 'enterprise'
  subscriptionExpiry?: number;
  jobsCreatedThisMonth?: number; // For Free Tier tracking
  lastJobReset?: number;

  skillLevel?: 'Professional' | 'Apprentice';
  
  // Mandatory Compliance Fields
  registrationStatus: RegistrationStatus;
  cacNumber?: string;
  businessAddress?: string;
  ndpcStatus?: 'Registered' | 'In-Progress' | 'Not Registered';
  ndpcReference?: string;
  dpoName?: string;
  dpoEmail?: string;
  legalAcceptedTimestamp?: number;
  lastReadBroadcastTime?: number;
  
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
  
  // AI Data
  aiSuggestions?: AISuggestion[];
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

export interface SubscriptionPlan {
  id: string; // 'free', 'basic', 'pro', 'enterprise'
  name: string;
  price: number;
  durationDays: number;
  description: string;
  features: string[];
  tierLevel: 0 | 1 | 2 | 3;
  isActive: boolean;
}

export interface PaymentRequest {
  id: string;
  userId: string;
  userName: string;
  company: string;
  amount: number;
  confirmedAmount: number;
  plan: string;
  planId: string;
  durationDays?: number;
  status: PaymentStatus;
  timestamp: number;
}

export interface AdminMessage {
  id: string;
  from: string;
  toCompany: string; // 'HQ' for replies, 'ALL' or CompanyName for directives
  senderCompany?: string; // To easily track which company sent a reply
  content: string;
  timestamp: number;
  type?: 'directive' | 'reply' | 'complaint';
  status?: 'pending' | 'reviewing' | 'resolved'; // For complaint tracking
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
