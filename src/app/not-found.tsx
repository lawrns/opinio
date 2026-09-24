import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="contenido" tabIndex={-1} className="op-container flex flex-1 flex-col items-start justify-center py-24 focus:outline-none">
      <p className="op-eyebrow">Página no encontrada · 404</p>
      <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">Página no encontrada</h1>
      <p className="mb-7 mt-5 max-w-lg text-base leading-relaxed text-op-secondary">
        Lo sentimos, la página que buscas no existe o ha sido movida.
      </p>
      <Link href="/" className="op-link">Volver al inicio</Link>
    </main>
  );
}
