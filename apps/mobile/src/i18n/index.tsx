import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import messagesDe, { type Messages as MessagesDe } from './messages.de';
import messagesEn from './messages.en';
import { getSetting, setSetting } from '../storage/settings';

export type Language = 'de' | 'en';

const dictionaries: Record<Language, MessagesDe> = {
  de: messagesDe,
  en: messagesEn
};

export type TranslationValues = Record<string, string | number>;

let currentLanguage: Language = 'de';

function setCurrentLanguage(language: Language) {
  currentLanguage = language;
}

export function getCurrentLanguage(): Language {
  return currentLanguage;
}

function resolveKey(dictionary: MessagesDe | string, path: string[]): string | null {
  if (typeof dictionary === 'string') {
    return path.length === 0 ? dictionary : null;
  }
  if (path.length === 0) {
    return null;
  }
  const [head, ...rest] = path;
  const next = (dictionary as Record<string, unknown>)[head];
  if (next === undefined) {
    return null;
  }
  return resolveKey(next as MessagesDe | string, rest);
}

function applyValues(template: string, values?: TranslationValues) {
  if (!values) return template;
  return Object.keys(values).reduce((acc, key) => acc.replaceAll(`{${key}}`, String(values[key])), template);
}

export function translate(key: string, values?: TranslationValues, language: Language = currentLanguage): string {
  const path = key.split('.');
  const dict = dictionaries[language] ?? dictionaries.de;
  const fallback = dictionaries.de;
  const resolved = resolveKey(dict, path) ?? resolveKey(fallback, path) ?? key;
  return applyValues(resolved, values);
}

export type I18nContextValue = {
  language: Language;
  ready: boolean;
  t: (key: string, values?: TranslationValues) => string;
  setLanguage: (language: Language) => Promise<void>;
};

const I18nContext = createContext<I18nContextValue>({
  language: 'de',
  ready: false,
  t: key => applyValues(key, undefined),
  setLanguage: async () => {}
});

export type I18nProviderProps = {
  ready: boolean;
  children: React.ReactNode;
};

export function I18nProvider({ ready, children }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>('de');
  const [loaded, setLoaded] = useState(false);
  const pendingLanguage = useRef<Language | null>(null);

  useEffect(() => {
    setCurrentLanguage(language);
  }, [language]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    let active = true;
    (async () => {
      try {
        const stored = await getSetting('language');
        if (!active) return;
        if (stored === 'de' || stored === 'en') {
          setLanguageState(stored);
          setCurrentLanguage(stored);
        }
      } finally {
        if (active) {
          setLoaded(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [ready]);

  useEffect(() => {
    if (!ready || !pendingLanguage.current) {
      return;
    }
    const next = pendingLanguage.current;
    pendingLanguage.current = null;
    setSetting('language', next).catch(error => {
      console.warn('Failed to persist pending language preference', error);
      pendingLanguage.current = next;
    });
  }, [ready]);

  const persistLanguage = useCallback(
    async (next: Language) => {
      setLanguageState(next);
      setCurrentLanguage(next);
      if (!ready) {
        pendingLanguage.current = next;
        return;
      }
      try {
        await setSetting('language', next);
        pendingLanguage.current = null;
      } catch (error) {
        console.warn('Failed to persist language preference', error);
        pendingLanguage.current = next;
      }
    },
    [ready]
  );

  const translateMemo = useCallback((key: string, values?: TranslationValues) => translate(key, values, language), [language]);

  const value = useMemo(
    () => ({
      language,
      ready: loaded && ready,
      t: translateMemo,
      setLanguage: persistLanguage
    }),
    [language, loaded, ready, translateMemo, persistLanguage]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
