import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { QuoteItem, QuoteCurrency } from '../types';
import { generateCreativeText } from '../services/geminiService';
import { ArrowUp, ArrowDown, Sparkles, Trash2 } from 'lucide-react';

interface LineItemProps {
  item: QuoteItem;
  onChange: (item: QuoteItem) => void;
  onRemove: (id: number) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  currency: QuoteCurrency;
  errors?: {
    description?: string;
    qty?: string;
    price?: string;
  }
}

export const LineItem: React.FC<LineItemProps> = ({ 
  item, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast, currency, errors 
}) => {
  const { t, i18n } = useTranslation(['quotes', 'common']);
  const [isLoading, setIsLoading] = useState(false);

  const currencySymbols = t('common:currencySymbols', { returnObjects: true }) as Record<string, string>;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange({ ...item, [name]: name === 'description' ? value : parseFloat(value) || 0 });
  };

  const handleGenerateDescription = async () => {
    if (!item.description.trim()) {
      alert(t('quotes:enterKeywords'));
      return;
    }
    setIsLoading(true);
    try {
      const newDescription = await generateCreativeText(item.description, i18n.language as any);
      onChange({ ...item, description: newDescription });
    } catch (error) {
      console.error("Failed to generate description:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const total = item.qty * item.price;
  const formatCurrency = (amount: number) => {
    const fractionDigits = (currency === 'KWD' || currency === 'BHD' || currency === 'OMR' || currency === 'JOD') ? 3 : 2;
    const locale = (i18n.language === 'ar' ? 'ar-SA' : 'en-US');
    
    const formattedAmount = new Intl.NumberFormat(locale, {
        style: 'decimal',
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    }).format(amount);

    const symbol = currencySymbols[currency] || currency;

    return i18n.language === 'ar' ? `${formattedAmount} ${symbol}` : `${symbol} ${formattedAmount}`;
  }

  const InputError: React.FC<{ message?: string }> = ({ message }) => {
    if (!message) return null;
    return <p className="text-red-500 text-xs mt-1">{message}</p>;
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50 dark:border-gray-700 space-y-3 relative group transition-all hover:border-blue-200 dark:hover:border-blue-800">
      {/* Reordering Controls */}
      <div className="absolute top-2 right-2 rtl:right-auto rtl:left-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
         <button 
            onClick={onMoveUp} 
            disabled={isFirst}
            className="p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm transition-colors"
            title={t('common:moveUp')}
         >
             <ArrowUp size={14} />
         </button>
         <button 
            onClick={onMoveDown} 
            disabled={isLast}
            className="p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-gray-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm transition-colors"
            title={t('common:moveDown')}
         >
             <ArrowDown size={14} />
         </button>
      </div>

      <div className="relative pr-8 rtl:pl-8">
        <label htmlFor={`description-${item.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('quotes:itemDescription')}</label>
        <textarea
          id={`description-${item.id}`}
          name="description"
          value={item.description}
          onChange={handleChange}
          placeholder={t('quotes:itemDescription')}
          className={`w-full p-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 resize-none ${errors?.description ? 'border-red-500' : ''}`}
          rows={2}
        />
        <InputError message={errors?.description} />
        <button
          onClick={handleGenerateDescription}
          disabled={isLoading}
          title={t('quotes:generateDesc')}
          className="absolute top-8 rtl:left-2 ltr:right-2 p-1.5 rounded-full text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900 disabled:opacity-50 disabled:cursor-wait transition-colors"
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <Sparkles size={18} />
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-start">
        <div>
          <label htmlFor={`qty-${item.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('quotes:qty')}</label>
          <input id={`qty-${item.id}`} type="number" name="qty" value={item.qty} onChange={handleChange} placeholder="1" className={`w-full p-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 ${errors?.qty ? 'border-red-500' : ''}`}/>
          <InputError message={errors?.qty} />
        </div>
        <div>
          <label htmlFor={`price-${item.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('quotes:unitPrice')}</label>
          <input id={`price-${item.id}`} type="number" name="price" value={item.price} onChange={handleChange} placeholder="0.000" className={`w-full p-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 ${errors?.price ? 'border-red-500' : ''}`}/>
           <InputError message={errors?.price} />
        </div>
        <div className="self-end">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('common:total')}</label>
          <div className="p-2 h-[42px] flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800 text-sm font-mono text-gray-700 dark:text-gray-300 font-bold">
            {formatCurrency(total)}
          </div>
        </div>
        <button onClick={() => onRemove(item.id)} className="p-2 h-[42px] rounded-md text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 flex justify-center items-center self-end transition-colors" title={t('common:remove')}>
          <Trash2 size={18}/>
        </button>
      </div>
    </div>
  );
};
