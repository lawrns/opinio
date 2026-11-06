import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('public llms files do not claim every published item is buyer-authored', () => {
  it.each(['llms.txt', 'llms-full.txt'])('%s distinguishes automated content from customer ratings', (name) => {
    const text = fs.readFileSync(path.join(process.cwd(), 'public', name), 'utf8');
    expect(text).not.toMatch(/opiniones publicadas por compradores/);
    expect(text).not.toMatch(/las opiniones de compradores/);
    expect(text).toMatch(/contenido automatizado/);
    expect(text).toMatch(/Automatizado/);
    expect(text).toMatch(/no cuenta como opinión de comprador/);
    expect(text).toMatch(/reseña verificada/);
  });
});
