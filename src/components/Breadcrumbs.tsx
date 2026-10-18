import Link from 'next/link';

type BreadcrumbItem = { name: string; href: string };

/** One hierarchy supplies both the visible trail and its structured data. */
export function Breadcrumbs({ items, siteUrl }: { items: readonly BreadcrumbItem[]; siteUrl: string }) {
  const last = items[items.length - 1];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${new URL(last.href, siteUrl).href}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.name,
      item: new URL(item.href, siteUrl).href,
    })),
  };

  return (
    <>
      <nav aria-label="Ruta de navegación" className="mb-3 text-xs font-medium text-op-muted">
        <ol className="flex flex-wrap items-center gap-2">
          {items.map((item, index) => (
            <li key={item.href} className="flex min-w-0 items-center gap-2">
              {index > 0 && <span aria-hidden="true">/</span>}
              {index === items.length - 1 ? (
                <span aria-current="page" className="break-words">{item.name}</span>
              ) : (
                <Link href={item.href} className="hover:underline">{item.name}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    </>
  );
}
