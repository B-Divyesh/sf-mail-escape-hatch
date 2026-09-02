import './styles.css';
import { buildArchive, createPortableArchive } from './archive';
import { sampleArchive } from './sample';
import type { ArchiveResult } from './types';

const app = document.querySelector<HTMLDivElement>('#app')!;
const isDesktop = '__TAURI_INTERNALS__' in window;
let archive: ArchiveResult | null = null;
let demoMode = false;
let sourceError = '';

const routeInfo: Record<string, { title: string; description: string }> = {
  '/': { title: 'Mail Escape Hatch — Verify a local mail archive', description: 'Import MBOX, Maildir, or IMAP mail. Check every message and attachment, then keep a portable local archive.' },
  '/demo': { title: 'Demo — Mail Escape Hatch', description: 'Try a verified local mail archive with sample messages.' },
  '/app': { title: 'Archive — Mail Escape Hatch', description: 'Choose local mail and build a checked portable archive.' },
  '/privacy': { title: 'Privacy — Mail Escape Hatch', description: 'How Mail Escape Hatch keeps mail on your computer.' },
  '/terms': { title: 'Terms — Mail Escape Hatch', description: 'Terms for using Mail Escape Hatch.' },
  '/404': { title: 'Page not found — Mail Escape Hatch', description: 'Return to Mail Escape Hatch.' }
};

function header(): string {
  return `<header class="site-header">
    <nav aria-label="Main navigation" class="nav-wrap">
      <a class="wordmark" href="/" data-link aria-label="Mail Escape Hatch home"><span class="mark" aria-hidden="true">ME</span><span>Mail Escape Hatch</span></a>
      <div class="nav-links"><a href="/demo" data-link>Demo</a><a href="#how" data-home-link>How it works</a><a href="/privacy" data-link>Privacy</a></div>
    </nav>
  </header>`;
}

function footer(): string {
  return `<footer class="site-footer"><div><strong>Mail Escape Hatch</strong><p>Verify mail, then keep a portable local copy.</p></div><nav aria-label="Footer"><a href="/privacy" data-link>Privacy</a><a href="/terms" data-link>Terms</a><a href="https://sociobot.in" rel="external">Built by Param Factory <span class="sr-only">(external site)</span></a></nav><small>Version 0.1.1 · Generated artwork</small></footer>`;
}

function facts(): string {
  return `<ul class="facts" aria-label="Product facts"><li><span aria-hidden="true">●</span> Mail stays on this computer</li><li><span aria-hidden="true">●</span> Works without an account</li><li><span aria-hidden="true">●</span> Exports original EML bytes</li></ul>`;
}

