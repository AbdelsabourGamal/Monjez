
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Language } from '../types';
import { 
  Search, BookOpen, Gavel, ScrollText, Library, FileText, 
  Landmark, Newspaper, Sparkles, Briefcase, Database,
  Plus, MoreVertical, ArrowLeft, RefreshCw, X, Filter, FolderOpen,
  Bookmark, Printer, Save, Calendar, UploadCloud, File, ExternalLink,
  Download, ChevronRight, Folder, Globe, Building2, Info, Link as LinkIcon,
  Clock, CheckCircle, Scale, FileDown, AlertCircle, Trash2, Edit, Eye, FileSignature, ShieldCheck
} from 'lucide-react';
import { getLegalAdvice, generateCreativeText } from '../services/geminiService';

interface DiwanProps {
  notify: (msg: string, type: 'success' | 'error') => void;
}

type CountryCode = 'kw' | 'sa' | 'ae' | 'eg' | 'qa' | 'bh' | 'om' | 'iq' | 'lb';
type ViewMode = 'home' | 'reader' | 'gazette_manager' | 'system_cases' | 'system_contracts' | 'system_poa' | 'gov_portal';

// --- Detailed Government Services Data ---
interface ServiceFile {
    nameKey: string;
    url: string;
}

interface CountryGovData {
    ministries: {
        id: string;
        nameKey: string;
        url: string;
        services: ServiceItem[];
    }[];
}

interface ServiceItem {
    nameKey: string;
    descKey: string;
    category: 'labor' | 'justice' | 'corporate' | 'general' | 'news' | 'forms' | 'legislation';
    type: 'eservice' | 'form' | 'info';
    link: string;
    sourceNameKey: string;
    lastUpdate?: string;
    files?: ServiceFile[];
}

