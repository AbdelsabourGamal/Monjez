import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { DbProduct, Language, QuoteCurrency, Attachment } from '../types';
import { Plus, Trash2, Edit2, Save, Package, Search, Download, CheckSquare, Square, UploadCloud, FileText, X, Briefcase, Box, AlertTriangle } from 'lucide-react';

interface ProductManagerProps {
  products: DbProduct[];
  setProducts: React.Dispatch<React.SetStateAction<DbProduct[]>>;
  notify: (msg: string, type: 'success' | 'error') => void;
}

export const ProductManager: React.FC<ProductManagerProps> = ({ products, setProducts, notify }) => {
  const { t, i18n } = useTranslation(['products', 'common']);

  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Omit<DbProduct, 'id'>>({ 
      name: '', 
      description: '', 
      price: 0, 
      currency: 'KWD', 
      attachments: [], 
      itemType: 'service',
      stock: 0,
      minStockLevel: 5
  });
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter
  const filteredProducts = useMemo(() => {
      return products.filter(p => 
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [products, searchTerm]);

  // Bulk Logic
  const handleSelectAll = () => {
      if (selectedIds.size === filteredProducts.length && filteredProducts.length > 0) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(filteredProducts.map(p => p.id)));
      }
  };

  const handleSelectOne = (id: string) => {
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedIds(newSet);
  };

  const handleSave = () => {
    if (!editForm.name.trim()) {
        notify(t('products:nameRequired'), 'error');
        return;
    }
    
    if (isEditing) {
      setProducts(prev => prev.map(p => p.id === isEditing ? { ...editForm, id: isEditing } : p));
      notify(t('products:updated'), 'success');
      setIsEditing(null);
    } else {
      const newProduct: DbProduct = { ...editForm, id: Date.now().toString() };
      setProducts(prev => [newProduct, ...prev]);
      notify(t('products:added'), 'success');
      setIsAdding(false);
    }
    setEditForm({ name: '', description: '', price: 0, currency: 'KWD', attachments: [], itemType: 'service', stock: 0, minStockLevel: 5 });
  };

  const startEdit = (product: DbProduct) => {
    setEditForm({ 
        name: product.name, 
        description: product.description, 
        price: product.price,
        currency: product.currency || 'KWD',
        attachments: product.attachments || [],
        itemType: product.itemType || 'service',
        stock: product.stock || 0,
        minStockLevel: product.minStockLevel || 5
    });
    setIsEditing(product.id);
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm(t('products:confirmDelete'))) {
      setProducts(prev => prev.filter(p => p.id !== id));
      notify(t('products:deleted'), 'success');
      if(selectedIds.has(id)) {
          const newSet = new Set(selectedIds);
          newSet.delete(id);
          setSelectedIds(newSet);
      }
    }
  };

  const handleBulkDelete = () => {
      if (confirm(t('products:confirmBulkDelete', { count: selectedIds.size }))) {
          setProducts(prev => prev.filter(p => !selectedIds.has(p.id)));
          setSelectedIds(new Set());
          notify(t('products:bulkDeleted'), 'success');
      }
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
      const items = products.filter(p => selectedIds.has(p.id));
      if(items.length === 0) return;
      
      const headers = [
          t('products:type'), 
          t('products:name'), 
          t('products:description'), 
          t('products:price'), 
          t('products:currency'), 
          t('products:stock')
      ];
      const rows = items.map(p => [
          `"${p.itemType === 'product' ? t('products:product') : t('products:service')}"`, 
          `"${p.name}"`, 
          `"${p.description.replace(/"/g, '""')}"`, 
          `${p.price}`, 
          `"${p.currency || 'KWD'}"`, 
          `${p.stock || 0}`
      ]);
      const csv = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
      const link = document.createElement("a");
      link.href = encodeURI(csv);
      link.download = "items_export.csv";
      link.click();
      notify(t('products:exported'), 'success');
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto animate-fade-in" dir={i18n.dir()}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
             <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('products:title')}</h2>
             <p className="text-sm text-gray-500">{t('products:subtitle')}</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <Search size={18} className="absolute top-1/2 -translate-y-1/2 left-3 rtl:right-3 rtl:left-auto text-gray-400" />
                <input 
                    type="text" 
                    placeholder={t('products:search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full ${i18n.dir() === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm`}
                />
            </div>
            <button 
                onClick={() => { setIsAdding(true); setIsEditing(null); setEditForm({ name: '', description: '', price: 0, currency: 'KWD', attachments: [], itemType: 'service', stock: 0, minStockLevel: 5 }); }}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition whitespace-nowrap shadow-md shadow-blue-200 dark:shadow-none"
            >
                <Plus size={18} /> <span className="hidden md:inline">{t('products:add')}</span>
            </button>
        </div>
      </div>

      {selectedIds.size > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-3 rounded-xl mb-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-300 px-2">{selectedIds.size} {t('common:selected')}</span>
              <div className="flex gap-2">
                   <button onClick={handleExportCSV} className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-bold border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"><Download size={14} /> {t('common:export')}</button>
                   <button onClick={handleBulkDelete} className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 text-red-600 text-xs font-bold border border-red-200 dark:border-red-900/50 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"><Trash2 size={14} /> {t('common:deleteSelected')}</button>
              </div>
          </div>
      )}

      {(isAdding || isEditing) && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 mb-8 animate-in slide-in-from-top-4 relative z-10">
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-200">{isEditing ? t('products:editItem') : t('products:add')}</h3>
            
            {/* Item Type Selector */}
            <div className="flex gap-4 mb-4">
                <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${editForm.itemType === 'service' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                    <input type="radio" name="itemType" value="service" checked={editForm.itemType === 'service'} onChange={() => setEditForm({...editForm, itemType: 'service'})} className="hidden" />
                    <Briefcase size={18} />
                    <span className="text-xs font-bold uppercase">{t('products:service')}</span>
                </label>
                <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${editForm.itemType === 'product' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                    <input type="radio" name="itemType" value="product" checked={editForm.itemType === 'product'} onChange={() => setEditForm({...editForm, itemType: 'product'})} className="hidden" />
                    <Box size={18} />
                    <span className="text-xs font-bold uppercase">{t('products:product')}</span>
                </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400 uppercase">{t('products:name')} <span className="text-red-500">*</span></label>
                    <input 
                        autoFocus
                        className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" 
                        value={editForm.name} 
                        onChange={e => setEditForm({...editForm, name: e.target.value})} 
                        placeholder={t('products:name')}
                    />
                </div>
                 <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400 uppercase">{t('products:price')}</label>
                        <input 
                            type="number"
                            className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" 
                            value={editForm.price} 
                            onChange={e => setEditForm({...editForm, price: parseFloat(e.target.value) || 0})} 
                        />
                    </div>
                    <div className="w-24">
                        <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400 uppercase">{t('products:currency')}</label>
                        <select
                            className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                            value={editForm.currency}
                            onChange={e => setEditForm({...editForm, currency: e.target.value as QuoteCurrency})}
                        >
                            {['KWD', 'SAR', 'AED', 'USD', 'EGP', 'QAR', 'BHD', 'OMR', 'JOD', 'EUR', 'GBP'].map(curr => (
                                <option key={curr} value={curr}>{t(`common:currencySymbols.${curr}`, { defaultValue: curr })}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400 uppercase">{t('products:description')}</label>
                    <input 
                        className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-gray-900 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" 
                        value={editForm.description} 
                        onChange={e => setEditForm({...editForm, description: e.target.value})} 
                        placeholder={t('products:description')}
                    />
                </div>
                
                {/* Inventory Fields (Only for Products) */}
                {editForm.itemType === 'product' && (
                    <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50">
                        <div>
                            <label className="block text-xs font-bold mb-1 text-blue-700 dark:text-blue-300 uppercase">{t('products:stock')}</label>
                            <input 
                                type="number"
                                className="w-full p-3 border rounded-xl bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-800/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" 
                                value={editForm.stock} 
                                onChange={e => setEditForm({...editForm, stock: parseInt(e.target.value) || 0})} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold mb-1 text-blue-700 dark:text-blue-300 uppercase">{t('products:minStock')}</label>
                            <input 
                                type="number"
                                className="w-full p-3 border rounded-xl bg-white dark:bg-gray-900 border-blue-200 dark:border-blue-800/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium" 
                                value={editForm.minStockLevel} 
                                onChange={e => setEditForm({...editForm, minStockLevel: parseInt(e.target.value) || 0})} 
                            />
                        </div>
                    </div>
                )}
            </div>

             {/* Attachments */}
             <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mb-4">
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase">{t('products:attachments')}</h4>
                <div className="flex flex-wrap gap-3 mb-3">
                    {editForm.attachments?.map(att => (
                        <div key={att.id} className="relative group border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-900/50 w-24 flex flex-col items-center">
                            <div className="h-12 w-12 flex items-center justify-center text-gray-400 mb-1 overflow-hidden rounded">
                                {att.type === 'image' ? <img src={att.dataUrl} alt="" className="h-full w-full object-cover"/> : <FileText size={24}/>}
                            </div>
                            <p className="text-[10px] truncate w-full text-center">{att.name}</p>
                            <button type="button" onClick={() => removeAttachment(att.id)} className="absolute -top-1 -right-1 bg-red-100 text-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"><X size={12}/></button>
                        </div>
                    ))}
                </div>
                <div className="relative w-fit">
                    <button type="button" className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition">
                        <UploadCloud size={14} /> {t('products:upload')}
                    </button>
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAttachmentUpload} accept="image/*,application/pdf" />
                </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
                <button onClick={() => { setIsAdding(false); setIsEditing(null); }} className="px-6 py-3 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition">{t('common:cancel')}</button>
                <button onClick={handleSave} className="px-6 py-3 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none"><Save size={16}/> {t('common:save')}</button>
            </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          {filteredProducts.length === 0 ? (
              <div className="p-16 text-center text-gray-500 dark:text-gray-400">
                  <Package size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-medium">{t('products:noProducts')}</p>
                  {searchTerm && <p className="text-sm mt-2">{t('products:noResults')}</p>}
              </div>
          ) : (
            <>
                {/* Mobile View */}
                <div className="grid grid-cols-1 gap-0 md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredProducts.map(product => {
                        const isSelected = selectedIds.has(product.id);
                        const isLowStock = product.itemType === 'product' && (product.stock || 0) <= (product.minStockLevel || 0);
                        
                        return (
                        <div key={product.id} className={`p-4 ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${product.itemType === 'product' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'}`}>
                                        {product.itemType === 'product' ? <Box size={20} /> : <Briefcase size={20} />}
                                    </div>
                                    <div className={i18n.dir() === 'rtl' ? 'mr-3' : ''}>
                                        <h4 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                                            {product.name}
                                            {isLowStock && <AlertTriangle size={14} className="text-red-500" />}
                                        </h4>
                                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${product.itemType === 'product' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}`}>
                                            {product.itemType === 'product' ? t('products:product') : t('products:service')}
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => handleSelectOne(product.id)} className="p-2 text-gray-400">
                                    {isSelected ? <CheckSquare className="text-blue-600"/> : <Square/>}
                                </button>
                            </div>
                            
                            {product.itemType === 'product' && (
                                <div className="mb-3 text-xs">
                                    <span className={`font-bold ${isLowStock ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {t('products:stock')}: {product.stock}
                                    </span>
                                    {isLowStock && <span className="text-red-500 ml-2">{t('products:lowStock')}</span>}
                                </div>
                            )}
                            
                            <p className="text-sm text-gray-500 mb-3 line-clamp-2 px-1">{product.description || '-'}</p>
                            
                            <div className="flex items-center justify-between mb-4 px-1">
                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-lg">
                                    {product.price} <span className="text-xs text-gray-400">{product.currency}</span>
                                </span>
                                {product.attachments && product.attachments.length > 0 && (
                                    <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                        <FileText size={12}/> {product.attachments.length}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => startEdit(product)} className="flex-1 py-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                                    <Edit2 size={14}/> {t('common:edit')}
                                </button>
                                <button onClick={() => handleDelete(product.id)} className="flex-1 py-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl text-xs font-bold text-red-600 flex items-center justify-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/30 transition">
                                    <Trash2 size={14}/> {t('common:delete')}
                                </button>
                            </div>
                        </div>
                    )})}
                </div>

                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left rtl:text-right">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-300 uppercase text-xs font-medium border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-4 py-3 w-10">
                                    <button onClick={handleSelectAll} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                        {selectedIds.size > 0 && filteredProducts.length > 0 && selectedIds.size === filteredProducts.length ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                    </button>
                                </th>
                                <th className="px-6 py-3">{t('products:name')}</th>
                                <th className="px-6 py-3">{t('products:type')}</th>
                                <th className="px-6 py-3">{t('products:stock')}</th>
                                <th className="px-6 py-3">{t('products:description')}</th>
                                <th className="px-6 py-3">{t('products:price')}</th>
                                <th className="px-6 py-3 text-center">{t('common:actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredProducts.map(product => {
                                const isSelected = selectedIds.has(product.id);
                                const isLowStock = product.itemType === 'product' && (product.stock || 0) <= (product.minStockLevel || 0);

                                return (
                                <tr key={product.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                    <td className="px-4 py-4">
                                        <button onClick={() => handleSelectOne(product.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                            {isSelected ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${product.itemType === 'product' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'} dark:bg-opacity-20`}>
                                                {product.itemType === 'product' ? <Box size={16} /> : <Briefcase size={16} />}
                                            </div>
                                            <div className={i18n.dir() === 'rtl' ? 'mr-3' : ''}>
                                                <div className="font-semibold">{product.name}</div>
                                                {product.attachments && product.attachments.length > 0 && (
                                                    <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                                        <FileText size={10}/> {product.attachments.length}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded ${product.itemType === 'product' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {product.itemType === 'product' ? t('products:product') : t('products:service')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {product.itemType === 'product' ? (
                                            <span className={`font-bold text-xs ${isLowStock ? 'text-red-600 bg-red-50 px-2 py-1 rounded' : 'text-gray-600'}`}>
                                                {product.stock} {isLowStock && `(${t('products:lowStock')})`}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 truncate max-w-xs" title={product.description}>
                                        {product.description || '-'}
                                    </td>
                                    <td className="px-6 py-4 font-mono font-medium text-emerald-600">
                                        {product.price} <span className="text-xs text-gray-400">{product.currency}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => startEdit(product)} className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition" title={t('common:edit')}><Edit2 size={16}/></button>
                                            <button onClick={() => handleDelete(product.id)} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition" title={t('common:delete')}><Trash2 size={16}/></button>
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