function landing(): string {
  return `${header()}<main id="main" tabindex="-1">
    <section class="hero" aria-labelledby="page-title">
      <div class="hero-copy"><p class="eyebrow">Local mail archive verifier</p><h1 id="page-title">Verify mail before you leave</h1><p class="lede">For people leaving an email provider who need a complete, readable local archive.</p>
        <div class="hero-actions"><a class="button primary" href="/demo" data-link>Try it with sample data</a><span>See four checked messages now.</span></div>${facts()}
      </div>
      <figure class="hero-art"><picture><source srcset="/assets/hero-720.webp 720w, /assets/hero-1200.webp 1200w" type="image/webp"><img src="/assets/hero-fallback.jpg" width="1200" height="800" fetchpriority="high" alt="An open archive case guides paper messages through a lit verification gate." sizes="(max-width: 760px) 100vw, 58vw"></picture><figcaption>Messages enter on the left. Verified copies remain readable on the right.</figcaption></figure>
    </section>
    <section class="proof-strip" aria-label="Archive checks"><span>Folder counts</span><span>Message hashes</span><span>Attachment checks</span><span>Original headers</span></section>
    <section class="live-preview" aria-labelledby="preview-title"><div class="section-heading"><p class="eyebrow">Product preview</p><h2 id="preview-title">See every check in one ledger</h2><p>The archive report keeps counts, issues, and SHA-256 hashes together.</p></div>${ledgerPreview()}</section>
    <section id="how" class="how" aria-labelledby="how-title"><p class="eyebrow">How it works</p><h2 id="how-title">Make an archive in three steps</h2><ol><li><figure><img src="/assets/walkthrough/01-choose.webp" width="1192" height="385" loading="lazy" alt="The source picker for MBOX, Maildir, and IMAP mail."><figcaption><strong>1 · Choose mail</strong><p>Open an MBOX file, a Maildir folder, or connect to IMAP.</p></figcaption></figure></li><li><figure><img src="/assets/walkthrough/02-check.webp" width="1192" height="420" loading="lazy" alt="A report comparing message and attachment counts."><figcaption><strong>2 · Check the copy</strong><p>Compare folder, message, and attachment counts. Review duplicates and missing dates.</p></figcaption></figure></li><li><figure><img src="/assets/walkthrough/03-export.webp" width="1192" height="420" loading="lazy" alt="The report table and portable archive action."><figcaption><strong>3 · Keep the archive</strong><p>Save HTML, original EML files, hashes, and a JSON manifest in one ZIP.</p></figcaption></figure></li></ol></section>
    <section class="boundaries" aria-labelledby="boundaries-title"><div><p class="eyebrow">Clear boundaries</p><h2 id="boundaries-title">Your mail does not become our mail</h2></div><div><p>The app reads sources on your computer. IMAP connects from your computer to your provider.</p><p>It does not send messages, migrate accounts, or upload your archive.</p><p>IMAP folders are opened read-only. Passwords are used for the connection and are not stored. Exported archives are not encrypted unless you encrypt their destination.</p></div></section>
    <section class="downloads" aria-labelledby="download-title"><p class="eyebrow">Desktop app</p><h2 id="download-title">Download for your computer</h2><p>Builds are unsigned until the release signing certificates are added.</p><div class="download-state" aria-live="polite"><span class="loader" aria-hidden="true"></span>Checking the latest release…</div></section>
  </main>${footer()}`;
}

function ledgerPreview(): string {
  return `<div class="ledger" aria-label="Sample verification report"><div class="ledger-head"><span>SAMPLE PROVIDER EXPORT</span><span>CHECK COMPLETE</span></div><div class="totals"><div><strong>1</strong><span>folder</span></div><div><strong>4</strong><span>messages</span></div><div><strong>2</strong><span>attachments</span></div></div><div class="check-row ok"><span>✓</span><div><strong>Message content hashed</strong><small>4 of 4 records</small></div><code>SHA-256</code></div><div class="check-row warn"><span>◇</span><div><strong>Date header missing</strong><small>1 message needs review</small></div><code>REVIEW</code></div><div class="check-row ok"><span>✓</span><div><strong>Attachments accounted for</strong><small>2 files, 2 hashes</small></div><code>MATCH</code></div></div>`;
}

function workspace(): string {
  return `${header()}${demoMode ? `<aside class="demo-banner" aria-label="Demo mode"><strong>Demo — sample data, nothing is saved</strong><span><button data-reset-demo>Reset demo</button><button data-start-real>Start for real</button></span></aside>` : ''}<main id="main" tabindex="-1" class="workspace-main"><section class="workspace-title"><div><p class="eyebrow">Archive workspace</p><h1>${demoMode ? 'Review the sample archive' : 'Choose mail to verify'}</h1><p>${demoMode ? 'Four sample messages show a complete check and one issue.' : 'MBOX, EML, and Maildir files are read on this computer.'}</p></div>${archive ? `<button class="button primary" data-export>Save portable archive</button>` : ''}</section>${archive ? reportView(archive) : sourcePicker()}</main>${footer()}`;
}

function sourcePicker(): string {
  return `<section class="source-picker" aria-labelledby="source-title"><h2 id="source-title">Choose a source</h2><div class="source-options"><label class="source-option"><span class="source-icon" aria-hidden="true">▤</span><strong>Open MBOX or EML</strong><span>Choose one or more exported files.</span><input type="file" data-file-input accept=".mbox,.mbx,.eml,message/rfc822,application/mbox" multiple></label><label class="source-option"><span class="source-icon" aria-hidden="true">▥</span><strong>Open Maildir folder</strong><span>Choose the folder that contains cur and new.</span><input type="file" data-dir-input multiple webkitdirectory></label><button class="source-option" type="button" data-imap-open><span class="source-icon" aria-hidden="true">⌁</span><strong>Connect to IMAP</strong><span>${isDesktop ? 'Download mail directly from your provider.' : 'Available in the desktop app.'}</span></button></div><p class="source-note">Nothing is changed at the source. Large imports may take several minutes.</p><p id="source-status" class="source-status" role="status">${html(sourceError)}</p></section>${imapDialog()}`;
}

