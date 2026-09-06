import fs from 'fs';
import path from 'path';

const logosDir = path.resolve(process.cwd(), 'public/logos');
if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
}

const logos: Record<string, string> = {
  'clip.svg': `<svg width="200" height="60" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="10" width="40" height="40" rx="10" fill="#FF5B00"/>
  <path d="M22 28V23C22 19.6863 24.6863 17 28 17C31.3137 17 34 19.6863 34 23V35C34 39.4183 30.4183 43 26 43C21.5817 43 18 39.4183 18 35V25" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="60" y="38" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="28" fill="#111827" letter-spacing="-0.5">clip</text>
</svg>`,

  'kueski.svg': `<svg width="200" height="60" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="10" width="40" height="40" rx="10" fill="#0050FF"/>
  <path d="M22 18V42M34 20L23 30L35 42" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="58" y="37" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="26" fill="#00244D" letter-spacing="-0.5">kueski</text>
  <circle cx="145" cy="23" r="3.5" fill="#00D287"/>
</svg>`,

  'ben-and-frank.svg': `<svg width="200" height="60" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(6, 12)">
    <circle cx="14" cy="18" r="12" stroke="#18181B" stroke-width="3" fill="none"/>
    <circle cx="36" cy="18" r="12" stroke="#18181B" stroke-width="3" fill="none"/>
    <path d="M26 16C28 14 32 14 34 16" stroke="#18181B" stroke-width="3" stroke-linecap="round"/>
  </g>
  <text x="58" y="36" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="20" fill="#18181B" letter-spacing="-0.3">ben &amp; frank</text>
</svg>`,

  'justo.svg': `<svg width="200" height="60" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="10" width="40" height="40" rx="12" fill="#00A86B"/>
  <path d="M28 18C23 18 20 22 20 28C20 34 24 38 28 38C32 38 36 34 36 28" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="28" cy="26" r="2" fill="#FFFFFF"/>
  <text x="58" y="37" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="26" fill="#0D3B2E" letter-spacing="-0.5">jüsto</text>
</svg>`,

  'caffenio.svg': `<svg width="200" height="60" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="10" width="40" height="40" rx="10" fill="#3D1E0C"/>
  <ellipse cx="28" cy="30" rx="11" ry="8" transform="rotate(-30 28 30)" stroke="#FF6E00" stroke-width="3.5"/>
  <path d="M24 24C27 28 29 32 32 36" stroke="#FF6E00" stroke-width="3" stroke-linecap="round"/>
  <text x="56" y="37" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="21" fill="#3D1E0C" letter-spacing="1">CAFFENIO</text>
</svg>`,

  'kavak.svg': `<svg width="200" height="60" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="10" width="40" height="40" rx="8" fill="#111827"/>
  <path d="M20 18V42M35 18L21 30L35 42" stroke="#0070F3" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="56" y="38" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="26" fill="#111827" letter-spacing="-0.5">kavak</text>
</svg>`,

  'bitso.svg': `<svg width="200" height="60" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="10" width="40" height="40" rx="10" fill="#0F172A"/>
  <rect x="22" y="19" width="7" height="7" rx="1.5" fill="#00EA90"/>
  <rect x="30" y="19" width="7" height="7" rx="1.5" fill="#00EA90"/>
  <rect x="22" y="27" width="7" height="7" rx="1.5" fill="#00EA90"/>
  <rect x="30" y="27" width="7" height="7" rx="1.5" fill="#FFFFFF"/>
  <text x="56" y="37" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="25" fill="#0F172A" letter-spacing="-0.5">bitso</text>
</svg>`,

  'farmacias-similares.svg': `<svg width="200" height="60" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="10" width="40" height="40" rx="10" fill="#0047BA"/>
  <path d="M28 20V40M18 30H38" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round"/>
  <text x="56" y="30" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="16" fill="#0047BA">FARMACIAS</text>
  <text x="56" y="44" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="13" fill="#D90429" letter-spacing="1">SIMILARES</text>
</svg>`,

  'gaia-design.svg': `<svg width="200" height="60" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="10" width="40" height="40" rx="8" fill="#C45D3E"/>
  <path d="M22 22V32C22 34 24 36 28 36C32 36 34 34 34 32V22" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M20 38H36M24 38V42M32 38V42" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
  <text x="56" y="37" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="24" fill="#292524" letter-spacing="2">GAIA</text>
</svg>`,

  'conekta.svg': `<svg width="200" height="60" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="10" width="40" height="40" rx="10" fill="#4338CA"/>
  <circle cx="21" cy="24" r="4" fill="#67E8F9"/>
  <circle cx="35" cy="24" r="4" fill="#F43F5E"/>
  <circle cx="28" cy="36" r="4" fill="#FBBF24"/>
  <path d="M21 24L35 24L28 36Z" stroke="#FFFFFF" stroke-width="2"/>
  <text x="56" y="37" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="23" fill="#1E1B4B" letter-spacing="-0.5">conekta</text>
</svg>`,

  'luuna.svg': `<svg width="200" height="60" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="10" width="40" height="40" rx="10" fill="#1A365D"/>
  <path d="M30 20A10 10 0 1 0 30 40A12 12 0 0 1 30 20Z" fill="#F6AD55"/>
  <text x="56" y="37" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="25" fill="#1A365D" letter-spacing="-0.5">luuna</text>
</svg>`,

  'doto.svg': `<svg width="200" height="60" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="10" width="40" height="40" rx="10" fill="#0284C7"/>
  <circle cx="28" cy="30" r="10" stroke="#FFFFFF" stroke-width="3" fill="none"/>
  <circle cx="28" cy="30" r="4" fill="#F97316"/>
  <text x="56" y="37" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" font-size="26" fill="#0284C7" letter-spacing="-0.5">doto</text>
</svg>`,

  'ahal.svg': `<svg width="200" height="60" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="10" width="40" height="40" rx="10" fill="#4A5568"/>
  <path d="M28 19C28 19 22 25 22 30C22 33.3 24.7 36 28 36C31.3 36 34 33.3 34 30C34 25 28 19 28 19Z" fill="#CBD5E0"/>
  <text x="56" y="37" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="24" fill="#2D3748" letter-spacing="1">AHAL</text>
</svg>`,

  'xaman.svg': `<svg width="200" height="60" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="10" width="40" height="40" rx="10" fill="#292524"/>
  <polygon points="28,18 36,30 28,42 20,30" stroke="#EAB308" stroke-width="2.5" fill="none"/>
  <text x="56" y="37" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="22" fill="#292524" letter-spacing="2">XAMAN</text>
</svg>`,

  'mobel.svg': `<svg width="200" height="60" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="10" width="40" height="40" rx="10" fill="#78350F"/>
  <rect x="20" y="24" width="16" height="12" rx="2" stroke="#FDE68A" stroke-width="2.5" fill="none"/>
  <line x1="22" y1="36" x2="20" y2="40" stroke="#FDE68A" stroke-width="2"/>
  <line x1="34" y1="36" x2="36" y2="40" stroke="#FDE68A" stroke-width="2"/>
  <text x="56" y="37" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="22" fill="#78350F" letter-spacing="0.5">MÖBEL</text>
</svg>`,

  'techstore.svg': `<svg width="200" height="60" viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="10" width="40" height="40" rx="10" fill="#475569"/>
  <rect x="20" y="22" width="16" height="11" rx="1.5" stroke="#38BDF8" stroke-width="2" fill="none"/>
  <line x1="18" y1="36" x2="38" y2="36" stroke="#38BDF8" stroke-width="2"/>
  <text x="56" y="37" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="20" fill="#334155" letter-spacing="-0.3">TechStore</text>
</svg>`
};

for (const [filename, content] of Object.entries(logos)) {
  fs.writeFileSync(path.join(logosDir, filename), content.trim());
  console.log(`Generated logo: public/logos/${filename}`);
}
console.log('All logos generated successfully.');
