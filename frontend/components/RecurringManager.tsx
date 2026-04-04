import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Trash2, Play, RefreshCw, AlertCircle } from 'lucide-react';
import type { Language, RecurringProfile } from '../types';

interface RecurringManagerProps {
    language?: Language;
    onGenerateInvoice: (profile: RecurringProfile) => void;
    notify: (msg: string, type: 'success' | 'error') => void;
}

export const RecurringManager: React.FC<RecurringManagerProps> = ({ onGenerateInvoice, notify }) => {
    const { t, i18n } = useTranslation(['recurring', 'common']);
    const language = i18n.language as Language;

    const [profiles, setProfiles] = useState<RecurringProfile[]>([]);
    
    // In a real app, this would be loaded/saved to DB. For now, mock/localstorage.
    useEffect(() => {
        const saved = localStorage.getItem('mashhorquote-recurring');
        if (saved) {
            try { setProfiles(JSON.parse(saved)); } catch(e) {}
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('mashhorquote-recurring', JSON.stringify(profiles));
    }, [profiles]);

    const handleDelete = (id: string) => {
        if (confirm(t('recurring:confirmDelete'))) {
            setProfiles(prev => prev.filter(p => p.id !== id));
        }
    };

    const handleGenerate = (profile: RecurringProfile) => {
        onGenerateInvoice(profile);
        
        // Update last generated date and next due date
        const now = new Date();
        const next = new Date(now);
        if (profile.frequency === 'monthly') next.setMonth(next.getMonth() + 1);
        else if (profile.frequency === 'quarterly') next.setMonth(next.getMonth() + 3);
        else if (profile.frequency === 'yearly') next.setFullYear(next.getFullYear() + 1);

        setProfiles(prev => prev.map(p => p.id === profile.id ? {
            ...p,
            lastGenerated: now.toISOString(),
            nextDueDate: next.toISOString()
        } : p));
        
        notify(t('recurring:invoiceGenerated'), 'success');
    };

    return (
        <div className="p-6 max-w-5xl mx-auto animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <RefreshCw className="text-purple-600" /> {t('recurring:title')}
                    </h2>
                    <p className="text-sm text-gray-500">{t('recurring:subtitle')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {profiles.length === 0 ? (
                    <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                        <CalendarClock size={48} className="mx-auto mb-4 text-gray-300" />
                        <p className="text-gray-500 font-medium">{t('recurring:noProfiles')}</p>
                        <p className="text-xs text-gray-400 mt-2 max-w-md mx-auto">{t('recurring:addDesc')}</p>
                    </div>
                ) : (
                    profiles.map(profile => {
                        const isOverdue = new Date(profile.nextDueDate) <= new Date();
                        
                        return (
                            <div key={profile.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-1 w-full">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-purple-100 text-purple-600'}`}>
                                        <RefreshCw size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-gray-900 dark:text-white">{profile.title}</h4>
                                        <p className="text-sm text-gray-500">{profile.clientName} • {profile.amount} {profile.currency}</p>
                                        <div className="flex gap-2 mt-1">
                                            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300 font-medium">
                                                {t(`recurring:${profile.frequency}`)}
                                            </span>
                                            {isOverdue && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold flex items-center gap-1"><AlertCircle size={10}/> {t('recurring:overdue')}</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400 w-full md:w-auto justify-between md:justify-end">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-gray-400">{t('recurring:nextDue')}</p>
                                        <p className={`font-mono ${isOverdue ? 'text-red-600 font-bold' : ''}`}>
                                            {new Date(profile.nextDueDate).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase font-bold text-gray-400">{t('recurring:lastGen')}</p>
                                        <p className="font-mono">{profile.lastGenerated ? new Date(profile.lastGenerated).toLocaleDateString() : '-'}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-gray-700">
                                    <button 
                                        onClick={() => handleGenerate(profile)}
                                        className="flex-1 md:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
                                    >
                                        <Play size={14} /> {t('recurring:generateNow')}
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(profile.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
