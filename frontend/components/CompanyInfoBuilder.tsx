import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CompanyInfo, Attachment, Language } from '../types';
import { Building2, Wallet, Globe, Mail, Phone, MapPin, CreditCard, FileText, User, Briefcase, PenTool, UploadCloud, Trash2, Image as ImageIcon, Sparkles, Check, Info } from 'lucide-react';
import { SignatureInput } from './SignatureInput';
import { generateLogoImage } from '../services/geminiService';

interface CompanyInfoBuilderProps {
  companyInfo: CompanyInfo;
  setCompanyInfo: React.Dispatch<React.SetStateAction<CompanyInfo>>;
  showAbout?: boolean;
}

const BANKS_DATA = {
    "Kuwait": [
        { name: "National Bank of Kuwait (NBK)", swift: "NBOKKWKW" },
        { name: "Kuwait Finance House (KFH)", swift: "KFHBKWKW" },
        { name: "Boubyan Bank", swift: "BOUBKWKW" },
        { name: "Gulf Bank", swift: "GBKKKWKW" },
        { name: "Burgan Bank", swift: "BBKKKWKW" },
        { name: "Warba Bank", swift: "WARBKWKW" },
        { name: "Commercial Bank of Kuwait (CBK)", swift: "CBKKKWKW" },
        { name: "Ahli United Bank (AUB)", swift: "ABKKAWKW" },
        { name: "Al Ahli Bank of Kuwait (ABK)", swift: "ABKKKWKW" }
    ],
    "Saudi Arabia": [
        { name: "Al Rajhi Bank", swift: "RJHIKJSA" },
        { name: "Saudi National Bank (SNB)", swift: "NCBKKJSA" },
        { name: "Riyad Bank", swift: "RIYADJSA" },
        { name: "Alinma Bank", swift: "INMAKJSA" },
        { name: "Saudi Awwal Bank (SAB)", swift: "SABBKRSA" },
        { name: "Arab National Bank (ANB)", swift: "ARNBKJSA" },
        { name: "Bank AlJazira", swift: "BJAZKJSA" },
        { name: "Bank AlBilad", swift: "ALBIKJSA" }
    ],
    "UAE": [
        { name: "First Abu Dhabi Bank (FAB)", swift: "NBADAEAD" },
        { name: "Emirates NBD", swift: "EBIBAEAD" },
        { name: "Abu Dhabi Commercial Bank (ADCB)", swift: "ADCBKJSA" },
        { name: "Dubai Islamic Bank (DIB)", swift: "DUBIAEAD" },
        { name: "Mashreq Bank", swift: "MSHQAEAD" }
    ],
    "Egypt": [
        { name: "National Bank of Egypt (NBE)", swift: "NBEGKEGX" },
        { name: "Banque Misr", swift: "BMISKEGX" },
        { name: "Commercial International Bank (CIB)", swift: "CIBEKEGX" },
        { name: "QNB Alahli", swift: "QNBAKEGX" }
    ],
    "Qatar": [
        { name: "Qatar National Bank (QNB)", swift: "QNBAQAQA" },
        { name: "Commercial Bank of Qatar (CBQ)", swift: "CBQAQAQA" },
        { name: "Qatar Islamic Bank (QIB)", swift: "QIBKQAQA" }
    ]
};

const COUNTRIES_KEYS = [
    "kuwait", "saudi", "uae", "qatar", "bahrain", "oman", "egypt", "jordan", 
    "lebanon", "iraq", "morocco", "algeria", "tunisia", "libya", "sudan", 
    "yemen", "palestine", "syria", "mauritania", "somalia", "djibouti", "comoros"
];

