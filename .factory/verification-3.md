# Independent verification 3 — FAIL

- Work order: `mail-escape-hatch-verify-3`
- Candidate: `b7f537a67a61d793bca6f288b48697e34b34f8b7`
- Live URL: `https://mail-escape-hatch.sociobot.in`
- Verified: 2026-09-02 UTC
- Result: **FAIL — do not treat the attachment-complete portable reader as release-ready**

The repaired site and desktop release now match the candidate product code, and all declared claims pass after the documented release-workflow system packages are installed. Independent boundary testing still disproves the core promise: a valid empty attachment is omitted from the ZIP, and long message text is silently cut from the standalone reader while the report says all checks passed. The performance gate is also unstable and failed two of three mobile Lighthouse runs.

## First-read gate — PASS

The cold 1440×900 first screen answers all three required questions without scrolling:

- what it does: **Verify mail before you leave**;
- who it is for: people leaving an email provider who need a complete, readable local archive;
- what to click: **Try it with sample data**, followed by “See four checked messages now.”

The action opens a realistic four-message report in one click. `/demo` also opens the same sandbox directly and shows the persistent **Demo — sample data, nothing is saved** banner with **Reset demo** and **Start for real**.

## Release-blocking findings

### High — a valid zero-byte attachment is omitted from the portable archive

A fresh live `/app` import used a valid multipart message containing:

```text
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="empty.dat"
Content-Transfer-Encoding: base64
```

with an empty encoded body, which is the valid base64 representation of a zero-byte file. Production reported one message and one attachment, but then said:

> Attachment “empty.dat” was not exported because its base64 encoding is invalid or unsupported.

The downloaded ZIP contained only `index.html`, `manifest.json`, `README.txt`, and `eml/00001.eml`. Its manifest recorded `empty.dat` with `size: 0`, an empty hash, `archivePath: null`, and an error. There was no `attachments/` entry. The cause is `decodeBase64` rejecting `!clean` in `src/archive.ts`, conflating a valid empty decoded value with invalid encoding.

The original EML bytes remain available, so the raw message is not lost. The separately promised extracted attachment, attachment hash, and attachment-complete archive are absent. The declared MIME claims do not include this boundary value.

### High — the standalone reader silently truncates long messages

A fresh live import used one valid plain-text EML whose body was 100,075 characters and ended with `END-OF-MESSAGE-LEGAL-HOLD`. Production displayed **All checks passed** and exported a ZIP. The original `eml/00001.eml` contained the marker, but `index.html` did not, and the reader gave no truncation notice.

`createPortableArchive` renders `message.body.slice(0, 100000)`. This makes content after the limit neither readable nor searchable in the promised standalone reader. Keeping the original EML is valuable but does not make the reader complete, and a user is given no reason to open the raw source because verification reports success.

### High — the required Lighthouse performance score is not reliable

Three fresh Lighthouse 13 mobile runs against production scored **86, 93, and 86** for Performance; two of three violate the required score of at least 90. Total Blocking Time was **500 ms, 290 ms, and 520 ms**. LCP remained within budget at 2.1 s, 2.0 s, and 1.9 s; CLS was 0 and the transfer was 165 KiB. Accessibility, Best Practices, and SEO scored 100 in every run.

## Other findings

### Medium — Linux desktop test prerequisites are missing from the README

The clean-clone claims run could not compile either Rust IMAP claim because `glib-2.0` was absent. README lists only Node.js, npm, and Rust as requirements. After installing the same packages used by `.github/workflows/release.yml` (`libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf`, and `libsecret-1-dev`), both exact commands passed. The README's documented `cargo test` and `npm run lint:rust` commands are therefore not reproducible from its stated Linux prerequisites.

The very first pre-install claim invocation also could not load local `@playwright/test`, as expected for a clean npm checkout. After `npm ci`, all JavaScript claims ran normally.

### Medium — material privacy copy is not explicitly listed as a claim

The privacy page says **“The app does not use analytics.”** There is no `no-analytics` entry in `.factory/claims.json`. The `local-only` claim records the demo flow and passed, and independent route logging found no analytics request, but the claim contract requires each material public promise to have its own listed test.

### Contract gap — the researched one-time purchase is not implemented

The brief specifies one-time monetization. There is no paid tier, price, buy link, license restore, or Sociobot billing integration. No broken or unauthorized payment endpoint exists; this is a missing scope item rather than a security defect.

## Claims gate

`.factory/claims.json` exists with 19 entries. After `npm ci`, 17 exact commands passed immediately. The two Rust commands initially stopped at the missing Linux system library noted above; both passed after installing the release workflow's prerequisites.

| Claim | Result | Evidence |
| --- | --- | --- |
| `sample-sandbox` | PASS | One Playwright test; four-message sample and no demo storage key |
| `no-account` | PASS | Same fresh unauthenticated demo test |
| `portable-archive` | PASS for declared sample | ZIP reader, original EML paths, attachments, manifest, and hash shapes asserted |
| `mbox-import` | PASS | Four sample messages and two attachments |
| `maildir-import` | PASS | Maildir folder name preserved |
| `duplicate-check` | PASS | Duplicate Message-ID produces an issue |
| `local-only` | PASS for demo | Export flow contacted only the product origin |
| `offline-reload` | PASS | New context reloads `/demo` offline |
| `source-bytes` | PASS | Non-UTF-8 original bytes and SHA-256 preserved |
| `mime-attachments` | PASS for declared fixture | RFC 2231 name and quoted-printable content exported |
| `mime-attachment-completeness` | PASS for declared fixture; broader promise fails | Unnamed non-empty and continued-name attachments pass; valid empty attachment is omitted |
| `invalid-attachments` | PASS | Malformed base64 is reported and excluded |
| `empty-eml` | PASS | Empty EML is rejected |
| `imap-read-only` | PASS after Linux prerequisites | Scripted peer observed `EXAMINE`, `BODY.PEEK[]`, and no `SELECT` |
| `folder-errors` | PASS after Linux prerequisites | Scripted peer denial remains in the import payload |
| `password-not-stored` | PASS | Source-path inspection test finds no credential persistence |
| `mobile-targets` | PASS | 390 px demo controls and scroll region checks pass |
| `installer-checksums` | PASS | Both installer scripts check SHA-256 before installation |
| `true-404` | PASS | Static host configuration has a real 404 override |

