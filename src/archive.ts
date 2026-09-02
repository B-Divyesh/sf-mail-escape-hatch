import { strToU8, zipSync } from 'fflate';
import type { ArchiveResult, AttachmentRecord, MessageRecord, SourceType } from './types';

const latin1 = new TextDecoder('iso-8859-1');
const encoder = new TextEncoder();

export async function sha256(input: string | Uint8Array): Promise<string> {
  const bytes = typeof input === 'string' ? encoder.encode(input) : input;
  const view = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const digest = await crypto.subtle.digest('SHA-256', view);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function headerEnd(bytes: Uint8Array): number {
  for (let i = 0; i < bytes.length - 3; i += 1) if (bytes[i] === 13 && bytes[i + 1] === 10 && bytes[i + 2] === 13 && bytes[i + 3] === 10) return i + 4;
  for (let i = 0; i < bytes.length - 1; i += 1) if (bytes[i] === 10 && bytes[i + 1] === 10) return i + 2;
  return -1;
}

function parseHeaders(bytes: Uint8Array): Record<string, string> {
  const end = headerEnd(bytes);
  const text = latin1.decode(bytes.slice(0, end < 0 ? bytes.length : end)).replace(/\r?\n[ \t]+/g, ' ');
  const headers: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon > 0) headers[line.slice(0, colon).toLowerCase()] = line.slice(colon + 1).trim();
  }
  return headers;
}

function bodyBytes(bytes: Uint8Array): Uint8Array { const end = headerEnd(bytes); return end < 0 ? new Uint8Array() : bytes.slice(end); }

function percentBytes(value: string): Uint8Array {
  const output: number[] = [];
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] === '%' && /^[0-9a-f]{2}$/i.test(value.slice(i + 1, i + 3))) { output.push(Number.parseInt(value.slice(i + 1, i + 3), 16)); i += 2; }
    else output.push(value.charCodeAt(i));
  }
  return Uint8Array.from(output);
}

function headerParam(header: string, key: string): string | undefined {
  const match = new RegExp(`(?:^|;)\\s*${key}(\\*)?\\s*=\\s*(?:"([^"]*)"|([^;\\s]*))`, 'i').exec(header);
  if (!match) return undefined;
  const value = (match[2] ?? match[3] ?? '').trim();
  if (!match[1]) return value;
  try { return new TextDecoder('utf-8', { fatal: true }).decode(percentBytes(value.replace(/^([^']*)'[^']*'/, ''))); } catch { return undefined; }
}

function decodeBase64(value: Uint8Array): Uint8Array | undefined {
  const clean = latin1.decode(value).replace(/[\t\r\n ]/g, '');
  if (!clean || clean.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || /=/.test(clean.slice(0, -2))) return undefined;
  try { return Uint8Array.from(atob(clean), (char) => char.charCodeAt(0)); } catch { return undefined; }
}

function decodeQuotedPrintable(value: Uint8Array): Uint8Array | undefined {
  const text = latin1.decode(value); const output: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] !== '=') { output.push(text.charCodeAt(i)); continue; }
    if (text[i + 1] === '\r' && text[i + 2] === '\n') { i += 2; continue; }
    if (text[i + 1] === '\n') { i += 1; continue; }
    const hex = text.slice(i + 1, i + 3);
    if (!/^[0-9a-f]{2}$/i.test(hex)) return undefined;
    output.push(Number.parseInt(hex, 16)); i += 2;
  }
  return Uint8Array.from(output);
}

function decodeTransfer(value: Uint8Array, transfer: string): Uint8Array | undefined {
  if (/base64/i.test(transfer)) return decodeBase64(value);
  if (/quoted-printable/i.test(transfer)) return decodeQuotedPrintable(value);
  if (!transfer || /^(7bit|8bit|binary)$/i.test(transfer)) return value;
  return undefined;
}

function splitMultipart(bytes: Uint8Array, boundary: string): Uint8Array[] {
  const text = latin1.decode(bytes); const marker = `--${boundary}`; const positions: number[] = []; let offset = 0;
  while (offset < text.length) { const found = text.indexOf(marker, offset); if (found < 0) break; if (found === 0 || text[found - 1] === '\n') positions.push(found); offset = found + marker.length; }
  const output: Uint8Array[] = [];
  for (let i = 0; i < positions.length; i += 1) {
    const lineEnd = text.indexOf('\n', positions[i]);
    if (text.slice(positions[i], lineEnd < 0 ? text.length : lineEnd).endsWith('--')) break;
    const start = lineEnd < 0 ? text.length : lineEnd + 1; const next = positions[i + 1] ?? text.length;
    let end = next; if (end > start && text[end - 1] === '\n') end -= 1; if (end > start && text[end - 1] === '\r') end -= 1;
    if (end > start) output.push(bytes.slice(start, end));
  }
  return output;
}

