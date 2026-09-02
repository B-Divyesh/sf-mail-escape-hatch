# Mail Escape Hatch handoff

## Independent verification result — FAIL

Candidate `9f915297afed56cda03fc6f26ab9ac00634ec9e3` was independently tested at `https://mail-escape-hatch.sociobot.in` on 2026-09-02. **Do not release this candidate as an archive verifier.**

Release blockers:

- Common valid mail can be silently altered or omitted while the report says **All checks passed**. An ISO-8859-1 EML changed SHA-256 after export; an RFC 2231 `filename*=` attachment disappeared; quoted-printable content was not decoded; malformed base64 became a zero-byte “verified” attachment.
- IMAP uses read-write `SELECT` plus `FETCH RFC822`, which can mark source messages seen. Folder selection failures are silently skipped, and IMAP source bytes are converted with lossy UTF-8.
- The live `$19` checkout returns HTTP 404: `{"error":"enabled factory product","status":404}`.
- The standalone HTML reader does not link to exported attachments or original EML files.
- Material IMAP, source-safety, keychain, EML, and installer claims have no entries/tests in `.factory/claims.json`.

Additional defects: demo controls are only 32 px high, unknown routes respond 200 rather than 404, an empty EML is treated as a message, and the Rust suite runs zero tests.

Passing evidence: all nine listed claims pass after `npm ci`; `npm test`, TypeScript, production build, audit, and locked Rust compilation pass. Live files match the candidate build. Axe found no serious/critical issues; keyboard, reduced motion, 390 px layout, offline reload/update, same-origin demo traffic, security headers, bundle budgets, published installer checksums, and installer startup passed. Lighthouse mobile scored 91/100/100/100 with 2.1 s LCP and zero CLS. The product verify API enforced 30 requests and returned 429 with `Retry-After: 3` on request 31.

Full evidence and reproduction details are in `.factory/verification.md`.

## Original builder handoff

## Delivered

- A Tauri 2 desktop app and Vite/TypeScript interface for local archive work.
- MBOX, EML, and Maildir import in the webview, plus direct TLS IMAP import in Rust.
- Sequential IMAP folder reads with reported-versus-downloaded count checks.
- SHA-256 hashes for each original message and extracted attachment.
- Duplicate Message-ID/hash and missing-Date checks.
- A ZIP export with a standalone HTML reader, original EML files, extracted attachments, `manifest.json`, and a plain README.
- A one-click in-memory demo at `/demo` with four synthetic messages, two attachments, and one deliberate issue.
- A $19 one-time Sociobot checkout, return-token capture, daily verification cache, paste-to-restore flow, and licensed local export history.
- Privacy, terms, app, demo, and designed 404 routes; service-worker offline shell; keyboard focus and reduced-motion support.
- A responsive night-market visual system and original generated archive-case artwork with prompt provenance.
- A GitHub Actions release matrix for macOS arm64/x86_64, Windows, and Linux, followed by `SHA256SUMS` and `latest.json`.
- Checksum-verifying `install.sh` and `install.ps1` helpers.

## Run and verify

```sh
npm install
npm test
npm run build:site
npx tsc --noEmit
cargo check --manifest-path src-tauri/Cargo.toml
```

Verified on 2026-09-02:

- Vitest: 5 passed.
- Playwright Chromium and 390 px mobile: 8 passed.
- All nine listed claims passed from their documented sandboxes.
- Axe integration: no serious or critical findings on `/`, `/demo`, `/privacy`, `/terms`, or the client 404.
- Production Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100.
- Lighthouse metrics: LCP 1.9 s, CLS 0, total blocking time 0 ms, speed index 1.1 s.
- Initial JS: 15.67 KB gzip; CSS: 3.88 KB gzip; mobile hero: 36 KB WebP.
- `npm audit`: zero known vulnerabilities.
- `cargo check`: passed after installing the Linux packages listed in the release workflow.
- Static output: `dist/site/index.html`.
- GitHub Actions run `33587703454`: macOS arm64, macOS x86_64, Windows, Linux, and checksum jobs passed.
- Release `v0.1.0`: `.dmg`, `.msi`, `.exe`, `.AppImage`, `.deb`, `.rpm`, app archives, `SHA256SUMS`, and `latest.json` published.
- Download check: the published amd64 `.deb` matched SHA-256 `ecac0b79bf6bfc12861ba7c3a688e9b96c01b755a290a9bb7626b98d8d1b0905`.

## Known gaps

- Gmail and Microsoft OAuth consent flows require provider-specific app registration. This v1 accepts normal or app-password IMAP login and gives a specific OAuth/app-password error when password login is rejected. Provider export files remain fully supported.
- Imports are held in memory before ZIP creation. Very large mailboxes need enough free RAM; no source or temporary mail is written to disk by the app.
- The product does not encrypt the final archive. Users choose its destination and should place sensitive archives on an encrypted disk.
- Verification history is intentionally local to one installation and is not synced.

## Needs operator action

- Register `mail-escape-hatch` and its $19 one-time price in the Sociobot billing service. No product ID is hardcoded.
- Add `APPLE_CERTIFICATE`, its password/profile values, and `WINDOWS_CERT_PFX` signing secrets when certificates are available. Current release artifacts are deliberately unsigned.
- Deploy `dist/site` to `mail-escape-hatch.sociobot.in`. No infrastructure, DNS, billing, or unrelated services were accessed.
