import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { unzipSync, strFromU8 } from 'fflate';

test('@claim:sample-sandbox @claim:no-account sample data is ready without an account and does not use browser storage', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByRole('heading', { name: 'Review the sample archive' })).toBeVisible();
  await expect(page.getByText('4', { exact: true })).toBeVisible();
  await expect(page.locator('.report .totals div').nth(2).locator('strong')).toHaveText('2');
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith('demo:')));
  expect(keys).toEqual([]);
});

test('@claim:portable-archive @claim:mbox-import imports MBOX and exports HTML, attachments, original EML, hashes, and a manifest', async ({ page }) => {
  await page.goto('/demo');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save portable archive' }).first().click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  const bytes = new Uint8Array(await import('node:fs').then((fs) => fs.readFileSync(path!)));
  const files = unzipSync(bytes);
  expect(Object.keys(files)).toEqual(expect.arrayContaining(['index.html', 'manifest.json', 'eml/00001.eml', 'eml/00004.eml', 'attachments/00001/01-tickets.pdf', 'attachments/00003/01-recipe-card.jpg']));
  const manifest = JSON.parse(strFromU8(files['manifest.json']));
  expect(manifest.counts).toEqual({ folders: 1, messages: 4, attachments: 2 });
  expect(manifest.messages.every((message: { hash: string }) => /^[a-f0-9]{64}$/.test(message.hash))).toBe(true);
  expect(manifest.messages[0]).toMatchObject({ emlPath: 'eml/00001.eml' });
  expect(manifest.messages[0].attachments[0]).toMatchObject({ archivePath: 'attachments/00001/01-tickets.pdf' });
  expect(strFromU8(files['index.html'])).toContain('Open original EML');
  expect(strFromU8(files['index.html'])).toContain('attachments/00001/01-tickets.pdf');
});

test('@claim:mime-attachment-completeness exports unnamed, continued-name, and empty attachments without a false success', async ({ page }) => {
  const message = `Message-ID: <continued-ui@test>\r\nDate: Tue, 18 Aug 2026 09:14:00 +0000\r\nFrom: One <one@test>\r\nSubject: Every attachment\r\nContent-Type: multipart/mixed; boundary="b"\r\n\r\n--b\r\nContent-Type: application/octet-stream\r\nContent-Disposition: attachment\r\nContent-Transfer-Encoding: base64\r\n\r\nSGVsbG8=\r\n--b\r\nContent-Type: application/pdf\r\nContent-Disposition: attachment; filename*0*=UTF-8''quarterly%20; filename*1*=report.pdf\r\nContent-Transfer-Encoding: base64\r\n\r\nUERG\r\n--b--\r\n`;
  const withEmptyAttachment = message.replace('--b--\r\n', '--b\r\nContent-Type: application/octet-stream\r\nContent-Disposition: attachment; filename="empty.dat"\r\nContent-Transfer-Encoding: base64\r\n\r\n\r\n--b--\r\n');
  await page.goto('/app');
  await page.locator('[data-file-input]').setInputFiles({ name: 'continued.eml', mimeType: 'message/rfc822', buffer: Buffer.from(withEmptyAttachment) });
  await expect(page.getByRole('heading', { name: 'Verification report' })).toBeVisible();
  await expect(page.locator('.report .totals div').nth(2).locator('strong')).toHaveText('3');
  await expect(page.getByText('All checks passed')).toBeVisible();
  await expect(page.getByText('Every attachment')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save portable archive' }).last().click();
  const download = await downloadPromise;
  const path = await download.path();
  const bytes = new Uint8Array(await import('node:fs').then((fs) => fs.readFileSync(path!)));
  const files = unzipSync(bytes);
  const emptyPath = 'attachments/00001/03-empty.dat';
  const manifest = JSON.parse(strFromU8(files['manifest.json']));
  expect(files[emptyPath]).toBeDefined();
  expect(files[emptyPath]).toHaveLength(0);
  expect(manifest.counts.attachments).toBe(3);
  expect(manifest.messages[0].attachments[2]).toMatchObject({
    name: 'empty.dat',
    size: 0,
    hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    archivePath: emptyPath,
    error: null
  });
  expect(strFromU8(files['index.html'])).toContain(`href="${emptyPath}"`);
});

test('@claim:local-only demo sends no archive data off origin', async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const outgoing = new Set<string>();
  page.on('request', (request) => outgoing.add(new URL(request.url()).origin));
  await page.goto(`${baseURL}/demo`);
  await page.getByRole('button', { name: 'Save portable archive' }).first().click();
  await page.waitForTimeout(150);
  expect([...outgoing]).toEqual([new URL(baseURL!).origin]);
  await context.close();
});

