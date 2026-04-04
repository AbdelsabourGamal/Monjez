import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import commonEn from './en/common.json';
import dashboardEn from './en/dashboard.json';
import quotesEn from './en/quotes.json';
import contractsEn from './en/contracts.json';
import documentsEn from './en/documents.json';
import clientsEn from './en/clients.json';
import productsEn from './en/products.json';
import settingsEn from './en/settings.json';
import accountingEn from './en/accounting.json';
import aiEn from './en/ai.json';
import employeesEn from './en/employees.json';
import companiesEn from './en/companies.json';
import legalEn from './en/legal.json';
import timeTrackerEn from './en/timeTracker.json';
import recurringEn from './en/recurring.json';
import diwanEn from './en/diwan.json';
import bankComplianceEn from './en/bankCompliance.json';
import clientPortalEn from './en/clientPortal.json';
import aboutEn from './en/about.json';
import qanoonaiEn from './en/qanoonai.json';
import timeEn from './en/time.json';
import numbersEn from './en/numbers.json';

import commonAr from './ar/common.json';
import dashboardAr from './ar/dashboard.json';
import quotesAr from './ar/quotes.json';
import contractsAr from './ar/contracts.json';
import documentsAr from './ar/documents.json';
import clientsAr from './ar/clients.json';
import productsAr from './ar/products.json';
import settingsAr from './ar/settings.json';
import accountingAr from './ar/accounting.json';
import aiAr from './ar/ai.json';
import employeesAr from './ar/employees.json';
import companiesAr from './ar/companies.json';
import legalAr from './ar/legal.json';
import timeTrackerAr from './ar/timeTracker.json';
import recurringAr from './ar/recurring.json';
import diwanAr from './ar/diwan.json';
import bankComplianceAr from './ar/bankCompliance.json';
import clientPortalAr from './ar/clientPortal.json';
import aboutAr from './ar/about.json';
import qanoonaiAr from './ar/qanoonai.json';
import timeAr from './ar/time.json';
import numbersAr from './ar/numbers.json';

const resources = {
  en: {
    common: commonEn,
    dashboard: dashboardEn,
    quotes: quotesEn,
    contracts: contractsEn,
    documents: documentsEn,
    clients: clientsEn,
    products: productsEn,
    settings: settingsEn,
    accounting: accountingEn,
    ai: aiEn,
    employees: employeesEn,
    companies: companiesEn,
    legal: legalEn,
    timeTracker: timeTrackerEn,
    recurring: recurringEn,
    diwan: diwanEn,
    bankCompliance: bankComplianceEn,
    clientPortal: clientPortalEn,
    about: aboutEn,
    qanoonai: qanoonaiEn,
    time: timeEn,
    numbers: numbersEn,
  },
  ar: {
    common: commonAr,
    dashboard: dashboardAr,
    quotes: quotesAr,
    contracts: contractsAr,
    documents: documentsAr,
    clients: clientsAr,
    products: productsAr,
    settings: settingsAr,
    accounting: accountingAr,
    ai: aiAr,
    employees: employeesAr,
    companies: companiesAr,
    legal: legalAr,
    timeTracker: timeTrackerAr,
    recurring: recurringAr,
    diwan: diwanAr,
    bankCompliance: bankComplianceAr,
    clientPortal: clientPortalAr,
    about: aboutAr,
    qanoonai: qanoonaiAr,
    time: timeAr,
    numbers: numbersAr,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

// Handle RTL
i18n.on('languageChanged', (lng) => {
  document.dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
});

// Initial RTL check
document.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
document.documentElement.lang = i18n.language;

export default i18n;