async function inspectPart(bytes: Uint8Array, attachments: AttachmentRecord[], issues: string[]): Promise<void> {
  const headers = parseHeaders(bytes); const contentType = headers['content-type'] || ''; const boundary = headerParam(contentType, 'boundary');
  if (/^multipart\//i.test(contentType) && boundary) { for (const part of splitMultipart(bodyBytes(bytes), boundary)) await inspectPart(part, attachments, issues); return; }
  const disposition = headers['content-disposition'] || ''; const name = headerParam(disposition, 'filename') || headerParam(contentType, 'name');
  if (!name) return;
  const content = decodeTransfer(bodyBytes(bytes), headers['content-transfer-encoding'] || ''); const mediaType = contentType.split(';')[0].trim() || 'application/octet-stream';
  if (!content) { const detail = `Attachment “${name}” was not exported because its ${headers['content-transfer-encoding'] || 'unknown'} encoding is invalid or unsupported.`; issues.push(detail); attachments.push({ name, mediaType, size: 0, hash: '', error: detail }); return; }
  attachments.push({ name, mediaType, size: content.length, hash: await sha256(content), content });
}

function displayText(bytes: Uint8Array, contentType: string): string {
  const charset = headerParam(contentType, 'charset') || 'utf-8';
  try { return new TextDecoder(charset).decode(bytes); } catch { return `[Message text uses unsupported charset ${charset}; original bytes are preserved in the exported EML.]`; }
}

export async function parseMessage(raw: Uint8Array, folder = 'Inbox'): Promise<MessageRecord> {
  if (!raw.length || headerEnd(raw) < 0) throw new Error('An EML message is empty or has no header/body separator. Choose a complete .eml file.');
  const headers = parseHeaders(raw); const hash = await sha256(raw); const attachments: AttachmentRecord[] = []; const issues: string[] = [];
  await inspectPart(raw, attachments, issues);
  return { id: headers['message-id'] || `<${hash.slice(0, 24)}@local.archive>`, folder, subject: headers.subject || '(No subject)', from: headers.from || '(Unknown sender)', to: headers.to || '', date: headers.date || '', headers, body: displayText(bodyBytes(raw), headers['content-type'] || ''), raw, hash, attachments, issues };
}

export function splitMbox(raw: Uint8Array): Uint8Array[] {
  const text = latin1.decode(raw); const positions = [...text.matchAll(/(?:^|\n)From \S+@\S+ .*(?:\r?\n)/g)].map((match) => (match.index || 0) + (match[0].startsWith('\n') ? 1 : 0));
  if (!positions.length) return raw.length ? [raw] : [];
  return positions.map((position, i) => { const start = text.indexOf('\n', position) + 1; return raw.slice(start, positions[i + 1] ?? raw.length); }).filter((message) => message.length > 0);
}

export async function buildArchive(files: File[], forcedType?: SourceType): Promise<ArchiveResult> {
  if (!files.length) throw new Error('No mail files were selected. Choose an MBOX file or a Maildir folder.');
  const messages: MessageRecord[] = []; let type: SourceType = forcedType || 'EML';
  for (const file of files) {
    const raw = new Uint8Array(await file.arrayBuffer()); const path = file.webkitRelativePath || file.name; const folder = path.includes('/') ? path.split('/').slice(0, -1).join('/') : 'Inbox';
    if (/\.mbox$/i.test(file.name) || /^From \S+@\S+/m.test(latin1.decode(raw.slice(0, 100)))) { type = 'MBOX'; for (const message of splitMbox(raw)) messages.push(await parseMessage(message, folder)); }
    else if (!/\.eml$/i.test(file.name) && forcedType !== 'Maildir' && forcedType !== 'IMAP') continue;
    else { type = forcedType || (path.includes('/') ? 'Maildir' : 'EML'); messages.push(await parseMessage(raw, folder.replace(/\/(cur|new|tmp)$/i, '') || 'Inbox')); }
  }
  if (!messages.length) throw new Error('No readable messages were found. Choose .mbox or .eml files, or a Maildir folder.');
  const seen = new Map<string, string>(); const anomalies: ArchiveResult['anomalies'] = [];
  for (const message of messages) { if (!message.date) anomalies.push({ type: 'missing-date', detail: `${message.subject} has no Date header.` }); const key = message.headers['message-id'] || message.hash; if (seen.has(key)) anomalies.push({ type: 'duplicate', detail: `${message.subject} matches ${seen.get(key)}.` }); else seen.set(key, message.subject); message.issues.forEach((detail) => anomalies.push({ type: 'attachment', detail })); }
  return { sourceType: type, sourceName: files.length === 1 ? files[0].name : `${files.length} mail files`, createdAt: new Date().toISOString(), folders: [...new Set(messages.map((message) => message.folder))], messages, anomalies };
}

function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character); }

