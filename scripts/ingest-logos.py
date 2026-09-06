import json
import os
import re
import sys
import subprocess
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

os.makedirs('public/logos', exist_ok=True)

with open('data/mexican_stores_1000.json', 'r', encoding='utf-8') as f:
    stores = json.load(f)

print(f"🎨 Processing logos for {len(stores)} Mexican stores...")

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"

# Color palette for generated SVG monograms
PALETTES = [
    ("#0F172A", "#38BDF8"),  # Slate / Sky
    ("#064E3B", "#34D399"),  # Emerald / Mint
    ("#1E1B4B", "#818CF8"),  # Indigo / Lavender
    ("#831843", "#F472B6"),  # Rose / Pink
    ("#78350F", "#FBBF24"),  # Amber / Warm Gold
    ("#1E3A8A", "#60A5FA"),  # Deep Blue
    ("#3B0764", "#C084FC"),  # Purple / Violet
    ("#134E4A", "#2DD4BF"),  # Teal
    ("#701A75", "#E879F9"),  # Fuchsia
    ("#7F1D1D", "#F87171"),  # Brick Red / Coral
]

def generate_svg_logo(slug, brand_name, out_path):
    # Pick stable color based on slug hash
    h = sum(ord(c) for c in slug)
    bg, fg = PALETTES[h % len(PALETTES)]
    
    # Extract initials or short title
    words = re.sub(r'[^a-zA-Z0-9\s]', '', brand_name).split()
    if len(words) >= 2:
        initials = (words[0][0] + words[1][0]).upper()
    elif len(words) == 1 and len(words[0]) >= 2:
        initials = words[0][:2].upper()
    else:
        initials = brand_name[:2].upper() if len(brand_name) >= 2 else "MX"

    short_name = brand_name[:16]

    svg_content = f'''<svg width="200" height="60" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="6" y="8" width="44" height="44" rx="10" fill="{bg}"/>
  <text x="28" y="36" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="18" fill="{fg}" text-anchor="middle" letter-spacing="-0.5">{initials}</text>
  <text x="60" y="37" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="19" fill="#0F172A" letter-spacing="-0.4">{short_name}</text>
</svg>'''
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(svg_content)
    return True

def try_download_image(url, out_path):
    tmp_path = f"{out_path}.tmp"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=7) as resp:
            content = resp.read()
            if len(content) < 400:
                return False
            with open(tmp_path, 'wb') as tmp:
                tmp.write(content)
        
        # Check image type using file command
        res = subprocess.run(['file', '-b', tmp_path], capture_output=True, text=True)
        ftype = res.stdout.strip()
        if any(t in ftype for t in ['PNG', 'JPEG', 'GIF', 'Web/P', 'SVG', 'MS Windows icon', 'TIFF', 'BMP']):
            # Convert to normalized png
            c_res = subprocess.run(
                ['convert', tmp_path, '-background', 'none', '-density', '144', '-resize', '256x256^', out_path],
                capture_output=True
            )
            if os.path.exists(out_path) and os.path.getsize(out_path) > 400:
                if os.path.exists(tmp_path): os.remove(tmp_path)
                return True
        if os.path.exists(tmp_path): os.remove(tmp_path)
        return False
    except Exception:
        if os.path.exists(tmp_path): os.remove(tmp_path)
        return False

def process_store(store):
    slug = store['slug']
    brand_name = store['brand_name']
    domain = store.get('domain')

    png_out = f"public/logos/{slug}.png"
    svg_out = f"public/logos/{slug}.svg"
    webp_out = f"public/logos/{slug}.webp"

    # 1. Skip if already valid
    for p in [png_out, svg_out, webp_out]:
        if os.path.exists(p) and os.path.getsize(p) > 500:
            return (slug, 'existing')

    # 2. Try AMVO logo_source if present
    if store.get('logo_source'):
        if try_download_image(store['logo_source'], png_out):
            return (slug, 'amvo_cdn')

    # 3. Try domain icons
    if domain:
        clean_d = domain.split('/')[0]
        urls = [
            f"https://{clean_d}/apple-touch-icon.png",
            f"https://{clean_d}/apple-touch-icon-precomposed.png",
            f"https://{clean_d}/favicon-512x512.png",
            f"https://{clean_d}/favicon-192x192.png",
            f"https://www.google.com/s2/favicons?domain={clean_d}&sz=256",
            f"https://unavatar.io/{clean_d}",
            f"https://icons.duckduckgo.com/ip3/{clean_d}.ico"
        ]
        for u in urls:
            if try_download_image(u, png_out):
                return (slug, 'domain_icon')

    # 4. Generate high-quality branded SVG fallback
    generate_svg_logo(slug, brand_name, svg_out)
    return (slug, 'generated_svg')

with ThreadPoolExecutor(max_workers=24) as executor:
    results = list(executor.map(process_store, stores))

stats = {}
for slug, outcome in results:
    stats[outcome] = stats.get(outcome, 0) + 1

print("\n🎉 Logo Ingestion Summary:")
for k, v in stats.items():
    print(f"  - {k}: {v}")

total_logos = len([f for f in os.listdir('public/logos') if os.path.isfile(os.path.join('public/logos', f))])
print(f"\n📂 Total logos in public/logos/: {total_logos}")
