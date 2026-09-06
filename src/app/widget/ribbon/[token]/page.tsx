import { notFound } from 'next/navigation';
import { getWidgetDataByToken } from '@/lib/merchant-data';
import { MerchantWidgetSurface } from '@/components/MerchantWidgetSurface';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Cinta de Prestigio · Opinio México',
  robots: { index: false, follow: false },
};

export default async function RibbonWidgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ theme?: string }>;
}) {
  const { token } = await params;
  const { theme } = await searchParams;
  const widgetData = await getWidgetDataByToken(token);
  if (!widgetData) notFound();

  const activeTheme =
    theme === 'dark'
      ? 'dark'
      : theme === 'transparent'
      ? 'transparent'
      : theme === 'light'
      ? 'light'
      : widgetData.theme || 'light';

  return (
    <MerchantWidgetSurface
      business={widgetData}
      format="ribbon"
      theme={activeTheme}
    />
  );
}
