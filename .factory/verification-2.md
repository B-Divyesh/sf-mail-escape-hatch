# Independent verification 2 — FAIL

- Work order: `mail-escape-hatch-verify-2`
- Candidate: `f539e23cb9b200976701fde8dd22cc6094a58165`
- Live URL: `https://mail-escape-hatch.sociobot.in`
- Verified: 2026-09-02 UTC
- Result: **FAIL — do not release or direct users to the current desktop downloads**

The candidate repairs the defects from the first verification in source and its declared claims pass. It is still not releasable. The website sends users to an older desktop build that predates those repairs, and the repaired parser still silently drops valid MIME attachments while reporting **All checks passed**.

## First-read gate — PASS

The cold 1440×900 first viewport says:

- what it does: **Verify mail before you leave**;
- who it is for: people leaving an email provider who need a complete, readable local archive;
- what to click first: **Try it with sample data**, with the adjacent result “See four checked messages now.”

The action is visible without scrolling and opens the four-message sample in one click.

## Release-blocking findings

### Critical — the published desktop app is the pre-repair build

The live Linux download button resolves to `Mail.Escape.Hatch_0.1.0_amd64.AppImage` in release `v0.1.0`. GitHub Actions run `33587703454`, which produced that release, has `head_sha` `96436b5e26704becf6640c6eece70ff2144b03a5`. The byte/MIME/IMAP repair was committed later as `276ebc8226ec887446ee7c02ffe35448429f55cb`.

Fresh binary evidence confirms the mismatch:

- published Debian package SHA-256: `ecac0b79bf6bfc12861ba7c3a688e9b96c01b755a290a9bb7626b98d8d1b0905`;
- candidate-built Debian package SHA-256: `a934b904f21431ef5390d04224258a76fd6e901cb67ab8cf29db092144dd9e0f`;
- `strings` on the published binary contains `1:*RFC822`, the seen-setting fetch used before the repair;
- `strings` on the candidate binary contains `1:*BODY.PEEK[]` and the new folder-error messages.

The current source, tests, and live web shell do not make the downloadable desktop app safe. Users following the primary download action still receive the version shown by the prior verification to alter non-UTF-8 source bytes, mishandle attachments, use read-write IMAP selection, and omit folder failures.

### Critical — valid MIME attachments are silently omitted with “All checks passed”

Two fresh fixtures were run directly through candidate `src/archive.ts`:

1. A valid MIME part with `Content-Disposition: attachment`, no optional filename, base64 body `SGVsbG8=`.
2. A valid RFC 2231 continued filename: `filename*0*=UTF-8''quarterly%20; filename*1*=report.pdf`.

Both produced:

- `attachments: []`;
- `anomalies: []`;
- no `attachments/` entry in the ZIP.

The unnamed-attachment case was also imported through the live `/app` UI. It displayed **All checks passed**, **1 message**, and **0 attachments**. `inspectPart` returns whenever it cannot derive a name, and `headerParam` does not implement RFC 2231 continuation segments. These are valid mail forms, so the result contradicts the product's attachment-complete job and “check every message and attachment” copy.

### High — the service worker cannot update existing users to the repaired web app

The `v0.1.0` and candidate service workers are byte-identical (`79f78acf...c7344`) and both use cache `mail-escape-hatch-v1` with cache-first navigation. A controlled update simulation did the following:

1. Installed and controlled a page using the exact `v0.1.0` build (`index-B5nJgUCZ.js`).
2. Replaced the origin's files with the candidate build (`index-Cwg2CHYd.js`).
3. Called `registration.update()`, then reloaded online and offline.

No installing or waiting worker appeared. Both reloads continued to use `index-B5nJgUCZ.js` and the retired **Buy a license** UI. Existing PWA visitors can therefore remain pinned to the known-bad pre-repair application indefinitely.

### High — mobile demo has a serious axe finding

At 390×844, axe 4.10 reports `scrollable-region-focusable` on `.table-scroll`: the horizontally scrollable report has neither a focusable container nor focusable content. This blocks keyboard users from reaching horizontally hidden columns and violates the attached accessibility release gate.

### High — material privacy and IMAP claims are not fully proved by their declared tests

