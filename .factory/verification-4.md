# Verify local mail archives — independent verification 4 — FAIL

- Work order: `mail-escape-hatch-verify-4`
- Implementation reviewed: `dbe217579be31cf2800ea9875efe6e7f8f3ee63a`
- Claim-test/documentation SHA: `7b52c11b8132e420e5665348a3ce0cb1f57f7764`
- Release: `v0.1.2`
- Live URL: `https://mail-escape-hatch.sociobot.in`
- Verified: 2026-09-06 UTC
- Verdict: **FAIL — 3 findings and 6 untested public claims. Do not declare this release accepted.**

## Job, audience, and first action

Fresh 1440×900 desktop and 390×844 phone contexts opened the live landing page at scroll position zero.

- Job: **Verify mail before you leave**.
- Audience: people leaving an email provider who need a complete, readable local archive.
- First action: **Try it with sample data**; the adjacent text says it will show four checked messages.

This cold-read gate passes. The action is a proper link to `/demo` and did not require scrolling.

## Findings

### Medium — the privacy contact link misses the required touch target

At 390 px wide, `/privacy` renders `mailto:privacy@sociobot.in` at 162×19 CSS px. The attached accessibility contract requires every touch target to be at least 44×44 px. This was the only undersized visible interactive item across `/`, `/demo`, `/app`, `/privacy`, and `/terms`; it is still a release finding even though axe and Lighthouse do not flag it.

### Medium — the declared 50-receipt license claim is not tested at its stated boundary

`paid-history` promises that a $19 one-time license saves **up to 50** export receipts. Its exact declared command passes, but the test makes one export and asserts one receipt. It never creates receipt 50 or 51 and therefore does not prove the quantitative limit required by the claims contract.

### Medium — five public claims have no `claims.json` entry or sandbox proof

The landing, privacy, and terms pages make these visitor-facing promises without a matching declared claim and test:

1. Exported archives are not encrypted unless the destination is encrypted.
2. New purchases are not open while billing registration is completed.
3. Sociobot is the merchant of record.
4. Refunds revoke a license.
5. Builds are unsigned until signing certificates are added.

These are useful material statements, not decoration. Add observable sandbox tests where possible or remove/rephrase the promises. Together with the incomplete 50-receipt proof, the untested-public-claim count is **6**.

## Demo and real-data isolation

The live `/demo` path passes its functional check:

- It immediately shows a realistic four-message report with two attachments and one missing-Date review item.
- The persistent banner says **Demo — sample data, nothing is saved** and exposes **Reset demo** and **Start for real**.
- Reset retains the sample and the banner. Start for real returns the browser site to `/`, clears the sample, and leaves local and session storage empty.
- A fresh demo context had no cookies, local storage, session storage, or demo-prefixed keys. Sample export made no data request.

I used separate browser contexts for the sample, local imports, and offline test. No real mail source or account was used.

## Independent archive and recovery checks

Live `/app` checks passed in a fresh browser context:

- A valid zero-byte `empty.dat` attachment exported at `attachments/00001/01-empty.dat`, length 0, with SHA-256 `e3b0c442…b855`, a manifest path, and no error.
- A plain-text message longer than 100,000 characters exported a 135,881-character reader containing `END-OF-MESSAGE-LEGAL-HOLD`.
- An empty EML reports `An EML message is empty or has no header/body separator. Choose a complete .eml file.` A following valid import succeeds, and **Choose different mail** returns to the real source picker.
- A sample ZIP contains reader, manifest, original EML files, extracted attachments, and links from the reader.

## Claims and clean setup

From a separate clean clone, I installed the README's Debian/Ubuntu desktop prerequisites, ran `npm ci`, then executed every exact command in all 22 `.factory/claims.json` entries. All commands exited successfully; the final Playwright run reported `status: passed` with no failed tests. This does not remove the two claims-contract findings above: a passing command can still be incomplete proof.

The 22 declared claims cover the sample sandbox, account-free use, archive contents, MBOX/Maildir, duplicates, local-only behavior, analytics, offline reload, original bytes, MIME boundaries, reader completeness, invalid input, IMAP read-only behavior, password handling, controls, installers, and the static 404.

## Quality gates

The clean clone passed:

