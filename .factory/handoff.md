# Mail Escape Hatch verification handoff

## Result

Independent verification 4 reviewed implementation `dbe217579be31cf2800ea9875efe6e7f8f3ee63a`, claim-test/documentation SHA `7b52c11b8132e420e5665348a3ce0cb1f57f7764`, release `v0.1.2`, and the live site.

**Result: FAIL.** There are 3 findings and 6 untested public claims. No product code was changed during this verification.

The full evidence is in `.factory/verification-4.md`.

## What passed

- Fresh desktop and phone checks state the job, audience, and sample first action before scrolling.
- The one-click demo, persistent sample banner, reset, start-for-real, privacy isolation, normal/invalid/recovery imports, zero-byte attachments, and complete long reader pass live checks.
- Every exact command in all 22 declared claims passed from a clean clone after the documented Linux prerequisites and `npm ci`.
- `npm test` passed 15 unit and 11 browser tests. TypeScript, production build, Rust fmt/Clippy, four Rust tests, and moderate audit passed.
- Three fresh mobile Lighthouse runs scored 100 Performance, Accessibility, Best Practices, and SEO.
- Current release artifacts, hashes, live files, routes, offline reload, keyboard behavior, legal pages, links, and expected HTTP 404 were checked. The extracted Debian artifact smoke-ran in a clean consumer directory.

## Findings to repair

1. The privacy `mailto:` link is 162×19 px at 390 px wide, below the required 44×44 px touch target.
2. The `$19` claim says a license saves up to 50 receipts, but its declared test proves only one receipt.
3. Five public promises have no claims entry or sandbox proof: archive encryption caveat, purchase-unavailable status, merchant of record, refund revocation, and unsigned-build status.

## Run and verify

On Debian/Ubuntu, install the packages listed in `README.md`, then run:

```sh
npm ci
npm test
npx tsc --noEmit
npm run build
npm run lint:rust
cargo test --locked --manifest-path src-tauri/Cargo.toml
npm audit --audit-level=moderate
```

Run each command in `.factory/claims.json` exactly. Before accepting the release, resolve the three findings and rerun independent QA; PASS requires zero findings and zero untested public claims.