// --- Official Links & Data ---
const GOV_DATA: Record<string, CountryGovData> = {
    kw: {
        ministries: [
            {
                id: 'manpower',
                nameKey: 'diwan:gov.manpower.title',
                url: 'https://www.manpower.gov.kw/DocsFormsConds.aspx',
                services: [
                    {
                        nameKey: 'diwan:gov.manpower.services.forms.title',
                        descKey: 'diwan:gov.manpower.services.forms.desc',
                        category: 'forms', type: 'form', link: 'https://www.manpower.gov.kw/DocsFormsConds.aspx',
                        sourceNameKey: 'diwan:gov.manpower.title',
                        files: [
                            { nameKey: 'diwan:files_list.pam_dues', url: 'https://www.manpower.gov.kw/docs/tamplates/FinancialDues/Arabic_Urdu.pdf' },
                            { nameKey: 'diwan:files_list.pam_allowance', url: 'https://www.manpower.gov.kw/docs/tamplates/AppFormForSocialAllowanceAndChildrenAllowance.pdf' },
                            { nameKey: 'diwan:files_list.pam_settlement', url: 'https://www.manpower.gov.kw/docs/tamplates/commitmentToSettleLaborWages.pdf' }
                        ]
                    },
                    {
                        nameKey: 'diwan:gov.manpower.services.domestic.title',
                        descKey: 'diwan:gov.manpower.services.domestic.desc',
                        category: 'forms', type: 'form', link: 'https://www.manpower.gov.kw/DocsFormsConds.aspx',
                        sourceNameKey: 'diwan:gov.manpower.title',
                        files: [
                            { nameKey: 'diwan:files_list.domestic_triple', url: 'https://www.manpower.gov.kw/docs/tamplates/TripleRecruitmentContract.pdf' },
                            { nameKey: 'diwan:files_list.domestic_bilateral', url: 'https://www.manpower.gov.kw/docs/tamplates/BilateralRecruitmentContract.pdf' }
                        ]
                    },
                    {
                        nameKey: 'diwan:gov.manpower.services.safety.title',
                        descKey: 'diwan:gov.manpower.services.safety.desc',
                        category: 'forms', type: 'form', link: 'https://www.manpower.gov.kw/DocsFormsConds.aspx',
                        sourceNameKey: 'diwan:gov.manpower.title',
                        files: [
                            { nameKey: 'diwan:files_list.safety_record', url: '#' },
                            { nameKey: 'diwan:files_list.accident_report', url: '#' }
                        ]
                    },
                    {
                        nameKey: 'diwan:gov.manpower.services.worldbank.title',
                        descKey: 'diwan:gov.manpower.services.worldbank.desc',
                        category: 'general', type: 'info', link: 'https://www.manpower.gov.kw/DocsFormsConds.aspx',
                        sourceNameKey: 'diwan:gov.manpower.title'
                    },
                    {
                        nameKey: 'diwan:gov.manpower.services.workpermit.title',
                        descKey: 'diwan:gov.manpower.services.workpermit.desc',
                        category: 'labor', type: 'eservice', link: 'https://www.manpower.gov.kw/DocsFormsConds.aspx',
                        sourceNameKey: 'diwan:gov.manpower.title', lastUpdate: '2024-02'
                    }
                ]
            },
            {
                id: 'moj',
                nameKey: 'diwan:gov.moj.title',
                url: 'https://www.moj.gov.kw/',
                services: [
                    {
                        nameKey: 'diwan:gov.moj.services.portal.title',
                        descKey: 'diwan:gov.moj.services.portal.desc',
                        category: 'justice', type: 'eservice', link: 'https://www.moj.gov.kw/',
                        sourceNameKey: 'diwan:gov.moj.title'
                    }
                ]
            }
        ]
    },
    qa: {
        ministries: [
            {
                id: 'mol',
                nameKey: 'diwan:gov.mol.title',
                url: 'https://www.mol.gov.qa/Ar/Services/Pages/default.aspx',
                services: [
                    {
                        nameKey: 'diwan:gov.mol.services.directory.title',
                        descKey: 'diwan:gov.mol.services.directory.desc',
                        category: 'labor', type: 'eservice', link: 'https://www.mol.gov.qa/Ar/Services/Pages/default.aspx',
                        sourceNameKey: 'diwan:gov.mol.title'
                    },
                    {
                        nameKey: 'diwan:gov.mol.services.auth.title',
                        descKey: 'diwan:gov.mol.services.auth.desc',
                        category: 'labor', type: 'eservice', link: 'https://www.mol.gov.qa/Ar/Services/Pages/default.aspx',
                        sourceNameKey: 'diwan:gov.mol.title', lastUpdate: '2024-01'
                    }
                ]
            },
            {
                id: 'moj',
                nameKey: 'diwan:gov.moj.title',
                url: 'https://www.moj.gov.qa/ar/Pages/Services.aspx',
                services: [
                    {
                        nameKey: 'diwan:gov.moj.services.sak.title',
                        descKey: 'diwan:gov.moj.services.sak.desc',
                        category: 'justice', type: 'eservice', link: 'https://www.moj.gov.qa/ar/Pages/Services.aspx',
                        sourceNameKey: 'diwan:gov.moj.title'
                    }
                ]
            }
        ]
    },
    ae: {
        ministries: [
            {
                id: 'mohre',
                nameKey: 'diwan:gov.mohre.title',
                url: 'https://mohre.gov.ae/ar/home',
                services: [
                    {
                        nameKey: 'diwan:gov.mohre.services.permits.title',
                        descKey: 'diwan:gov.mohre.services.permits.desc',
                        category: 'labor', type: 'eservice', link: 'https://u.ae/ar-ae/information-and-services/jobs/employment-in-the-private-sector/job-offers-and-work-permits-and-contracts/work-permits',
                        sourceNameKey: 'diwan:gov.mohre.title'
                    },
                    {
                        nameKey: 'diwan:gov.mohre.services.contracts.title',
                        descKey: 'diwan:gov.mohre.services.contracts.desc',
                        category: 'labor', type: 'form', link: 'https://u.ae/ar-ae/information-and-services/jobs/employment-in-the-private-sector/job-offers-and-work-permits-and-contracts/work-permits',
                        sourceNameKey: 'diwan:govSubtitle'
                    }
                ]
            },
            {
                id: 'moj',
                nameKey: 'diwan:gov.moj.title',
                url: 'https://www.moj.gov.ae/',
                services: [
                    {
                        nameKey: 'diwan:gov.moj.services.notary.title',
                        descKey: 'diwan:gov.moj.services.notary.desc',
                        category: 'justice', type: 'eservice', link: 'https://www.moj.gov.ae/',
                        sourceNameKey: 'diwan:gov.moj.title'
                    },
                    {
                        nameKey: 'diwan:gov.moj.services.efiling.title',
                        descKey: 'diwan:gov.moj.services.efiling.desc',
                        category: 'justice', type: 'eservice', link: 'https://www.moj.gov.ae/',
                        sourceNameKey: 'diwan:gov.moj.title'
                    }
                ]
            }
        ]
    },
    bh: {
        ministries: [
            {
                id: 'portal',
                nameKey: 'diwan:gov.bh_portal.title',
                url: 'https://services.bahrain.bh/',
                services: [
                    {
                        nameKey: 'diwan:gov.bh_portal.services.courts.title',
                        descKey: 'diwan:gov.bh_portal.services.courts.desc',
                        category: 'justice', type: 'eservice', link: 'https://services.bahrain.bh/wps/portal/ar/BSP/HomeeServicesPortal/',
                        sourceNameKey: 'diwan:gov.bh_portal.title'
                    },
                    {
                        nameKey: 'diwan:gov.bh_portal.services.sijilat.title',
                        descKey: 'diwan:gov.bh_portal.services.sijilat.desc',
                        category: 'corporate', type: 'eservice', link: 'https://services.bahrain.bh/wps/portal/ar/BSP/HomeeServicesPortal/',
                        sourceNameKey: 'diwan:gov.bh_portal.title'
                    }
                ]
            },
            {
                id: 'mol',
                nameKey: 'diwan:gov.mol.title',
                url: 'https://www.mol.gov.bh/',
                services: [
                    {
                        nameKey: 'diwan:gov.mol.services.expatriate.title',
                        descKey: 'diwan:gov.mol.services.expatriate.desc',
                        category: 'labor', type: 'eservice', link: 'https://www.mol.gov.bh/',
                        sourceNameKey: 'diwan:gov.mol.title'
                    }
                ]
            }
        ]
    },
    eg: {
        ministries: [
            {
                id: 'presidency',
                nameKey: 'diwan:gov.presidency.title',
                url: 'https://www.presidency.eg/ar/',
                services: [
                    {
                        nameKey: 'diwan:gov.presidency.services.news.title',
                        descKey: 'diwan:gov.presidency.services.news.desc',
                        category: 'news', type: 'info', link: 'https://www.presidency.eg/ar/',
                        sourceNameKey: 'diwan:gov.presidency.title'
                    },
                    {
                        nameKey: 'diwan:gov.presidency.services.projects.title',
                        descKey: 'diwan:gov.presidency.services.projects.desc',
                        category: 'general', type: 'info', link: 'https://www.presidency.eg/ar/',
                        sourceNameKey: 'diwan:gov.presidency.title'
                    }
                ]
            },
            {
                id: 'moj',
                nameKey: 'diwan:gov.moj.title',
                url: 'https://moj.gov.eg/',
                services: [
                    {
                        nameKey: 'diwan:gov.moj.services.realestate.title',
                        descKey: 'diwan:gov.moj.services.realestate.desc',
                        category: 'justice', type: 'eservice', link: 'https://moj.gov.eg/',
                        sourceNameKey: 'diwan:gov.moj.title'
                    },
                    {
                        nameKey: 'diwan:gov.moj.services.caseinquiry.title',
                        descKey: 'diwan:gov.moj.services.caseinquiry.desc',
                        category: 'justice', type: 'eservice', link: 'https://moj.gov.eg/',
                        sourceNameKey: 'diwan:gov.moj.title'
                    }
                ]
            },
            {
                id: 'manpower',
                nameKey: 'diwan:gov.mol.title',
                url: 'https://egyemp.labour.gov.eg/',
                services: [
                    {
                        nameKey: 'diwan:gov.mol.services.egyptian.title',
                        descKey: 'diwan:gov.mol.services.egyptian.desc',
                        category: 'labor', type: 'eservice', link: 'https://egyemp.labour.gov.eg/',
                        sourceNameKey: 'diwan:gov.mol.title'
                    }
                ]
            }
        ]
    },
    om: {
        ministries: [
            {
                id: 'mol',
                nameKey: 'diwan:gov.mol.title',
                url: 'https://www.mol.gov.om/',
                services: [
                    {
                        nameKey: 'diwan:gov.mol.services.licensing.title',
                        descKey: 'diwan:gov.mol.services.licensing.desc',
                        category: 'labor', type: 'eservice', link: 'https://www.mol.gov.om/',
                        sourceNameKey: 'diwan:gov.mol.title'
                    }
                ]
            },
            {
                id: 'mjla',
                nameKey: 'diwan:gov.mjla.title',
                url: 'https://www.mjla.gov.om/',
                services: [
                    {
                        nameKey: 'diwan:gov.mjla.services.gazette.title',
                        descKey: 'diwan:gov.mjla.services.gazette.desc',
                        category: 'justice', type: 'info', link: 'https://www.mjla.gov.om/',
                        sourceNameKey: 'diwan:gov.mjla.title'
                    }
                ]
            }
        ]
    },
    lb: {
        ministries: [
            {
                id: 'justice',
                nameKey: 'diwan:gov.lb_justice.title',
                url: 'https://www.justice.gov.lb/',
                services: [
                    {
                        nameKey: 'diwan:gov.lb_justice.services.commercial.title',
                        descKey: 'diwan:gov.lb_justice.services.commercial.desc',
                        category: 'corporate', type: 'info', link: 'https://www.justice.gov.lb/',
                        sourceNameKey: 'diwan:gov.lb_justice.title'
                    }
                ]
            },
            {
                id: 'labor',
                nameKey: 'diwan:gov.mol.title',
                url: 'https://www.labor.gov.lb/',
                services: [
                    {
                        nameKey: 'diwan:gov.mol.services.permits.title',
                        descKey: 'diwan:gov.mol.services.permits.desc',
                        category: 'labor', type: 'info', link: 'https://www.labor.gov.lb/',
                        sourceNameKey: 'diwan:gov.mol.title'
                    }
                ]
            }
        ]
    },
    iq: {
        ministries: [
            {
                id: 'moj',
                nameKey: 'diwan:gov.iq_moj.title',
                url: 'https://moj.gov.iq/',
                services: [
                    {
                        nameKey: 'diwan:gov.iq_moj.services.registration.title',
                        descKey: 'diwan:gov.iq_moj.services.registration.desc',
                        category: 'justice', type: 'info', link: 'https://moj.gov.iq/',
                        sourceNameKey: 'diwan:gov.iq_moj.title'
                    },
                    {
                        nameKey: 'diwan:gov.iq_moj.services.gazette.title',
                        descKey: 'diwan:gov.iq_moj.services.gazette.desc',
                        category: 'general', type: 'info', link: 'https://moj.gov.iq/',
                        sourceNameKey: 'diwan:gov.iq_moj.title'
                    }
                ]
            },
            {
                id: 'molsa',
                nameKey: 'diwan:gov.molsa.title',
                url: 'https://molsa.gov.iq/',
                services: [
                    {
                        nameKey: 'diwan:gov.molsa.services.loans.title',
                        descKey: 'diwan:gov.molsa.services.loans.desc',
                        category: 'labor', type: 'info', link: 'https://molsa.gov.iq/',
                        sourceNameKey: 'diwan:gov.molsa.title'
                    }
                ]
            }
        ]
    }
};