function imapDialog(): string {
  return `<dialog id="imap-dialog"><form method="dialog"><button class="dialog-close" value="cancel" aria-label="Close">×</button><p class="eyebrow">Direct import</p><h2>Connect to IMAP</h2>${isDesktop ? `<label for="imap-host">IMAP server</label><input id="imap-host" name="host" placeholder="imap.example.com" required><div class="form-pair"><label>Port<input name="port" inputmode="numeric" value="993" required></label><label>Email<input name="username" type="email" required></label></div><label>Password or app password<input name="password" type="password" required><p class="form-note">The app connects only to this server. It opens folders read-only and does not store the password. Check your provider’s app-password and rate-limit rules.</p><p id="imap-status" role="status"></p><button class="button primary" value="default" data-imap-connect>Check and import mail</button>` : `<p>IMAP access needs the installed desktop app. You can still try MBOX and Maildir in this browser.</p><button class="button secondary" value="cancel">Close</button>`}</form></dialog>`;
}

function reportView(result: ArchiveResult): string {
  const attachmentCount = result.messages.reduce((sum, message) => sum + message.attachments.length, 0);
  const rows = result.messages.map((message) => `<tr><td><strong>${html(message.subject)}</strong><small>${html(message.from)}</small></td><td>${html(message.folder)}</td><td>${message.attachments.length}</td><td><code title="${message.hash}">${message.hash.slice(0, 12)}…</code></td><td>${message.date ? '<span class="status-ok">Checked</span>' : '<span class="status-warn">Review date</span>'}</td></tr>`).join('');
  return `<section class="report" aria-labelledby="report-title"><div class="report-summary"><div><p class="eyebrow">${html(result.sourceType)} · ${html(result.sourceName)}</p><h2 id="report-title">Verification report</h2></div><div class="report-state"><span aria-hidden="true">${result.anomalies.length ? '◇' : '✓'}</span><strong>${result.anomalies.length ? `${result.anomalies.length} issue${result.anomalies.length === 1 ? '' : 's'} to review` : 'All checks passed'}</strong></div></div><div class="totals"><div><strong>${result.folders.length}</strong><span>folders</span></div><div><strong>${result.messages.length}</strong><span>messages</span></div><div><strong>${attachmentCount}</strong><span>attachments</span></div></div>${result.anomalies.length ? `<div class="anomalies"><h3>Issues to review</h3><ul>${result.anomalies.map((item) => `<li><span aria-hidden="true">◇</span>${html(item.detail)}</li>`).join('')}</ul></div>` : ''}<div class="table-scroll" tabindex="0" role="region" aria-label="Scrollable verification report table"><table><caption>Every imported message and its check result</caption><thead><tr><th>Message</th><th>Folder</th><th>Files</th><th>SHA-256</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table></div><div class="report-actions"><button class="button secondary" data-new-import>Choose different mail</button><button class="button primary" data-export>Save portable archive</button></div></section>`;
}

function legal(kind: 'privacy' | 'terms'): string {
  const privacy = `<h1>Privacy in plain words</h1><p class="lede">Mail stays on your computer unless you choose a provider connection.</p><h2>Local files</h2><p>The app reads selected mail files and writes the archive you request. It does not send mail or archive contents to us.</p><h2>IMAP connections</h2><p>The desktop app connects directly to the IMAP server you enter. It opens folders read-only and does not mark messages seen.</p><h2>Downloads</h2><p>The website asks GitHub for public release details. That request includes no mail data.</p><h2>Storage</h2><p>The demo uses memory only. The app does not use analytics.</p><h2>Contact</h2><p>Email <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a> for a privacy request.</p>`;
  const terms = `<h1>Terms of use</h1><p class="lede">Use Mail Escape Hatch only with mail you may lawfully access.</p><h2>Your responsibility</h2><p>Keep a backup until you confirm the archive opens and matches your source. Follow your provider’s access and rate-limit rules.</p><h2>No email service</h2><p>The app does not send, host, or migrate mail. It makes local archive files from the sources you select.</p><h2>Warranty</h2><p>The software is provided as-is under the MIT License. Verify important archives before deleting any source.</p>`;
  return `${header()}<main id="main" tabindex="-1" class="prose"><article>${kind === 'privacy' ? privacy : terms}<p>Last updated: 2 September 2026.</p></article></main>${footer()}`;
}

