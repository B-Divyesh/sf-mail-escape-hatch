#!/bin/sh
set -eu

repo="B-Divyesh/sf-mail-escape-hatch"
api="https://api.github.com/repos/$repo/releases/latest"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT INT TERM

case "$(uname -s)" in
  Darwin) pattern='\.dmg$' ;;
  Linux) pattern='\.AppImage$' ;;
  *) echo "Mail Escape Hatch supports macOS, Windows, and Linux." >&2; exit 1 ;;
esac

json="$(curl -fsSL "$api")"
url="$(printf '%s' "$json" | sed -n 's/.*"browser_download_url": *"\([^"]*\)".*/\1/p' | grep -E "$pattern" | head -n 1)"
version="$(printf '%s' "$json" | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -n 1)"
test -n "$url" || { echo "A matching download is not published yet." >&2; exit 1; }

file="$tmp_dir/$(basename "$url")"
curl -fL "$url" -o "$file"
curl -fL "https://github.com/$repo/releases/download/$version/SHA256SUMS" -o "$tmp_dir/SHA256SUMS"
(cd "$tmp_dir" && grep " $(basename "$file")$" SHA256SUMS | sha256sum -c -)

case "$file" in
  *.AppImage) install -m 755 "$file" "$HOME/.local/bin/mail-escape-hatch"; echo "Installed to $HOME/.local/bin/mail-escape-hatch" ;;
  *.dmg) cp "$file" "$HOME/Downloads/"; echo "Saved the verified disk image to $HOME/Downloads" ;;
esac
