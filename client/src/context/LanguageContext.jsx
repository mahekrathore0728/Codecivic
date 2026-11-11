import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  // Persist language selection in localStorage, default to English for first-time users
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('codecivic_lang') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('codecivic_lang', language);
    // Apply lang attribute to HTML root for accessibility
    document.documentElement.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'hi' : 'en'));
  };

  const setLang = (lang) => {
    if (lang === 'en' || lang === 'hi') {
      setLanguage(lang);
    }
  };

  // Helper function to get nested translation strings safely
  const t = (pathKey, fallback = '') => {
    const keys = pathKey.split('.');
    let current = translations[language] || translations.en;
    for (const key of keys) {
      if (current && current[key] !== undefined) {
        current = current[key];
      } else {
        // Fallback to English if translation is missing
        let fallbackCur = translations.en;
        for (const fbKey of keys) {
          if (fallbackCur && fallbackCur[fbKey] !== undefined) {
            fallbackCur = fallbackCur[fbKey];
          } else {
            return fallback || pathKey;
          }
        }
        return fallbackCur;
      }
    }
    return current;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: setLang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
