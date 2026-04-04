import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Quote, Language, CompanyInfo, QuoteCurrency } from '../types';
import { numberToWords } from '../utils/numberToWords';
import { Mail, Globe, Building2, MessageSquare, FileText, FileDown, Save, MoreVertical, ScrollText, FileOutput, ChevronDown, CreditCard, Link as LinkIcon, Copy, Check, DollarSign, Printer, Trash2, Share2, Eye } from 'lucide-react';
import { EmailComposer } from './EmailComposer';
import { exportQuotePdf, exportQuoteDocx } from '../utils/exportService';

interface PreviewPaneProps {
  quote: Quote;
  companyInfo: CompanyInfo;
  onConvertQuoteToDocument?: (quote: Quote) => void;
  onConvertQuoteToContract?: (quote: Quote) => void;
  onConvertQuoteToInvoice?: (quote: Quote) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onSave?: () => void;
  onSimulatePortal?: () => void;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({ quote, companyInfo, onConvertQuoteToDocument, onConvertQuoteToContract, onConvertQuoteToInvoice, onDuplicate, onDelete, onSave, onSimulatePortal }) => {
  const { t, i18n } = useTranslation(['quotes', 'common', 'numbers']);
  const language = (i18n.language || 'en') as Language;
  
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [showConvertMenu, setShowConvertMenu] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentLink, setPaymentLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowConvertMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    const currency = quote.currency || 'KWD';
    const fractionDigits = (currency === 'KWD' || currency === 'BHD' || currency === 'OMR' || currency === 'JOD') ? 3 : 2;
    const locale = language === 'ar' ? 'ar-EG' : 'en-US';

    const formattedAmount = new Intl.NumberFormat(locale, {
        style: 'decimal',
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    }).format(amount);

    const symbols = t('common:currencySymbols', { returnObjects: true }) as Record<string, string>;
    const symbol = symbols[currency] || currency;

    return language === 'ar' ? `${formattedAmount} ${symbol}` : `${symbol} ${formattedAmount}`;
  }, [language, quote.currency, t]);

  const subtotal = useMemo(() => quote.items.reduce((acc, item) => acc + item.qty * item.price, 0), [quote.items]);
  const discountAmount = useMemo(() => subtotal * (quote.discount / 100), [subtotal, quote.discount]);
  const subtotalAfterDiscount = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);
  const taxAmount = useMemo(() => subtotalAfterDiscount * (quote.tax / 100), [subtotalAfterDiscount, quote.tax]);
  const grandTotal = useMemo(() => subtotalAfterDiscount + taxAmount, [subtotalAfterDiscount, taxAmount]);

  const handleWhatsAppShare = () => {
      const type = quote.isInvoice ? t('quotes:invoice') : t('quotes:quote');
      const idLabel = quote.isInvoice ? t('quotes:invoiceNo') : t('quotes:quoteNo');
      const text = t('quotes:whatsappShareText', {
          type,
          amount: formatCurrency(grandTotal),
          idLabel,
          id: quote.id
      });
      
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
  };

  const handleConvertToInvoice = () => {
      if (onConvertQuoteToInvoice) {
          const newQuote = { ...quote, isInvoice: true, id: quote.id.replace('Q-', 'INV-') };
          onConvertQuoteToInvoice(newQuote);
          setShowConvertMenu(false);
      }
  };

  const handlePrint = () => {
      window.print();
  };

  const handleExportPdf = async () => {
      setIsExporting(true);
      await exportQuotePdf(quote, companyInfo, language, t);
      setIsExporting(false);
  }

  const generatePaymentLink = () => {
      const mockId = Math.random().toString(36).substring(7);
      setPaymentLink(`https://pay.mashhor.com/${mockId}`);
      setIsPaymentModalOpen(true);
  };

  const copyLink = () => {
      navigator.clipboard.writeText(paymentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const ActionButton = ({ onClick, icon: Icon, title, className = "", disabled = false }: any) => (
      <button 
        onClick={onClick} 
        disabled={disabled}
        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white active:scale-95 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${className}`} 
        title={title}
      >
          <Icon size={20} strokeWidth={1.5} />
      </button>
  );

  const hasMoreOptions = onConvertQuoteToDocument || onConvertQuoteToContract || (!quote.isInvoice && onConvertQuoteToInvoice) || onDuplicate || onDelete;

  return (
    <div className="relative h-full flex flex-col" dir={i18n.dir()}>
      
      {/* Floating Command Dock */}
      <div className="sticky top-4 z-30 w-full px-4 mb-6 flex justify-center print:hidden">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl p-1.5 sm:p-2 flex items-center gap-1 sm:gap-2 ring-1 ring-black/5 max-w-full overflow-x-auto scrollbar-hide">
            
            {onSave && (
                <>
                    <button 
                        onClick={onSave} 
                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-all hover:bg-gray-800 dark:hover:bg-gray-100 flex-shrink-0"
                    >
                        <Save size={18} strokeWidth={2} />
                        <span className="hidden sm:inline">{t('common:save')}</span>
                    </button>
                    <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1 sm:mx-2 flex-shrink-0"></div>
                </>
            )}

            {onSimulatePortal && (
                <>
                    <button 
                        onClick={onSimulatePortal}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl text-sm font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex-shrink-0"
                        title={t('common:simulate')}
                    >
                        <Share2 size={18} />
                        <span className="hidden sm:inline">{t('quotes:shareLink')}</span>
                    </button>
                    <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1 sm:mx-2 flex-shrink-0"></div>
                </>
            )}

            {quote.isInvoice && (
                <>
                    <button 
                        onClick={generatePaymentLink}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors flex-shrink-0"
                    >
                        <LinkIcon size={18} />
                        <span className="hidden sm:inline">{t('quotes:payLink')}</span>
                    </button>
                    <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1 sm:mx-2 flex-shrink-0"></div>
                </>
            )}

            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <ActionButton onClick={handlePrint} icon={Printer} title={t('common:print')} className="hover:text-gray-700 dark:hover:text-gray-300" />
                <ActionButton onClick={handleExportPdf} disabled={isExporting} icon={FileDown} title="PDF" className="hover:text-red-600 dark:hover:text-red-400" />
                <ActionButton onClick={() => exportQuoteDocx(quote, companyInfo, language, t)} icon={FileText} title="Word" className="hover:text-blue-600 dark:hover:text-blue-400" />
            </div>

            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1 sm:mx-2 flex-shrink-0"></div>

            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <ActionButton onClick={handleWhatsAppShare} icon={MessageSquare} title="WhatsApp" className="hover:text-green-600 dark:hover:text-green-400" />
                <ActionButton onClick={() => setIsEmailComposerOpen(true)} icon={Mail} title="Email" className="hover:text-purple-600 dark:hover:text-purple-400" />
            </div>

             {hasMoreOptions && (
                <>
                    <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1 sm:mx-2 flex-shrink-0"></div>
                    <div className="relative flex-shrink-0" ref={menuRef}>
                        <button 
                            onClick={() => setShowConvertMenu(!showConvertMenu)}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${showConvertMenu ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}
                            title={t('common:more')}
                        >
                            <MoreVertical size={20} strokeWidth={1.5} />
                        </button>

                        {showConvertMenu && (
                            <div className="absolute top-full right-0 rtl:right-auto rtl:left-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-xl ring-1 ring-black/5 border border-gray-100 dark:border-gray-800 p-1.5 flex flex-col gap-1 animate-in fade-in zoom-in-95 slide-in-from-top-2 z-50">
                                <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 mb-1">
                                    {t('common:actions')}
                                </div>
                                {!quote.isInvoice && onConvertQuoteToInvoice && (
                                    <button 
                                        onClick={handleConvertToInvoice} 
                                        className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 rounded-xl w-full text-left rtl:text-right transition-colors group"
                                    >
                                        <div className="w-7 h-7 flex items-center justify-center bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
                                            <DollarSign size={14}/>
                                        </div>
                                        <span>{t('quotes:convertToInv')}</span>
                                    </button>
                                )}
                                {onConvertQuoteToDocument && (
                                    <button 
                                        onClick={() => { onConvertQuoteToDocument(quote); setShowConvertMenu(false); }} 
                                        className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 dark:hover:text-amber-300 rounded-xl w-full text-left rtl:text-right transition-colors group"
                                    >
                                        <div className="w-7 h-7 flex items-center justify-center bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-lg group-hover:scale-110 transition-transform">
                                            <FileOutput size={14}/>
                                        </div>
                                        <span>{t('quotes:convertDoc')}</span>
                                    </button>
                                )}
                                {onConvertQuoteToContract && (
                                    <button 
                                        onClick={() => { onConvertQuoteToContract(quote); setShowConvertMenu(false); }} 
                                        className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-300 rounded-xl w-full text-left rtl:text-right transition-colors group"
                                    >
                                        <div className="w-7 h-7 flex items-center justify-center bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-lg group-hover:scale-110 transition-transform">
                                            <ScrollText size={14}/>
                                        </div>
                                        <span>{t('quotes:convertCont')}</span>
                                    </button>
                                )}
                                
                                {(onDuplicate || onDelete) && <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>}

                                {onDuplicate && (
                                    <button 
                                        onClick={() => { onDuplicate(); setShowConvertMenu(false); }} 
                                        className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl w-full text-left rtl:text-right transition-colors group"
                                    >
                                        <div className="w-7 h-7 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg group-hover:scale-110 transition-transform">
                                            <Copy size={14}/>
                                        </div>
                                        <span>{t('common:duplicate')}</span>
                                    </button>
                                )}
                                {onDelete && (
                                    <button 
                                        onClick={() => { onDelete(); setShowConvertMenu(false); }} 
                                        className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl w-full text-left rtl:text-right transition-colors group"
                                    >
                                        <div className="w-7 h-7 flex items-center justify-center bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg group-hover:scale-110 transition-transform">
                                            <Trash2 size={14}/>
                                        </div>
                                        <span>{t('common:delete')}</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-lg pb-8 px-2 print:overflow-visible print:h-auto">
        <div className="border border-gray-200 dark:border-gray-700 min-h-[50vh] md:min-h-[700px] bg-white dark:bg-gray-800 shadow-xl flex flex-col mx-auto max-w-[210mm] animate-fade-in relative print:shadow-none print:border-none print:max-w-none print-content">
            
            <div className={`${quote.isInvoice ? 'bg-indigo-900 dark:bg-indigo-950' : 'bg-slate-800 dark:bg-slate-950'} text-white py-8 px-8 transition-colors duration-500 print:bg-gray-900 print:text-white`}>
                <h1 className="text-3xl font-extrabold text-center tracking-tight">{quote.isInvoice ? t('quotes:invoice') : t('quotes:quote')}</h1>
            </div>

            {quote.isInvoice && quote.paymentStatus === 'paid' && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 border-4 border-red-600 text-red-600 text-4xl font-black opacity-20 transform -rotate-12 px-4 py-2 rounded-xl pointer-events-none select-none">
                    {t('quotes:paidStamp')}
                </div>
            )}

            {!quote.isInvoice && quote.clientSignature && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 border-4 border-emerald-600 text-emerald-600 text-4xl font-black opacity-20 transform -rotate-12 px-4 py-2 rounded-xl pointer-events-none select-none">
                    {t('quotes:approvedStamp')}
                </div>
            )}

            <div className="p-8 flex-1">
                <header className="flex justify-between items-start pb-8 border-b border-gray-200 dark:border-gray-700 mb-8">
                <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">{quote.isInvoice ? t('quotes:invoiceNo') : t('quotes:quoteNo')}</p>
                    <span className="text-xl font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{quote.id}</span>
                    {quote.viewedAt && (
                        <p className="text-[10px] text-emerald-600 flex items-center gap-1 mt-1 font-bold"><Eye size={10}/> {t('quotes:viewedOn')} {new Date(quote.viewedAt).toLocaleDateString()}</p>
                    )}
                </div>
                <div className="flex items-start gap-5 text-right rtl:text-left">
                    <div className="rtl:text-left ltr:text-right">
                    <h2 className={`text-2xl font-bold ${quote.isInvoice ? 'text-indigo-600 dark:text-indigo-400' : 'text-blue-600 dark:text-blue-400'}`}>{companyInfo.name || `[${t('quotes:companyName')}]`}</h2>
                    <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1 mt-2 font-medium">
                        <p>{companyInfo.address || `[${t('quotes:companyAddress')}]`}</p>
                        <p dir="ltr">{companyInfo.phone || `[${t('quotes:companyPhone')}]`}</p>
                        {companyInfo.email && <p className="flex items-center gap-1 justify-end rtl:justify-start"><Mail size={12} /> {companyInfo.email}</p>}
                        {companyInfo.website && <p className="flex items-center gap-1 justify-end rtl:justify-start"><Globe size={12} /> {companyInfo.website}</p>}
                    </div>
                    </div>
                    {companyInfo.logo && (
                        <div className="w-20 h-20 rounded-2xl border border-gray-100 dark:border-gray-700 p-1 bg-white dark:bg-gray-800 shadow-sm">
                            <img src={companyInfo.logo} alt="Company Logo" className="w-full h-full object-contain rounded-xl" />
                        </div>
                    )}
                </div>
                </header>

                <section className="grid grid-cols-2 gap-8 mb-10">
                <div className="text-sm p-5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 print:bg-transparent print:border">
                    <h3 className="font-bold mb-3 text-gray-400 uppercase text-xs tracking-widest flex items-center gap-2"><Building2 size={14}/> {t('quotes:to')}</h3>
                    <p className="font-bold text-gray-900 dark:text-white text-lg mb-1">{quote.client.name || `[${t('quotes:clientName')}]`}</p>
                    <p className="text-gray-600 dark:text-gray-300">{quote.client.address || `[${t('quotes:clientAddress')}]`}</p>
                    <p className="text-gray-600 dark:text-gray-300" dir="ltr">{quote.client.phone || `[${t('quotes:clientPhone')}]`}</p>
                </div>
                <div className="text-sm text-right ltr:text-right rtl:text-left p-5">
                    <div className="space-y-4">
                        <div>
                            <span className="font-bold text-gray-400 block text-xs uppercase tracking-wider mb-1">{t('quotes:date')}</span> 
                            <span className="text-gray-900 dark:text-white font-bold text-lg font-mono">{quote.issueDate}</span>
                        </div>
                        <div>
                            {quote.validityType === 'temporary' ? (
                                <>
                                    <span className="font-bold text-gray-400 block text-xs uppercase tracking-wider mb-1">{t('quotes:validUntil')}</span> 
                                    <span className="text-red-600 dark:text-red-400 font-bold font-mono">{quote.expiryDate}</span>
                                </>
                            ) : (
                                <>
                                    <span className="font-bold text-gray-400 block text-xs uppercase tracking-wider mb-1">{t('quotes:quoteValidity')}</span>
                                    <span className="text-gray-900 dark:text-white font-bold">{t('quotes:openValidity')}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                </section>

                <section className="mb-10">
                <table className="w-full text-sm border-collapse">
                    <thead>
                    <tr className="border-b-2 border-gray-100 dark:border-gray-700">
                        <th className="px-4 py-4 text-left ltr:text-left rtl:text-right font-bold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider w-1/2">{t('quotes:item')}</th>
                        <th className="px-4 py-4 text-center font-bold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">{t('quotes:qty')}</th>
                        <th className="px-4 py-4 text-right ltr:text-right rtl:text-left font-bold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">{t('quotes:unitPrice')}</th>
                        <th className="px-4 py-4 text-right ltr:text-right rtl:text-left font-bold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wider">{t('quotes:total')}</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {quote.items.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors print:bg-transparent">
                        <td className="px-4 py-4 font-medium text-gray-900 dark:text-gray-100 align-top">
                            {item.description || `[${t('quotes:itemDescriptionPlaceholder')}]`}
                        </td>
                        <td className="px-4 py-4 text-center text-gray-600 dark:text-gray-400 align-top font-mono">{item.qty}</td>
                        <td className="px-4 py-4 text-right ltr:text-right rtl:text-left text-gray-600 dark:text-gray-400 align-top font-mono">{formatCurrency(item.price)}</td>
                        <td className="px-4 py-4 text-right ltr:text-right rtl:text-left font-bold text-gray-900 dark:text-gray-100 align-top font-mono">{formatCurrency(item.qty * item.price)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </section>

                <section className="flex justify-end mb-12">
                <div className="w-full md:w-1/2 lg:w-5/12 bg-gray-50 dark:bg-gray-800/30 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 print:bg-transparent print:border">
                    <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">{t('quotes:subtotal')}</span>
                        <span className="text-gray-900 dark:text-white font-mono font-bold">{formatCurrency(subtotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                        <div className="flex justify-between text-red-500">
                            <span className="font-medium">{t('quotes:discount')} ({quote.discount}%)</span>
                            <span className="font-mono">-{formatCurrency(discountAmount)}</span>
                        </div>
                    )}
                    {taxAmount > 0 && (
                        <div className="flex justify-between text-gray-600 dark:text-gray-300">
                            <span className="font-medium">{t('quotes:tax')} ({quote.tax}%)</span>
                            <span className="font-mono">{formatCurrency(taxAmount)}</span>
                        </div>
                    )}
                    <div className="my-3 border-t border-gray-200 dark:border-gray-600"></div>
                    <div className={`flex justify-between text-lg font-extrabold ${quote.isInvoice ? 'text-indigo-600 dark:text-indigo-400' : 'text-blue-600 dark:text-blue-400'} items-center`}>
                        <span>{t('quotes:grandTotal')}</span>
                        <span className="font-mono text-xl">{formatCurrency(grandTotal)}</span>
                    </div>
                    </div>
                    <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="font-bold uppercase tracking-wider mb-1 text-[10px]">{t('quotes:amountInWords')}</p>
                        <p className="italic font-serif text-sm text-gray-700 dark:text-gray-300">{numberToWords(grandTotal, quote.currency, t)}</p>
                    </div>
                </div>
                </section>

                {quote.clientSignature && (
                    <section className="mb-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">{t('quotes:clientSignatureStamp')}</h4>
                        <div className="h-24 w-64">
                            <img src={quote.clientSignature} className="h-full w-full object-contain object-left rtl:object-right" alt="Client Signature" />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">{t('quotes:signedOn')} {quote.signedAt ? new Date(quote.signedAt).toLocaleString() : ''}</p>
                    </section>
                )}
            </div>

            {(companyInfo.bankName || companyInfo.iban) && (
                <div className="bg-gray-50 dark:bg-slate-900/50 border-t border-gray-200 dark:border-gray-700 p-8 text-sm rounded-b-lg print:bg-transparent mt-auto">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2 uppercase text-xs tracking-wider">
                        <Building2 size={14} className="text-blue-600"/> 
                        {t('quotes:paymentInstructions')}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-gray-600 dark:text-gray-400">
                        {companyInfo.bankName && (
                            <div>
                                <span className="block text-[10px] uppercase text-gray-400 mb-1 font-bold">{t('common:bank')}</span>
                                <span className="font-bold text-gray-900 dark:text-white text-base">{companyInfo.bankName}</span>
                            </div>
                        )}
                        {companyInfo.iban && (
                            <div>
                                <span className="block text-[10px] uppercase text-gray-400 mb-1 font-bold">IBAN</span>
                                <span className="font-mono font-medium bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-100 dark:border-gray-700 inline-block print:border-none print:bg-transparent print:px-0">{companyInfo.iban}</span>
                            </div>
                        )}
                        {companyInfo.accountNumber && (
                            <div>
                                <span className="block text-[10px] uppercase text-gray-400 mb-1 font-bold">{t('common:accountNo')}</span>
                                <span className="font-mono font-medium">{companyInfo.accountNumber}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>

      <EmailComposer 
        isOpen={isEmailComposerOpen} 
        onClose={() => setIsEmailComposerOpen(false)}
        data={{
            clientName: quote.client.name,
            subject: `${quote.isInvoice ? t('quotes:invoice') : t('quotes:quote')} #${quote.id}`,
            details: t('quotes:emailReviewDetails', {
                amount: formatCurrency(grandTotal),
                items: quote.items.map(i => i.description).join(', ')
            })
        }}
      />

      {isPaymentModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-0 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transform transition-all scale-100">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white text-center relative">
                      <button onClick={() => setIsPaymentModalOpen(false)} className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1 transition"><ChevronDown size={20}/></button>
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                          <CreditCard size={32} />
                      </div>
                      <h3 className="text-xl font-bold">{t('quotes:payLink')}</h3>
                      <p className="text-emerald-100 text-sm mt-1">{formatCurrency(grandTotal)}</p>
                  </div>
                  
                  <div className="p-6">
                      <div className="mb-6 text-center">
                          <p className="text-gray-500 text-sm mb-3">{t('quotes:linkGenerated')}</p>
                          <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                              <input 
                                readOnly 
                                value={paymentLink} 
                                className="bg-transparent flex-1 text-sm font-mono text-gray-600 dark:text-gray-300 outline-none"
                              />
                              <button 
                                onClick={copyLink} 
                                className={`p-2 rounded-lg transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 shadow-sm'}`}
                              >
                                  {copied ? <Check size={16}/> : <Copy size={16}/>}
                              </button>
                          </div>
                      </div>

                      <div className="space-y-4">
                          <p className="text-xs font-bold text-gray-400 uppercase text-center tracking-wider">{t('quotes:payWith')}</p>
                          <div className="grid grid-cols-3 gap-3">
                              <div className="h-12 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm hover:border-emerald-500 cursor-pointer transition-colors">
                                  <span className="font-bold text-emerald-600 text-xs">KNET</span>
                              </div>
                              <div className="h-12 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm hover:border-blue-500 cursor-pointer transition-colors">
                                  <span className="font-bold text-blue-600 text-xs">VISA</span>
                              </div>
                              <div className="h-12 bg-black border border-gray-800 rounded-lg flex items-center justify-center shadow-sm hover:opacity-80 cursor-pointer transition-colors">
                                  <span className="font-bold text-white text-xs">Pay</span>
                              </div>
                          </div>
                      </div>

                      <div className="mt-8 text-center">
                          <button onClick={handleWhatsAppShare} className="w-full py-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold hover:bg-emerald-100 transition flex items-center justify-center gap-2">
                              <MessageSquare size={18}/> {t('quotes:shareVia')} WhatsApp
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
