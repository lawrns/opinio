import Link from 'next/link';

/** Neutral page shown while the merchant panel is contained. Renders no business or case data. */
export function MerchantUnavailable() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Panel temporalmente no disponible</h1>
      <p className="mt-3 text-sm leading-relaxed">
        Estamos habilitando el acceso seguro para comercios. Los perfiles públicos y el seguimiento de casos siguen disponibles.
      </p>
      <p className="mt-6">
        <Link href="/" className="underline">Volver a Opinio</Link>
      </p>
    </main>
  );
}
