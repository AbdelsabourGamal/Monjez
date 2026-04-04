import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { DbEmployee, Language, QuoteCurrency } from '../types';
import { Plus, Trash2, Edit2, Save, Search, Download, CheckSquare, Square, Briefcase, User } from 'lucide-react';

interface EmployeeManagerProps {
  employees: DbEmployee[];
  setEmployees: React.Dispatch<React.SetStateAction<DbEmployee[]>>;
  notify: (msg: string, type: 'success' | 'error') => void;
}

export const EmployeeManager: React.FC<EmployeeManagerProps> = ({ employees, setEmployees, notify }) => {
  const { t, i18n } = useTranslation(['employees', 'common']);

  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const initialForm: Omit<DbEmployee, 'id'> = {
      name: '', role: '', email: '', phone: '', salary: 0, currency: 'KWD', joinDate: new Date().toISOString().split('T')[0], civilId: ''
  };
  const [editForm, setEditForm] = useState<Omit<DbEmployee, 'id'>>(initialForm);

  const filteredEmployees = useMemo(() => {
      const term = searchTerm.toLowerCase();
      return employees.filter(e => e.name.toLowerCase().includes(term) || e.role.toLowerCase().includes(term));
  }, [employees, searchTerm]);

  const handleSelectAll = () => {
      if (selectedIds.size === filteredEmployees.length) setSelectedIds(new Set());
      else setSelectedIds(new Set(filteredEmployees.map(e => e.id)));
  };

  const handleSelectOne = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const handleSave = () => {
      if (!editForm.name || !editForm.role) {
          notify(t('employees:nameRoleRequired'), 'error');
          return;
      }
      if (isEditing) {
          setEmployees(prev => prev.map(e => e.id === isEditing ? { ...editForm, id: isEditing } : e));
          notify(t('employees:updated'), 'success');
          setIsEditing(null);
      } else {
          setEmployees(prev => [...prev, { ...editForm, id: Date.now().toString() }]);
          notify(t('employees:added'), 'success');
          setIsAdding(false);
      }
      setEditForm(initialForm);
  };

  const startEdit = (emp: DbEmployee) => {
      setEditForm({ 
          name: emp.name,
          role: emp.role,
          email: emp.email,
          phone: emp.phone,
          salary: emp.salary,
          currency: emp.currency || 'KWD',
          joinDate: emp.joinDate,
          civilId: emp.civilId
      });
      setIsEditing(emp.id);
      setIsAdding(false);
  };

  const handleDelete = (id: string) => {
      if (confirm(t('employees:confirmDelete'))) {
          setEmployees(prev => prev.filter(e => e.id !== id));
          notify(t('employees:deleted'), 'success');
          if (selectedIds.has(id)) {
              const newSet = new Set(selectedIds);
              newSet.delete(id);
              setSelectedIds(newSet);
          }
      }
  };

  const handleBulkDelete = () => {
      if (confirm(t('employees:confirmBulkDelete', { count: selectedIds.size }))) {
          setEmployees(prev => prev.filter(e => !selectedIds.has(e.id)));
          setSelectedIds(new Set());
          notify(t('employees:bulkDeleted'), 'success');
      }
  };

    const handleExportCSV = () => {
        const items = employees.filter(p => selectedIds.has(p.id));
        if(items.length === 0) return;
        
        const headers = [
            t('employees:name'), 
            t('employees:role'), 
            t('employees:email'), 
            t('employees:phone'), 
            t('employees:salary'), 
            t('employees:currency'), 
            t('employees:joinDate')
        ];
        const rows = items.map(p => [
            `"${p.name}"`, 
            `"${p.role}"`, 
            `"${p.email}"`, 
            `"${p.phone}"`, 
            `${p.salary}`, 
            `"${p.currency || 'KWD'}"`, 
            `"${p.joinDate}"`
        ]);
        const csv = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.href = encodeURI(csv);
        link.download = "employees_export.csv";
        link.click();
        notify(t('employees:exported'), 'success');
    };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto animate-fade-in" dir={i18n.dir()}>
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
             <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('employees:title')}</h2>
             <p className="text-sm text-gray-500">{t('employees:desc')}</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search size={18} className={`absolute top-1/2 -translate-y-1/2 ${i18n.dir() === 'rtl' ? 'right-3' : 'left-3'} text-gray-400`} />
                <input 
                    type="text" 
                    placeholder={t('employees:searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full ${i18n.dir() === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm`}
                />
            </div>
            <button 
            onClick={() => { setIsAdding(true); setIsEditing(null); setEditForm(initialForm); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition whitespace-nowrap shadow-md shadow-blue-200 dark:shadow-none font-bold"
            >
            <Plus size={18} /> <span className="hidden md:inline">{t('employees:add')}</span>
            </button>
        </div>
      </div>

      {selectedIds.size > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3 rounded-xl mb-4 flex items-center justify-between animate-in fade-in">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300 px-2">{selectedIds.size} {t('common:selected')}</span>
              <div className="flex gap-2">
                   <button onClick={handleExportCSV} className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-bold border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"><Download size={14} /> {t('common:export')}</button>
                   <button onClick={handleBulkDelete} className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 text-red-600 text-xs font-bold border border-red-200 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"><Trash2 size={14} /> {t('common:deleteSelected')}</button>
              </div>
          </div>
      )}

      {(isAdding || isEditing) && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 mb-8 animate-in slide-in-from-top-4 relative z-10">
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-200">{isEditing ? t('employees:editEmployee') : t('employees:add')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('employees:name')} *</label>
                    <input className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('employees:role')} *</label>
                    <input className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} />
                </div>
                 <div>
                    <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('employees:civilId')}</label>
                    <input className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 font-mono" value={editForm.civilId} onChange={e => setEditForm({...editForm, civilId: e.target.value})} />
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('employees:email')}</label>
                    <input className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('employees:phone')}</label>
                    <input className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                </div>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('employees:salary')}</label>
                        <input type="number" className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={editForm.salary} onChange={e => setEditForm({...editForm, salary: Number(e.target.value)})} />
                    </div>
                    <div className="w-28">
                        <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('employees:currency')}</label>
                        <select
                            className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                            value={editForm.currency}
                            onChange={e => setEditForm({...editForm, currency: e.target.value as QuoteCurrency})}
                        >
                            {['KWD', 'SAR', 'AED', 'USD', 'EGP', 'QAR', 'BHD', 'OMR', 'JOD', 'EUR', 'GBP'].map(curr => (
                                <option key={curr} value={curr}>{t(`common:currencySymbols.${curr}`, { defaultValue: curr })}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('employees:joinDate')}</label>
                    <input type="date" className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 font-medium font-bold" value={editForm.joinDate} onChange={e => setEditForm({...editForm, joinDate: e.target.value})} />
                </div>
            </div>
             <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
                <button onClick={() => { setIsAdding(false); setIsEditing(null); }} className="px-6 py-3 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">{t('common:cancel')}</button>
                <button onClick={handleSave} className="px-6 py-3 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none"><Save size={16}/> {t('common:save')}</button>
            </div>
        </div>
      )}

       <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          {filteredEmployees.length === 0 ? (
               <div className="p-16 text-center text-gray-500 dark:text-gray-400">
                  <Briefcase size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">{t('employees:noData')}</p>
              </div>
          ) : (
              <>
                  {/* Mobile Card View */}
                  <div className="grid grid-cols-1 gap-0 md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                      {filteredEmployees.map(emp => {
                          const isSelected = selectedIds.has(emp.id);
                          return (
                          <div key={emp.id} className={`p-4 ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                              <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center gap-3">
                                      <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center text-sm font-black">
                                          {emp.name.substring(0,1).toUpperCase()}
                                      </div>
                                      <div>
                                          <h4 className="font-bold text-gray-900 dark:text-white text-base">{emp.name}</h4>
                                          <p className="text-xs text-purple-600 font-bold">{emp.role}</p>
                                      </div>
                                  </div>
                                  <button onClick={() => handleSelectOne(emp.id)} className="p-2 text-gray-400">
                                      {isSelected ? <CheckSquare className="text-blue-600"/> : <Square/>}
                                  </button>
                              </div>
                              
                              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4 px-1">
                                  <div className="flex justify-between">
                                      <span>{t('employees:email')}:</span>
                                      <span className="font-medium text-gray-900 dark:text-white">{emp.email || '-'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                      <span>{t('employees:phone')}:</span>
                                      <span className="font-medium text-gray-900 dark:text-white">{emp.phone || '-'}</span>
                                  </div>
                                  <div className="flex justify-between pt-2 border-t border-dashed border-gray-100 dark:border-gray-700 font-bold">
                                      <span>{t('employees:salary')}:</span>
                                      <span className="font-bold text-emerald-600">{emp.salary} <span className="text-[10px] text-gray-400">{emp.currency || 'KWD'}</span></span>
                                  </div>
                              </div>

                              <div className="flex gap-3">
                                  <button onClick={() => startEdit(emp)} className="flex-1 py-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition shadow-sm">
                                      <Edit2 size={14}/> {t('common:edit')}
                                  </button>
                                  <button onClick={() => handleDelete(emp.id)} className="flex-1 py-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl text-xs font-bold text-red-600 flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/30 transition shadow-sm">
                                      <Trash2 size={14}/> {t('common:delete')}
                                  </button>
                              </div>
                          </div>
                      )})}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm text-left rtl:text-right">
                           <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-300 uppercase text-[10px] font-bold tracking-widest border-b border-gray-200 dark:border-gray-700">
                               <tr>
                                    <th className="px-4 py-4 w-10">
                                      <button onClick={handleSelectAll} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                          {selectedIds.size > 0 && selectedIds.size === filteredEmployees.length ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                                      </button>
                                  </th>
                                  <th className="px-6 py-4">{t('employees:name')}</th>
                                  <th className="px-6 py-4">{t('employees:role')}</th>
                                  <th className="px-6 py-4">{t('employees:phone')}</th>
                                  <th className="px-6 py-4">{t('employees:salary')}</th>
                                  <th className="px-6 py-4 text-center">{t('common:actions')}</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                               {filteredEmployees.map(emp => {
                                    const isSelected = selectedIds.has(emp.id);
                                   return (
                                   <tr key={emp.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                       <td className="px-4 py-4">
                                           <button onClick={() => handleSelectOne(emp.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                               {isSelected ? <CheckSquare size={20} className="text-blue-600" /> : <Square size={20} />}
                                           </button>
                                       </td>
                                       <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                 <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center text-sm font-black shadow-sm">
                                                     {emp.name.substring(0,1).toUpperCase()}
                                                 </div>
                                                 <div>
                                                     <div className="font-bold text-gray-900 dark:text-white">{emp.name}</div>
                                                     <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{emp.email}</div>
                                                 </div>
                                             </div>
                                       </td>
                                       <td className="px-6 py-4 text-gray-700 dark:text-gray-200 font-bold">{emp.role}</td>
                                       <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-medium">{emp.phone || '-'}</td>
                                       <td className="px-6 py-4 font-black text-emerald-600">{emp.salary} <span className="text-[10px] text-gray-400 font-bold">{emp.currency || 'KWD'}</span></td>
                                       <td className="px-6 py-4">
                                         <div className="flex items-center justify-center gap-2">
                                             <button onClick={() => startEdit(emp)} className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition shadow-sm" title={t('common:edit')}><Edit2 size={16}/></button>
                                             <button onClick={() => handleDelete(emp.id)} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition shadow-sm" title={t('common:delete')}><Trash2 size={16}/></button>
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
