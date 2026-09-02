import { buildArchive } from './archive';

const boundary = 'sample-boundary-2026';
const messages = [
`From archivist@example.test Tue Aug 18 09:14:00 2026
Message-ID: <boarding-pass@example.test>
Date: Tue, 18 Aug 2026 09:14:00 +0000
From: Mara Chen <mara@example.test>
To: archive-owner@example.test
Subject: Train tickets for the move
Content-Type: multipart/mixed; boundary="${boundary}"

--${boundary}
Content-Type: text/plain

The tickets are attached. Keep this message with the move records.
--${boundary}
Content-Type: application/pdf
Content-Disposition: attachment; filename="tickets.pdf"
Content-Transfer-Encoding: base64

JVBERi0xLjQKJXN5bnRoZXRpYyBzYW1wbGU=
--${boundary}--`,
`From records@example.test Tue Aug 18 10:20:00 2026
Message-ID: <account-close@example.test>
Date: Tue, 18 Aug 2026 10:20:00 +0000
From: Provider Records <records@example.test>
To: archive-owner@example.test
Subject: Account closure receipt
Content-Type: text/plain; charset=utf-8

Your mailbox closure was requested. This sample contains no real account details.`,
`From family@example.test Wed Aug 19 17:42:00 2026
Message-ID: <recipe-card@example.test>
Date: Wed, 19 Aug 2026 17:42:00 +0000
From: Jonah Bell <family@example.test>
To: archive-owner@example.test
Subject: Scanned recipe card
Content-Type: multipart/mixed; boundary="scan-part"

--scan-part
Content-Type: text/plain

Here is the card we discussed.
--scan-part
Content-Type: image/jpeg
Content-Disposition: attachment; filename="recipe-card.jpg"
Content-Transfer-Encoding: base64

/9j/4AAQSkZJRgABAQAAAQABAAD/2Q==
--scan-part--`,
`From records@example.test Thu Aug 20 08:01:00 2026
Message-ID: <missing-date@example.test>
From: Provider Records <records@example.test>
To: archive-owner@example.test
Subject: Export notice without a date
Content-Type: text/plain

This message demonstrates a missing Date header.`
].join('\n');

export async function sampleArchive() {
  const file = new File([messages], 'provider-export.mbox', { type: 'application/mbox' });
  return buildArchive([file], 'MBOX');
}
