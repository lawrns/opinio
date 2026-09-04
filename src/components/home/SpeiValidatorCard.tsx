'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Bank, 
  WhatsappLogo, 
  CheckCircle, 
  WarningCircle, 
  ArrowRight,
  MagnifyingGlass,
  LockKey
} from '@phosphor-icons/react';

// Mexican ABM Bank code directory
const ABM_BANKS: Record<string, string> = {
  '002': 'Citibanamex',
  '012': 'BBVA México',
  '014': 'Santander México',
  '021': 'HSBC México',
  '044': 'Scotiabank México',
  '058': 'Banregio',
  '072': 'Banorte',
  '127': 'Banco Azteca',
  '137': 'BanCoppel',
  '646': 'STP (Sistema de Transferencias y Pagos)',
  '638': 'Nu México Financiera',
  '684': 'Mercado Pago Wallet',
  '042': 'Mifel',
  '036': 'Inbursa',
  '138': 'ABC Capital',
};

// Known verified businesses for simulation match
const VERIFIED_DIRECTORY = [
  { term: '012180001547891234', brand: 'Luuna', legal: 'Comercializadora Zebrands S.A. de C.V.', rfc: 'CZE150414AB2', slug: 'luuna', score: 81.7 },
  { term: '002180015058472910', brand: 'doto.com.mx', legal: 'Doto S.A. de C.V.', rfc: 'DOT160912KP9', slug: 'doto', score: 83.4 },
  { term: '072180019039482910', brand: 'Ahal BioCosmética', legal: 'Ahal Laboratorios México S.A.P.I. de C.V.', rfc: 'ALM180220TR1', slug: 'ahal-cosmetica', score: 83.8 },
  { term: '014180014039281920', brand: 'Xaman Joyería', legal: 'Xaman Diseños Artesanales S.A. de C.V.', rfc: 'XDA210615MN4', slug: 'xaman-joyeria', score: 83.9 },
  { term: '+525541640533', brand: 'Luuna', legal: 'Comercializadora Zebrands S.A. de C.V.', rfc: 'CZE150414AB2', slug: 'luuna', score: 81.7 },
  { term: '+525585262626', brand: 'doto.com.mx', legal: 'Doto S.A. de C.V.', rfc: 'DOT160912KP9', slug: 'doto', score: 83.4 },
  { term: '+528112345678', brand: 'Ahal BioCosmética', legal: 'Ahal Laboratorios México S.A.P.I. de C.V.', rfc: 'ALM180220TR1', slug: 'ahal-cosmetica', score: 83.8 },
];

