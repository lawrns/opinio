import { notFound } from 'next/navigation';
import { getWidgetDataByToken, getMerchantReviews } from '@/lib/merchant-data';
import { MerchantWidgetSurface } from '@/components/MerchantWidgetSurface';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Perfil de confianza · Opinio.mx', robots: { index: false, follow: false } };

export default async function WidgetPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ theme?: string }> }) {
  const { token } = await params;
  const { theme } = await searchParams;
  const widgetData = await getWidgetDataByToken(token);
  if (!widgetData) notFound();
  const reviews = await getMerchantReviews(widgetData.id);
  return <MerchantWidgetSurface business={widgetData} format="card" theme={theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : widgetData.theme} review={reviews[0] || null} />;
}
