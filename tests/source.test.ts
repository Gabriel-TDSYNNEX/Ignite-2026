import { describe, expect, it } from 'vitest';
import { areas, SOURCE_URL, type Snapshot } from '../src/schema';
import { compareSource, extractSource } from '../scripts/source';

function fixture(changed = false) {
  return `<div id="book-feed">
  <div data-bon-omit class="wp-block-mks-bon-entry"><div class="wp-block-mks-bon-entry" data-bon-entry="900"><h3>Introduction</h3><div class="seb-bon-content__content">An introduction that is not an announcement.</div></div></div>
  ${areas.map((area, index) => `<div class="wp-block-mks-bon-entry"><h2>${area}</h2><div class="wp-block-mks-bon-entry" data-bon-entry="${index + 1}">
  <h${index % 2 ? 3 : 4}>${area} official announcement</h${index % 2 ? 3 : 4}>
  <div class="seb-bon-content__content"><p>Verified body of the announcement, sufficiently long to detect accidental empty or truncated extraction. ${changed && index === 0 ? 'New detail.' : ''}</p><a href="https://example.com/news">Learn more</a></div>
  <div class="seb-bon-content__summary">Do not use the generated summary.</div>
  </div></div>`).join('')}</div>`;
}
describe('Extracción del Book of News', () => {
  it('incluye anuncios h3 y h4, excluye introducciones y no duplica resúmenes', () => {
    const result = extractSource(fixture());
    expect(result.items.map(item => item.area)).toEqual([...areas]);
    expect(result.items.some(item => item.id === 'bon-900')).toBe(false);
    expect(Object.values(result.texts).every(text => !text.includes('generated summary'))).toBe(true);
    expect(result.items[0].sourceUrl).toBe(SOURCE_URL);
  });
  it('conserva IDs y detecta altas, modificaciones y retiradas', () => {
    const baseline = extractSource(fixture()).items;
    const previous: Snapshot = { acceptedAt: new Date().toISOString(), source: SOURCE_URL, items: baseline };
    expect(compareSource(previous, extractSource(fixture()).items)).toEqual({ added: [], modified: [], removed: [] });
    expect(compareSource(previous, extractSource(fixture(true)).items).modified).toEqual(['bon-1']);
    const next = [...baseline.slice(1), { ...baseline[0], id: 'bon-999' }];
    expect(compareSource(previous, next)).toEqual({ added: ['bon-999'], modified: [], removed: ['bon-1'] });
    expect(extractSource(fixture(true)).items[0].id).toBe(baseline[0].id);
  });
  it('falla explícitamente ante HTML vacío, áreas ausentes, IDs repetidos o cuerpos desconocidos', () => {
    expect(() => extractSource('<html>Maintenance</html>')).toThrow('book-feed');
    expect(() => extractSource(fixture().replace('<h2>Windows</h2>', '<h2>Unknown</h2>'))).toThrow('Área desconocida');
    expect(() => extractSource(fixture().replace('data-bon-entry="2"', 'data-bon-entry="1"'))).toThrow('duplicado');
    expect(() => extractSource(fixture().replace('<h4>Azure official announcement</h4>', '<h5>Azure official announcement</h5>'))).toThrow();
  });
});
