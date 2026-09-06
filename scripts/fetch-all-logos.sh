#!/usr/bin/env bash
# Fetch official brand logos for all MASTER_FICHAS in opinio.mx
# Multi-tier fallback: apple-touch-icon -> favicon-512 -> unavatar -> google favicons -> duckduckgo
set -u
cd "$(dirname "$0")/.." || exit 1
mkdir -p public/logos

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

try_one() {
  local url="$1" out="$2" tmp
  tmp=$(mktemp)
  local code
  code=$(curl -sL --max-time 10 -A "$UA" -o "$tmp" -w '%{http_code}' "$url" 2>/dev/null)
  if [ "$code" = "200" ] && [ -s "$tmp" ]; then
    local ftype
    ftype=$(file -b "$tmp")
    if echo "$ftype" | grep -qiE 'PNG|JPEG|GIF|Web/P|SVG|MS Windows icon|TIFF|BMP'; then
      if convert "$tmp" -background none -density 144 "$out" 2>/dev/null && [ -s "$out" ] && file -b "$out" | grep -qi 'PNG'; then
        rm -f "$tmp"
        return 0
      fi
    fi
  fi
  rm -f "$tmp"
  return 1
}

# Read slugs and domains directly from seed-directory-scale.ts using node/bun
bun -e '
import { MASTER_FICHAS } from "./scripts/seed-directory-scale.ts";
for (const f of MASTER_FICHAS) {
  console.log(`${f.slug}\t${f.domain}`);
}
' > /tmp/opinio_slugs.tsv

total=$(wc -l < /tmp/opinio_slugs.tsv | tr -d ' ')
echo "=== Processing $total businesses for logo ingestion ==="

success=0
existing=0
failed=0

while IFS=$'\t' read -r slug full_domain; do
  out="public/logos/${slug}.png"
  
  # If already exists and > 500 bytes, skip
  if [ -s "$out" ] && [ $(stat -f%z "$out" 2>/dev/null || stat -c%s "$out" 2>/dev/null) -gt 500 ]; then
    ((existing++))
    continue
  fi

  # Check if svg or webp exists
  if [ -s "public/logos/${slug}.svg" ] || [ -s "public/logos/${slug}.webp" ]; then
    ((existing++))
    continue
  fi

  # Clean domain (strip subpaths like /mx)
  d=$(echo "$full_domain" | awk -F'/' '{print $1}')
  
  got=""
  for url in \
    "https://${d}/apple-touch-icon.png" \
    "https://${d}/apple-touch-icon-precomposed.png" \
    "https://${d}/favicon-512x512.png" \
    "https://${d}/favicon-192x192.png" \
    "https://unavatar.io/${d}" \
    "https://www.google.com/s2/favicons?domain=${d}&sz=256" \
    "https://icons.duckduckgo.com/ip3/${d}.ico"; do
    if try_one "$url" "$out"; then
      got="$url"
      break
    fi
  done

  if [ -n "$got" ]; then
    sz=$(stat -f%z "$out" 2>/dev/null || stat -c%s "$out" 2>/dev/null)
    echo "  [OK] $slug <- $got ($sz bytes)"
    ((success++))
  else
    echo "  [WARN] Failed to fetch logo for $slug ($d)" >&2
    ((failed++))
  fi
done < /tmp/opinio_slugs.tsv

echo "=== Logo Summary: $existing already present, $success newly downloaded, $failed failed ==="