Public copy says passwords are not stored, there is no analytics, IMAP connects directly, and the report compares every server folder count. There is no dedicated claim entry for password handling. The `imap-read-only` claim test only asserts that a constant equals `BODY.PEEK[]`; it does not exercise a server or assert that folders use `EXAMINE`. The `folder-errors` test only serializes a hand-created `FolderIssue`; it does not make a folder fail and observe it in the report. These tests do not prove the observable claims as required by the claims contract.

## Other findings

- **Medium — “Choose different mail” opens the demo.** After a real EML import at `/app`, activating this control renders **Review the sample archive**, shows the demo banner, removes the file picker, and leaves the address bar at `/app`. The action does not do what it says.
- **Medium — invalid-import status becomes misleading.** An empty EML gives the correct temporary error and a later valid import succeeds, but the persistent source status remains **Reading messages and calculating hashes…** after the error toast disappears.
- **Medium — the live 404 violates CSP.** `/definitely-missing-qa-route` correctly returns HTTP 404, but `public/404.html` uses an inline `<style>` while the response says `style-src 'self'`. Chromium logs the blocked-style CSP error, and the page loses its intended design. The navigation also emits the normal failed-resource 404 console entry.
- **Medium — mobile targets are undersized.** At 390 px the wordmark link measures 38×34 CSS px and the Demo link 40×44; the baseline requires at least 44×44.
- **Low — Rust lint/format gates are not clean.** `cargo fmt --check` reports four formatting diffs. `cargo clippy --all-targets -- -D warnings` fails on `items_after_test_module` because `run()` follows the test module. No repository lint script exists.
- **Contract gap — no paid tier is present.** The unavailable checkout was removed, so there is no broken payment call, but the researched brief's one-time monetization is not implemented.

## Claims gate

`.factory/claims.json` exists with 17 entries. The literal commands were attempted before dependency installation as ordered; JavaScript commands could not load absent clean-clone dependencies and Rust initially lacked Tauri system libraries. After `npm ci` and installation of the standard Tauri Linux libraries, every exact declared command passed:

| Claim | Result | Evidence |
| --- | --- | --- |
| `sample-sandbox` | PASS | Playwright: sample counts and no `demo:` storage key |
| `no-account` | PASS | Playwright: report ready in a fresh unauthenticated context |
| `portable-archive` | PASS for declared fixture | ZIP paths, reader links, manifest, and hash shapes asserted |
| `mbox-import` | PASS | Playwright: four messages and two fixture attachments |
| `maildir-import` | PASS | Vitest: folder name preserved |
| `duplicate-check` | PASS | Vitest: duplicate anomaly produced |
| `local-only` | PASS for demo | Playwright: same-origin requests only |
| `offline-reload` | PASS for fresh install | Playwright: first-visit cache then offline reload |
| `source-bytes` | PASS | Vitest: non-UTF-8 EML bytes and SHA-256 preserved |
| `mime-attachments` | PASS for declared fixture | RFC 2231 single-segment name and quoted-printable body |
| `invalid-attachments` | PASS | Invalid base64 reported and not exported |
| `empty-eml` | PASS | Empty EML rejected |
| `imap-read-only` | PASS, insufficient scope | Rust constant assertion; no server behavior |
| `folder-errors` | PASS, insufficient scope | Rust serialization assertion; no failing folder flow |
| `mobile-targets` | PASS for two banner controls | Reset and Start buttons are 44 px tall |
| `installer-checksums` | PASS | Static tests find checksum verification in both scripts |
| `true-404` | PASS | Static configuration assertion |

The broader independent fixtures above disprove the attachment-completeness claim despite the declared MIME test passing.

## Build and automated gates

- `npm ci`: PASS; 65 packages, zero audit findings.
- `npm test`: PASS; 11 Vitest tests and 6 Playwright tests.
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS; `dist/site/` produced.
- `npm audit --audit-level=high`: PASS; zero vulnerabilities.
- `cargo test --locked --manifest-path src-tauri/Cargo.toml`: PASS; 3 tests. `imap-proto 0.10.2` has a future-incompatibility warning.
- `CI=true npm run tauri build -- --bundles deb`: PASS; candidate Debian bundle produced. The unmodified worker value `CI=1` is rejected by Tauri's boolean parser, so it was normalized to `true`.
- `cargo fmt --check`: FAIL (format-only diffs).
- `cargo clippy --locked --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`: FAIL (`items_after_test_module`).
- `git diff --check`: PASS.

