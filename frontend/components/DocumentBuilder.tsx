import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { GenericDocument, Language, CompanyInfo, DocumentTemplate } from '../types';
import { documentTemplates } from '../data/documentTemplates';
import { generateCreativeText } from '../services/geminiService';
import { validateDocument } from '../utils/validation';
import { SignatureInput } from './SignatureInput';
import { CompanyInfoBuilder } from './CompanyInfoBuilder';
import { Trash2, Sparkles } from 'lucide-react';

interface DocumentBuilderProps {
  document: GenericDocument;
  setDocument: React.Dispatch<React.SetStateAction<GenericDocument>>;
  setIsFormValid: React.Dispatch<React.SetStateAction<boolean>>;
  companyInfo: CompanyInfo;
  setCompanyInfo: React.Dispatch<React.SetStateAction<CompanyInfo>>;
}

export const DocumentBuilder: React.FC<DocumentBuilderProps> = ({ document, setDocument, setIsFormValid, companyInfo, setCompanyInfo }) => {
  const { t, i18n } = useTranslation(['documents', 'common']);
  const language = (i18n.language || 'en') as Language;
  
  const [mode, setMode] = useState<'template' | 'custom'>('template');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sortedTemplates = useMemo(() => 
    [...documentTemplates].sort((a, b) => {
        const nameA = t(a.nameKey);
        const nameB = t(b.nameKey);
        return nameA.localeCompare(nameB);
    })
  , [t]);

  const selectedTemplate = useMemo(() => {
    if (document.templateId === 'custom') return undefined;
    return documentTemplates.find(temp => temp.id === document.templateId);
  }, [document.templateId]);
  
  useEffect(() => {
    const template = document.templateId === 'custom' ? undefined : selectedTemplate;
    const validationErrors = validateDocument(document, template, t);
    setErrors(validationErrors);
    setIsFormValid(Object.keys(validationErrors).length === 0);
  }, [document, selectedTemplate, t, setIsFormValid]);


  const switchMode = (newMode: 'template' | 'custom') => {
    if (mode === newMode) return;
    setMode(newMode);
    const today = new Date().toISOString().split('T')[0];

    if (newMode === 'custom') {
        setDocument({
            templateId: 'custom',
            data: { issueDate: today, documentTitle: '' },
            customSections: [{ id: Date.now(), title: '', content: '' }]
        });
    } else {
        setDocument({
            templateId: sortedTemplates[0]?.id || '',
            data: { issueDate: today },
            customSections: []
        });
    }
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const today = new Date().toISOString().split('T')[0];
    setDocument({ 
        templateId: e.target.value, 
        data: { issueDate: today }, 
    });
  };
  
  const handleDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDocument(c => ({
        ...c,
        data: { ...c.data, [name]: value }
    }));
  };

  const handleGenerateText = async (key: string) => {
    const currentValue = document.data[key] as string || '';
    if (!currentValue.trim()) {
      alert(t('common:enterKeywords'));
      return;
    }
    setIsGenerating(key);
    try {
      const generatedText = await generateCreativeText(currentValue, language);
      setDocument(c => ({
          ...c,
          data: { ...c.data, [key]: generatedText }
      }));
    } catch (error) {
      console.error(`Failed to generate text for ${key}:`, error);
    } finally {
      setIsGenerating(null);
    }
  };

  const handleSaveSignature = (key: string, signatureDataUrl: string) => {
    setDocument(c => ({
        ...c,
        data: { ...c.data, [key]: signatureDataUrl }
    }));
  };
  
  const addCustomSection = () => {
    setDocument(d => ({
        ...d,
        customSections: [...(d.customSections || []), { id: Date.now(), title: '', content: '' }]
    }));
  };

  const removeCustomSection = (id: number) => {
      setDocument(d => ({
          ...d,
          customSections: d.customSections?.filter(a => a.id !== id)
      }));
  };

  const handleCustomSectionChange = (id: number, field: 'title' | 'content', value: string) => {
      setDocument(d => ({
          ...d,
          customSections: d.customSections?.map(a =>
              a.id === id ? { ...a, [field]: value } : a
          )
      }));
  };

  const renderInput = (key: string, config: DocumentTemplate['variables'][string]) => {
    const value = document.data[key] || '';
    let label = '';
    if ((config as any).labelKey) {
        label = t((config as any).labelKey);
    } else if ((config as any).label) {
        label = (config as any).label[language] || (config as any).label['en'];
    }

    let description = null;
    if ((config as any).descriptionKey) {
        description = t((config as any).descriptionKey);
    } else if ((config as any).description) {
        description = (config as any).description[language] || (config as any).description['en'];
    }
    const error = errors[key];
    const commonClasses = `w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-50 dark:focus:ring-offset-gray-800 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-200 ${error ? 'border-red-500' : ''}`;
    
    let inputElement;

    if (config.type === 'textarea') {
      inputElement = (
        <div className="relative">
          <textarea
            name={key} id={key} value={value as string} onChange={handleDataChange} placeholder={label}
            className={`${commonClasses} resize-none`} rows={4}
          />
          <button
            onClick={() => handleGenerateText(key)} disabled={isGenerating === key} title={t('common:generate')} aria-label={t('common:generate')}
            className="absolute top-2 rtl:left-2 ltr:right-2 p-1.5 rounded-full text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900 disabled:opacity-50 disabled:cursor-wait"
          >
            {isGenerating === key ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : ( <Sparkles className="w-5 h-5" /> )}
          </button>
        </div>
      );
    } else if (config.type === 'signature') {
      inputElement = (
          <SignatureInput 
              value={(value as string) || ''}
              onSave={(dataUrl) => handleSaveSignature(key, dataUrl)}
          />
      );
    } else {
       inputElement = ( <input type={config.type} name={key} id={key} value={value} onChange={handleDataChange} placeholder={label} className={commonClasses} /> );
    }

    return (
        <div key={key}>
            <label htmlFor={key} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
            {inputElement}
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            {description && ( <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{description}</p> )}
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
        <ModeButton targetMode="template" label={t('documents:selectTemplate')} />
        <ModeButton targetMode="custom" label={t('documents:create')} />
      </section>

      {mode === 'template' && (
        <section>
            <label htmlFor="document-template-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('documents:selectTemplate')}</label>
            <select
              id="document-template-select"
              value={document.templateId}
              onChange={handleTemplateChange}
              className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
            >
              {sortedTemplates.map(template => (
                <option key={template.id} value={template.id}>{t(template.nameKey)}</option>
              ))}
            </select>
        </section>
      )}

      <CompanyInfoBuilder companyInfo={companyInfo} setCompanyInfo={setCompanyInfo} />

      {mode === 'template' && selectedTemplate && (
        <section>
             <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">{t(selectedTemplate.nameKey)}</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(selectedTemplate.variables).map((key) => {
                    const config = selectedTemplate.variables[key];
                    return (
                        <div key={key} className={config.type === 'textarea' || config.type === 'signature' ? 'md:col-span-2' : ''}>
                            {renderInput(key, config)}
                        </div>
                    );
                })}
            </div>
        </section>
      )}

      {mode === 'custom' && (
        <>
            <fieldset className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                <legend className="px-2 text-sm font-medium text-gray-600 dark:text-gray-400">{t('documents:documentDetails')}</legend>
                <div className="mt-4">
                    <label htmlFor="documentTitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('documents:documentTitle')}</label>
                    <input
                        type="text"
                        name="documentTitle"
                        id="documentTitle"
                        value={document.data.documentTitle || ''}
                        onChange={handleDataChange}
                        placeholder={t('documents:documentTitle')}
                        className={`w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 ${errors.documentTitle ? 'border-red-500' : ''}`}
                    />
                    {errors.documentTitle && <p className="text-red-500 text-xs mt-1">{errors.documentTitle}</p>}
                </div>
            </fieldset>

            <fieldset className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                <legend className="px-2 text-sm font-medium text-gray-600 dark:text-gray-400">{t('documents:customSections')}</legend>
                <div className="space-y-4 mt-4">
                {document.customSections?.map((section) => (
                    <div key={section.id} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50 dark:border-gray-700 space-y-3 relative">
                    <button
                        onClick={() => removeCustomSection(section.id)}
                        className="absolute top-2 right-2 rtl:right-auto rtl:left-2 p-1 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50"
                        title={t('documents:deleteSection')}
                    >
                        <Trash2 size={16} />
                    </button>
                    <div>
                        <label htmlFor={`custom-title-${section.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('documents:sectionTitle')}</label>
                        <input
                        type="text"
                        id={`custom-title-${section.id}`}
                        value={section.title}
                        onChange={(e) => handleCustomSectionChange(section.id, 'title', e.target.value)}
                        placeholder={t('documents:sectionTitle')}
                        className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label htmlFor={`custom-content-${section.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('documents:sectionContent')}</label>
                        <textarea
                        id={`custom-content-${section.id}`}
                        value={section.content}
                        onChange={(e) => handleCustomSectionChange(section.id, 'content', e.target.value)}
                        placeholder={t('documents:sectionContent')}
                        className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows={3}
                        />
                    </div>
                    </div>
                ))}
                <button onClick={addCustomSection} className="px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    {t('documents:addSection')}
                </button>
                </div>
            </fieldset>

            <fieldset className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                <legend className="px-2 text-sm font-medium text-gray-600 dark:text-gray-400">{t('common:signatures')}</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('common:partyA')}</label>
                        <SignatureInput value={document.data['partyA.signature'] as string || ''} onSave={(dataUrl) => handleSaveSignature('partyA.signature', dataUrl)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('common:partyB')}</label>
                        <SignatureInput value={document.data['partyB.signature'] as string || ''} onSave={(dataUrl) => handleSaveSignature('partyB.signature', dataUrl)} />
                    </div>
                </div>
            </fieldset>
        </>
      )}

    </div>
  );
};
