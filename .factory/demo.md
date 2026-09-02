# Demo sandbox

- URL: `https://mail-escape-hatch.sociobot.in/demo` (local: `http://127.0.0.1:4173/demo`).
- Sample: one synthetic MBOX with four messages, two attachments, and one message missing its Date header.
- Expected result: one folder, four messages, two attachments, and one review issue.
- Reset: choose **Reset demo** in the persistent amber banner.
- Leave: choose **Start for real**. The installed desktop app opens an empty source picker; the website returns to downloads.
- Storage: demo state is held only in page memory. It does not read or write production storage. No `demo:` localStorage keys are created.
- Network: the demo archive flow has no external requests and runs after an offline reload once the shell is cached.
