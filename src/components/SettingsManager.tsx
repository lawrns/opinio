'use client';

import React from 'react';
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Search,
  Phone,
  MessageSquare,
  Globe,
  Users,
  Lock,
  Plus,
  Save,
  Check,
  ExternalLink,
} from 'lucide-react';
import { Business, BusinessIdentity, OfficialRecord } from '@/lib/types';
import { updateBusinessSettingsAction } from '@/lib/merchant-actions';
import { cn } from '@/lib/utils';

interface SettingsManagerProps {
  business: Business;
  identities: BusinessIdentity[];
  officialRecords: OfficialRecord[];
}

export function SettingsManager({
  business,
  identities,
  officialRecords,
}: SettingsManagerProps) {
  const [legalName, setLegalName] = React.useState(business.legal_name || '');
  const [rfc, setRfc] = React.useState(business.rfc || '');
  const [clee, setClee] = React.useState(business.clee || '');
  const [whatsapp, setWhatsapp] = React.useState(business.whatsapp || '');
  const [phone, setPhone] = React.useState(business.phone || '');
  const [domain, setDomain] = React.useState(business.domain || '');
  const [operatingArea, setOperatingArea] = React.useState(business.operating_area || 'Nacional (México)');

  const [saving, setSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ success: boolean; error?: string } | null>(null);

  // INEGI DENUE Search simulation
  const [denueSearching, setDenueSearching] = React.useState(false);
  const [denueFound, setDenueFound] = React.useState<string | null>(null);

  // Staff state
  const [staff, setStaff] = React.useState([
    { id: 1, name: 'Administrador Principal', email: 'admin@' + (business.domain || 'comercio.mx'), role: 'Propietario / Admin', status: 'Activo', lastLogin: 'Hoy, 09:30 AM' },
    { id: 2, name: 'Coordinador de Resolución', email: 'resolucion@' + (business.domain || 'comercio.mx'), role: 'Conciliador SLA', status: 'Activo', lastLogin: 'Ayer, 16:45 PM' },
    { id: 3, name: 'Soporte y Reembolsos', email: 'soporte@' + (business.domain || 'comercio.mx'), role: 'Atención al Cliente', status: 'Activo', lastLogin: '2 Sep, 11:15 AM' },
  ]);
  const [showAddStaff, setShowAddStaff] = React.useState(false);
  const [newStaffName, setNewStaffName] = React.useState('');
  const [newStaffEmail, setNewStaffEmail] = React.useState('');
  const [newStaffRole, setNewStaffRole] = React.useState('Conciliador SLA');

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const formData = new FormData();
    formData.append('business_id', String(business.id));
    formData.append('legal_name', legalName);
    formData.append('rfc', rfc);
    formData.append('clee', clee);
    formData.append('whatsapp', whatsapp);
    formData.append('phone', phone);
    formData.append('domain', domain);
    formData.append('operating_area', operatingArea);

    const res = await updateBusinessSettingsAction(formData);
    setSaving(false);
    setFeedback(res);

    if (res.success) {
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleSearchDenue = () => {
    setDenueSearching(true);
    setDenueFound(null);
    setTimeout(() => {
      setDenueSearching(false);
      setDenueFound(`CLEE validado en INEGI DENUE: Establecimiento activo en sector ${business.category}`);
      if (!clee) {
        setClee('0901547891234001');
      }
    }, 1200);
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim()) return;

    setStaff((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: newStaffName.trim(),
        email: newStaffEmail.trim(),
        role: newStaffRole,
        status: 'Activo',
        lastLogin: 'Pendiente de activación',
      },
    ]);
    setNewStaffName('');
    setNewStaffEmail('');
    setShowAddStaff(false);
  };

  return (
    <div className="space-y-8">
      {/* Feedback banner */}
      {feedback?.success && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>Configuración e identidad comercial actualizadas correctamente en la base de datos de Opinio.</span>
        </div>
      )}

      {feedback?.error && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{feedback.error}</span>
        </div>
      )}

      {/* 2-Column: Identity Verification Form & Verified Registries */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Identity Form (7 cols) */}
        <div className="lg:col-span-7 p-6 md:p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-6">
          <div className="border-b border-zinc-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-400" />
              <span>Pilar 1: Identidad Legal y Validación Oficial</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Información oficial que respalda la existencia jurídica de{' '}
              <strong className="text-zinc-200">{business.brand_name}</strong> ante el SAT, INEGI y PROFECO.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            {/* Legal Name */}
            <div>
              <label className="block font-medium text-zinc-300 mb-1">
                Razón Social Oficial (Denominación Social ante SAT)
              </label>
              <input
                type="text"
                required
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Ej. Comercializadora Zebrands S.A. de C.V."
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* RFC with status */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-medium text-zinc-300">
                  Registro Federal de Contribuyentes (RFC)
                </label>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Cédula Fiscal Validada
                </span>
              </div>
              <input
                type="text"
                required
                value={rfc}
                onChange={(e) => setRfc(e.target.value.toUpperCase())}
                placeholder="CZE150414AB2"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* INEGI CLEE with Search Button */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-medium text-zinc-300">
                  Código de Identificación CLEE (INEGI DENUE)
                </label>
                <button
                  type="button"
                  onClick={handleSearchDenue}
                  disabled={denueSearching}
                  className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <Search className="h-3 w-3" />
                  <span>{denueSearching ? 'Consultando INEGI...' : 'Buscar en Catálogo DENUE'}</span>
                </button>
              </div>
              <input
                type="text"
                value={clee}
                onChange={(e) => setClee(e.target.value)}
                placeholder="0901547891234001"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              {denueFound && (
                <div className="mt-1.5 p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-[10px] text-emerald-300 flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span>{denueFound}</span>
                </div>
              )}
            </div>

            {/* WhatsApp & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-zinc-300 mb-1">
                  WhatsApp Oficial (+52)
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+52 55 4164 0533"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-300 mb-1">
                  Teléfono de Atención
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+52 55 4164 0533"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Domain & Operating Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-zinc-300 mb-1">
                  Dominio Web Oficial
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="luuna.mx"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-300 mb-1">
                  Área de Cobertura Operativa
                </label>
                <select
                  value={operatingArea}
                  onChange={(e) => setOperatingArea(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-500"
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
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-all flex items-center justify-center gap-2"
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
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <h3 className="font-semibold text-xs text-white uppercase tracking-wider">
                Sellos de Verificación Emitidos
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              {identities.map((idnt) => (
                <div
                  key={idnt.id}
                  className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-zinc-200 uppercase text-[10px] tracking-wider">
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
                    <div className="font-mono text-zinc-400 text-[11px] truncate max-w-[200px]">
                      {idnt.identifier}
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800/80 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Validado
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Mexican LFPDPPP Privacy Safeguard Notice */}
          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-2 text-xs">
            <div className="text-zinc-200 font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-400" />
              <span>Protección de Datos Personales (LFPDPPP)</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              De acuerdo con la legislación mexicana, si tu comercio opera como Persona Física con Actividad Empresarial, Opinio encripta y protege tu CURP y domicilio personal. En el Pasaporte Público solo se exhiben los datos fiscales comerciales para salvaguardar tu privacidad.
            </p>
          </div>
        </div>
      </div>

      {/* Staff & Role Permissions Management */}
      <div className="p-6 md:p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              <span>Equipo Autorizado y Permisos</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Colaboradores con acceso a la Bandeja de Resolución y respuestas oficiales en Opinio.mx.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddStaff(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Invitar Colaborador</span>
          </button>
        </div>

        {/* Add Staff Inline Form */}
        {showAddStaff && (
          <form
            onSubmit={handleAddStaff}
            className="p-4 rounded-xl bg-zinc-950 border border-emerald-500/40 space-y-3 text-xs animate-in fade-in duration-100"
          >
            <div className="font-semibold text-white">Agregar Nuevo Miembro al Equipo</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                required
                placeholder="Nombre completo"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
              />
              <input
                type="email"
                required
                placeholder="correo@comercio.mx"
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
                className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
              />
              <select
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value)}
                className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white"
              >
                <option value="Conciliador SLA">Conciliador SLA (Resuelve casos)</option>
                <option value="Atención al Cliente">Atención al Cliente (Responde opiniones)</option>
                <option value="Desarrollador API">Desarrollador API (Gestiona webhooks)</option>
                <option value="Administrador">Administrador</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddStaff(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                Registrar Colaborador
              </button>
            </div>
          </form>
        )}

        {/* Staff Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Colaborador</th>
                <th className="py-2.5 px-3">Correo</th>
                <th className="py-2.5 px-3">Rol</th>
                <th className="py-2.5 px-3">Último Acceso</th>
                <th className="py-2.5 px-3">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-zinc-200">
                    {member.name}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-zinc-400 text-[11px]">
                    {member.email}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300">
                      {member.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-zinc-400 text-[11px]">
                    {member.lastLogin}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> {member.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
