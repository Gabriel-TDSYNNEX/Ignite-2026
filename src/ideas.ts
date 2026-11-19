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
