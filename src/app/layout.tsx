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
    icon: "/favicon.ico",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
