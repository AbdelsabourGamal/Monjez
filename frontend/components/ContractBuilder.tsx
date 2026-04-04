import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Contract, Language, ContractTemplate, CompanyInfo, Jurisdiction, DbClient, CivilIdEntry } from '../types';
import { contractTemplates } from '../data/contractTemplates';
import { generateCreativeText } from '../services/geminiService';
import { validateContract } from '../utils/validation';
import { SignatureInput } from './SignatureInput';
import { AddressInputGroup } from './AddressInputGroup';
import { PhoneInputGroup } from './PhoneInputGroup';
import { CompanyInfoBuilder } from './CompanyInfoBuilder';
import { Landmark, X, ChevronDown, Trash2, Sparkles } from 'lucide-react';

interface ContractBuilderProps {
  contract: Contract;
  setContract: React.Dispatch<React.SetStateAction<Contract>>;
  setIsFormValid: React.Dispatch<React.SetStateAction<boolean>>;
  companyInfo: CompanyInfo;
  setCompanyInfo: React.Dispatch<React.SetStateAction<CompanyInfo>>;
  dbClients: DbClient[];
}

export const ContractBuilder: React.FC<ContractBuilderProps> = ({ contract, setContract, setIsFormValid, companyInfo, setCompanyInfo, dbClients }) => {
  const { t, i18n } = useTranslation(['contracts', 'common', 'clients']);
  const language = (i18n.language || 'en') as Language;
  
  const [mode, setMode] = useState<'template' | 'custom'>('template');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Multiple Civil ID Selection
  const [showIdSelector, setShowIdSelector] = useState<{ client: DbClient, ids: CivilIdEntry[], groupKey: string } | null>(null);

  const sortedTemplates = useMemo(() => 
    [...contractTemplates].sort((a, b) => {
        const nameA = t(a.nameKey);
        const nameB = t(b.nameKey);
        return nameA.localeCompare(nameB);
    })
  , [t]);

  const selectedTemplate = useMemo(() => {
    if (contract.templateId === 'custom') return undefined;
    return contractTemplates.find(template => template.id === contract.templateId);
  }, [contract.templateId]);
  
  useEffect(() => {
    const template = contract.templateId === 'custom' ? undefined : selectedTemplate;
    const validationErrors = validateContract(contract, template, t);
    setErrors(validationErrors);
    setIsFormValid(Object.keys(validationErrors).length === 0);
  }, [contract, selectedTemplate, t, setIsFormValid]);


  const groupedVariables = useMemo(() => {
    if (!selectedTemplate) return {};

    const getGroupKey = (key: string) => {
        if (key.includes('.')) {
            return key.split('.')[0];
        }
        return 'details';
    };

    return Object.keys(selectedTemplate.variables).reduce((acc, key) => {
        const groupKey = getGroupKey(key);
        if (!acc[groupKey]) {
            acc[groupKey] = [];
        }
        acc[groupKey].push(key);
        return acc;
    }, {} as Record<string, string[]>);

  }, [selectedTemplate]);

  const switchMode = (newMode: 'template' | 'custom') => {
    if (mode === newMode) return;
    setMode(newMode);
    const today = new Date().toISOString().split('T')[0];

    if (newMode === 'custom') {
        setContract({
            templateId: 'custom',
            jurisdiction: contract.jurisdiction,
            data: { issueDate: today, contractTitle: '' },
            customArticles: [{ id: Date.now(), title: '', content: '' }]
        });
    } else {
        setContract({
            templateId: sortedTemplates[0]?.id || '',
            jurisdiction: contract.jurisdiction,
            data: { issueDate: today },
            customArticles: []
        });
    }
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const today = new Date().toISOString().split('T')[0];
    setContract(c => ({ 
        templateId: e.target.value, 
        data: { issueDate: today }, 
        customArticles: [], 
        jurisdiction: c.jurisdiction 
    }));
  };
  
  const handleDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setContract(c => ({
        ...c,
        data: {
            ...c.data,
            [name]: value,
        }
    }));
  };

  const handleDbClientSelect = (groupKey: string, clientId: string) => {
    const client = dbClients.find(client => client.id === clientId);
    if(!client) return;

    if (client.civilIds && client.civilIds.length > 1) {
        setShowIdSelector({ client, ids: client.civilIds, groupKey });
    } else {
        applyClientToContract(groupKey, client, client.civilIds?.[0]?.value);
    }
  }

  const applyClientToContract = (groupKey: string, client: DbClient, selectedId?: string) => {
    setContract(c => {
        const newData = { ...c.data };
        newData[`${groupKey}.name`] = client.name;
        newData[`${groupKey}.address.street`] = client.address;
        newData[`${groupKey}.phone.number`] = client.phone;
        
        // Map Civil ID if found and template has it
        if (selectedId) {
            newData[`${groupKey}.civilId`] = selectedId;
        }
        
        return { ...c, data: newData };
    });
  };
  
  const handleJurisdictionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setContract(c => ({
        ...c,
        jurisdiction: e.target.value as Jurisdiction,
    }));
  };

  const handleGenerateText = async (key: string) => {
    const currentValue = contract.data[key] as string || '';
    if (!currentValue.trim()) {
      alert(t('common:enterKeywords'));
      return;
    }
    setIsGenerating(key);
    try {
      const generatedText = await generateCreativeText(currentValue, language, contract.jurisdiction);
      setContract(c => ({
          ...c,
          data: {
              ...c.data,
              [key]: generatedText,
          }
      }));
    } catch (error) {
      console.error(`Failed to generate text for ${key}:`, error);
    } finally {
      setIsGenerating(null);
    }
  };

  const handleSaveSignature = (key: string, signatureDataUrl: string) => {
    const party = key.split('.')[0];
    const dateKey = `${party}.signatureDate`;
    const today = new Date().toISOString().split('T')[0];

    setContract(c => {
        const existingSignature = c.data[key] as string || '';
        const hasNewSignature = signatureDataUrl.startsWith('data:image');
        
        return {
            ...c,
            data: {
                ...c.data,
                [key]: signatureDataUrl,
                [dateKey]: hasNewSignature && !existingSignature.startsWith('data:image') 
                    ? today 
                    : !hasNewSignature ? '' : c.data[dateKey],
            }
        };
    });
  };

  const addCustomArticle = () => {
    setContract(c => ({
        ...c,
        customArticles: [...(c.customArticles || []), { id: Date.now(), title: '', content: '' }]
    }));
  };

  const removeCustomArticle = (id: number) => {
      setContract(c => ({
          ...c,
          customArticles: c.customArticles?.filter(a => a.id !== id)
      }));
  };

  const handleCustomArticleChange = (id: number, field: 'title' | 'content', value: string) => {
      setContract(c => ({
          ...c,
          customArticles: c.customArticles?.map(a =>
              a.id === id ? { ...a, [field]: value } : a
          )
      }));
  };

  const renderInput = (key: string, config: ContractTemplate['variables'][string]) => {
    const groupKey = key.split('.')[0];
    const partyType = (contract.data[`${groupKey}.partyType`] as 'company' | 'individual') || 'company';
    if (config.context && config.context !== partyType) {
        return null;
    }

    const value = contract.data[key] || '';
    
    let label = t(config.labelKey);
    if (config.labelsKeys) {
        label = t(config.labelsKeys[partyType]) || label;
    }

    const description = config.descriptionKey ? t(config.descriptionKey) : null;
    const error = errors[key];
    const commonClasses = "w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-800 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-200";
    const errorClasses = error ? 'border-red-500' : '';
    
    let inputElement;

    if (config.options) {
      inputElement = (
        <select
          name={key}
          id={key}
          value={value as string}
          onChange={handleDataChange}
          className={`${commonClasses} ${errorClasses}`}
        >
          <option value="">{t('contracts:selectOption')}</option>
          {config.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.labelKey)}
            </option>
          ))}
        </select>
      );
    } else if (config.type === 'textarea') {
      inputElement = (
        <div className="relative">
          <textarea
            name={key}
            id={key}
            value={value as string}
            onChange={handleDataChange}
            placeholder={label}
            className={`${commonClasses} ${errorClasses} resize-none`}
            rows={4}
          />
          <button
            onClick={() => handleGenerateText(key)}
            disabled={isGenerating === key}
            title={t('common:generate')}
            aria-label={t('common:generate')}
            className="absolute top-2 rtl:left-2 ltr:right-2 p-1.5 rounded-full text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900 disabled:opacity-50 disabled:cursor-wait"
          >
            {isGenerating === key ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </button>
        </div>
      );
    } else if (config.type === 'signature') {
      const signatureValue = (value as string) || '';
      inputElement = (
          <SignatureInput 
              value={signatureValue}
              onSave={(dataUrl) => handleSaveSignature(key, dataUrl)}
          />
      );
    } else {
       inputElement = (
         <input
          type={config.type}
          name={key}
          id={key}
          value={value}
          onChange={handleDataChange}
          placeholder={label}
          className={`${commonClasses} ${errorClasses}`}
        />
       );
    }

    return (
        <div>
            <label htmlFor={key} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {label}
            </label>
            {inputElement}
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            {!error && description && (
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
            )}
        </div>
    );
  };

  const renderGroupedInputs = (groupKey: string, varKeys: string[]) => {
    if (!selectedTemplate) return [];
    const renderedGroups = new Set<string>();
    const elements: React.ReactNode[] = [];

    const isPartyGroup = ['partyA', 'partyB', 'employer', 'employee', 'client', 'contractor', 'landlord', 'tenant'].some(k => groupKey.includes(k));

    if (isPartyGroup && dbClients.length > 0) {
         elements.push(
             <div key="db-select" className="md:col-span-2 mb-4">
                 <label className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1 block">{t('contracts:addFromDb')}</label>
                 <select 
                    onChange={(e) => { handleDbClientSelect(groupKey, e.target.value); e.target.value = ""; }}
                    className="w-full p-2 text-sm border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 rounded-md text-blue-800 dark:text-blue-200"
                    defaultValue=""
                 >
                     <option value="" disabled>{t('clients:select')}</option>
                     {dbClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
             </div>
         )
    }

    varKeys.forEach((key: string) => {
      const groupMatch = key.match(/^(.*\.(?:address|phone))\./);
      
      if (groupMatch) {
        const groupBaseKey = groupMatch[1];
        if (renderedGroups.has(groupBaseKey)) {
          return; 
        }
        renderedGroups.add(groupBaseKey);
        
        const isAddress = groupBaseKey.endsWith('.address');
        const isPhone = groupBaseKey.endsWith('.phone');
        
        let component = null;
        if (isAddress) {
          component = <AddressInputGroup 
            key={groupBaseKey} 
            baseKey={groupBaseKey} 
            data={contract.data} 
            onChange={handleDataChange} 
            errors={errors} 
            templateVariables={selectedTemplate?.variables}
          />;
        } else if (isPhone) {
          component = <PhoneInputGroup
            key={groupBaseKey}
            baseKey={groupBaseKey}
            data={contract.data}
            onChange={handleDataChange}
            errors={errors}
            templateVariables={selectedTemplate?.variables}
          />
        }

        if(component) {
           elements.push(
            <div key={groupBaseKey} className="md:col-span-2">
              {component}
            </div>
           );
        }

      } else {
        const config = selectedTemplate.variables[key];
        const isFullWidth = config.type === 'textarea' || config.type === 'signature' || key.toLowerCase().includes('description') || key.toLowerCase().includes('license');
        const inputElement = renderInput(key, config);
        if (inputElement) {
            elements.push(
              <div key={key} className={isFullWidth ? 'md:col-span-2' : ''}>
                {inputElement}
              </div>
            );
        }
      }
    });

    return elements;
  }

  const PartyTypeToggle: React.FC<{ groupKey: string }> = ({ groupKey }) => {
    const partyType = contract.data[`${groupKey}.partyType`] || 'company';
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setContract(c => ({
        ...c,
        data: {
          ...c.data,
          [`${groupKey}.partyType`]: e.target.value,
        }
      }));
    };
  
    return (
      <div className="md:col-span-2 mb-2 p-2 rounded-md bg-gray-100 dark:bg-gray-900/50">
        <fieldset>
            <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-4 rtl:mr-0 rtl:ml-4 float-left rtl:float-right">{t('contracts:partyTypeLabel')}</legend>
            <div className="flex gap-4 pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" name={`${groupKey}-type`} value="company" checked={partyType === 'company'} onChange={handleChange} className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                    <span>{t('contracts:company')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="radio" name={`${groupKey}-type`} value="individual" checked={partyType === 'individual'} onChange={handleChange} className="form-radio h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                    <span>{t('contracts:individual')}</span>
                </label>
            </div>
        </fieldset>
      </div>
    );
  };

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
      <section className="grid grid-cols-2 gap-4">
        <ModeButton targetMode="template" label={t('contracts:selectTemplate')} />
        <ModeButton targetMode="custom" label={t('contracts:create')} />
      </section>

      {mode === 'template' && (
        <section>
            <label htmlFor="template-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('contracts:selectTemplate')}
            </label>
            <select
              id="template-select"
              value={contract.templateId}
              onChange={handleTemplateChange}
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

      <section>
          <label htmlFor="jurisdiction-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('contracts:governingLaw')}
          </label>
          <select
            id="jurisdiction-select"
            value={contract.jurisdiction}
            onChange={handleJurisdictionChange}
            className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="kw">{t('common:jurisdictions.kw')}</option>
            <option value="sa">{t('common:jurisdictions.sa')}</option>
            <option value="ae">{t('common:jurisdictions.ae')}</option>
            <option value="eg">{t('common:jurisdictions.eg')}</option>
            <option value="bh">{t('common:jurisdictions.bh')}</option>
            <option value="qa">{t('common:jurisdictions.qa')}</option>
            <option value="intl">{t('common:jurisdictions.intl')}</option>
          </select>
      </section>

      <CompanyInfoBuilder 
        companyInfo={companyInfo} 
        setCompanyInfo={setCompanyInfo} 
      />

      {mode === 'template' && selectedTemplate && (
         <div className="space-y-6">
            {Object.entries(groupedVariables).map(([groupKey, varKeys]) => (
                <fieldset key={groupKey} className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                    <legend className="px-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                         {t(`contracts:groups.${groupKey}`, { defaultValue: groupKey })}
                    </legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6 mt-4">
                        {selectedTemplate.switchableParties?.includes(groupKey) && <PartyTypeToggle groupKey={groupKey} />}
                        {renderGroupedInputs(groupKey, varKeys as string[])}
                    </div>
                </fieldset>
            ))}
        </div>
      )}

      {mode === 'custom' && (
        <fieldset className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
             <legend className="px-2 text-sm font-medium text-gray-600 dark:text-gray-400">{t('contracts:details')}</legend>
             <div className="mt-4">
                <label htmlFor="contractTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('contracts:contractTitle')}</label>
                <input
                    type="text"
                    name="contractTitle"
                    id="contractTitle"
                    value={contract.data.contractTitle || ''}
                    onChange={handleDataChange}
                    placeholder={t('contracts:contractTitle')}
                    className={`w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 ${errors.contractTitle ? 'border-red-500' : ''}`}
                />
                {errors.contractTitle && <p className="text-red-500 text-xs mt-1">{errors.contractTitle}</p>}
             </div>
        </fieldset>
      )}

      <fieldset className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
        <legend className="px-2 text-sm font-medium text-gray-600 dark:text-gray-400">
          {t('contracts:customArticles')}
        </legend>
        <div className="space-y-4 mt-4">
          {contract.customArticles?.map((article) => (
            <div key={article.id} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50 dark:border-gray-700 space-y-3 relative">
              <button
                onClick={() => removeCustomArticle(article.id)}
                className="absolute top-2 right-2 rtl:right-auto rtl:left-2 p-1 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50"
                title={t('contracts:deleteArticle')}
              >
                <Trash2 size={16} />
              </button>
              <div>
                <label htmlFor={`custom-title-${article.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contracts:articleTitle')}</label>
                <input
                  type="text"
                  id={`custom-title-${article.id}`}
                  value={article.title}
                  onChange={(e) => handleCustomArticleChange(article.id, 'title', e.target.value)}
                  placeholder={t('contracts:articleTitle')}
                  className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor={`custom-content-${article.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('contracts:articleContent')}</label>
                <textarea
                  id={`custom-content-${article.id}`}
                  value={article.content}
                  onChange={(e) => handleCustomArticleChange(article.id, 'content', e.target.value)}
                  placeholder={t('contracts:articleContent')}
                  className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                />
              </div>
            </div>
          ))}
          <button onClick={addCustomArticle} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            {t('contracts:addArticle')}
          </button>
        </div>
      </fieldset>

      {mode === 'custom' && (
        <fieldset className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
            <legend className="px-2 text-sm font-medium text-gray-600 dark:text-gray-400">{t('contracts:signatures')}</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('contracts:partyA')}</label>
                    <SignatureInput value={contract.data['partyA.signature'] as string || ''} onSave={(dataUrl) => handleSaveSignature('partyA.signature', dataUrl)} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('contracts:partyB')}</label>
                     <SignatureInput value={contract.data['partyB.signature'] as string || ''} onSave={(dataUrl) => handleSaveSignature('partyB.signature', dataUrl)} />
                </div>
            </div>
        </fieldset>
      )}

      {/* Civil ID Selector Modal */}
      {showIdSelector && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-blue-100 dark:border-gray-700">
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                      <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                          <Landmark size={18} className="text-blue-600" />
                          {t('contracts:selectLinkedId')}
                      </h4>
                      <button onClick={() => setShowIdSelector(null)} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><X size={20}/></button>
                  </div>
                  <div className="p-4 space-y-2">
                      <p className="text-xs text-gray-500 mb-4">{t('contracts:selectIdFor', { name: showIdSelector.client.name })}</p>
                      {showIdSelector.ids.map((cid) => (
                          <button 
                              key={cid.id}
                              onClick={() => { applyClientToContract(showIdSelector.groupKey, showIdSelector.client, cid.value); setShowIdSelector(null); }}
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
                          onClick={() => { applyClientToContract(showIdSelector.groupKey, showIdSelector.client); setShowIdSelector(null); }}
                          className="w-full py-2.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                      >
                          {t('contracts:skipSelection')}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
