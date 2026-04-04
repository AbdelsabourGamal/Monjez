import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { SavedItem, ItemStatus, Quote, CompanyInfo } from '../types';
import { 
  FileText, Briefcase, File, Clock, Trash2, Search, 
  User, FolderOpen, Archive,
  ArrowRight, LayoutGrid, List, BarChart2, PieChart, ShieldCheck, Users
} from 'lucide-react';

interface DashboardProps {
  savedItems: SavedItem[];
  onLoadItem: (item: SavedItem) => void;
  onDeleteItem: (id: string) => void;
  onDuplicateItem: (id: string) => void;
  mode: 'portfolio' | 'history';
  companyInfo?: CompanyInfo;
  onCreateNew?: (view: 'quote' | 'contract' | 'document' | 'clients' | 'bank-compliance') => void;
  lastLoginTime?: string;
}

// --- Marketing Slider Component ---
const MarketingSlider: React.FC<{ onCreateNew: (view: any) => void }> = ({ onCreateNew }) => {
    const { t } = useTranslation(['dashboard']);
    const [currentIndex, setCurrentIndex] = useState(0);

    const slides = useMemo(() => [
        {
            id: 1,
            title: t('dashboard:marketing.contracts.title'),
            desc: t('dashboard:marketing.contracts.desc'),
            cta: t('dashboard:marketing.contracts.cta'),
            action: 'contract',
            bg: 'from-blue-600 to-indigo-700',
            icon: <Briefcase size={120} className="text-white opacity-10 absolute -bottom-10 -right-10 rtl:-left-10 rtl:right-auto" />
        },
        {
            id: 2,
            title: t('dashboard:marketing.quotes.title'),
            desc: t('dashboard:marketing.quotes.desc'),
            cta: t('dashboard:marketing.quotes.cta'),
            action: 'quote',
            bg: 'from-purple-600 to-pink-600',
            icon: <FileText size={120} className="text-white opacity-10 absolute -bottom-10 -right-10 rtl:-left-10 rtl:right-auto" />
        },
        {
            id: 3,
            title: t('dashboard:marketing.compliance.title'),
            desc: t('dashboard:marketing.compliance.desc'),
            cta: t('dashboard:marketing.compliance.cta'),
            action: 'bank-compliance',
            bg: 'from-emerald-600 to-teal-600',
            icon: <ShieldCheck size={120} className="text-white opacity-10 absolute -bottom-10 -right-10 rtl:-left-10 rtl:right-auto" />
        }
    ], [t]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [slides.length]);

    return (
        <div className="relative w-full h-48 md:h-56 rounded-3xl overflow-hidden shadow-lg mb-8 group transition-all duration-500">
            {slides.map((slide, index) => (
                <div 
                    key={slide.id}
                    className={`absolute inset-0 w-full h-full bg-gradient-to-r ${slide.bg} transition-opacity duration-700 ease-in-out flex items-center px-8 md:px-12 ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                >
                    <div className="relative z-20 max-w-lg text-white">
                        <h2 className="text-2xl md:text-3xl font-black mb-2 leading-tight">{slide.title}</h2>
                        <p className="text-sm md:text-base text-blue-50 mb-6 font-medium opacity-90">{slide.desc}</p>
                        <button 
                            onClick={() => onCreateNew(slide.action)}
                            className="px-6 py-2.5 bg-white text-gray-900 rounded-xl text-sm font-bold hover:bg-opacity-90 transition shadow-lg flex items-center gap-2"
                        >
                            {slide.cta} <ArrowRight size={16} className="rtl:rotate-180"/>
                        </button>
                    </div>
                    {slide.icon}
                </div>
            ))}
            
            {/* Dots Navigation */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30 flex gap-2">
                {slides.map((_, idx) => (
                    <button 
                        key={idx} 
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'}`}
                    />
                ))}
            </div>
        </div>
    );
};

