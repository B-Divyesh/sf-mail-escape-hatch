# Independent verification — FAIL

- Work order: `mail-escape-hatch-verify-1`
- Candidate: `9f915297afed56cda03fc6f26ab9ac00634ec9e3`
- Live URL: `https://mail-escape-hatch.sociobot.in`
- Verified: 2026-09-02 UTC
- Result: **FAIL — do not release as an archive verifier**

The first screen passes the cold-read gate. It says the product verifies mail for people leaving an email provider and presents **Try it with sample data** as the first action. One click opens a realistic four-message report.

The candidate still fails its core job. Common valid mail is silently changed or omitted while the UI says **All checks passed**. The paid checkout is also unavailable.

## Release-blocking findings

### Critical — valid source bytes are changed while verification passes

An EML with an ISO-8859-1 `8bit` body ending in byte `e9` was imported through the production build and exported again. The UI said **All checks passed**, but the original and exported EML were different:

- input SHA-256: `15a5ab55b797f7e90e30efc5b9d470389f4eb2d52456b0a601e35d550ba4aff0`
- exported SHA-256: `629209b90eef13ac1c997276217bf23f875f9ef6f692647f997b679fee7bc5be`
- source tail: `63 61 66 e9`; exported tail: `63 61 66 ef bf bd`

The browser importer decodes every source as UTF-8 and later re-encodes it (`src/archive.ts:4,83,141`). The desktop IMAP path independently performs lossy UTF-8 conversion (`src-tauri/src/lib.rs:98`). This breaks the brief's preservation and legal-hold requirements and makes message hashes describe altered data.

### Critical — attachments can be omitted or corrupted with “All checks passed”

Three end-to-end production-build fixtures demonstrated false success:

1. A normal RFC 2231 header, `filename*=UTF-8''report%20final.pdf`, produced `attachments: 0`; the ZIP had no attachment and the UI said **All checks passed**.
2. A quoted-printable attachment containing `caf=C3=A9` was exported literally as `caf=C3=A9`, not `café`; the UI said **All checks passed**.
3. Invalid base64 for `evidence.pdf` was swallowed into a zero-byte file with the empty-file SHA-256 `e3b0c442...b855`; the manifest counted one attachment and the UI said **All checks passed**.

The MIME parser only recognizes `filename=`, only decodes base64, and turns base64 errors into empty bytes (`src/archive.ts:22-49`). This does not meet the attachment-complete archive contract.

### Critical — IMAP can change source state and silently omit folders

Code inspection of the shipping Rust path found two completeness/safety failures:

- It opens folders with read-write `SELECT` and fetches `RFC822` (`src-tauri/src/lib.rs:76,92`). That form may set `\Seen`, contradicting the visible claim “Nothing is changed at the source.” A read-only `EXAMINE` plus a non-seen-setting body fetch is required.
- A failed folder selection is silently skipped (`src-tauri/src/lib.rs:76-79`). That folder is absent from both `folder_counts` and the anomaly report, so a partial mailbox can appear complete.

There are zero Rust tests and no IMAP integration fixture. The direct IMAP path therefore has neither behavioral coverage nor a claim test.

### High — the paid purchase action is dead

The live **Buy a license** link targets the documented Sociobot endpoint, but on 2026-09-02 it returned:

```text
HTTP/2 404
{"error":"enabled factory product","status":404}
```

The page advertises a `$19` one-time product that cannot be bought. The cached-fixture `paid-history` test does not exercise checkout or a real verification response.

### High — the portable reader does not expose its files

The generated `index.html` contains no links to `eml/` or `attachments/`, and the manifest attachment objects contain no archive paths. A user opening the promised standalone reader cannot open an attachment or original message from the reader. This misses the “readable, searchable, and attachment-complete outside the mail client” job.

### High — material public claims are absent from `.factory/claims.json`

Unlisted claims include direct IMAP import, no source changes, OS-keychain password storage, EML import, checksum-verifying installers, one-folder-at-a-time IMAP behavior, and preservation of original RFC 822 headers/body. The existing `local-only` test covers only the browser demo. Under the claims contract, unlisted claims are release-blocking; one of them (“Nothing is changed at the source”) also conflicts with the implementation.

## Other findings

- **Medium:** Demo controls are 32 px high; the required touch target is at least 44 px. Other header/footer links also have undersized hit boxes at 390 px.
- **Medium:** `/missing-route` renders the designed client page but responds HTTP 200, not 404.
- **Medium:** An empty `.eml` is accepted as one message. It gets a missing-date warning, but invalid content is not rejected.
- **Coverage:** `cargo test --locked` succeeds but runs zero tests. The parser unit suite has five small synthetic tests and does not cover MIME transfer encodings, non-UTF-8 bytes, malformed attachments, or IMAP behavior.

## Claims gate