function notFound(): string {
  return `${header()}<main id="main" tabindex="-1" class="not-found"><p class="code-404">404</p><h1>This route has no mail</h1><p>The page could not be found. The archive is unchanged.</p><a class="button primary" href="/" data-link>Return home</a></main>${footer()}`;
}

function html(value: string): string {
  const node = document.createElement('span'); node.textContent = value; return node.innerHTML;
}

async function render(path = location.pathname, push = false): Promise<void> {
  if (push) history.pushState({}, '', path);
  const known = routeInfo[path] ? path : '/404';
  const meta = routeInfo[known]; document.title = meta.title;
  document.querySelector<HTMLMetaElement>('meta[name="description"]')!.content = meta.description;
  demoMode = known === '/demo';
  if (demoMode && !archive) archive = await sampleArchive();
  app.innerHTML = known === '/' ? landing() : known === '/demo' || known === '/app' ? workspace() : known === '/privacy' || known === '/terms' ? legal(known.slice(1) as 'privacy' | 'terms') : notFound();
  bindActions();
  if (known === '/') void loadRelease();
  const heading = document.querySelector<HTMLElement>('h1');
  if (push && heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
}

function bindActions(): void {
  document.querySelectorAll<HTMLAnchorElement>('[data-link]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); archive = null; void render(new URL(link.href).pathname, true); }));
  document.querySelectorAll<HTMLAnchorElement>('[data-home-link]').forEach((link) => link.addEventListener('click', (event) => { if (location.pathname !== '/') { event.preventDefault(); archive = null; void render('/', true).then(() => document.querySelector(link.hash)?.scrollIntoView()); } }));
  document.querySelector<HTMLInputElement>('[data-file-input]')?.addEventListener('change', async (event) => handleFiles(Array.from((event.currentTarget as HTMLInputElement).files || [])));
  document.querySelector<HTMLInputElement>('[data-dir-input]')?.addEventListener('change', async (event) => handleFiles(Array.from((event.currentTarget as HTMLInputElement).files || []), 'Maildir'));
  document.querySelectorAll('[data-export]').forEach((button) => button.addEventListener('click', exportArchive));
  document.querySelector('[data-new-import]')?.addEventListener('click', () => { archive = null; demoMode = false; sourceError = ''; void render('/app'); });
  document.querySelector('[data-reset-demo]')?.addEventListener('click', async () => { archive = await sampleArchive(); void render('/demo'); });
  document.querySelector('[data-start-real]')?.addEventListener('click', () => { archive = null; demoMode = false; if (isDesktop) void render('/app'); else void render('/', true).then(() => document.querySelector('#download-title')?.scrollIntoView()); });
  document.querySelector('[data-imap-open]')?.addEventListener('click', () => (document.querySelector('#imap-dialog') as HTMLDialogElement).showModal());
  document.querySelector('[data-imap-connect]')?.addEventListener('click', connectImap);
}

async function handleFiles(files: File[], forcedType?: 'Maildir'): Promise<void> {
  const main = document.querySelector('main')!;
  const status = document.querySelector<HTMLElement>('#source-status');
  main.setAttribute('aria-busy', 'true');
  if (status) status.textContent = 'Reading messages and calculating hashes…';
  try { archive = await buildArchive(files, forcedType); sourceError = ''; demoMode = false; await render('/app'); }
  catch (error) { sourceError = error instanceof Error ? error.message : 'The mail files could not be read. Choose them again.'; await render('/app'); announce(sourceError); }
  finally { main.removeAttribute('aria-busy'); }
}

function exportArchive(): void {
  if (!archive) return;
  const data = createPortableArchive(archive);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([data.buffer as ArrayBuffer], { type: 'application/zip' }));
  link.download = `mail-escape-hatch-${new Date().toISOString().slice(0, 10)}.zip`;
  link.click(); URL.revokeObjectURL(link.href);
  announce('Portable archive saved. Open index.html inside the ZIP to read it.');
}

async function connectImap(event: Event): Promise<void> {
  event.preventDefault();
  if (!isDesktop) return;
  const form = (event.currentTarget as HTMLElement).closest('form')!;
  const status = document.querySelector<HTMLElement>('#imap-status')!;
  if (!form.reportValidity()) return;
  const values = Object.fromEntries(new FormData(form as HTMLFormElement));
  status.textContent = 'Connecting and reading folders…';
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke<{ messages: Array<{ raw: number[]; folder: string }>; folderCounts: Array<{ folder: string; expected: number }>; folderIssues: Array<{ folder: string; detail: string }> }>('import_imap', { config: { host: values.host, port: Number(values.port), username: values.username, password: values.password } });
    const files = result.messages.map((item, index) => { const file = new File([new Uint8Array(item.raw)], `${index}.eml`); Object.defineProperty(file, 'webkitRelativePath', { value: `${item.folder}/${index}.eml` }); return file; });
    archive = await buildArchive(files, 'IMAP');
    result.folderCounts.forEach((count) => { const downloaded = archive!.messages.filter((message) => message.folder === count.folder).length; if (downloaded !== count.expected) archive!.anomalies.push({ type: 'count', detail: `${count.folder} reported ${count.expected} messages, but ${downloaded} were downloaded.` }); });
    result.folderIssues.forEach((issue) => archive!.anomalies.push({ type: 'count', detail: `${issue.folder}: ${issue.detail}` }));
    demoMode = false; (form.closest('dialog') as HTMLDialogElement).close(); await render('/app');
  } catch (error) {
    const detail = String(error);
    status.textContent = !navigator.onLine ? 'This computer is offline. Reconnect, then try the IMAP import again.' : /auth|login|credential/i.test(detail) ? 'The provider rejected password login. Create an app password or export mail through the provider’s OAuth flow.' : `The IMAP import failed. ${detail} Check the server and provider limit.`;
  }
}