export const Dashboard: React.FC<DashboardProps> = ({ savedItems, onLoadItem, onDeleteItem, onDuplicateItem, mode, companyInfo, onCreateNew, lastLoginTime }) => {
  const { t, i18n } = useTranslation(['dashboard', 'common', 'quotes', 'contracts', 'documents', 'clients']);

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all');
  
  // Date Range Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const statusColors: Record<ItemStatus, string> = {
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
    pending: 'bg-blue-50 text-blue-700 border-blue-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    paid: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const statusLabels = useMemo<Record<ItemStatus, string>>(() => ({
    draft: t('common:statusLabels.draft'),
    pending: t('common:statusLabels.pending'),
    approved: t('common:statusLabels.approved'),
    rejected: t('common:statusLabels.rejected'),
    paid: t('common:statusLabels.paid')
  }), [t]);

  // Strict Separation Logic
  const relevantItems = useMemo(() => {
      if (mode === 'portfolio') {
          return savedItems.filter(i => ['draft', 'pending', 'approved'].includes(i.status));
      } else {
          return savedItems.filter(i => ['paid', 'rejected'].includes(i.status));
      }
  }, [savedItems, mode]);

  // --- Filtering Logic ---
  const filteredItems = useMemo(() => {
    return relevantItems.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.clientName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      
      let matchesDate = true;
      if (startDate || endDate) {
        const itemDate = new Date(item.updatedAt).getTime();
        if (startDate) matchesDate = matchesDate && itemDate >= new Date(startDate).getTime();
        if (endDate) matchesDate = matchesDate && itemDate <= new Date(endDate).setHours(23, 59, 59, 999);
      }

      return matchesSearch && matchesStatus && matchesDate;
    }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [relevantItems, searchTerm, statusFilter, startDate, endDate]);

  const getItemValue = (item: SavedItem) => {
      if (item.type !== 'quote') return null;
      const q = item.data as Quote;
      const subtotal = q.items.reduce((sum, i) => sum + (i.qty * i.price), 0);
      const total = subtotal - (subtotal * (q.discount / 100)) + (subtotal * (q.tax / 100));
      return { amount: total, currency: q.currency || t('common:none') };
  };

  const formatMoney = (amount: number, currency: string) => {
      const locale = i18n.language === 'ar' ? 'ar-SA' : 'en-US';
      return new Intl.NumberFormat(locale, {
          maximumFractionDigits: 3,
          style: 'decimal'
      }).format(amount);
  };

  // --- Analytics Logic ---
  const analytics = useMemo(() => {
      // Status Distribution for Donut Chart
      const statusCounts: Record<string, number> = { draft: 0, pending: 0, approved: 0, rejected: 0, paid: 0 };
      savedItems.forEach(item => {
          if (statusCounts[item.status] !== undefined) {
              statusCounts[item.status]++;
          }
      });
      const total = savedItems.length || 1;
      const percentages = {
          draft: (statusCounts.draft / total) * 100,
          pending: (statusCounts.pending / total) * 100,
          approved: (statusCounts.approved / total) * 100,
          rejected: (statusCounts.rejected / total) * 100,
          paid: (statusCounts.paid / total) * 100
      };

      // Revenue Trend (Last 6 months)
      const now = new Date();
      const months = [];
      const revenueData = [];
      
      for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthLabel = d.toLocaleString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short' });
          months.push(monthLabel);
          
          // Calculate revenue for this month
          const monthlyRevenue = savedItems
            .filter(item => item.type === 'quote' && (item.status === 'paid' || item.status === 'approved'))
            .filter(item => {
                const itemDate = new Date(item.updatedAt);
                return itemDate.getMonth() === d.getMonth() && itemDate.getFullYear() === d.getFullYear();
            })
            .reduce((sum, item) => {
                const val = getItemValue(item);
                return sum + (val ? val.amount : 0);
            }, 0);
            
          revenueData.push(monthlyRevenue);
      }
      
      const maxRevenue = Math.max(...revenueData) || 1;

      return { percentages, months, revenueData, maxRevenue, total: savedItems.length };
  }, [savedItems, i18n.language, t]);


  const ServiceCard = ({ title, desc, icon: Icon, gradient, onClick, delay }: any) => (
      <div 
        onClick={onClick}
        className={`relative overflow-hidden rounded-3xl p-5 cursor-pointer shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-95 group animate-scale-in ${delay}`}
        style={{ background: gradient }}
      >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/5 rounded-full -ml-5 -mb-5 blur-xl"></div>
          
          <div className="relative z-10 flex flex-col h-full justify-between text-white">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform">
                  <Icon size={24} className="text-white" />
              </div>
              <div>
                  <h3 className="text-lg font-bold mb-1 leading-tight">{title}</h3>
                  <p className="text-xs text-white/80 font-medium">{desc}</p>
              </div>
          </div>
      </div>
  );

  return (
    <div className="space-y-8 pb-12 p-6" dir={i18n.dir()}>
      
      {/* Header & Analytics Section */}
      {mode === 'portfolio' && (
          <div className="animate-fade-up space-y-8">
              <div className="mt-6 mb-4">
                  <div className="flex items-end justify-between">
                      <div>
                          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                              {t('dashboard:welcome')} <span className="text-blue-600 animate-pulse bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">{companyInfo?.name?.split(' ')[0] || ''}</span>
                          </h1>
                          <div className="flex items-center gap-2 mt-2">
                               <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                                   <span className="relative flex h-2 w-2">
                                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                     <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                   </span>
                                   {lastLoginTime ? t('dashboard:activeSince', { time: lastLoginTime }) : t('dashboard:activeNow')}
                               </span>
                          </div>
                      </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-3">{t('dashboard:quickActions')}</p>
              </div>

              {/* Marketing Slider */}
              {onCreateNew && <MarketingSlider onCreateNew={onCreateNew} />}

              {/* Service Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <ServiceCard 
                    title={t('quotes:tab')} 
                    desc={t('dashboard:services.quoteDesc')}
                    icon={FileText} 
                    gradient="linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)"
                    onClick={() => onCreateNew && onCreateNew('quote')}
                    delay="delay-100"
                  />
                  <ServiceCard 
                    title={t('contracts:tab')} 
                    desc={t('dashboard:services.contractDesc')}
                    icon={Briefcase} 
                    gradient="linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)"
                    onClick={() => onCreateNew && onCreateNew('contract')}
                    delay="delay-200"
                  />
                  <ServiceCard 
                    title={t('documents:tab')} 
                    desc={t('dashboard:services.docDesc')}
                    icon={File} 
                    gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
                    onClick={() => onCreateNew && onCreateNew('document')}
                    delay="delay-300"
                  />
                  <ServiceCard 
                    title={t('clients:tab')} 
                    desc={t('dashboard:services.clientsDesc')}
                    icon={Users} 
                    gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)"
                    onClick={() => onCreateNew && onCreateNew('clients')}
                    delay="delay-300"
                  />
              </div>

              {/* Visual Analytics Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Revenue Bar Chart */}
                  <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2"><BarChart2 size={18} className="text-blue-600"/> {t('dashboard:monthlyRevenue')}</h3>
                      </div>
                      <div className="flex items-end justify-between h-40 gap-2">
                          {analytics.revenueData.map((val, i) => (
                              <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full">
                                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-t-lg relative overflow-hidden h-full flex items-end">
                                      <div 
                                        className="w-full bg-blue-500 group-hover:bg-blue-600 transition-all rounded-t-lg" 
                                        style={{ height: `${(val / analytics.maxRevenue) * 100}%` }}
                                      ></div>
                                      {/* Tooltip */}
                                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                          {val > 0 ? val.toFixed(0) : 0}
                                      </div>
                                  </div>
                                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{analytics.months[i]}</span>
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* Status Donut Chart */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center relative">
                      <h3 className="font-bold text-gray-800 dark:text-white mb-4 w-full text-left rtl:text-right flex items-center gap-2"><PieChart size={18} className="text-purple-600"/> {t('dashboard:statusRatio')}</h3>
                      
                      <div className="relative w-40 h-40 rounded-full" style={{
                          background: `conic-gradient(
                              #10B981 0% ${analytics.percentages.approved}%, 
                              #3B82F6 ${analytics.percentages.approved}%, 
                              #3B82F6 ${analytics.percentages.approved}% ${analytics.percentages.approved + analytics.percentages.pending}%,
                              #EF4444 ${analytics.percentages.approved + analytics.percentages.pending}% ${analytics.percentages.approved + analytics.percentages.pending + analytics.percentages.rejected}%,
                              #A855F7 ${analytics.percentages.approved + analytics.percentages.pending + analytics.percentages.rejected}% ${analytics.percentages.approved + analytics.percentages.pending + analytics.percentages.rejected + analytics.percentages.paid}%,
                              #E5E7EB ${analytics.percentages.approved + analytics.percentages.pending + analytics.percentages.rejected + analytics.percentages.paid}% 100%
                          )`
                      }}>
                          <div className="absolute inset-4 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center flex-col">
                              <span className="text-2xl font-bold text-gray-800 dark:text-white">{analytics.total}</span>
                              <span className="text-[10px] text-gray-500 uppercase">{t('common:total')}</span>
                          </div>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 w-full text-xs">
                          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> {statusLabels.approved}</div>
                          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> {statusLabels.paid}</div>
                          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> {statusLabels.pending}</div>
                          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> {statusLabels.rejected}</div>
                          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300"></span> {statusLabels.draft}</div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="animate-fade-up">
          <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {mode === 'portfolio' ? <Clock size={20} className="text-blue-600"/> : <Archive size={20} className="text-purple-600"/>}
                  {t('dashboard:recentActivity')}
              </h2>
              
              {/* Simple Filter */}
              <div className="flex gap-2">
                 <button onClick={() => setViewMode(v => v === 'list' ? 'kanban' : 'list')} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 shadow-sm active:scale-95 transition">
                     {viewMode === 'list' ? <LayoutGrid size={18} /> : <List size={18} />}
                 </button>
              </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
             <Search size={18} className={`absolute top-1/2 -translate-y-1/2 ${i18n.dir() === 'rtl' ? 'right-3' : 'left-3'} text-gray-400`} />
             <input 
                type="text" 
                placeholder={t('dashboard:searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full ${i18n.dir() === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm`}
             />
          </div>

          {/* Content List */}
          {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-50 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl">
                    <FolderOpen size={48} className="mb-2 text-gray-300" />
                    <p className="text-sm font-medium text-gray-400">{t('common:empty')}</p>
                </div>
          ) : viewMode === 'list' ? (
              <div className="space-y-3">
                  {filteredItems.map((item, index) => {
                      const valueData = getItemValue(item);
                      
                      return (
                          <div 
                            key={item.id} 
                            onClick={() => onLoadItem(item)} 
                            className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 active:scale-[0.98] transition-all flex items-center gap-4 group animate-fade-up"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-white shadow-md transition-transform group-hover:rotate-3 ${item.type === 'quote' ? 'bg-blue-500 shadow-blue-200' : item.type === 'contract' ? 'bg-purple-500 shadow-purple-200' : 'bg-amber-500 shadow-amber-200'}`}>
                                  {item.type === 'quote' ? <FileText size={22} /> : item.type === 'contract' ? <Briefcase size={22} /> : <File size={22} />}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center mb-0.5">
                                      <h4 className="font-bold text-gray-900 dark:text-white truncate text-sm">{item.title}</h4>
                                      <span className="text-[10px] text-gray-400">{new Date(item.updatedAt).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                                      <User size={10} /> {item.clientName}
                                  </p>
                              </div>

                              <div className="text-right flex-shrink-0 pl-2 rtl:pl-0 rtl:pr-2 border-l rtl:border-l-0 rtl:border-r border-gray-100 dark:border-gray-700">
                                  {valueData ? (
                                      <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{formatMoney(valueData.amount, valueData.currency)}</p>
                                  ) : (
                                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{t(`${item.type}s:tab`)}</p>
                                  )}
                                  <span className={`inline-flex justify-center w-full px-2 py-0.5 rounded-full text-[9px] font-bold mt-1 ${statusColors[item.status]}`}>
                                      {statusLabels[item.status]}
                                  </span>
                              </div>
                          </div>
                      );
                  })}
              </div>
          ) : (
              // Kanban Grid
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {filteredItems.map((item, index) => {
                       const valueData = getItemValue(item);
                       return (
                           <div key={item.id} onClick={() => onLoadItem(item)} className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow animate-fade-up" style={{ animationDelay: `${index * 50}ms` }}>
                               <div className="flex justify-between items-start mb-4">
                                   <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase ${item.type === 'quote' ? 'bg-blue-50 text-blue-600' : item.type === 'contract' ? 'bg-purple-50 text-purple-600' : 'bg-amber-50 text-amber-600'}`}>
                                       {t(`${item.type}s:tab`)}
                                   </span>
                                   <span className={`w-2 h-2 rounded-full ${item.status === 'approved' || item.status === 'paid' ? 'bg-emerald-500' : item.status === 'rejected' ? 'bg-red-500' : 'bg-gray-300'}`}></span>
                               </div>
                               <h4 className="font-bold text-gray-900 dark:text-white text-base mb-1 line-clamp-2">{item.title}</h4>
                               <p className="text-xs text-gray-500 mb-4 flex items-center gap-1"><User size={12}/> {item.clientName}</p>
                               
                               <div className="flex justify-between items-end pt-3 border-t border-dashed border-gray-100 dark:border-gray-700">
                                   <p className="text-[10px] text-gray-400">{new Date(item.updatedAt).toLocaleDateString()}</p>
                                   {valueData && (
                                       <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{formatMoney(valueData.amount, valueData.currency)} <span className="text-[10px]">{valueData.currency}</span></p>
                                   )}
                                </div>
                           </div>
                       )
                   })}
              </div>
          )}
      </div>
    </div>
  );
};
