import source from '../content/snapshot.json';
import editorial from '../content/editorial.json';
import { validateCatalog, type Article, type Profile } from './schema';

export const { articles, snapshot } = validateCatalog(source, editorial);
export const productNames = [...new Set(articles.flatMap(article => article.products))].sort((a, b) => a.localeCompare(b, 'es'));
export const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export type Filters = { q: string; area: string; profile: string; product: string; status: string };
export const emptyFilters: Filters = { q: '', area: '', profile: '', product: '', status: '' };
export function filterArticles(items: Article[], filters: Filters) {
  const terms = normalize(filters.q).trim().split(/\s+/).filter(Boolean);
  return items.filter(article => {
    const text = normalize([article.title, article.originalTitle, article.summary, article.impact, article.area, ...article.products, ...article.profiles].join(' '));
    return terms.every(term => text.includes(term))
      && (!filters.area || filters.area === article.area)
      && (!filters.profile || article.profiles.some(profile => profile === filters.profile))
      && (!filters.product || article.products.includes(filters.product))
      && (!filters.status || filters.status === article.status);
  });
}
export const routes: { profile: Profile; subtitle: string; description: string; ids: string[] }[] = [
  { profile: 'Negocio', subtitle: 'De la novedad a la oportunidad', description: 'Valor, productividad y nuevos procesos. Empieza por el impacto y profundiza a tu ritmo.', ids: ['bon-497', 'bon-482', 'bon-459', 'bon-479', 'bon-478', 'bon-487'] },
  { profile: 'Desarrollo', subtitle: 'Construye lo que viene', description: 'Modelos, contexto, herramientas y evaluación para llevar tus ideas a producción.', ids: ['bon-473', 'bon-467', 'bon-501', 'bon-460', 'bon-447', 'bon-465'] },
  { profile: 'IT', subtitle: 'Del piloto a la operación', description: 'Modernización, infraestructura y gobierno para hacer que la innovación funcione.', ids: ['bon-448', 'bon-446', 'bon-456', 'bon-539', 'bon-540', 'bon-516'] },
  { profile: 'Seguridad', subtitle: 'Innovar también es proteger', description: 'Identidades, agentes y datos: descubre cómo evoluciona el perímetro de confianza.', ids: ['bon-514', 'bon-526', 'bon-529', 'bon-522', 'bon-533', 'bon-519'] },
];
export function routeArticles(profile: string) {
  const route = routes.find(candidate => candidate.profile === profile);
  return route ? route.ids.map(id => {
    const article = articles.find(item => item.id === id);
    if (!article) throw new Error(`Anuncio de recorrido no encontrado: ${id}`);
    return article;
  }) : [];
}
