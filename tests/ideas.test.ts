import { describe, expect, it } from 'vitest';
import ideaData from '../content/ideas.json';
import { articles } from '../src/catalog';
import { coIdeas, constellationLayout, ideas, inIdea } from '../src/ideas';
import { validateIdeas } from '../src/schema';

const ids = articles.map(article => article.id);
const clone = () => structuredClone(ideaData) as typeof ideaData & { assignments: Record<string, { primary: string; also: string[] }> };

describe('Taxonomía de ideas', () => {
  it('rechaza asignaciones incompletas, ideas desconocidas, conexiones repetidas e ideas vacías', () => {
    expect(() => validateIdeas(ideaData, [...ids, 'bon-nuevo'])).toThrow('Faltan: bon-nuevo');
    const unknown = clone();
    unknown.assignments[ids[0]].primary = 'no-existe';
    expect(() => validateIdeas(unknown, ids)).toThrow('Idea desconocida');
    const repeated = clone();
    repeated.assignments[ids[0]].also = [repeated.assignments[ids[0]].primary];
    expect(() => validateIdeas(repeated, ids)).toThrow('repetidas');
    const empty = clone();
    const target = empty.assignments[ids[0]].primary;
    for (const item of Object.values(empty.assignments)) if (item.primary === target) item.primary = ideas.find(idea => idea.id !== target)!.id;
    for (const item of Object.values(empty.assignments)) item.also = item.also.filter(id => id !== item.primary);
    expect(() => validateIdeas(empty, ids)).toThrow(`Idea sin anuncios principales: ${target}`);
  });

  it('las conexiones solo cuentan cuando se incluyen y la constelación coloca cada idea dentro del lienzo', () => {
    const connected = articles.find(article => ideaData.assignments[article.id as keyof typeof ideaData.assignments].also.length)!;
    const other = ideaData.assignments[connected.id as keyof typeof ideaData.assignments].also[0];
    expect(inIdea(connected, other, true)).toBe(true);
    expect(inIdea(connected, other, false)).toBe(false);
    expect(coIdeas(other).some(([id]) => id !== other)).toBe(true);
    const layout = constellationLayout();
    expect(layout.order).toHaveLength(ideas.length);
    expect([...layout.primaries.values()].reduce((total, items) => total + items.length, 0)).toBe(articles.length);
    for (const { x, y } of layout.positions.values()) expect(x > 0 && x < layout.W && y > 0 && y < layout.H).toBe(true);
  });
});
