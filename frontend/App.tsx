import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Quote, Language, Contract, CompanyInfo, GenericDocument, SavedItem, ItemStatus, DbClient, DbProduct, DbEmployee, DbCompany, Notification, RecurringProfile } from './types';
import { QuoteBuilder } from './components/QuoteBuilder';
import { PreviewPane } from './components/PreviewPane';
import { ContractBuilder } from './components/ContractBuilder';
import { ContractPreview } from './components/ContractPreview';
import { DocumentBuilder } from './components/DocumentBuilder';
import { DocumentPreview } from './components/DocumentPreview';
import { Dashboard } from './components/Dashboard';
import { CompanyInfoBuilder } from './components/CompanyInfoBuilder';
import { ClientManager } from './components/ClientManager';
import { ProductManager } from './components/ProductManager';
import { EmployeeManager } from './components/EmployeeManager';
import { CompanyManager } from './components/CompanyManager';
import { AccountingHelper } from './components/AccountingHelper';
// New Components
import { LegalHub } from './components/LegalHub';
import { BankCompliance } from './components/BankCompliance';
import { QanoonAI } from './components/QanoonAI';
import { Diwan } from './components/Diwan';
import { LockScreen } from './components/LockScreen'; 
import { TimeTracker } from './components/TimeTracker';
import { RecurringManager } from './components/RecurringManager';
import { ClientPortal } from './components/ClientPortal';
import { AboutApp } from './components/AboutApp';
import { IntegrationsSettings } from './components/IntegrationsSettings';

import { contractTemplates } from './data/contractTemplates';
import { quoteTemplates } from './data/quoteTemplates';
import { documentTemplates } from './data/documentTemplates';
import { generateLogoImage } from './services/geminiService';
import { secureGetItem, secureSetItem } from './utils/secureStorage'; 

import { useTranslation } from 'react-i18next';
import { 
  Image as ImageIcon, Sparkles, FileText, File, 
  Briefcase, Settings, Menu, X, Save, FolderOpen, ChevronRight, User,
  CheckCircle, Palette, Edit3, Users, Package, Building2, ChevronLeft,
  Bell, AlertTriangle, Info, Archive, PieChart, Download, Upload,
  Home, PlusCircle, MoreHorizontal, LayoutGrid, LogOut, Crown, Clock,
  FileDown, Share2, Calendar, AlertCircle, Scale, Landmark, Trash2, Check, Search, Lock, Bot, RefreshCw, Cloud, Moon, Sun, Link as LinkIcon, Database, BookOpen
} from 'lucide-react';

type View = 'dashboard' | 'history' | 'quote' | 'contract' | 'document' | 'settings' | 'clients' | 'products' | 'employees' | 'companies' | 'accounting' | 'legal-hub' | 'bank-compliance' | 'qanoon-ai' | 'time-tracker' | 'recurring' | 'diwan';

const createInitialQuote = (): Quote => ({
  id: `Q-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000) + 1).padStart(4, '0')}`,
  client: { name: '', address: '', phone: '' },
  items: [{ id: Date.now(), description: '', qty: 1, price: 0 }],
  currency: 'KWD',
  discount: 0,
  tax: 0,
  issueDate: new Date().toISOString().split('T')[0],
  validityType: 'temporary',
  expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  isInvoice: false
});

// Inactivity Timeout (e.g., 5 minutes)
const INACTIVITY_LIMIT = 5 * 60 * 1000; 

