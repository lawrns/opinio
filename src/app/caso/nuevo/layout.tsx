import type { Metadata } from 'next';
import { sharePreview } from '@/lib/share-preview';

// Approved indexing policy (JEV-016/JEV-024/JEV-025): the case-entry route and
// its merchant-parameter variants are utility pages, so they are noindex but
// stay crawlable (no robots.txt blocking) and keep passing discovery to the
// public passports and the directory.
const PURPOSE_TITLE = 'Registrar un caso de compra | Opinio México';
const PURPOSE_DESCRIPTION = 'Registra el problema de compra y la solución que solicitas: se crea una página para consultar el estado del caso y continuar la conversación con el comercio.';

export const metadata: Metadata = {
  title: PURPOSE_TITLE,
  description: PURPOSE_DESCRIPTION,
  robots: {
    index: false,
    follow: true,
  },
  // The share preview states the route's purpose and the parameter-free purpose
  // URL, so the merchant parameter never reaches share metadata.
  ...sharePreview({ title: PURPOSE_TITLE, description: PURPOSE_DESCRIPTION, url: '/caso/nuevo' }),
};

export default function NuevoCasoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