// --- Jurisdictional Data with CORRECT Legislation Links ---
const JURISDICTIONS: Record<string, any> = {
    kw: { 
        nameKey: 'diwan:countries.kw', flag: '🇰🇼', gazetteNameKey: 'diwan:countries.kw', color: 'bg-blue-600',
        resources: [
            { id: 'kw-gov', titleKey: 'diwan:resources.kw.gov', type: 'gov_portal', count: 'Portal' },
            { id: 'kw-leg', titleKey: 'diwan:resources.kw.leg', type: 'legislation', count: 'Laws', link: 'https://www.moj.gov.kw/AR/Legislation/Pages/Search.aspx' },
            { id: 'kw-gazette', titleKey: 'diwan:resources.kw.gazette', type: 'gazette', count: 'Official' }
        ]
    },
    sa: { 
        nameKey: 'diwan:countries.sa', flag: '🇸🇦', gazetteNameKey: 'diwan:countries.sa', color: 'bg-emerald-600',
        resources: [
            { id: 'sa-gov', titleKey: 'diwan:resources.sa.gov', type: 'gov_portal', count: 'Portal', link: 'https://www.najiz.sa/' },
            { id: 'sa-leg', titleKey: 'diwan:resources.sa.leg', type: 'legislation', count: 'Royal Decrees', link: 'https://laws.boe.gov.sa/' },
            { id: 'sa-gazette', titleKey: 'diwan:resources.sa.gazette', type: 'gazette', count: 'Official' }
        ]
    },
    ae: { 
        nameKey: 'diwan:countries.ae', flag: '🇦🇪', gazetteNameKey: 'diwan:countries.ae', color: 'bg-red-600',
        resources: [
            { id: 'ae-gov', titleKey: 'diwan:resources.ae.gov', type: 'gov_portal', count: 'Portal' },
            { id: 'ae-leg', titleKey: 'diwan:resources.ae.leg', type: 'legislation', count: 'Laws', link: 'https://uaelegislation.gov.ae/' }
        ]
    },
    qa: { 
        nameKey: 'diwan:countries.qa', flag: '🇶🇦', gazetteNameKey: 'diwan:countries.qa', color: 'bg-maroon-700',
        resources: [
            { id: 'qa-gov', titleKey: 'diwan:resources.qa.gov', type: 'gov_portal', count: 'Portal' },
            { id: 'qa-leg', titleKey: 'diwan:resources.qa.leg', type: 'legislation', count: 'Laws', link: 'https://www.almeezan.qa/' }
        ]
    },
    bh: { 
        nameKey: 'diwan:countries.bh', flag: '🇧🇭', gazetteNameKey: 'diwan:countries.bh', color: 'bg-red-500',
        resources: [
            { id: 'bh-gov', titleKey: 'diwan:resources.bh.gov', type: 'gov_portal', count: 'Portal' },
            { id: 'bh-leg', titleKey: 'diwan:resources.bh.leg', type: 'legislation', count: 'Laws', link: 'https://www.lloc.gov.bh/' }
        ]
    },
    om: { 
        nameKey: 'diwan:countries.om', flag: '🇴🇲', gazetteNameKey: 'diwan:countries.om', color: 'bg-red-600',
        resources: [
            { id: 'om-gov', titleKey: 'diwan:resources.om.gov', type: 'gov_portal', count: 'Portal' },
            { id: 'om-leg', titleKey: 'diwan:resources.om.leg', type: 'legislation', count: 'Decrees', link: 'https://qanoon.om/' }
        ]
    },
    eg: { 
        nameKey: 'diwan:countries.eg', flag: '🇪🇬', gazetteNameKey: 'diwan:countries.eg', color: 'bg-black',
        resources: [
            { id: 'eg-gov', titleKey: 'diwan:resources.eg.gov', type: 'gov_portal', count: 'Portal' },
            { id: 'eg-leg', titleKey: 'diwan:resources.eg.leg', type: 'legislation', count: 'Laws', link: 'https://www.cc.gov.eg/legislations' }
        ]
    },
    iq: { 
        nameKey: 'diwan:countries.iq', flag: '🇮🇶', gazetteNameKey: 'diwan:countries.iq', color: 'bg-red-600',
        resources: [
            { id: 'iq-gov', titleKey: 'diwan:resources.iq.gov', type: 'gov_portal', count: 'Portal' },
            { id: 'iq-leg', titleKey: 'diwan:resources.iq.leg', type: 'legislation', count: 'Laws', link: 'http://iraqld.hjc.iq/' }
        ]
    },
    lb: { 
        nameKey: 'diwan:countries.lb', flag: '🇱🇧', gazetteNameKey: 'diwan:countries.lb', color: 'bg-green-600',
        resources: [
            { id: 'lb-gov', titleKey: 'diwan:resources.lb.gov', type: 'gov_portal', count: 'Portal' },
            { id: 'lb-leg', titleKey: 'diwan:resources.lb.leg', type: 'legislation', count: 'Laws', link: 'http://pcm.gov.lb/arabic/subpg.aspx?pageid=3834' }
        ]
    }
};

