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

describe('MerchantWidgetSurface ribbon provenance', () => {
  const ribbon = (business: Record<string, unknown>) =>
    renderToStaticMarkup(
      <MerchantWidgetSurface
        business={{ brand_name: 'Demo', b_slug: 'demo', ...business } as unknown as WidgetWithBusiness}
        format="ribbon"
        theme="light"
      />
    );

  it('labels only the verified customer count, not an automated-inflated review count', () => {
    const html = ribbon({ calculated_rating: 4.2, review_count: 40, verified_reviews_count: 2 });
    expect(html).toContain('4.2/5');
    expect(html).toContain('2+ reseñas verificadas');
    expect(html).not.toContain('40+');
    expect(html).not.toContain('50+');
  });

  it('does not invent a verified rating when customer reviews are absent', () => {
    const html = ribbon({ calculated_rating: null, review_count: 12, verified_reviews_count: 0 });
    expect(html).toContain('Sin calificación de clientes');
    expect(html).not.toContain('reseñas verificadas');
    const text = html.replace(/<svg[\s\S]*?<\/svg>/g, '');
    expect(text).not.toContain('4.8');
    expect(text).not.toContain('5.0');
    expect(html).not.toContain('12+');
    expect(html).not.toContain('50+');
  });
});
