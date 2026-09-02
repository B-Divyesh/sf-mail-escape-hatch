import { describe, expect, it } from 'vitest';
import { buildArchive, createPortableArchive, parseMessage, splitMbox } from '../../src/archive';
import { unzipSync, strFromU8 } from 'fflate';

const simple = `Message-ID: <one@test>\nDate: Tue, 18 Aug 2026 09:14:00 +0000\nFrom: One <one@test>\nTo: Two <two@test>\nSubject: Saved message\nContent-Type: text/plain\n\nHello archive.`;

describe('archive engine', () => {
  it('parses stable headers and hashes', async () => {
    const message = await parseMessage(simple);
    expect(message.subject).toBe('Saved message');
    expect(message.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('splits mbox separators without dropping messages', () => {
    const mbox = `From one@test Tue Aug 18 09:14:00 2026\n${simple}\nFrom two@test Tue Aug 18 10:14:00 2026\n${simple.replace('<one@test>', '<two@test>')}`;
    expect(splitMbox(mbox)).toHaveLength(2);
  });

  it('writes an independent HTML, EML, and manifest archive', async () => {
    const result = await buildArchive([new File([simple], 'message.eml')]);
    const files = unzipSync(createPortableArchive(result));
    expect(Object.keys(files)).toEqual(expect.arrayContaining(['index.html', 'manifest.json', 'eml/00001.eml']));
    expect(JSON.parse(strFromU8(files['manifest.json'])).counts.messages).toBe(1);
    expect(strFromU8(files['index.html'])).toContain('Saved message');
  });

  it('@claim:maildir-import keeps the Maildir folder name', async () => {
    const file = new File([simple], '1710000000.eml');
    Object.defineProperty(file, 'webkitRelativePath', { value: 'MyMail/Archive/cur/1710000000.eml' });
    const result = await buildArchive([file], 'Maildir');
    expect(result.sourceType).toBe('Maildir');
    expect(result.folders).toEqual(['MyMail/Archive']);
  });

  it('@claim:duplicate-check flags repeated message identities', async () => {
    const first = new File([simple], 'one.eml');
    const second = new File([simple.replace('Hello archive.', 'A changed body.')], 'two.eml');
    const result = await buildArchive([first, second]);
    expect(result.anomalies).toContainEqual({ type: 'duplicate', detail: 'Saved message matches Saved message.' });
  });
});
