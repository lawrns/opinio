import type { Metadata } from 'next';

// Approved indexing policy (JEV-016/JEV-024/JEV-025): the search route and its
// query/category/action variants are utility pages, so they are noindex but
// stay crawlable (no robots.txt blocking) and keep passing discovery to the
// public passports and the directory.
export const metadata: Metadata = {
  title: 'Buscar y verificar un comercio antes de comprar | Opinio México',
  description: 'Busca comercios por nombre, dominio, RFC o categoría, filtra por calificación y pedidos, y abre su pasaporte de confianza en Opinio México.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function VerificarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
