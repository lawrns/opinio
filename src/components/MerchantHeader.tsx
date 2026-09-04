'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Bell,
  ShieldCheck,
  ExternalLink,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { Business, ResolutionCase } from '@/lib/types';
import { cn } from '@/lib/utils';

interface MerchantHeaderProps {
  currentBusiness: Business;
  pendingCases?: ResolutionCase[];
}

export function MerchantHeader({
  currentBusiness,
  pendingCases = [],
}: MerchantHeaderProps) {
  const searchParams = useSearchParams();
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const notificationRef = React.useRef<HTMLDivElement>(null);

  const businessParam = searchParams.get('business') || currentBusiness.slug;

  // Close notifications on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const urgentCases = pendingCases.filter(
    (c) => c.status === 'opened' || c.status === 'reopened'
  );

  return (
    <header className="h-16 border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-6">
      {/* Left: Quick Status Banner */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-[#0F172A]">
            {currentBusiness.brand_name}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#059669]" />
            Score: <strong className="font-mono text-[#0F172A]">{currentBusiness.trust_score}</strong>/100
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-[#64748B] border-l border-[#E2E8F0] pl-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#059669]" />
            Cobertura:{' '}
            <strong className="text-[#0F172A] font-mono">
              {currentBusiness.coverage_percentage}%
            </strong>
          </span>
          <span className="text-[#CBD5E1]">•</span>
          <span>RFC: <strong className="text-[#334155]">{currentBusiness.rfc || 'Validado SAT'}</strong></span>
        </div>
      </div>

      {/* Right: Actions, Notifications, Profile */}
      <div className="flex items-center gap-3">
        {/* Quick Invite CTA */}
        <Link
          href={`/merchant/requests?business=${encodeURIComponent(businessParam)}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all active:scale-[0.98]"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Invitar Clientes</span>
        </Link>

        {/* Public passport shortcut */}
        <Link
          href={`/b/${currentBusiness.slug}`}
          target="_blank"
          title="Abrir Pasaporte Público en nueva pestaña"
          className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#334155] hover:text-[#0F172A] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] transition-colors"
        >
          <span>Pasaporte</span>
          <ExternalLink className="h-3 w-3" />
        </Link>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className={cn(
              "relative p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] transition-colors",
              notificationsOpen && "bg-[#F1F5F9] text-[#0F172A]"
            )}
            title="Notificaciones y Casos SLA"
          >
            <Bell className="h-4 w-4" />
            {urgentCases.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
                {urgentCases.length}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white border border-[#E2E8F0] shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="p-3 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-semibold text-[#0F172A]">
                    Casos de Resolución Activos
                  </span>
                </div>
                <span className="text-[10px] text-[#64748B]">
                  {urgentCases.length} urgente(s)
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[#E2E8F0]">
                {pendingCases.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#64748B]">
                    <CheckCircle2 className="h-6 w-6 text-[#059669] mx-auto mb-1.5 opacity-80" />
                    ¡Al día! No tienes casos de inconformidad pendientes.
                  </div>
                ) : (
                  pendingCases.slice(0, 5).map((c) => (
                    <Link
                      key={c.id}
                      href={`/merchant/inbox?business=${encodeURIComponent(businessParam)}`}
                      onClick={() => setNotificationsOpen(false)}
                      className="block p-3 hover:bg-[#F8FAFC] transition-colors group"
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-mono text-[#059669] font-semibold">
                          {c.case_number}
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="h-3 w-3" />
                          SLA &lt; 24h
                        </span>
                      </div>
                      <div className="text-xs font-medium text-[#0F172A] line-clamp-1 group-hover:text-[#059669] transition-colors">
                        {c.customer_name} • {c.issue_category}
                      </div>
                      <div className="text-[11px] text-[#64748B] mt-1 line-clamp-1">
                        Remedio solicitado: {c.customer_requested_remedy}
                      </div>
                    </Link>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-[#E2E8F0] bg-[#F8FAFC]">
                <Link
                  href={`/merchant/inbox?business=${encodeURIComponent(businessParam)}`}
                  onClick={() => setNotificationsOpen(false)}
                  className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-[#334155] hover:text-[#0F172A] font-medium hover:bg-[#E2E8F0] rounded transition-colors"
                >
                  <span>Ir a Bandeja de Resolución completa</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Staff User Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#E2E8F0]">
          <div className="h-8 w-8 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-xs font-bold text-[#0F172A]">
            🇲🇽
          </div>
          <div className="hidden lg:block text-left text-xs">
            <div className="font-medium text-[#0F172A] leading-none">
              Comercio Admin
            </div>
            <div className="text-[10px] text-[#64748B] leading-none mt-1">
              Verificado SAT
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
