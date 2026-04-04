import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Language, CompanyInfo, LegalTask, SavedItem, ContractAuditResult } from '../types';
import { Shield, AlertTriangle, CheckCircle, Clock, Plus, Trash2, FileText, Scale, Gavel, Calendar, AlertCircle, ArrowRight, ShieldCheck, ShieldAlert, X, Lock, ScanLine, Bot } from 'lucide-react';
import { auditExternalContract } from '../services/geminiService';

interface LegalHubProps {
  companyInfo: CompanyInfo;
  savedItems: SavedItem[];
  notify: (msg: string, type: 'success' | 'error') => void;
  setCurrentView: (view: string) => void;
}

export const LegalHub: React.FC<LegalHubProps> = ({ companyInfo, savedItems, notify, setCurrentView }) => {
  const { t, i18n } = useTranslation(['legal', 'common']);

  const [tasks, setTasks] = useState<LegalTask[]>([]);
  const [newTask, setNewTask] = useState<Partial<LegalTask>>({ type: 'other', status: 'pending' });
  const [showTaskForm, setShowTaskForm] = useState(false);
  
  // Audit State
  const [auditResult, setAuditResult] = useState<ContractAuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditFile, setAuditFile] = useState<{ name: string, data: string, type: string } | null>(null);

  const auditInputRef = React.useRef<HTMLInputElement>(null);

  // Load tasks from local storage
  useEffect(() => {
      const stored = localStorage.getItem('mashhorquote-legal-tasks');
      if (stored) {
          try {
              setTasks(JSON.parse(stored));
          } catch (e) {
              console.error("Failed to parse legal tasks", e);
          }
      }
  }, []);

  useEffect(() => {
      localStorage.setItem('mashhorquote-legal-tasks', JSON.stringify(tasks));
  }, [tasks]);

  // --- Risk Calculation Logic ---
  const riskMetrics = useMemo(() => {
      let score = 100;
      const risks: { message: string, actionLabel?: string, targetView?: string }[] = [];

      // 1. License Check
      if (!companyInfo.licenseNumber) {
          score -= 20;
          risks.push({ 
              message: t('legal:missingLicense'),
              actionLabel: t('legal:addLicense'),
              targetView: 'settings'
          });
      }

      // 2. Documents Check
      if (!companyInfo.documents || companyInfo.documents.length === 0) {
          score -= 10;
          risks.push({
              message: t('legal:noOfficialDocs'),
              actionLabel: t('legal:uploadDocs'),
              targetView: 'settings'
          });
      }

      // 3. Expiring Contracts Check
      const expiringContracts = savedItems.filter(i => {
          if (i.type !== 'contract') return false;
          if (!i.expiryDate) return false;
          const diffTime = new Date(i.expiryDate).getTime() - new Date().getTime();
          const diffDays = diffTime / (1000 * 3600 * 24);
          return diffDays > 0 && diffDays < 30;
      });

      if (expiringContracts.length > 0) {
          score -= (expiringContracts.length * 5);
          risks.push({
              message: t('legal:contractsExpiring', { count: expiringContracts.length }),
              actionLabel: t('legal:viewContracts'),
              targetView: 'dashboard-history'
          });
      }

      // 4. Pending Urgent Tasks
      const urgentTasks = tasks.filter(task => task.status === 'urgent' || (new Date(task.dueDate) < new Date() && task.status !== 'completed'));
      if (urgentTasks.length > 0) {
          score -= (urgentTasks.length * 10);
          risks.push({
              message: t('legal:urgentOverdueTasks'),
          });
      }

      return { score: Math.max(0, score), risks };
  }, [companyInfo, savedItems, tasks, t]);

  const handleAddTask = () => {
      if (!newTask.title || !newTask.dueDate) return;
      const task: LegalTask = {
          id: Date.now().toString(),
          title: newTask.title,
          type: newTask.type as any,
          status: newTask.status as any,
          dueDate: newTask.dueDate,
          description: newTask.description
      };
      setTasks(prev => [task, ...prev]);
      setShowTaskForm(false);
      setNewTask({ type: 'other', status: 'pending' });
      notify(t('legal:taskAdded'), 'success');
  };

  const deleteTask = (id: string) => {
      setTasks(prev => prev.filter(t => t.id !== id));
  };

  const toggleTaskStatus = (id: string) => {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t));
  };

  // --- Audit Logic ---
  const handleAuditFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
          const base64 = reader.result as string;
          setAuditFile({
              name: file.name,
              data: base64.split(',')[1],
              type: file.type
          });
          setAuditResult(null); // Reset previous result
      };
      reader.readAsDataURL(file);
  };

  const handleAuditSubmit = async () => {
      try {
          const result = await auditExternalContract(auditFile.data, auditFile.type, i18n.language as Language);
          setAuditResult(result);
      } catch (error) {
          console.error(error);
          notify(t('legal:auditFailed'), 'error');
      } finally {
          setIsAuditing(false);
      }
  };

  // --- Style Helpers ---
  const getTheme = (score: number) => {
      if (score >= 80) return { color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200', icon: ShieldCheck, label: t('legal:lowRisk') };
      if (score >= 50) return { color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200', icon: AlertTriangle, label: t('legal:medRisk') };
      return { color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200', icon: ShieldAlert, label: t('legal:highRisk') };
  };

  const theme = getTheme(riskMetrics.score);
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * riskMetrics.score) / 100;

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in space-y-8" dir={i18n.dir()}>
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-900/20">
                  <Scale size={28} />
              </div>
              <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('legal:title')}</h2>
                  <p className="text-sm text-gray-500">{t('legal:dashboardDesc')}</p>
              </div>
          </div>
          {/* Shortcut to QanoonAI */}
          <button 
            onClick={() => setCurrentView('qanoon-ai')}
            className="hidden md:flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
          >
              <Bot size={24} />
              <div className="text-left rtl:text-right">
                  <p className="text-[10px] opacity-90 uppercase tracking-wider">{t('legal:aiAssistant')}</p>
                  <p className="leading-none text-sm">{t('legal:openQanoon')}</p>
              </div>
          </button>
      </div>

      {/* QanoonAI Promo Card (Mobile/Tablet friendly) */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl border border-slate-700 md:hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
          <div className="relative z-10 flex items-center justify-between gap-4">
              <div>
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-1">
                      <Bot className="text-amber-400" size={20}/> {t('legal:qanoonAiTitle')}
                  </h3>
                  <p className="text-xs text-slate-300 mb-4">{t('legal:qanoonAiDesc')}</p>
                  <button onClick={() => setCurrentView('qanoon-ai')} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition">
                      {t('legal:openQanoon')}
                  </button>
              </div>
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 flex-shrink-0">
                  <Scale size={32} className="text-amber-400" />
              </div>
          </div>
      </div>

      {/* Risk Score & Risks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Score Card */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                  <Shield size={120} />
              </div>
              
              <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-6 z-10">{t('legal:riskScore')}</h3>
              
              <div className="relative w-48 h-48 flex items-center justify-center z-10">
                  <svg className="w-full h-full transform -rotate-90 drop-shadow-xl">
                      <circle cx="50%" cy="50%" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-100 dark:text-gray-700" />
                      <circle cx="50%" cy="50%" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={`${theme.color} transition-all duration-1000 ease-out`} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-5xl font-black tracking-tighter ${theme.color}`}>{riskMetrics.score}</span>
                      <span className="text-xs text-gray-400 font-bold uppercase mt-1 tracking-wide">/ 100</span>
                  </div>
              </div>

              <div className={`mt-8 px-6 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-sm transition-all ${theme.bg} ${theme.color} ${theme.border} border`}>
                  <theme.icon size={18} strokeWidth={2.5} />
                  <span>{theme.label}</span>
              </div>
          </div>

          {/* Risk List */}
          <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <AlertTriangle size={20} className="text-amber-500" /> {t('legal:currentRiskAnalysis')}
                  </h3>
                  <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-500">{t('legal:issuesCount', { count: riskMetrics.risks.length })}</span>
              </div>
              
              <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {riskMetrics.risks.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-dashed border-emerald-200 dark:border-emerald-800">
                          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                              <CheckCircle size={32} />
                          </div>
                          <h4 className="font-bold text-emerald-800 dark:text-emerald-300 mb-1">{t('legal:statusExcellent')}</h4>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">{t('legal:noRisks')}</p>
                      </div>
                  ) : (
                      riskMetrics.risks.map((risk, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-4 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl hover:bg-red-100/50 transition-colors group">
                               <div className="flex items-center gap-3">
                                   <div className="p-2 bg-white dark:bg-gray-800 rounded-lg text-red-500 shadow-sm">
                                       <AlertCircle size={20} />
                                   </div>
                                   <span className="text-sm font-medium text-red-700 dark:text-red-300">{risk.message}</span>
                               </div>
                               {risk.actionLabel && risk.targetView && (
                                   <button 
                                     onClick={() => setCurrentView(risk.targetView!)}
                                     className="flex items-center gap-1 px-4 py-2 bg-white dark:bg-gray-800 text-xs font-bold text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-600 hover:text-white hover:border-red-600 dark:hover:bg-red-900 transition-all shadow-sm whitespace-nowrap"
                                   >
                                       {risk.actionLabel} <ArrowRight size={14} className="rtl:rotate-180"/>
                                   </button>
                               )}
                          </div>
                      ))
                  )}
              </div>
          </div>
      </div>

      {/* External Contract Auditor Section */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-slate-800 to-slate-900 text-white flex items-center justify-between">
              <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                      <ShieldCheck className="text-emerald-400" size={24} />
                      {t('legal:contractAuditor')}
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">{t('legal:auditDesc')}</p>
              </div>
              <div className="bg-white/10 p-2 rounded-lg">
                  <FileText size={24} className="text-blue-400" />
              </div>
          </div>

          <div className="p-8">
              {!auditResult && !isAuditing && (
                  <div className="flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-10 bg-gray-50 dark:bg-gray-900/50 hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors cursor-pointer relative group" onClick={() => auditInputRef.current?.click()}>
                      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <ScanLine size={32} />
                      </div>
                      <h4 className="font-bold text-gray-700 dark:text-gray-300 mb-2">{auditFile ? auditFile.name : t('legal:uploadContract')}</h4>
                      <p className="text-xs text-gray-500">{t('legal:uploadLimits')}</p>
                      <input 
                          type="file" 
                          ref={auditInputRef} 
                          className="hidden" 
                          accept=".pdf,image/*" 
                          onChange={handleAuditFileUpload} 
                      />
                      {auditFile && (
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleAuditSubmit(); }}
                            className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-all font-bold"
                          >
                              {t('legal:auditBtn')}
                          </button>
                      )}
                  </div>
              )}

              {isAuditing && (
                  <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-6"></div>
                      <h4 className="font-bold text-gray-800 dark:text-gray-200 text-lg animate-pulse">{t('legal:auditing')}</h4>
                      <p className="text-sm text-gray-500 mt-2">{t('legal:aiAnalyzing')}</p>
                  </div>
              )}

              {auditResult && (
                  <div className="animate-fade-up">
                      <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                          <h4 className="font-bold text-xl text-gray-900 dark:text-white">{t('legal:auditReport')}</h4>
                          <button onClick={() => { setAuditResult(null); setAuditFile(null); }} className="text-sm text-blue-600 font-bold hover:underline">{t('legal:auditAnother')}</button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                          {/* Score */}
                          <div className="lg:col-span-1 flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-700">
                              <div className="relative w-32 h-32 flex items-center justify-center">
                                  <svg className="w-full h-full transform -rotate-90">
                                      <circle cx="50%" cy="50%" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-200 dark:text-gray-700" />
                                      <circle 
                                        cx="50%" cy="50%" r="60" stroke="currentColor" strokeWidth="8" fill="transparent" 
                                        strokeDasharray={2 * Math.PI * 60} 
                                        strokeDashoffset={2 * Math.PI * 60 - (2 * Math.PI * 60 * auditResult.score) / 100} 
                                        strokeLinecap="round" 
                                        className={`${auditResult.score > 75 ? 'text-emerald-500' : auditResult.score > 50 ? 'text-amber-500' : 'text-red-500'}`} 
                                      />
                                  </svg>
                                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                                      <span className="text-3xl font-black text-gray-800 dark:text-white">{auditResult.score}</span>
                                  </div>
                              </div>
                              <span className="text-sm font-bold text-gray-500 mt-4 uppercase tracking-wide">{t('legal:safetyScore')}</span>
                          </div>

                          {/* Risks & Loopholes */}
                          <div className="lg:col-span-3 space-y-6">
                              {/* Summary */}
                              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl">
                                  <h5 className="font-bold text-blue-800 dark:text-blue-300 mb-2 text-sm">{t('legal:auditSummary')}</h5>
                                  <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed font-medium">{auditResult.summary}</p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div>
                                      <h5 className="font-bold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                                          <ShieldAlert size={16} /> {t('legal:redFlags')}
                                      </h5>
                                      <ul className="space-y-2">
                                          {auditResult.risks.map((risk, idx) => (
                                              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 bg-red-50 dark:bg-red-900/10 p-2.5 rounded-lg border border-red-100 dark:border-red-900/30">
                                                  <X size={14} className="text-red-500 mt-0.5 flex-shrink-0" /> {risk}
                                              </li>
                                          ))}
                                      </ul>
                                  </div>
                                  <div>
                                      <h5 className="font-bold text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                                          <Lock size={16} /> {t('legal:loopholes')}
                                      </h5>
                                      <ul className="space-y-2">
                                          {auditResult.loopholes.map((loop, idx) => (
                                              <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 bg-amber-50 dark:bg-amber-900/10 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30">
                                                  <AlertCircle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" /> {loop}
                                              </li>
                                          ))}
                                      </ul>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </div>

      {/* Task Manager */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Gavel size={20} className="text-blue-600" /> {t('legal:tasks')}
              </h3>
              <button onClick={() => setShowTaskForm(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition shadow-md shadow-blue-200 dark:shadow-none">
                  <Plus size={16} /> {t('legal:addTask')}
              </button>
          </div>

          {showTaskForm && (
              <div className="p-6 bg-blue-50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-800 animate-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-widest">{t('legal:taskTitle')}</label>
                          <input type="text" value={newTask.title || ''} onChange={e => setNewTask({...newTask, title: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500 font-medium" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-widest">{t('legal:type')}</label>
                          <select value={newTask.type} onChange={e => setNewTask({...newTask, type: e.target.value as any})} className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500 font-medium font-bold">
                              {Object.keys(t('legal:types', { returnObjects: true })).map(key => (
                                  <option key={key} value={key}>{t(`legal:types.${key}`)}</option>
                              ))}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-widest">{t('legal:dueDate')}</label>
                          <input type="date" value={newTask.dueDate || ''} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500 font-medium font-bold" />
                      </div>
                  </div>
                  <div className="flex justify-end gap-2">
                      <button onClick={() => setShowTaskForm(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-bold">{t('legal:cancel')}</button>
                      <button onClick={handleAddTask} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm">{t('legal:save')}</button>
                  </div>
              </div>
          )}

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {tasks.length === 0 ? (
                  <div className="p-12 text-center text-gray-400">
                      <FileText size={48} className="mx-auto mb-3 opacity-20" />
                      <p className="font-medium text-sm">{t('legal:noTasks')}</p>
                  </div>
              ) : (
                  tasks.map(task => (
                      <div key={task.id} className={`p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition group ${task.status === 'completed' ? 'opacity-50' : ''}`}>
                          <button onClick={() => toggleTaskStatus(task.id)} className={`p-2 rounded-full border transition-all ${task.status === 'completed' ? 'bg-emerald-100 border-emerald-200 text-emerald-600' : 'border-gray-300 text-transparent hover:border-blue-400'}`}>
                              <CheckCircle size={16} />
                          </button>
                          <div className="flex-1">
                              <h4 className={`font-bold text-gray-900 dark:text-white ${task.status === 'completed' ? 'line-through' : ''}`}>{task.title}</h4>
                              <div className="flex gap-3 text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                                  <span className="flex items-center gap-1 font-medium"><Calendar size={12} /> {task.dueDate}</span>
                                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full font-bold">{t(`legal:types.${task.type}`)}</span>
                                  {task.status === 'urgent' && <span className="text-red-500 font-black flex items-center gap-1"><AlertTriangle size={10}/> {t('legal:statuses.urgent')}</span>}
                              </div>
                          </div>
                          <button onClick={() => deleteTask(task.id)} className="p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition shadow-sm" title={t('common:delete')}>
                              <Trash2 size={18} />
                          </button>
                      </div>
                  ))
              )}
          </div>
      </div>
    </div>
  );
};
