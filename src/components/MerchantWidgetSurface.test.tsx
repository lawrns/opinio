import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MerchantWidgetSurface } from './MerchantWidgetSurface';
import type { WidgetWithBusiness } from '@/lib/merchant-data';

const render = (verified: number) =>
  renderToStaticMarkup(
    <MerchantWidgetSurface
      business={{ brand_name: 'Demo', b_slug: 'demo', trust_score: 73.7, verified_reviews_count: verified, review_count: 5 } as unknown as WidgetWithBusiness}
      format="card"
      theme="light"
    />
  );

describe('MerchantWidgetSurface score gate', () => {
  it('hides the score below the verified threshold', () => {
    const html = render(0);
    expect(html).not.toContain('73.7');
    expect(html).toContain('Sin evidencia suficiente');
  });
  it('shows the score at the threshold', () => {
    expect(render(1)).toContain('73.7');
  });
});
