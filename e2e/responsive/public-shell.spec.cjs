const path = require('node:path');
const fs = require('node:fs');
const { test, expect } = require('@playwright/test');

const screenshotsDirectory = path.resolve(
  __dirname,
  '../../docs/frontend-responsive/evidence'
);

const viewportMatrix = [
  ['mobile', 320, 568],
  ['mobile', 360, 640],
  ['mobile', 375, 667],
  ['mobile', 375, 812],
  ['mobile', 390, 844],
  ['mobile', 393, 852],
  ['mobile', 412, 915],
  ['mobile', 430, 932],
  ['mobile', 480, 960],
  ['tablet', 500, 838],
  ['tablet', 600, 960],
  ['tablet', 640, 1024],
  ['tablet', 768, 1024],
  ['tablet', 800, 1340],
  ['tablet', 838, 500],
  ['tablet', 960, 600],
  ['tablet', 1024, 640],
  ['tablet', 1024, 768],
  ['tablet', 1340, 800],
  ['desktop', 1024, 600],
  ['desktop', 1024, 768],
  ['desktop', 1280, 720],
  ['desktop', 1280, 800],
  ['desktop', 1366, 768],
  ['desktop', 1440, 900],
  ['desktop', 1600, 900],
  ['desktop', 1920, 1080],
];

const themeCases = [
  { name: 'light', preference: 'light', system: 'light', effective: 'light' },
  { name: 'dark', preference: 'dark', system: 'dark', effective: 'dark' },
];

const systemThemeCases = ['light', 'dark'].flatMap((system) =>
  ['mobile', 'tablet', 'desktop'].map((group) => {
    const viewport = viewportMatrix.find(([sizeGroup]) => sizeGroup === group);
    return {
      name: `system-${system}`,
      preference: 'system',
      system,
      effective: system,
      group,
      width: viewport[1],
      height: viewport[2],
    };
  })
);

const protectedRouteSamples = [
  '/dashboard',
  '/users',
  '/roles',
  '/identity/generate',
  '/materials/list',
  '/extrusion/rack-ingress',
  '/production/telares',
  '/production/laminado',
  '/production/globo',
  '/corte/laminado-orders',
  '/warehouse/receive',
  '/warehouse/reports',
];

async function configureTheme(page, theme) {
  await page.emulateMedia({ colorScheme: theme.system });
  await page.addInitScript(({ preference }) => {
    localStorage.setItem(
      'tf-theme-storage',
      JSON.stringify({
        state: { theme: preference === 'system' ? 'dark' : preference, themePreference: preference },
        version: 1,
      })
    );
  }, { preference: theme.preference });
}

async function waitForInitialMotion(page) {
  await page.evaluate(() => Promise.all(
    document.getAnimations().map((animation) => animation.finished.catch(() => undefined))
  ));
}

async function inspectLoginLayout(page) {
  return page.evaluate(() => {
    const visibleControls = [...document.querySelectorAll('button, input, a')]
      .filter((element) => {
        const style = getComputedStyle(element);
        return element.getClientRects().length > 0
          && style.display !== 'none'
          && style.visibility !== 'hidden';
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          label: element.getAttribute('aria-label') || element.textContent?.trim() || element.getAttribute('placeholder') || '',
          left: rect.left,
          right: rect.right,
        };
      });

    return {
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      offscreenControls: visibleControls.filter((control) =>
        control.left < -1 || control.right > window.innerWidth + 1
      ),
    };
  });
}

for (const theme of themeCases) {
  for (const [group, width, height] of viewportMatrix) {
    test(`login ${theme.name} ${group} ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await configureTheme(page, theme);
      await page.goto('/login');
      await expect(page.getByRole('heading', { name: 'Acceso al sistema' })).toBeVisible();
      await expect(page.getByLabel('Usuario o No. de Nómina')).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Contraseña' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Ingresar al sistema' })).toBeVisible();
      await waitForInitialMotion(page);

      const layout = await inspectLoginLayout(page);
      expect(layout.theme).toBe(theme.effective);
      expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
      expect(layout.offscreenControls).toEqual([]);

      const evidenceSize = `${width}x${height}`;
      if ([[390, 844], [800, 1340], [1366, 768]].some(([w, h]) => w === width && h === height)) {
        fs.mkdirSync(screenshotsDirectory, { recursive: true });
        await page.screenshot({
          path: path.join(screenshotsDirectory, `AUTH-LOGIN-PUBLIC-${evidenceSize}-${theme.name}-DEFAULT.png`),
          fullPage: true,
        });
      }
    });
  }
}

for (const theme of systemThemeCases) {
  test(`login ${theme.name} ${theme.group} ${theme.width}x${theme.height}`, async ({ page }) => {
    await page.setViewportSize({ width: theme.width, height: theme.height });
    await configureTheme(page, theme);
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Acceso al sistema' })).toBeVisible();
    await waitForInitialMotion(page);

    const layout = await inspectLoginLayout(page);
    expect(layout.theme).toBe(theme.effective);
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.offscreenControls).toEqual([]);
  });
}

test('login dark mobile muestra errores comprensibles al enviar vacío', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await configureTheme(page, themeCases[1]);
  await page.goto('/login');
  await waitForInitialMotion(page);
  await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
  await expect(page.getByText('El usuario o número de nómina es obligatorio.')).toBeVisible();
  await expect(page.getByText('La contraseña es obligatoria.')).toBeVisible();
  fs.mkdirSync(screenshotsDirectory, { recursive: true });
  await page.screenshot({
    path: path.join(screenshotsDirectory, 'AUTH-LOGIN-PUBLIC-320x568-dark-VALIDATION.png'),
    fullPage: true,
  });
});

test('login permite mostrar y ocultar la contraseña con un control etiquetado', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await configureTheme(page, themeCases[1]);
  await page.goto('/login');
  await waitForInitialMotion(page);

  const password = page.getByRole('textbox', { name: 'Contraseña' });
  await password.fill('qa-temporal');
  await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(password).toHaveValue('qa-temporal');
  await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
  await expect(password).toHaveAttribute('type', 'password');
  await expect(password).toHaveValue('qa-temporal');
});

for (const route of protectedRouteSamples) {
  test(`sin sesión ${route} redirige a login`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Acceso al sistema' })).toBeVisible();
  });
}
