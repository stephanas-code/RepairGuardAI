
import { RepairJob, User, PaymentRequest, AdminMessage, SMSLog, DraftRepair, SubscriptionPlan, TIER_FEATURES } from './types';

const DB_NAME = 'RepairGuardDB_v5'; // Incremented for new schema
const DB_VERSION = 8;
const STORES = {
  REPAIRS: 'repairs',
  USERS: 'users',
  SETTINGS: 'app_settings',
  PAYMENTS: 'payments',
  MESSAGES: 'messages',
  COMPLIANCE: 'compliance_logs',
  SMS: 'sms_logs',
  DRAFTS: 'drafts',
  PLANS: 'plans'
};

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = async (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.REPAIRS)) {
        db.createObjectStore(STORES.REPAIRS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.USERS)) {
        const userStore = db.createObjectStore(STORES.USERS, { keyPath: 'id' });
        userStore.createIndex('username', 'username', { unique: true });
      }
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.PAYMENTS)) {
        db.createObjectStore(STORES.PAYMENTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
        db.createObjectStore(STORES.MESSAGES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.COMPLIANCE)) {
        db.createObjectStore(STORES.COMPLIANCE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.SMS)) {
        db.createObjectStore(STORES.SMS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.DRAFTS)) {
        db.createObjectStore(STORES.DRAFTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.PLANS)) {
        const planStore = db.createObjectStore(STORES.PLANS, { keyPath: 'id' });
        // Seed Default Plans
        const defaultPlans: SubscriptionPlan[] = [
          {
            id: 'free',
            name: 'Tier 0 - Free Trial',
            price: 0,
            durationDays: 30, // Perpetual renewal logic handled in app
            description: 'Adoption & Learning. Limited to 5 jobs/mo. Watermarked records.',
            features: ['5 Jobs/Month', 'Basic Logging', 'Unverified Records'],
            tierLevel: 0,
            isActive: true
          },
          {
            id: 'basic',
            name: 'Tier 1 - Basic',
            price: 3000,
            durationDays: 30,
            description: 'Small shops. Unlimited records, AI suggestions, SMS, Trust Receipts.',
            features: ['Unlimited Jobs', 'AI Suggestions', 'SMS Notifications', 'QR Trust Receipt'],
            tierLevel: 1,
            isActive: true
          },
          {
            id: 'pro',
            name: 'Tier 2 - Pro',
            price: 7000,
            durationDays: 30,
            description: 'Professional Workshops. Dispute mode, evidence hash-chain, PDF export.',
            features: ['Dispute Mode', 'Evidence Hash-Chain', 'PDF Export', 'Priority Support'],
            tierLevel: 2,
            isActive: true
          },
          {
            id: 'enterprise',
            name: 'Tier 3 - Enterprise',
            price: 15000,
            durationDays: 30,
            description: 'Legal Shield. Court-ready export, NDPC Audit support, Custom retention.',
            features: ['Justice Mode', 'NDPC Audit Pkg', 'SLA Support', 'Multi-branch'],
            tierLevel: 3,
            isActive: true
          }
        ];
        
        // Cannot use await inside upgradeneeded for put operations in the same transaction easily
        // But for object store creation, we populate initial data
        defaultPlans.forEach(plan => planStore.put(plan));
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveUser = async (user: User): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.USERS, 'readwrite');
    tx.objectStore(STORES.USERS).put(user);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const logComplianceEvent = async (event: { action: string, data: any }): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(STORES.COMPLIANCE, 'readwrite');
  tx.objectStore(STORES.COMPLIANCE).put({
    id: `log-${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    ...event
  });
};

export const getUserByUsername = async (username: string): Promise<User | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.USERS, 'readonly');
    const store = tx.objectStore(STORES.USERS);
    const index = store.index('username');
    const request = index.get(username);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

export const getAllUsers = async (): Promise<User[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.USERS, 'readonly');
    const request = tx.objectStore(STORES.USERS).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getUsersByCompany = async (company: string): Promise<User[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.USERS, 'readonly');
    const request = tx.objectStore(STORES.USERS).getAll();
    request.onsuccess = () => {
        const all = request.result as User[];
        resolve(all.filter(u => u.company === company));
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveRepair = async (job: RepairJob): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.REPAIRS, 'readwrite');
    tx.objectStore(STORES.REPAIRS).put(job);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getRepairsForUser = async (user: User): Promise<RepairJob[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.REPAIRS, 'readonly');
    const store = tx.objectStore(STORES.REPAIRS);
    const request = store.getAll();
    request.onsuccess = () => {
      const all = request.result as RepairJob[];
      if (user.role === 'super_admin' || user.role === 'admin') resolve(all);
      else if (user.role === 'manager') resolve(all.filter(job => job.company === user.company));
      else resolve(all.filter(job => job.userId === user.id));
    };
    request.onerror = () => reject(request.error);
  });
};

export const getAllRepairs = async (): Promise<RepairJob[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.REPAIRS, 'readonly');
    const request = tx.objectStore(STORES.REPAIRS).getAll();
    request.onsuccess = () => resolve(request.result.sort((a: any, b: any) => b.createdAt - a.createdAt));
    request.onerror = () => reject(request.error);
  });
};

export const savePayment = async (pay: PaymentRequest): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(STORES.PAYMENTS, 'readwrite');
  tx.objectStore(STORES.PAYMENTS).put(pay);
};

export const getAllPayments = async (): Promise<PaymentRequest[]> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORES.PAYMENTS, 'readonly');
    const request = tx.objectStore(STORES.PAYMENTS).getAll();
    request.onsuccess = () => resolve(request.result);
  });
};

export const saveMessage = async (msg: AdminMessage): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(STORES.MESSAGES, 'readwrite');
  tx.objectStore(STORES.MESSAGES).put(msg);
};

export const getMessagesForCompany = async (company: string): Promise<AdminMessage[]> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORES.MESSAGES, 'readonly');
    const request = tx.objectStore(STORES.MESSAGES).getAll();
    request.onsuccess = () => {
      const all = request.result as AdminMessage[];
      resolve(all.filter(m => 
        m.toCompany === 'ALL' || 
        m.toCompany === company || 
        (m.toCompany === 'HQ' && m.senderCompany === company) // Include sent messages
      ));
    };
  });
};

export const setSetting = async (key: string, value: any): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(STORES.SETTINGS, 'readwrite');
  tx.objectStore(STORES.SETTINGS).put({ key, value });
};

export const getSetting = async (key: string): Promise<any> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORES.SETTINGS, 'readonly');
    const request = tx.objectStore(STORES.SETTINGS).get(key);
    request.onsuccess = () => resolve(request.result?.value || null);
  });
};

export const saveSMS = async (sms: SMSLog): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(STORES.SMS, 'readwrite');
  tx.objectStore(STORES.SMS).put(sms);
};

export const getSMSForRepair = async (repairId: string): Promise<SMSLog[]> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORES.SMS, 'readonly');
    const request = tx.objectStore(STORES.SMS).getAll();
    request.onsuccess = () => {
      const all = request.result as SMSLog[];
      resolve(all.filter(s => s.repairId === repairId).sort((a,b) => b.timestamp - a.timestamp));
    };
  });
};

// Draft Functions
export const saveDraft = async (draft: DraftRepair): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(STORES.DRAFTS, 'readwrite');
  tx.objectStore(STORES.DRAFTS).put(draft);
};

export const getDraftsForCompany = async (company: string): Promise<DraftRepair[]> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORES.DRAFTS, 'readonly');
    const request = tx.objectStore(STORES.DRAFTS).getAll();
    request.onsuccess = () => {
      const all = request.result as DraftRepair[];
      resolve(all.filter(d => d.company === company).sort((a,b) => b.timestamp - a.timestamp));
    };
  });
};

export const deleteDraft = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.DRAFTS, 'readwrite');
    tx.objectStore(STORES.DRAFTS).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// Plan Functions
export const savePlan = async (plan: SubscriptionPlan): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(STORES.PLANS, 'readwrite');
  tx.objectStore(STORES.PLANS).put(plan);
};

export const getAllPlans = async (): Promise<SubscriptionPlan[]> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORES.PLANS, 'readonly');
    const request = tx.objectStore(STORES.PLANS).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
};

export const getPlanById = async (id: string): Promise<SubscriptionPlan | null> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORES.PLANS, 'readonly');
    const request = tx.objectStore(STORES.PLANS).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
};

export const deletePlan = async (id: string): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(STORES.PLANS, 'readwrite');
  tx.objectStore(STORES.PLANS).delete(id);
};

// Helper to check and reset job count for monthly limits
export const checkJobLimit = async (user: User): Promise<{ allowed: boolean, user: User }> => {
    const now = Date.now();
    const lastReset = user.lastJobReset || 0;
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    
    let updatedUser = { ...user };
    
    // Reset if month has passed
    if (now - lastReset > oneMonth) {
        updatedUser.jobsCreatedThisMonth = 0;
        updatedUser.lastJobReset = now;
        await saveUser(updatedUser);
    }

    const currentPlanId = updatedUser.currentPlanId || 'free';
    // Free tier limit is 5
    if (currentPlanId === 'free') {
        if ((updatedUser.jobsCreatedThisMonth || 0) >= TIER_FEATURES.FREE.limitJobs) {
            return { allowed: false, user: updatedUser };
        }
    }

    return { allowed: true, user: updatedUser };
};