export function createPortableArchive(result: ArchiveResult): Uint8Array {
  const paths = new Map<AttachmentRecord, string>();
  result.messages.forEach((message, messageIndex) => message.attachments.forEach((attachment, attachmentIndex) => { if (attachment.content) paths.set(attachment, `attachments/${String(messageIndex + 1).padStart(5, '0')}/${String(attachmentIndex + 1).padStart(2, '0')}-${attachment.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`); }));
  const manifest = { format: 'mail-escape-hatch/2', createdAt: result.createdAt, source: { type: result.sourceType, name: result.sourceName }, counts: { folders: result.folders.length, messages: result.messages.length, attachments: result.messages.reduce((sum, message) => sum + message.attachments.length, 0) }, anomalies: result.anomalies, messages: result.messages.map(({ id, folder, subject, from, to, date, hash, attachments }, index) => ({ id, folder, subject, from, to, date, hash, emlPath: `eml/${String(index + 1).padStart(5, '0')}.eml`, attachments: attachments.map((attachment) => ({ name: attachment.name, mediaType: attachment.mediaType, size: attachment.size, hash: attachment.hash, archivePath: paths.get(attachment) || null, error: attachment.error || null })) })) };
  const rows = result.messages.map((message, index) => `<article id="m${index}"><h2>${escapeHtml(message.subject)}</h2><dl><dt>From</dt><dd>${escapeHtml(message.from)}</dd><dt>Date</dt><dd>${escapeHtml(message.date || 'Missing')}</dd><dt>Folder</dt><dd>${escapeHtml(message.folder)}</dd><dt>SHA-256</dt><dd><code>${message.hash}</code></dd></dl><p><a href="eml/${String(index + 1).padStart(5, '0')}.eml">Open original EML</a></p>${message.attachments.length ? `<h3>Attachments</h3><ul>${message.attachments.map((attachment) => paths.get(attachment) ? `<li><a href="${paths.get(attachment)}">${escapeHtml(attachment.name)}</a> <code>${attachment.hash}</code></li>` : `<li>${escapeHtml(attachment.name)} — <strong>Not exported:</strong> ${escapeHtml(attachment.error || 'unreadable attachment')}</li>`).join('')}</ul>` : ''}<pre>${escapeHtml(message.body.slice(0, 100000))}</pre></article>`).join('');
  const index = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Portable mail archive</title><style>body{max-width:70rem;margin:auto;padding:2rem;font:16px/1.55 system-ui;color:#17202b;background:#f8f5ed}article{border-top:2px solid #17202b;padding:2rem 0}code{overflow-wrap:anywhere}pre{white-space:pre-wrap}</style><body><header><h1>Portable mail archive</h1><p>${manifest.counts.messages} messages · ${manifest.counts.attachments} attachments · created ${escapeHtml(result.createdAt)}</p></header><main>${rows}</main></body></html>`;
  const entries: Record<string, Uint8Array> = { 'index.html': strToU8(index), 'manifest.json': strToU8(JSON.stringify(manifest, null, 2)), 'README.txt': strToU8('Open index.html in any modern browser. It links to every original message and exported attachment. Compare SHA-256 values with manifest.json. Any unreadable attachment is listed as an anomaly and is not silently exported.\n') };
  result.messages.forEach((message, index) => { const number = String(index + 1).padStart(5, '0'); entries[`eml/${number}.eml`] = message.raw; message.attachments.forEach((attachment) => { const path = paths.get(attachment); if (path && attachment.content) entries[path] = attachment.content; }); });
  return zipSync(entries, { level: 6 });
}
