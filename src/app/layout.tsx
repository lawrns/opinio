import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const brandSans = DM_Sans({
  variable: "--font-brand-sans",
  subsets: ["latin"],
  display: "swap",
});

const dataMono = IBM_Plex_Mono({
  variable: "--font-data-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const envSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const canonicalSiteUrl = envSiteUrl && !envSiteUrl.includes('fertilitylistings') ? envSiteUrl : 'https://opinio.mx';

export const metadata: Metadata = {
  metadataBase: new URL(canonicalSiteUrl),
  title: "Opinio México — Pasaporte de Confianza Comercial",
  description: "Antes de comprar, conoce a quién le compras. Verifica identidad, cumplimiento y cómo responde cada comercio en México.",
  icons: {
    icon: "/opinio.svg",
  },
  openGraph: {
    title: "Opinio México — Pasaporte de Confianza Comercial",
    description: "Consulta opiniones verificadas, evidencia de compra y resolución de casos antes de transferir o comprar.",
    url: canonicalSiteUrl,
    siteName: "Opinio.mx",
    locale: "es_MX",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es-MX"
      className={`${brandSans.variable} ${dataMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a href="#contenido" className="skip-link">Saltar al contenido</a>
        {process.env.OPINIO_QA_FIXTURES === '1' && <aside aria-label="Entorno de prueba" className="border-b border-op-border bg-op-warning-soft px-4 py-2 text-center text-xs font-medium text-op-warning">Vista previa con datos de prueba. Las opiniones y los comercios son ejemplos del entorno de desarrollo.</aside>}
        {children}
      </body>
    </html>
  );
}
