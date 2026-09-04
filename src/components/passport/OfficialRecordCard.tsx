'use client';

import React from 'react';
import { 
  Building, 
  Scales, 
  Receipt, 
  SealCheck, 
  ArrowSquareOut,
  Fingerprint,
  CalendarBlank,
  FileText
} from '@phosphor-icons/react';

export interface OfficialRecordProps {
  record: {
    id: number;
    source_name: string;
    fact_title: string;
    fact_detail: string;
    record_date: string;
    source_url: string | null;
  };
}

export function OfficialRecordCard({ record }: OfficialRecordProps) {
  const isInegi = record.source_name.toLowerCase().includes('inegi') || record.source_name.toLowerCase().includes('denue');
  const isProfeco = record.source_name.toLowerCase().includes('profeco') || record.source_name.toLowerCase().includes('buró');
  const isSat = record.source_name.toLowerCase().includes('sat') || record.source_name.toLowerCase().includes('rfc');

  return (
    <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-xs hover:shadow-sm hover:border-[#D1D5DB] transition-all space-y-4 relative overflow-hidden">
      {/* Background Watermark Pattern */}
      <div className="absolute -right-6 -bottom-6 w-32 h-32 text-gray-100 opacity-60 pointer-events-none">
        {isInegi ? (
          <Building weight="thin" className="w-full h-full" />
        ) : isProfeco ? (
          <Scales weight="thin" className="w-full h-full" />
        ) : (
          <Receipt weight="thin" className="w-full h-full" />
        )}
      </div>

      {/* Certificate Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F3F4F6] pb-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#F8FAFC] border border-[#E5E7EB] flex items-center justify-center text-[#121511]">
            {isInegi ? (
              <Building weight="bold" className="w-4 h-4 text-blue-600" />
            ) : isProfeco ? (
              <Scales weight="bold" className="w-4 h-4 text-purple-600" />
            ) : (
              <Receipt weight="bold" className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#121511] block">
              {record.source_name}
            </span>
            <span className="text-[9px] text-[#6C706B] font-mono">
              ESTADOS UNIDOS MEXICANOS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F8F2] text-[#008B5D] border border-[#B3ECD9]">
            <SealCheck weight="bold" className="w-3.5 h-3.5 text-[#00B67A]" />
            <span>Certificado Activo</span>
          </span>
          <span className="font-mono text-[10px] text-gray-400">
            Corte: {record.record_date}
          </span>
        </div>
      </div>

      {/* Fact Title & Detailed Metadata */}
      <div className="space-y-2">
        <h3 className="text-base font-black text-[#121511] tracking-tight">
          {record.fact_title}
        </h3>

        {/* Recessed Certificate Slip Box */}
        <div className="p-3.5 rounded-2xl bg-[#FBF9F2] border border-[#EBEAE1] space-y-1.5 text-xs font-mono">
          <div className="flex items-center justify-between text-[10px] text-[#6C706B]">
            <span className="flex items-center gap-1">
              <Fingerprint className="w-3.5 h-3.5 text-[#00B67A]" />
              EXPEDIENTE PÚBLICO CONTRASTADO
            </span>
            <span className="text-[#008B5D] font-bold">100% AUDITADO</span>
          </div>
          <p className="text-xs text-[#454744] font-sans font-medium leading-relaxed pt-1">
            {record.fact_detail}
          </p>
        </div>
      </div>

      {/* External Direct Verification Link */}
      {record.source_url && (
        <div className="pt-2 flex items-center justify-between text-xs">
          <span className="text-[11px] text-gray-500 font-medium">
            Fuente abierta del Estado Mexicano
          </span>

          <a
            href={record.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-bold text-[#2050E6] hover:text-[#1A42C2] hover:underline"
          >
            <span>Consultar registro en {record.source_name.split(' ')[0]}</span>
            <ArrowSquareOut weight="bold" className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}
