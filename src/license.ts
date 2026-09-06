const KEY = 'sb_license:mail-escape-hatch';
const CACHE_KEY = `${KEY}:verdict`;
const API = 'https://api.sociobot.in/api/v1/products/mail-escape-hatch';

interface CachedVerdict {
  valid: boolean;
  checkedAt: number;
}

export interface LicenseVerdict {
  valid: boolean;
  offline?: boolean;
  reason?: string;
}

function readCachedVerdict(): CachedVerdict | null {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') as CachedVerdict | null;
    return cached && typeof cached.valid === 'boolean' && typeof cached.checkedAt === 'number' ? cached : null;
  } catch {
    return null;
  }
}

export function captureLicense(): string | null {
  const url = new URL(location.href);
  const token = url.searchParams.get('license');
  if (token) {
    localStorage.setItem(KEY, token);
    localStorage.removeItem(CACHE_KEY);
    url.searchParams.delete('license');
    history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }
  return token || localStorage.getItem(KEY);
}

export function cachedLicenseActive(): boolean {
  return readCachedVerdict()?.valid === true;
}

export function saveLicense(token: string): void {
  localStorage.setItem(KEY, token.trim());
  localStorage.removeItem(CACHE_KEY);
}

export async function verifyLicense(force = false): Promise<LicenseVerdict> {
  const token = localStorage.getItem(KEY);
  if (!token) return { valid: false, reason: 'missing' };
  const cached = readCachedVerdict();
  if (!force && cached && Date.now() - cached.checkedAt < 86_400_000) return { valid: cached.valid };
  if (!navigator.onLine) return { valid: cached?.valid === true, offline: true };
  try {
    const response = await fetch(`${API}/verify?license=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error('verify unavailable');
    const data = await response.json() as { valid: boolean; reason?: string };
    localStorage.setItem(CACHE_KEY, JSON.stringify({ valid: data.valid, checkedAt: Date.now() }));
    return { valid: data.valid, reason: data.reason };
  } catch {
    return { valid: cached?.valid === true, offline: true };
  }
}
