export type SourceType = 'MBOX' | 'Maildir' | 'EML' | 'IMAP';

export interface AttachmentRecord {
  name: string;
  mediaType: string;
  size: number;
  hash: string;
  content: Uint8Array;
}

export interface MessageRecord {
  id: string;
  folder: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  headers: Record<string, string>;
  body: string;
  raw: string;
  hash: string;
  attachments: AttachmentRecord[];
}

export interface ArchiveResult {
  sourceType: SourceType;
  sourceName: string;
  createdAt: string;
  folders: string[];
  messages: MessageRecord[];
  anomalies: Array<{ type: 'duplicate' | 'missing-date' | 'attachment' | 'count'; detail: string }>;
}
