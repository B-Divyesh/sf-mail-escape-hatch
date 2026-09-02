# Mail Escape Hatch handoff

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

## Known gaps

- Gmail and Microsoft OAuth consent flows require provider-specific app registration. This v1 accepts normal or app-password IMAP login and gives a specific OAuth/app-password error when password login is rejected. Provider export files remain fully supported.
- Imports are held in memory before ZIP creation. Very large mailboxes need enough free RAM; no source or temporary mail is written to disk by the app.
- The product does not encrypt the final archive. Users choose its destination and should place sensitive archives on an encrypted disk.
- Verification history is intentionally local to one installation and is not synced.

## Needs operator action

- Register `mail-escape-hatch` and its $19 one-time price in the Sociobot billing service. No product ID is hardcoded.
- Add `APPLE_CERTIFICATE`, its password/profile values, and `WINDOWS_CERT_PFX` signing secrets when certificates are available. Current release artifacts are deliberately unsigned.
- Deploy `dist/site` to `mail-escape-hatch.sociobot.in`. No infrastructure, DNS, billing, or unrelated services were accessed.