- `npm test`: 15 Vitest tests and 11 Playwright tests.
- `npx tsc --noEmit`.
- `npm run build`: `dist/site/` produced; initial application JavaScript is 26.10 kB raw / 9.14 kB gzip and CSS is 14.59 kB raw / 4.00 kB gzip.
- `npm run lint:rust`: formatting and strict Clippy pass.
- `cargo test --locked --manifest-path src-tauri/Cargo.toml`: 4 Rust tests pass. `imap-proto 0.10.2` prints a future-incompatibility warning.
- `npm audit --audit-level=moderate`: zero vulnerabilities.

Three fresh simulated-mobile Lighthouse 13.4 runs against production scored 100 Performance, 100 Accessibility, 100 Best Practices, and 100 SEO. LCP was 1,470 ms, 1,357 ms, and 1,362 ms; Total Blocking Time was 43 ms, 12 ms, and 0 ms; CLS was 0 in every run.

`/opt/fleet/lib/verify-url.sh` passed production in 799 ms with no console errors, one title, `lang="en"`, one `<main>`, one `<h1>`, and no missing image alternatives.

## Live routes, accessibility, privacy, and recovery

- `/`, `/demo`, `/app`, `/privacy`, and `/terms` return 200 with route-specific titles, one `<h1>`, and one `<main>`.
- A deliberate unknown route returns the designed page with HTTP 404. Chromium reports the expected failed main-resource 404 console entry; it is not a product defect. Axe found no serious or critical violations on any tested route at desktop or 390 px widths.
- The first Tab reaches the visible 3 px skip-link focus ring. Enter moves focus to `#main`. The IMAP dialog focuses Close, Escape closes it, and focus returns to **Connect to IMAP**. Reduced-motion emulation sets smooth scrolling to `auto`.
- Normal routes had no console or page errors, no horizontal overflow at 390 px, and all crawlable HTTP(S) links returned 200. `robots.txt` and `sitemap.xml` return 200.
- The live demo cached `mail-escape-hatch-v3` and reloaded offline after its first visit. The app has no product backend, tenant database, health endpoint, or product-owned rate limiter; tenant isolation, restart persistence, and 429/`Retry-After` checks do not apply.
- Demo and local-file flows used only same-origin GET requests. The landing release lookup is documented to use GitHub's public API when its section enters view. No analytics, remote fonts, or third-party scripts were observed.

## Deployment and installed artifact

- The fresh local `dist/site` has 28 files. All 27 deployable files match production byte-for-byte by SHA-256. `staticwebapp.config.json` correctly returns 404 because it is host configuration, not a public asset.
- GitHub Release `v0.1.2` targets implementation commit `dbe2175` and contains macOS arm64/x64, Windows MSI/EXE, Linux AppImage/DEB/RPM, `SHA256SUMS`, and `latest.json`.
- In a fresh consumer directory, `Mail.Escape.Hatch_0.1.2_amd64.deb` matched `SHA256SUMS`, declared package `mail-escape-hatch` version `0.1.2` amd64, and its extracted binary remained running for 12 seconds under Xvfb. The only output was the expected headless EGL warning.

## Earlier finding disposition

| Earlier finding | Current evidence |
| --- | --- |
| Original bytes, MIME decoding, unnamed/continued MIME parts, IMAP read-only access, folder failures, and password persistence | Current declared tests pass; live zero-byte attachment and local recovery checks pass. |
| Reader links and long-message truncation | Sample ZIP and live 100,000+-character export contain linked files and the final marker. |
| Stale desktop release and checksum gaps | `v0.1.2` targets `dbe2175`; downloaded Debian artifact matches `SHA256SUMS` and smoke-runs. |
| Service-worker replacement, true 404, demo controls, focusable table, recovery path, Rust lint | Current live v3 offline reload, HTTP 404, keyboard checks, recovery test, and lint/test gates pass. |
| Performance instability and no-analytics claim | Three fresh Lighthouse runs are 100; the no-analytics declared test passes. |
| Billing registration | The site deliberately exposes no broken checkout and says new purchases are unavailable. Its supporting public claims still need the coverage listed above. |

## Required next work

1. Make the privacy mailto link a 44×44 px touch target without reducing its visible focus treatment.
2. Extend `paid-history` to create receipt 50 and receipt 51, then assert the exact 50-record limit and behavior at the boundary.
3. Add one declared observable test per five unlisted public promises above, or remove promises that cannot be proved in the sandbox.

Until those findings are resolved, this verification remains **FAIL**.
