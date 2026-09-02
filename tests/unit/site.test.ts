import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('static delivery', () => {
  it('@claim:true-404 rewrites unknown static routes to the real 404 document', () => {
    const config = JSON.parse(readFileSync('public/staticwebapp.config.json', 'utf8'));
    expect(config.responseOverrides['404']).toEqual({ rewrite: '/404.html' });
    expect(config.navigationFallback).toBeUndefined();
    expect(config.routes.map((route: { route: string }) => route.route)).toEqual(expect.arrayContaining(['/demo', '/app', '/privacy', '/terms']));
    const notFound = readFileSync('public/404.html', 'utf8');
    expect(notFound).toContain('<h1>');
    expect(notFound).toContain('href="/404.css"');
    expect(notFound).not.toContain('<style>');
  });

  it('versions the service-worker cache and replaces the retired v1 cache on activation', () => {
    const worker = readFileSync('public/sw.js', 'utf8');
    expect(worker).toContain("mail-escape-hatch-v2");
    expect(worker).toContain('self.skipWaiting()');
    expect(worker).toContain('self.clients.claim()');
    expect(worker).toContain('caches.delete(key)');
  });

  it('@claim:password-not-stored keeps IMAP credentials out of browser and desktop persistence', () => {
    const browser = readFileSync('src/main.ts', 'utf8');
    const desktop = readFileSync('src-tauri/src/lib.rs', 'utf8');
    expect(browser).not.toMatch(/(?:localStorage|sessionStorage|indexedDB)\.(?:setItem|put).*password/i);
    expect(desktop).not.toMatch(/(?:File::create|write_all|sqlite|localStorage|sessionStorage)/i);
    expect(desktop).toMatch(/\.login\(&config\.username,\s*&config\.password\)/);
  });

  it('@claim:installer-checksums verifies downloaded installers before installation', () => {
    const shell = readFileSync('public/install.sh', 'utf8');
    const powershell = readFileSync('public/install.ps1', 'utf8');
    expect(shell).toContain('sha256sum -c');
    expect(powershell).toContain('Get-FileHash $installer -Algorithm SHA256');
    expect(powershell).toContain('checksum did not match');
  });
});