const MANAGEMENT_SYSTEMS = [
    { id: 'cases', titleKey: 'diwan:systemTitles.system_cases', icon: Gavel, color: 'bg-blue-600', view: 'system_cases' },
    { id: 'contracts', titleKey: 'diwan:systemTitles.system_contracts', icon: FileSignature, color: 'bg-indigo-600', view: 'system_contracts' },
    { id: 'poa', titleKey: 'diwan:systemTitles.system_poa', icon: ShieldCheck, color: 'bg-emerald-600', view: 'system_poa' }
];

const INITIAL_CASES = [
    { id: '88/2023', client: 'محمد سالم', subject: 'تعويض عمالي', court: 'الاستئناف', status: 'verdict' },
];

const INITIAL_CONTRACTS = [
    { id: 'CONT-901', client: 'شركة التقنية الحديثة', type: 'عقد تأسيس', date: '2023-10-01', status: 'active', lawyer: 'أحمد المحامي' },
    { id: 'CONS-905', client: 'مؤسسة البناء', type: 'استشارة قانونية', date: '2023-09-15', status: 'closed', lawyer: 'سارة المستشارة' },
];

const INITIAL_POAS = [
    { id: 'POA-101', principal: 'محمد علي', agent: 'مكتب المحامي', type: 'توكيل عام', date: '2022-05-10', status: 'active' },
    { id: 'POA-205', principal: 'شركة الاستثمار', agent: 'المحامي فهد', type: 'توكيل خاص', date: '2023-01-15', status: 'expired' },
];

const INITIAL_GAZETTES = [
    { id: 1650, number: '1650', date: '2024-02-15', titleKey: 'diwan:officialLegalDocument', itemsCount: 12 },
    { id: 1649, number: '1649', date: '2024-02-08', titleKey: 'diwan:officialLegalDocument', itemsCount: 8 },
    { id: 1648, number: '1648', date: '2024-02-01', titleKey: 'diwan:officialLegalDocument', itemsCount: 15 },
];

const generateDynamicNews = (country: CountryCode, language: Language, t: any) => {
    const now = new Date();
    const defaultNews = t('diwan:defaultNews');
    // For now, return a list with just the default greeting + date, 
    // real implementations would fetch news from an API or use specific keys.
    return [
        {
            text: defaultNews,
            date: now.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })
        }
    ];
};

