import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { SOURCE_URL, localeCatalogSchema, snapshotSchema, validateCatalog, validateIdeas, type Article } from '../src/schema';
import { compareSource, extractSource } from './source';

const read = async (path: string): Promise<unknown> => JSON.parse(await readFile(path, 'utf8'));
const save = async (path: string, value: unknown) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
const locales = ['en', 'pt', 'de'] as const;

async function validateTranslations(articles: Article[]) {
  const expectedIds = articles.map(article => article.id).sort();
  const expectedProducts = [...new Set(articles.flatMap(article => article.products))].sort();
  const hashes = new Map(articles.map(article => [article.id, article.hash]));
  for (const locale of locales) {
    const catalog = localeCatalogSchema.parse(await read(`content/translations.${locale}.json`));
    const articleIds = Object.keys(catalog.articles).sort();
    const productNames = Object.keys(catalog.products).sort();
    if (JSON.stringify(articleIds) !== JSON.stringify(expectedIds)) {
      throw new Error(`Cobertura de anuncios incompleta o sobrante en las traducciones ${locale}`);
    }
    if (JSON.stringify(productNames) !== JSON.stringify(expectedProducts)) {
      throw new Error(`Cobertura de productos incompleta o sobrante en las traducciones ${locale}`);
    }
    const stale = expectedIds.filter(id => catalog.articles[id].sourceHash !== hashes.get(id));
    if (stale.length) {
      throw new Error(`Traducciones desactualizadas en ${locale}: ${stale.join(', ')}`);
    }
  }
}

async function download() {
  const response = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Fuente no disponible: HTTP ${response.status}`);
  const { items, texts } = extractSource(await response.text());
  return { acceptedAt: new Date().toISOString(), source: SOURCE_URL, items, texts };
}

async function main() {
  const command = process.argv[2];
  await mkdir('content', { recursive: true });
  if (command === 'fetch') {
    const incoming = await download();
    await save('content/incoming.json', incoming);
    console.log(`${incoming.items.length} anuncios descargados para revisión local. No se publican textos originales.`);
  } else if (command === 'check') {
    const incoming = await download();
    const previous = snapshotSchema.parse(await read('content/snapshot.json'));
    const changes = compareSource(previous, incoming.items);
    if (!Object.values(changes).some(ids => ids.length)) {
      for (const path of ['content/pending.json', 'content/changes.json']) {
        if (existsSync(path)) await unlink(path);
      }
      console.log('Sin cambios en la fuente aceptada.');
      return;
    }
    // Do not change timestamps or open new diffs on repeated checks of the same candidate.
    if (existsSync('content/pending.json')) {
      const pending = snapshotSchema.parse(await read('content/pending.json'));
      if (!Object.values(compareSource(pending, incoming.items)).some(ids => ids.length)) {
        console.log('La propuesta pendiente ya contiene estos cambios.');
        return;
      }
    }
    await save('content/pending.json', { acceptedAt: incoming.acceptedAt, source: SOURCE_URL, items: incoming.items });
    await save('content/changes.json', changes);
    console.log('Revisión requerida:', changes);
  } else if (command === 'accept') {
    const candidatePath = existsSync('content/pending.json') ? 'content/pending.json' : 'content/incoming.json';
    const candidate = snapshotSchema.parse(await read(candidatePath));
    const result = validateCatalog(candidate, await read('content/editorial.json'));
    await validateTranslations(result.articles);
    validateIdeas(await read('content/ideas.json'), result.articles.map(article => article.id));
    await save('content/snapshot.json', { ...candidate, acceptedAt: new Date().toISOString() });
    for (const path of ['content/pending.json', 'content/changes.json']) {
      if (existsSync(path)) await unlink(path);
    }
    console.log(`${candidate.items.length} anuncios aceptados con revisión editorial completa.`);
  } else if (command === 'validate') {
    if (existsSync('content/pending.json')) throw new Error('Hay una actualización pendiente. Revisar y ejecutar npm run content:accept.');
    const result = validateCatalog(await read('content/snapshot.json'), await read('content/editorial.json'));
    await validateTranslations(result.articles);
    validateIdeas(await read('content/ideas.json'), result.articles.map(article => article.id));
    console.log(`Catálogo válido: ${result.articles.length} anuncios con resumen, fuente e ideas.`);
  } else {
    throw new Error('Comando esperado: fetch, check, accept o validate');
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
