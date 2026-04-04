import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Code, Globe, AtSign, Info, Shield } from 'lucide-react';

interface AboutAppProps {
  // language prop removed as we use i18n.language
}

export const AboutApp: React.FC<AboutAppProps> = () => {
  const { t, i18n } = useTranslation(['about', 'common']);

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in pb-20" dir={i18n.dir()}>
        <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Info size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('about:title')}</h2>
        </div>

        <div className="space-y-6">
            {/* Legal Disclaimer Card */}
            <div className="p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-3xl">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-600 dark:text-amber-500 flex-shrink-0">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-amber-800 dark:text-amber-300 text-lg mb-2">{t('about:legalWarningTitle')}</h4>
                        <p className="text-sm text-amber-800/80 dark:text-amber-200/70 leading-relaxed text-justify">
                            {t('about:legalWarningText')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Developer Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group">
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white flex items-center justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-white/10 transition-colors"></div>
                    <div className="relative z-10">
                        <h3 className="font-bold text-lg mb-1 text-slate-200">{t('about:devTitle')}</h3>
                        <p className="text-slate-400 text-xs uppercase tracking-wider font-bold">{t('about:devTeam')}</p>
                    </div>
                    <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm relative z-10 border border-white/10">
                        <Code size={24} className="text-blue-400" />
                    </div>
                </div>
                
                <div className="p-8 space-y-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center font-bold text-2xl shadow-lg shadow-blue-500/20">
                            M
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-white text-xl">{t('about:devName')}</h4>
                            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{t('about:devRole')}</p>
                        </div>
                    </div>
                    
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <a href="https://www.mr-gfx.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/30 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group/link">
                            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-xl flex items-center justify-center group-hover/link:scale-110 transition-transform">
                                <Globe size={20} />
                            </div>
                            <div>
                                <span className="block text-xs text-gray-400 uppercase font-bold">{t('about:websiteLabel')}</span>
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">mr-gfx.com</span>
                            </div>
                        </a>
                        <a href="https://instagram.com/mohamedreda.gfx" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/30 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-transparent hover:border-purple-200 dark:hover:border-purple-800 transition-all group/link">
                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-xl flex items-center justify-center group-hover/link:scale-110 transition-transform">
                                <AtSign size={20} />
                            </div>
                            <div>
                                <span className="block text-xs text-gray-400 uppercase font-bold">{t('about:instagramLabel')}</span>
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-200">@mohamedreda.gfx</span>
                            </div>
                        </a>
                    </div>
                </div>
            </div>

            <div className="text-center pt-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <Shield size={12} /> {t('about:appVersion')}
                </div>
            </div>
        </div>
    </div>
  );
};
