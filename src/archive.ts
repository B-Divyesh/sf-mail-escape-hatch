import { strToU8, zipSync } from 'fflate';
import type { ArchiveResult, AttachmentRecord, MessageRecord, SourceType } from './types';

const decoder = new TextDecoder();

export async function sha256(input: string | Uint8Array): Promise<string> {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest('SHA-256', bytes.buffer as ArrayBuffer);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function unfoldHeaders(raw: string): Record<string, string> {
  const headerText = raw.split(/\r?\n\r?\n/, 1)[0].replace(/\r?\n[ \t]+/g, ' ');
  const headers: Record<string, string> = {};
  for (const line of headerText.split(/\r?\n/)) {
    const index = line.indexOf(':');
    if (index > 0) headers[line.slice(0, index).toLowerCase()] = line.slice(index + 1).trim();
  }
  return headers;
}

function decodeBase64(value: string): Uint8Array {
  try {
    const clean = value.replace(/\s/g, '');
    const binary = atob(clean);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return new Uint8Array();
  }
}

async function attachmentsFrom(raw: string, contentType: string): Promise<AttachmentRecord[]> {
  const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i)?.slice(1).find(Boolean);
  if (!boundary) return [];
  const output: AttachmentRecord[] = [];
  for (const part of raw.split(`--${boundary}`).slice(1)) {
    const head = unfoldHeaders(part);
    const disposition = head['content-disposition'] || '';
    const filename = disposition.match(/filename=(?:"([^"]+)"|([^;\r\n]+))/i)?.slice(1).find(Boolean)?.trim();
    if (!filename) continue;
    const payload = part.split(/\r?\n\r?\n/).slice(1).join('\n\n').replace(/\r?\n--$/, '').trim();
    const bytes = /base64/i.test(head['content-transfer-encoding'] || '') ? decodeBase64(payload) : new TextEncoder().encode(payload);
    output.push({
      name: filename,
      mediaType: (head['content-type'] || 'application/octet-stream').split(';')[0],
      size: bytes.length,
      hash: await sha256(bytes),
      content: bytes
    });
  }
  return output;
}

export async function parseMessage(raw: string, folder = 'Inbox'): Promise<MessageRecord> {
  const headers = unfoldHeaders(raw);
  const body = raw.split(/\r?\n\r?\n/).slice(1).join('\n\n');
  const hash = await sha256(raw);
  return {
    id: headers['message-id'] || `<${hash.slice(0, 24)}@local.archive>`,
    folder,
    subject: headers.subject || '(No subject)',
    from: headers.from || '(Unknown sender)',
    to: headers.to || '',
    date: headers.date || '',
    headers,
    body,
    raw,
    hash,
    attachments: await attachmentsFrom(raw, headers['content-type'] || '')
  };
}

export function splitMbox(raw: string): string[] {
  const normalized = raw.replace(/^From .*(?:\r?\n)/, '');
  return normalized.split(/\r?\nFrom (?=\S+@\S+\s)/).map((part) => part.trim()).filter(Boolean);
}

export async function buildArchive(files: File[], forcedType?: SourceType): Promise<ArchiveResult> {
  if (!files.length) throw new Error('No mail files were selected. Choose an MBOX file or a Maildir folder.');
  const messages: MessageRecord[] = [];
  let type: SourceType = forcedType || 'EML';
  for (const file of files) {
    const raw = decoder.decode(await file.arrayBuffer());
    const path = file.webkitRelativePath || file.name;
    const folder = path.includes('/') ? path.split('/').slice(0, -1).join('/') : 'Inbox';
    if (/\.mbox$/i.test(file.name) || /^From \S+@\S+/m.test(raw)) {
      type = 'MBOX';
      for (const message of splitMbox(raw)) messages.push(await parseMessage(message, folder));
    } else if (!/\.eml$/i.test(file.name) && forcedType !== 'Maildir') {
      continue;
    } else {
      type = forcedType || (path.includes('/') ? 'Maildir' : 'EML');
      messages.push(await parseMessage(raw, folder.replace(/\/(cur|new|tmp)$/i, '') || 'Inbox'));
    }
  }
  if (!messages.length) throw new Error('No readable messages were found. Choose .mbox or .eml files, or a Maildir folder.');
  const seen = new Map<string, string>();
  const anomalies: ArchiveResult['anomalies'] = [];
  for (const message of messages) {
    if (!message.date) anomalies.push({ type: 'missing-date', detail: `${message.subject} has no Date header.` });
    const duplicateKey = message.headers['message-id'] || message.hash;
    if (seen.has(duplicateKey)) anomalies.push({ type: 'duplicate', detail: `${message.subject} matches ${seen.get(duplicateKey)}.` });
    else seen.set(duplicateKey, message.subject);
  }
  return {
    sourceType: type,
    sourceName: files.length === 1 ? files[0].name : `${files.length} mail files`,
    createdAt: new Date().toISOString(),
    folders: [...new Set(messages.map((message) => message.folder))],
    messages,
    anomalies
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character);
}

export function createPortableArchive(result: ArchiveResult): Uint8Array {
  const manifest = {
    format: 'mail-escape-hatch/1',
    createdAt: result.createdAt,
    source: { type: result.sourceType, name: result.sourceName },
    counts: {
      folders: result.folders.length,
      messages: result.messages.length,
      attachments: result.messages.reduce((sum, message) => sum + message.attachments.length, 0)
    },
    anomalies: result.anomalies,
    messages: result.messages.map(({ id, folder, subject, from, to, date, hash, attachments }) => ({ id, folder, subject, from, to, date, hash, attachments: attachments.map(({ name, mediaType, size, hash: attachmentHash }) => ({ name, mediaType, size, hash: attachmentHash })) }))
  };
  const rows = result.messages.map((message, index) => `<article id="m${index}"><h2>${escapeHtml(message.subject)}</h2><dl><dt>From</dt><dd>${escapeHtml(message.from)}</dd><dt>Date</dt><dd>${escapeHtml(message.date || 'Missing')}</dd><dt>Folder</dt><dd>${escapeHtml(message.folder)}</dd><dt>SHA-256</dt><dd><code>${message.hash}</code></dd></dl><pre>${escapeHtml(message.body.slice(0, 100000))}</pre></article>`).join('');
  const index = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Portable mail archive</title><style>body{max-width:70rem;margin:auto;padding:2rem;font:16px/1.55 system-ui;color:#17202b;background:#f8f5ed}nav{position:sticky;top:0;background:#f8f5ed;padding:1rem 0}article{border-top:2px solid #17202b;padding:2rem 0}code{overflow-wrap:anywhere}pre{white-space:pre-wrap}</style><body><header><h1>Portable mail archive</h1><p>${manifest.counts.messages} messages · ${manifest.counts.attachments} attachments · created ${escapeHtml(result.createdAt)}</p></header><main>${rows}</main></body></html>`;
  const entries: Record<string, Uint8Array> = {
    'index.html': strToU8(index),
    'manifest.json': strToU8(JSON.stringify(manifest, null, 2)),
    'README.txt': strToU8('Open index.html in any modern browser. Original messages are in eml/. Compare SHA-256 values with manifest.json.\n')
  };
  result.messages.forEach((message, indexValue) => {
    const number = String(indexValue + 1).padStart(5, '0');
    entries[`eml/${number}.eml`] = strToU8(message.raw);
    message.attachments.forEach((attachment, attachmentIndex) => {
      const safeName = attachment.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      entries[`attachments/${number}/${String(attachmentIndex + 1).padStart(2, '0')}-${safeName}`] = attachment.content;
    });
  });
  return zipSync(entries, { level: 6 });
}
