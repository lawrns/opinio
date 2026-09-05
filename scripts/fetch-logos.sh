#!/usr/bin/env bash
# Fetch official brand logos (identification use) for opinio ficha slugs.
# Sources: site apple-touch-icon -> favicon pngs -> google favicon service.
# Any raster/svg/ico accepted and normalized to PNG via ImageMagick.
set -u
cd "$(dirname "$0")/.." || exit 1
mkdir -p public/logos
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
declare -A DOMAINS=(
  [mercadolibre]=mercadolibre.com.mx
  [amazon-mexico]=amazon.com.mx
  [shein-mexico]=shein.com.mx
  [temu]=temu.com
  [liverpool]=liverpool.com.mx
  [coppel]=coppel.com
  [mercadopago]=mercadopago.com.mx
  [nu-mexico]=nu.com.mx
  [plata-card]=platacard.mx
  [stori]=stori.mx
  [bitso]=bitso.com
  [kueski]=kueski.com
  [bbva-mexico]=bbva.mx
  [rappi]=rappi.com.mx
  [ubereats]=ubereats.com
  [didi-food]=didifood.com.mx
  [99minutos]=99minutos.com
  [uber]=uber.com
  [didi]=didi.mx
  [telcel]=telcel.com
  [telmex]=telmex.com
  [totalplay]=totalplay.com.mx
  [volaris]=volaris.com
  [vivaaerobus]=vivaaerobus.com
  [aeromexico]=aeromexico.com
  [estafeta]=estafeta.com
  [winpot]=winpot.mx
  [caliente]=caliente.mx
)

try_one() { # url outfile
  local url="$1" out="$2" tmp
  tmp=$(mktemp)
  local code
  code=$(curl -sL --max-time 14 -A "$UA" -o "$tmp" -w '%{http_code}' "$url" 2>/dev/null)
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

fail=0
for slug in "${!DOMAINS[@]}"; do
  d="${DOMAINS[$slug]}"
  out="public/logos/${slug}.png"
  got=""
  for url in \
    "https://${d}/apple-touch-icon.png" \
    "https://${d}/favicon-512x512.png" \
    "https://${d}/favicon-192x192.png" \
    "https://${d}/favicon-32x32.png" \
    "https://www.google.com/s2/favicons?domain=${d}&sz=256"; do
    if try_one "$url" "$out"; then got="$url"; break; fi
  done
  if [ -n "$got" ]; then
    echo "OK  $slug <- $got ($(stat -c%s "$out") bytes)"
  else
    echo "FAIL $slug ($d)" >&2
    fail=1
  fi
done
echo "--- done. failures=$fail"
exit $fail
