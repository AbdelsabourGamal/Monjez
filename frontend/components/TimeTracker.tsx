
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock, CheckCircle, FileText, Trash2, StopCircle, DollarSign } from 'lucide-react';
import type { Language, TimeEntry, DbClient, QuoteCurrency, Quote } from '../types';

import { useTranslation } from 'react-i18next';

interface TimeTrackerProps {
    clients: DbClient[];
    onConvertToInvoice: (quote: Quote) => void;
    notify: (msg: string, type: 'success' | 'error') => void;
}

export const TimeTracker: React.FC<TimeTrackerProps> = ({ clients, onConvertToInvoice, notify }) => {
    const { t, i18n } = useTranslation(['timeTracker', 'common']);
    const language = i18n.language as Language;
    
    const [entries, setEntries] = useState<TimeEntry[]>([]);
    const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
    
    // Active Timer State
    const [description, setDescription] = useState('');
    const [selectedClient, setSelectedClient] = useState('');
    const [hourlyRate, setHourlyRate] = useState<number>(0);
    const [currency, setCurrency] = useState<QuoteCurrency>('KWD');
    const [elapsed, setElapsed] = useState(0);
    
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('mashhorquote-time-entries');
        if (saved) {
            try { setEntries(JSON.parse(saved)); } catch(e) {}
        }
        
        // Restore active timer state if exists
        const savedActive = localStorage.getItem('mashhorquote-active-timer');
        if (savedActive) {
            try {
                const activeState = JSON.parse(savedActive);
                setActiveEntryId(activeState.id);
                setDescription(activeState.description);
                setSelectedClient(activeState.clientId);
                setHourlyRate(activeState.hourlyRate);
                setCurrency(activeState.currency);
                
                // Calculate elapsed time correctly based on start time
                const now = Date.now();
                const startTime = new Date(activeState.startTime).getTime();
                setElapsed(Math.floor((now - startTime) / 1000));
            } catch(e) {}
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('mashhorquote-time-entries', JSON.stringify(entries));
    }, [entries]);

    useEffect(() => {
        if (activeEntryId) {
            timerRef.current = setInterval(() => {
                setElapsed(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [activeEntryId]);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    const startTimer = () => {
        if (!description) {
            notify(t('timeTracker:enterDescription'), 'error');
            return;
        }
        const id = Date.now().toString();
        const startTime = new Date().toISOString();
        
        setActiveEntryId(id);
        
        // Persist active state
        localStorage.setItem('mashhorquote-active-timer', JSON.stringify({
            id, description, clientId: selectedClient, hourlyRate, currency, startTime
        }));
    };

    const stopTimer = () => {
        if (!activeEntryId) return;
        
        const endTime = new Date().toISOString();
        const newEntry: TimeEntry = {
            id: activeEntryId,
            description,
            clientId: selectedClient,
            startTime: new Date(Date.now() - elapsed * 1000).toISOString(), // Approx start
            endTime,
            durationSeconds: elapsed,
            hourlyRate,
            currency,
            status: 'completed'
        };

        setEntries(prev => [newEntry, ...prev]);
        setActiveEntryId(null);
        setElapsed(0);
        setDescription('');
        localStorage.removeItem('mashhorquote-active-timer');
    };

    const deleteEntry = (id: string) => {
        setEntries(prev => prev.filter(e => e.id !== id));
    };

    const handleConvert = () => {
        // Filter completed entries that haven't been billed
        const billableEntries = entries.filter(e => e.status === 'completed');
        if (billableEntries.length === 0) {
            notify(t('timeTracker:noBillable'), 'error');
            return;
        }

        // Group by Client
        const quoteItems = billableEntries.map(entry => ({
            id: Date.now() + Math.random(),
            description: `${entry.description} (${formatTime(entry.durationSeconds)})`,
            qty: parseFloat((entry.durationSeconds / 3600).toFixed(2)),
            price: entry.hourlyRate
        }));

        const firstClient = clients.find(c => c.id === billableEntries[0].clientId);
        
        const newQuote: Quote = {
            id: `INV-${Date.now()}`,
            client: { 
                name: firstClient?.name || '', 
                address: firstClient?.address || '', 
                phone: firstClient?.phone || '' 
            },
            items: quoteItems,
            currency: billableEntries[0].currency,
            discount: 0,
            tax: 0,
            issueDate: new Date().toISOString().split('T')[0],
            validityType: 'temporary',
            isInvoice: true,
            paymentStatus: 'unpaid'
        };

        setEntries(prev => prev.map(e => 
            billableEntries.find(be => be.id === e.id) ? { ...e, status: 'billed' } : e
        ));

        onConvertToInvoice(newQuote);
    };

    return (
        <div className="p-6 max-w-5xl mx-auto animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Clock className="text-blue-600" /> {t('timeTracker:title')}
                    </h2>
                    <p className="text-sm text-gray-500">{t('timeTracker:subtitle')}</p>
                </div>
            </div>

            {/* Timer Control Panel */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-blue-100 dark:border-gray-700 mb-8">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('timeTracker:projectDesc')}</label>
                        <input 
                            disabled={!!activeEntryId}
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full p-3 rounded-xl border bg-gray-50 dark:bg-gray-900 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g. Legal Consultation"
                        />
                    </div>
                    <div className="w-full md:w-48">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('timeTracker:selectClient')}</label>
                        <select 
                            disabled={!!activeEntryId}
                            value={selectedClient}
                            onChange={e => setSelectedClient(e.target.value)}
                            className="w-full p-3 rounded-xl border bg-gray-50 dark:bg-gray-900 dark:border-gray-600 outline-none"
                        >
                            <option value="">{t('timeTracker:select')}</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="w-full md:w-32">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('timeTracker:rate')}</label>
                        <input 
                            disabled={!!activeEntryId}
                            type="number"
                            value={hourlyRate}
                            onChange={e => setHourlyRate(Number(e.target.value))}
                            className="w-full p-3 rounded-xl border bg-gray-50 dark:bg-gray-900 dark:border-gray-600 outline-none"
                        />
                    </div>
                    
                    {/* Timer Display & Button */}
                    <div className="flex items-center gap-3 w-full md:w-auto bg-gray-100 dark:bg-gray-700/50 p-2 rounded-xl">
                        <div className="font-mono text-2xl font-bold text-gray-800 dark:text-white px-2 min-w-[120px] text-center">
                            {formatTime(elapsed)}
                        </div>
                        {!activeEntryId ? (
                            <button onClick={startTimer} className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-md transition-all active:scale-95">
                                <Play size={20} fill="currentColor" />
                            </button>
                        ) : (
                            <button onClick={stopTimer} className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md transition-all active:scale-95 animate-pulse">
                                <StopCircle size={20} fill="currentColor" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Entries List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="font-bold text-gray-800 dark:text-gray-200">{t('timeTracker:timeLog')}</h3>
                    <button 
                        onClick={handleConvert}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition"
                    >
                        <FileText size={14} /> {t('timeTracker:convert')}
                    </button>
                </div>
                
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {entries.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            {t('timeTracker:noEntries')}
                        </div>
                    ) : (
                        entries.map(entry => {
                            const clientName = clients.find(c => c.id === entry.clientId)?.name || t('timeTracker:unknownClient');
                            const totalCost = (entry.durationSeconds / 3600) * entry.hourlyRate;
                            
                            return (
                                <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/20 transition">
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            {entry.description}
                                            {entry.status === 'billed' && <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded uppercase">{t('timeTracker:billed')}</span>}
                                        </h4>
                                        <p className="text-xs text-gray-500">{clientName} • {new Date(entry.startTime).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-6 text-sm">
                                        <div className="text-right">
                                            <p className="font-mono font-medium text-gray-700 dark:text-gray-300">{formatTime(entry.durationSeconds)}</p>
                                            <p className="text-xs text-gray-400">{t('timeTracker:duration')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-mono font-bold text-blue-600">{totalCost.toFixed(2)} {entry.currency}</p>
                                            <p className="text-xs text-gray-400">{t('timeTracker:total')}</p>
                                        </div>
                                        {entry.status !== 'billed' && (
                                            <button onClick={() => deleteEntry(entry.id)} className="p-2 text-gray-400 hover:text-red-500 transition">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
