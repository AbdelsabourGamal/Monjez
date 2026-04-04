import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { SavedItem, Quote, Language, Expense, QuoteCurrency, Attachment } from '../types';
import { DollarSign, TrendingUp, TrendingDown, Plus, Trash2, PieChart, ScanLine, Paperclip, BarChart, ArrowUpRight, ArrowDownRight, Clock, ChevronDown, Sparkles, FileText, AlertTriangle } from 'lucide-react';
import { analyzeReceipt } from '../services/geminiService';

interface AccountingHelperProps {
  savedItems: SavedItem[];
}

// Simple CSS Bar Chart
const SimpleBarChart = ({ data, labels, height = 150 }: { data: number[], labels: string[], height?: number }) => {
    const max = Math.max(...data, 1);
    return (
        <div className="flex items-end justify-between gap-2 w-full pt-6" style={{ height }}>
            {data.map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                    <div className="w-full bg-blue-50 dark:bg-blue-900/10 rounded-t-xl relative overflow-visible h-full flex items-end">
                        <div 
                            className="w-full bg-blue-600 dark:bg-blue-500 transition-all duration-700 ease-out rounded-t-xl group-hover:bg-blue-700 relative" 
                            style={{ height: `${(val / max) * 100}%` }}
                        >
                             {/* Floating Value */}
                             <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none font-bold shadow-xl">
                                {val.toLocaleString()}
                            </div>
                        </div>
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold truncate w-full text-center uppercase tracking-widest">{labels[i]}</span>
                </div>
            ))}
        </div>
    );
};

