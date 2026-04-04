
import React, { useState, useEffect } from 'react';
import { X, Copy, Mail, Sparkles, Send } from 'lucide-react';
import { generateEmailDraft } from '../services/geminiService';
import type { Language } from '../types';

interface EmailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  data: { clientName: string; subject: string; details: string; email?: string };
  language: Language;
}

import { useTranslation } from 'react-i18next';

export const EmailComposer: React.FC<EmailComposerProps> = ({ isOpen, onClose, data }) => {
  const { t, i18n } = useTranslation(['common']);
  const language = i18n.language as Language;
  
  const [tone, setTone] = useState<'formal' | 'friendly' | 'urgent'>('formal');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate on open
  useEffect(() => {
    if (isOpen && !body) {
        handleGenerate();
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    const result = await generateEmailDraft(data, language, tone);
    setSubject(result.subject);
    setBody(result.body);
    setIsGenerating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    notify(t('common:email.copied'), 'success');
  };

  const notify = (msg: string, type: 'success' | 'error') => {
      // Small helper as we don't have notify prop here normally but could use it.
      // For now, let's just use alert as before but translated.
      alert(msg);
  };

  const handleOpenMail = () => {
    const mailto = `mailto:${data.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in text-left rtl:text-right">
      <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Mail size={20}/></div>
                <h3 className="font-bold text-lg text-gray-800 dark:text-white">{t('common:email.title')}</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition"><X size={20}/></button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
            {/* Controls */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {(['formal', 'friendly', 'urgent'] as const).map(toneKey => (
                    <button
                        key={toneKey}
                        onClick={() => { setTone(toneKey); }}
                        className={`px-4 py-2 rounded-full text-xs font-bold capitalize transition-all border ${tone === toneKey ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}
                    >
                        {t(`common:email.tones.${toneKey}`)}
                    </button>
                ))}
                <button onClick={handleGenerate} disabled={isGenerating} className="ml-auto px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-white flex items-center gap-2 hover:shadow-lg transition-shadow disabled:opacity-50 min-w-fit">
                    <Sparkles size={12} className={isGenerating ? 'animate-spin' : ''}/> {isGenerating ? t('common:email.generating') : t('common:email.regenerate')}
                </button>
            </div>

            <div className="space-y-3">
                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">{t('common:email.subject')}</label>
                    <input value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-medium text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"/>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">{t('common:email.body')}</label>
                    <textarea value={body} onChange={e => setBody(e.target.value)} rows={10} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed"></textarea>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900/50">
            <button onClick={handleCopy} className="px-6 py-3 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-2 transition"><Copy size={18}/> {t('common:email.copy')}</button>
            <button onClick={handleOpenMail} className="px-6 py-3 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none transition"><Send size={18}/> {t('common:email.openMail')}</button>
        </div>
      </div>
    </div>
  );
};
