import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Quote, QuoteItem, CompanyInfo, DbClient, DbProduct, CivilIdEntry } from '../types';
import { LineItem } from './LineItem';
import { validateQuote } from '../utils/validation';
import { CompanyInfoBuilder } from './CompanyInfoBuilder';
import { quoteTemplates } from '../data/quoteTemplates';
import { RotateCcw, Landmark, ChevronDown, Check, X } from 'lucide-react';

interface QuoteBuilderProps {
  quote: Quote;
  setQuote: React.Dispatch<React.SetStateAction<Quote>>;
  setIsFormValid: React.Dispatch<React.SetStateAction<boolean>>;
  companyInfo: CompanyInfo;
  setCompanyInfo: React.Dispatch<React.SetStateAction<CompanyInfo>>;
  onTemplateChange: (templateId: string) => void;
  createInitialQuote: () => Quote;
  dbClients: DbClient[];
  dbProducts: DbProduct[];
}

export const QuoteBuilder: React.FC<QuoteBuilderProps> = ({ quote, setQuote, setIsFormValid, companyInfo, setCompanyInfo, onTemplateChange, createInitialQuote, dbClients, dbProducts }) => {
  const { t, i18n } = useTranslation(['quotes', 'common', 'clients', 'products']);
  const language = (i18n.language || 'en') as 'ar' | 'en';
  
  const [mode, setMode] = useState<'template' | 'custom'>('template');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Handling multiple Civil IDs logic
  const [showIdSelector, setShowIdSelector] = useState<{ client: DbClient, ids: CivilIdEntry[] } | null>(null);

  const sortedTemplates = useMemo(() => 
    [...quoteTemplates].sort((a, b) => {
        const nameA = t(a.nameKey);
        const nameB = t(b.nameKey);
        return nameA.localeCompare(nameB);
    })
  , [t]);
  
  useEffect(() => {
    const validationErrors = validateQuote(quote, t);
    setErrors(validationErrors);
    setIsFormValid(Object.keys(validationErrors).length === 0);
  }, [quote, t, setIsFormValid]);

  const switchMode = (newMode: 'template' | 'custom') => {
    if (mode === newMode) return;
    setMode(newMode);
    if (newMode === 'custom') {
        setQuote(createInitialQuote());
    } else {
        onTemplateChange(sortedTemplates[0].id);
    }
  };


  const handleClientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuote(q => ({ ...q, client: { ...q.client, [e.target.name]: e.target.value } }));
  };

  const handleDbClientSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const clientId = e.target.value;
      if (!clientId) return;
      const client = dbClients.find(c => c.id === clientId);
      if (client) {
          if (client.civilIds && client.civilIds.length > 1) {
              setShowIdSelector({ client, ids: client.civilIds });
          } else {
              applyClient(client, client.civilIds?.[0]?.value);
          }
      }
      e.target.value = ""; // Reset selector
  };

  const applyClient = (client: DbClient, selectedId?: string) => {
      setQuote(q => ({
          ...q,
          client: {
              name: client.name,
              address: client.address,
              phone: client.phone
          },
          currency: client.currency || q.currency 
      }));
  };

  const handleDbProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productId = e.target.value;
    if (!productId) return;
    const product = dbProducts.find(p => p.id === productId);
    if (product) {
        setQuote(q => ({
            ...q,
            items: [...q.items, { 
                id: Date.now(), 
                description: product.description || product.name, 
                qty: 1, 
                price: product.price 
            }]
        }));
    }
    e.target.value = ''; 
  };

  const handleQuoteDetailsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setQuote(q => {
        if (name === 'validityType') {
            if (value === 'open') {
                const { expiryDate, ...rest } = q;
                return { ...rest, validityType: 'open' };
            } else {
                return { 
                    ...q, 
                    validityType: 'temporary',
                    expiryDate: q.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                };
            }
        }
        return { ...q, [name]: value };
    });
  };
  
  const handleItemChange = (updatedItem: QuoteItem) => {
    setQuote(q => ({
      ...q,
      items: q.items.map(item => item.id === updatedItem.id ? updatedItem : item)
    }));
  };

  const addItem = () => {
    setQuote(q => ({
      ...q,
      items: [...q.items, { id: Date.now(), description: '', qty: 1, price: 0 }]
    }));
  };
  
  const removeItem = (id: number) => {
    setQuote(q => ({
      ...q,
      items: q.items.filter(item => item.id !== id)
    }));
  };

  const moveItemUp = (index: number) => {
      if (index === 0) return;
      setQuote(q => {
          const newItems = [...q.items];
          [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
          return { ...q, items: newItems };
      });
  };

  const moveItemDown = (index: number) => {
      if (index === quote.items.length - 1) return;
      setQuote(q => {
          const newItems = [...q.items];
          [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
          return { ...q, items: newItems };
      });
  };

  const handleResetForm = () => {
      if(confirm(t('quotes:resetConfirm'))) {
          setQuote(createInitialQuote());
      }
  }
  
  const InputError: React.FC<{ message?: string }> = ({ message }) => {
    if (!message) return null;
    return <p className="text-red-500 text-xs mt-1">{message}</p>;
  }
  
  const ModeButton: React.FC<{ targetMode: 'template' | 'custom', label: string }> = ({ targetMode, label }) => (
     <button
        onClick={() => switchMode(targetMode)}
        className={`w-full p-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${mode === targetMode ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
    >
        {label}
    </button>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
         <button onClick={handleResetForm} className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1 transition-colors">
             <RotateCcw size={12} />
             {t('quotes:resetForm')}
         </button>
      </div>

       <section className="grid grid-cols-2 gap-4">
        <ModeButton targetMode="template" label={t('quotes:fromTemplate')} />
        <ModeButton targetMode="custom" label={t('quotes:createCustom')} />
      </section>

      {mode === 'template' && (
        <section>
          <label htmlFor="quote-template-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('quotes:selectTemplate')}</label>
          <select
            id="quote-template-select"
            onChange={(e) => onTemplateChange(e.target.value)}
            value={quoteTemplates.find(template => 
                template.defaultItems.length === quote.items.length &&
                template.defaultItems.every((item, index) => {
                    const desc = t(item.descriptionKey);
                    return desc === quote.items[index].description;
                })
            )?.id || sortedTemplates[0]?.id}
            className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
          >
            {sortedTemplates.map(template => (
              <option key={template.id} value={template.id}>
                {t(template.nameKey)}
              </option>
            ))}
          </select>
        </section>
      )}

      <CompanyInfoBuilder companyInfo={companyInfo} setCompanyInfo={setCompanyInfo} />

      {/* Client Information */}
      <section className="relative">
        <div className="flex justify-between items-end mb-4">
             <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">{t('quotes:clientInfo')}</h3>
             {dbClients.length > 0 && (
                  <div className="w-48">
                    <select 
                        onChange={handleDbClientSelect} 
                        className="w-full p-1 text-xs border rounded bg-blue-50 dark:bg-blue-900/20 border-blue-200 text-blue-800 dark:text-blue-300 outline-none cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                        defaultValue=""
                    >
                        <option value="" disabled>{t('clients:select')}</option>
                        {dbClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
             )}
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label htmlFor="client-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('clients:name')}</label>
            <input id="client-name" type="text" name="name" value={quote.client.name} onChange={handleClientChange} placeholder={t('clients:name')} className={`w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 ${errors['client.name'] ? 'border-red-500' : ''}`}/>
            <InputError message={errors['client.name'] ? t('common:requiredField') : ''} />
          </div>
          <div>
             <label htmlFor="client-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('clients:address')}</label>
            <input id="client-address" type="text" name="address" value={quote.client.address} onChange={handleClientChange} placeholder={t('clients:address')} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"/>
          </div>
          <div>
            <label htmlFor="client-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('clients:phone')}</label>
            <input id="client-phone" type="text" name="phone" value={quote.client.phone} onChange={handleClientChange} placeholder={t('clients:phone')} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"/>
          </div>
        </div>
      </section>

      {/* Quote Details */}
      <section>
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">{t('quotes:details')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="quote-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('quotes:id')}</label>
            <input id="quote-id" type="text" name="id" value={quote.id} onChange={handleQuoteDetailsChange} placeholder={t('quotes:id')} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"/>
          </div>
          <div>
            <label htmlFor="issue-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('quotes:issueDate')}</label>
            <input id="issue-date" type="date" name="issueDate" value={quote.issueDate} onChange={handleQuoteDetailsChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"/>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('quotes:validity')}</label>
            <div className="flex gap-4 p-2 rounded-md bg-gray-100 dark:bg-gray-900/50">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" name="validityType" value="temporary" checked={quote.validityType === 'temporary'} onChange={handleQuoteDetailsChange} className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                    <span>{t('quotes:temporary')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" name="validityType" value="open" checked={quote.validityType === 'open'} onChange={handleQuoteDetailsChange} className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                    <span>{t('quotes:open')}</span>
                </label>
            </div>
          </div>
          {quote.validityType === 'temporary' && (
            <div>
              <label htmlFor="expiry-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('quotes:expiryDate')}</label>
              <input id="expiry-date" type="date" name="expiryDate" value={quote.expiryDate || ''} onChange={handleQuoteDetailsChange} className={`w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 ${errors.expiryDate ? 'border-red-500' : ''}`}/>
               <InputError message={errors.expiryDate} />
            </div>
          )}
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('quotes:currency')}</label>
            <select id="currency" name="currency" value={quote.currency} onChange={handleQuoteDetailsChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500">
              <option value="KWD">KWD</option>
              <option value="SAR">SAR</option>
              <option value="AED">AED</option>
              <option value="USD">USD</option>
              <option value="EGP">EGP</option>
            </select>
          </div>
        </div>
      </section>

      {/* Items */}
      <section>
        <div className="flex justify-between items-center mb-4">
             <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">{t('quotes:items')}</h3>
        </div>
        
        <div className="space-y-4">
          {quote.items.map((item, index) => (
            <LineItem 
                key={item.id} 
                item={item} 
                onChange={handleItemChange} 
                onRemove={removeItem} 
                onMoveUp={() => moveItemUp(index)}
                onMoveDown={() => moveItemDown(index)}
                isFirst={index === 0}
                isLast={index === quote.items.length - 1}
                currency={quote.currency}
                errors={{
                    description: errors[`items.${index}.description`],
                    qty: errors[`items.${index}.qty`],
                    price: errors[`items.${index}.price`],
                }}
            />
          ))}
        </div>
        
        <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={addItem} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-all">
            {t('quotes:addItem')}
            </button>

            {dbProducts.length > 0 && (
                <select 
                    onChange={handleDbProductSelect} 
                    className="px-4 py-2 text-sm font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 outline-none cursor-pointer transition-colors"
                    defaultValue=""
                >
                    <option value="" disabled>{t('products:select')}</option>
                    {dbProducts.map(p => <option key={p.id} value={p.id}>{p.name} ({p.price})</option>)}
                </select>
            )}
        </div>

      </section>

      {/* Financials */}
      <section>
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">{t('quotes:financials')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="discount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('quotes:discountPercentage')}</label>
            <input id="discount" type="number" name="discount" value={quote.discount} onChange={handleQuoteDetailsChange} placeholder={t('quotes:discountPercentage')} className={`w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 ${errors.discount ? 'border-red-500' : ''}`}/>
             <InputError message={errors.discount} />
          </div>
          <div>
            <label htmlFor="tax" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('quotes:taxPercentage')}</label>
            <input id="tax" type="number" name="tax" value={quote.tax} onChange={handleQuoteDetailsChange} placeholder={t('quotes:taxPercentage')} className={`w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 ${errors.tax ? 'border-red-500' : ''}`}/>
             <InputError message={errors.tax} />
          </div>
        </div>
      </section>

      {/* Civil ID Selector Modal */}
      {showIdSelector && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-blue-100 dark:border-gray-700">
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                      <h4 className="font-bold text-gray-800 dark:white flex items-center gap-2">
                          <Landmark size={18} className="text-blue-600" />
                          {t('quotes:selectLinkedId')}
                      </h4>
                      <button onClick={() => setShowIdSelector(null)} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><X size={20}/></button>
                  </div>
                  <div className="p-4 space-y-2">
                      {showIdSelector.ids.map((cid) => (
                          <button 
                              key={cid.id}
                              onClick={() => { applyClient(showIdSelector.client, cid.value); setShowIdSelector(null); }}
                              className="w-full text-left rtl:text-right p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex justify-between items-center group"
                          >
                              <div>
                                  <p className="font-mono font-bold text-gray-900 dark:text-white">{cid.value}</p>
                                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">{cid.label || '-'}</p>
                              </div>
                              <ChevronDown size={16} className="text-gray-300 group-hover:text-blue-500 rtl:rotate-90 ltr:-rotate-90"/>
                          </button>
                      ))}
                      <button 
                          onClick={() => { applyClient(showIdSelector.client); setShowIdSelector(null); }}
                          className="w-full py-2.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      >
                          {t('quotes:skipSelection')}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