export const Diwan: React.FC<DiwanProps> = ({ notify }) => {
  const { t, i18n } = useTranslation(['diwan', 'common']);
  const language = (i18n.language || 'en') as Language;
  const [view, setView] = useState<ViewMode>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('kw');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [currentNews, setCurrentNews] = useState<any[]>([]);
  const [newsLastUpdated, setNewsLastUpdated] = useState<Date>(new Date());
  const [isUpdatingNews, setIsUpdatingNews] = useState(false);
  
  // Document Reader State
  const [currentDoc, setCurrentDoc] = useState<any>(null);
  const [docContent, setDocContent] = useState<string>('');
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

  // Systems Data State
  const [systemData, setSystemData] = useState({ cases: INITIAL_CASES, contracts: INITIAL_CONTRACTS, poa: INITIAL_POAS });
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [newRecord, setNewRecord] = useState<any>({});
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Gazette State
  const [gazetteIssues, setGazetteIssues] = useState(INITIAL_GAZETTES);
  const [isAddingGazette, setIsAddingGazette] = useState(false);
  const [newGazette, setNewGazette] = useState({ number: '', date: '', titleAr: '', titleEn: '' });

  // Click outside handler for action menu
  useEffect(() => {
      const handleClickOutside = () => setOpenActionMenuId(null);
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
      refreshNews();
  }, [selectedCountry, language]);

  const refreshNews = () => {
      const news = generateDynamicNews(selectedCountry, language, t);
      setCurrentNews(news);
      setCurrentNewsIndex(0);
      setNewsLastUpdated(new Date());
  };

  const handleManualNewsUpdate = async () => {
      setIsUpdatingNews(true);
      await new Promise(r => setTimeout(r, 1000));
      refreshNews();
      setIsUpdatingNews(false);
      notify(t('diwan:newsUpdated'), 'success');
  };

  useEffect(() => {
    if (currentNews.length > 0) {
      const interval = setInterval(() => {
        setCurrentNewsIndex(prev => (prev + 1) % currentNews.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [currentNews.length]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setAiResponse(null);
    try {
        const jurisdictionName = t(JURISDICTIONS[selectedCountry].nameKey);
        const prompt = `Provide a specific legal summary regarding "${searchQuery}" under the laws of ${jurisdictionName}.`;
        const response = await getLegalAdvice(prompt, [], undefined, 'formal', '', true);
        setAiResponse(response);
    } catch (e) {
        notify(t('diwan:searchFailed'), 'error');
    } finally {
        setIsSearching(false);
    }
  };

  const handleSaveRecord = (type: 'cases' | 'contracts' | 'poa') => {
      const record = { 
          ...newRecord, 
          id: newRecord.id || Date.now().toString()
      };
      if (editingRecord) {
          setSystemData(prev => ({
              ...prev,
              [type]: prev[type as keyof typeof prev].map((r: any) => r.id === editingRecord.id ? record : r)
          }));
      } else {
          setSystemData(prev => ({
              ...prev,
              [type]: [...prev[type as keyof typeof prev], record]
          }));
      }
      setIsAddingRecord(false);
      setEditingRecord(null);
      setNewRecord({});
      notify(t('common:saved'), 'success');
  };

  const handleEditRecord = (record: any) => {
      setEditingRecord(record);
      setNewRecord(record);
      setIsAddingRecord(true);
  };

  const handleDeleteRecord = (type: string, id: string) => {
      if (confirm(t('common:confirm'))) {
          setSystemData(prev => ({
              ...prev,
              [type as keyof typeof prev]: prev[type as keyof typeof prev].filter((r: any) => r.id !== id)
          }));
          notify(t('common:deleted'), 'success');
      }
  };

  const getIconForType = (type: string) => {
      switch (type) {
          case 'legislation': return Scale;
          case 'gov_portal': return Landmark;
          case 'gazette': return Newspaper;
          default: return FileText;
      }
  };

  const handleOpenDoc = (res: any) => {
      if (res.link) {
          window.open(res.link, '_blank');
      } else if (res.type === 'gov_portal') {
          setView('gov_portal');
      } else if (res.type === 'gazette') {
          setView('gazette_manager');
      }
  };

  const handleAddGazette = () => {
      const g = { 
          id: Date.now(), 
          number: newGazette.number, 
          date: newGazette.date, 
          titleKey: 'diwan:officialLegalDocument', 
          itemsCount: 0 
      };
      setGazetteIssues([g, ...gazetteIssues]);
      setIsAddingGazette(false);
      setNewGazette({ number: '', date: '', titleAr: '', titleEn: '' });
      notify(t('diwan:newsUpdated'), 'success');
  };

  // Components
  const AddRecordModal = ({ type, onClose }: { type: 'cases' | 'contracts' | 'poa', onClose: () => void }) => (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-xl animate-scale-in">
              <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">{editingRecord ? t('diwan:edit') : t('diwan:add')}</h3>
              <div className="space-y-4">
                  <input placeholder={type === 'cases' ? t('diwan:caseNo') : type === 'contracts' ? t('diwan:contractRef') : t('diwan:poaNo')} className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700" value={newRecord.id || ''} onChange={e => setNewRecord({...newRecord, id: e.target.value})}/>
                  <input placeholder={type === 'cases' ? t('diwan:client') : type === 'contracts' ? t('diwan:client') : t('diwan:principal')} className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700" value={newRecord.client || newRecord.principal || ''} onChange={e => setNewRecord({...newRecord, client: e.target.value, principal: e.target.value})}/>
                  <input placeholder={t('diwan:status')} className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700" value={newRecord.status || ''} onChange={e => setNewRecord({...newRecord, status: e.target.value})}/>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                  <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">{t('diwan:cancel')}</button>
                  <button onClick={() => handleSaveRecord(type)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('diwan:save')}</button>
              </div>
          </div>
      </div>
  );

  const ActionMenu = ({ type, row, onClose }: { type: any, row: any, onClose: () => void }) => (
      <div className="absolute left-0 rtl:left-auto rtl:right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-50 animate-in fade-in zoom-in-95">
          <button onClick={() => { handleEditRecord(row); onClose(); }} className="w-full text-left rtl:text-right px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200">
              <Edit size={14}/> {t('diwan:edit')}
          </button>
          <button onClick={() => { notify(t('diwan:view'), 'info'); onClose(); }} className="w-full text-left rtl:text-right px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200">
              <Eye size={14}/> {t('diwan:view')}
          </button>
          <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
          <button onClick={() => { handleDeleteRecord(type, row.id); onClose(); }} className="w-full text-left rtl:text-right px-4 py-2.5 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600">
              <Trash2 size={14}/> {t('diwan:delete')}
          </button>
      </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto min-h-screen pb-32">
      {view === 'home' && (
          <div className="space-y-10 animate-fade-in">
              {/* Header */}
              <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
                  <h1 className="text-4xl font-black text-gray-900 dark:text-white flex items-center gap-3 tracking-tight">
                      <Landmark className="text-amber-600" size={36}/> <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-orange-600">{t('diwan:title')}</span>
                  </h1>
                  <div 
                      className="flex overflow-x-auto w-full lg:w-auto max-w-full bg-white dark:bg-gray-800 p-2 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                      <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
                      <div className="flex w-full gap-2 min-w-max hide-scrollbar">
                          {(Object.keys(JURISDICTIONS) as CountryCode[]).map((code) => (
                              <button key={code} onClick={() => setSelectedCountry(code)} className={`flex items-center whitespace-nowrap gap-2 px-3 py-2 rounded-xl transition-all duration-200 ${selectedCountry === code ? 'bg-slate-800 text-white shadow-lg font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 font-medium'}`}>
                                  <span className="text-xl">{JURISDICTIONS[code].flag}</span>
                                  <span className="text-xs">{t(JURISDICTIONS[code].nameKey)}</span>
                              </button>
                          ))}
                      </div>
                  </div>
              </div>

              {/* Search */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 md:p-16 relative overflow-hidden text-center text-white shadow-2xl border border-slate-700">
                  <div className="relative z-10 max-w-3xl mx-auto">
                      <h2 className="text-3xl md:text-5xl font-bold mb-8 leading-tight">
                          {t('diwan:searchIn')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-300">{t(JURISDICTIONS[selectedCountry].nameKey)}</span>
                      </h2>
                      <form onSubmit={handleSearch} className="relative group">
                          <input type="text" className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl py-5 px-14 text-lg text-white placeholder-gray-400 focus:bg-white focus:text-gray-900 transition-all outline-none" placeholder={t('diwan:searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                          <button type="submit" disabled={isSearching} className="absolute inset-y-2 right-2 rtl:right-auto rtl:left-2 bg-amber-500 text-white px-8 rounded-xl font-bold hover:bg-amber-600 transition-colors shadow-lg disabled:opacity-70">
                              {isSearching ? <RefreshCw className="animate-spin"/> : t('diwan:searchBtn')}
                          </button>
                      </form>
                  </div>
              </div>

              {/* AI Response */}
              {aiResponse && (
                  <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-xl border border-amber-100 dark:border-amber-900/30 animate-fade-up relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500"></div>
                      <h3 className="font-bold text-xl mb-6 flex items-center gap-2 text-amber-600"><Sparkles size={24}/> {t('diwan:aiSummary')}</h3>
                      <div className="prose dark:prose-invert max-w-none leading-loose text-gray-700 dark:text-gray-300 whitespace-pre-line">{aiResponse}</div>
                  </div>
              )}

              {/* News Ticker */}
              {currentNews.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col md:flex-row items-center gap-4">
                      <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap">
                          <span className="animate-pulse w-2 h-2 bg-red-500 rounded-full"></span> {t('diwan:newsType')}
                      </div>
                      <div className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 truncate w-full text-center md:text-right rtl:md:text-right ltr:md:text-left">
                          <span className="font-bold text-gray-900 dark:text-white mx-2">[{currentNews[currentNewsIndex].date}]</span>
                          {currentNews[currentNewsIndex].text}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 whitespace-nowrap">
                          <span>{t('diwan:lastUpdated')} {newsLastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          <button onClick={handleManualNewsUpdate} disabled={isUpdatingNews} className="flex items-center gap-1 hover:text-blue-600 transition disabled:opacity-50" title={t('diwan:manualUpdate')}>
                              <RefreshCw size={14} className={isUpdatingNews ? 'animate-spin' : ''} />
                          </button>
                      </div>
                  </div>
              )}

              {/* Resources */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {JURISDICTIONS[selectedCountry].resources?.map((res: any) => {
                      const Icon = getIconForType(res.type);
                      return (
                          <div key={res.id} onClick={() => handleOpenDoc(res)} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-200 dark:border-gray-700 hover:border-amber-500 cursor-pointer transition-all group relative overflow-hidden flex flex-col h-full shadow-sm hover:shadow-xl">
                              <div className="flex justify-between items-start mb-6">
                                  <div className="w-14 h-14 bg-gray-50 dark:bg-gray-700 rounded-2xl flex items-center justify-center text-gray-500 group-hover:text-white group-hover:bg-amber-500 transition-colors shadow-sm">
                                      <Icon size={28}/>
                                  </div>
                                  <span className="text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-3 py-1 rounded-full uppercase tracking-wider">{res.count}</span>
                              </div>
                              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 group-hover:text-amber-600 transition-colors leading-snug">
                                  {t(res.titleKey)}
                              </h3>
                              {/* Link Indicator */}
                              {res.link && (
                                  <div className="mt-auto pt-4 text-xs text-blue-500 font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <ExternalLink size={12}/> {t('diwan:officialLink')}
                                  </div>
                              )}
                          </div>
                      );
                  })}
              </div>

              {/* Management Systems */}
              <div className="pt-12">
                  <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600"><Database size={24} /></div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{t('diwan:systems')}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {MANAGEMENT_SYSTEMS.map((sys) => (
                          <div key={sys.id} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer group overflow-hidden" onClick={() => setView(sys.view as ViewMode)}>
                              <div className={`h-2 w-full ${sys.color}`}></div>
                              <div className="p-8 flex flex-col items-center text-center h-full">
                                  <div className={`w-20 h-20 ${sys.color.replace('bg-', 'bg-opacity-10 text-')} rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform bg-opacity-10`}>
                                      <sys.icon size={40} className={sys.color.replace('bg-', 'text-')} />
                                  </div>
                                  <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-3">{t(sys.titleKey)}</h4>
                                  <button className={`mt-auto px-6 py-2 rounded-xl text-sm font-bold ${sys.color.replace('bg-', 'text-')} bg-gray-50 dark:bg-gray-700/50 group-hover:bg-opacity-100 transition-colors`}>{t('diwan:viewSystem')}</button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* Government Portal View */}
      {view === 'gov_portal' && (
          <div className="bg-gray-50 dark:bg-gray-900 min-h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-fade-in border border-gray-200 dark:border-gray-800">
              <div className="bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 z-20 shadow-sm">
                  <div className="flex items-center gap-4">
                      <button onClick={() => setView('home')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 transition-all"><ArrowLeft className="rtl:rotate-0 ltr:rotate-180" size={24}/></button>
                      <div>
                          <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-none mb-1">{t('diwan:govTitle')}</h2>
                          <p className="text-xs text-gray-500">{t('diwan:govSubtitle')} - {t(JURISDICTIONS[selectedCountry].nameKey)}</p>
                      </div>
                  </div>
                  <div className="text-2xl">{JURISDICTIONS[selectedCountry].flag}</div>
              </div>

              <div className="p-6 md:p-8 overflow-y-auto">
                  {!GOV_DATA[selectedCountry] ? (
                      <div className="text-center py-20">
                          <Globe size={48} className="mx-auto mb-4 text-gray-300"/>
                          <p className="text-gray-500">{t('diwan:noData')}</p>
                      </div>
                  ) : (
                      <div className="space-y-8">
                          {GOV_DATA[selectedCountry].ministries.map((ministry) => (
                              <div key={ministry.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                                  <div className="p-4 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                      <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                                          <Building2 size={20} className="text-blue-600"/> {t(ministry.nameKey)}
                                      </h3>
                                      <a href={ministry.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                                          {t('diwan:officialLink')} <ExternalLink size={12}/>
                                      </a>
                                  </div>
                                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                      {ministry.services.map((service, idx) => (
                                          <div key={idx} className="p-5 hover:bg-blue-50/50 dark:hover:bg-gray-700/20 transition-colors flex flex-col md:flex-row gap-4 md:items-start group">
                                              <div className="flex-1">
                                                  <div className="flex items-center gap-2 mb-1">
                                                      <h4 className="font-bold text-gray-800 dark:text-white text-base">{t(service.nameKey)}</h4>
                                                      <span className={`text-[10px] px-2 py-0.5 rounded border uppercase font-bold ${
                                                          service.type === 'eservice' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                          service.type === 'info' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                          'bg-amber-50 text-amber-600 border-amber-100'
                                                      }`}>
                                                          {service.type === 'eservice' ? t('diwan:eservice') : service.type === 'form' ? t('diwan:form') : service.category === 'news' ? t('diwan:newsType') : t('diwan:info')}
                                                      </span>
                                                  </div>
                                                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                                      {t(service.descKey)}
                                                  </p>
                                                  
                                                  {/* File List if available */}
                                                  {service.files && service.files.length > 0 && (
                                                      <div className="mt-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                                                          <h5 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><FileText size={12}/> {t('diwan:files')}</h5>
                                                          <div className="space-y-2">
                                                              {service.files.map((file, fIdx) => (
                                                                  <a key={fIdx} href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-blue-300 transition-all text-xs group/file">
                                                                      <span className="text-gray-700 dark:text-gray-300 font-medium truncate flex-1">{t(file.nameKey)}</span>
                                                                      <span className="text-blue-600 font-bold flex items-center gap-1 opacity-0 group-hover/file:opacity-100 transition-opacity">
                                                                          {t('diwan:downloadFile')} <FileDown size={12}/>
                                                                      </span>
                                                                  </a>
                                                              ))}
                                                          </div>
                                                      </div>
                                                  )}

                                                  <div className="flex gap-4 mt-3 text-xs text-gray-400">
                                                      <span className="flex items-center gap-1"><Folder size={10}/> {t(`diwan:${service.category}`) || service.category}</span>
                                                      {service.lastUpdate && <span className="flex items-center gap-1"><Clock size={10}/> {service.lastUpdate}</span>}
                                                  </div>
                                              </div>
                                              <div className="flex-shrink-0 mt-1">
                                                  <a href={service.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-blue-600 hover:text-white text-gray-700 dark:text-gray-300 rounded-lg text-sm font-bold transition-all">
                                                      {t('diwan:visitService')} <ArrowLeft className="rtl:rotate-0 ltr:rotate-180" size={16}/>
                                                  </a>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Gazette Manager */}
      {view === 'gazette_manager' && (
          <div className="bg-white dark:bg-gray-800 min-h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-fade-in border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                  <div className="flex items-center gap-4">
                      <button onClick={() => setView('home')} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-full text-gray-500 shadow-sm border border-transparent hover:border-gray-200 transition-all">
                          <ArrowLeft className="rtl:rotate-0 ltr:rotate-180" size={20}/>
                      </button>
                      <div>
                          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t(JURISDICTIONS[selectedCountry].gazetteNameKey)}</h2>
                          <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wider font-bold">{t('diwan:gazetteTitle')}</p>
                      </div>
                  </div>
                  <button onClick={() => setIsAddingGazette(true)} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-md">
                      <Plus size={18}/> {t('diwan:addIssue')}
                  </button>
              </div>
              <div className="p-8 overflow-y-auto bg-gray-50 dark:bg-gray-900 flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {gazetteIssues.map((issue) => (
                          <div key={issue.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-lg transition-all">
                              <div className="flex justify-between items-start mb-4">
                                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-xl"><Newspaper size={24}/></div>
                                  <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">#{issue.number}</span>
                              </div>
                              <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-1">{t(issue.titleKey)}</h3>
                              <p className="text-sm text-gray-500 mb-6">{issue.date}</p>
                              <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-4">
                                  <span className="text-xs text-gray-400 font-medium">{issue.itemsCount} {t('diwan:itemsCount')}</span>
                                  <button className="text-blue-600 hover:text-blue-800 text-sm font-bold flex items-center gap-1">{t('diwan:download')} <UploadCloud size={14}/></button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
              {isAddingGazette && (
                  <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
                      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-md shadow-xl animate-scale-in">
                          <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">{t('diwan:addIssue')}</h3>
                          <div className="space-y-4">
                              <input placeholder={t('diwan:issueNo')} className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600" onChange={e => setNewGazette({...newGazette, number: e.target.value})}/>
                              <input type="date" className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600" onChange={e => setNewGazette({...newGazette, date: e.target.value})}/>
                          </div>
                          <div className="flex justify-end gap-3 mt-6">
                              <button onClick={() => setIsAddingGazette(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">{t('diwan:cancel')}</button>
                              <button onClick={handleAddGazette} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('diwan:save')}</button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      )}

      {/* Systems Views (Cases, Contracts, POA) */}
      {(view === 'system_cases' || view === 'system_contracts' || view === 'system_poa') && (
          <div className="bg-gray-100 dark:bg-gray-900 min-h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-fade-in border border-gray-200 dark:border-gray-800">
              <div className="bg-white dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 z-20">
                  <div className="flex items-center gap-4">
                      <button onClick={() => setView('home')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 transition-colors"><ArrowLeft className="rtl:rotate-0 ltr:rotate-180" size={24}/></button>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t(`diwan:systemTitles.${view}`)}</h2>
                  </div>
                  <button onClick={() => { setEditingRecord(null); setNewRecord({}); setIsAddingRecord(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-md"><Plus size={18}/> {t('diwan:add')}</button>
              </div>
              
              <div className="p-6 md:p-8 overflow-y-auto">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-visible shadow-sm animate-fade-in">
                      <div className="overflow-x-auto overflow-y-visible min-h-[300px]">
                          <table className="w-full text-sm text-left rtl:text-right">
                              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-300 font-medium">
                                  <tr>
                                      {view === 'system_cases' && <><th className="px-6 py-4">{t('diwan:caseNo')}</th><th className="px-6 py-4">{t('diwan:client')}</th><th className="px-6 py-4">{t('diwan:subject')}</th><th className="px-6 py-4">{t('diwan:court')}</th><th className="px-6 py-4">{t('diwan:status')}</th></>}
                                      {view === 'system_contracts' && <><th className="px-6 py-4">{t('diwan:contractRef')}</th><th className="px-6 py-4">{t('diwan:client')}</th><th className="px-6 py-4">{t('diwan:type')}</th><th className="px-6 py-4">{t('diwan:lawyer')}</th><th className="px-6 py-4">{t('diwan:status')}</th></>}
                                      {view === 'system_poa' && <><th className="px-6 py-4">{t('diwan:poaNo')}</th><th className="px-6 py-4">{t('diwan:principal')}</th><th className="px-6 py-4">{t('diwan:agent')}</th><th className="px-6 py-4">{t('diwan:type')}</th><th className="px-6 py-4">{t('diwan:status')}</th></>}
                                      <th className="px-6 py-4 text-center">{t('diwan:actions')}</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                  {(view === 'system_cases' ? systemData.cases : view === 'system_contracts' ? systemData.contracts : systemData.poa).map((row: any, idx) => (
                                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 group transition-colors relative">
                                          {view === 'system_cases' && <><td className="px-6 py-4 font-bold text-blue-600 font-mono">{row.id}</td><td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{row.client}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{row.subject}</td><td className="px-6 py-4 text-gray-500">{row.court}</td><td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">{t('diwan:statusLabels.' + row.status)}</span></td></>}
                                          {view === 'system_contracts' && <><td className="px-6 py-4 font-bold text-purple-600 font-mono">{row.id}</td><td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{row.client}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{row.type}</td><td className="px-6 py-4 text-gray-500">{row.lawyer}</td><td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">{t('diwan:statusLabels.' + row.status)}</span></td></>}
                                          {view === 'system_poa' && <><td className="px-6 py-4 font-bold text-emerald-600 font-mono">{row.id}</td><td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{row.principal}</td><td className="px-6 py-4 text-gray-500">{row.agent}</td><td className="px-6 py-4 text-gray-600 dark:text-gray-300">{row.type}</td><td className="px-6 py-4"><span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{t('diwan:statusLabels.' + row.status)}</span></td></>}
                                          <td className="px-6 py-4 text-center relative">
                                              <button onClick={(e) => { e.stopPropagation(); setOpenActionMenuId(openActionMenuId === row.id ? null : row.id); }} className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"><MoreVertical size={18}/></button>
                                              {openActionMenuId === row.id && (
                                                  <ActionMenu 
                                                    type={view === 'system_cases' ? 'cases' : view === 'system_contracts' ? 'contracts' : 'poa'} 
                                                    row={row} 
                                                    onClose={() => setOpenActionMenuId(null)} 
                                                  />
                                              )}
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
              {isAddingRecord && <AddRecordModal type={view === 'system_cases' ? 'cases' : view === 'system_contracts' ? 'contracts' : 'poa'} onClose={() => { setIsAddingRecord(false); setEditingRecord(null); }} />}
          </div>
      )}
    </div>
  );
};
