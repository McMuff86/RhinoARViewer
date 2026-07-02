import { expect, test } from '@playwright/test';

test('page loads with 3D preview and desktop fallback', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('Rhino AR Viewer');
  await expect(page.locator('#viewport > canvas')).toBeVisible(); // three.js canvas, not the QR canvas

  // Desktop browsers have no immersive-ar → button disabled, fallback hint shown.
  await expect(page.locator('#btn-ar')).toBeDisabled();
  await expect(page.locator('#status')).toContainText('Kein AR verfügbar');
});

test('desktop shows a QR code with the LAN URL for the phone', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#qr-panel')).toBeVisible();
  await expect(page.locator('#qr-url')).toContainText('https://');
});

test('loads the bundled .3dm sample through rhino3dm WASM (worker)', async ({ page }) => {
  await page.goto('/');

  await page.locator('#model-select').selectOption('sample-3dm');

  // Covers fetch → rhino3dm WASM init (locateFile) → parse3dm → three.js.
  await expect(page.locator('#status')).toContainText('Beispiel-Box (.3dm) geladen', {
    timeout: 30_000,
  });
});

test('appearance controls work and stay in sync (desktop ↔ AR overlay)', async ({ page }) => {
  await page.goto('/');

  await page.locator('#opacity-slider').fill('50');
  await expect(page.locator('#ar-opacity-slider')).toHaveValue('50');
  await expect(page.locator('#ar-opacity-value')).toHaveText('50 %');

  await page.locator('#color-picker').fill('#ff0000');
  await page.locator('#btn-color-reset').click();
  await expect(page.locator('#status')).not.toContainText('Fehler');
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