export const App: React.FC = () => {
  const { t, i18n } = useTranslation(['common', 'dashboard', 'quotes', 'contracts', 'documents', 'clients', 'products', 'settings', 'accounting', 'ai', 'employees', 'companies', 'legal', 'timeTracker', 'recurring', 'diwan', 'bankCompliance']);
  const setLanguage = (lang: Language) => i18n.changeLanguage(lang);

  const [isLocked, setIsLocked] = useState(true); // Default to locked on load
  
  // Theme State - Improved Initialization
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
      if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('mashhor-theme');
          if (stored) return stored as 'light' | 'dark';
          // If no stored preference, check system preference
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
  });

  useEffect(() => {
      const root = document.documentElement;
      if (theme === 'dark') {
          root.classList.add('dark');
      } else {
          root.classList.remove('dark');
      }
      localStorage.setItem('mashhor-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const [currentView, setCurrentView] = useState<View>('dashboard');
  // Sub-navigation state for Settings view
  const [settingsSection, setSettingsSection] = useState<'menu' | 'company' | 'integrations' | 'data' | 'about'>('menu');

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); 
  const [isFormValid, setIsFormValid] = useState<boolean>(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Mobile View Toggle (Editor vs Preview)
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');

  // Client Portal Simulation State
  const [isClientPortalOpen, setIsClientPortalOpen] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // -- State for "Save As" Modal --
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<ItemStatus>('draft');
  const [saveExpiryDate, setSaveExpiryDate] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // -- Application Data State --
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [dbClients, setDbClients] = useState<DbClient[]>([]);
  const [dbProducts, setDbProducts] = useState<DbProduct[]>([]);
  const [dbEmployees, setDbEmployees] = useState<DbEmployee[]>([]);
  const [dbCompanies, setDbCompanies] = useState<DbCompany[]>([]);
  
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: 'MashhorQuote',
    industry: '',
    address: 'Kuwait City, Kuwait',
    phone: '+965 1234 5678',
    logo: '',
    authorizedSignatory: {
        name: '',
        civilId: '',
        nationality: '',
        signature: ''
    },
    documents: []
  });
  
  const [quote, setQuote] = useState<Quote>(createInitialQuote());
  
  const [contract, setContract] = useState<Contract>({
    templateId: contractTemplates[0].id,
    jurisdiction: 'kw',
    data: { issueDate: new Date().toISOString().split('T')[0] },
    customArticles: [],
  });
  
  const [genericDocument, setGenericDocument] = useState<GenericDocument>({
    templateId: documentTemplates[0].id,
    data: { issueDate: new Date().toISOString().split('T')[0] },
    customSections: [],
  });

  // Activity Logging
  const [lastLoginTime, setLastLoginTime] = useState<string>('');

  // --- Activity Recording & Location ---
  const recordLoginActivity = () => { 
      const now = new Date().toLocaleString();
      setLastLoginTime(now);
  };
  useEffect(() => { if (!isLocked) recordLoginActivity(); }, [isLocked]);

  // --- Notification System ---
  const notify = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
      const id = Date.now().toString();
      const newNotif: Notification = { id, message, type, date: new Date().toISOString(), read: false };
      setNotifications(prev => [newNotif, ...prev]);
      setTimeout(() => { setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)); }, 5000);
  };
  const markAsRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllAsRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  const clearAllNotifications = () => setNotifications([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  // --- Load/Save Data ---
  useEffect(() => {
    const loadData = (key: string, setter: (val: any) => void, isArray = true) => {
        const data = secureGetItem(key); 
        if(data) {
            if (isArray && Array.isArray(data)) setter(data);
            else if (!isArray && data) setter(data);
        }
    };
    loadData('mashhorquote-portfolio', setSavedItems, true);
    loadData('mashhorquote-clients', setDbClients, true);
    loadData('mashhorquote-products', setDbProducts, true);
    loadData('mashhorquote-employees', setDbEmployees, true);
    loadData('mashhorquote-companies', setDbCompanies, true);
    loadData('mashhorquote-settings', setCompanyInfo, false);
  }, []);

  useEffect(() => { secureSetItem('mashhorquote-settings', companyInfo); }, [companyInfo]);
  useEffect(() => { secureSetItem('mashhorquote-clients', dbClients); }, [dbClients]);
  useEffect(() => { secureSetItem('mashhorquote-products', dbProducts); }, [dbProducts]);
  useEffect(() => { secureSetItem('mashhorquote-employees', dbEmployees); }, [dbEmployees]);
  useEffect(() => { secureSetItem('mashhorquote-companies', dbCompanies); }, [dbCompanies]);

  // --- Handlers ---
  const initiateSave = () => setIsSaveModalOpen(true);
  const confirmSave = () => {
      if (!saveTitle) return;
      
      const newItem: SavedItem = {
          id: editingItemId || Date.now().toString(),
          type: currentView as 'quote' | 'contract' | 'document',
          title: saveTitle,
          clientName: currentView === 'quote' ? quote.client.name : currentView === 'contract' ? (contract.data['partyB.name'] || contract.data['employee.name'] || '') as string : (genericDocument.data['recipientName'] || ''),
          status: saveStatus,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiryDate: saveExpiryDate,
          data: currentView === 'quote' ? quote : currentView === 'contract' ? contract : genericDocument
      };

      setSavedItems(prev => {
          const filtered = editingItemId ? prev.filter(i => i.id !== editingItemId) : prev;
          return [newItem, ...filtered];
      });
      
      secureSetItem('mashhorquote-portfolio', [newItem, ...savedItems.filter(i => i.id !== editingItemId)]);
      setIsSaveModalOpen(false);
      notify(t('quotes:saved'), 'success');
      setEditingItemId(null);
      setSaveTitle('');
  };

  const handleLoadItem = (item: SavedItem) => {
      if (item.type === 'quote') {
          setQuote(item.data as Quote);
          setCurrentView('quote');
      } else if (item.type === 'contract') {
          setContract(item.data as Contract);
          setCurrentView('contract');
      } else {
          setGenericDocument(item.data as GenericDocument);
          setCurrentView('document');
      }
      setEditingItemId(item.id);
      setSaveTitle(item.title);
      setSaveStatus(item.status);
      setSaveExpiryDate(item.expiryDate || '');
      setMobileTab('preview');
  };

  const createNew = (view: View) => {
      setEditingItemId(null);
      setSaveTitle('');
      setSaveStatus('draft');
      setSaveExpiryDate('');
      
      if (view === 'quote') setQuote(createInitialQuote());
      else if (view === 'contract') setContract({ templateId: contractTemplates[0].id, jurisdiction: 'kw', data: { issueDate: new Date().toISOString().split('T')[0] }, customArticles: [] });
      else if (view === 'document') setGenericDocument({ templateId: documentTemplates[0].id, data: { issueDate: new Date().toISOString().split('T')[0] }, customSections: [] });
      
      setCurrentView(view);
      setMobileTab('editor');
  };

  const handleDeleteItem = (id: string) => {
      if(confirm(t('common:confirm'))) {
          const newItems = savedItems.filter(i => i.id !== id);
          setSavedItems(newItems);
          secureSetItem('mashhorquote-portfolio', newItems);
          if (editingItemId === id) createNew(currentView as any);
          notify(t('common:deleted'), 'success');
      }
  };

  const handleDuplicateItem = (id: string) => {
      const item = savedItems.find(i => i.id === id);
      if (item) {
          const newItem = { ...item, id: Date.now().toString(), title: `${item.title} (${t('common:copy')})`, updatedAt: new Date().toISOString() };
          setSavedItems([newItem, ...savedItems]);
          secureSetItem('mashhorquote-portfolio', [newItem, ...savedItems]);
          notify(t('common:duplicated'), 'success');
      }
  };

  const handleExportData = () => {
      const dataStr = JSON.stringify({ savedItems, dbClients, dbProducts, dbEmployees, dbCompanies, companyInfo });
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `mashhor_backup_${new Date().toISOString().split('T')[0]}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const data = JSON.parse(event.target?.result as string);
              if (data.savedItems) setSavedItems(data.savedItems);
              if (data.dbClients) setDbClients(data.dbClients);
              if (data.dbProducts) setDbProducts(data.dbProducts);
              if (data.dbEmployees) setDbEmployees(data.dbEmployees);
              if (data.dbCompanies) setDbCompanies(data.dbCompanies);
              if (data.companyInfo) setCompanyInfo(data.companyInfo);
              notify(t('common:restored'), 'success');
          } catch (err) {
              notify(t('common:importFailed'), 'error');
          }
      };
      reader.readAsText(file);
  };

  const handleGoogleDriveBackup = async () => {
      notify(t('common:backingUp'), 'info');
      setTimeout(() => notify(t('common:backupSuccess'), 'success'), 2000);
  };

  const handleQuoteTemplateChange = (templateId: string) => {
      const template = quoteTemplates.find(t => t.id === templateId);
      if (template) {
          setQuote(prev => ({
              ...prev,
              items: template.defaultItems.map((item, idx) => ({
                  ...item,
                  id: Date.now() + idx,
                  description: t(item.descriptionKey) || ''
              }))
          }));
      }
  };

  const handleGenerateRecurringInvoice = (profile: RecurringProfile) => {
      const newQuote = { ...profile.templateData, id: `INV-${Date.now()}`, issueDate: new Date().toISOString().split('T')[0], isInvoice: true };
      setQuote(newQuote);
      setCurrentView('quote');
      setMobileTab('preview');
  };

  const convertQuoteToContract = (q: Quote) => {
      setContract({
          templateId: 'custom',
          jurisdiction: 'kw',
          data: {
              contractTitle: `Agreement for Quote #${q.id}`,
              issueDate: q.issueDate,
              'partyB.name': q.client.name,
              amount: q.items.reduce((a,b) => a + (b.price * b.qty), 0)
          },
          customArticles: q.items.map((item, idx) => ({
              id: Date.now() + idx,
              title: `Item ${idx+1}: ${item.description}`,
              content: `The provider agrees to supply ${item.qty} units of the described item at a unit price of ${item.price} ${q.currency}.`
          }))
      });
      setCurrentView('contract');
      setMobileTab('editor');
  };

  const convertQuoteToDocument = (q: Quote) => {
      setGenericDocument({
          templateId: 'custom',
          data: {
              documentTitle: `Document for Quote #${q.id}`,
              issueDate: q.issueDate,
              recipientName: q.client.name,
              amount: q.items.reduce((a,b) => a + (b.price * b.qty), 0),
              currency: q.currency
          },
          customSections: []
      });
      setCurrentView('document');
      setMobileTab('editor');
  };