export const CompanyInfoBuilder: React.FC<CompanyInfoBuilderProps> = ({ companyInfo, setCompanyInfo, showAbout }) => {
  const { t, i18n } = useTranslation(['companies', 'common']);

  const [activeTab, setActiveTab] = useState<'profile' | 'financial' | 'legal'>('profile');
  const [isLogoGenerating, setIsLogoGenerating] = useState(false);
  const [logoStyle, setLogoStyle] = useState('Modern');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setCompanyInfo(info => ({ ...info, [e.target.name]: e.target.value }));
  };

  const handleBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedBankName = e.target.value;
      let foundSwift = '';
      
      for (const region in BANKS_DATA) {
          const bank = BANKS_DATA[region as keyof typeof BANKS_DATA].find(b => b.name === selectedBankName);
          if (bank) {
              foundSwift = bank.swift;
              break;
          }
      }

      setCompanyInfo(info => ({ 
          ...info, 
          bankName: selectedBankName,
          swiftCode: foundSwift || info.swiftCode 
      }));
  };

  const handleSignatoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setCompanyInfo(info => ({
          ...info,
          authorizedSignatory: {
              ...info.authorizedSignatory!,
              [name]: value
          }
      }));
  };

  const handleSignatureSave = (dataUrl: string) => {
      setCompanyInfo(info => ({
          ...info,
          authorizedSignatory: {
              ...info.authorizedSignatory!,
              signature: dataUrl
          }
      }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        setCompanyInfo(info => ({...info, logo: reader.result as string}));
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateLogo = async () => {
    if (!companyInfo.name.trim()) {
        alert(t('companies:logoNameRequired'));
        return;
    }
    setIsLogoGenerating(true);
    try {
        const logoDataUrl = await generateLogoImage(companyInfo.name, logoStyle, companyInfo.industry);
        setCompanyInfo(info => ({...info, logo: logoDataUrl}));
    } catch (error) {
        console.error("Failed to generate logo:", error);
        alert(t('common:error'));
    } finally {
        setIsLogoGenerating(false);
    }
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
          const newDoc: Attachment = {
              id: Date.now().toString(),
              name: file.name,
              type: file.type.includes('image') ? 'image' : 'pdf',
              dataUrl: reader.result as string,
              uploadedAt: new Date().toISOString()
          };
          setCompanyInfo(prev => ({
              ...prev,
              documents: [...(prev.documents || []), newDoc]
          }));
      };
      reader.readAsDataURL(file);
  };

  const removeDocument = (id: string) => {
      setCompanyInfo(prev => ({
          ...prev,
          documents: prev.documents?.filter(d => d.id !== id)
      }));
  };

  const SectionTitle = ({ icon: Icon, title }: { icon: any, title: string }) => (
    <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-100 dark:border-gray-700">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-800">
            <Icon size={20} strokeWidth={2} />
        </div>
        <h4 className="text-base font-bold text-gray-900 dark:text-white leading-none">{title}</h4>
    </div>
  );

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm" dir={i18n.dir()}>
        {/* Tabs Header */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-hide w-full">
            <button onClick={() => setActiveTab('profile')} className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'profile' ? 'bg-white dark:bg-gray-800 text-blue-600 border-b-2 border-blue-600' : 'bg-gray-50 dark:bg-gray-900/50 text-gray-500 hover:text-gray-700'}`}>
                <Building2 size={18} /> {t('companies:profile')}
            </button>
            <button onClick={() => setActiveTab('financial')} className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'financial' ? 'bg-white dark:bg-gray-800 text-blue-600 border-b-2 border-blue-600' : 'bg-gray-50 dark:bg-gray-900/50 text-gray-500 hover:text-gray-700'}`}>
                <Wallet size={18} /> {t('companies:financial')}
            </button>
            <button onClick={() => setActiveTab('legal')} className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'legal' ? 'bg-white dark:bg-gray-800 text-blue-600 border-b-2 border-blue-600' : 'bg-gray-50 dark:bg-gray-900/50 text-gray-500 hover:text-gray-700'}`}>
                <FileText size={18} /> {t('companies:legal')}
            </button>
        </div>

        {/* Content */}
        <div className="p-6 animate-fade-in">
            {activeTab === 'profile' && (
                <div className="space-y-8">
                    {/* Logo Section */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-1.5 bg-blue-200/50 dark:bg-blue-800/50 rounded-lg text-blue-700 dark:text-blue-300">
                                <Sparkles size={16} />
                            </div>
                            <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300">{t('companies:branding')}</h4>
                        </div>

                        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                            {/* Logo Preview */}
                            <div className="w-32 h-32 rounded-2xl bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden shadow-sm relative group flex-shrink-0">
                                {companyInfo.logo ? (
                                    <img src={companyInfo.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                                ) : (
                                    <ImageIcon className="text-gray-300" size={32} />
                                )}
                                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                    <span className="text-white text-xs font-bold">{t('common:uploadLogo')}</span>
                                    <input type="file" className="hidden" onChange={handleLogoUpload} accept="image/*" />
                                </label>
                            </div>

                            {/* Generator Controls */}
                            <div className="flex-1 w-full">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 mb-1 uppercase tracking-wider">{t('companies:logoStyle')}</label>
                                        <select 
                                            value={logoStyle}
                                            onChange={(e) => setLogoStyle(e.target.value)}
                                            className="w-full p-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            {['Modern', 'Classic', 'Abstract', 'Luxury', 'Bold'].map(style => (
                                                <option key={style} value={style}>{t(`companies:styles.${style.toLowerCase()}`)}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-end">
                                        <button 
                                            type="button"
                                            onClick={handleGenerateLogo}
                                            disabled={isLogoGenerating || !companyInfo.name}
                                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                                        >
                                            {isLogoGenerating ? t('companies:generating') : <><Sparkles size={16}/> {t('companies:generate')}</>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div>
                        <SectionTitle icon={Building2} title={t('companies:contactInfo')} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                                    {t('companies:companyName')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text" name="name" value={companyInfo.name} onChange={handleChange}
                                    className="w-full p-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder={t('companies:companyName')}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                                    <Briefcase size={12} /> {t('companies:industry')}
                                </label>
                                <input
                                    type="text" name="industry" value={companyInfo.industry || ''} onChange={handleChange}
                                    className="w-full p-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder={t('companies:industryPlaceholder')}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                                     <Phone size={12} /> {t('companies:companyPhone')}
                                </label>
                                <input
                                    type="text" name="phone" value={companyInfo.phone} onChange={handleChange}
                                    className="w-full p-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="+965 ..."
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                                     <MapPin size={12} /> {t('companies:companyAddress')}
                                </label>
                                <input
                                    type="text" name="address" value={companyInfo.address} onChange={handleChange}
                                    className="w-full p-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="City, Block, Street..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Digital Presence */}
                    <div>
                        <SectionTitle icon={Globe} title={t('companies:digitalPresence')} />
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                                     <Mail size={12} /> {t('companies:companyEmail')}
                                </label>
                                <input
                                    type="email" name="email" value={companyInfo.email || ''} onChange={handleChange}
                                    className="w-full p-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="info@company.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                                     <Globe size={12} /> {t('companies:companyWebsite')}
                                </label>
                                <input
                                    type="text" name="website" value={companyInfo.website || ''} onChange={handleChange}
                                    className="w-full p-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="www.company.com"
                                />
                            </div>
                         </div>
                    </div>
                </div>
            )}

            {activeTab === 'financial' && (
                <div className="space-y-8">
                    <div>
                        <SectionTitle icon={Wallet} title={t('companies:paymentDetails')} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                             <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                                    <Building2 size={12} /> {t('companies:bankName')}
                                </label>
                                <select
                                    name="bankName"
                                    value={companyInfo.bankName || ''}
                                    onChange={handleBankChange}
                                    className="w-full p-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                >
                                    <option value="">{t('companies:selectBank')}</option>
                                    {Object.entries(BANKS_DATA).map(([region, banks]) => (
                                        <optgroup key={region} label={region}>
                                            {banks.map(bank => (
                                                <option key={bank.swift} value={bank.name}>{bank.name}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                    <option value="Other">{t('common:other')}</option>
                                </select>
                                {companyInfo.bankName === 'Other' && (
                                    <input 
                                        type="text" 
                                        className="mt-2 w-full p-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder={t('companies:bankName')}
                                        onChange={(e) => setCompanyInfo({...companyInfo, bankName: e.target.value})}
                                    />
                                )}
                            </div>
                            
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                                    <CreditCard size={12} /> {t('companies:iban')}
                                </label>
                                <input
                                    type="text" name="iban" value={companyInfo.iban || ''} onChange={handleChange}
                                    className="w-full p-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                                    placeholder="KW00 0000 ..."
                                />
                            </div>
                             <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                                     <Wallet size={12} /> {t('companies:accountNumber')}
                                </label>
                                <input
                                    type="text" name="accountNumber" value={companyInfo.accountNumber || ''} onChange={handleChange}
                                    className="w-full p-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                                    placeholder="0000000000"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                                     <Globe size={12} /> {t('companies:swiftCode')}
                                </label>
                                <div className="relative">
                                    <input
                                        type="text" name="swiftCode" value={companyInfo.swiftCode || ''} onChange={handleChange}
                                        className={`w-full p-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono uppercase ${i18n.dir() === 'rtl' ? 'pl-8' : 'pr-8'}`}
                                        placeholder={t('companies:selectSwift')}
                                    />
                                    {companyInfo.swiftCode && (
                                        <div className={`absolute top-1/2 -translate-y-1/2 ${i18n.dir() === 'rtl' ? 'left-2' : 'right-2'} flex items-center`}>
                                            <Check size={16} className="text-emerald-500" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                         <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 text-xs rounded-xl flex items-start gap-3">
                             <Info size={16} className="flex-shrink-0 mt-0.5" />
                             <p className="leading-relaxed">
                                 {t('companies:financeInfoTip')}
                             </p>
                         </div>
                    </div>
                </div>
            )}

            {activeTab === 'legal' && (
                <div className="space-y-8">
                    {/* Legal Info */}
                    <div>
                        <SectionTitle icon={Briefcase} title={t('companies:legalInfo')} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                    {t('companies:licenseNumber')}
                                </label>
                                <input
                                    type="text" name="licenseNumber" value={companyInfo.licenseNumber || ''} onChange={handleChange}
                                    className="w-full p-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                    {t('companies:country')}
                                </label>
                                <select
                                    name="country"
                                    value={companyInfo.country || ''}
                                    onChange={handleChange}
                                    className="w-full p-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                >
                                    <option value="">{t('companies:selectCountry')}</option>
                                    {COUNTRIES_KEYS.map(key => (
                                        <option key={key} value={key}>{t(`common:countries.${key}`)}</option>
                                    ))}
                                    <option value="Other">{t('common:other')}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <SectionTitle icon={PenTool} title={t('companies:signatoryInfo')} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                                    <User size={12}/> {t('companies:authSignatory')}
                                </label>
                                <input
                                    type="text" name="name" value={companyInfo.authorizedSignatory?.name || ''} onChange={handleSignatoryChange}
                                    className="w-full p-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                                    <Briefcase size={12}/> {t('companies:role')}
                                </label>
                                <input
                                    type="text" name="role" value={companyInfo.authorizedSignatory?.role || ''} onChange={handleSignatoryChange}
                                    className="w-full p-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                    {t('companies:civilId')}
                                </label>
                                <input
                                    type="text" name="civilId" value={companyInfo.authorizedSignatory?.civilId || ''} onChange={handleSignatoryChange}
                                    className="w-full p-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                    {t('companies:nationality')}
                                </label>
                                <input
                                    type="text" name="nationality" value={companyInfo.authorizedSignatory?.nationality || ''} onChange={handleSignatoryChange}
                                    className="w-full p-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                                    {t('companies:passport')}
                                </label>
                                <input
                                    type="text" name="passport" value={companyInfo.authorizedSignatory?.passport || ''} onChange={handleSignatoryChange}
                                    className="w-full p-2.5 text-sm border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                        
                        <div className="mt-6">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                                <PenTool size={12}/> {t('companies:signature')}
                            </label>
                            <div className="border rounded-xl overflow-hidden">
                                <SignatureInput 
                                    value={companyInfo.authorizedSignatory?.signature || ''} 
                                    onSave={handleSignatureSave} 
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <SectionTitle icon={FileText} title={t('companies:documents')} />
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                            {companyInfo.documents && companyInfo.documents.length > 0 ? (
                                companyInfo.documents.map(doc => (
                                    <div key={doc.id} className="relative group border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900/50 hover:border-blue-300 transition-colors">
                                        <div className="h-24 w-full flex items-center justify-center bg-white dark:bg-gray-800 rounded-lg mb-2 overflow-hidden shadow-sm">
                                            {doc.type === 'image' ? (
                                                <img src={doc.dataUrl} className="h-full w-full object-cover" alt={doc.name} />
                                            ) : (
                                                <FileText size={32} className="text-blue-400" />
                                            )}
                                        </div>
                                        <p className="text-[10px] truncate w-full text-center text-gray-600 dark:text-gray-300 font-medium">{doc.name}</p>
                                        
                                        <button 
                                            type="button"
                                            onClick={() => removeDocument(doc.id)} 
                                            className="absolute top-2 right-2 p-1.5 bg-red-500/90 rounded-full text-white hover:bg-red-600 shadow-sm opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100" 
                                            title={t('common:delete')}
                                        >
                                            <Trash2 size={14}/>
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-8 text-center text-sm text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
                                    <FileText size={32} className="mx-auto mb-2 opacity-20" />
                                    <p>{t('companies:noDocs')}</p>
                                </div>
                            )}
                        </div>

                        <div className="relative w-full">
                            <button type="button" className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-100 dark:hover:bg-blue-900/30 transition border border-blue-100 dark:border-blue-800 border-dashed">
                                <UploadCloud size={18} /> {t('companies:uploadDoc')}
                            </button>
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleDocumentUpload} accept="image/*,application/pdf,.doc,.docx" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    </section>
  );
};
