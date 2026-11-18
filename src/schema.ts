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
