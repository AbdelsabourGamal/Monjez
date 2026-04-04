import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { DbCompany, Language, CompanyInfo, Attachment } from '../types';
import { Plus, Trash2, Edit2, Save, Check, Building2, MapPin, Phone, UploadCloud, File, Sparkles, X, GitBranch, GitMerge, Image as ImageIcon } from 'lucide-react';
import { analyzeDocument } from '../services/geminiService';

interface CompanyManagerProps {
  companies: DbCompany[];
  setCompanies: React.Dispatch<React.SetStateAction<DbCompany[]>>;
  activeCompany: CompanyInfo;
  setActiveCompany: React.Dispatch<React.SetStateAction<CompanyInfo>>;
  notify: (msg: string, type: 'success' | 'error') => void;
}

export const CompanyManager: React.FC<CompanyManagerProps> = ({ companies, setCompanies, activeCompany, setActiveCompany, notify }) => {
    const { t, i18n } = useTranslation(['companies', 'common']);

    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    const initialForm: Omit<DbCompany, 'id'> = { 
        name: '', 
        address: '', 
        phone: '', 
        licenseNumber: '', 
        logo: '', 
        attachments: [],
        type: 'parent',
        parentId: ''
    };
    const [editForm, setEditForm] = useState<Omit<DbCompany, 'id'>>(initialForm);

    const handleSave = () => {
        if (!editForm.name) {
            notify(t('companies:nameRequired'), 'error');
            return;
        }
        if (editForm.type === 'branch' && !editForm.parentId) {
            notify(t('companies:parentRequired'), 'error');
            return;
        }

        if (isEditing) {
            setCompanies(prev => prev.map(c => c.id === isEditing ? { ...editForm, id: isEditing } : c));
            notify(t('companies:updated'), 'success');
            
            if (activeCompany.name === companies.find(c => c.id === isEditing)?.name) {
                setActiveCompany({ name: editForm.name, address: editForm.address, phone: editForm.phone, logo: editForm.logo });
            }
            setIsEditing(null);
        } else {
            setCompanies(prev => [...prev, { ...editForm, id: Date.now().toString() }]);
            notify(t('companies:added'), 'success');
            setIsAdding(false);
        }
        setEditForm(initialForm);
    };

    const startEdit = (comp: DbCompany) => {
        setEditForm({ 
            name: comp.name, 
            address: comp.address, 
            phone: comp.phone, 
            licenseNumber: comp.licenseNumber,
            logo: comp.logo, 
            attachments: comp.attachments || [],
            type: comp.type || 'parent',
            parentId: comp.parentId || ''
        });
        setIsEditing(comp.id);
        setIsAdding(false);
    };

    const handleDelete = (id: string) => {
        if (confirm(t('companies:confirmDelete'))) {
            // Delete the company and any branches linked to it
            setCompanies(prev => prev.filter(c => c.id !== id && c.parentId !== id));
            notify(t('common:deleted'), 'success');
        }
    };

    const handleActivate = (comp: DbCompany) => {
        setActiveCompany({
            name: comp.name,
            address: comp.address,
            phone: comp.phone,
            logo: comp.logo
        });
        notify(t('companies:activated'), 'success');
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setEditForm(prev => ({ ...prev, logo: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    // --- Attachment Logic ---
    const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async () => {
            const dataUrl = reader.result as string;
            
            const newAttachment: Attachment = {
                id: Date.now().toString(),
                name: file.name,
                type: 'other',
                dataUrl: dataUrl,
                uploadedAt: new Date().toISOString()
            };
            
            setEditForm(prev => ({
                ...prev,
                attachments: [...(prev.attachments || []), newAttachment]
            }));

            if (confirm(t('companies:extractConfirm'))) {
                setIsAnalyzing(true);
                try {
                    const extracted = await analyzeDocument(dataUrl);
                    setEditForm(prev => ({
                        ...prev,
                        name: extracted.name || prev.name,
                        licenseNumber: extracted.licenseNumber || prev.licenseNumber,
                        address: extracted.address || prev.address,
                        phone: extracted.phone || prev.phone
                    }));
                    notify(t('companies:extractSuccess'), 'success');
                } catch (error) {
                    console.error(error);
                    notify(t('companies:extractFailed'), 'error');
                } finally {
                    setIsAnalyzing(false);
                }
            }
        };
        reader.readAsDataURL(file);
    };

    const removeAttachment = (attachmentId: string) => {
        setEditForm(prev => ({
            ...prev,
            attachments: prev.attachments?.filter(a => a.id !== attachmentId)
        }));
    };

    // Filter parent companies for the dropdown
    const parentCompanies = companies.filter(c => !c.type || c.type === 'parent');

    // Organize list hierarchy
    const organizedCompanies = parentCompanies.map(parent => ({
        ...parent,
        branches: companies.filter(c => c.parentId === parent.id)
    }));

    const CompanyCard: React.FC<{ comp: DbCompany, isBranch?: boolean }> = ({ comp, isBranch = false }) => {
        const isActive = activeCompany.name === comp.name && activeCompany.phone === comp.phone;
        return (
            <div className={`bg-white dark:bg-gray-800 rounded-xl border p-5 relative transition-all ${isActive ? 'border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/30 shadow-md' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'} ${isBranch ? 'ml-8 rtl:mr-8 rtl:ml-0 mt-3 border-l-4 rtl:border-l rtl:border-r-4 border-l-gray-300 rtl:border-r-gray-300' : 'mb-3'}`}>
                {isBranch && (
                    <div className="absolute -left-4 rtl:-right-4 top-1/2 w-4 h-0.5 bg-gray-300"></div>
                )}
                {isActive && (
                    <div className={`absolute top-4 ${i18n.dir() === 'rtl' ? 'left-4' : 'right-4'} bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1`}>
                        <Check size={10} /> {t('companies:active')}
                    </div>
                )}
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {comp.logo ? <img src={comp.logo} className="w-full h-full object-contain" alt={comp.name}/> : (isBranch ? <GitBranch className="text-gray-400" size={20}/> : <Building2 className="text-gray-400" size={20} />)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">{comp.name}</h3>
                            {isBranch && <span className="px-1.5 py-0.5 rounded text-[9px] bg-gray-100 dark:bg-gray-700 text-gray-500">{t('companies:branch')}</span>}
                        </div>
                        <div className="mt-1 space-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-2 truncate"><MapPin size={12} className="flex-shrink-0"/> {comp.address}</div>
                            {comp.phone && <div className="flex items-center gap-2"><Phone size={12} className="flex-shrink-0"/> {comp.phone}</div>}
                            {comp.attachments && comp.attachments.length > 0 && (
                                <div className="flex items-center gap-1 text-blue-600 text-[10px] font-medium pt-1">
                                    <File size={10}/> {comp.attachments.length}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="mt-4 flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                    {!isActive && (
                        <button onClick={() => handleActivate(comp)} className="flex-1 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-lg transition">
                            {t('companies:activate')}
                        </button>
                    )}
                    <button onClick={() => startEdit(comp)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition" title={t('common:edit')}><Edit2 size={16}/></button>
                    <button onClick={() => handleDelete(comp.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition" title={t('common:delete')}><Trash2 size={16}/></button>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 max-w-5xl mx-auto animate-fade-in" dir={i18n.dir()}>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('companies:title')}</h2>
                    <p className="text-sm text-gray-500 mt-1">{t('companies:subtitle')}</p>
                </div>
                 <button 
                    onClick={() => { setIsAdding(true); setIsEditing(null); setEditForm(initialForm); }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-bold shadow-md shadow-blue-200 dark:shadow-none"
                >
                    <Plus size={18} /> {t('companies:add')}
                </button>
            </div>

            {(isAdding || isEditing) && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-blue-100 dark:border-gray-700 mb-8 animate-in slide-in-from-top-4 relative z-20">
                     <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">{isEditing ? t('companies:editProfile') : t('companies:add')}</h3>
                     
                     {/* Entity Type Selector */}
                     <div className="flex gap-4 mb-6 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg w-fit">
                        <button 
                            onClick={() => setEditForm({...editForm, type: 'parent', parentId: ''})}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${editForm.type !== 'branch' ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {t('companies:parent')}
                        </button>
                        <button 
                            onClick={() => setEditForm({...editForm, type: 'branch'})}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${editForm.type === 'branch' ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {t('companies:branch')}
                        </button>
                     </div>

                     <div className="flex flex-col md:flex-row gap-6">
                         {/* Logo Upload */}
                         <div className="w-full md:w-48 flex-shrink-0">
                            <label className="block text-xs font-medium mb-2 text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('companies:logo')}</label>
                            <div className="w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center overflow-hidden relative bg-gray-50 dark:bg-gray-900 hover:border-blue-400 transition-colors cursor-pointer">
                                {editForm.logo ? (
                                    <img src={editForm.logo} className="w-full h-full object-contain" alt={t('companies:logo')} />
                                ) : (
                                    <ImageIcon className="text-gray-300" size={32} />
                                )}
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleLogoUpload} accept="image/*" />
                            </div>
                         </div>
                         
                         {/* Inputs */}
                         <div className="flex-1">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {editForm.type === 'branch' && (
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('companies:parentCompany')} *</label>
                                        <div className="relative">
                                            <GitMerge size={16} className={`absolute top-1/2 -translate-y-1/2 ${i18n.dir() === 'rtl' ? 'right-3' : 'left-3'} text-gray-400`}/>
                                            <select 
                                                className={`w-full p-2.5 ${i18n.dir() === 'rtl' ? 'pr-10' : 'pl-10'} border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-medium`}
                                                value={editForm.parentId}
                                                onChange={e => setEditForm({...editForm, parentId: e.target.value})}
                                            >
                                                <option value="" disabled>{t('companies:selectParent')}</option>
                                                {parentCompanies.filter(p => p.id !== isEditing).map(p => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('companies:name')} *</label>
                                    <div className="relative">
                                        <input className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                                        {isAnalyzing && <Sparkles size={16} className={`absolute top-1/2 -translate-y-1/2 ${i18n.dir() === 'rtl' ? 'left-3' : 'right-3'} text-purple-500 animate-pulse`} />}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('companies:phone')}</label>
                                    <input className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('companies:address')}</label>
                                    <input className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('companies:license')}</label>
                                    <input className="w-full p-2.5 border rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 font-mono" value={editForm.licenseNumber} onChange={e => setEditForm({...editForm, licenseNumber: e.target.value})} />
                                </div>
                             </div>

                             {/* Attachments Section */}
                             <div className="mt-6 border-t border-gray-100 dark:border-gray-700 pt-4">
                                 <div className="flex justify-between items-center mb-3">
                                     <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-widest">{t('companies:attachments')}</h4>
                                     <div className="relative">
                                        <button type="button" className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition font-bold">
                                            {isAnalyzing ? t('companies:extracting') : <><UploadCloud size={14}/> {t('companies:uploadDoc')}</>}
                                        </button>
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAttachmentUpload} accept="image/*" disabled={isAnalyzing} />
                                     </div>
                                 </div>
                                 
                                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                     {editForm.attachments?.map((att) => (
                                         <div key={att.id} className="group relative border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-900/50">
                                             <div className="h-20 bg-white dark:bg-gray-800 rounded-md flex items-center justify-center mb-2 overflow-hidden">
                                                 <img src={att.dataUrl} className="w-full h-full object-cover" alt={att.name}/>
                                             </div>
                                             <p className="text-[10px] truncate text-gray-500 text-center">{att.name}</p>
                                             <button type="button" onClick={() => removeAttachment(att.id)} className="absolute top-1 right-1 bg-red-100 text-red-500 p-1 rounded-full opacity-0 group-hover:opacity-100 transition shadow-sm"><Trash2 size={12}/></button>
                                         </div>
                                     ))}
                                 </div>
                             </div>

                         </div>
                     </div>
                     <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 pt-4 mt-4">
                        <button onClick={() => { setIsAdding(false); setIsEditing(null); }} className="px-5 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">{t('common:cancel')}</button>
                        <button onClick={handleSave} disabled={isAnalyzing} className="px-5 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow-sm disabled:opacity-50"><Save size={16}/> {t('common:save')}</button>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {organizedCompanies.map(parent => (
                    <div key={parent.id} className="space-y-2">
                        {/* Parent Card */}
                        <CompanyCard comp={parent} />
                        
                        {/* Branches */}
                        {parent.branches.length > 0 && (
                            <div className="relative">
                                {parent.branches.map(branch => (
                                    <CompanyCard key={branch.id} comp={branch} isBranch={true} />
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                
                {companies.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/50">
                        <Building2 size={48} className="mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium">{t('companies:noCompanies')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};
