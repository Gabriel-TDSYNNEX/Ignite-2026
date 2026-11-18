import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import { areas, SOURCE_URL, type Snapshot, type SourceItem } from '../src/schema';

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();

export function extractSource(html: string): { items: SourceItem[]; texts: Record<string, string> } {
  const $ = load(html);
  const root = $('#book-feed');
  if (root.length !== 1) throw new Error('Estructura desconocida: falta book-feed');
  const items: SourceItem[] = [];
  const texts: Record<string, string> = {};
  const foundAreas = new Set<string>();
  const used = new Set<string>();
  root.find('.wp-block-mks-bon-entry').each((_, element) => {
    const entry = $(element);
    if (entry.is('[data-bon-omit]') || entry.parents('[data-bon-omit]').length) return;
    const heading = entry.children('h3,h4').first();
    if (!heading.length) return;
    // Category containers have no content of their own; announcements do.
    const content = entry.find('.seb-bon-content__content').filter((_, node) =>
      $(node).closest('.wp-block-mks-bon-entry')[0] === element);
    if (!content.length) return;
    const areaTitle = normalize(entry.parents('.wp-block-mks-bon-entry').last().children('h2').text());
    const area = areas.find(candidate => candidate === areaTitle);
    if (!area) throw new Error(`Área desconocida: ${areaTitle}`);
    const numericId = entry.attr('data-bon-entry');
    if (!numericId || !/^\d+$/.test(numericId)) throw new Error('Anuncio sin ID estable');
    const id = `bon-${numericId}`;
    if (used.has(id)) throw new Error(`ID oficial duplicado: ${id}`);
    used.add(id);
    const text = normalize(content.text());
    if (text.length < 60) throw new Error(`Contenido vacío o truncado: ${id}`);
    const originalTitle = normalize(heading.text());
    const learnMore = [...new Set(content.find('a[href]').map((_, a) => $(a).attr('href')).get()
      .filter((url): url is string => Boolean(url?.startsWith('https://'))))];
    const headingId = heading.attr('id');
    const sourceUrl = headingId ? `${SOURCE_URL}#${encodeURIComponent(headingId)}` : SOURCE_URL;
    const hash = createHash('sha256').update(JSON.stringify({ area, originalTitle, text, learnMore })).digest('hex');
    items.push({ id, area, originalTitle, sourceUrl, learnMore, hash });
    texts[id] = text;
    foundAreas.add(area);
  });
  if (areas.some(area => !foundAreas.has(area))) throw new Error('Extracción incompleta: faltan áreas oficiales');
  if (items.length < areas.length) throw new Error('Extracción incompleta');
  // Every official body must belong to exactly one recognized announcement, including h3 entries.
  if (root.find('.seb-bon-content__content').filter((_, e) =>
    $(e).parents('[data-bon-omit]').length === 0).length !== items.length) {
    throw new Error('Hay cuerpos oficiales sin clasificar; revisar estructura');
  }
  return { items, texts };
}

export function compareSource(previous: Snapshot, next: SourceItem[]) {
  const old = new Map(previous.items.map(item => [item.id, item]));
  const incoming = new Map(next.map(item => [item.id, item]));
  return {
    added: next.filter(item => !old.has(item.id)).map(item => item.id),
    modified: next.filter(item => old.has(item.id) && old.get(item.id)?.hash !== item.hash).map(item => item.id),
    removed: previous.items.filter(item => !incoming.has(item.id)).map(item => item.id),
  };
}
