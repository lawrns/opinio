import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Opinio.mx | Pasaporte de Confianza Comercial en México",
  description: "Antes de pagar, comprueba quién vende, cómo cumple y cómo responde. El estándar de confianza independiente para compras en línea, WhatsApp y transferencias en México.",
  keywords: ["Opinio", "Confianza comercial", "PROFECO", "DENUE", "Comercio electrónico México", "Verificar tienda", "Compras WhatsApp"],
  icons: {
    icon: "/opinio.svg",
  },
  openGraph: {
    title: "Opinio.mx — La confianza se demuestra",
    description: "Comprueba quién vende, cómo cumple y cómo responde antes de transferir.",
    url: "https://opinio.mx",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a href="#contenido" className="skip-link">Saltar al contenido</a>
        {process.env.OPINIO_QA_FIXTURES === '1' && <aside aria-label="Entorno de prueba" className="border-b border-op-border bg-op-warning-soft px-4 py-2 text-center text-xs font-medium text-op-warning">Vista previa con datos de prueba. Las opiniones y los comercios son ejemplos del entorno de desarrollo.</aside>}
        {children}
      </body>
    </html>
  );
}