async function loadRelease(): Promise<void> {
  const target = document.querySelector<HTMLElement>('.download-state'); if (!target) return;
  const fallback = `<p>Downloads are being published. <a href="https://github.com/B-Divyesh/sf-mail-escape-hatch/releases">Open the release page <span class="sr-only">(external site)</span></a>.</p>`;
  if (['localhost', '127.0.0.1'].includes(location.hostname)) { target.innerHTML = fallback; return; }
  try {
    const cacheKey = 'release:mail-escape-hatch'; const cached = localStorage.getItem(cacheKey);
    let release: { fetched: number; assets: Array<{ name: string; browser_download_url: string }> };
    if (cached && Date.now() - JSON.parse(cached).fetched < 3_600_000) release = JSON.parse(cached);
    else { const response = await fetch('https://api.github.com/repos/B-Divyesh/sf-mail-escape-hatch/releases/latest'); if (!response.ok) throw new Error('not ready'); const data = await response.json(); release = { fetched: Date.now(), assets: data.assets }; localStorage.setItem(cacheKey, JSON.stringify(release)); }
    const platform = /Win/.test(navigator.platform) ? 'Windows' : /Mac/.test(navigator.platform) ? 'macOS' : 'Linux';
    const pattern = platform === 'Windows' ? /\.(msi|exe)$/i : platform === 'macOS' ? /\.(dmg|app\.tar\.gz)$/i : /\.(AppImage|deb)$/i;
    const asset = release.assets.find((item) => pattern.test(item.name));
    target.innerHTML = asset ? `<a class="button primary" href="${asset.browser_download_url}">Download for ${platform}</a><a href="https://github.com/B-Divyesh/sf-mail-escape-hatch/releases">See all platforms <span class="sr-only">(external site)</span></a>` : fallback;
  } catch { target.innerHTML = fallback; }
}

function announce(message: string): void {
  let region = document.querySelector<HTMLElement>('#announcer');
  if (!region) { region = document.createElement('div'); region.id = 'announcer'; region.className = 'toast'; region.setAttribute('role', 'status'); region.setAttribute('aria-live', 'polite'); document.body.append(region); }
  region.textContent = message;
  window.setTimeout(() => region?.remove(), 5000);
}

window.addEventListener('popstate', () => { archive = null; void render(); });
if ('serviceWorker' in navigator && !isDesktop) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
void render(isDesktop ? '/app' : location.pathname);
