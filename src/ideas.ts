import ideaData from '../content/ideas.json';
import { articles } from './catalog';
import { validateIdeas, type Article } from './schema';

const data = validateIdeas(ideaData, articles.map(article => article.id));
export const pillars = data.pillars;
export const ideas = data.ideas;
export const ideaById = new Map(ideas.map(idea => [idea.id, idea]));
export const ideaOrder = new Map(ideas.map((idea, index) => [idea.id, index]));
export const primaryIdea = (article: Pick<Article, 'id'>) => ideaById.get(data.assignments[article.id].primary)!;
export const connectedIdeas = (article: Pick<Article, 'id'>) => data.assignments[article.id].also.map(id => ideaById.get(id)!);
/** Primary idea first, then connected ideas. */
export const allIdeaIds = (article: Pick<Article, 'id'>) => [data.assignments[article.id].primary, ...data.assignments[article.id].also];
export const inIdea = (article: Pick<Article, 'id'>, idea: string, includeConnections: boolean) => {
  const assignment = data.assignments[article.id];
  return assignment.primary === idea || (includeConnections && assignment.also.includes(idea));
};

export const statusKeys = { GA: 'ga', 'En despliegue': 'rolling', Mixto: 'mixed', Preview: 'preview', 'Próximamente': 'soon', 'No especificado': 'unspecified' } as const satisfies Record<Article['status'], string>;
export const statusOrder: Article['status'][] = ['GA', 'En despliegue', 'Mixto', 'Preview', 'Próximamente', 'No especificado'];

export function byIdeaOrder(a: Article, b: Article) {
  return ideaOrder.get(primaryIdea(a).id)! - ideaOrder.get(primaryIdea(b).id)!
    || statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
    || a.title.localeCompare(b.title);
}

export function topProducts(list: Article[], limit: number) {
  const counts = new Map<string, number>();
  for (const article of list) for (const product of article.products) counts.set(product, (counts.get(product) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);
}

export function coIdeas(idea: string, list: Pick<Article, 'id'>[] = articles) {
  const counts = new Map<string, number>();
  for (const article of list) {
    const all = allIdeaIds(article);
    if (all.includes(idea)) for (const other of all) if (other !== idea) counts.set(other, (counts.get(other) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || ideaOrder.get(a[0])! - ideaOrder.get(b[0])!);
}

export function relatedArticles(article: Article, catalog: Article[], limit = 5) {
  const mine = allIdeaIds(article);
  return catalog
    .filter(other => other.id !== article.id)
    .map(other => {
      const theirs = allIdeaIds(other);
      const shared = theirs.filter(id => mine.includes(id)).length;
      return { other, score: shared ? (theirs[0] === mine[0] ? 3 : 0) + shared + (other.area === article.area ? 1 : 0) : 0 };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.other.title.localeCompare(b.other.title))
    .slice(0, limit)
    .map(item => item.other);
}

export function ideaEdges(list: Pick<Article, 'id'>[] = articles) {
  const weights = new Map<string, number>();
  for (const article of list) {
    const all = allIdeaIds(article);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const key = [all[i], all[j]].sort().join('|');
      weights.set(key, (weights.get(key) ?? 0) + 1);
    }
  }
  return [...weights].map(([key, weight]) => { const [a, b] = key.split('|'); return { a, b, weight }; });
}

export const clusterRadius = (count: number) => {
  const r = 15 + 2.6 * Math.sqrt(count);
  return { r, outer: r + 17 + 5.8 * Math.sqrt(Math.max(count - 1, 0)) };
};

/** Places ideas on an ellipse, grouped by pillar with a gap between pillars and arc length proportional to cluster size. */
export function constellationLayout() {
  const W = 1160, H = 860, cx = 580, cy = 430, rx = 365, ry = 290;
  const order = pillars.flatMap(pillar => ideas.filter(idea => idea.pillar === pillar.id).map(idea => idea.id));
  const primaries = new Map(order.map(id => [id, articles.filter(article => primaryIdea(article).id === id)]));
  const size = new Map(order.map(id => [id, clusterRadius(primaries.get(id)!.length).outer]));
  const sum = [...size.values()].reduce((total, value) => total + value, 0);
  const gap = 0.45 * sum / order.length;
  const total = sum + pillars.length * gap;
  let cumulative = gap / 2;
  let last = '';
  const positions = new Map<string, { x: number; y: number; angle: number }>();
  for (const id of order) {
    const pillar = ideaById.get(id)!.pillar;
    if (last && pillar !== last) cumulative += gap;
    last = pillar;
    const angle = -Math.PI / 2 + ((cumulative + size.get(id)! / 2) / total) * Math.PI * 2;
    positions.set(id, { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle), angle });
    cumulative += size.get(id)!;
  }
  return { W, H, cx, cy, order, positions, primaries };
}
