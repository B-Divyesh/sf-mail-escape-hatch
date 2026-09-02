const KEY = 'sb_license:mail-escape-hatch';
const CACHE_KEY = `${KEY}:verdict`;
const API = 'https://api.sociobot.in/api/v1/products/mail-escape-hatch';

export const checkoutUrl = `${API}/checkout`;

export function captureLicense(): string | null {
  const url = new URL(location.href);
  const token = url.searchParams.get('license');
  if (token) {
    localStorage.setItem(KEY, token);
    url.searchParams.delete('license');
    history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }
  return token || localStorage.getItem(KEY);
}

export function saveLicense(token: string): void {
  localStorage.setItem(KEY, token.trim());
  localStorage.removeItem(CACHE_KEY);
}

export function clearLicense(): void {
  localStorage.removeItem(KEY);
  localStorage.removeItem(CACHE_KEY);
}

export async function verifyLicense(force = false): Promise<{ valid: boolean; offline?: boolean }> {
  const token = localStorage.getItem(KEY);
  if (!token) return { valid: false };
  const cached = localStorage.getItem(CACHE_KEY);
  if (!force && cached) {
    const verdict = JSON.parse(cached) as { valid: boolean; checkedAt: number };
    if (Date.now() - verdict.checkedAt < 86_400_000) return { valid: verdict.valid };
  }
  try {
    const response = await fetch(`${API}/verify?license=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error('verify unavailable');
    const data = await response.json() as { valid: boolean };
    localStorage.setItem(CACHE_KEY, JSON.stringify({ valid: data.valid, checkedAt: Date.now() }));
    return { valid: data.valid };
  } catch {
    return { valid: cached ? Boolean(JSON.parse(cached).valid) : false, offline: true };
  }
}
