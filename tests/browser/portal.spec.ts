import { expect, test } from '@playwright/test';

test('mapa navegable con zoom, migas, historial y enlaces directos bajo una subruta Pages', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle('Ignite Navigator 2026 · TD SYNNEX');
  const map = page.getByRole('region', { name: 'Mapa interactivo de Ignite 2026' });
  await map.getByRole('button', { name: 'Explorar GitHub: 1 novedad', exact: true }).click();
  await expect(map.getByRole('navigation', { name: 'Ruta en el mapa' })).toContainText('GitHub');
  await expect(map.getByRole('button', { name: /Copilot SDK 2.0 para integrar agentes en tus apps/ })).toHaveCount(0);
  await expect(map.getByRole('button', { name: /^Producto GitHub/ })).toBeVisible();
  await map.getByRole('button', { name: /Producto Copilot SDK/ }).click();
  await expect(map.getByRole('navigation', { name: 'Ruta en el mapa' })).toContainText('Copilot SDK');
  await map.getByRole('button', { name: /Copilot SDK 2.0 para integrar agentes en tus apps/ }).click();
  await expect(map.getByRole('heading', { name: 'Copilot SDK 2.0 para integrar agentes en tus apps' })).toBeVisible();
  await map.getByRole('button', { name: /Producto Copilot SDK/ }).click();
  await expect(map.getByRole('navigation', { name: 'Ruta en el mapa' }).getByRole('button', { name: 'Copilot SDK', exact: true })).toHaveAttribute('aria-current', 'location');
  await page.goBack();
  await expect(map.getByRole('heading', { name: 'Copilot SDK 2.0 para integrar agentes en tus apps' })).toBeVisible();
  await map.getByRole('button', { name: 'Ver ficha completa' }).click();
  await expect(page.getByRole('dialog')).toContainText('runtime nativo Rust');
  await page.reload();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await map.getByRole('button', { name: 'Volver un nivel' }).click();
  await map.getByRole('button', { name: 'Ver en el catálogo' }).click();
  await expect(page.getByRole('status')).toContainText('1 novedad');
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await map.getByRole('button', { name: 'Ignite 2026', exact: true }).click();
  await expect(map.getByRole('button', { name: /Explorar Azure/ })).toBeVisible();
  await page.getByRole('searchbox').fill('evaluacion');
  await page.getByLabel('Producto', { exact: true }).selectOption('Microsoft Foundry');
  await expect(page.locator('.article-grid')).toContainText('Mejora los agentes con evidencia de producción');
  await page.getByRole('searchbox').fill('zzzzsinresultados');
  await expect(page.getByRole('heading', { name: 'No encontramos esa combinación' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('searchbox')).toHaveValue('zzzzsinresultados');
});

test('favoritos persistentes, recorrido y presentación con teclado', async ({ page }) => {
  await page.goto('./');
  await page.locator('.highlight-grid').getByRole('button', { name: 'Añadir a mi selección: Microsoft IQ conecta contexto y mejora continua' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Mi selección', exact: false }).first().click();
  await expect(page.locator('.article-grid .article-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Presentar', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Microsoft IQ conecta contexto');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Recorridos', exact: true }).click();
  await page.getByRole('button', { name: /Construye lo que viene/ }).click();
  await expect(page.locator('.timeline-item')).toHaveCount(6);
  await page.getByRole('button', { name: 'Presentar recorrido' }).click();
  await expect(page.getByRole('dialog').getByRole('heading', { level: 2 })).toHaveText('Copilot SDK 2.0 para integrar agentes en tus apps');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('dialog').getByRole('heading', { level: 2 })).toHaveText('Un modelo especializado en tomar decisiones');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('dialog').getByRole('heading', { level: 2 })).toHaveText('Copilot SDK 2.0 para integrar agentes en tus apps');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Explorar', exact: true }).click();
  await expect(page.locator('.progress-metric')).toContainText('3/59');
});

test('móvil sin desbordamiento y alternativa de mapa accesible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390);
  await expect(page.getByRole('button', { name: 'Vista lista', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Explorar Seguridad/ }).click();
  await page.getByRole('button', { name: 'Ver en el catálogo' }).click();
  await expect(page.getByLabel('Área', { exact: true })).toHaveValue('Security');
  await page.getByLabel('Disponibilidad', { exact: true }).selectOption('Próximamente');
  await expect(page.locator('.article-grid .article-card')).toHaveCount(1);
  await page.locator('.article-grid h3 button').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest('dialog')))).toBe(true);
});

test('comunica almacenamiento bloqueado y enlaces retirados', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'setItem', { value: () => { throw new DOMException('Denied', 'SecurityError'); } });
  });
  await page.goto('./#article=bon-no-existe');
  await expect(page.getByRole('alert')).toContainText('no permite guardar');
  await expect(page.getByRole('dialog')).toContainText('Novedad no encontrada');
});
