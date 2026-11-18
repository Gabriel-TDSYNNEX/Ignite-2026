import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
import { articles, snapshot } from '../src/catalog';

it('bloquea propuestas sin revisar y acepta solo huellas revisadas sin sobrescribir el texto español', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'ignite-content-test-'));
  const run = (command: string) => spawnSync(process.execPath, [
    resolve('node_modules/tsx/dist/cli.mjs'), resolve('scripts/content.ts'), command,
  ], { cwd: workspace, encoding: 'utf8' });
  const write = (file: string, value: unknown) => writeFileSync(join(workspace, 'content', file), JSON.stringify(value));
  try {
    mkdirSync(join(workspace, 'content'));
    const accepted = { ...snapshot, items: [snapshot.items[0]] };
    const changedHash = '0'.repeat(64);
    const pending = { ...accepted, items: [{ ...accepted.items[0], hash: changedHash }] };
    write('snapshot.json', accepted);
    write('editorial.json', [articles[0]]);
    for (const locale of ['en', 'pt', 'de']) {
      const source = JSON.parse(readFileSync(resolve(`content/translations.${locale}.json`), 'utf8'));
      const id = articles[0].id;
      write(`translations.${locale}.json`, {
        articles: { [id]: source.articles[id] },
        products: Object.fromEntries(articles[0].products.map(product => [product, source.products[product]])),
      });
    }
    expect(run('validate').status).toBe(0);
    write('pending.json', pending);
    write('changes.json', { added: [], modified: [articles[0].id], removed: [] });
    expect(run('validate').stderr).toContain('actualización pendiente');
    expect(run('accept').stderr).toContain('Revisión pendiente');
    expect(JSON.parse(readFileSync(join(workspace, 'content', 'snapshot.json'), 'utf8'))).toEqual(accepted);
    const reviewed = [{ ...articles[0], sourceHash: changedHash, title: 'Un título editorial revisado en español' }];
    write('editorial.json', reviewed);
    expect(run('accept').stderr).toContain('Traducciones desactualizadas');
    for (const locale of ['en', 'pt', 'de']) {
      const localized = JSON.parse(readFileSync(join(workspace, 'content', `translations.${locale}.json`), 'utf8'));
      localized.articles[articles[0].id] = { ...localized.articles[articles[0].id], sourceHash: changedHash, title: `Reviewed title ${locale}` };
      write(`translations.${locale}.json`, localized);
    }
    expect(run('accept').status).toBe(0);
    expect(existsSync(join(workspace, 'content', 'pending.json'))).toBe(false);
    expect(existsSync(join(workspace, 'content', 'changes.json'))).toBe(false);
    expect(JSON.parse(readFileSync(join(workspace, 'content', 'editorial.json'), 'utf8'))).toEqual(reviewed);
    expect(run('validate').status).toBe(0);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}, 30000);