const handleClientPortalAction = (signature?: string) => {
  if (signature) {
      setQuote(prev => ({ ...prev, clientSignature: signature, signedAt: new Date().toISOString(), status: 'approved' as ItemStatus }));
      notify(t('common:clientSigned'), 'success');
  } else {
      setQuote(prev => ({ ...prev, status: 'rejected' as ItemStatus }));
      notify(t('common:clientRejected'), 'warning');
  }
  setIsClientPortalOpen(false);
};

  // --- Navigation Items ---
  const navItems = [
    { id: 'dashboard', icon: Home, label: t('dashboard:title') },
    { id: 'qanoon-ai', icon: Bot, label: t('ai:qanoonAi') },
    { id: 'diwan', icon: BookOpen, label: t('diwan:tab') }, 
    { id: 'history', icon: Archive, label: t('dashboard:history') },
    { id: 'quote', icon: FileText, label: t('quotes:tab') },
    { id: 'contract', icon: Briefcase, label: t('contracts:tab') },
    { id: 'document', icon: File, label: t('documents:tab') },
    { id: 'time-tracker', icon: Clock, label: t('timeTracker:tab') },
    { id: 'recurring', icon: RefreshCw, label: t('recurring:tab') },
    { id: 'clients', icon: Users, label: t('clients:tab') },
    { id: 'products', icon: Package, label: t('products:tab') },
    { id: 'employees', icon: Users, label: t('employees:tab') },
    { id: 'companies', icon: Building2, label: t('companies:tab') },
    { id: 'accounting', icon: PieChart, label: t('accounting:tab') },
    { id: 'legal-hub', icon: Scale, label: t('legal:hub') },
    { id: 'bank-compliance', icon: Landmark, label: t('bankCompliance:tab') },
    { id: 'settings', icon: Settings, label: t('settings:tab') },
  ];

  if (isLocked) return <LockScreen onUnlock={() => setIsLocked(false)} language={i18n.language as Language} />;
  if (isClientPortalOpen) return <ClientPortal quote={{...quote, viewedAt: new Date().toISOString()}} companyInfo={companyInfo} language={i18n.language as Language} onApprove={handleClientPortalAction} onReject={() => handleClientPortalAction()} onClose={() => setIsClientPortalOpen(false)} />;

  // Check if current view is an editor view
  const isEditorView = ['quote', 'contract', 'document'].includes(currentView);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden" dir={i18n.dir()}>
      {/* Mobile Navbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-sm z-50 h-16 flex items-center justify-between px-4 safe-top">
          <div className="flex items-center gap-3">
              <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <Menu size={24}/>
              </button>
              <div className="flex items-center gap-2">
                  {companyInfo.logo ? (
                      <img src={companyInfo.logo} alt="Logo" className="w-8 h-8 rounded-full object-contain bg-gray-100 border border-gray-200" />
                  ) : null}
                  <h1 className="text-lg font-bold text-blue-600 dark:text-white truncate">{companyInfo.name || t('common:title')}</h1>
              </div>
          </div>
          <div className="flex items-center gap-2">
              <button onClick={toggleTheme} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">
                  {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 relative text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <Bell size={22} />
                  {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-white dark:border-gray-800"></span>}
              </button>
          </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-40 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-4 flex items-center justify-between h-16">
            {!isSidebarCollapsed && <h1 className="text-xl font-black text-blue-600 dark:text-white truncate tracking-tight">MashhorQuote<span className="text-amber-500">.</span></h1>}
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                {isSidebarCollapsed ? <ChevronRight size={20} className="rtl:rotate-180"/> : <ChevronLeft size={20} className="rtl:rotate-180" />}
            </button>
        </div>
        <div className="flex-1 overflow-y-auto py-4 scrollbar-hide">
            <nav className="px-3 space-y-1">
                {navItems.map(item => (
                    <button key={item.id} onClick={() => setCurrentView(item.id as View)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${currentView === item.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'}`} title={isSidebarCollapsed ? item.label : ''}>
                        <item.icon size={20} strokeWidth={currentView === item.id ? 2.5 : 2} className={`transition-colors ${currentView === item.id ? 'text-blue-600 dark:text-blue-400' : item.id === 'qanoon-ai' ? 'text-amber-500' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}/>
                        {!isSidebarCollapsed && <span>{item.label}</span>}
                        {!isSidebarCollapsed && item.id === 'qanoon-ai' && <span className="ml-auto px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-bold">AI</span>}
                    </button>
                ))}
            </nav>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <button onClick={() => setIsLocked(true)} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition`}>
                <Lock size={18} />{!isSidebarCollapsed && <span>{t('common:lockApp')}</span>}
            </button>
            <button onClick={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')} className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition`}><span className="font-bold uppercase text-xs bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded">{i18n.language === 'ar' ? 'EN' : 'AR'}</span>{!isSidebarCollapsed && <span>{t('common:language')}</span>}</button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
              <div className="absolute top-0 left-0 bottom-0 w-3/4 max-w-xs bg-white dark:bg-gray-800 shadow-2xl flex flex-col animate-slide-in-right rtl:right-0 rtl:left-auto">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('common:menu')}</h2>
                      <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-1">
                      {navItems.map(item => (
                          <button key={item.id} onClick={() => { setCurrentView(item.id as View); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition ${currentView === item.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}>
                              <item.icon size={20} className={item.id === 'qanoon-ai' ? 'text-amber-500' : ''}/> {item.label}
                          </button>
                      ))}
                  </div>
                  <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
                      <button onClick={() => setIsLocked(true)} className="w-full py-3 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl text-sm font-bold flex items-center justify-center gap-2"><Lock size={16} /> {t('common:lockApp')}</button>
                      <button onClick={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')} className="w-full py-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm font-bold">{t('common:language')}</button>
                  </div>
              </div>
          </div>
      )}

      {/* Global FAB */}
      {currentView !== 'qanoon-ai' && (
          <div className="fixed bottom-6 right-6 z-[100] animate-fade-in rtl:left-6 rtl:right-auto">
              <button onClick={() => setCurrentView('qanoon-ai')} className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all flex items-center justify-center group relative" title={t('ai:qanoonAi')}>
                  <Bot size={28} className="group-hover:rotate-12 transition-transform"/><span className="absolute -inset-1 bg-amber-500/30 rounded-full animate-ping pointer-events-none"></span>
              </button>
          </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden pt-16 md:pt-0 relative w-full">
          {/* Desktop Header */}
          <header className="hidden md:flex h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 items-center justify-between z-30">
              <div className="flex items-center gap-4 flex-1">
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white whitespace-nowrap">{navItems.find(i => i.id === currentView)?.label}</h2>
                  <div className="relative flex-1 max-w-md mx-8">
                      <Search size={16} className="absolute top-1/2 -translate-y-1/2 left-3 rtl:right-3 rtl:left-auto text-gray-400 pointer-events-none" />
                      <input type="text" placeholder={t('common:searchPlaceholder')} className="w-full pl-10 rtl:pr-10 rtl:pl-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-full text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all"/>
                  </div>
              </div>
              <div className="flex items-center gap-4">
                  <button onClick={toggleTheme} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition">{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button>
                  <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 relative text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                      <Bell size={22} />
                      {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-white dark:border-gray-800"></span>}
                  </button>
                  <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>
                  <div className="flex items-center gap-3 pl-2">
                      <div className="text-right hidden lg:block">
                          <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{companyInfo.name || 'User'}</p>
                          <p className="text-xs text-gray-500 mt-1">{t('common:plan')}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-700 p-0.5 border-2 border-blue-100 dark:border-blue-900 shadow-sm overflow-hidden flex items-center justify-center">
                          {companyInfo.logo ? <img src={companyInfo.logo} alt="Logo" className="w-full h-full object-cover rounded-full" /> : <div className="w-full h-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold">{companyInfo.name ? companyInfo.name.substring(0,1).toUpperCase() : <User size={18}/>}</div>}
                      </div>
                  </div>
              </div>
          </header>

          {/* Notifications Panel */}
          {showNotifications && (
              <div className="absolute top-16 right-4 md:right-6 w-80 md:w-96 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-xl shadow-lg flex flex-col max-h-[calc(100vh-80px)] z-50 border border-gray-200 dark:border-gray-700 animate-fade-in-down">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                      <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-gray-900 dark:text-white">{t('common:notifications')}</h3>
                          {unreadCount > 0 && <span className="px-2 py-0.5 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] font-bold rounded-full">{unreadCount}</span>}
                      </div>
                      <div className="flex gap-2">
                          {unreadCount > 0 && <button onClick={markAllAsRead} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded-lg transition">{t('common:markAllRead')}</button>}
                          {notifications.length > 0 && <button onClick={clearAllNotifications} className="text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded-lg transition"><Trash2 size={14}/></button>}
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
                      {notifications.length === 0 ? (
                          <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center">
                              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center mb-3">
                                  <Bell size={24} className="opacity-50"/>
                              </div>
                              <p className="text-xs font-medium">{t('common:emptyNotif')}</p>
                          </div>
                      ) : (
                          notifications.map(n => (
                              <div key={n.id} onClick={() => markAsRead(n.id)} className={`p-3 rounded-xl cursor-pointer transition-all group relative overflow-hidden border border-transparent hover:border-gray-200 dark:hover:border-gray-700 ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                                  <div className="flex gap-3 items-start relative z-10">
                                      <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${ n.type === 'error' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : n.type === 'warning' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : n.type === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' }`}>
                                          {n.type === 'error' ? <AlertCircle size={16}/> : n.type === 'warning' ? <AlertTriangle size={16}/> : n.type === 'success' ? <CheckCircle size={16}/> : <Info size={16}/>}
                                      </div>
                                      <div className="flex-1">
                                          <p className={`text-xs leading-relaxed ${!n.read ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>{n.message}</p>
                                          <span className="text-[10px] text-gray-400 mt-1 block">{new Date(n.date!).toLocaleDateString()} • {new Date(n.date!).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                      </div>
                                      {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>}
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
                  {notifications.length > 0 && (
                      <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 text-center">
                          <button onClick={() => setShowNotifications(false)} className="text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-white transition">{t('common:cancel')}</button>
                      </div>
                  )}
              </div>
          )}

          {/* View Content */}
          <div className={`flex-1 relative ${isEditorView ? 'h-full overflow-hidden bg-white dark:bg-gray-900' : 'overflow-y-auto scrollbar-hide bg-gray-50/50 dark:bg-gray-900 pb-40'}`}>
              {/* Main Views */}
              {currentView === 'dashboard' && <Dashboard savedItems={savedItems} language={i18n.language as Language} onLoadItem={handleLoadItem} onDeleteItem={handleDeleteItem} onDuplicateItem={handleDuplicateItem} translations={t} mode="portfolio" companyInfo={companyInfo} onCreateNew={createNew} lastLoginTime={lastLoginTime} />}
              {currentView === 'history' && <Dashboard savedItems={savedItems} language={i18n.language as Language} onLoadItem={handleLoadItem} onDeleteItem={handleDeleteItem} onDuplicateItem={handleDuplicateItem} translations={t} mode="history" lastLoginTime={lastLoginTime} />}
              
              {currentView === 'settings' && (
                  <div className="p-4 lg:p-8 max-w-4xl mx-auto">
                      {settingsSection === 'menu' && (
                          <>
                              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t('settings:tab')}</h2>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                  <button onClick={() => setSettingsSection('company')} className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all group h-40">
                                      <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                          <Building2 size={24} />
                                      </div>
                                      <h3 className="font-bold text-gray-900 dark:text-white">{t('settings:companyProfile')}</h3>
                                  </button>
                                  <button onClick={() => setSettingsSection('integrations')} className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all group h-40">
                                      <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                          <LinkIcon size={24} />
                                      </div>
                                      <h3 className="font-bold text-gray-900 dark:text-white">{t('settings:integrations')}</h3>
                                  </button>
                                  <button onClick={() => setSettingsSection('data')} className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all group h-40">
                                      <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                          <Database size={24} />
                                      </div>
                                      <h3 className="font-bold text-gray-900 dark:text-white">{t('settings:dataMgmt')}</h3>
                                  </button>
                                  <button onClick={() => setSettingsSection('about')} className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all group h-40">
                                      <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                          <Info size={24} />
                                      </div>
                                      <h3 className="font-bold text-gray-900 dark:text-white">{t('settings:about')}</h3>
                                  </button>
                              </div>
                          </>
                      )}

                      {settingsSection !== 'menu' && (
                          <>
                              <button onClick={() => setSettingsSection('menu')} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-6 transition-colors text-sm font-bold">
                                  <ChevronRight size={16} className="rtl:rotate-180"/> {t('common:back')}
                              </button>
                              
                              {settingsSection === 'company' && <CompanyInfoBuilder companyInfo={companyInfo} setCompanyInfo={setCompanyInfo} language={i18n.language as Language} />}
                              {settingsSection === 'integrations' && <IntegrationsSettings companyInfo={companyInfo} setCompanyInfo={setCompanyInfo} language={i18n.language as Language} />}
                              {settingsSection === 'about' && <AboutApp language={i18n.language as Language} />}
                              {settingsSection === 'data' && (
                                  <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-fade-in">
                                      <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">{t('settings:dataMgmt')}</h3>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                          <button onClick={handleExportData} className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition flex flex-col items-center gap-3 group">
                                              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                  <Download size={20}/>
                                              </div>
                                              <span className="font-bold text-gray-800 dark:text-gray-200">{t('common:backup')}</span>
                                              <span className="text-xs text-gray-500 text-center">{t('common:backupDesc')}</span>
                                          </button>
                                          
                                          <label className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition flex flex-col items-center gap-3 group cursor-pointer">
                                              <input type="file" className="hidden" onChange={handleImportData} accept=".json" />
                                              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                  <Upload size={20}/>
                                              </div>
                                              <span className="font-bold text-gray-800 dark:text-gray-200">{t('common:restore')}</span>
                                              <span className="text-xs text-gray-500 text-center">{t('common:restoreDesc')}</span>
                                          </label>
                                            <button onClick={handleGoogleDriveBackup} className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition flex flex-col items-center gap-3 group">
                                              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                  <Cloud size={20}/>
                                              </div>
                                              <span className="font-bold text-gray-800 dark:text-gray-200">{t('common:backupToDrive')}</span>
                                              <span className="text-xs text-gray-500 text-center">{t('common:backupToDrive')}</span>
                                          </button>
                                      </div>
                                  </div>
                              )}
                          </>
                      )}
                  </div>
              )}

              {currentView === 'clients' && <ClientManager clients={dbClients} setClients={setDbClients} notify={notify} />}
              {currentView === 'products' && <ProductManager products={dbProducts} setProducts={setDbProducts} language={i18n.language as Language} translations={t} notify={notify} />}
              {currentView === 'employees' && <EmployeeManager employees={dbEmployees} setEmployees={setDbEmployees} language={i18n.language as Language} notify={notify} />}
              {currentView === 'companies' && <CompanyManager companies={dbCompanies} setCompanies={setDbCompanies} activeCompany={companyInfo} setActiveCompany={setCompanyInfo} language={i18n.language as Language} notify={notify} />}
              {currentView === 'accounting' && <AccountingHelper savedItems={savedItems} />}
              
              {/* Specialized Views */}
              {currentView === 'legal-hub' && <LegalHub companyInfo={companyInfo} savedItems={savedItems} notify={notify} setCurrentView={(view) => setCurrentView(view as View)} />}
              {currentView === 'diwan' && <Diwan notify={notify} />}
              {currentView === 'bank-compliance' && <BankCompliance language={i18n.language as Language} />}
              {currentView === 'qanoon-ai' && <QanoonAI notify={notify} setCurrentView={setCurrentView} />}
              
              {currentView === 'time-tracker' && (
                  <TimeTracker 
                    language={i18n.language as Language} 
                    clients={dbClients} 
                    onConvertToInvoice={(q) => { setQuote(q); setCurrentView('quote'); setMobileTab('editor'); }} 
                    notify={notify} 
                  />
              )}
              {currentView === 'recurring' && (
                  <RecurringManager 
                    language={i18n.language as Language} 
                    onGenerateInvoice={(profile) => handleGenerateRecurringInvoice(profile)} 
                    notify={notify} 
                  />
              )}

              {/* Builders (Quote, Contract, Doc) */}
              {(currentView === 'quote' || currentView === 'contract' || currentView === 'document') && (
                  <div className="h-full flex flex-col md:flex-row overflow-hidden">
                      
                      {/* Mobile Tabs */}
                      <div className="md:hidden flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-20 shrink-0">
                          <button onClick={() => setMobileTab('editor')} className={`flex-1 py-3 text-sm font-bold text-center ${mobileTab === 'editor' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>{t('common:editor')}</button>
                          <button onClick={() => setMobileTab('preview')} className={`flex-1 py-3 text-sm font-bold text-center ${mobileTab === 'preview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>{t('common:preview')}</button>
                      </div>

                      {/* Editor Pane */}
                      <div className={`flex-1 overflow-y-auto p-4 lg:p-8 transition-all duration-300 ${mobileTab === 'editor' ? 'block' : 'hidden md:block'} md:w-1/2 bg-white dark:bg-gray-900`}>
                          <div className="max-w-3xl mx-auto space-y-6 pb-24">
                              {currentView === 'quote' && (
                                  <QuoteBuilder quote={quote} setQuote={setQuote} language={i18n.language as Language} setIsFormValid={setIsFormValid} companyInfo={companyInfo} setCompanyInfo={setCompanyInfo} onTemplateChange={handleQuoteTemplateChange} createInitialQuote={createInitialQuote} translations={t} dbClients={dbClients} dbProducts={dbProducts} />
                              )}
                              {currentView === 'contract' && (
                                  <ContractBuilder contract={contract} setContract={setContract} language={i18n.language as Language} setIsFormValid={setIsFormValid} companyInfo={companyInfo} setCompanyInfo={setCompanyInfo} translations={t} dbClients={dbClients} />
                              )}
                              {currentView === 'document' && (
                                  <DocumentBuilder document={genericDocument} setDocument={setGenericDocument} language={i18n.language as Language} setIsFormValid={setIsFormValid} companyInfo={companyInfo} setCompanyInfo={setCompanyInfo} translations={t} />
                              )}
                          </div>
                      </div>

                      {/* Preview Pane */}
                      <div className={`flex-1 bg-gray-100 dark:bg-gray-800/50 border-l border-gray-200 dark:border-gray-700 relative ${mobileTab === 'preview' ? 'block' : 'hidden md:block'} md:w-1/2 h-full overflow-hidden flex flex-col`}>
                          {currentView === 'quote' && (
                              <PreviewPane 
                                quote={quote} 
                                language={i18n.language as Language} 
                                companyInfo={companyInfo} 
                                t={t} 
                                onSave={initiateSave} 
                                onConvertQuoteToInvoice={(q) => setQuote(q)}
                                onConvertQuoteToContract={convertQuoteToContract}
                                onConvertQuoteToDocument={convertQuoteToDocument}
                                onDuplicate={editingItemId ? () => handleDuplicateItem(editingItemId!) : undefined}
                                onDelete={editingItemId ? () => handleDeleteItem(editingItemId!) : undefined}
                                onSimulatePortal={() => setIsClientPortalOpen(true)}
                              />
                          )}
                          {currentView === 'contract' && (
                              <ContractPreview contract={contract} language={i18n.language as Language} processedContent="" selectedTemplate={contract.templateId === 'custom' ? undefined : contractTemplates.find(t => t.id === contract.templateId)} companyInfo={companyInfo} onSave={initiateSave} />
                          )}
                          {currentView === 'document' && (
                              <DocumentPreview document={genericDocument} language={i18n.language as Language} processedContent="" selectedTemplate={genericDocument.templateId === 'custom' ? undefined : documentTemplates.find(t => t.id === genericDocument.templateId)} companyInfo={companyInfo} onSave={initiateSave} />
                          )}
                      </div>
                  </div>
              )}
          </div>
      </main>

      {/* Global Modals (Save, Toast) */}
      {isSaveModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700 transform transition-all scale-100">
                  <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{t('quotes:savePromptTitle')}</h3>
                  <p className="text-gray-500 text-sm mb-6">{t('quotes:savePromptDesc')}</p>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('quotes:projectName')}</label>
                          <input autoFocus type="text" value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Quotation for Company X" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('common:status')}</label>
                              <select value={saveStatus} onChange={(e) => setSaveStatus(e.target.value as ItemStatus)} className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 outline-none">
                                  <option value="draft">{t('common:statusLabels.draft')}</option>
                                  <option value="pending">{t('common:statusLabels.pending')}</option>
                                  <option value="approved">{t('common:statusLabels.approved')}</option>
                                  <option value="paid">{t('common:statusLabels.paid')}</option>
                                  <option value="rejected">{t('common:statusLabels.rejected')}</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('quotes:expiryReminder')}</label>
                              <input type="date" value={saveExpiryDate} onChange={(e) => setSaveExpiryDate(e.target.value)} className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 outline-none" />
                          </div>
                      </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-8">
                      <button onClick={() => setIsSaveModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition">{t('common:cancel')}</button>
                      <button onClick={confirmSave} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition">{t('common:save')}</button>
                  </div>
              </div>
          </div>
      )}

      <div className="fixed bottom-6 left-6 z-[110] flex flex-col gap-2 pointer-events-none">
          {notifications.filter(n => !n.read).slice(0, 3).map(notif => (
              <div key={notif.id} className={`pointer-events-auto p-4 rounded-xl shadow-lg border flex items-center gap-3 animate-slide-in-bottom max-w-sm ${notif.type === 'success' ? 'bg-white border-emerald-100 text-emerald-800 dark:bg-gray-800 dark:border-emerald-900 dark:text-emerald-400' : notif.type === 'error' ? 'bg-white border-red-100 text-red-800 dark:bg-gray-800 dark:border-red-900 dark:text-red-400' : 'bg-white border-blue-100 text-blue-800 dark:bg-gray-800 dark:border-blue-900 dark:text-blue-400'}`}>
                  {notif.type === 'success' ? <CheckCircle size={20}/> : notif.type === 'error' ? <AlertCircle size={20}/> : <Info size={20}/>}
                  <p className="text-sm font-medium">{notif.message}</p>
              </div>
          ))}
      </div>
    </div>
  );
};
