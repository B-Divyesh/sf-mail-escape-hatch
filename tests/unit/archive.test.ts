import { describe, expect, it } from 'vitest';
import { buildArchive, createPortableArchive, parseMessage, sha256, splitMbox } from '../../src/archive';
import { unzipSync, strFromU8 } from 'fflate';

const simple = `Message-ID: <one@test>\nDate: Tue, 18 Aug 2026 09:14:00 +0000\nFrom: One <one@test>\nTo: Two <two@test>\nSubject: Saved message\nContent-Type: text/plain\n\nHello archive.`;

describe('archive engine', () => {
  it('parses stable headers and hashes', async () => {
    const message = await parseMessage(new TextEncoder().encode(simple));
    expect(message.subject).toBe('Saved message');
    expect(message.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('splits mbox separators without dropping messages', () => {
    const mbox = `From one@test Tue Aug 18 09:14:00 2026\n${simple}\nFrom two@test Tue Aug 18 10:14:00 2026\n${simple.replace('<one@test>', '<two@test>')}`;
    expect(splitMbox(new TextEncoder().encode(mbox))).toHaveLength(2);
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

  it('@claim:source-bytes preserves ISO-8859-1 source bytes exactly in the exported EML', async () => {
    const prefix = new TextEncoder().encode('Message-ID: <latin@test>\r\nDate: Tue, 18 Aug 2026 09:14:00 +0000\r\nFrom: One <one@test>\r\nSubject: café\r\nContent-Type: text/plain; charset=ISO-8859-1\r\nContent-Transfer-Encoding: 8bit\r\n\r\ncaf');
    const source = new Uint8Array([...prefix, 0xe9]);
    const result = await buildArchive([new File([source], 'latin.eml')]);
    const files = unzipSync(createPortableArchive(result));
    expect(files['eml/00001.eml']).toEqual(source);
    expect(await sha256(files['eml/00001.eml'])).toBe(await sha256(source));
    expect(result.anomalies).toEqual([]);
  });

  it('@claim:mime-attachments decodes RFC2231 filenames and quoted-printable attachments, and links them in the reader', async () => {
    const message = `Message-ID: <mime@test>\r\nDate: Tue, 18 Aug 2026 09:14:00 +0000\r\nFrom: One <one@test>\r\nSubject: MIME\r\nContent-Type: multipart/mixed; boundary="b"\r\n\r\n--b\r\nContent-Type: text/plain\r\n\r\nBody\r\n--b\r\nContent-Type: application/pdf\r\nContent-Disposition: attachment; filename*=UTF-8''report%20final.pdf\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\ncaf=C3=A9\r\n--b--\r\n`;
    const result = await buildArchive([new File([message], 'mime.eml')]);
    expect(result.messages[0].attachments[0]).toMatchObject({ name: 'report final.pdf', size: 5 });
    expect(new TextDecoder().decode(result.messages[0].attachments[0].content)).toBe('café');
    const files = unzipSync(createPortableArchive(result));
    expect(Object.keys(files)).toContain('attachments/00001/01-report_final.pdf');
    expect(strFromU8(files['index.html'])).toContain('Open original EML');
    expect(strFromU8(files['index.html'])).toContain('report final.pdf');
    expect(JSON.parse(strFromU8(files['manifest.json'])).messages[0].attachments[0].archivePath).toBe('attachments/00001/01-report_final.pdf');
  });

  it('@claim:mime-attachment-completeness keeps unnamed attachments and RFC 2231 continued filenames', async () => {
    const message = `Message-ID: <continued@test>\r\nDate: Tue, 18 Aug 2026 09:14:00 +0000\r\nFrom: One <one@test>\r\nSubject: Every attachment\r\nContent-Type: multipart/mixed; boundary="b"\r\n\r\n--b\r\nContent-Type: application/octet-stream\r\nContent-Disposition: attachment\r\nContent-Transfer-Encoding: base64\r\n\r\nSGVsbG8=\r\n--b\r\nContent-Type: application/pdf\r\nContent-Disposition: attachment; filename*0*=UTF-8''quarterly%20; filename*1*=report.pdf\r\nContent-Transfer-Encoding: base64\r\n\r\nUERG\r\n--b--\r\n`;
    const result = await buildArchive([new File([message], 'continued.eml')]);
    const attachments = result.messages[0].attachments;
    expect(result.anomalies).toEqual([]);
    expect(attachments).toHaveLength(2);
    expect(attachments[0]).toMatchObject({ name: 'attachment-1.octet-stream', size: 5 });
    expect(new TextDecoder().decode(attachments[0].content)).toBe('Hello');
    expect(attachments[1]).toMatchObject({ name: 'quarterly report.pdf', size: 3 });
    const files = unzipSync(createPortableArchive(result));
    expect(Object.keys(files)).toEqual(expect.arrayContaining([
      'attachments/00001/01-attachment-1.octet-stream',
      'attachments/00001/02-quarterly_report.pdf'
    ]));
    expect(JSON.parse(strFromU8(files['manifest.json'])).counts.attachments).toBe(2);
  });

  it('@claim:invalid-attachments rejects malformed base64 instead of exporting an empty attachment or reporting success', async () => {
    const message = `Message-ID: <broken@test>\nDate: Tue, 18 Aug 2026 09:14:00 +0000\nFrom: One <one@test>\nSubject: Broken\nContent-Type: multipart/mixed; boundary="b"\n\n--b\nContent-Type: application/pdf\nContent-Disposition: attachment; filename="evidence.pdf"\nContent-Transfer-Encoding: base64\n\nnot valid base64!\n--b--\n`;
    const result = await buildArchive([new File([message], 'broken.eml')]);
    expect(result.messages[0].attachments[0].content).toBeUndefined();
    expect(result.messages[0].attachments[0].error).toMatch(/not exported/);
    expect(result.anomalies).toContainEqual(expect.objectContaining({ type: 'attachment' }));
    const files = unzipSync(createPortableArchive(result));
    expect(Object.keys(files).some((path) => path.startsWith('attachments/'))).toBe(false);
  });

  it('@claim:empty-eml rejects empty EML files', async () => {
    await expect(buildArchive([new File([], 'empty.eml')])).rejects.toThrow(/empty/);
  });
});
