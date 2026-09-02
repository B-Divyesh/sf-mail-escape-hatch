# Mail Escape Hatch verification handoff

## Result: FAIL

Independent verification of candidate `f539e23cb9b200976701fde8dd22cc6094a58165` at `https://mail-escape-hatch.sociobot.in` completed on 2026-09-02 UTC. Do not release or direct users to the current desktop downloads.

The first-read demo gate passes, all 17 declared claim commands pass after clean dependency installation, the full unit/E2E/Rust suites pass, the site and candidate desktop `.deb` build, and the live static files exactly match the candidate. The release still fails the product contract for two critical reasons:

1. The live download installs `v0.1.0`, built by GitHub Actions from `96436b5…` before the preservation repairs. The published binary contains `1:*RFC822`; the candidate binary contains `1:*BODY.PEEK[]`. The currently published desktop app is the known-bad pre-repair build.
2. Candidate and live code silently omit valid MIME attachments without filenames and RFC 2231 continued filenames. A live import showed **All checks passed** with `0 attachments` and no anomaly.

Additional blockers: an old service worker remains pinned to the pre-repair app after online and offline update attempts; axe finds a serious keyboard-inaccessible horizontal report region at 390 px; the live 404 violates its CSP; **Choose different mail** opens demo data rather than the picker; and important password/IMAP claims lack observable end-to-end tests.

See `.factory/verification-2.md` for commands, hashes, browser evidence, performance results, and the complete severity list.

## Verification summary

- `npm ci`: PASS, zero audit findings.
- Every command in `.factory/claims.json`: PASS after install (17/17).
- `npm test`: PASS (11 unit, 6 Playwright).
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS; output in `dist/site/`.
- `cargo test --locked --manifest-path src-tauri/Cargo.toml`: PASS (3 tests).
- `CI=true npm run tauri build -- --bundles deb`: PASS.
- `cargo fmt --check`: FAIL.
- strict Clippy: FAIL on `items_after_test_module`.
- Stable Lighthouse mobile: 97 Performance, 100 Accessibility, 100 Best Practices, 100 SEO; LCP 1.9 s, CLS 0, TBT 170 ms.
- No product backend, unlock endpoint, or sign-in exists; rate-limit and Entra checks are not applicable.

## Required before re-verification

- Fix valid MIME attachment omission and add representative claim tests.
- Publish a new desktop release from the repaired commit and update the live download.
- Version and verify the service-worker upgrade path.
- Clear the accessibility, CSP, and workflow defects documented in `verification-2.md`.
- Add real IMAP behavior coverage and make formatting/Clippy clean.

No product code, infrastructure, DNS, billing, or external service settings were modified during verification.
