
export type Language = 'ar' | 'en';
export type QuoteCurrency = 'KWD' | 'SAR' | 'AED' | 'USD' | 'EGP' | 'QAR' | 'BHD' | 'OMR' | 'JOD' | 'EUR' | 'GBP';
export type Jurisdiction = 'kw' | 'sa' | 'ae' | 'eg' | 'bh' | 'qa' | 'intl';
export type ItemStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'paid';

// --- QanoonAI Types ---
export type AITone = 'formal' | 'simplified' | 'detailed' | 'strategic' | 'assertive' | 'consultative';

export interface ChatSession {
    id: string;
    title: string;
    date: string;
    messages: { role: 'user' | 'model'; text: string; attachment?: any }[];
    projectId?: string;
    isIncognito?: boolean;
}

export interface LegalProject {
    id: string;
    name: string;
    description?: string;
    knowledgeFiles: { name: string; content: string; type: string }[];
    createdAt: string;
}

// --- Company Info ---
export interface AuthorizedSignatory {
    name: string;
    role?: string;
    civilId: string;
    nationality: string;
    passport?: string;
    signature?: string;
}

export interface Integrations {
    cloudSync?: {
        enabled: boolean;
        provider: 'firebase' | 'supabase';
        apiKey?: string;
        projectId?: string;
    };
    paymentGateway?: {
        enabled: boolean;
        provider: 'stripe' | 'tap' | 'myfatoorah';
        publishableKey?: string;
        secretKey?: string;
        testMode?: boolean;
    };
    inventory?: {
        enabled: boolean;
        enableLowStockAlerts?: boolean;
        alertEmail?: string;
        enablePurchaseOrders?: boolean;
    };
    currency?: {
        enabled: boolean;
        provider: 'exchangerate-api' | 'fixer';
        apiKey?: string;
        baseCurrency?: QuoteCurrency;
    };
    googleDrive?: {
        enabled: boolean;
        clientId?: string;
        autoBackup?: boolean;
        lastSync?: string;
    };
}

export interface CompanyInfo {
  name: string;
  industry?: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  logo?: string;
  bankName?: string;
  iban?: string;
  accountNumber?: string;
  swiftCode?: string;
  licenseNumber?: string;
  country?: string;
  authorizedSignatory?: AuthorizedSignatory;
  documents?: Attachment[];
  integrations?: Integrations;
}

// --- Database Types ---
export interface Attachment {
    id: string;
    name: string;
    type: 'image' | 'pdf' | 'other';
    dataUrl: string;
    uploadedAt: string;
}

export interface CivilIdEntry {
    id: string;
    value: string;
    label?: string; // Context: e.g., "Main", "Contract 2024", "Case #123"
}

export interface DbClient {
  id: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
  currency?: QuoteCurrency; 
  civilIds?: CivilIdEntry[]; // Support for multiple linked IDs
  attachments?: Attachment[];
}

export interface DbProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: QuoteCurrency;
  itemType?: 'product' | 'service';
  stock?: number;
  minStockLevel?: number;
  attachments?: Attachment[];
}

export interface DbEmployee {
    id: string;
    name: string;
    role: string;
    email: string;
    phone: string;
    salary: number;
    currency: QuoteCurrency;
    joinDate: string;
    civilId?: string;
    attachments?: Attachment[];
}

export interface DbCompany {
    id: string;
    name: string;
    address: string;
    phone: string;
    licenseNumber?: string;
    logo?: string;
    isDefault?: boolean;
    type?: 'parent' | 'branch';
    parentId?: string;
    attachments?: Attachment[]; 
}

// --- Accounting Types ---
export interface Expense {
    id: string;
    description: string;
    amount: number;
    category: string;
    date: string;
    currency: QuoteCurrency;
    responsiblePerson?: string;
    attachments?: Attachment[];
}

// --- Operations Types ---
export interface TimeEntry {
    id: string;
    description: string;
    clientId?: string;
    startTime: string;
    endTime?: string;
    durationSeconds: number;
    hourlyRate: number;
    currency: QuoteCurrency;
    status: 'running' | 'completed' | 'billed';
}

