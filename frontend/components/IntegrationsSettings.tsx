import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CompanyInfo, Integrations } from '../types';
import { Link as LinkIcon, Cloud, CreditCard, Package, RefreshCw, HardDrive, Check } from 'lucide-react';

interface IntegrationsSettingsProps {
  companyInfo: CompanyInfo;
  setCompanyInfo: React.Dispatch<React.SetStateAction<CompanyInfo>>;
}

export const IntegrationsSettings: React.FC<IntegrationsSettingsProps> = ({ companyInfo, setCompanyInfo }) => {
  const { t, i18n } = useTranslation('settings');

  const updateIntegration = (section: keyof Integrations, field: string, value: any) => {
      setCompanyInfo(prev => ({
          ...prev,
          integrations: {
              ...prev.integrations,
              [section]: {
                  ...prev.integrations?.[section],
                  [field]: value
              }
          }
      }));
  };

  const IntegrationCard = ({ 
      title, 
      desc, 
      icon: Icon, 
      enabled, 
      onToggle, 
      children 
  }: { 
      title: string, 
      desc: string, 
      icon: any, 
      enabled: boolean, 
      onToggle: (val: boolean) => void, 
      children?: React.ReactNode 
  }) => (
      <div className={`rounded-2xl border p-6 transition-all duration-300 ${enabled ? 'border-blue-500 ring-1 ring-blue-500/20 bg-white dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'}`}>
          <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${enabled ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                       <Icon size={24} />
                   </div>
                   <div>
                       <h4 className="font-bold text-gray-900 dark:text-white">{title}</h4>
                       <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm">{desc}</p>
                   </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
          </div>
          
          {enabled && (
              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 space-y-4 animate-fade-in">
                  {children}
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg w-fit">
                      <Check size={14} /> {t('connected')}
                  </div>
              </div>
          )}
      </div>
  );

  return (
    <div className="space-y-6 animate-fade-in" dir={i18n.dir()}>
        {/* Google Drive Integration */}
        <IntegrationCard 
            title={t('googleDrive')} 
            desc={t('driveDesc')} 
            icon={HardDrive} 
            enabled={companyInfo.integrations?.googleDrive?.enabled || false}
            onToggle={(val) => updateIntegration('googleDrive', 'enabled', val)}
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">{t('clientId')}</label>
                    <input 
                        type="text" 
                        className="w-full p-2.5 text-sm border rounded-xl bg-white dark:bg-gray-900 dark:border-gray-700 outline-none"
                        placeholder="123456...apps.googleusercontent.com"
                        value={companyInfo.integrations?.googleDrive?.clientId || ''}
                        onChange={(e) => updateIntegration('googleDrive', 'clientId', e.target.value)}
                    />
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                        type="checkbox" 
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        checked={companyInfo.integrations?.googleDrive?.autoBackup || false}
                        onChange={(e) => updateIntegration('googleDrive', 'autoBackup', e.target.checked)}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('autoBackup')}</span>
                </label>
                {companyInfo.integrations?.googleDrive?.lastSync && (
                    <p className="text-xs text-gray-500">{t('lastSync')}: {new Date(companyInfo.integrations.googleDrive.lastSync).toLocaleString()}</p>
                )}
            </div>
        </IntegrationCard>

        {/* Cloud Sync */}
        <IntegrationCard 
            title={t('cloudSync')} 
            desc={t('cloudDesc')} 
            icon={Cloud} 
            enabled={companyInfo.integrations?.cloudSync?.enabled || false}
            onToggle={(val) => updateIntegration('cloudSync', 'enabled', val)}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">{t('provider')}</label>
                    <select 
                        className="w-full p-2.5 text-sm border rounded-xl bg-white dark:bg-gray-900 dark:border-gray-700 outline-none"
                        value={companyInfo.integrations?.cloudSync?.provider || 'firebase'}
                        onChange={(e) => updateIntegration('cloudSync', 'provider', e.target.value)}
                    >
                        <option value="firebase">Google Firebase</option>
                        <option value="supabase">Supabase</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">{t('projectId')}</label>
                    <input 
                        type="text" 
                        className="w-full p-2.5 text-sm border rounded-xl bg-white dark:bg-gray-900 dark:border-gray-700 outline-none"
                        placeholder="my-app-id"
                        value={companyInfo.integrations?.cloudSync?.projectId || ''}
                        onChange={(e) => updateIntegration('cloudSync', 'projectId', e.target.value)}
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-1">{t('apiKey')}</label>
                    <input 
                        type="password" 
                        className="w-full p-2.5 text-sm border rounded-xl bg-white dark:bg-gray-900 dark:border-gray-700 outline-none font-mono"
                        placeholder="AIzaSy..."
                        value={companyInfo.integrations?.cloudSync?.apiKey || ''}
                        onChange={(e) => updateIntegration('cloudSync', 'apiKey', e.target.value)}
                    />
                </div>
            </div>
        </IntegrationCard>

        {/* Payment Gateway */}
        <IntegrationCard 
            title={t('paymentGate')} 
            desc={t('paymentDesc')} 
            icon={CreditCard} 
            enabled={companyInfo.integrations?.paymentGateway?.enabled || false}
            onToggle={(val) => updateIntegration('paymentGateway', 'enabled', val)}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">{t('provider')}</label>
                    <select 
                        className="w-full p-2.5 text-sm border rounded-xl bg-white dark:bg-gray-900 dark:border-gray-700 outline-none"
                        value={companyInfo.integrations?.paymentGateway?.provider || 'stripe'}
                        onChange={(e) => updateIntegration('paymentGateway', 'provider', e.target.value)}
                    >
                        <option value="stripe">Stripe</option>
                        <option value="tap">Tap Payments</option>
                        <option value="myfatoorah">MyFatoorah</option>
                    </select>
                </div>
                <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            checked={companyInfo.integrations?.paymentGateway?.testMode ?? true}
                            onChange={(e) => updateIntegration('paymentGateway', 'testMode', e.target.checked)}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{t('testMode')}</span>
                    </label>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-1">{t('publishableKey')}</label>
                    <input 
                        type="text" 
                        className="w-full p-2.5 text-sm border rounded-xl bg-white dark:bg-gray-900 dark:border-gray-700 outline-none font-mono"
                        placeholder="pk_test_..."
                        value={companyInfo.integrations?.paymentGateway?.publishableKey || ''}
                        onChange={(e) => updateIntegration('paymentGateway', 'publishableKey', e.target.value)}
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-1">{t('secretKey')}</label>
                    <input 
                        type="password" 
                        className="w-full p-2.5 text-sm border rounded-xl bg-white dark:bg-gray-900 dark:border-gray-700 outline-none font-mono"
                        placeholder="sk_test_..."
                        value={companyInfo.integrations?.paymentGateway?.secretKey || ''}
                        onChange={(e) => updateIntegration('paymentGateway', 'secretKey', e.target.value)}
                    />
                </div>
            </div>
        </IntegrationCard>

        {/* Advanced Inventory */}
        <IntegrationCard 
            title={t('advInventory')} 
            desc={t('invDesc')} 
            icon={Package} 
            enabled={companyInfo.integrations?.inventory?.enabled || false}
            onToggle={(val) => updateIntegration('inventory', 'enabled', val)}
        >
            <div className="space-y-4">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition">
                    <input 
                        type="checkbox" 
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        checked={companyInfo.integrations?.inventory?.enablePurchaseOrders || false}
                        onChange={(e) => updateIntegration('inventory', 'enablePurchaseOrders', e.target.checked)}
                    />
                    <span className="text-sm font-medium">{t('enablePO')}</span>
                </label>
                
                <div className="p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                    <label className="flex items-center gap-3 mb-3 cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                            checked={companyInfo.integrations?.inventory?.enableLowStockAlerts || false}
                            onChange={(e) => updateIntegration('inventory', 'enableLowStockAlerts', e.target.checked)}
                        />
                        <span className="text-sm font-medium">{t('enableAlerts')}</span>
                    </label>
                    {companyInfo.integrations?.inventory?.enableLowStockAlerts && (
                        <input 
                            type="email" 
                            className="w-full p-2 text-sm border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 outline-none"
                            placeholder={t('alertEmail')}
                            value={companyInfo.integrations?.inventory?.alertEmail || ''}
                            onChange={(e) => updateIntegration('inventory', 'alertEmail', e.target.value)}
                        />
                    )}
                </div>
            </div>
        </IntegrationCard>

        {/* Live Currency */}
        <IntegrationCard 
            title={t('liveRates')} 
            desc={t('ratesDesc')} 
            icon={RefreshCw} 
            enabled={companyInfo.integrations?.currency?.enabled || false}
            onToggle={(val) => updateIntegration('currency', 'enabled', val)}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">{t('provider')}</label>
                    <select 
                        className="w-full p-2.5 text-sm border rounded-xl bg-white dark:bg-gray-900 dark:border-gray-700 outline-none"
                        value={companyInfo.integrations?.currency?.provider || 'exchangerate-api'}
                        onChange={(e) => updateIntegration('currency', 'provider', e.target.value)}
                    >
                        <option value="exchangerate-api">ExchangeRate-API</option>
                        <option value="fixer">Fixer.io</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">{t('apiKey')}</label>
                    <input 
                        type="password" 
                        className="w-full p-2.5 text-sm border rounded-xl bg-white dark:bg-gray-900 dark:border-gray-700 outline-none font-mono"
                        placeholder="API Key..."
                        value={companyInfo.integrations?.currency?.apiKey || ''}
                        onChange={(e) => updateIntegration('currency', 'apiKey', e.target.value)}
                    />
                </div>
            </div>
        </IntegrationCard>
    </div>
  );
};
