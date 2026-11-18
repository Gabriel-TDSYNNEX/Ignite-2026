import { describe, expect, it } from 'vitest';
import { articles, emptyFilters, filterArticles, routeArticles, routes, snapshot } from '../src/catalog';
import { validateCatalog } from '../src/schema';

describe('Búsqueda del catálogo', () => {
  it('combina términos sin tildes y filtros de producto y perfil', () => {
    const result = filterArticles(articles, { ...emptyFilters, q: 'evaluacion produccion', profile: 'Desarrollo', product: 'Microsoft Foundry' });
    expect(result.some(article => article.id === 'bon-465')).toBe(true);
    expect(result.every(article => article.profiles.includes('Desarrollo') && article.products.includes('Microsoft Foundry'))).toBe(true);
    expect(filterArticles(articles, { ...emptyFilters, q: 'ningunresultadoposible' })).toEqual([]);
  });
  it('combina área y disponibilidad sin mezclar previews con GA', () => {
    const result = filterArticles(articles, { ...emptyFilters, area: 'Security', status: 'GA' });
    expect(result.map(item => item.id)).toEqual(['bon-515', 'bon-522']);
    expect(filterArticles(articles, { ...emptyFilters, area: 'GitHub', product: 'Power BI' })).toEqual([]);
  });
  it('mantiene los recorridos completos y ordenados con anuncios existentes', () => {
    for (const route of routes) {
      const items = routeArticles(route.profile);
      expect(items.map(item => item.id)).toEqual(route.ids);
      expect(items.every(item => item.profiles.includes(route.profile))).toBe(true);
      expect(new Set(route.ids).size).toBe(route.ids.length);
    }
  });
});

describe('Revisión editorial', () => {
  it('rechaza huecos de cobertura, duplicados y revisiones desactualizadas', () => {
    expect(() => validateCatalog(snapshot, articles.slice(1))).toThrow('Cobertura');
    expect(() => validateCatalog(snapshot, [articles[0], ...articles.slice(0, -1)])).toThrow('duplicados');
    expect(() => validateCatalog(snapshot, articles.map((item, index) => index ? item : { ...item, sourceHash: 'antiguo' }))).toThrow('Revisión pendiente');
    expect(() => validateCatalog(snapshot, articles.map((item, index) => index ? item : { ...item, reviewed: false }))).toThrow();
  });
});
