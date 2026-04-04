import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Contract, Language, ContractTemplate, CompanyInfo } from '../types';
import { FileText, FileDown, Save, MessageSquare, Mail, Printer } from 'lucide-react';
import { exportPdf, exportDocx } from '../utils/exportService';
import { EmailComposer } from './EmailComposer';

interface ContractPreviewProps {
  contract: Contract;
  processedContent: string; 
  selectedTemplate: ContractTemplate | undefined;
  companyInfo: CompanyInfo;
  onSave?: () => void;
}

export const ContractPreview: React.FC<ContractPreviewProps> = ({ contract, processedContent, selectedTemplate, companyInfo, onSave }) => {
  const { t, i18n } = useTranslation(['contracts', 'common']);
  const language = (i18n.language || 'en') as Language;
  
  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // --- Internal Content Generation for Export ---
  const generateFullContent = useMemo(() => {
      if (!selectedTemplate) {
          return contract.data.contractTitle 
            ? `${contract.data.contractTitle}\n\n${contract.customArticles?.map(a => `${a.title}\n${a.content}`).join('\n\n')}`
            : "";
      }

      let content = t(selectedTemplate.contentKey);
      
      // Replace variables
      Object.keys(selectedTemplate.variables).forEach(variable => {
          const varConfig = selectedTemplate.variables[variable];
          const label = t(varConfig.labelKey);
          const value = contract.data[variable] || `[${label}]`;
          content = content.replace(new RegExp(`{{${variable}}}`, 'g'), String(value));
      });

      // Cleanup Handlebars-like logic tags
      content = content.replace(/{{#if.*?}}(.*?){{\/if}}/gs, '$1'); 
      
      // Append Custom Articles
      if (contract.customArticles && contract.customArticles.length > 0) {
          const customContent = contract.customArticles.map(a => `${a.title}\n${a.content}`).join('\n\n');
          content += `\n\n${customContent}`;
      }

      return content;
  }, [contract.data, contract.customArticles, selectedTemplate, language]);

  const fullContentForExport = generateFullContent;

  const handleExportPdf = async () => {
      setIsExporting(true);
      await exportPdf(fullContentForExport, language, t, `Contract_${Date.now()}`);
      setIsExporting(false);
  };

  const handleExportDocx = () => {
      exportDocx(fullContentForExport, language, t, `Contract_${Date.now()}`);
  };

  const handlePrint = () => {
      window.print();
  };

  const handleWhatsAppShare = () => {
      const text = t('contracts:whatsappShareText');
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
  };

  const isCustom = contract.templateId === 'custom' || !selectedTemplate;

  if (isCustom && (!contract.customArticles || contract.customArticles.length === 0) && !contract.data.contractTitle) {
     return <div className="p-12 text-center text-gray-400 italic">{t('contracts:startBuildingCustom')}</div>;
  }
  
  const signatureSeparator = t('contracts:signatureSeparator');
  const displayContent = processedContent || fullContentForExport; 
  const [mainBody] = displayContent.split(signatureSeparator);
  
  const articleTitleClasses = "!font-bold !text-lg !mt-8 !mb-4 !pb-2 !border-b !border-gray-200 dark:!border-gray-700 !text-gray-800 dark:!text-gray-200";

  const renderMainBody = (body: string) => {
    return body.split('\n').map((paragraph, index) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return <br key={index} />;

      if (/^(المادة|ARTICLE) \(\d+\)/.test(trimmed)) {
        return <h3 key={index} className={articleTitleClasses}>{trimmed}</h3>;
      }
      if (/^(RECITALS:|تمهيد:)/.test(trimmed)) {
        return <h4 key={index} className="!font-semibold !text-sm !mt-6 !mb-3 text-center !text-gray-500 uppercase tracking-widest border-y border-gray-100 dark:border-gray-800 py-2">{trimmed}</h4>;
      }
      if (/^\d\./.test(trimmed)) {
        return <p key={index} className="!mb-2 !text-justify !leading-relaxed pl-4 rtl:pr-4 rtl:pl-0">{trimmed}</p>;
      }

      return <p key={index} className="!text-justify !leading-relaxed !mb-3">{trimmed}</p>;
    });
  };
  
  const renderCustomArticles = () => {
    if (!contract.customArticles || contract.customArticles.length === 0) {
      return null;
    }

    return (
      <>
        {contract.customArticles.map(article => {
          if (!article.title.trim() && !article.content.trim()) return null;
          return (
            <div key={article.id} className="!mt-6">
              <h3 className={articleTitleClasses}>{article.title || t('contracts:additionalArticle')}</h3>
              {article.content.split('\n').map((para, i) => (
                <p key={i} className="!text-justify !leading-relaxed !mb-2">{para}</p>
              ))}
            </div>
          );
        })}
      </>
    );
  };
  
  const renderSignatures = () => {
    if (!selectedTemplate) return null;
    
    const signatureGroups: Record<string, {name?: string, sig?: string, date?: string}> = {};
    const partyNameKeys: Record<string, string> = {};

    Object.keys(selectedTemplate.variables).forEach(key => {
        const parts = key.split('.');
        if (parts.length > 1) {
            const party = parts[0];
            const field = parts[1];

            if (!signatureGroups[party]) {
                signatureGroups[party] = {};
            }
            if (field === 'name') {
                partyNameKeys[party] = key;
            } else if (field === 'signature') {
                signatureGroups[party].sig = key;
            } else if (field === 'signatureDate') {
                signatureGroups[party].date = key;
            }
        }
    });

    const signaturePartyKeys = Object.keys(signatureGroups).filter(party => signatureGroups[party].sig);

    if (signaturePartyKeys.length === 0) {
      return null;
    }
    
    return (
      <>
        <div className="mt-16 mb-10 flex items-center gap-4 print:break-inside-avoid">
            <div className="h-px bg-gray-300 dark:bg-gray-600 flex-1"></div>
            <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">{t('contracts:signatures')}</span>
            <div className="h-px bg-gray-300 dark:bg-gray-600 flex-1"></div>
        </div>
        <p className="!text-justify !mb-10 font-medium text-gray-600 dark:text-gray-300 italic">{signatureSeparator}</p>
        <div className={`grid grid-cols-1 md:grid-cols-${signaturePartyKeys.length > 1 ? signaturePartyKeys.length : 1} gap-x-16 gap-y-12 !mt-8 not-prose`}>
          {signaturePartyKeys.map((partyKey) => {
            const group = signatureGroups[partyKey];
            const nameKey = partyNameKeys[partyKey];
            const nameLabel = nameKey ? t(selectedTemplate.variables[nameKey].labelKey) : '';
            
            const name = nameKey ? String(contract.data[nameKey] || `[${nameLabel}]`) : '';
            const signatureData = group.sig ? String(contract.data[group.sig] || '') : '';
            const signatureDate = group.date ? String(contract.data[group.date] || '') : '';

            const hasSignature = signatureData.startsWith('data:image');

            return (
              <div key={partyKey} className="space-y-2 pt-4">
                <div className="text-sm">
                  <span className="font-bold text-gray-500 dark:text-gray-400 uppercase text-[10px] tracking-wider">{t('contracts:signatureLabels.name')}</span>
                  <p className="font-serif text-gray-900 dark:text-white text-lg border-b border-gray-300 dark:border-gray-700 pb-2 min-h-[2rem]">
                    {name}
                  </p>
                </div>
                <div className="text-sm mt-4">
                  <span className="font-bold text-gray-500 dark:text-gray-400 uppercase text-[10px] tracking-wider">{t('contracts:signatureLabels.signature')}</span>
                   <div className="mt-1 h-28 flex items-center justify-center bg-white dark:bg-gray-900/50 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden relative">
                    {hasSignature ? (
                       <img src={signatureData} alt="Signature" className="max-h-full max-w-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                    ) : (
                      <div className="text-gray-300 italic text-xs">{t('contracts:noSignature')}</div>
                    )}
                  </div>
                </div>
                {signatureDate && (
                    <div className="text-sm mt-2">
                        <span className="font-bold text-gray-500 dark:text-gray-400 uppercase text-[10px] tracking-wider">{t('contracts:signatureLabels.date')}</span>
                        <p className="font-mono text-gray-700 dark:text-gray-300 text-sm">
                            {signatureDate}
                        </p>
                    </div>
                )}
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const ActionButton = ({ onClick, icon: Icon, title, className = "", disabled = false }: any) => (
      <button 
        onClick={onClick} 
        disabled={disabled}
        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white active:scale-95 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${className}`} 
        title={title}
      >
          <Icon size={20} strokeWidth={1.5} />
      </button>
  );

  return (
    <div className="relative h-full flex flex-col" dir={i18n.dir()}>
      
      {/* Floating Command Dock */}
      <div className="sticky top-4 z-30 w-full px-4 mb-6 flex justify-center print:hidden">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl p-1.5 sm:p-2 flex items-center gap-1 sm:gap-2 ring-1 ring-black/5 max-w-full overflow-x-auto scrollbar-hide">
            
            {/* Primary Action: Save */}
            {onSave && (
                <>
                    <button 
                        onClick={onSave} 
                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-all hover:bg-gray-800 dark:hover:bg-100 flex-shrink-0"
                    >
                        <Save size={18} strokeWidth={2} />
                        <span className="hidden sm:inline">{t('common:save')}</span>
                    </button>
                    <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1 sm:mx-2 flex-shrink-0"></div>
                </>
            )}

            {/* Export Group */}
            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <ActionButton onClick={handlePrint} icon={Printer} title={t('common:print')} className="hover:text-gray-700 dark:hover:text-gray-300" />
                <ActionButton onClick={handleExportPdf} disabled={isExporting} icon={FileDown} title="PDF" className="hover:text-red-600 dark:hover:text-red-400" />
                <ActionButton onClick={handleExportDocx} icon={FileText} title="Word" className="hover:text-blue-600 dark:hover:text-blue-400" />
            </div>

            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1 sm:mx-2 flex-shrink-0"></div>

            {/* Share Group */}
            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <ActionButton onClick={handleWhatsAppShare} icon={MessageSquare} title="WhatsApp" className="hover:text-green-600 dark:hover:text-green-400" />
                <ActionButton onClick={() => setIsEmailComposerOpen(true)} icon={Mail} title="Email" className="hover:text-purple-600 dark:hover:text-purple-400" />
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-lg pb-8 px-2 print:overflow-visible print:h-auto">
          <div className="border border-gray-200 dark:border-gray-700 min-h-[700px] bg-white dark:bg-gray-800 shadow-xl max-w-[210mm] mx-auto animate-fade-in flex flex-col print:shadow-none print:border-none print:m-0 print:max-w-none print-content">
              <div className="p-12 flex-1">
                  {/* Header */}
                  <div className="flex justify-between items-start pb-8 border-b border-gray-200 dark:border-gray-700 mb-10">
                      <div className={`flex flex-col ${i18n.dir() === 'rtl' ? 'items-start' : 'items-end'} flex-1`}>
                          {companyInfo.logo ? (
                            <img src={companyInfo.logo} alt="Company Logo" className="h-16 object-contain mb-4" />
                          ) : (
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{companyInfo.name}</h2>
                          )}
                          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-0.5 text-right rtl:text-left">
                              <p>{companyInfo.address}</p>
                              <p>{companyInfo.phone}</p>
                              <p>{companyInfo.email}</p>
                          </div>
                      </div>
                  </div>

                  {/* Title */}
                  <div className="text-center mb-12">
                      <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white underline decoration-gray-300 dark:decoration-gray-700 underline-offset-8 decoration-2">
                          {isCustom ? (contract.data.contractTitle || `[${t('contracts:contractTitle')}]`) : (selectedTemplate ? t(selectedTemplate.nameKey) : '')}
                      </h1>
                      <p className="text-sm text-gray-500 mt-4 font-mono">{contract.data.issueDate}</p>
                  </div>

                  {/* Content */}
                  <div className="prose dark:prose-invert prose-sm max-w-none text-gray-800 dark:text-gray-300 print:text-black">
                      {isCustom ? renderCustomArticles() : (selectedTemplate && renderMainBody(fullContentForExport))}
                      {renderSignatures()}
                  </div>
              </div>
              
              {/* Footer */}
              <div className="mt-auto border-t border-gray-100 dark:border-gray-800 p-6 text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                      {t('contracts:officialLegalDocument')} &bull; {companyInfo.name} 
                  </p>
              </div>
          </div>
      </div>

      <EmailComposer 
        isOpen={isEmailComposerOpen} 
        onClose={() => setIsEmailComposerOpen(false)}
        data={{
            clientName: (contract.data['partyB.name'] || contract.data['employee.name'] || '') as string,
            subject: `${selectedTemplate ? t(selectedTemplate.nameKey) : 'Contract Draft'}`,
            details: t('contracts:emailReviewDetails')
        }}
      />
    </div>
  );
};
