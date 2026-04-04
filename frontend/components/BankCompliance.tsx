import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UploadCloud, CheckCircle, AlertTriangle, FileText, ChevronRight, Landmark, FileCheck, ShieldAlert, Trash2, Download, X } from 'lucide-react';
import type { Language, ComplianceCheckResult } from '../types';
import { analyzeBankCompliance } from '../services/geminiService';
import { jsPDF } from 'jspdf';

interface BankComplianceProps {
  // language prop removed as we use i18n.language
}

interface UploadedFile {
    id: string;
    name: string;
    content: string; // In a real app, this might be base64 or text content
}

export const BankCompliance: React.FC<BankComplianceProps> = () => {
  const { t, i18n } = useTranslation(['bankCompliance', 'common']);
  const language = (i18n.language || 'en') as Language;

  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<ComplianceCheckResult | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  // Add state for checklist items
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      
      const newFiles: UploadedFile[] = [];
      
      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          // Simulate reading file (in real implementation, read contents)
          newFiles.push({
              id: Date.now() + i.toString(),
              name: file.name,
              content: `[Simulated content for ${file.name}]` 
          });
      }
      
      setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
      setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const toggleChecklist = (idx: number) => {
      setCheckedItems(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const runAnalysis = async () => {
      if (uploadedFiles.length === 0) return;
      setIsChecking(true);
      
      // Combine file names/metadata for context
      const context = uploadedFiles.map(f => `File: ${f.name}`).join('\n');
      
      try {
          const analysis = await analyzeBankCompliance(context, language);
          setResult(analysis);
      } catch (error) {
          console.error(error);
      } finally {
          setIsChecking(false);
      }
  };

  const handleDownloadCreditFile = () => {
      const doc = new jsPDF();
      const margin = 20;
      let y = 20;

      doc.setFontSize(18);
      doc.text(t('bankCompliance:reportTitle'), margin, y);
      y += 10;
      
      doc.setFontSize(12);
      doc.text(`${t('bankCompliance:date')}: ${new Date().toLocaleDateString()}`, margin, y);
      y += 15;

      if (result) {
          doc.setFontSize(14);
          doc.setTextColor(0, 100, 0);
          doc.text(`${t('bankCompliance:score')}: ${result.score}%`, margin, y);
          y += 10;
          
          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);
          doc.text(t('bankCompliance:issues'), margin, y);
          y += 7;
          result.issues.forEach(issue => {
              doc.setFontSize(10);
              doc.text(`- ${issue}`, margin + 5, y);
              y += 6;
          });
          y += 5;

          doc.setFontSize(12);
          doc.text(t('bankCompliance:recommendations'), margin, y);
          y += 7;
          result.recommendations.forEach(rec => {
              doc.setFontSize(10);
              doc.text(`- ${rec}`, margin + 5, y);
              y += 6;
          });
          y += 10;
      }

      doc.setFontSize(14);
      doc.text(t('bankCompliance:uploaded'), margin, y);
      y += 10;
      uploadedFiles.forEach(file => {
          doc.setFontSize(10);
          doc.text(`[x] ${file.name}`, margin + 5, y);
          y += 6;
      });
      
      y += 10;
      doc.setFontSize(14);
      doc.text(t('bankCompliance:creditPrep'), margin, y);
      y += 10;
      (t('bankCompliance:checklist', { returnObjects: true }) as string[]).forEach((item, i) => {
           const isChecked = checkedItems[i] ? '[x]' : '[ ]';
           doc.setFontSize(10);
           doc.text(`${isChecked} ${item}`, margin + 5, y);
           y += 6;
      });

      doc.save(t('bankCompliance:fileName') || 'Credit_File_Report.pdf');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in space-y-8" dir={i18n.dir()}>
        <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                <Landmark size={32} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('bankCompliance:title')}</h2>
                <p className="text-sm text-gray-500">{t('bankCompliance:subtitle')}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Scanner */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all text-center relative group overflow-hidden">
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleFileUpload} multiple />
                    <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 transition-transform group-hover:scale-110">
                        <UploadCloud size={32} />
                    </div>
                    <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-2">{t('bankCompliance:uploadBox')}</h3>
                    <p className="text-xs text-gray-400 font-medium">{t('bankCompliance:uploadTypes')}</p>
                </div>

                {/* File List */}
                {uploadedFiles.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 px-1">{t('bankCompliance:uploaded')} ({uploadedFiles.length})</h4>
                        <div className="space-y-2">
                            {uploadedFiles.map(file => (
                                <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl group transition-all hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <FileText size={18} className="text-emerald-600 flex-shrink-0"/>
                                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                                    </div>
                                    <button onClick={() => removeFile(file.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" title={t('common:delete')}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button 
                            onClick={runAnalysis} 
                            disabled={isChecking}
                            className="w-full mt-6 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 dark:shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isChecking ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : null}
                            {t('bankCompliance:checkBtn')}
                        </button>
                    </div>
                )}

                {isChecking && (
                    <div className="p-12 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center animate-pulse">
                        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-4">
                            <FileCheck size={32} className="text-emerald-500 animate-bounce"/>
                        </div>
                        <p className="font-bold text-gray-800 dark:text-gray-200 text-lg">{t('bankCompliance:checking')}</p>
                        <p className="text-sm text-gray-500 mt-2">{t('legal:aiAnalyzing') || t('common:aiAnalyzing')}</p>
                    </div>
                )}

                {!isChecking && result && (
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden animate-fade-up">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-emerald-50/50 dark:bg-emerald-900/10 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-emerald-800 dark:text-emerald-300 uppercase tracking-widest">{t('bankCompliance:score')}</h3>
                            <div className="flex items-center gap-2">
                                <span className={`text-5xl font-black tracking-tighter ${result.score > 80 ? 'text-emerald-600' : result.score > 50 ? 'text-amber-500' : 'text-red-500'}`}>{result.score}%</span>
                            </div>
                        </div>
                        
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <AlertTriangle size={14} className="text-red-500" /> {t('bankCompliance:issues')}
                                </h4>
                                <ul className="space-y-3">
                                    {result.issues?.map((issue, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
                                            <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" /> {issue}
                                        </li>
                                    ))}
                                    {result.issues.length === 0 && <li className="text-sm text-gray-400 italic font-medium">{t('bankCompliance:noIssues')}</li>}
                                </ul>
                            </div>
                            
                            <div>
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <FileText size={14} className="text-emerald-600" /> {t('bankCompliance:missing')}
                                </h4>
                                <ul className="space-y-2">
                                    {result.missingDocuments?.map((doc, i) => (
                                        <li key={i} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 font-bold bg-gray-50 dark:bg-gray-700/30 p-2 rounded-lg">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> {doc}
                                        </li>
                                    ))}
                                    {result.missingDocuments.length === 0 && <li className="text-sm text-gray-400 italic font-medium">{t('bankCompliance:noMissing')}</li>}
                                </ul>
                            </div>

                            <div className="md:col-span-2">
                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <CheckCircle size={14} className="text-blue-600" /> {t('bankCompliance:recommendations')}
                                </h4>
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm">
                                    <ul className="space-y-3">
                                        {result.recommendations?.map((rec, i) => (
                                            <li key={i} className="flex items-start gap-3 text-sm font-bold text-blue-800 dark:text-blue-200">
                                                <ChevronRight size={18} className={`mt-0.5 flex-shrink-0 ${i18n.dir() === 'rtl' ? 'rotate-180' : ''}`} /> {rec}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Right: Credit Prep Checklist */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 h-fit sticky top-24">
                <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2">{t('bankCompliance:creditPrep')}</h3>
                <p className="text-sm text-gray-500 mb-8 font-medium">{t('bankCompliance:creditDesc')}</p>
                
                <div className="space-y-4">
                    {(t('bankCompliance:checklist', { returnObjects: true }) as string[]).map((item, idx) => (
                        <label key={idx} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-all group select-none border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900/30">
                            <div className="relative flex items-center justify-center">
                                <input 
                                    type="checkbox" 
                                    className="w-6 h-6 rounded-lg border-gray-300 text-emerald-600 focus:ring-emerald-500 transition-all cursor-pointer" 
                                    checked={!!checkedItems[idx]}
                                    onChange={() => toggleChecklist(idx)}
                                />
                            </div>
                            <span className={`text-sm font-bold transition-all ${checkedItems[idx] ? 'text-emerald-600 line-through opacity-70' : 'text-gray-700 dark:text-gray-300 group-hover:text-emerald-600'}`}>{item}</span>
                        </label>
                    ))}
                </div>
                
                <button 
                    onClick={handleDownloadCreditFile}
                    className="w-full mt-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-gray-900 font-black rounded-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200 dark:shadow-none"
                >
                    <Download size={20}/> {t('bankCompliance:downloadReport')}
                </button>
            </div>
        </div>
    </div>
  );
};