The literal pre-install invocations from the clean clone could not load `@playwright/test` or `vitest` because `node_modules` was absent. After the required clean `npm ci`, every exact command from `.factory/claims.json` passed:

| Claim | Result | Evidence |
| --- | --- | --- |
| `sample-sandbox` | PASS | 1 Playwright test passed; sample counts visible; no `demo:` storage keys |
| `no-account` | PASS | 1 Playwright test passed in a fresh context |
| `portable-archive` | PASS for its narrow fixture | ZIP contained the asserted paths and 64-character hash strings |
| `mbox-import` | PASS for its narrow fixture | Four messages and two simple base64 attachments |
| `maildir-import` | PASS | 1 Vitest test passed |
| `duplicate-check` | PASS | 1 Vitest test passed |
| `local-only` | PASS for demo | Demo export requested only its origin |
| `offline-reload` | PASS | Fresh-context offline reload succeeded |
| `paid-history` | PASS for cached fixture | Local receipt written after an injected valid verdict |

The narrow `portable-archive` assertion checks that hashes look like hashes, not that they match original input bytes. The independent cases above demonstrate that the broad public claim is false despite that test passing.

## Build and automated gates

- `npm ci`: PASS, 65 packages, zero audit findings.
- `npm test`: PASS, 5 Vitest tests and 8 Playwright tests.
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS; output in `dist/site/`.
- `npm audit --audit-level=high`: PASS, zero known vulnerabilities.
- No lint script or lint configuration is present.
- `cargo test --locked --manifest-path src-tauri/Cargo.toml`: PASS after installing the same Linux libraries declared by the release workflow; zero Rust tests ran. `imap-proto 0.10.2` emitted a future-incompatibility warning.

## Live deployment and release evidence

- Live `index.html`, main JS, CSS, core chunk, and `sw.js` SHA-256 hashes exactly match the local candidate build.
- Candidate changes after release commit `96436b5e26704becf6640c6eece70ff2144b03a5` are documentation-only.
- GitHub Actions run `33587703454` completed successfully at `96436b5`.
- Release `v0.1.0` contains macOS arm64/x64, Windows MSI/EXE, Linux AppImage/DEB/RPM, `SHA256SUMS`, and valid `latest.json`.
- Downloaded `Mail.Escape.Hatch_0.1.0_amd64.deb` matched its checksum and had the expected package metadata.
- The live one-line Linux installer downloaded and verified the AppImage. Installed SHA-256 `5838aa47c78a9738a4cefb10a6dddf93275a610fbfe8ab08ffd69a3dbf2cc732` matched `SHA256SUMS`. It reported its AppImage runtime version and remained running for 10 seconds under Xvfb with extract-and-run.

## Browser, accessibility, privacy, and performance

- Desktop and 390×844 mobile: no document-level horizontal overflow; cold first screen and demo were usable.
- Axe: no serious or critical findings on `/`, `/demo`, `/privacy`, `/terms`, or the client 404, locally and live.
- Keyboard: the first Tab reaches a visible 3 px focus-ring skip link; Enter opened the restore dialog; focus moved to Close; Escape returned focus; Enter downloaded the demo ZIP.
- Reduced motion: animation and transition duration reduced to `0.001ms`.
- Console/page errors: none across the five tested routes.
- Privacy: isolated live demo/export traffic was same-origin only. The landing page additionally contacted only the documented GitHub Releases API. No analytics, remote fonts, or third-party scripts were observed.
- PWA: live `mail-escape-hatch-v1` cache installed; offline reload showed the report; `registration.update()` completed without an error.
- Headers: HSTS, CSP with `frame-ancestors 'none'`, `nosniff`, referrer policy, and permissions policy were present. Hashed assets use one-year immutable caching; HTML and `sw.js` use 30-second revalidation.
- Bundles: main JS 39,934 B raw / 15,608 B gzip; CSS 14,317 B raw / 3,973 B gzip; mobile hero 36,042 B. All stated budgets pass.
- Lighthouse mobile: Performance 91, Accessibility 100, Best Practices 100, SEO 100; FCP 0.9 s, LCP 2.1 s, CLS 0, TBT 350 ms, 157 KiB transfer.
- Product has no sign-in, so Entra tenant verification is not applicable.
- Product-specific verification endpoint allowed 30 identical requests; request 31 returned HTTP 429 with `Retry-After: 3` and `X-RateLimit-After: 3`.

## Required next work

Use a standards-compliant MIME/mailbox parser that preserves original bytes, recursively handles MIME and transfer encodings, reports decode failures, and tests against a diverse fixture corpus. Make IMAP read-only and report every skipped/failing folder. Link exported attachments and EMLs from the reader/manifest. Register and verify the production billing product. Add every material claim and its real end-to-end test, then rerun this verification from a new candidate commit.