export const AccountingHelper: React.FC<AccountingHelperProps> = ({ savedItems }) => {
  const { t, i18n } = useTranslation(['accounting', 'common']);

  const [activeTab, setActiveTab] = useState<'general' | 'tax' | 'cashflow'>('general');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [newExpense, setNewExpense] = useState<Omit<Expense, 'id'>>({
      description: '', amount: 0, category: 'Office', date: new Date().toISOString().split('T')[0], currency: 'KWD', responsiblePerson: '', attachments: []
  });
  const [isScanning, setIsScanning] = useState(false);

  // Custom Category State
  const initialCategories = t('accounting:categories', { returnObjects: true }) as string[];
  const [availableCategories, setAvailableCategories] = useState<string[]>(Array.isArray(initialCategories) ? initialCategories : ['Office', 'Salary', 'Software', 'Marketing', 'Travel', 'Other']);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');

  // Filter States
  const [dateFilterStart, setDateFilterStart] = useState('');
  const [dateFilterEnd, setDateFilterEnd] = useState('');

  // Tax States
  const [taxRegion, setTaxRegion] = useState<'ksa' | 'uae' | 'eg' | 'kw'>('ksa');
  const [taxQuarter, setTaxQuarter] = useState<number>(Math.ceil((new Date().getMonth() + 1) / 3));
  const [taxYear, setTaxYear] = useState<number>(new Date().getFullYear());

  const descriptionInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      const stored = localStorage.getItem('mashhorquote-expenses');
      if (stored) {
          try { setExpenses(JSON.parse(stored)); } catch(e) {}
      }
      
      const storedCats = localStorage.getItem('mashhorquote-categories');
      if (storedCats) {
          try { setAvailableCategories(JSON.parse(storedCats)); } catch(e) {}
      }
  }, []);

  useEffect(() => {
      localStorage.setItem('mashhorquote-expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
      localStorage.setItem('mashhorquote-categories', JSON.stringify(availableCategories));
  }, [availableCategories]);

  const handleAddExpense = () => {
      if (!newExpense.description || newExpense.amount <= 0) return;
      
      let finalCategory = newExpense.category;
      if (isCustomCategory && customCategoryName.trim()) {
          finalCategory = customCategoryName.trim();
          if (!availableCategories.includes(finalCategory)) {
              setAvailableCategories(prev => [...prev, finalCategory]);
          }
      }

      setExpenses(prev => [{ ...newExpense, category: finalCategory, id: Date.now().toString() }, ...prev]);
      
      // Reset form
      setNewExpense({ description: '', amount: 0, category: 'Office', date: new Date().toISOString().split('T')[0], currency: 'KWD', responsiblePerson: '', attachments: [] });
      setIsCustomCategory(false);
      setCustomCategoryName('');
  };

  const deleteExpense = (id: string) => {
      setExpenses(prev => prev.filter(e => e.id !== id));
  };

    const handleSmartScan = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsScanning(true);
        const reader = new FileReader();
        reader.onload = async () => {
            const dataUrl = reader.result as string;
            const newAtt: Attachment = {
                id: Date.now().toString(),
                name: file.name,
                type: 'image',
                dataUrl: dataUrl,
                uploadedAt: new Date().toISOString()
            };
            
            try {
                const extractedData = await analyzeReceipt(dataUrl);
                setNewExpense(prev => ({
                    ...prev,
                    description: extractedData.description || prev.description,
                    amount: extractedData.amount || prev.amount,
                    date: extractedData.date || prev.date,
                    category: extractedData.category || prev.category,
                    currency: (extractedData.currency as QuoteCurrency) || prev.currency,
                    attachments: [...(prev.attachments || []), newAtt]
                }));
            } catch (err) {
                console.error("Scan failed", err);
                setNewExpense(prev => ({ ...prev, attachments: [...(prev.attachments || []), newAtt] }));
            } finally {
                setIsScanning(false);
            }
        };
        reader.readAsDataURL(file);
    };

  // Filtered Data for Calculations
  const filteredExpenses = useMemo(() => {
      return expenses.filter(e => {
          if (dateFilterStart && e.date < dateFilterStart) return false;
          if (dateFilterEnd && e.date > dateFilterEnd) return false;
          return true;
      });
  }, [expenses, dateFilterStart, dateFilterEnd]);

  const filteredIncome = useMemo(() => {
      return savedItems.filter(item => {
          if (item.type !== 'quote' || item.status !== 'paid') return false;
          const itemDate = item.updatedAt.split('T')[0];
          if (dateFilterStart && itemDate < dateFilterStart) return false;
          if (dateFilterEnd && itemDate > dateFilterEnd) return false;
          return true;
      });
  }, [savedItems, dateFilterStart, dateFilterEnd]);


  // Calculations for General Tab
  const stats = useMemo(() => {
      let totalRevenue = 0;
      let totalExpenses = 0;
      
      filteredIncome.forEach(item => {
          const q = item.data as Quote;
          const subtotal = q.items.reduce((acc, i) => acc + (i.price * i.qty), 0);
          const total = subtotal - (subtotal * (q.discount / 100)) + (subtotal * (q.tax / 100));
          totalRevenue += total; 
      });

      filteredExpenses.forEach(e => {
          totalExpenses += e.amount;
      });

      const netProfit = totalRevenue - totalExpenses;
      const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      return { totalRevenue, totalExpenses, netProfit, margin };
  }, [filteredIncome, filteredExpenses]);

  // --- TAX REPORT LOGIC ---
  const taxReport = useMemo(() => {
      const taxRates = { ksa: 15, uae: 5, eg: 14, kw: 0 };
      const rate = taxRates[taxRegion];

      const startDate = new Date(taxYear, (taxQuarter - 1) * 3, 1);
      const endDate = new Date(taxYear, taxQuarter * 3, 0);

      // Sales (Output Tax)
      const salesInPeriod = savedItems.filter(item => {
          if (item.type !== 'quote' || (item.status !== 'paid' && item.status !== 'approved')) return false;
          const d = new Date(item.updatedAt);
          return d >= startDate && d <= endDate;
      });

      let totalSales = 0;
      let totalOutputTax = 0;

      salesInPeriod.forEach(item => {
          const q = item.data as Quote;
          const subtotal = q.items.reduce((acc, i) => acc + (i.price * i.qty), 0);
          const discounted = subtotal - (subtotal * (q.discount / 100));
          const taxVal = discounted * (q.tax / 100);
          totalSales += discounted;
          totalOutputTax += taxVal;
      });

      // Expenses (Input Tax)
      const expensesInPeriod = expenses.filter(e => {
          const d = new Date(e.date);
          return d >= startDate && d <= endDate;
      });

      let totalPurchases = 0;
      let totalInputTax = 0;

      expensesInPeriod.forEach(e => {
          const baseAmount = e.amount / (1 + rate / 100);
          totalPurchases += baseAmount;
          totalInputTax += e.amount - baseAmount;
      });

      return {
          salesCount: salesInPeriod.length,
          totalSales,
          totalOutputTax,
          purchasesCount: expensesInPeriod.length,
          totalPurchases,
          totalInputTax,
          netPayable: totalOutputTax - totalInputTax
      };
  }, [savedItems, expenses, taxRegion, taxQuarter, taxYear]);

  // --- CASH FLOW LOGIC ---
  const cashFlowData = useMemo(() => {
      const pendingInvoices = savedItems.filter(item => 
          item.type === 'quote' && 
          (item.status === 'pending' || item.status === 'approved') &&
          item.expiryDate 
      ).map(item => {
          const q = item.data as Quote;
          const subtotal = q.items.reduce((acc, i) => acc + (i.price * i.qty), 0);
          const total = subtotal - (subtotal * (q.discount / 100)) + (subtotal * (q.tax / 100));
          return {
              id: item.id,
              client: item.clientName,
              date: item.expiryDate || '',
              amount: total,
              currency: q.currency,
              status: item.status
          };
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const monthlyForecast: Record<string, number> = {};
      pendingInvoices.forEach(inv => {
          if(!inv.date) return;
          const month = new Date(inv.date).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short' });
          monthlyForecast[month] = (monthlyForecast[month] || 0) + inv.amount;
      });

      const chartLabels = Object.keys(monthlyForecast);
      const chartValues = Object.values(monthlyForecast);
      const maxVal = Math.max(0, ...chartValues);
      return { list: pendingInvoices, chartLabels, chartValues, maxVal, totalExpected: pendingInvoices.reduce((sum, i) => sum + i.amount, 0) };
  }, [savedItems, i18n.language]);

  const formatMoney = (amount: number) => {
      const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
      return new Intl.NumberFormat(locale, {
          maximumFractionDigits: 2,
          minimumFractionDigits: 2
      }).format(amount);
  };

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto animate-fade-in" dir={i18n.dir()}>
        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
            <div className="bg-slate-200 dark:bg-slate-800 p-1.5 rounded-2xl flex gap-1 shadow-inner">
                <button onClick={() => setActiveTab('general')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'general' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm scale-105' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}>
                    {t('accounting:general')}
                </button>
                <button onClick={() => setActiveTab('tax')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'tax' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm scale-105' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}>
                    {t('accounting:tax')}
                </button>
                <button onClick={() => setActiveTab('cashflow')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'cashflow' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm scale-105' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}>
                    {t('accounting:cashflow')}
                </button>
            </div>
        </div>

        {activeTab === 'general' && (
            <div className="space-y-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 rounded-xl"><TrendingUp size={20}/></div>
                            <span className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t('accounting:revenue')}</span>
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white" dir="ltr">{formatMoney(stats.totalRevenue)} <span className="text-xs text-gray-400 font-normal ml-1">KWD</span></h3>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-red-50 text-red-600 dark:bg-red-900/20 rounded-xl"><TrendingDown size={20}/></div>
                            <span className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t('accounting:expenses')}</span>
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 dark:text-white" dir="ltr">{formatMoney(stats.totalExpenses)} <span className="text-xs text-gray-400 font-normal ml-1">KWD</span></h3>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-blue-50 text-blue-600 dark:bg-blue-900/20 rounded-xl"><PieChart size={20}/></div>
                            <span className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{t('accounting:netProfit')}</span>
                        </div>
                        <h3 className={`text-3xl font-black ${stats.netProfit >= 0 ? 'text-blue-600' : 'text-red-500'}`} dir="ltr">{formatMoney(stats.netProfit)} <span className="text-xs text-gray-400 font-normal ml-1">KWD</span></h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-2 tracking-widest">{t('accounting:margin')}: {stats.margin.toFixed(1)}%</p>
                    </div>
                </div>

                {/* Add Expense Form */}
                <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] border border-blue-100 dark:border-gray-700 shadow-xl shadow-blue-50/50 dark:shadow-none animate-fade-up">
                    <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-6 flex items-center gap-2"><Plus size={24} className="text-blue-600"/> {t('accounting:addExpense')}</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <div className="lg:col-span-2">
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">{t('accounting:desc')} *</label>
                            <div className="relative">
                                <input 
                                    ref={descriptionInputRef}
                                    type="text" 
                                    value={newExpense.description} 
                                    onChange={e => setNewExpense({...newExpense, description: e.target.value})} 
                                    className={`w-full ${i18n.dir() === 'rtl' ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3.5 border rounded-2xl bg-gray-50 dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold`}
                                    placeholder={t('accounting:descPlaceholder') || "e.g. Office Rent"}
                                />
                                <div className={`absolute top-1/2 -translate-y-1/2 ${i18n.dir() === 'rtl' ? 'right-4' : 'left-4'} text-gray-400`}>
                                    {isScanning ? <Sparkles size={20} className="text-purple-500 animate-pulse"/> : <FileText size={20}/>}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">{t('accounting:amt')} *</label>
                            <input 
                                type="number" 
                                value={newExpense.amount} 
                                onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value) || 0})} 
                                className="w-full p-3.5 border rounded-2xl bg-gray-50 dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none font-black"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">{t('accounting:cat')}</label>
                            <select 
                                value={newExpense.category} 
                                onChange={e => setNewExpense({...newExpense, category: e.target.value})} 
                                className="w-full p-3.5 border rounded-2xl bg-gray-50 dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                            >
                                {availableCategories.map(c => <option key={c} value={c}>{t(`accounting:categoriesList.${c}`, { defaultValue: c })}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <button type="button" className="flex items-center gap-2 px-5 py-2.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 rounded-xl text-xs font-black hover:bg-purple-100 transition shadow-sm">
                                    <ScanLine size={18}/> {isScanning ? t('accounting:scanning') : t('accounting:scan')}
                                </button>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleSmartScan} accept="image/*" />
                            </div>
                            {newExpense.attachments && newExpense.attachments.length > 0 && (
                                <span className="text-xs text-blue-600 font-bold flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg"><Paperclip size={14}/> {newExpense.attachments.length}</span>
                            )}
                        </div>
                        <button 
                            onClick={handleAddExpense} 
                            className="px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-black hover:bg-blue-700 transition shadow-lg shadow-blue-200 dark:shadow-none"
                        >
                            {t('accounting:addExpense')}
                        </button>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                    {filteredExpenses.length === 0 ? (
                        <div className="p-16 text-center text-gray-400">
                             <TrendingDown size={48} className="mx-auto mb-3 opacity-20" />
                             <p className="text-sm font-medium">{t('common:empty')}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredExpenses.map(expense => (
                                <div key={expense.id} className="p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-500 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
                                            <DollarSign size={20}/>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{expense.description}</h4>
                                            <p className="text-xs text-gray-400 font-medium">{t(`accounting:categoriesList.${expense.category}`, { defaultValue: expense.category })} • {expense.date}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <span className="font-black text-gray-900 dark:text-white" dir="ltr">{formatMoney(expense.amount)} <span className="text-[10px] text-gray-400 font-bold ml-1">{expense.currency}</span></span>
                                        <button onClick={() => deleteExpense(expense.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" title={t('common:delete')}><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {activeTab === 'tax' && (
            <div className="space-y-6 animate-fade-up">
                {/* Unified Tax Summary Card */}
                <div className="bg-[#0f172a] text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
                    {/* Background decorations */}
                    <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-blue-600/5 rounded-full -mr-48 -mt-48 blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/5 rounded-full -ml-40 -mb-40 blur-3xl pointer-events-none"></div>
                    
                    <div className="relative z-10">
                        {/* Header Section */}
                        <div className="text-center mb-10">
                            <h3 className="text-3xl font-black mb-2 text-white">{t('accounting:vatReport')}</h3>
                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.3em]">{t('accounting:unifiedSummary')}</p>
                        </div>

                        {/* Filters Section - Pill Shaped Buttons */}
                        <div className="flex flex-wrap justify-center gap-4 mb-12">
                            <div className="relative group">
                                <select 
                                    value={taxQuarter} 
                                    onChange={(e) => setTaxQuarter(Number(e.target.value))} 
                                    className={`appearance-none bg-[#1e293b] text-slate-200 font-black text-xs ${i18n.dir() === 'rtl' ? 'pr-8 pl-12' : 'pl-8 pr-12'} py-4 rounded-2xl border border-slate-700 hover:border-slate-500 transition-all cursor-pointer min-w-[180px] text-center outline-none focus:ring-4 focus:ring-blue-500/20`}
                                >
                                    <option className="bg-slate-800 text-white font-bold" value={1}>{t('accounting:quarterly.1')}</option>
                                    <option className="bg-slate-800 text-white font-bold" value={2}>{t('accounting:quarterly.2')}</option>
                                    <option className="bg-slate-800 text-white font-bold" value={3}>{t('accounting:quarterly.3')}</option>
                                    <option className="bg-slate-800 text-white font-bold" value={4}>{t('accounting:quarterly.4')}</option>
                                </select>
                                <ChevronDown className={`absolute top-1/2 -translate-y-1/2 ${i18n.dir() === 'rtl' ? 'left-4' : 'right-4'} text-slate-500 pointer-events-none group-hover:text-slate-300 transition-colors`} size={16} />
                            </div>

                            <div className="relative group">
                                <select 
                                    value={taxRegion} 
                                    onChange={(e) => setTaxRegion(e.target.value as any)} 
                                    className={`appearance-none bg-[#1e293b] text-slate-200 font-black text-xs ${i18n.dir() === 'rtl' ? 'pr-8 pl-12' : 'pl-8 pr-12'} py-4 rounded-2xl border border-slate-700 hover:border-slate-500 transition-all cursor-pointer min-w-[200px] text-center outline-none focus:ring-4 focus:ring-blue-500/20`}
                                >
                                    <option className="bg-slate-800 text-white font-bold" value="ksa">🇸🇦 {t('accounting:regions.ksa') || 'KSA'} (15%)</option>
                                    <option className="bg-slate-800 text-white font-bold" value="uae">🇦🇪 {t('accounting:regions.uae') || 'UAE'} (5%)</option>
                                    <option className="bg-slate-800 text-white font-bold" value="eg">🇪🇬 {t('accounting:regions.eg') || 'Egypt'} (14%)</option>
                                    <option className="bg-slate-800 text-white font-bold" value="kw">🇰🇼 {t('accounting:regions.kw') || 'Kuwait'} (0%)</option>
                                </select>
                                <ChevronDown className={`absolute top-1/2 -translate-y-1/2 ${i18n.dir() === 'rtl' ? 'left-4' : 'right-4'} text-slate-500 pointer-events-none group-hover:text-slate-300 transition-colors`} size={16} />
                            </div>
                        </div>

                        {/* Main Card - Net Payable */}
                        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-slate-700/50 p-10 rounded-[2.5rem] shadow-2xl mb-12 max-w-lg mx-auto text-center relative group hover:border-slate-600 transition-all hover:scale-[1.02]">
                            {/* Arrow Decoration */}
                            <div className={`absolute top-1/2 -translate-y-1/2 hidden md:block text-slate-700/30 ${i18n.dir() === 'rtl' ? '-right-16 rotate-[135deg]' : '-left-16 rotate-45'}`}>
                                <ArrowUpRight size={64} strokeWidth={1} />
                            </div>

                            <p className="text-slate-500 font-black text-xs uppercase tracking-[0.2em] mb-4">{t('accounting:netTax')}</p>
                            
                            <div className="flex flex-col items-center justify-center py-2">
                                <div className="flex items-end gap-3 justify-center mb-6" dir="ltr">
                                    <span className="text-7xl font-black tracking-tighter text-white drop-shadow-xl">{formatMoney(Math.abs(taxReport.netPayable))}</span>
                                    <span className="text-xl text-slate-500 font-black mb-2 uppercase">KWD</span>
                                </div>
                                <div className={`inline-flex items-center gap-3 px-8 py-2.5 rounded-full text-xs font-black uppercase tracking-widest ${taxReport.netPayable >= 0 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'} shadow-lg`}>
                                    <div className={`w-2 h-2 rounded-full animate-pulse ${taxReport.netPayable >= 0 ? 'bg-red-400' : 'bg-emerald-400'}`}></div>
                                    {taxReport.netPayable >= 0 ? t('accounting:payDue') : t('accounting:refundDue')}
                                </div>
                            </div>
                        </div>

                        {/* Breakdown - Output/Input Tax */}
                        <div className="flex flex-wrap justify-center gap-12 md:gap-24 text-center">
                            <div className="group">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] mb-2 group-hover:text-slate-400 transition-colors">{t('accounting:inputTax')}</p>
                                <p className="text-2xl font-black text-slate-300 drop-shadow-sm transition-transform group-hover:scale-110" dir="ltr">({formatMoney(taxReport.totalInputTax)})</p>
                            </div>
                            <div className="hidden md:block w-px bg-slate-800/50 h-16 self-center"></div>
                            <div className="group">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] mb-2 group-hover:text-slate-400 transition-colors">{t('accounting:outputTax')}</p>
                                <p className="text-2xl font-black text-white drop-shadow-sm transition-transform group-hover:scale-110" dir="ltr">{formatMoney(taxReport.totalOutputTax)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detail Cards - Bottom Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Sales Tax Card */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm group hover:shadow-xl transition-all hover:-translate-y-1">
                        <div className="flex justify-between items-start mb-8">
                            <h4 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-3">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl"><TrendingUp size={20} strokeWidth={3}/></div> 
                                {t('accounting:sales')}
                            </h4>
                            <span className="text-[10px] font-black bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg text-gray-500 uppercase tracking-widest">VAT {taxRegion === 'kw' ? '0' : '5-15'}%</span>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="flex justify-between items-end pb-6 border-b-2 border-dashed border-gray-100 dark:border-gray-700">
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">{t('accounting:netAmount')}</p>
                                    <p className="text-2xl font-black text-gray-900 dark:text-white" dir="ltr">{formatMoney(taxReport.totalSales)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-black tracking-widest mb-1">{t('accounting:outputTax')}</p>
                                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400" dir="ltr">{formatMoney(taxReport.totalOutputTax)}</p>
                                </div>
                            </div>
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-gray-400 uppercase tracking-widest">{t('accounting:transCount', { count: taxReport.salesCount })}</span>
                                <span className="flex items-center gap-1.5 text-emerald-600 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg"><ArrowUpRight size={14}/> {t('accounting:taxable')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Purchases Tax Card */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm group hover:shadow-xl transition-all hover:-translate-y-1">
                        <div className="flex justify-between items-start mb-8">
                            <h4 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-3">
                                <div className="p-3 bg-orange-50 dark:bg-orange-900/30 text-orange-600 rounded-2xl"><TrendingDown size={20} strokeWidth={3}/></div> 
                                {t('accounting:purchases')}
                            </h4>
                            <span className="text-[10px] font-black bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg text-gray-500 uppercase tracking-widest">Input VAT</span>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="flex justify-between items-end pb-6 border-b-2 border-dashed border-gray-100 dark:border-gray-700">
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">{t('accounting:netAmount')}</p>
                                    <p className="text-2xl font-black text-gray-900 dark:text-white" dir="ltr">{formatMoney(taxReport.totalPurchases)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-orange-600 dark:text-orange-400 uppercase font-black tracking-widest mb-1">{t('accounting:inputTax')}</p>
                                    <p className="text-2xl font-black text-orange-600 dark:text-orange-400" dir="ltr">{formatMoney(taxReport.totalInputTax)}</p>
                                </div>
                            </div>
                            <div className="flex justify-between text-xs font-bold">
                                <span className="text-gray-400 uppercase tracking-widest">{t('accounting:transCount', { count: taxReport.purchasesCount })}</span>
                                <span className="flex items-center gap-1.5 text-blue-600 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg"><ArrowDownRight size={14}/> {t('accounting:recoverable')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'cashflow' && (
            <div className="space-y-8 animate-fade-up">
                {/* Forecast Chart Card */}
                <div className="bg-white dark:bg-gray-800 p-10 rounded-[2.5rem] shadow-xl border border-gray-200 dark:border-gray-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 text-indigo-600 pointer-events-none">
                        <BarChart size={120} />
                    </div>
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 relative z-10">
                        <div>
                            <h3 className="font-black text-2xl text-gray-900 dark:text-white flex items-center gap-3">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl"><BarChart size={24}/></div> {t('accounting:forecast')}
                            </h3>
                            <p className="text-sm font-medium text-gray-500 mt-2">{t('accounting:basedOnDue')}</p>
                        </div>
                        <div className="bg-slate-50 dark:bg-gray-900/50 p-6 rounded-[1.5rem] text-right min-w-[200px] border border-slate-100 dark:border-gray-700 shadow-inner">
                            <span className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{t('common:total')}</span>
                            <span className="text-3xl font-black text-indigo-600 drop-shadow-sm" dir="ltr">{formatMoney(cashFlowData.totalExpected)} <span className="text-xs font-bold text-gray-400 uppercase ml-1">KWD</span></span>
                        </div>
                    </div>
                    
                    {/* Custom CSS Chart */}
                    <div className="mt-4 border-b-2 border-gray-100 dark:border-gray-700 pb-8">
                        {cashFlowData.chartLabels.length > 0 ? (
                            <SimpleBarChart data={cashFlowData.chartValues} labels={cashFlowData.chartLabels} height={220} />
                        ) : (
                            <div className="h-48 flex flex-col items-center justify-center text-gray-400 italic bg-gray-50/50 dark:bg-gray-900/50 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                                <Clock size={32} className="mb-3 opacity-20" />
                                <span className="font-bold text-sm tracking-widest uppercase">{t('accounting:noForecast')}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Upcoming Invoices List */}
                <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none animate-fade-up">
                    <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center px-8">
                        <h4 className="font-black text-gray-800 dark:text-gray-200 text-base flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-100/50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl"><Clock size={18} strokeWidth={3}/></div> {t('accounting:upcoming')}
                        </h4>
                        <span className="text-xs bg-indigo-600 text-white px-4 py-1.5 rounded-full font-black shadow-lg shadow-indigo-200 dark:shadow-none">
                            {t('accounting:itemsCount', { count: cashFlowData.list.length })}
                        </span>
                    </div>
                    
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {cashFlowData.list.length === 0 ? (
                            <div className="p-20 text-center">
                                <div className="w-16 h-16 bg-slate-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100 dark:border-gray-800">
                                    <FileText size={32} className="text-gray-300" />
                                </div>
                                <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">{t('accounting:noUpcoming')}</p>
                            </div>
                        ) : (
                            cashFlowData.list.map(inv => {
                                const isOverdue = new Date(inv.date) < new Date();
                                return (
                                    <div key={inv.id} className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-all group px-8">
                                        <div className="flex items-center gap-6">
                                            <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all group-hover:scale-110 shadow-sm ${isOverdue ? 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30' : 'bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30'}`}>
                                                <span className="text-xs uppercase font-black opacity-50 leading-none mb-1">{new Date(inv.date).toLocaleString(i18n.language === 'ar' ? 'ar' : 'en', { month: 'short' })}</span>
                                                <span className="text-xl font-black leading-none">{new Date(inv.date).getDate()}</span>
                                            </div>
                                            <div>
                                                <h4 className="font-black text-gray-900 dark:text-white text-base group-hover:text-indigo-600 transition-colors">{inv.client}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-xs flex items-center gap-2 font-bold uppercase tracking-widest ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                                                        {isOverdue ? (
                                                            <><AlertTriangle size={14}/> {t('accounting:overdue')}</>
                                                        ) : (
                                                            <><Clock size={14}/> {t('accounting:expected')}</>
                                                        )}
                                                        <span className="mx-1">•</span>
                                                        {new Date(inv.date).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-black text-xl text-gray-900 dark:text-white block mb-1" dir="ltr">{formatMoney(inv.amount)} <span className="text-[10px] text-gray-400 font-bold ml-1 uppercase">{inv.currency}</span></span>
                                            <span className={`text-[10px] px-3 py-1 rounded-lg uppercase font-black tracking-widest shadow-sm ${inv.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>{inv.status}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
