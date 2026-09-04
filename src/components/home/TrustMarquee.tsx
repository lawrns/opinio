'use client';

import React from 'react';
import Link from 'next/link';
import { 
  SealCheck, 
  ArrowUpRight, 
  ShieldCheck, 
  CheckCircle,
  CurrencyDollar,
  Receipt,
  Package
} from '@phosphor-icons/react';

interface MarqueeEvent {
  id: string;
  brand: string;
  slug: string;
  category: string;
  eventText: string;
  proofBadge: string;
  amount?: string;
  timeAgo: string;
}

const EVENTS: MarqueeEvent[] = [
  {
    id: '1',
    brand: 'Luuna',
    slug: 'luuna',
    category: 'Colchones & Hogar',
    eventText: 'Colchón Original Matrimonial entregado en CDMX',
    proofBadge: 'SPEI Banxico Validado',
    amount: '$14,990 MXN',
    timeAgo: 'hace 4 min',
  },
  {
    id: '2',
    brand: 'doto.com.mx',
    slug: 'doto',
    category: 'Tecnología',
    eventText: 'Xiaomi 14 Pro 512GB despachado con guía FedEx',
    proofBadge: 'Shopify Webhook Activo',
    amount: '$18,450 MXN',
    timeAgo: 'hace 11 min',
  },
  {
    id: '3',
    brand: 'Ahal BioCosmética',
    slug: 'ahal-cosmetica',
    category: 'Belleza Natural',
    eventText: 'Suero Facial Maracuyá entregado en San Pedro, N.L.',
    proofBadge: 'DENUE CLEE Verificado',
    amount: '$890 MXN',
    timeAgo: 'hace 18 min',
  },
  {
    id: '4',
    brand: 'Xaman Joyería',
    slug: 'xaman-joyeria',
    category: 'Joyería Fina',
    eventText: 'Anillo Taxco Plata .925 con certificado de contraste',
    proofBadge: 'Resolución SLA 2.4h',
    amount: '$2,400 MXN',
    timeAgo: 'hace 24 min',
  },
  {
    id: '5',
    brand: 'Möbel Studio GDL',
    slug: 'mobel-studio',
    category: 'Muebles Finos',
    eventText: 'Comedor Nogal 8 plazas instalado en Zapopan',
    proofBadge: 'CFDI 4.0 Timbrado',
    amount: '$34,500 MXN',
    timeAgo: 'hace 35 min',
  },
  {
    id: '6',
    brand: 'Luuna',
    slug: 'luuna',
    category: 'Colchones & Hogar',
    eventText: 'Caso de inconformidad resuelto de conformidad',
    proofBadge: 'Resolución 100% Confirmada',
    amount: '$800 MXN Bonificación',
    timeAgo: 'hace 42 min',
  },
];

export function TrustMarquee() {
  return (
    <div className="w-full overflow-hidden py-4 select-none relative">
      {/* Edge Fade Gradients for cinematic smooth overflow */}
      <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-r from-[#FCFBF3] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-l from-[#FCFBF3] to-transparent z-10 pointer-events-none" />

      {/* Ticker Strip */}
      <div className="flex gap-4 items-center animate-marquee hover:[animation-play-state:paused] w-max">
        {/* Render duplicate arrays for infinite loop */}
        {[...EVENTS, ...EVENTS].map((ev, idx) => (
          <Link
            key={`${ev.id}-${idx}`}
            href={`/b/${ev.slug}`}
            className="flex items-center gap-3 bg-white border border-[#E5E7EB] hover:border-[#CBD5E1] rounded-2xl px-4 py-2.5 shadow-2xs hover:shadow-xs transition-all shrink-0 group text-xs"
          >
            <div className="w-6 h-6 rounded-full bg-[#E6F8F2] border border-[#B3ECD9] text-[#008B5D] flex items-center justify-center font-bold text-[10px] shrink-0">
              <SealCheck weight="fill" className="w-3.5 h-3.5 text-[#00B67A]" />
            </div>

            <div className="flex items-baseline gap-1.5 font-bold text-[#121511]">
              <span className="group-hover:text-[#00B67A] transition-colors">{ev.brand}</span>
              <span className="text-[10px] font-normal text-[#6C706B]">• {ev.category}</span>
            </div>

            <span className="text-[#454744] truncate max-w-[220px] hidden sm:inline">
              {ev.eventText}
            </span>

            <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded-full bg-[#FCFBF3] text-[#008B5D] border border-[#E5E7EB] shrink-0">
              {ev.proofBadge}
            </span>

            {ev.amount && (
              <span className="font-mono text-[10px] text-[#121511] font-bold shrink-0 hidden md:inline">
                {ev.amount}
              </span>
            )}

            <span className="text-[10px] text-[#9CA3AF] font-mono shrink-0">
              {ev.timeAgo}
            </span>

            <ArrowUpRight weight="bold" className="w-3 h-3 text-[#9CA3AF] group-hover:text-[#00B67A] transition-colors shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
