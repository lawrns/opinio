import Link from 'next/link';

export type TextLink = { text: string; href: string };

/** Add one contextual link while retaining the canonical plain text. */
export function LinkedText({ text, link }: { text: string; link?: TextLink }) {
  const start = link ? text.indexOf(link.text) : -1;
  if (!link || !link.text || start < 0) return <>{text}</>;

  return (
    <>
      {text.slice(0, start)}
      <Link href={link.href} className="underline underline-offset-4">
        {link.text}
      </Link>
      {text.slice(start + link.text.length)}
    </>
  );
}
