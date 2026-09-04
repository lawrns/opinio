'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  ArrowUpRight, 
  CheckCircle,
  Building,
  SealCheck,
  TrendUp
} from '@phosphor-icons/react';

export interface BusinessCardProps {
  business: {
    id: number;
    slug: string;
    brand_name: string;
    legal_name: string | null;
    category: string;
    rfc: string | null;
    domain: string | null;
    whatsapp: string | null;
    logo_url: string | null;
    trust_score: string | number;
    confidence_level: string;
    coverage_percentage: string | number;
    observed_orders_count: number;
    invited_orders_count: number;
    issues_per_thousand: string | number;
    resolution_rate: string | number;
    effective_reviews_count: number;
    verified_level: string;
  };
}

export function BusinessCard({ business }: BusinessCardProps) {
  const scoreNum = Number(business.trust_score) || 0;
  const starsCount = Math.min(5, Math.max(1, Math.round(scoreNum / 20)));
  const coverageNum = Number(business.coverage_percentage) || 0;

  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.2, ease: 'easeOut' } }}
      className="group relative flex flex-col justify-between bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.9)] hover:border-[#D1D5DB] hover:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.05)] transition-all"
    >
      <div className="space-y-4">
        {/* Folio & Verification Strip */}
        <div className="flex items-center justify-between gap-2 border-b border-[#F3F4F6] pb-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00B67A]" />
            <span className="font-mono text-[10px] font-semibold text-[#6C706B] uppercase tracking-wider">
              {business.rfc ? `SAT: ${business.rfc}` : 'MX-AUDITADO'}
            </span>
          </div>

          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E6F8F2] text-[#008B5D] border border-[#B3ECD9]">
            <SealCheck weight="bold" className="w-3 h-3 text-[#00B67A]" />
            <span>Verificado</span>
          </span>
        </div>

        {/* Brand Header: Logo + Names */}
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-center font-bold text-sm text-[#121511] shrink-0 overflow-hidden shadow-2xs">
            {business.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={business.logo_url}
                alt={business.brand_name}
                className="w-full h-full object-cover"
              />
            ) : (
              business.brand_name.slice(0, 2).toUpperCase()
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-[#121511] group-hover:text-[#00B67A] transition-colors flex items-center gap-1.5">
              <span className="truncate">{business.brand_name}</span>
            </h3>
            <p className="text-xs text-[#6C706B] truncate font-medium mt-0.5">
              {business.legal_name || business.category}
            </p>
            <p className="text-[11px] text-[#9CA3AF] font-mono truncate">
              {business.domain || 'WhatsApp Oficial'}
            </p>
          </div>
        </div>

        {/* Star Tiles & Score Display (Trustpilot signature green squares) */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center justify-center rounded-[3px] w-5 h-5 text-xs text-white ${
                    i < starsCount ? 'bg-[#00B67A]' : 'bg-[#DCDCE6]'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="font-mono text-xs font-bold text-[#121511]">
              {scoreNum.toFixed(1)}
            </span>
          </div>

          <span className="text-[11px] text-[#6C706B] font-mono">
            {business.effective_reviews_count} reseñas
          </span>
        </div>

        {/* The Denominator Ledger Box (Opinio IP & Moat) */}
        <div className="p-3 rounded-xl bg-[#FBF9F2] border border-[#EBEAE1] space-y-2 text-xs">
          <div className="flex items-center justify-between font-mono">
            <span className="text-[#6C706B] text-[11px] font-medium">Cobertura de pedidos:</span>
            <span className="font-bold text-[#008B5D] text-xs">
              {coverageNum}%
            </span>
          </div>

          {/* Hairline denominator progress track */}
          <div className="w-full bg-[#E5E7EB] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#00B67A] h-full rounded-full"
              style={{ width: `${Math.min(100, Math.max(5, coverageNum))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-[#6C706B] font-mono pt-0.5">
            <span>{business.observed_orders_count.toLocaleString('es-MX')} órdenes auditadas</span>
            <span className="text-[#121511] font-semibold">{business.resolution_rate}% resuelto</span>
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="mt-4 pt-3 border-t border-[#F3F4F6] flex items-center justify-between text-xs">
        <span className="text-[11px] font-medium text-[#6C706B] truncate max-w-[150px]">
          {business.category}
        </span>

        <Link
          href={`/b/${business.slug}`}
          className="inline-flex items-center gap-1 font-bold text-[#2050E6] group-hover:text-[#1A42C2] transition-colors"
        >
          <span>Ver Pasaporte</span>
          <ArrowUpRight weight="bold" className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      </div>
    </motion.div>
  );
}
