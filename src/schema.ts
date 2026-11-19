import { z } from 'zod';

export const SOURCE_URL = 'https://news.microsoft.com/events/ignite/2026/book-of-news/';
export const areas = ['Azure', 'Microsoft Foundry', 'GitHub', 'Microsoft Copilot', 'Microsoft Edge', 'Microsoft IQ', 'Security', 'Windows'] as const;
export const profiles = ['Negocio', 'Desarrollo', 'IT', 'Seguridad'] as const;
export const statuses = ['GA', 'Preview', 'Mixto', 'En despliegue', 'Próximamente', 'No especificado'] as const;
const httpsUrl = z.string().url().refine(value => new URL(value).protocol === 'https:', 'Se requiere HTTPS');
export const sourceItemSchema = z.object({
  id: z.string().regex(/^bon-\d+$/),
  area: z.enum(areas),
  originalTitle: z.string().min(5),
  sourceUrl: httpsUrl,
  learnMore: z.array(httpsUrl),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
});
export const snapshotSchema = z.object({
  acceptedAt: z.string().datetime(),
  source: z.literal(SOURCE_URL),
  items: z.array(sourceItemSchema).min(1),
});
export const articleSchema = z.object({
  id: z.string(),
  sourceHash: z.string(),
  title: z.string().min(8),
  summary: z.string().min(40),
  impact: z.string().min(25),
  application: z.string().min(25),
  technical: z.string().min(25),
  products: z.array(z.string().min(2)).min(1),
  profiles: z.array(z.enum(profiles)).min(1),
  status: z.enum(statuses),
  reviewed: z.literal(true),
});
export const localeCatalogSchema = z.object({
  articles: z.record(z.string(), articleSchema.pick({
    sourceHash: true,
    title: true,
    summary: true,
    impact: true,
    application: true,
    technical: true,
  }).strict()),
  products: z.record(z.string(), z.string().min(1)),
});
export const editorialSchema = z.array(articleSchema).min(1);
export type SourceItem = z.infer<typeof sourceItemSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;
export type Editorial = z.infer<typeof articleSchema>;
export type Article = SourceItem & Editorial;
export type LocaleCatalog = z.infer<typeof localeCatalogSchema>;
export type Profile = typeof profiles[number];
export type Area = typeof areas[number];

export function validateCatalog(snapshotInput: unknown, editorialInput: unknown) {
  const snapshot = snapshotSchema.parse(snapshotInput);
  const editorial = editorialSchema.parse(editorialInput);
  for (const [label, ids] of [
    ['fuente', snapshot.items.map(item => item.id)],
    ['editorial', editorial.map(item => item.id)],
  ] as const) {
    if (new Set(ids).size !== ids.length) throw new Error(`IDs duplicados en ${label}`);
  }
  if (snapshot.items.length !== editorial.length) throw new Error('Cobertura editorial incompleta o anuncios retirados sin revisar');
  const articles: Article[] = snapshot.items.map(source => {
    const text = editorial.find(item => item.id === source.id);
    if (!text || text.sourceHash !== source.hash) throw new Error(`Revisión pendiente: ${source.id} ${source.originalTitle}`);
    return { ...source, ...text };
  });
  return { snapshot, articles };
}

const localized = z.object({ es: z.string().min(2), en: z.string().min(2), pt: z.string().min(2), de: z.string().min(2) }).strict();
export const ideaIcons = ['layout-dashboard', 'bot', 'briefcase', 'trending-up', 'rocket', 'cpu', 'network', 'refresh-ccw', 'badge-check', 'radar', 'shield-check', 'database', 'wrench', 'server', 'monitor'] as const;
const pillarSchema = z.object({ id: z.string().regex(/^[a-z-]+$/), name: localized, description: localized }).strict();
const ideaSchema = z.object({
  id: z.string().regex(/^[a-z-]+$/),
  pillar: z.string(),
  hue: z.number().int().min(0).max(359),
  icon: z.enum(ideaIcons),
  short: localized,
  name: localized,
  tagline: localized,
  description: localized,
}).strict();
const assignmentSchema = z.object({ primary: z.string(), also: z.array(z.string()) }).strict();
export const ideasFileSchema = z.object({
  pillars: z.array(pillarSchema).min(1),
  ideas: z.array(ideaSchema).min(1),
  assignments: z.record(z.string(), assignmentSchema),
}).strict();
export type Pillar = z.infer<typeof pillarSchema>;
export type Idea = z.infer<typeof ideaSchema>;
export type IdeaIcon = Idea['icon'];

export function validateIdeas(input: unknown, articleIds: string[]) {
  const data = ideasFileSchema.parse(input);
  const pillarIds = new Set(data.pillars.map(pillar => pillar.id));
  const ideaIds = new Set(data.ideas.map(idea => idea.id));
  if (pillarIds.size !== data.pillars.length) throw new Error('Pilares duplicados');
  if (ideaIds.size !== data.ideas.length) throw new Error('Ideas duplicadas');
  for (const idea of data.ideas) if (!pillarIds.has(idea.pillar)) throw new Error(`Pilar desconocido en ${idea.id}: ${idea.pillar}`);
  for (const pillar of pillarIds) if (!data.ideas.some(idea => idea.pillar === pillar)) throw new Error(`Pilar sin ideas: ${pillar}`);
  const assigned = Object.keys(data.assignments).sort();
  const expected = [...articleIds].sort();
  const missing = expected.filter(id => !data.assignments[id]);
  const extra = assigned.filter(id => !expected.includes(id));
  if (missing.length || extra.length) throw new Error(`Asignación de ideas incompleta. Faltan: ${missing.join(', ') || '-'}; sobran: ${extra.join(', ') || '-'}`);
  for (const [id, { primary, also }] of Object.entries(data.assignments)) {
    for (const idea of [primary, ...also]) if (!ideaIds.has(idea)) throw new Error(`Idea desconocida en ${id}: ${idea}`);
    if (also.includes(primary) || new Set(also).size !== also.length) throw new Error(`Ideas conectadas repetidas en ${id}`);
  }
  for (const idea of data.ideas) if (!Object.values(data.assignments).some(item => item.primary === idea.id)) throw new Error(`Idea sin anuncios principales: ${idea.id}`);
  return data;
}
