import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono } from "next/font/google";
import { Analytics } from "@/components/Analytics";
import { sharePreview } from "@/lib/share-preview";
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

// Site identity for pages without a reviewed family identity of their own
// (private portals and widget embeds inherit this preview). The share preview
// reuses the same strings, so the document and the card never diverge.
const SITE_TITLE = "Opinio México — Pasaporte de Confianza Comercial";
const SITE_DESCRIPTION = "Antes de comprar, conoce a quién le compras. Verifica identidad, cumplimiento y cómo responde cada comercio en México.";

export const metadata: Metadata = {
  metadataBase: new URL(canonicalSiteUrl),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  icons: {
    icon: "/opinio.svg",
  },
  ...sharePreview({ title: SITE_TITLE, description: SITE_DESCRIPTION, url: "/" }),
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
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && <Analytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />}
      </body>
    </html>
  );
}
