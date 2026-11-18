import { useEffect, useState } from 'react';
import messageData from './messages.json';
import { localeCatalogSchema, type Article, type Area, type Profile, type LocaleCatalog } from './schema';

export const localeOptions = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
  { value: 'de', label: 'Deutsch' },
] as const;
export type Locale = typeof localeOptions[number]['value'];
type MessageTree = typeof messageData.es;
const messages = messageData as Record<Locale, MessageTree>;
const translationLoaders = {
  en: () => import('../content/translations.en.json'),
  pt: () => import('../content/translations.pt.json'),
  de: () => import('../content/translations.de.json'),
};
const loadedTranslations: Partial<Record<Exclude<Locale, 'es'>, LocaleCatalog>> = {};
const localeKey = 'tdsynnex-ignite-2026:language';
const localeTags: Record<Locale, string> = { en: 'en-US', es: 'es-ES', pt: 'pt-BR', de: 'de-DE' };

function isLocale(value: string | null): value is Locale {
  return localeOptions.some(option => option.value === value);
}

function browserLocale(): Locale {
  for (const language of navigator.languages) {
    const base = language.toLowerCase().split('-')[0];
    if (base === 'en' || base === 'es' || base === 'pt' || base === 'de') return base;
  }
  return 'es';
}

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const saved = localStorage.getItem(localeKey);
      return isLocale(saved) ? saved : browserLocale();
    } catch (error) {
      console.error('No se pudo leer el idioma guardado', error);
      return browserLocale();
    }
  });
  const [contentLocale, setContentLocale] = useState<Locale>('es');
  const [translationLoadError, setTranslationLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (locale === 'es') {
      setContentLocale('es');
      setTranslationLoadError(false);
      return () => { cancelled = true; };
    }
    translationLoaders[locale]().then(module => {
      loadedTranslations[locale] = localeCatalogSchema.parse(module.default);
      if (!cancelled) {
        setContentLocale(locale);
        setTranslationLoadError(false);
      }
    }).catch(error => {
      console.error(`No se pudo cargar el catálogo ${locale}`, error);
      if (!cancelled) {
        setContentLocale('es');
        setTranslationLoadError(true);
      }
    });
    return () => { cancelled = true; };
  }, [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = `Ignite Navigator 2026 · TD SYNNEX`;
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', messages[locale].description);
    try {
      localStorage.setItem(localeKey, locale);
    } catch (error) {
      console.error('No se pudo guardar el idioma seleccionado', error);
    }
  }, [locale]);

  function setLocale(next: Locale) {
    setLocaleState(next);
  }

  return { locale, setLocale, ui: messages[locale], localeTag: localeTags[locale], contentLocale, translationLoadError };
}

export function text(locale: Locale, key: keyof MessageTree['text'], values: Record<string, string | number> = {}) {
  return Object.entries(values).reduce(
    (result, [name, value]) => result.replaceAll(`{{${name}}}`, String(value)),
    messages[locale].text[key],
  );
}

export function areaLabel(locale: Locale, area: Area) {
  return messages[locale].area[area];
}

export function profileLabel(locale: Locale, profile: Profile) {
  return messages[locale].profile[profile];
}

export function statusLabel(locale: Locale, status: Article['status']) {
  return messages[locale].status[status];
}

export function routeCopy(locale: Locale, profile: Profile) {
  return messages[locale].routes[profile];
}

export function productLabel(locale: Locale, product: string) {
  return locale === 'es' ? product : loadedTranslations[locale]?.products[product] ?? product;
}

export function localizeArticle(article: Article, locale: Locale): Article {
  if (locale === 'es') return article;
  const translated = loadedTranslations[locale]?.articles[article.id];
  if (!translated) throw new Error(`Falta la traducción ${locale} para ${article.id}`);
  return { ...article, ...translated };
}
