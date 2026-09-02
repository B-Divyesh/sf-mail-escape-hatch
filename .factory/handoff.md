# Mail Escape Hatch repair handoff

## Repair delivered

- Preserved every imported RFC 822 message as exact `Uint8Array` source bytes. Hashes and exported `eml/` files now use those bytes directly; no UTF-8 round trip occurs.
- Added MIME handling for multipart parts, RFC 2231 `filename*=`, quoted-printable attachments, and base64 attachments. Invalid or unsupported attachment encoding creates a visible archive anomaly and is never exported as an empty verified file.
- Made the portable reader link to each original EML and each exported attachment. `manifest.json` now records `emlPath`, attachment `archivePath`, and decode errors.
- IMAP now opens folders with read-only `EXAMINE`, fetches with `BODY.PEEK[]`, keeps byte arrays intact, and returns folder-open/read failures to the report.
- Rejected empty or headerless EML files, increased demo/header/footer targets to at least 44 px, retained the static-host 404 override, and removed unavailable checkout, licensing, and keychain promises.
- Registered material claims in `.factory/claims.json`, including byte preservation, MIME failures, IMAP read-only behavior, folder errors, installer checksum verification, mobile targets, and static 404 delivery.

## Exact regression evidence

`@claim:source-bytes` imports an ISO-8859-1 8bit EML whose final byte is `0xe9`, exports it, and compares the exported EML SHA-256 to the source SHA-256. It passes with byte-for-byte equality.

`@claim:mime-attachments` verifies RFC 2231 `filename*=UTF-8''report%20final.pdf`, quoted-printable `caf=C3=A9` → `café`, manifest archive paths, and standalone-reader links. `@claim:invalid-attachments` proves malformed base64 is shown as an anomaly and produces no attachment file.

## Verification run

Run from a clean checkout:

```sh
npm ci
npm test
npx tsc --noEmit
npm run build
npm audit --audit-level=high
cargo test --locked --manifest-path src-tauri/Cargo.toml
```

Completed locally on 2026-09-02:

- `npm test`: 11 unit assertions and 6 Playwright assertions passed, including archive export, keyboard/a11y route checks, offline reload, 390 px layout, and 44 px demo controls.
- `npx tsc --noEmit`, `npm run build`, `npm audit --audit-level=high`, and `git diff --check`: passed.
- Production site build: main JavaScript 15.65 KB gzip; CSS 3.97 KB gzip.
- `cargo test --locked --manifest-path src-tauri/Cargo.toml`: 3 Rust tests passed. Cargo reports the pre-existing `imap-proto 0.10.2` future-incompatibility warning.
- Every claims command was executed after the full suites; all passed.

## Deployment and operator notes

- Static output is `dist/site/`. The deployment uses `public/staticwebapp.config.json` (copied to that output), with a real host-level `404` response override.
- Deployed on 2026-09-02 to `https://mail-escape-hatch.sociobot.in` (SWA deployment `5e4e52fd-5354-42a0-af9b-edf2a412e212`). Live checks: `/` 200, `/demo` 200, and `/missing-route` 404 with the designed standalone 404 page.
- Desktop release workflow remains Tauri 2 and builds unsigned macOS, Windows, and Linux artifacts. Signing certificates remain the only optional operator addition.
- No checkout is exposed because the production billing product is unavailable. The core archive tool is fully available without it.
