import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PublicScore } from './PublicScore';

describe('PublicScore (used by /verificar)', () => {
  it('renders the score when the payload has at least 1 verified reviews', () => {
    const html = renderToStaticMarkup(<PublicScore score={81.5} verifiedCount={1} />);
    expect(html).toMatch(/81[.,]5/);
    expect(html).toContain('/ 100');
  });
  it('renders Sin datos below the threshold or when the count is absent', () => {
    expect(renderToStaticMarkup(<PublicScore score={81.5} verifiedCount={0} />)).toContain('Sin datos');
    expect(renderToStaticMarkup(<PublicScore score={81.5} />)).toContain('Sin datos');
    expect(renderToStaticMarkup(<PublicScore score={null} verifiedCount={9} />)).toContain('Sin datos');
  });
});
