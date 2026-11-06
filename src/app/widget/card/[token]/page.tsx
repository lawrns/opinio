import { notFound } from 'next/navigation';
import { getWidgetDataByToken, getMerchantReviews } from '@/lib/merchant-data';
import { MerchantWidgetSurface } from '@/components/MerchantWidgetSurface';
import { PUBLIC_REVIEW_STATUS, isCustomerReview, isPublicReview, toPublicReview } from '@/lib/public-reviews';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Perfil de confianza · Opinio.mx', robots: { index: false, follow: false } };

export default async function WidgetPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ theme?: string }> }) {
  const { token } = await params;
  const { theme } = await searchParams;
  const widgetData = await getWidgetDataByToken(token);
  if (!widgetData) notFound();
  // Public embed: newest published non-automated review only, without reviewer contact.
  const reviews = await getMerchantReviews(widgetData.id, { status: PUBLIC_REVIEW_STATUS });
  const latest = reviews
    .filter((review) => isPublicReview(review) && isCustomerReview(review))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || b.id - a.id)[0];
  const review = latest ? toPublicReview(latest) : null;
  return <MerchantWidgetSurface business={widgetData} format="card" theme={theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : widgetData.theme} review={review} />;
}
