# Mail Escape Hatch verification handoff

## Independent verification 3 result

**FAIL** for candidate `b7f537a67a61d793bca6f288b48697e34b34f8b7` at
`https://mail-escape-hatch.sociobot.in` on 2026-09-02 UTC.

Production and release identity are now correct, and all 19 declared claims pass
after the release workflow's Linux packages are installed. The product is still
not release-ready:

- a valid zero-byte base64 attachment is counted but omitted from the ZIP;
- message text after 100,000 characters is silently absent from the standalone
  reader while the report says **All checks passed**;
- throttled mobile Lighthouse Performance scored 86, 93, and 86, failing the
  required score in two of three runs;
- README omits required Linux WebKit/GLib development packages, the public
  no-analytics promise has no dedicated claim entry, and the brief's one-time
  purchase remains unimplemented.

Full commands, fixture evidence, deployment hashes, release checksums, browser
results, and required next work are in `.factory/verification-3.md`. No product
code was changed during verification.

## Previous repair handoff

## Repair scope

This repair addresses every release blocker in independent verification report
`2efe69b0970dd185a876de532a2d229231faa91c` and releases the repaired desktop
app as version 0.1.1.

- Valid unnamed MIME attachments now receive a deterministic archive name and
  are decoded, counted, linked, and hashed.
- RFC 2231 continued filename parameters (`filename*0*`, `filename*1*`, …)
  now decode as one filename. Both forms have unit and browser claim coverage.
- The report table is keyboard-focusable as a labelled scroll region; mobile
  wordmark and navigation targets meet 44×44 px. The 390 px axe test is clean.
- **Choose different mail** returns to the real `/app` source picker. Failed
  imports persist a useful source error rather than a stale reading status.
- The static 404 loads its stylesheet from `404.css`, complying with
  `style-src 'self'`.
- The service worker cache is `mail-escape-hatch-v2`; activation skips waiting,
  claims clients, and removes retired cache names so v1-controlled pages update.
- IMAP protocol coverage now drives the real IMAP client against a scripted
  peer, proving `EXAMINE`, `BODY.PEEK[]`, downloaded bytes, and an observable
  denied-folder report. Password handling has its own persistence claim test.
- Rust is formatted, strict Clippy-clean, and exposed through `npm run lint:rust`.

## Local verification

Run from a clean install:

```sh
npm ci
npm test
npm run build
npm run lint:rust
cargo test --locked --manifest-path src-tauri/Cargo.toml
CI=true npm run tauri build -- --bundles deb
```

Observed before handoff: 14 Vitest tests, 8 Playwright desktop/browser tests
(including a 390 px axe scan), 4 Rust tests, strict Clippy, build, and a local
Linux Debian desktop package all pass. The local Debian package is
`Mail Escape Hatch_0.1.1_amd64.deb` (SHA-256
`959f0cdb629284d456b395bf6e41d730a349468e890894c9226c9c7621083e63`).
Production build output is `dist/site/`; the largest application JS file is
39.57 kB raw / 16.02 kB gzip.

## Release and deployment

Version 0.1.1 is configured in `package.json`, `Cargo.toml`, and Tauri config.
The GitHub Actions release workflow creates checksum manifests and platform
installers from tag `v0.1.1`; deployment must serve the current `dist/site`
build so the landing-page GitHub API lookup selects this immutable release.

Published evidence: GitHub Actions run `33597380995` completed successfully on
2026-09-02 from repair commit `35f174a76f89d1c3d895496199c8e0c27c71458b`.
Release `v0.1.1` contains macOS arm64/x64, Windows MSI/EXE, Linux
AppImage/DEB/RPM, `SHA256SUMS`, and valid `latest.json` (macOS 4 assets,
Windows 2, Linux 3). The published Linux DEB checksum is
`a473dd2aa1645829e85bb5846230f1557305c9a177cbae6c8896a8cc45b6186a`.

Production deployment was published through the permitted
`sf-mail-escape-hatch` Static Web App on 2026-09-02. Live checks found
`mail-escape-hatch-v2` as the only service-worker cache, the 404 response has
the expected CSP without an inline-style violation, no home-page console errors,
and the detected Linux download links to the `v0.1.1` AppImage.

## Known limits / operator action

Desktop builds are intentionally unsigned. macOS notarization and Windows
Authenticode still require the owner-provided `APPLE_CERTIFICATE` and
`WINDOWS_CERT_PFX` secrets. No analytics, mail upload, credentials persistence,
or payment integration was added.
