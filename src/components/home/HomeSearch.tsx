'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  ArrowRight, 
  ShieldCheck, 
  Loader2,
  CheckCircle2
} from 'lucide-react';

interface SearchResultItem {
  id: number;
  slug: string;
  brand_name: string;
  legal_name: string | null;
  category: string;
  trust_score: number | string;
  coverage_percentage: number | string;
  verified_level: string;
  domain: string | null;
  whatsapp: string | null;
}

export function HomeSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Live search debounced
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data.success && data.results) {
          setResults(data.results.slice(0, 5));
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    if (results.length > 0) {
      router.push(`/b/${results[0].slug}`);
    } else {
      router.push(`/verificar?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSelectBusiness = (slug: string) => {
    setIsOpen(false);
    router.push(`/b/${slug}`);
  };

  return (
    <div className="w-full max-w-3xl mx-auto relative" ref={dropdownRef}>
      {/* Big Trustpilot-style Floating Search Capsule */}
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center bg-white rounded-full p-2 border border-gray-200 shadow-[0_12px_35px_-8px_rgba(0,0,0,0.08)] hover:border-gray-300 focus-within:border-[#00B67A] focus-within:shadow-[0_16px_40px_-8px_rgba(0,182,122,0.18)] transition-all"
      >
        <div className="pl-4 text-gray-400">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#00B67A]" />
          ) : (
            <Search className="w-5 h-5 text-gray-400" />
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Busca una empresa, categoría, RFC o número de WhatsApp (+52)..."
          className="w-full bg-transparent px-4 py-3 text-sm sm:text-base text-[#121511] placeholder:text-gray-400 focus:outline-none font-medium"
        />

        {/* Circular Blue Action Button */}
        <button
          type="submit"
          className="w-12 h-12 rounded-full bg-[#2050E6] hover:bg-[#1A42C2] text-white flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm"
          title="Buscar en Opinio"
        >
          <Search className="w-5 h-5" />
        </button>
      </form>

      {/* Quick Search Chips below Capsule */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-gray-600">
        <span className="font-medium text-gray-400 text-[11px]">Sugerencias:</span>
        {[
          { label: 'Luuna Colchones', query: 'Luuna' },
          { label: 'doto.com.mx', query: 'doto' },
          { label: 'Ahal BioCosmética', query: 'Ahal' },
          { label: 'Xaman Joyería', query: 'Xaman' },
          { label: 'Möbel Studio GDL', query: 'Möbel' },
        ].map((tag) => (
          <button
            key={tag.label}
            type="button"
            onClick={() => {
              setQuery(tag.query);
              router.push(`/verificar?q=${encodeURIComponent(tag.query)}`);
            }}
            className="px-3 py-1 rounded-full bg-white/80 hover:bg-white text-gray-700 hover:text-[#121511] border border-gray-200/80 shadow-2xs transition-all hover:border-gray-300 font-medium"
          >
            {tag.label}
          </button>
        ))}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden z-40 animate-in fade-in duration-100">
          <div className="p-2 border-b border-gray-100 bg-[#FCFBF3] flex items-center justify-between text-[11px] text-gray-500 font-semibold px-3">
            <span>Resultados en tiempo real</span>
            <span className="text-[#00B67A] font-bold">Pasaportes Verificados</span>
          </div>

          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {results.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => handleSelectBusiness(b.slug)}
                className="w-full text-left p-3.5 hover:bg-[#F9F9F6] flex items-center justify-between gap-4 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center font-bold text-gray-700 text-xs shrink-0">
                    {b.brand_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#121511] group-hover:text-[#00B67A] transition-colors flex items-center gap-1.5">
                      <span className="truncate">{b.brand_name}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00B67A] shrink-0" />
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {b.legal_name || b.category} • {b.domain || 'WhatsApp Oficial'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 justify-end text-xs font-bold text-[#121511]">
                    <div className="flex items-center text-[#00B67A]">
                      {'★'.repeat(5)}
                    </div>
                    <span className="font-mono text-sm">{b.trust_score}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 font-medium mt-0.5">
                    {b.coverage_percentage}% Cobertura
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="p-2.5 bg-gray-50 border-t border-gray-100 text-center">
            <button
              type="button"
              onClick={() => router.push(`/verificar?q=${encodeURIComponent(query)}`)}
              className="text-xs font-bold text-[#2050E6] hover:underline inline-flex items-center gap-1"
            >
              <span>Ver todos los resultados para &ldquo;{query}&rdquo;</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
