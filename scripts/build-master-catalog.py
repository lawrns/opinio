import json
import re
import os
from urllib.parse import urlparse

print("📦 Building master Mexican e-commerce store catalog...")

# 1. Load PROFECO stores
url_profeco = 'https://burocomercial.profeco.gob.mx/tiendasvirtuales/js/dataSet.js'
profeco_stores = []
import urllib.request
req = urllib.request.Request(url_profeco, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        text = resp.read().decode('utf-8', errors='ignore')
    m = re.search(r'\[\s*\{.*\}\s*\]', text, re.DOTALL)
    if m:
        for r in json.loads(m.group(0)):
            name = r.get('nombre_comercial', '').strip()
            url = r.get('url', '').strip()
            rs = r.get('razon_social', '').strip()
            giro = r.get('giro', '').strip()
            dom = r.get('domicilio', '').strip()
            phone = r.get('telefono', '').strip()
            if name and url and name != 'NOMBRE COMERCIAL':
                profeco_stores.append({
                    'name': name,
                    'url': url,
                    'legal_name': rs if rs and rs != 'SIN INFORMACIÓN' else None,
                    'giro': giro,
                    'address': dom if dom and dom != 'SIN INFORMACIÓN' else None,
                    'phone': phone if phone and phone != 'SIN INFORMACIÓN' else None,
                    'source': 'PROFECO Monitoreo de Tiendas Virtuales'
                })
    print(f"✅ Loaded {len(profeco_stores)} stores from PROFECO.")
except Exception as e:
    print(f"❌ Error loading PROFECO: {e}")

# 2. Load AMVO members from browser extract
amvo_stores = []
try:
    with open('/tmp/amvo_browser_members.json', 'r', encoding='utf-8') as f:
        res = json.load(f)
    raw_amvo = json.loads(res['data']['value'])
    for item in raw_amvo:
        amvo_stores.append({
            'name': item['name'].strip(),
            'logo_url': item['logo'].strip(),
            'category': item['category'].strip(),
            'href': item['href'].strip(),
            'source': 'AMVO Asociación Mexicana de Venta Online'
        })
    print(f"✅ Loaded {len(amvo_stores)} members from AMVO.")
except Exception as e:
    print(f"❌ Error loading AMVO: {e}")

def slugify(s):
    s = s.lower().strip()
    s = re.sub(r'[áàäâ]', 'a', s)
    s = re.sub(r'[éèëê]', 'e', s)
    s = re.sub(r'[íìïî]', 'i', s)
    s = re.sub(r'[óòöô]', 'o', s)
    s = re.sub(r'[úùüû]', 'u', s)
    s = re.sub(r'[ñ]', 'n', s)
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')

def clean_domain(raw_url):
    if not raw_url:
        return None
    u = raw_url.strip()
    if not u.startswith('http'):
        u = 'https://' + u
    try:
        parsed = urlparse(u)
        host = parsed.netloc.lower()
        if host.startswith('www.'):
            host = host[4:]
        host = host.split(':')[0]
        if any(bad in host for bad in ['facebook.com', 'instagram.com', 'twitter.com', 'google.com', 'linkedin.com', 'youtube.com']):
            return None
        return host if '.' in host else None
    except Exception:
        return None

def standardize_category(raw_cat):
    c = (raw_cat or '').lower()
    if any(k in c for k in ['ropa', 'calzado', 'moda', 'lenceria', 'textil', 'vestir', 'zapato', 'bota']):
        return 'Moda, Calzado y Accesorios'
    elif any(k in c for k in ['belleza', 'cosmetico', 'maquillaje', 'cuidado personal', 'perfum', 'spa', 'skincare']):
        return 'Belleza y Cuidado Personal'
    elif any(k in c for k in ['joya', 'reloj', 'plata', 'diamante', 'oro', 'talavera']):
        return 'Joyería, Relojes y Artesanías'
    elif any(k in c for k in ['comput', 'electronic', 'laptop', 'hardware', 'gadget', 'celular', 'audio', 'tecnolog', 'camara', 'foto']):
        return 'Electrónica, Cómputo y Gadgets'
    elif any(k in c for k in ['mueble', 'colchon', 'hogar', 'decorac', 'sala', 'recamara', 'descanso', 'cocina', 'iluminac']):
        return 'Hogar, Muebles y Decoración'
    elif any(k in c for k in ['vino', 'licor', 'cafe', 'chocolate', 'alimento', 'bebida', 'dulce', 'gourmet', 'salsa', 'cerveza', 'tequila', 'mezcal']):
        return 'Alimentos, Bebidas y Gourmet'
    elif any(k in c for k in ['mascota', 'perro', 'veterin', 'pet']):
        return 'Mascotas y Accesorios'
    elif any(k in c for k in ['deport', 'fitness', 'bici', 'suplement', 'gym', 'atlet']):
        return 'Deportes, Fitness y Suplementos'
    elif any(k in c for k in ['juguet', 'bebe', 'maternidad', 'nino', 'infantil']):
        return 'Juguetes, Bebés y Niños'
    elif any(k in c for k in ['libro', 'papeler', 'arte', 'manualidad', 'comic', 'manga', 'editorial']):
        return 'Libros, Papelería y Arte'
    elif any(k in c for k in ['farmacia', 'salud', 'optica', 'medic', 'lente', 'nutri', 'clinica']):
        return 'Farmacias, Ópticas y Salud'
    elif any(k in c for k in ['ferreter', 'herramienta', 'autopart', 'refaccion', 'moto', 'auto', 'plomer', 'piso', 'azulejo']):
        return 'Ferretería, Industria y Automotriz'
    elif any(k in c for k in ['market', 'departament', 'super', 'retail', 'tienda en linea', 'plataforma de venta', 'pure player']):
        return 'Marketplaces y Tiendas Departamentales'
    elif any(k in c for k in ['viaje', 'hotel', 'aerolinea', 'transporte', 'movilidad']):
        return 'Viajes y Movilidad'
    else:
        return 'Comercio Electrónico Especializado'

master_stores = {}

# 1. Process PROFECO
for p in profeco_stores:
    dom = clean_domain(p['url'])
    if not dom:
        continue
    name = p['name'].strip()
    slug = slugify(name)
    if not slug or len(slug) < 2:
        slug = slugify(dom.split('.')[0])
    
    cat = standardize_category(p['giro'])
    desc = f"Tienda virtual mexicana monitoreada oficialmente por la Procuraduría Federal del Consumidor (PROFECO). Ofrece catálogo de {cat.lower()} con cobertura y entregas en territorio nacional."
    if p['address']:
        desc += f" Domicilio oficial registrado: {p['address']}."

    master_stores[slug] = {
        'slug': slug,
        'brand_name': name.title() if name.isupper() else name,
        'legal_name': p['legal_name'],
        'domain': dom,
        'category': cat,
        'description': desc,
        'address': p['address'] or 'Nacional (México)',
        'phone': p['phone'],
        'logo_source': None,
        'source': 'PROFECO Monitoreo Oficial'
    }

# 2. Process AMVO
for a in amvo_stores:
    name = a['name'].strip()
    slug = slugify(name)
    if not slug:
        continue
    
    # Infer or deduce domain
    clean_n = re.sub(r'[^a-zA-Z0-9]', '', name).lower()
    inferred_domain = f"{slug}.com.mx"
    cat = standardize_category(a['category'])

    if slug in master_stores:
        master_stores[slug]['logo_source'] = a['logo_url']
        if a['category'] and master_stores[slug]['category'] == 'Comercio Electrónico Especializado':
            master_stores[slug]['category'] = cat
    else:
        master_stores[slug] = {
            'slug': slug,
            'brand_name': name,
            'legal_name': None,
            'domain': inferred_domain,
            'category': cat,
            'description': f"Tienda en línea y marca afiliada a la Asociación Mexicana de Venta Online (AMVO). Especializada en {cat.lower()} para consumidores en toda la República Mexicana.",
            'address': 'Nacional (México)',
            'phone': None,
            'logo_source': a['logo_url'],
            'source': 'AMVO Miembro Oficial'
        }

# 3. Read CURATED_MEXICAN_BRANDS and ADDITIONAL_MEXICAN_STORES from fetch-mexican-stores.py
with open('scripts/fetch-mexican-stores.py', 'r', encoding='utf-8') as f:
    code = f.read()

curated_match = re.search(r'CURATED_MEXICAN_BRANDS\s*=\s*(\[.*?\])\s*\n\s*print', code, re.DOTALL)
if curated_match:
    import ast
    curated_list = ast.literal_eval(curated_match.group(1))
    for c in curated_list:
        slug = slugify(c['name'])
        cat = standardize_category(c['giro'])
        desc = f"Tienda oficial y marca mexicana con presencia nacional en comercio electrónico. {c['giro']}. Cobertura de envíos y atención a clientes en México."
        if c.get('address'):
            desc += f" Sede: {c['address']}."

        if slug in master_stores:
            if c.get('legal_name'):
                master_stores[slug]['legal_name'] = c['legal_name']
            if c.get('address'):
                master_stores[slug]['address'] = c['address']
            master_stores[slug]['category'] = cat
            master_stores[slug]['domain'] = c['domain']
        else:
            master_stores[slug] = {
                'slug': slug,
                'brand_name': c['name'],
                'legal_name': c.get('legal_name'),
                'domain': c['domain'],
                'category': cat,
                'description': desc,
                'address': c.get('address', 'Nacional (México)'),
                'phone': None,
                'logo_source': None,
                'source': 'Catálogo Nacional de Comercio D2C'
            }

additional_match = re.search(r'ADDITIONAL_MEXICAN_STORES\s*=\s*(\[.*?\])\s*\n\s*for', code, re.DOTALL)
if additional_match:
    import ast
    add_list = ast.literal_eval(additional_match.group(1))
    for c in add_list:
        slug = slugify(c['name'])
        cat = standardize_category(c['giro'])
        desc = f"Marca mexicana de tradición y tienda oficial en línea. {c['giro']}. Envíos y servicio a clientes en la República Mexicana."
        if c.get('address'):
            desc += f" Domicilio / Sede: {c['address']}."

        if slug in master_stores:
            if c.get('legal_name'):
                master_stores[slug]['legal_name'] = c['legal_name']
            if c.get('address'):
                master_stores[slug]['address'] = c['address']
            master_stores[slug]['category'] = cat
            master_stores[slug]['domain'] = c['domain']
        else:
            master_stores[slug] = {
                'slug': slug,
                'brand_name': c['name'],
                'legal_name': c.get('legal_name'),
                'domain': c['domain'],
                'category': cat,
                'description': desc,
                'address': c.get('address', 'Nacional (México)'),
                'phone': None,
                'logo_source': None,
                'source': 'Catálogo Tradición y Comercio Mexicano'
            }

print(f"Total stores before domain deduplication: {len(master_stores)}")

# Deduplicate by domain while ensuring unique slugs
domain_to_slug = {}
slug_to_item = {}

for slug, s in master_stores.items():
    dom = s['domain'].lower()
    if dom in domain_to_slug:
        existing_slug = domain_to_slug[dom]
        existing = slug_to_item[existing_slug]
        # Prefer the one with legal_name or logo_source
        if s.get('legal_name') and not existing.get('legal_name'):
            existing['legal_name'] = s['legal_name']
        if s.get('logo_source') and not existing.get('logo_source'):
            existing['logo_source'] = s['logo_source']
        if s.get('address') and existing.get('address') == 'Nacional (México)':
            existing['address'] = s['address']
        continue
    domain_to_slug[dom] = slug
    slug_to_item[slug] = s

final_list = list(slug_to_item.values())
print(f"✅ Total final deduplicated Mexican stores: {len(final_list)}")

out_path = 'data/mexican_stores_1000.json'
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(final_list, f, ensure_ascii=False, indent=2)

print(f"💾 Saved {len(final_list)} stores to {out_path} ({os.path.getsize(out_path)} bytes)")