export function SpeiValidatorCard() {
  const [inputValue, setInputValue] = useState('');
  const [detectedType, setDetectedType] = useState<'clabe' | 'whatsapp' | 'other' | null>(null);
  const [bankName, setBankName] = useState<string | null>(null);
  const [matchedStore, setMatchedStore] = useState<typeof VERIFIED_DIRECTORY[0] | null>(null);
  const [isUnknownBank, setIsUnknownBank] = useState(false);

  const cleanInput = inputValue.trim().replace(/[\s-]/g, '');

  const handleInputChange = (val: string) => {
    setInputValue(val);
    const clean = val.trim().replace(/[\s-]/g, '');

    if (!clean) {
      setDetectedType(null);
      setBankName(null);
      setMatchedStore(null);
      setIsUnknownBank(false);
      return;
    }

    // Check CLABE (18 digits)
    if (/^\d{3,18}$/.test(clean)) {
      setDetectedType('clabe');
      const bankCode = clean.slice(0, 3);
      const foundBank = ABM_BANKS[bankCode];
      setBankName(foundBank || (clean.length >= 3 ? 'Banco Nacional' : null));
      setIsUnknownBank(!foundBank && clean.length >= 3);

      const store = VERIFIED_DIRECTORY.find((s) => s.term === clean || clean.startsWith(s.term.slice(0, 10)));
      setMatchedStore(store || null);
      return;
    }

    // Check WhatsApp Phone (+52)
    if (clean.startsWith('+52') || clean.startsWith('52') || /^\d{10}$/.test(clean)) {
      setDetectedType('whatsapp');
      setBankName(null);
      setIsUnknownBank(false);
      const normalizedPhone = clean.startsWith('+') ? clean : clean.startsWith('52') ? `+${clean}` : `+52${clean}`;
      const store = VERIFIED_DIRECTORY.find((s) => s.term === normalizedPhone);
      setMatchedStore(store || null);
      return;
    }

    setDetectedType('other');
    setBankName(null);
    setMatchedStore(null);
    setIsUnknownBank(false);
  };

  const handleQuickFill = (val: string) => {
    handleInputChange(val);
  };

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-[#FBF5EA] border border-[#F0E6D2] shadow-xs space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#EBDDC5] pb-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#F3E5CD] text-[#78350F] border border-[#E6D0AC]">
            <ShieldCheck weight="bold" className="w-3.5 h-3.5" />
            <span>Herramienta Ciudadana de Prevención SPEI</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-[#121511] tracking-tight">
            Verifica antes de transferir por SPEI o WhatsApp
          </h3>
          <p className="text-xs sm:text-sm text-gray-700 font-medium">
            Pega una cuenta CLABE de 18 dígitos o un número de WhatsApp para comprobar en vivo si el beneficiario tiene razón social validada ante el SAT.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2 text-xs">
          <span className="font-mono text-[#78350F] font-bold bg-white/80 px-3 py-1 rounded-full border border-[#E6D0AC]">
            Algoritmo Banxico CEP
          </span>
        </div>
      </div>

      {/* Input Box with Realtime Decoder */}
      <div className="space-y-3">
        <div className="relative flex items-center bg-white rounded-2xl border border-gray-200 shadow-2xs focus-within:border-[#00B67A] focus-within:ring-2 focus-within:ring-[#00B67A]/20 transition-all p-1.5">
          <div className="pl-3.5 text-gray-400">
            {detectedType === 'clabe' ? (
              <Bank weight="bold" className="w-5 h-5 text-[#2050E6]" />
            ) : detectedType === 'whatsapp' ? (
              <WhatsappLogo weight="bold" className="w-5 h-5 text-[#00B67A]" />
            ) : (
              <MagnifyingGlass weight="bold" className="w-5 h-5 text-gray-400" />
            )}
          </div>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Pega aquí cuenta CLABE (18 dígitos) o WhatsApp (+52 55...)"
            className="w-full bg-transparent px-3.5 py-2.5 text-xs sm:text-sm text-[#121511] placeholder-gray-400 focus:outline-none font-mono font-medium"
          />

          {inputValue && (
            <button
              type="button"
              onClick={() => handleInputChange('')}
              className="mr-2 text-xs font-semibold text-gray-400 hover:text-gray-700 bg-gray-100 px-2 py-1 rounded-lg"
            >
              Borrar
            </button>
          )}
        </div>

        {/* Quick Example Triggers */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-gray-500 font-medium text-[11px]">Probar ejemplos reales:</span>
          <button
            type="button"
            onClick={() => handleQuickFill('012180001547891234')}
            className="px-2.5 py-0.5 rounded-lg bg-white border border-[#E5E7EB] hover:border-gray-300 font-mono text-[11px] text-gray-700"
          >
            CLABE BBVA (Luuna)
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('002180015058472910')}
            className="px-2.5 py-0.5 rounded-lg bg-white border border-[#E5E7EB] hover:border-gray-300 font-mono text-[11px] text-gray-700"
          >
            CLABE Banamex (doto)
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('+525541640533')}
            className="px-2.5 py-0.5 rounded-lg bg-white border border-[#E5E7EB] hover:border-gray-300 font-mono text-[11px] text-gray-700"
          >
            WhatsApp (+52 55...)
          </button>
        </div>
      </div>

      {/* Realtime Live Analysis Result Strip */}
      <AnimatePresence>
        {cleanInput.length >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-4 rounded-2xl bg-white border border-[#EBDDC5] shadow-xs space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#121511]">Diagnóstico de Transmisión:</span>
                {bankName && (
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    Banco Emisor: {bankName}
                  </span>
                )}
              </div>

              {matchedStore ? (
                <span className="inline-flex items-center gap-1 font-bold text-[11px] text-[#008B5D] bg-[#E6F8F2] px-2.5 py-0.5 rounded-full border border-[#B3ECD9]">
                  <CheckCircle weight="fill" className="w-3.5 h-3.5" />
                  Beneficiario Identificado en Opinio
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-bold text-[11px] text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300">
                  <WarningCircle weight="bold" className="w-3.5 h-3.5" />
                  Cuenta No Registrada en Opinio
                </span>
              )}
            </div>

            {matchedStore ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-1">
                <div>
                  <div className="font-bold text-[#121511] text-sm flex items-center gap-1.5">
                    <span>{matchedStore.brand}</span>
                    <span className="font-normal text-gray-500 font-mono text-xs">({matchedStore.legal})</span>
                  </div>
                  <div className="text-gray-600 font-mono text-[11px] mt-0.5">
                    RFC: <strong className="text-[#121511]">{matchedStore.rfc}</strong> • Opinio Score: <strong className="text-[#008B5D]">{matchedStore.score}</strong>/100
                  </div>
                </div>

                <Link
                  href={`/b/${matchedStore.slug}`}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-[#121511] text-white font-bold text-xs hover:bg-black transition-colors shrink-0"
                >
                  <span>Ver Pasaporte y Registro SAT</span>
                  <ArrowRight weight="bold" className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="text-xs text-gray-600 space-y-1 pt-1">
                <p>
                  Esta cuenta o número no coincide con ninguno de los comercios verificados con conexión de órdenes en Opinio.
                </p>
                <div className="text-[11px] text-[#78350F] flex items-center gap-1 font-medium">
                  <LockKey weight="bold" className="w-3.5 h-3.5 text-amber-700" />
                  <span>Recomendación: Solicita su RFC de 12 o 13 dígitos y pide una pasarela de pago protegida antes de transferir.</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
