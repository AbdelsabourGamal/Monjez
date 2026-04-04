import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InlineSignaturePad } from './InlineSignaturePad';
import { generateSignatureImage } from '../services/geminiService';
import type { Language } from '../types';

interface SignatureInputProps {
  value: string;
  onSave: (dataUrl: string) => void;
}

type Tab = 'draw' | 'type';

export const SignatureInput: React.FC<SignatureInputProps> = ({ value, onSave }) => {
    const { t, i18n } = useTranslation(['common']);
    const language = i18n.language as Language;
    
    const [activeTab, setActiveTab] = useState<Tab>('draw');
    const [typedName, setTypedName] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!typedName.trim()) return;
        setIsGenerating(true);
        try {
            const dataUrl = await generateSignatureImage(typedName, language);
            onSave(dataUrl);
        } catch (error) {
            console.error(error);
            alert(t('common:signature.failed'));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClear = () => {
        setTypedName('');
        onSave('');
    };

    const TabButton: React.FC<{ tab: Tab; label: string }> = ({ tab, label }) => (
      <button
        type="button"
        onClick={() => setActiveTab(tab)}
        className={`px-3 py-1.5 text-sm font-medium rounded-t-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
          activeTab === tab
            ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-gray-200 dark:border-gray-700 border-t border-x'
            : 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-700 border-transparent'
        }`}
      >
        {label}
      </button>
    );

    return (
        <div className="w-full">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <TabButton tab="draw" label={t('common:signature.draw')} />
                <TabButton tab="type" label={t('common:signature.type')} />
            </div>
            <div className="bg-white dark:bg-gray-800 border border-t-0 border-gray-200 dark:border-gray-700 rounded-b-md">
                {activeTab === 'draw' && (
                    <InlineSignaturePad value={value} onSave={onSave} />
                )}
                {activeTab === 'type' && (
                    <div className="p-4 space-y-3">
                        <input
                            type="text"
                            value={typedName}
                            onChange={(e) => setTypedName(e.target.value)}
                            placeholder={t('common:signature.typeNamePlaceholder')}
                            className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <div className="flex items-center gap-2">
                           <button
                                type="button"
                                onClick={handleGenerate}
                                disabled={isGenerating || !typedName.trim()}
                                className="flex-grow px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? t('common:signature.generating') : t('common:signature.generate')}
                            </button>
                             <button
                                type="button"
                                onClick={handleClear}
                                className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                            >
                                {t('common:signature.clear')}
                            </button>
                        </div>
                        {value && value.startsWith('data:image') && (
                             <div className="p-2 border rounded-md bg-gray-400 dark:bg-gray-800 flex justify-center items-center h-32">
                                <img src={value} alt="Generated Signature" className="max-h-full max-w-full object-contain" />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};