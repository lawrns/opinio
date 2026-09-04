'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Phone, 
  Globe, 
  CreditCard, 
  Building2, 
  ArrowRight, 
  ShieldCheck, 
  AlertTriangle,
  Loader2,
  CheckCircle2
} from 'lucide-react';

type SearchTab = 'name' | 'whatsapp' | 'domain' | 'clabe';

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
  const [activeTab, setActiveTab] = useState<SearchTab>('name');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const tabs: { id: SearchTab; label: string; icon: React.ElementType; placeholder: string; example: string }[] = [
    {
      id: 'name',
      label: 'Nombre de tienda',
      icon: Building2,
      placeholder: 'Ej. Luuna, Doto, Ahal BioCosmética...',
      example: 'Luuna',
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp +52',
      icon: Phone,
      placeholder: 'Ej. +52 55 4164 0533 o 5541640533...',
      example: '55 4164 0533',
    },
    {
      id: 'domain',
      label: 'URL / Sitio web',
      icon: Globe,
      placeholder: 'Ej. luuna.mx, ahal.mx, tiendaejemplo.com...',
      example: 'luuna.mx',
    },
    {
      id: 'clabe',
      label: 'CLABE / Enlace de pago',
      icon: CreditCard,
      placeholder: 'Ej. 646180... o link de Mercado Pago / Stripe...',
      example: '646180123456789012',
    },
  ];

  const currentTabConfig = tabs.find((t) => t.id === activeTab)!;

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
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || data.businesses || []);
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Search fetch error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

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

    // If exactly one match and exact or strong, direct to profile
    if (results.length === 1) {
      router.push(`/b/${results[0].slug}`);
      return;
    }

    router.push(`/verificar?q=${encodeURIComponent(query.trim())}&tab=${activeTab}`);
  };

  const handleSelectBusiness = (slug: string) => {
    setIsOpen(false);
    router.push(`/b/${slug}`);
  };

  return (
    <div className="w-full max-w-3xl mx-auto" ref={dropdownRef}>
      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 p-1 mb-2 bg-neutral-900/80 backdrop-blur-md rounded-xl border border-neutral-800/80 w-fit mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setQuery('');
                setResults([]);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-neutral-800 text-emerald-400 shadow-sm ring-1 ring-neutral-700/80'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-400' : 'text-neutral-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Search Input Form */}
      <form onSubmit={handleSubmit} className="relative group">
        <div className="relative flex items-center rounded-2xl bg-neutral-900/90 p-2 border-2 border-neutral-800 transition-all focus-within:border-emerald-500/80 focus-within:ring-4 focus-within:ring-emerald-500/10 shadow-2xl shadow-black/60">
          <div className="flex items-center justify-center pl-3 pr-2 text-neutral-400">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            ) : (
              <Search className="h-5 w-5 text-neutral-400 group-focus-within:text-emerald-400 transition-colors" />
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setIsOpen(true)}
            placeholder={currentTabConfig.placeholder}
            className="w-full bg-transparent px-2 py-2.5 text-sm sm:text-base text-white placeholder-neutral-500 focus:outline-none"
          />

          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 sm:px-6 py-2.5 text-xs sm:text-sm font-semibold text-neutral-950 transition-all hover:bg-emerald-400 active:scale-98 shrink-0 shadow-md shadow-emerald-950/40"
          >
            <span className="hidden sm:inline">Verificar Pasaporte</span>
            <span className="sm:hidden">Buscar</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Live Search Suggestions Dropdown */}
        {isOpen && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-neutral-800 bg-neutral-900/95 backdrop-blur-2xl shadow-2xl z-50 overflow-hidden divide-y divide-neutral-850">
            <div className="p-2.5 bg-neutral-950/70 text-[11px] font-medium text-neutral-400 flex items-center justify-between">
              <span>Negocios encontrados con evidencia</span>
              <span className="text-emerald-400 font-semibold">{results.length} coincidencias</span>
            </div>
            
            <div className="max-h-80 overflow-y-auto divide-y divide-neutral-800/60">
              {results.map((biz) => {
                const score = Number(biz.trust_score) || 0;
                const coverage = Number(biz.coverage_percentage) || 0;
                return (
                  <button
                    key={biz.slug}
                    type="button"
                    onClick={() => handleSelectBusiness(biz.slug)}
                    className="w-full text-left p-3 hover:bg-neutral-800/60 transition-colors flex items-center justify-between gap-3 group/item"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-800 border border-neutral-700 font-bold text-emerald-400 group-hover/item:border-emerald-500/50">
                        {biz.brand_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white truncate group-hover/item:text-emerald-400 transition-colors">
                            {biz.brand_name}
                          </span>
                          {biz.verified_level === 'transparent_coverage' && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-medium text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              Auditado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 truncate">
                          {biz.legal_name || biz.category} • {biz.domain || biz.whatsapp || 'México'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div>
                        <div className="text-sm font-bold text-white flex items-center justify-end gap-1">
                          <span className="text-xs text-neutral-400">Score</span>
                          <span className={score >= 80 ? 'text-emerald-400' : 'text-amber-400'}>
                            {score}
                          </span>
                          <span className="text-[10px] text-neutral-500">/100</span>
                        </div>
                        {coverage > 0 && (
                          <div className="text-[11px] text-neutral-400">
                            {coverage}% cobertura
                          </div>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-neutral-500 group-hover/item:text-emerald-400 group-hover/item:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-2.5 bg-neutral-950/80 text-center">
              <button
                type="button"
                onClick={handleSubmit}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1 w-full"
              >
                <span>Ver todos los resultados para &quot;{query}&quot;</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Suggested Quick Searches */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-500">
        <span className="text-neutral-400">Consultas frecuentes:</span>
        <button
          type="button"
          onClick={() => {
            setActiveTab('name');
            setQuery('Luuna');
          }}
          className="rounded-md bg-neutral-900 px-2 py-0.5 text-neutral-300 hover:bg-neutral-800 hover:text-emerald-400 transition-colors border border-neutral-800"
        >
          Luuna
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('name');
            setQuery('doto.com.mx');
          }}
          className="rounded-md bg-neutral-900 px-2 py-0.5 text-neutral-300 hover:bg-neutral-800 hover:text-emerald-400 transition-colors border border-neutral-800"
        >
          doto.com.mx
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('name');
            setQuery('Ahal');
          }}
          className="rounded-md bg-neutral-900 px-2 py-0.5 text-neutral-300 hover:bg-neutral-800 hover:text-emerald-400 transition-colors border border-neutral-800"
        >
          Ahal BioCosmética
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('whatsapp');
            setQuery('+52 55 4164 0533');
          }}
          className="rounded-md bg-neutral-900 px-2 py-0.5 text-neutral-300 hover:bg-neutral-800 hover:text-emerald-400 transition-colors border border-neutral-800"
        >
          WhatsApp Luuna (+52 55...)
        </button>
      </div>
    </div>
  );
}
