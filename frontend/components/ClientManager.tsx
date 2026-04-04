import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { DbClient, Language, QuoteCurrency, Attachment, CivilIdEntry } from '../types';
import { Plus, Trash2, Edit2, Save, User, MapPin, Phone, Mail, Download, CheckSquare, Square, Search, UploadCloud, FileText, X, Landmark } from 'lucide-react';

interface ClientManagerProps {
  clients: DbClient[];
  setClients: React.Dispatch<React.SetStateAction<DbClient[]>>;
  notify: (msg: string, type: 'success' | 'error') => void;
}

export const ClientManager: React.FC<ClientManagerProps> = ({ clients, setClients, notify }) => {
  const { t, i18n } = useTranslation(['clients', 'common']);

  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Omit<DbClient, 'id'>>({ 
      name: '', 
      address: '', 
      phone: '', 
      email: '', 
      currency: 'KWD', 
      attachments: [],
      civilIds: []
  });
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter logic
  const filteredClients = useMemo(() => {
    return clients.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.phone.includes(searchTerm) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.civilIds && c.civilIds.some(cid => cid.value.includes(searchTerm)))
    );
  }, [clients, searchTerm]);

  // Selection Logic
  const handleSelectAll = () => {
    if (selectedIds.size === filteredClients.length && filteredClients.length > 0) {
        setSelectedIds(new Set());
    } else {
        setSelectedIds(new Set(filteredClients.map(c => c.id)));
    }
  };

  const handleSelectOne = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const handleSave = () => {
    if (!editForm.name) {
        notify(t('clients:nameRequired'), 'error');
        return;
    }
    
    if (isEditing) {
      setClients(prev => prev.map(c => c.id === isEditing ? { ...editForm, id: isEditing } : c));
      notify(t('clients:updated'), 'success');
      setIsEditing(null);
    } else {
      setClients(prev => [...prev, { ...editForm, id: Date.now().toString() }]);
      notify(t('clients:added'), 'success');
      setIsAdding(false);
    }
    setEditForm({ name: '', address: '', phone: '', email: '', currency: 'KWD', attachments: [], civilIds: [] });
  };

  const startEdit = (client: DbClient) => {
    setEditForm({ 
        name: client.name, 
        address: client.address, 
        phone: client.phone, 
        email: client.email,
        currency: client.currency || 'KWD',
        attachments: client.attachments || [],
        civilIds: client.civilIds || []
    });
    setIsEditing(client.id);
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm(t('clients:confirmDelete'))) {
      setClients(prev => prev.filter(c => c.id !== id));
      notify(t('clients:deleted'), 'success');
      if (selectedIds.has(id)) {
          const newSet = new Set(selectedIds);
          newSet.delete(id);
          setSelectedIds(newSet);
      }
    }
  };

  const handleBulkDelete = () => {
      if (confirm(t('clients:confirmBulkDelete', { count: selectedIds.size }))) {
          setClients(prev => prev.filter(c => !selectedIds.has(c.id)));
          setSelectedIds(new Set());
          notify(t('clients:bulkDeleted'), 'success');
      }
  };

  const addCivilIdRow = () => {
      const newId: CivilIdEntry = { id: Date.now().toString(), value: '', label: '' };
      setEditForm(prev => ({ ...prev, civilIds: [...(prev.civilIds || []), newId] }));
  };

  const removeCivilIdRow = (id: string) => {
      setEditForm(prev => ({ ...prev, civilIds: prev.civilIds?.filter(c => c.id !== id) }));
  };

  const updateCivilId = (id: string, field: 'value' | 'label', val: string) => {
      setEditForm(prev => ({
          ...prev,
          civilIds: prev.civilIds?.map(c => c.id === id ? { ...c, [field]: val } : c)
      }));
  };

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        const newAtt: Attachment = {
            id: Date.now().toString(),
            name: file.name,
            type: file.type.includes('image') ? 'image' : 'pdf',
            dataUrl: reader.result as string,
            uploadedAt: new Date().toISOString()
        };
        setEditForm(prev => ({ ...prev, attachments: [...(prev.attachments || []), newAtt] }));
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = (id: string) => {
    setEditForm(prev => ({ ...prev, attachments: prev.attachments?.filter(a => a.id !== id) }));
  };

  const handleExportCSV = () => {
      const itemsToExport = clients.filter(c => selectedIds.has(c.id));
      if (itemsToExport.length === 0) return;

      const headers = [
          t('clients:name'), 
          t('clients:phone'), 
          t('clients:address'), 
          t('clients:email'), 
          t('clients:currency'), 
          t('clients:civilId')
      ];
      const rows = itemsToExport.map(c => [
          `"${c.name}"`, 
          `"${c.phone}"`, 
          `"${c.address}"`, 
          `"${c.email || ''}"`,
          `"${c.currency || 'KWD'}"`,
          `"${c.civilIds?.map(cid => `${cid.value} (${cid.label || ''})`).join(' | ')}"`
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
          + headers.join(",") + "\n" 
          + rows.map(e => e.join(",")).join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "clients_export.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notify(t('clients:exported'), 'success');
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto animate-fade-in" dir={i18n.dir()}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
             <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('clients:title')}</h2>
             <p className="text-sm text-gray-500">{t('clients:subtitle')}</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
                <Search size={18} className="absolute top-1/2 -translate-y-1/2 left-3 rtl:right-3 rtl:left-auto text-gray-400" />
                <input 
                    type="text" 
                    placeholder={t('clients:search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 rtl:pr-10 rtl:pl-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                />
            </div>
            <button 
                onClick={() => { setIsAdding(true); setIsEditing(null); setEditForm({ name: '', address: '', phone: '', email: '', currency: 'KWD', attachments: [], civilIds: [] }); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition whitespace-nowrap shadow-md shadow-blue-200 dark:shadow-none"
            >
                <Plus size={18} /> <span className="hidden md:inline">{t('clients:add')}</span>
            </button>
        </div>
      </div>

      {selectedIds.size > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3 rounded-xl mb-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300 px-2">
                  {selectedIds.size} {t('common:selected')}
              </span>
              <div className="flex gap-2">
                   <button onClick={handleExportCSV} className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-bold border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                       <Download size={14} /> {t('common:export')}
                   </button>
                   <button onClick={handleBulkDelete} className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 text-red-600 text-xs font-bold border border-red-200 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                       <Trash2 size={14} /> {t('common:deleteSelected')}
                   </button>
              </div>
          </div>
      )}

      {(isAdding || isEditing) && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-2xl border border-blue-100 dark:border-gray-700 mb-8 animate-in slide-in-from-top-4 relative z-10">
          <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <User className="text-blue-600" />
                  {isEditing ? t('clients:update') : t('clients:add')}
              </h3>
              <button onClick={() => { setIsAdding(false); setIsEditing(null); }} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"><X size={20}/></button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
                <label className="block text-xs font-bold mb-1.5 text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('clients:name')} <span className="text-red-500">*</span></label>
                <input 
                    autoFocus
                    className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all" 
                    value={editForm.name} 
                    onChange={e => setEditForm({...editForm, name: e.target.value})} 
                    placeholder={t('clients:name')}
                />
            </div>
            <div>
                <label className="block text-xs font-bold mb-1.5 text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('clients:phone')}</label>
                <input 
                    className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all" 
                    value={editForm.phone} 
                    onChange={e => setEditForm({...editForm, phone: e.target.value})} 
                    placeholder={t('clients:phone')}
                />
            </div>
            <div>
                <label className="block text-xs font-bold mb-1.5 text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('clients:address')}</label>
                <input 
                    className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all" 
                    value={editForm.address} 
                    onChange={e => setEditForm({...editForm, address: e.target.value})} 
                    placeholder={t('clients:address')}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold mb-1.5 text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('clients:email')}</label>
                    <input 
                        className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all" 
                        value={editForm.email || ''} 
                        onChange={e => setEditForm({...editForm, email: e.target.value})} 
                        placeholder={t('clients:email')}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1.5 text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('clients:currency')}</label>
                    <select
                        className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all"
                        value={editForm.currency}
                        onChange={e => setEditForm({...editForm, currency: e.target.value as QuoteCurrency})}
                    >
                        <option value="KWD">KWD</option>
                        <option value="SAR">SAR</option>
                        <option value="AED">AED</option>
                        <option value="USD">USD</option>
                        <option value="EGP">EGP</option>
                    </select>
                </div>
            </div>
          </div>

          {/* Multiple Civil IDs Section */}
          <div className="mb-8 p-6 bg-slate-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 uppercase tracking-widest">
                      <Landmark size={18} className="text-blue-500"/>
                      {t('clients:civilIdSection')}
                  </h4>
                  <button 
                      type="button"
                      onClick={addCivilIdRow}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-gray-700 shadow-sm transition-all"
                  >
                      <Plus size={14}/> {t('clients:addId')}
                  </button>
              </div>

              <div className="space-y-3">
                  {editForm.civilIds?.map((cid) => (
                      <div key={cid.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center animate-in slide-in-from-right-2">
                          <div className="md:col-span-5">
                              <input 
                                  className="w-full p-2.5 text-sm border rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                                  value={cid.value}
                                  onChange={e => updateCivilId(cid.id, 'value', e.target.value)}
                                  placeholder={t('clients:civilId')}
                              />
                          </div>
                          <div className="md:col-span-6">
                              <input 
                                  className="w-full p-2.5 text-sm border rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"
                                  value={cid.label || ''}
                                  onChange={e => updateCivilId(cid.id, 'label', e.target.value)}
                                  placeholder={t('clients:context')}
                              />
                          </div>
                          <div className="md:col-span-1 flex justify-center">
                              <button type="button" onClick={() => removeCivilIdRow(cid.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                  <Trash2 size={18}/>
                              </button>
                          </div>
                      </div>
                  ))}
                  {(!editForm.civilIds || editForm.civilIds.length === 0) && (
                      <p className="text-center text-xs text-gray-400 italic py-2">{t('clients:noCivilIds')}</p>
                  )}
              </div>
          </div>
          
          {/* Attachments */}
          <div className="border-t border-gray-100 dark:border-gray-700 pt-6 mb-6">
              <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-widest">{t('clients:attachments')}</h4>
              <div className="flex flex-wrap gap-4 mb-4">
                  {editForm.attachments?.map(att => (
                      <div key={att.id} className="relative group border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-800 w-32 flex flex-col items-center shadow-sm hover:border-blue-300 transition-all">
                          <div className="h-16 w-full flex items-center justify-center text-gray-400 mb-2 overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-900">
                              {att.type === 'image' ? <img src={att.dataUrl} alt="" className="h-full w-full object-cover"/> : <FileText size={28}/>}
                          </div>
                          <p className="text-[10px] truncate w-full text-center font-medium text-gray-600 dark:text-gray-300">{att.name}</p>
                          <button type="button" onClick={() => removeAttachment(att.id)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100"><X size={12}/></button>
                      </div>
                  ))}
                  <div className="relative">
                        <button type="button" className="flex flex-col items-center justify-center w-32 h-[104px] border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-300 transition-all text-gray-400">
                            <UploadCloud size={24} className="mb-1" />
                            <span className="text-[10px] font-bold uppercase">{t('clients:upload')}</span>
                        </button>
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAttachmentUpload} accept="image/*,application/pdf" />
                  </div>
              </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 pt-6">
            <button onClick={() => { setIsAdding(false); setIsEditing(null); }} className="px-8 py-3 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">{t('common:cancel')}</button>
            <button onClick={handleSave} className="px-8 py-3 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-2 shadow-xl shadow-blue-200 dark:shadow-none"><Save size={18}/> {t('common:save')}</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          {filteredClients.length === 0 ? (
              <div className="p-20 text-center text-gray-500 dark:text-gray-400">
                  <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                    <User size={48} className="opacity-20" />
                  </div>
                  <p className="text-xl font-bold text-gray-700 dark:text-gray-300">{t('clients:noClients')}</p>
                  {searchTerm && <p className="text-sm mt-2 opacity-70">{t('clients:noResults')}</p>}
              </div>
          ) : (
            <>
                {/* Mobile Card View */}
                <div className="grid grid-cols-1 gap-0 md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredClients.map(client => {
                        const isSelected = selectedIds.has(client.id);
                        return (
                        <div key={client.id} className={`p-5 ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-lg shadow-sm border border-blue-100 dark:border-gray-700">
                                        {client.name.substring(0,2).toUpperCase()}
                                    </div>
                                    <div className={i18n.dir() === 'rtl' ? 'mr-1' : ''}>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-base leading-tight">{client.name}</h4>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-bold">
                                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{client.currency || t('common:currencyFallback', { defaultValue: 'KWD' })}</span>
                                            {client.civilIds && client.civilIds.length > 0 && <span className="text-blue-600 flex items-center gap-1"><Landmark size={10}/> {client.civilIds.length}</span>}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => handleSelectOne(client.id)} className="p-2 text-gray-400">
                                    {isSelected ? <CheckSquare className="text-blue-600" size={24}/> : <Square size={24}/>}
                                </button>
                            </div>
                            
                            <div className="space-y-2.5 text-sm text-gray-600 dark:text-gray-400 mb-5 px-1 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                                {client.phone && <div className="flex items-center gap-3"><Phone size={14} className="text-blue-400"/> <span className="font-medium">{client.phone}</span></div>}
                                {client.address && <div className="flex items-center gap-3"><MapPin size={14} className="text-red-400"/> <span className="truncate">{client.address}</span></div>}
                                {client.civilIds && client.civilIds.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                        {client.civilIds.slice(0, 2).map((cid, i) => (
                                            <span key={i} className="text-[10px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded-lg font-mono" title={cid.label}>
                                                {cid.value}
                                            </span>
                                        ))}
                                        {client.civilIds.length > 2 && <span className="text-[10px] text-blue-500 font-bold">+{client.civilIds.length - 2}</span>}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => startEdit(client)} className="flex-1 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm">
                                    <Edit2 size={14}/> {t('common:edit')}
                                </button>
                                <button onClick={() => handleDelete(client.id)} className="flex-1 py-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-xs font-bold text-red-600 flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/30 transition">
                                    <Trash2 size={14}/> {t('common:delete')}
                                </button>
                            </div>
                        </div>
                    )})}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left rtl:text-right">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-300 uppercase text-[10px] tracking-widest font-black border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-5 w-14">
                                    <button onClick={handleSelectAll} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                        {selectedIds.size > 0 && filteredClients.length > 0 && selectedIds.size === filteredClients.length ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                                    </button>
                                </th>
                                <th className="px-6 py-5">{t('clients:name')}</th>
                                <th className="px-6 py-5">{t('clients:phone')}</th>
                                <th className="px-6 py-5">{t('clients:civilId')}</th>
                                <th className="px-6 py-5">{t('clients:address')}</th>
                                <th className="px-6 py-5 text-center">{t('common:actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredClients.map(client => {
                                const isSelected = selectedIds.has(client.id);
                                return (
                                <tr key={client.id} className={`hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                    <td className="px-6 py-5">
                                        <button onClick={() => handleSelectOne(client.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                            {isSelected ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-sm">
                                                {client.name.substring(0,2).toUpperCase()}
                                            </div>
                                            <div className={i18n.dir() === 'rtl' ? 'mr-3' : ''}>
                                                <div className="font-bold text-gray-900 dark:text-white">{client.name}</div>
                                                <div className="flex gap-2 text-[10px] text-gray-400 mt-0.5 font-bold uppercase tracking-tighter">
                                                    {client.email && <div className="flex items-center gap-1"><Mail size={10}/> {client.email}</div>}
                                                    {client.currency && <div className="flex items-center gap-1 px-1.5 bg-gray-100 dark:bg-gray-700 rounded text-[9px]">{client.currency}</div>}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        {client.phone ? <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-medium"><Phone size={14} className="text-blue-400"/> {client.phone}</div> : '-'}
                                    </td>
                                    <td className="px-6 py-5">
                                        {client.civilIds && client.civilIds.length > 0 ? (
                                            <div className="flex flex-col gap-1">
                                                {client.civilIds.slice(0, 1).map((cid, i) => (
                                                    <div key={i} className="flex flex-col">
                                                        <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">{cid.value}</span>
                                                        {cid.label && <span className="text-[10px] text-gray-400 font-medium">{cid.label}</span>}
                                                    </div>
                                                ))}
                                                {client.civilIds.length > 1 && (
                                                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">+{client.civilIds.length - 1} {t('clients:multipleIds')}</span>
                                                )}
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-5 text-gray-500 max-w-xs truncate">
                                        {client.address ? <div className="flex items-center gap-2"><MapPin size={14} className="text-red-400"/> {client.address}</div> : '-'}
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center justify-center gap-1">
                                            <button onClick={() => startEdit(client)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition" title={t('common:edit')}><Edit2 size={18}/></button>
                                            <button onClick={() => handleDelete(client.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition" title={t('common:delete')}><Trash2 size={18}/></button>
                                        </div>
                                    </td>
                                </tr>
                                )})}
                        </tbody>
                    </table>
                </div>
            </>
          )}
      </div>
    </div>
  );
};
