import { categoryStyle } from '@/lib/category-style';

interface BrandLogoProps {
  name: string;
  src?: string | null;
  category?: string | null;
  sizeClass?: string;
}

function initialsOf(name: string): string {
  const compact = name.replace(/[^A-Za-zÀ-ÿ0-9]/g, '');
  return (compact || name).slice(0, 2).toUpperCase();
}

export function BrandLogo({
  name,
  src,
  category,
  sizeClass = 'size-12',
}: BrandLogoProps) {
  const accent = categoryStyle(category || '');
  if (src) {
    return (
      <span
        className={`relative flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-xl border border-op-border bg-op-sheet`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="max-h-[82%] max-w-[82%] object-contain" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-xl border text-sm font-semibold ${accent.tile}`}
    >
      {initialsOf(name)}
    </span>
  );
}