test('@claim:no-analytics public and demo use no analytics requests or cookies', async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const requests: Array<{ method: string; type: string; origin: string }> = [];
  page.on('request', (request) => requests.push({
    method: request.method(),
    type: request.resourceType(),
    origin: new URL(request.url()).origin
  }));

  await page.goto(`${baseURL}/`);
  await page.goto(`${baseURL}/privacy`);
  await page.goto(`${baseURL}/demo`);
  await page.getByRole('button', { name: 'Save portable archive' }).first().click();
  await page.waitForTimeout(150);

  expect(requests.filter((request) => ['fetch', 'xhr', 'eventsource'].includes(request.type))).toEqual([]);
  expect([...new Set(requests.map((request) => request.origin))]).toEqual([new URL(baseURL!).origin]);
  expect(requests.every((request) => request.method === 'GET')).toBe(true);
  expect(await context.cookies()).toEqual([]);
  await context.close();
});

test('@claim:paid-history a valid license saves a local export receipt', async ({ page }) => {
  await page.route('https://api.sociobot.in/api/v1/products/mail-escape-hatch/verify?*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, reason: 'ok', expires_at: null }) });
  });
  await page.goto('/app');
  await page.getByRole('button', { name: 'Restore a license' }).click();
  await page.getByLabel('License token').fill('recorded-fixture-license');
  await page.getByRole('button', { name: 'Verify license' }).click();
  await expect(page.getByText('License active. New export receipts will be saved on this computer.')).toBeVisible();
  await page.locator('[data-file-input]').setInputFiles({
    name: 'receipt.eml',
    mimeType: 'message/rfc822',
    buffer: Buffer.from('From: one@test\nDate: Tue, 18 Aug 2026 09:14:00 +0000\nSubject: Receipt proof\n\nHello')
  });
  await expect(page.getByRole('heading', { name: 'Verification report' })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save portable archive' }).last().click();
  await downloadPromise;
  const receipts = await page.evaluate(() => JSON.parse(localStorage.getItem('archive-history:mail-escape-hatch') || '[]'));
  expect(receipts).toHaveLength(1);
  expect(receipts[0]).toMatchObject({ source: 'receipt.eml', messages: 1, attachments: 0 });
});

test('@claim:offline-reload demo reloads after the first visit without a network', async ({ browser, baseURL }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseURL}/demo`);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Review the sample archive' })).toBeVisible();
  await context.close();
});

test('landing defers the archive engine until the demo is opened', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scripts.push(new URL(request.url()).pathname);
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Verify mail before you leave' })).toBeVisible();
  const isArchiveScript = (path: string) => /\/(?:archive|sample)(?:-[^/]+)?\.(?:js|ts)$/.test(path);
  expect(scripts.some(isArchiveScript)).toBe(false);

  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await expect(page.getByRole('heading', { name: 'Review the sample archive' })).toBeVisible();
  expect(scripts.some((path) => /\/archive(?:-[^/]+)?\.(?:js|ts)$/.test(path))).toBe(true);
  expect(scripts.some((path) => /\/sample(?:-[^/]+)?\.(?:js|ts)$/.test(path))).toBe(true);
});

test('all public routes have landmarks, one h1, and no serious accessibility findings', async ({ page }) => {
  for (const route of ['/', '/demo', '/privacy', '/terms', '/missing-route']) {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(route);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page).toHaveTitle(/Mail Escape Hatch/);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact || '')), route).toEqual([]);
    expect(errors, route).toEqual([]);
  }
});

test('@claim:mobile-targets landing and demo fit a 390px screen with 44px controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Verify mail before you leave' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  for (const name of ['Reset demo', 'Start for real']) expect(await page.getByRole('button', { name }).evaluate((button) => button.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.locator('.table-scroll')).toHaveAttribute('tabindex', '0');
  await expect(page.locator('.table-scroll')).toHaveAttribute('role', 'region');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''))).toEqual([]);
});

test('real imports keep an actionable error and Choose different mail returns to the picker', async ({ page }) => {
  await page.goto('/app');
  await page.locator('[data-file-input]').setInputFiles({ name: 'empty.eml', mimeType: 'message/rfc822', buffer: Buffer.alloc(0) });
  await expect(page.locator('#source-status')).toContainText(/empty or has no header/);
  await page.locator('[data-file-input]').setInputFiles({ name: 'good.eml', mimeType: 'message/rfc822', buffer: Buffer.from('From: one@test\nSubject: Good\n\nHello') });
  await expect(page.getByRole('heading', { name: 'Verification report' })).toBeVisible();
  await page.getByRole('button', { name: 'Choose different mail' }).click();
  await expect(page.getByRole('heading', { name: 'Choose mail to verify' })).toBeVisible();
  await expect(page.locator('[data-file-input]')).toBeVisible();
  await expect(page.getByText('Demo — sample data, nothing is saved')).toHaveCount(0);
});
