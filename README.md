# Mail Escape Hatch

Mail Escape Hatch is a local desktop tool for people leaving or auditing an email provider. It imports IMAP, Maildir, MBOX, and EML mail, checks messages and attachments, then saves a portable archive.

The archive is a ZIP with a standalone HTML reader, original EML files, extracted attachments, `manifest.json`, and SHA-256 hashes. The app checks and exports supported archives for free. A $19 one-time license saves export receipts on this computer.

## Try the sample

Open `/demo` or run the site and visit `http://127.0.0.1:4173/demo`. The demo contains four synthetic messages and two attachments. It writes nothing to real storage. After its first visit, the demo reloads offline.

## Run locally

Requirements: Node.js 22+, npm 10+, and Rust 1.77+ for the desktop shell.

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:4173`. To run the desktop shell:

```sh
npm run tauri dev
```

## Test and build

Playwright 1.58.2 is pinned. Chromium must be available at `PLAYWRIGHT_BROWSERS_PATH`, or install it with `npx playwright install chromium`.

```sh
npm test
npm run build:site
cargo test --manifest-path src-tauri/Cargo.toml
```

The static site is written to `dist/site/`. Desktop installers are built by [the release workflow](.github/workflows/release.yml), never by the deployment worker.

## Install

Download the latest `.dmg`, `.msi`, `.AppImage`, or `.deb` from the Releases page. The first release is unsigned. Verify it with `SHA256SUMS`.

One-line installers also verify the checksum:

```sh
curl -fsSL https://mail-escape-hatch.sociobot.in/install.sh | sh
```

```powershell
irm https://mail-escape-hatch.sociobot.in/install.ps1 | iex
```

## How local data is handled

- Mail files and generated archives stay on the computer.
- IMAP connects directly from the desktop app to the chosen provider.
- Saved IMAP passwords use the operating system keychain.
- The demo uses memory and never reads real files.
- License checks send only the license token to Sociobot.

Keep the source mailbox until the report and portable reader match your expected counts. Providers may exclude Spam or Trash, throttle downloads, or require an app password. See [Privacy](https://mail-escape-hatch.sociobot.in/privacy) and [Terms](https://mail-escape-hatch.sociobot.in/terms).

### IMAP rate limits

The app opens one connection and reads one folder at a time. It does not run parallel downloads. A provider can still pause or reject a large fetch. If that happens, wait for the provider’s stated retry period and run the import again. Gmail and Microsoft accounts may require an app password or a provider export because this v1 does not embed their OAuth consent flows.

The report compares each IMAP folder’s server count with the number downloaded. It preserves the original RFC 822 headers and message body for audit or legal-hold use.

## Deploy

Deploy `dist/site` as a static site. `staticwebapp.config.json` provides SPA fallback, security headers, and the custom 404 response. Infrastructure, DNS, billing registration, and signing credentials are managed outside this repository.

## License

MIT. See [LICENSE](LICENSE).
