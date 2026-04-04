import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { GenericDocument, Language, DocumentTemplate, CompanyInfo, QuoteCurrency } from '../types';
import { numberToWords } from '../utils/numberToWords';
import { FileText, FileDown, Save, MessageSquare, Mail } from 'lucide-react';
import { exportPdf, exportDocx } from '../utils/exportService';
import { EmailComposer } from './EmailComposer';

interface DocumentPreviewProps {
  document: GenericDocument;
  processedContent: string;
  selectedTemplate: DocumentTemplate | undefined;
  companyInfo: CompanyInfo;
  onSave?: () => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ document, processedContent, selectedTemplate, companyInfo, onSave }) => {
  const { t, i18n } = useTranslation(['documents', 'common', 'numbers']);
  const language = (i18n.language || 'en') as Language;

  const [isEmailComposerOpen, setIsEmailComposerOpen] = useState(false);

  // --- Internal Content Generation for Export ---
  const generateFullContent = useMemo(() => {
    if (!selectedTemplate) {
      return document.data.documentTitle
        ? `${document.data.documentTitle}\n\n${document.customSections?.map(a => `${a.title}\n${a.content}`).join('\n\n')}`
        : "";
    }

    let amountInWordsStr = t('documents:amountInWords', { defaultValue: '[Amount in words]' });
    if (document.data['amount']) {
      const amount = document.data['amount'] as number;
      const currency = document.data['currency'] as QuoteCurrency || 'KWD';
      amountInWordsStr = numberToWords(amount, currency, t);
    }

    let content = t(selectedTemplate.contentKey, { amountInWords: amountInWordsStr });

    // Replace variables
    Object.keys(selectedTemplate.variables).forEach(variable => {
      const varConfig = selectedTemplate.variables[variable] as any;
      let label = '';
      if (varConfig.labelKey) {
        label = t(varConfig.labelKey);
      } else if (varConfig.label) {
        label = varConfig.label[language] || varConfig.label['en'];
      }
      const value = document.data[variable] || `[${label}]`;
      content = content.replace(new RegExp(`{{${variable}}}`, 'g'), String(value));
    });

    // Catch any remaining amountInWords that didn't get interpolated by i18next
    if (content.includes('{{amountInWords}}')) {
      content = content.replace(/{{amountInWords}}/g, amountInWordsStr);
    }

    // Append Custom Sections
    if (document.customSections && document.customSections.length > 0) {
      const customContent = document.customSections.map(a => `${a.title}\n${a.content}`).join('\n\n');
      content += `\n\n${customContent}`;
    }

    return content;
  }, [document.data, document.customSections, selectedTemplate, language]);

  const fullContentForExport = generateFullContent;

  const handleExportPdf = () => {
    exportPdf(fullContentForExport, language, t, `Document_${Date.now()}`);
  };

  const handleExportDocx = () => {
    exportDocx(fullContentForExport, language, t, `Document_${Date.now()}`);
  };

  const handleWhatsAppShare = () => {
    const text = t('documents:whatsappShareText');
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const isCustom = document.templateId === 'custom' || !selectedTemplate;

  if (isCustom && (!document.customSections || document.customSections.length === 0) && !document.data.documentTitle) {
    return <div className="p-12 text-center text-gray-400 italic">{t('documents:startBuildingCustom')}</div>;
  }

  let finalContent = processedContent || fullContentForExport;
  const amount = document.data['amount'] as number;
  const currency = document.data['currency'] as QuoteCurrency;

  if (amount > 0 && currency && finalContent.includes('{{amountInWords}}')) {
    const words = numberToWords(amount, currency, t);
    finalContent = finalContent.replace(new RegExp('{{amountInWords}}', 'g'), words);
  } else if (finalContent.includes('{{amountInWords}}')) {
    finalContent = finalContent.replace(new RegExp('{{amountInWords}}', 'g'), t('documents:amountInWords', { defaultValue: '[Amount in words]' }));
  }

  const sectionTitleClasses = "!font-bold !text-lg !mt-8 !mb-4 !pb-2 !border-b !border-gray-200 dark:!border-gray-700 !text-gray-800 dark:!text-gray-200";

  const renderContent = (body: string) => {
    return body.split('\n').map((paragraph, index) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return <br key={index} />;
      return <p key={index} className="!text-justify !my-3 !leading-loose text-base">{trimmed}</p>;
    });
  };

  const renderCustomSections = () => {
    if (!document.customSections || document.customSections.length === 0) return null;

    return (
      <>
        {document.customSections.map(section => {
          if (!section.title.trim() && !section.content.trim()) return null;
          return (
            <div key={section.id} className="!mt-6">
              <h3 className={sectionTitleClasses}>{section.title || t('documents:additionalSection')}</h3>
              {section.content.split('\n').map((para, i) => (
                <p key={i} className="!text-justify !leading-relaxed mb-2">{para}</p>
              ))}
            </div>
          );
        })}
      </>
    );
  };

  const renderTemplateSignatures = () => {
    if (!selectedTemplate) return null;

    const signatureKeys = Object.keys(selectedTemplate.variables).filter(key =>
      selectedTemplate.variables[key].type === 'signature'
    );

    if (signatureKeys.length === 0) return null;

    return (
      <div className={`grid grid-cols-1 md:grid-cols-${signatureKeys.length > 1 ? signatureKeys.length : 1} gap-x-16 gap-y-12 !mt-16 not-prose`}>
        {signatureKeys.map((sigKey) => {
          const nameKey = sigKey.replace('Signature', 'Name');
          const nameConfig = selectedTemplate.variables[nameKey];
          const nameLabel = nameConfig ? (nameConfig.labelKey ? t(nameConfig.labelKey) : (nameConfig.label ? (nameConfig.label as any)[language] : '')) : '';

          const name = nameConfig ? String(document.data[nameKey] || `[${nameLabel}]`) : '';
          const signatureData = String(document.data[sigKey] || '');
          const hasSignature = signatureData.startsWith('data:image');

          return (
            <div key={sigKey} className="space-y-2 pt-4">
              <div className="text-sm">
                <span className="font-bold text-gray-500 dark:text-gray-400 uppercase text-[10px] tracking-wider">{t('documents:signatureLabels.signature')}</span>
                <div className="mt-1 h-28 flex items-center justify-center bg-white dark:bg-gray-900/50 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  {hasSignature ? (<img src={signatureData} alt="Signature" className="max-h-full max-w-full object-contain mix-blend-multiply dark:mix-blend-normal" />) : (<div className="text-gray-300 italic text-xs">{t('documents:noSignature')}</div>)}
                </div>
              </div>
              {name && (
                <div className="text-sm mt-2">
                  <span className="font-bold text-gray-500 dark:text-gray-400 uppercase text-[10px] tracking-wider">{t('documents:signatureLabels.name')}</span>
                  <p className="font-serif text-gray-900 dark:text-white text-lg">
                    {name}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderCustomSignatures = () => {
    const signatureKeys = ['partyA.signature', 'partyB.signature'];
    const hasAnySignature = signatureKeys.some(key => document.data[key]);
    if (!hasAnySignature) return null;

    return (
      <>
        <hr className="!my-12 border-gray-200 dark:border-gray-700" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 !mt-8 not-prose">
          {signatureKeys.map(key => {
            const signatureData = document.data[key] as string || '';
            if (!signatureData) return null;
            const hasSignature = signatureData.startsWith('data:image');
            const partyLabel = key.includes('partyA') ? t('documents:partyA') : t('documents:partyB');

            return (
              <div key={key}>
                <span className="font-bold text-gray-500 dark:text-gray-400 uppercase text-[10px] tracking-wider">{partyLabel} {t('documents:signatureLabels.signature')}</span>
                <div className="mt-2 h-28 flex items-center justify-center bg-white dark:bg-gray-900/50 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  {hasSignature ? (
                    <img src={signatureData} alt="Signature" className="max-h-full max-w-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </>
    )
  }

  const ActionButton = ({ onClick, icon: Icon, title, className = "" }: any) => (
    <button
      onClick={onClick}
      className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white active:scale-95 flex-shrink-0 ${className}`}
      title={title}
    >
      <Icon size={20} strokeWidth={1.5} />
    </button>
  );

  return (
    <div className="relative h-full flex flex-col" dir={i18n.dir()}>

      {/* Floating Command Dock - Uniform Professional Design */}
      <div className="sticky top-4 z-30 w-full px-4 mb-6 flex justify-center">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl p-1.5 sm:p-2 flex items-center gap-1 sm:gap-2 ring-1 ring-black/5 max-w-full overflow-x-auto scrollbar-hide">

          {/* Primary Action: Save */}
          {onSave && (
            <>
              <button
                onClick={onSave}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-bold shadow-sm active:scale-95 transition-all hover:bg-gray-800 dark:hover:bg-gray-100 flex-shrink-0"
              >
                <Save size={18} strokeWidth={2} />
                <span className="hidden sm:inline">{t('common:save')}</span>
              </button>
              <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1 sm:mx-2 flex-shrink-0"></div>
            </>
          )}

          {/* Export Group */}
          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
            <ActionButton onClick={handleExportPdf} icon={FileDown} title="PDF" className="hover:text-red-600 dark:hover:text-red-400" />
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

      <div className="flex-1 overflow-auto rounded-lg pb-8 px-2">
        <div className="border border-gray-200 dark:border-gray-700 min-h-[700px] bg-white dark:bg-gray-800 shadow-xl max-w-[210mm] mx-auto animate-fade-in flex flex-col">
          <div className="p-12 flex-1">
            <header className="flex justify-between items-start pb-8 border-b border-gray-200 dark:border-gray-700 mb-10">
              {/* Company Info */}
              <div className="flex-1">
                {companyInfo.logo ? (
                  <img src={companyInfo.logo} alt="Company Logo" className="h-16 object-contain mb-4" />
                ) : (
                  <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">{companyInfo.name}</h2>
                )}
                <div className="text-sm text-gray-500 dark:text-gray-400 space-y-0.5">
                  <p>{companyInfo.address}</p>
                  <p>{companyInfo.phone}</p>
                </div>
              </div>

              {/* Doc Date */}
              <div className="text-right rtl:text-left">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">{t('common:date')}</p>
                <p className="font-mono font-bold text-gray-900 dark:text-white">{document.data.issueDate}</p>
              </div>
            </header>

            <div className="text-center mb-12">
              <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white">
                {isCustom ? (document.data.documentTitle || `[${t('documents:documentTitle')}]`) : (selectedTemplate ? t(selectedTemplate.nameKey) : '')}
              </h1>
            </div>

            <div className="prose dark:prose-invert prose-sm max-w-none prose-p:!my-4 text-gray-800 dark:text-gray-300">
              {isCustom ? renderCustomSections() : renderContent(finalContent)}
              {isCustom ? renderCustomSignatures() : renderTemplateSignatures()}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto border-t border-gray-100 dark:border-gray-800 p-6 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">
              {t('documents:generatedVia')} &bull; {companyInfo.name}
            </p>
          </div>
        </div>
      </div>

      <EmailComposer
        isOpen={isEmailComposerOpen}
        onClose={() => setIsEmailComposerOpen(false)}
        data={{
          clientName: (document.data['recipientName'] || document.data['payerName'] || '') as string,
          subject: `${selectedTemplate ? t(selectedTemplate.nameKey) : 'Document'}`,
          details: t('documents:emailReviewDetails')
        }}
      />
    </div>
  );
};