export interface RecurringProfile {
    id: string;
    title: string;
    clientName: string;
    frequency: 'monthly' | 'quarterly' | 'yearly';
    nextDueDate: string;
    amount: number;
    currency: QuoteCurrency;
    templateData: Quote;
    lastGenerated?: string;
    active: boolean;
}

// --- Legal & Compliance Types ---
export type LegalTaskType = 'licensing' | 'dispute' | 'incorporation' | 'renewal' | 'minutes' | 'other';
export type LegalTaskStatus = 'pending' | 'in_progress' | 'completed' | 'urgent';

export interface LegalTask {
    id: string;
    title: string;
    type: LegalTaskType;
    status: LegalTaskStatus;
    dueDate: string;
    description?: string;
    assignedTo?: string;
}

export interface ComplianceCheckResult {
    score: number;
    issues: string[];
    recommendations: string[];
    missingDocuments: string[];
    riskLevel: 'low' | 'medium' | 'high';
}

export interface ContractAuditResult {
    score: number;
    risks: string[];
    loopholes: string[];
    summary: string;
}

// --- Notification Types ---
export interface Notification {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    date?: string;
    read?: boolean;
    relatedItemId?: string;
}

// --- History/Portfolio Types ---
export interface SavedItem {
    id: string;
    type: 'quote' | 'contract' | 'document';
    title: string;
    clientName: string;
    status: ItemStatus;
    createdAt: string;
    updatedAt: string;
    expiryDate?: string;
    data: Quote | Contract | GenericDocument;
}

// --- Quote Types ---

export interface QuoteItem {
  id: number;
  description: string;
  qty: number;
  price: number;
  productId?: string;
}

export interface Client {
  name: string;
  address: string;
  phone: string;
}

export interface Quote {
  id:string;
  client: Client;
  items: QuoteItem[];
  currency: QuoteCurrency;
  discount: number;
  tax: number;
  issueDate: string;
  validityType: 'temporary' | 'open';
  expiryDate?: string;
  isInvoice?: boolean;
  invoiceDate?: string;
  paymentLink?: string;
  paymentStatus?: 'unpaid' | 'paid';
  viewedAt?: string;
  clientSignature?: string;
  signedAt?: string;
}

export interface QuoteTemplate {
  id: string;
  nameKey: string;
  defaultItems: (Omit<QuoteItem, 'id' | 'description'> & { descriptionKey: string })[];
}


// --- Contract Types ---

export interface ContractTemplateVariable {
  labelKey: string;
  labelsKeys?: {
      company: string;
      individual: string;
  };
  type: 'text' | 'date' | 'number' | 'textarea' | 'signature';
  descriptionKey?: string;
  options?: { value: string; labelKey: string }[];
  context?: string | 'company' | 'individual';
}

export interface ContractTemplate {
  id: string;
  nameKey: string;
  contentKey: string;
  switchableParties?: string[];
  variables: {
    [key: string]: ContractTemplateVariable;
  }
}

export type ContractData = {
    [key: string]: string | number;
}

export interface CustomArticle {
    id: number;
    title: string;
    content: string;
}

export interface Contract {
    templateId: string;
    jurisdiction: Jurisdiction;
    data: ContractData;
    customArticles?: CustomArticle[];
}


// --- Document Types ---

export interface DocumentTemplateVariable {
  labelKey: string;
  type: 'text' | 'date' | 'number' | 'textarea' | 'signature';
  descriptionKey?: string;
}

export interface DocumentTemplate {
  id: string;
  nameKey: string;
  contentKey: string;
  variables: {
    [key: string]: DocumentTemplateVariable;
  }
}

export type DocumentData = {
    [key: string]: string | number;
}

export interface CustomSection {
    id: number;
    title: string;
    content: string;
}

export interface GenericDocument {
    templateId: string;
    data: DocumentData;
    customSections?: CustomSection[];
}
