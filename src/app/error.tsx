'use client';

import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="flex min-h-screen flex-col"><Navbar /><main id="contenido" tabIndex={-1} className="op-container flex flex-1 flex-col items-start justify-center py-24 focus:outline-none"><p className="op-eyebrow">No pudimos cargar esta página</p><h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight">Vamos a intentarlo de nuevo.</h1><p className="mb-7 mt-5 max-w-lg text-base leading-relaxed text-op-secondary">Ocurrió un problema al cargar la información. Si acabas de enviar un formulario, consulta el resultado antes de volver a enviarlo.</p><button type="button" onClick={reset} className="op-button">Volver a cargar</button><Link href="/" className="op-link mt-3">Ir al inicio</Link></main><Footer /></div>;
}
