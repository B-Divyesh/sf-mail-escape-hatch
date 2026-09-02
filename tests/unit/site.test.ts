import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('static delivery', () => {
  it('@claim:true-404 rewrites unknown static routes to the real 404 document', () => {
    const config = JSON.parse(readFileSync('public/staticwebapp.config.json', 'utf8'));
    expect(config.responseOverrides['404']).toEqual({ rewrite: '/404.html' });
    expect(config.navigationFallback).toBeUndefined();
    expect(config.routes.map((route: { route: string }) => route.route)).toEqual(expect.arrayContaining(['/demo', '/app', '/privacy', '/terms']));
    expect(readFileSync('public/404.html', 'utf8')).toContain('<h1>');
  });

  it('@claim:installer-checksums verifies downloaded installers before installation', () => {
    const shell = readFileSync('public/install.sh', 'utf8');
    const powershell = readFileSync('public/install.ps1', 'utf8');
    expect(shell).toContain('sha256sum -c');
    expect(powershell).toContain('Get-FileHash $installer -Algorithm SHA256');
    expect(powershell).toContain('checksum did not match');
  });
});
