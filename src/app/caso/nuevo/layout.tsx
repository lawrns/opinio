import type { Metadata } from 'next';

// Approved indexing policy (JEV-016/JEV-024/JEV-025): the case-entry route and
// its merchant-parameter variants are utility pages, so they are noindex but
// stay crawlable (no robots.txt blocking) and keep passing discovery to the
// public passports and the directory.
export const metadata: Metadata = {
  title: 'Registrar un caso de compra | Opinio México',
  description: 'Registra el problema de compra y la solución que solicitas: se crea una página para consultar el estado del caso y continuar la conversación con el comercio.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function NuevoCasoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