## Functional, privacy, and recovery evidence

- Demo export produced a 4,523-byte ZIP named `mail-escape-hatch-2026-09-02.zip`; the declared test verified its HTML reader, four original EML paths, two attachments, manifest counts, and hashes.
- A zero-byte EML is rejected with a specific message. A valid EML can then be imported successfully, and an HTML-like Subject is rendered as text with no injected element.
- The live demo/export used no cookies, local storage, or session storage and contacted only `https://mail-escape-hatch.sociobot.in`. The landing page additionally contacted only the documented GitHub Releases API. No analytics, third-party font, or third-party script request was observed.
- Keyboard smoke test: first Tab focuses **Skip to content** with a visible 3 px amber outline; Enter moves focus to `<main>`. The IMAP dialog initially focuses Close, Escape closes it, and focus returns to **Connect to IMAP**.
- Reduced-motion emulation matches and reduces animations/transitions to 0.001 ms.
- Fresh service-worker install, `registration.update()`, and offline demo reload work. Upgrade from the prior release does not, as described above.
- No sign-in exists, so the Entra External ID check is not applicable.
- The product has no server-side or unlock endpoint, so the per-client 429/`Retry-After` check is not applicable.

## Live deployment, headers, release, and performance

- Every deployable file in the fresh local site build exactly matches the live file by SHA-256. `staticwebapp.config.json` is host configuration and is correctly not publicly served.
- `/`, `/demo`, `/privacy`, and `/terms` return 200. An unknown route returns the designed body with HTTP 404.
- Normal routes produced no console or page errors. The 404 has the CSP error described above.
- Headers include HSTS, `nosniff`, referrer policy, permissions policy, and CSP with header-only `frame-ancestors 'none'`.
- Hashed assets use `public, max-age=31536000, immutable`; HTML and `sw.js` use `public, must-revalidate, max-age=30`.
- Main JavaScript is 38,522 B raw / 15,504 B gzip; core JavaScript 2,483 B / 1,032 B gzip; CSS 14,400 B / 3,988 B gzip; mobile hero 36,042 B. Bundle budgets pass.
- Stable Lighthouse mobile rerun: Performance 97, Accessibility 100, Best Practices 100, SEO 100; FCP 1.0 s, LCP 1.9 s, CLS 0, TBT 170 ms, total transfer 164 KiB. An earlier run emitted Performance 89 and then reported a tab crash, so it was repeated with `--disable-dev-shm-usage`.
- The worker `verify-url.sh` passes the home page: HTTP 200, 887 ms network-idle load, title/lang/main/alt/button checks clean, and no console error.
- All eight crawlable home-page HTTP(S) links returned 200. The live download button points to the stale release noted above.
- Release `v0.1.0` has macOS arm64/x64, Windows MSI/EXE, and Linux AppImage/DEB/RPM assets plus `SHA256SUMS` and valid `latest.json`. The downloaded Debian package matches its published checksum and metadata, but it is not the candidate build.

## Required next work

1. Parse valid unnamed attachments and RFC 2231 continuation parameters; add end-to-end claim fixtures that fail if any valid MIME part is omitted or if the UI reports success.
2. Publish a new versioned desktop release from the repaired candidate, verify each platform checksum, and ensure the live detected-platform button selects it.
3. Version the service-worker cache and use an update strategy that replaces the old shell; test an actual old-to-new upgrade, not only a fresh offline reload.
4. Make the report table keyboard-scrollable, enlarge all mobile targets, and move 404 CSS to a CSP-permitted external file.
5. Make **Choose different mail** return to the real source picker and replace the stale reading status with the persistent actionable error.
6. Add observable tests for IMAP `EXAMINE`, `BODY.PEEK[]`, folder failures/count mismatches, and password non-persistence; then make Rust formatting and Clippy clean.
