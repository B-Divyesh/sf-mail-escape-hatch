# Mail Escape Hatch repair handoff

## Result

Repair 3 is complete. The implementation and desktop release SHA is
`dbe217579be31cf2800ea9875efe6e7f8f3ee63a`; later commits contain tests and
verification documentation only. Release `v0.1.2` and the live static site use
that implementation.

The three release blockers are fixed:

- valid zero-byte base64 attachments are exported, hashed, linked, and listed
  in the manifest;
- standalone readers contain complete message text beyond 100,000 characters;
- three production Lighthouse mobile runs scored 100 Performance, with
  0–25 ms Total Blocking Time.

The README Linux prerequisites, dedicated no-analytics claim, outdated 404
wording/metadata, moderate ZIP dependency advisory, and researched paid-history
deliverable were also addressed.

## Run and verify

On Debian or Ubuntu, install the packages listed in README, then run:

```sh
npm ci
npm test
npm run build
npm run lint:rust
cargo test --locked --manifest-path src-tauri/Cargo.toml
```

Observed on 2026-09-06:

- all 22 exact claim commands passed from the documented clean setup;
- 15 Vitest tests and 11 Playwright tests passed;
- TypeScript, build, Rust formatting, strict Clippy, and 4 Rust tests passed;
- `npm audit --audit-level=moderate` reported zero vulnerabilities;
- `dist/site/` contains the deployable static site;
- live desktop/phone, demo/reset/start, local boundary export, keyboard,
  reduced-motion, privacy, offline, legal, and 404 checks passed;
- axe found zero violations on all normal routes at desktop and phone widths;
- all 27 deployed files match the local build by SHA-256.

Full commands, measurements, prior-finding disposition, and release evidence
are in `.factory/verification-4.md`.

## Release and deployment

- GitHub Actions run `34011169108`: success.
- Release `v0.1.2`: macOS arm64/x64, Windows MSI/EXE, Linux AppImage/DEB/RPM,
  `SHA256SUMS`, and `latest.json`.
- Published Debian SHA-256:
  `7fb5f443127ac3a6c690d13d9f86edc41bdc2f651486f660121ceda42a697b61`.
- Extracted Debian binary: remained running for a 12-second Xvfb consumer smoke
  test with no application error.
- Production: `https://mail-escape-hatch.sociobot.in`.
- Fresh Linux browser download: the `v0.1.2` AppImage.
- Factory URL verification: 863 ms load, no console errors.
- Live Lighthouse mobile: Performance 100/100/100; Accessibility, Best
  Practices, and SEO 100 in every run; LCP 1.35–1.48 s; CLS 0.

## Known gaps and operator action

- Register the existing $19 one-time offer in Sociobot billing. The endpoint
  currently returns HTTP 404, so new purchases remain visibly closed and no
  broken checkout is exposed. Exact public metadata is at
  `/work/.evidence/billing-offer.json`.
- Add the owner-managed macOS and Windows signing certificates. Current builds
  are intentionally unsigned.
- Provider-specific OAuth consent remains external. App-password IMAP and
  provider export files work now.
- `imap-proto 0.10.2` emits a future-Rust warning; replace it before a compiler
  release turns that warning into an error.
- Large imports require enough memory for the source and ZIP. Users must choose
  an encrypted destination when archive encryption is required.
