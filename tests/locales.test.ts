import { describe, expect, it } from 'vitest';
import editorial from '../content/editorial.json';
import english from '../content/translations.en.json';
import portuguese from '../content/translations.pt.json';
import german from '../content/translations.de.json';
import messages from '../src/messages.json';

const locales = { en: english, pt: portuguese, de: german };

function keys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => keys(child, prefix ? `${prefix}.${key}` : key)).sort();
}

describe('locale data', () => {
  it('covers every editorial field and product in English, Portuguese, and German', () => {
    const articleIds = editorial.map(article => article.id).sort();
    const products = [...new Set(editorial.flatMap(article => article.products))].sort();
    for (const [locale, content] of Object.entries(locales)) {
      expect(Object.keys(content.articles).sort(), `${locale} article coverage`).toEqual(articleIds);
      expect(Object.keys(content.products).sort(), `${locale} product coverage`).toEqual(products);
      const translationsById = new Map(Object.entries(content.articles));
      for (const article of editorial) {
        const translated = translationsById.get(article.id);
        expect(translated?.sourceHash, `${locale}.${article.id} source hash`).toBe(article.sourceHash);
        expect(translated).toBeDefined();
        if (!translated) throw new Error(`Missing ${locale} translation for ${article.id}`);
        expect(translated.title.trim()).not.toBe('');
        expect(translated.summary.trim()).not.toBe('');
        expect(translated.impact.trim()).not.toBe('');
        expect(translated.application.trim()).not.toBe('');
        expect(translated.technical.trim()).not.toBe('');
      }
    }
  });

  it('keeps interface keys and interpolation placeholders aligned across languages', () => {
    const referenceKeys = keys(messages.es);
    for (const locale of ['en', 'pt', 'de'] as const) {
      expect(keys(messages[locale]), `${locale} interface keys`).toEqual(referenceKeys);
      for (const [key, value] of Object.entries(messages[locale].text)) {
        const reference = messages.es.text[key as keyof typeof messages.es.text];
        const placeholders = (text: string) => [...text.matchAll(/\{\{[^}]+\}\}/g)].map(match => match[0]).sort();
        expect(placeholders(value), `${locale}.${key} placeholders`).toEqual(placeholders(reference));
      }
    }
  });
});
