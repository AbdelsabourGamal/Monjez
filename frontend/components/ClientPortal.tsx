import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Quote, Language, CompanyInfo } from '../types';
import { CheckCircle, XCircle, PenTool, Download, ArrowLeft, Building2, Calendar, FileText, Globe, Mail, Phone, ShieldCheck } from 'lucide-react';
import { SignatureInput } from './SignatureInput';
import { exportQuotePdf } from '../utils/exportService';

interface ClientPortalProps {
    quote: Quote;
    companyInfo: CompanyInfo;
    language: Language;
    onApprove: (signature: string) => void;
    onReject: () => void;
    onClose: () => void;
}

export const ClientPortal: React.FC<ClientPortalProps> = ({ quote, companyInfo, language, onApprove, onReject, onClose }) => {
    const { t, i18n } = useTranslation(['clientPortal', 'quotes', 'common', 'export']);
    const [isSigning, setIsSigning] = useState(false);
    const [signature, setSignature] = useState('');
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('mobile');

    // Calculations
    const subtotal = quote.items.reduce((acc, i) => acc + (i.price * i.qty), 0);
    const total = subtotal - (subtotal * (quote.discount / 100)) + (subtotal * (quote.tax / 100));

    const handleSignConfirm = () => {
        if (signature) {
            onApprove(signature);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-gray-50 dark:bg-gray-900 overflow-y-auto flex flex-col" dir={i18n.dir()}>
            {/* Portal Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500">
                            <ArrowLeft size={20} className="rtl:rotate-180"/>
                        </button>
                        {companyInfo.logo ? (
                            <img src={companyInfo.logo} className="h-8 object-contain" />
                        ) : (
                            <span className="font-bold text-lg">{companyInfo.name}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                        <ShieldCheck size={14} /> {t('clientPortal:secure')}
                    </div>
                </div>
            </div>

            <div className="flex-1 max-w-3xl mx-auto w-full p-4 md:p-8 pb-32">
                {/* Welcome Message */}
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('clientPortal:welcome', { clientName: quote.client.name })}</h1>
                    <p className="text-gray-500">{t('clientPortal:reviewMsg')}</p>
                </div>

                {/* Document Preview Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
                    <div className="p-6 md:p-8 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between gap-6">
                        <div>
                            <h3 className="font-bold text-xl mb-2">{quote.isInvoice ? t('quotes:invoice') : t('quotes:quote')} <span className="text-gray-400">#{quote.id}</span></h3>
                            <div className="text-sm text-gray-500 space-y-1">
                                <p className="flex items-center gap-2"><Calendar size={14}/> {quote.issueDate}</p>
                                <p className="text-red-500 flex items-center gap-2"><ShieldCheck size={14}/> {t('quotes:validUntil')} {quote.expiryDate}</p>
                            </div>
                        </div>
                        <div className="text-right rtl:text-left">
                            <p className="text-xs uppercase text-gray-400 font-bold tracking-wider mb-1">{t('clientPortal:total')}</p>
                            <p className="text-3xl font-black text-blue-600">{total.toFixed(2)} <span className="text-sm font-medium text-gray-400">{quote.currency}</span></p>
                        </div>
                    </div>

                    <div className="p-6 md:p-8">
                        <div className="mb-6">
                            <h4 className="font-bold text-sm text-gray-400 uppercase mb-4 tracking-wider">{t('clientPortal:items')}</h4>
                            <div className="space-y-4">
                                {quote.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-start py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">{item.description}</p>
                                            <p className="text-xs text-gray-500 mt-1">{t('clientPortal:qty')}: {item.qty} × {item.price}</p>
                                        </div>
                                        <p className="font-mono font-bold text-gray-700 dark:text-gray-300">{(item.qty * item.price).toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <div className="w-full md:w-1/2 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 space-y-2 text-sm">
                                <div className="flex justify-between text-gray-500">
                                    <span>{t('quotes:subtotal')}</span>
                                    <span>{subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-red-500">
                                    <span>{t('quotes:discount')} ({quote.discount}%)</span>
                                    <span>-{(subtotal * quote.discount / 100).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-500">
                                    <span>{t('quotes:tax')} ({quote.tax}%)</span>
                                    <span>+{( (subtotal - (subtotal*quote.discount/100)) * quote.tax/100 ).toFixed(2)}</span>
                                </div>
                                <div className="border-t border-gray-200 dark:border-gray-700 my-2 pt-2 flex justify-between font-bold text-lg text-gray-900 dark:text-white">
                                    <span>{t('clientPortal:total')}</span>
                                    <span>{total.toFixed(2)} {quote.currency}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 z-20 safe-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
                <div className="max-w-3xl mx-auto flex gap-3">
                    <button onClick={() => exportQuotePdf(quote, companyInfo, language, t)} className="p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300">
                        <Download size={24} />
                    </button>
                    <button onClick={onReject} className="flex-1 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition">
                        {t('reject')}
                    </button>
                    <button onClick={() => setIsSigning(true)} className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition flex items-center justify-center gap-2">
                        <PenTool size={20} /> {t('approve')}
                    </button>
                </div>
            </div>

            {/* Signature Modal */}
            {isSigning && (
                <div className="fixed inset-0 z-[210] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 text-center">
                            <h3 className="font-bold text-lg">{t('signTitle')}</h3>
                            <p className="text-sm text-gray-500 mt-1">By signing, you accept the terms of this document.</p>
                        </div>
                        <div className="p-6">
                            <SignatureInput value={signature} onSave={setSignature} language={language} />
                        </div>
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex gap-3 bg-gray-50 dark:bg-gray-900/50">
                            <button onClick={() => setIsSigning(false)} className="flex-1 py-2.5 font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition">{t('cancel')}</button>
                            <button onClick={handleSignConfirm} disabled={!signature} className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg disabled:opacity-50 disabled:shadow-none transition">
                                {t('confirmSign')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
