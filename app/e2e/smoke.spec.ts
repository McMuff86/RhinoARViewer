import { expect, test } from '@playwright/test';

test('page loads with 3D preview and desktop fallback', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Rhino AR Viewer');
  await expect(page.locator('#viewport canvas')).toBeVisible();

  // Desktop browsers have no immersive-ar → button disabled, fallback hint shown.
  await expect(page.locator('#btn-ar')).toBeDisabled();
  await expect(page.locator('#status')).toContainText('Kein AR verfügbar');
});

test('loads the bundled .3dm sample through rhino3dm WASM', async ({ page }) => {
  await page.goto('/');

  await page.locator('#model-select').selectOption('sample-3dm');

  // Covers fetch → rhino3dm WASM init (locateFile) → parse3dm → three.js.
  await expect(page.locator('#status')).toContainText('Beispiel-Box (.3dm) geladen', {
    timeout: 30_000,
  });
});

test('shows a readable error for unsupported files', async ({ page }) => {
  await page.goto('/');

  await page.locator('#file-input').setInputFiles({
    name: 'not-a-model.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hello'),
  });

  await expect(page.locator('#status')).toContainText('Nicht unterstütztes Format');
});
