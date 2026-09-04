import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function NotFound() {
  return <div className="flex min-h-screen flex-col"><Navbar /><main id="contenido" tabIndex={-1} className="op-container flex flex-1 flex-col items-start justify-center py-24 focus:outline-none"><p className="op-eyebrow">Página no encontrada · 404</p><h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">Busquemos por otro lado.</h1><p className="mb-7 mt-5 max-w-lg text-base leading-relaxed text-op-secondary">Este enlace no está disponible. Puedes buscar el comercio en el directorio o volver al inicio.</p><Link href="/verificar" className="op-button">Buscar un comercio <ArrowRight aria-hidden="true" className="size-4" /></Link><Link href="/" className="op-link mt-3">Volver al inicio</Link></main><Footer /></div>;
}
