import { notFound } from 'next/navigation';
import { getWidgetDataByToken } from '@/lib/merchant-data';
import { MerchantWidgetSurface } from '@/components/MerchantWidgetSurface';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Perfil de confianza · Opinio.mx', robots: { index: false, follow: false } };

export default async function WidgetPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ theme?: string }> }) {
  const { token } = await params;
  const { theme } = await searchParams;
  const widgetData = await getWidgetDataByToken(token);
  if (!widgetData) notFound();
  return <MerchantWidgetSurface business={widgetData} format="reassurance" theme={theme === 'dark' ? 'dark' : theme === 'light' ? 'light' : widgetData.theme} />;
}