## Build and automated gates

- `npm ci`: PASS; 65 packages, zero audit findings.
- `npm test`: PASS; 14 Vitest tests and 8 Playwright tests.
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS; `dist/site/` produced.
- `npm audit --audit-level=high`: PASS; zero vulnerabilities.
- `npm run lint:rust`: PASS; formatting and strict Clippy are clean.
- `cargo test --locked --manifest-path src-tauri/Cargo.toml`: PASS; 4 tests. `imap-proto 0.10.2` emits a future-incompatibility warning.
- `CI=true npm run tauri build -- --bundles deb`: PASS; fresh package SHA-256 `7c38085ee798fa4f7814b611f5e575f16625159588789806587f40e48530b4b7`.
- `git diff --check`: PASS before documentation handoff.

## Functional, privacy, accessibility, and recovery evidence

- The live demo exports `mail-escape-hatch-2026-09-02.zip` (4,523 bytes) with one folder, four messages, two attachments, original EML files, reader, manifest, and sample issue.
- Empty EML, malformed attachment encoding, duplicate identity, missing dates, non-UTF-8 source bytes, RFC 2231 filenames, denied IMAP folders, and retry after an invalid import are covered and pass. The new boundary failures are described above.
- The live demo/export contacted only `https://mail-escape-hatch.sociobot.in`. The landing page additionally contacts only the documented GitHub Releases API. No cookies, analytics, third-party fonts, or third-party scripts were observed.
- On `/`, `/demo`, `/privacy`, `/terms`, and the designed 404, axe 4.10 reported zero serious or critical findings. Every route has `lang="en"`, one `<h1>`, one `<main>`, and a route-specific title.
- At 390×844, the page width is exactly 390 px; all visible links and controls are at least 44 px high; the demo table is a labelled focusable scroll region. The mobile layout has no horizontal page overflow.
- Keyboard smoke test: first Tab focuses **Skip to content** with a 3 px amber outline; Enter moves focus to `<main>`. The IMAP dialog focuses its labelled Close control, Escape closes it, and focus returns to **Connect to IMAP**.
- Reduced-motion emulation matches and reduces transition and animation durations to 0.001 ms.
- Normal routes produced no console or page errors. Navigating to the deliberate 404 produces Chromium's expected failed-main-resource 404 console entry, with no CSP or script error.
- A fresh v1-to-v2 service-worker simulation replaced `index-B5nJgUCZ.js` with `index-3tGwmUm1.js`, removed cache `mail-escape-hatch-v1`, created `mail-escape-hatch-v2`, and reloaded the updated demo offline.
- No sign-in exists, so the Entra External ID check is not applicable. There are no product or unlock server endpoints, so concurrency, persistence, and 429/`Retry-After` checks are not applicable.

## Live deployment and release identity

- All 23 publicly deployable files from the fresh `dist/site` build match production byte-for-byte by SHA-256. `staticwebapp.config.json` is host configuration and is not served.
- `/`, `/demo`, `/privacy`, and `/terms` return 200; an unknown route returns the designed page with HTTP 404.
- HTML and `sw.js` use `public, must-revalidate, max-age=30`; hashed JS/CSS use `public, max-age=31536000, immutable`.
- Response headers include HSTS, `nosniff`, referrer policy, permissions policy, and a header CSP with `frame-ancestors 'none'`.
- Application JS is 42,048 bytes raw across both chunks (about 17.0 KiB gzip); CSS is 14,585 bytes raw / 4.00 KiB gzip; the mobile hero is 36,042 bytes. Static bundle budgets pass.
- `verify-url.sh` passes production: HTTP 200, 889 ms network-idle load, title/lang/main/alt/button checks clean, and no console errors.
- All rendered links from the four public routes resolve to HTTP 200, excluding the intentional `mailto:` link.
- Release `v0.1.1` points to product commit `35f174a76f89d1c3d895496199c8e0c27c71458b`. Candidate `b7f537a` differs from that tag only in `.factory/handoff.md`; product source is identical.
- The release has macOS arm64/x64, Windows MSI/EXE, and Linux AppImage/DEB/RPM assets plus `SHA256SUMS` and valid `latest.json`. The live Linux button links to the `v0.1.1` AppImage.
- The published Debian package SHA-256 is `a473dd2aa1645829e85bb5846230f1557305c9a177cbae6c8896a8cc45b6186a`, exactly matching `SHA256SUMS`. Its binary contains `BODY.PEEK[]` and remained running for a 12-second Xvfb smoke launch without an application error.

## Required next work

1. Treat empty base64 as a valid zero-byte attachment, export it with a SHA-256 and archive path, and add it to the MIME completeness claim fixture.
2. Remove the silent 100,000-character reader truncation, or provide explicit complete-message pagination/loading with a visible truncation warning and an end-to-end search/read test.
3. Reduce or defer first-load main-thread work until repeated throttled mobile Lighthouse runs reliably meet Performance 90 and the interaction budget.
4. Document the Linux WebKit/GLib packages required for the stated Rust test and desktop commands.
5. Add a dedicated claim entry for the no-analytics promise, and either implement the brief's one-time purchase or document an approved scope change.
