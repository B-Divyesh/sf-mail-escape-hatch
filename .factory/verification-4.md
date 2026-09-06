# Repair verification 4 — PASS

- Work order: `mail-escape-hatch-repair-3`
- Implementation and release SHA: `dbe217579be31cf2800ea9875efe6e7f8f3ee63a`
- Verification-test/documentation SHA: `a7ed308407c543a8f296a069ca2150de412b506a`
- Release: `v0.1.2`
- GitHub Actions run: `34011169108` — success
- Live URL: `https://mail-escape-hatch.sociobot.in`
- Verified: 2026-09-06 UTC
- Result: **PASS for the repair scope.** All three verification-3 release blockers are closed.

## Current findings and fixes

### Zero-byte base64 attachments — fixed

Empty base64 now decodes to a valid zero-byte array rather than an error. The
browser regression imports unnamed, RFC 2231 continued-name, and named empty
attachments, downloads the ZIP, and asserts:

- three attachment records and three archive files;
- `attachments/00001/03-empty.dat` exists and is zero bytes;
- its SHA-256 is `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`;
- its manifest path and reader link are present; and
- the report says **All checks passed** only after all three files are exported.

The same boundary was repeated against the deployed HTTPS app and passed.

### Reader truncation — fixed

The fixed 100,000-character slice was removed. The reader-completeness claim
exports a message longer than 100,000 characters and asserts that the final
`END-OF-MESSAGE-LEGAL-HOLD` marker and the complete body appear in `index.html`
and that the original EML is byte-identical. The live boundary flow passed too.

### Lighthouse instability — fixed

The MIME/ZIP engine and sample module are now loaded only when a user opens the
demo or imports mail. The GitHub release lookup starts only when the download
section nears the viewport. The hero uses asynchronous decoding.

Three throttled mobile Lighthouse 13 runs against production scored:

| Run | Performance | Accessibility | Best practices | SEO | LCP | TBT | CLS |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 100 | 100 | 100 | 100 | 1.45 s | 25 ms | 0 |
| 2 | 100 | 100 | 100 | 100 | 1.35 s | 0 ms | 0 |
| 3 | 100 | 100 | 100 | 100 | 1.48 s | 0 ms | 0 |

Transferred bytes were 157,967–158,060. Initial application JavaScript is
26,100 bytes raw / 9.14 kB gzip; CSS is 14,585 bytes raw / 4.00 kB gzip.

## Minor findings and contract gaps

- README now lists the exact Debian/Ubuntu WebKit, AppIndicator, SVG, patching,
  and secret-service packages required by the Rust checks.
- The no-analytics statement now has a dedicated claim and browser test across
  home, privacy, and demo export. It observed no data requests, external
  origins, non-GET requests, or cookies in the sandbox.
- `fflate` was updated from 0.8.2 to 0.8.3; `npm audit --audit-level=moderate`
  now reports zero vulnerabilities.
- The one-time $19 local history feature, daily license verification, return
  token capture, and restore flow are present again. The billing product is
  still not registered: its public checkout returns HTTP 404. The site does not
  expose that broken checkout and states that new purchases are not open.
  `/work/.evidence/billing-offer.json` contains the exact prior public offer for
  the separate billing operator.
- The client and static 404 now use the plain heading **Page not found**. Route
  changes update canonical, Open Graph, and Twitter metadata.

## Clean setup and automated gates

The documented Linux packages were installed first, followed by `npm ci`.

- Every command in all 22 `.factory/claims.json` entries: pass.
- `npm test`: 15 Vitest tests and 11 Playwright tests pass.
- `npx tsc --noEmit`: pass.
- `npm run build`: pass; output is `dist/site/`.
- `npm audit --audit-level=moderate`: zero vulnerabilities.
- `npm run lint:rust`: Rust formatting and strict Clippy pass.
- `cargo test --locked --manifest-path src-tauri/Cargo.toml`: 4 pass.
- `git diff --check`: pass.

`imap-proto 0.10.2` still prints a future-incompatibility warning. It does not
fail the current stable compiler or tests.

## Live browser, accessibility, privacy, and recovery

- The factory URL verifier passed in 863 ms with no console error, one `<h1>`,
  `lang="en"`, one `<main>`, and complete image alternatives.
- Fresh 1440×900 and 390×844 contexts show the job, audience, sample action,
  privacy fact, account requirement, and price before scrolling.
- One click opens four realistic messages and two attachments. The demo banner
  persists through reset. **Start for real** clears the sample and leaves no
  demo or export-history storage.
- The live demo ZIP contains the expected reader, manifest, four EML files, and
  two attachments. It makes only same-origin requests.
- Axe found zero violations on home, demo, privacy, and terms at both desktop
  and 390 px widths.
- Keyboard checks passed for the skip link, main focus, IMAP dialog focus,
  Escape close, and focus return. Reduced-motion styling reports 0.001 ms.
- A fresh service-worker context contains only `mail-escape-hatch-v3`; the demo
  reloads while offline.
- Privacy and terms return 200 with route titles. An unknown route returns the
  designed page with deliberate HTTP 404.
- All seven rendered links resolve successfully. Security and cache headers are
  present. All 27 deployable files match the local build byte-for-byte.

There is no product backend, tenant store, or product-owned HTTP rate limiter,
so tenant isolation, SQLite restart persistence, health, and 429 checks do not
apply. Mail and licensed receipts remain local to the desktop/browser.

## Release and installed-artifact evidence

Release `v0.1.2` has four macOS assets, two Windows installers, three Linux
packages, `SHA256SUMS`, and `latest.json`. The manifest names all platforms.
The published Debian package is version 0.1.2, amd64, and its downloaded hash
matches `SHA256SUMS`:

`7fb5f443127ac3a6c690d13d9f86edc41bdc2f651486f660121ceda42a697b61`

The Debian package was extracted into a fresh temporary consumer directory.
Its 12,013,712-byte binary remained running for a 12-second Xvfb smoke test;
the only output was the expected headless EGL warning. A fresh live browser
resolves the Linux download button to the `v0.1.2` AppImage without console
errors.

## Earlier verification disposition

All findings from `.factory/verification.md` and `.factory/verification-2.md`
remain fixed: original bytes, MIME transfer decoding, read-only IMAP, folder
error reporting, linked originals and attachments, empty-EML rejection, true
404 responses, mobile targets, focusable report scrolling, source-picker
recovery, service-worker replacement, strict Rust lint, release identity, and
installer checksums. Verification-3's empty-attachment, reader, performance,
Linux-prerequisite, no-analytics-claim, and paid-feature gaps are addressed as
described above.

## Remaining external dependencies

- The Sociobot billing operator must register the existing $19 one-time offer
  before new checkout can be opened. No provider credential or guessed offer
  was added.
- macOS notarization and Windows Authenticode still require owner-provided
  signing certificates. Published builds remain clearly marked unsigned.
- Gmail and Microsoft OAuth consent require provider app registration. App
  passwords and provider export files remain supported.
- Large imports are held in memory, and final archives are not encrypted unless
  the user chooses an encrypted destination.
