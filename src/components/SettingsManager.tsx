'use client';

import React from 'react';
import {
  Building2,
  CheckCircle2,
  Save,
  ShieldCheck,
  Lock,
  Users,
} from 'lucide-react';
import { Business, BusinessIdentity, OfficialRecord } from '@/lib/types';
import { updateBusinessSettingsAction } from '@/lib/merchant-actions';

interface SettingsManagerProps {
  business: Business;
  identities?: BusinessIdentity[];
  officialRecords?: OfficialRecord[];
}

export function SettingsManager({ business, identities: passedIdentities }: SettingsManagerProps) {

  const [legalName, setLegalName] = React.useState(business.legal_name || '');
  const [rfc, setRfc] = React.useState(business.rfc || '');
  const [clee, setClee] = React.useState(business.clee || '');
  const [phone, setPhone] = React.useState(business.phone || '');
  const [whatsapp, setWhatsapp] = React.useState(business.whatsapp || '');
  const [domain, setDomain] = React.useState(business.domain || '');
  const [operatingArea, setOperatingArea] = React.useState(business.operating_area || 'Nacional (México)');
  const [saving, setSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    const formData = new FormData();
    formData.append('business_id', String(business.id));
    formData.append('legal_name', legalName);
    formData.append('rfc', rfc);
    formData.append('clee', clee);
    formData.append('phone', phone);
    formData.append('whatsapp', whatsapp);
    formData.append('domain', domain);
    formData.append('operating_area', operatingArea);

    try {
      const res = await updateBusinessSettingsAction(formData);
      if (res.success) setSaveSuccess(true);
      else setSaveError('No se pudieron guardar los cambios. Revisa los datos e inténtalo de nuevo.');
    } catch {
      setSaveError('No pudimos conectar. Conservamos tus cambios para que vuelvas a intentarlo.');
    } finally {
      setSaving(false);
    }
  };

  const identities = passedIdentities || [];

  return (
    <div className="space-y-8">
      {saveError && <p role="alert" className="rounded-xl bg-op-danger-soft p-4 text-sm text-op-danger">{saveError}</p>}
      {/* Alert */}
      {saveSuccess && (
        <div role="status" className="p-4 rounded-xl bg-op-green-soft border border-op-green-border text-op-green-dark text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="h-4 w-4 text-op-green-dark shrink-0" />
          <span>Información comercial y fiscal actualizada con éxito.</span>
        </div>
      )}

      {/* 2-Column: Identity Verification Form & Verified Registries */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Identity Form (7 cols) */}
        <div className="lg:col-span-7 p-6 md:p-8 rounded-2xl bg-white border border-op-border shadow-xs space-y-6">
          <div className="border-b border-op-border pb-4">
            <h3 className="text-base font-bold text-op-ink flex items-center gap-2">
              <Building2 className="h-4 w-4 text-op-green-dark" />
              <span>Pilar 1: Identidad Legal y Validación Oficial</span>
            </h3>
            <p className="text-xs text-op-muted mt-1">
              Datos comerciales registrados de{' '}
              <strong className="text-op-ink">{business.brand_name}</strong>. Guardarlos no constituye una nueva verificación oficial.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            {/* Legal Name */}
            <div>
              <label htmlFor="settings-legal-name" className="block font-medium text-op-ink mb-1">
                Razón Social Oficial (Denominación Social ante SAT)
              </label>
              <input
                type="text"
                required
                id="settings-legal-name"
                  value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Ej. Comercializadora Zebrands S.A. de C.V."
                className="w-full px-3.5 py-2.5 rounded-xl bg-op-canvas border border-op-border text-base text-op-ink focus:outline-none focus:border-op-green-border"
              />
            </div>

            {/* RFC with status */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="settings-rfc" className="block font-medium text-op-ink">
                  Registro Federal de Contribuyentes (RFC)
                </label>

              </div>
              <input
                type="text"
                required
                id="settings-rfc"
                  maxLength={13}
                pattern="[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}"
                title="RFC de 12 o 13 caracteres: letras, fecha y homoclave"
                value={rfc}
                onChange={(e) => setRfc(e.target.value.toUpperCase())}
                placeholder="CZE150414AB2"
                className="w-full px-3.5 py-2.5 rounded-xl bg-op-canvas border border-op-border text-base text-op-ink font-mono uppercase focus:outline-none focus:border-op-green-border"
              />
            </div>

            {/* INEGI CLEE with Search Button */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="settings-clee" className="block font-medium text-op-ink">
                  Código de Identificación CLEE (INEGI DENUE)
                </label>

              </div>
              <input
                type="text"
                id="settings-clee"
                  value={clee}
                onChange={(e) => setClee(e.target.value)}
                placeholder="0901547891234001"
                className="w-full px-3.5 py-2.5 rounded-xl bg-op-canvas border border-op-border text-base text-op-ink font-mono focus:outline-none focus:border-op-green-border"
              />

            </div>

            {/* WhatsApp & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="settings-whatsapp" className="block font-medium text-op-ink mb-1">
                  WhatsApp Oficial (+52)
                </label>
                <input
                  type="tel" autoComplete="tel"
                  id="settings-whatsapp"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+52 55 4164 0533"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-op-canvas border border-op-border text-base text-op-ink focus:outline-none focus:border-op-green-border"
                />
              </div>

              <div>
                <label htmlFor="settings-phone" className="block font-medium text-op-ink mb-1">
                  Teléfono de Atención
                </label>
                <input
                  type="tel" autoComplete="tel"
                  id="settings-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+52 55 4164 0533"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-op-canvas border border-op-border text-base text-op-ink focus:outline-none focus:border-op-green-border"
                />
              </div>
            </div>

            {/* Domain & Operating Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="settings-domain" className="block font-medium text-op-ink mb-1">
                  Dominio Web Oficial
                </label>
                <input
                  type="text"
                  id="settings-domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="luuna.mx"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-op-canvas border border-op-border text-base text-op-ink focus:outline-none focus:border-op-green-border"
                />
              </div>

              <div>
                <label htmlFor="settings-area" className="block font-medium text-op-ink mb-1">
                  Área de Cobertura Operativa
                </label>
                <select
                  id="settings-area"
                  value={operatingArea}
                  onChange={(e) => setOperatingArea(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-op-canvas border border-op-border text-base text-op-ink focus:outline-none focus:border-op-green-border"
                >
                  <option value="Nacional (México)">Nacional (Toda la República Mexicana)</option>
                  <option value="CDMX y Área Metropolitana">CDMX y Área Metropolitana</option>
                  <option value="Jalisco y Zona Occidente">Jalisco y Zona Occidente</option>
                  <option value="Nuevo León y Zona Norte">Nuevo León y Zona Norte</option>
                  <option value="Península de Yucatán">Península de Yucatán</option>
                </select>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-op-green hover:bg-op-green text-white shadow-xs transition-all flex items-center justify-center gap-2"
              >
                {saving ? (
                  <span>Guardando cambios...</span>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Actualizar Identidad Comercial</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Identities Status & Mexican Privacy Notice (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Identity Verification Cards */}
          <div className="p-6 rounded-2xl bg-white border border-op-border shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-op-green-dark" />
              <h3 className="font-semibold text-xs text-op-ink uppercase tracking-wider">
                Sellos de Verificación Emitidos
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              {identities.length === 0 && <p className="text-sm text-op-muted">No hay verificaciones registradas para este negocio.</p>}
              {identities.map((idnt) => (
                <div
                  key={idnt.id}
                  className="p-3 rounded-xl bg-op-canvas border border-op-border flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-op-ink uppercase text-xs tracking-wider">
                      {idnt.type === 'rfc'
                        ? 'SAT Cédula Fiscal'
                        : idnt.type === 'denue'
                        ? 'INEGI DENUE'
                        : idnt.type === 'whatsapp'
                        ? 'Meta WhatsApp Business'
                        : idnt.type === 'domain'
                        ? 'DNS TXT Propietario'
                        : idnt.type}
                    </div>
                    <div className="font-mono text-op-muted text-xs truncate max-w-[200px]">
                      {idnt.identifier}
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-op-secondary bg-op-shaded px-2 py-1 rounded border border-op-border flex items-center gap-1">
                    {idnt.status === 'verified' ? 'Verificado' : idnt.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mexican LFPDPPP Privacy Safeguard Notice */}
          <div className="p-5 rounded-2xl bg-op-canvas border border-op-border space-y-2 text-xs">
            <div className="text-op-ink font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4 text-op-green-dark" />
              <span>Datos del perfil público</span>
            </div>
            <p className="text-xs text-op-muted leading-relaxed">
              Usa los datos de contacto de tu negocio. No incluyas contraseñas, datos bancarios ni información personal de tus clientes en estos campos.
            </p>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-op-border bg-op-sheet p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-op-ink"><Users className="h-5 w-5 text-op-green" aria-hidden="true" /> Equipo y permisos</h2>
        <p className="mt-2 text-sm leading-relaxed text-op-muted">La gestión de colaboradores todavía no está disponible en este panel. No se pueden enviar invitaciones ni conceder permisos desde aquí.</p>
      </section>
    </div>
  );
}
