import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import arTranslations from './ar.json';
import frTranslations from './fr.json';

const resources = {
  ar: {
    translation: arTranslations,
  },
  fr: {
    translation: frTranslations,
  },
};

// Check localStorage for saved language, default to Arabic
const savedLanguage = localStorage.getItem('i18nextLng') || 'ar';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    }
  });

// Apply document direction and lang attribute initially
const initialLang = i18n.language || savedLanguage;
document.documentElement.dir = initialLang === 'ar' ? 'rtl' : 'ltr';
document.documentElement.lang = initialLang;

// Listen for language changes and update HTML direction attributes
i18n.on('languageChanged', (lng) => {
  const dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
  localStorage.setItem('i18nextLng', lng);
});

export default i18n;
