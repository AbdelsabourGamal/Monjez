
import React, { useState, useEffect } from 'react';
import { Lock, Unlock, ShieldCheck, ChevronRight, Delete } from 'lucide-react';
import { setAppPin, verifyPin, hasPinSetup } from '../utils/secureStorage';

interface LockScreenProps {
    onUnlock: () => void;
    language: 'ar' | 'en';
}

import { useTranslation } from 'react-i18next';

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
    const { t } = useTranslation(['common']);
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [isSetup, setIsSetup] = useState(false); // Mode: Setup vs Login
    const [step, setStep] = useState<'enter' | 'create' | 'confirm'>('enter');
    const [error, setError] = useState('');
    const [shake, setShake] = useState(false);

    useEffect(() => {
        const hasPin = hasPinSetup();
        if (!hasPin) {
            setIsSetup(true);
            setStep('create');
        } else {
            setIsSetup(false);
            setStep('enter');
        }
    }, []);

    const handleNumClick = (num: string) => {
        if (pin.length < 4) {
            setPin(prev => prev + num);
            setError('');
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
        setError('');
    };

    useEffect(() => {
        if (pin.length === 4) {
            // Auto submit when 4 digits reached
            const timer = setTimeout(() => handleSubmit(), 300);
            return () => clearTimeout(timer);
        }
    }, [pin]);

    const handleSubmit = () => {
        if (step === 'enter') {
            if (verifyPin(pin)) {
                onUnlock();
            } else {
                triggerError(t('common:lock.errorWrong'));
            }
        } else if (step === 'create') {
            setConfirmPin(pin);
            setPin('');
            setStep('confirm');
        } else if (step === 'confirm') {
            if (pin === confirmPin) {
                setAppPin(pin);
                onUnlock();
            } else {
                triggerError(t('common:lock.errorMismatch'));
                setPin('');
                setConfirmPin('');
                setStep('create'); // Restart setup
            }
        }
    };

    const triggerError = (msg: string) => {
        setError(msg);
        setShake(true);
        setPin('');
        setTimeout(() => setShake(false), 500);
    };

    const NumpadButton = ({ val, onClick, icon }: any) => (
        <button
            onClick={onClick}
            className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 text-white text-2xl font-medium flex items-center justify-center transition-all active:scale-95"
        >
            {icon ? icon : val}
        </button>
    );

    return (
        <div className="fixed inset-0 z-[1000] bg-slate-900 flex flex-col items-center justify-center text-white overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center max-w-md w-full p-6">
                <div className="mb-8 flex flex-col items-center animate-fade-up">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4">
                        {isSetup ? <ShieldCheck size={32} /> : <Lock size={32} />}
                    </div>
                    <h2 className="text-2xl font-bold mb-2">
                        {step === 'enter' ? t('common:lock.welcome') : t('common:lock.setupTitle')}
                    </h2>
                    <p className="text-slate-400 text-sm text-center">
                        {step === 'enter' 
                            ? t('common:lock.secureMsg') 
                            : step === 'create' ? t('common:lock.setupDesc') : t('common:lock.confirmPin')}
                    </p>
                </div>

                <div className="mb-10">
                    <div className={`flex gap-4 ${shake ? 'animate-shake' : ''}`}>
                        {[0, 1, 2, 3].map((i) => (
                            <div 
                                key={i} 
                                className={`w-4 h-4 rounded-full border-2 border-white/30 transition-all duration-300 ${
                                    pin.length > i ? 'bg-white border-white scale-110' : 'bg-transparent'
                                }`}
                            />
                        ))}
                    </div>
                    {error && <p className="text-red-400 text-sm mt-4 text-center font-bold animate-pulse">{error}</p>}
                </div>

                <div className="grid grid-cols-3 gap-4 md:gap-6 mb-8">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <NumpadButton key={num} val={num} onClick={() => handleNumClick(num.toString())} />
                    ))}
                    <div className="w-16 md:w-20"></div> {/* Spacer */}
                    <NumpadButton val="0" onClick={() => handleNumClick('0')} />
                    <NumpadButton 
                        icon={<Delete size={24}/>} 
                        onClick={handleDelete} 
                    />
                </div>

                <div className="mt-4 text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-widest">MashhorQuote Security</p>
                </div>
            </div>
            
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake { animation: shake 0.2s ease-in-out 0 2; }
            `}</style>
        </div>
    );
};
