import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.title.startsWith('cambia todo el portal')) return;
  await page.addInitScript(() => localStorage.setItem('tdsynnex-ignite-2026:language', 'es'));
});

test('la política de seguridad bloquea scripts inline', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.explorer .node-area')).toHaveCount(8);
  const blocked = await page.evaluate(() => new Promise<boolean>(resolve => {
    const timer = setTimeout(() => resolve(false), 2000);
    document.addEventListener('securitypolicyviolation', event => {
      if (event.blockedURI === 'inline' && event.violatedDirective.startsWith('script-src')) {
        clearTimeout(timer);
        resolve(true);
      }
    });
    const script = document.createElement('script');
    script.textContent = "document.documentElement.setAttribute('data-csp-inline-executed', 'true')";
    document.head.appendChild(script);
  }));
  expect(blocked).toBe(true);
  await expect(page.locator('html')).not.toHaveAttribute('data-csp-inline-executed');
});

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

test('cambia todo el portal entre español, inglés, portugués y alemán y recuerda la elección', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await page.locator('.language-picker select').selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('.hero h1')).toContainText('What matters.');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Explore Microsoft Ignite 2026/);
  await expect(page.locator('.explorer')).toHaveAttribute('aria-label', 'Ignite 2026 interactive map');
  await expect(page.locator('.node-area').first()).toHaveAttribute('aria-label', /Explore Azure: \d+ news items/);
  const map = page.locator('.explorer');
  await map.getByRole('button', { name: 'Explore GitHub: 1 news item', exact: true }).click();
  await map.getByRole('button', { name: 'Product Copilot SDK: 1 announcement', exact: true }).click();
  await map.getByRole('button', { name: /Copilot SDK 2.0 to integrate agents into your apps/ }).click();
  await expect(map.locator('.explorer-center h3')).toHaveText('Copilot SDK 2.0 to integrate agents into your apps');
  await page.locator('.language-picker select').selectOption('pt');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt');
  await expect(page.locator('.hero h1')).toContainText('O que importa.');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Explore o Microsoft Ignite 2026/);
  await expect(map.locator('.explorer-center h3')).toHaveText('Copilot SDK 2.0 para integrar agentes em seus aplicativos');
  await expect(page.getByPlaceholder(/O que você quer descobrir/)).toBeAttached();
  await page.locator('.language-picker select').selectOption('de');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.locator('.hero h1')).toContainText('Was zählt.');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Entdecken Sie Microsoft Ignite 2026/);
  await expect(map.locator('.explorer-center h3')).toHaveText('Copilot SDK 2.0 zur Integration von Agenten in Ihre Apps');
  await expect(page.locator('.language-picker select')).toHaveValue('de');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.locator('.hero h1')).toContainText('Was zählt.');
  await page.locator('.language-picker select').selectOption('es');
  await expect(page.locator('.hero h1')).toContainText('Lo que importa.');
  await expect(map.locator('.explorer-center h3')).toHaveText('Copilot SDK 2.0 para integrar agentes en tus apps');

  const detectedContext = await page.context().browser()!.newContext({ locale: 'de-DE' });
  const detectedPage = await detectedContext.newPage();
  await detectedPage.goto(page.url());
  await expect(detectedPage.locator('html')).toHaveAttribute('lang', 'de');
  await expect(detectedPage.locator('.hero h1')).toContainText('Was zählt.');
  await detectedContext.close();
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

test('mapa por ideas con conexiones, cruce, disponibilidad y tema', async ({ page }) => {
  await page.goto('./');
  const explorer = page.locator('.explorer');
  await page.getByRole('group', { name: 'Organizar por' }).getByRole('button', { name: 'Ideas' }).click();
  await expect(page).toHaveURL(/by=idea/);
  await expect(explorer.locator('.node-idea')).toHaveCount(15);
  const runtime = explorer.getByRole('button', { name: /^Explorar la idea Agentes en producción/ });
  await runtime.hover();
  await expect(explorer.locator('.node-shared').first()).toBeVisible();
  await runtime.click();
  await expect(page).toHaveURL(/map=idea%3Aagent-runtime|map=idea:agent-runtime/);
  const cross = page.getByRole('group', { name: 'Cruzar con áreas' });
  await cross.getByRole('button', { name: /Azure/ }).click();
  await expect(page).toHaveURL(/cross=Azure/);
  await expect(explorer.locator('.node-article')).toHaveCount(4);
  await page.getByRole('group', { name: 'Disponibilidad' }).getByRole('button', { name: /GA/ }).click();
  await expect(page).toHaveURL(/st=GA/);
  await expect(explorer.locator('.node-article')).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('group', { name: 'Cruzar con áreas' }).getByRole('button', { name: /Azure/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(explorer.locator('.node-article')).toHaveCount(1);
  await page.keyboard.press('/');
  await expect(page.locator('#search')).toBeFocused();
  await page.goto('./');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
  const theme = page.locator('.theme-toggle');
  await theme.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await theme.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
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
  await page.getByRole('combobox', { name: 'Disponibilidad', exact: true }).selectOption('Próximamente');
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
