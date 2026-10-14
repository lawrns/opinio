import type { Metadata } from 'next';
import { sharePreview } from '@/lib/share-preview';

// Approved indexing policy (JEV-016/JEV-024/JEV-025): the search route and its
// query/category/action variants are utility pages, so they are noindex but
// stay crawlable (no robots.txt blocking) and keep passing discovery to the
// public passports and the directory.
const PURPOSE_TITLE = 'Buscar y verificar un comercio antes de comprar | Opinio México';
const PURPOSE_DESCRIPTION = 'Busca comercios por nombre, dominio, RFC o categoría, filtra por calificación y pedidos, y abre su pasaporte de confianza en Opinio México.';

export const metadata: Metadata = {
  title: PURPOSE_TITLE,
  description: PURPOSE_DESCRIPTION,
  robots: {
    index: false,
    follow: true,
  },
  // The share preview states the route's purpose and the parameter-free purpose
  // URL, so query, category and action values never reach share metadata.
  ...sharePreview({ title: PURPOSE_TITLE, description: PURPOSE_DESCRIPTION, url: '/verificar' }),
};

export default function VerificarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
