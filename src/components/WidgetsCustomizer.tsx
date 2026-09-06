'use client';

import React from 'react';
import Link from 'next/link';
import { Code2, Copy, ExternalLink, Plus, Eye } from 'lucide-react';
import { Business, Widget } from '@/lib/types';
import { createOrUpdateWidgetAction } from '@/lib/merchant-actions';
import { cn } from '@/lib/utils';

interface WidgetsCustomizerProps {
  business: Business;
  existingWidgets: Widget[];
}

const formats = [
  {
    id: 'ribbon',
    name: 'Cinta de prestigio (Micro-Ribbon)',
    description: 'Barra horizontal compacta (~38px) inspirada en Trustpilot. Ideal para el hero o bajo botones principales.',
    height: 38,
  },
  {
    id: 'badge',
    name: 'Sello compacto',
    description: 'Para el encabezado o pie de tu tienda.',
    height: 180,
  },
  {
    id: 'reassurance',
    name: 'Resumen de confianza',
    description: 'Junto a la información de compra.',
    height: 320,
  },
  {
    id: 'card',
    name: 'Tarjeta completa',
    description: 'Para presentar el perfil de tu negocio.',
    height: 500,
  },
] as const;

export function WidgetsCustomizer({ business, existingWidgets }: WidgetsCustomizerProps) {
  const [widgets, setWidgets] = React.useState(existingWidgets);
  const [selectedStyle, setSelectedStyle] = React.useState<'ribbon' | 'badge' | 'reassurance' | 'card'>('ribbon');
  const [selectedTheme, setSelectedTheme] = React.useState<'light' | 'dark' | 'transparent'>('light');
  const [creating, setCreating] = React.useState(false);
  const [feedback, setFeedback] = React.useState('');
  const [error, setError] = React.useState('');

  const currentWidget = widgets.find((widget) => widget.widget_type === selectedStyle && widget.is_active);
  const format = formats.find((item) => item.id === selectedStyle)!;
  const previewPath = currentWidget
    ? `/widget/${selectedStyle}/${encodeURIComponent(currentWidget.token)}?theme=${selectedTheme}`
    : '';

  const embedCode = currentWidget
    ? selectedStyle === 'ribbon'
      ? `<iframe\n  src="https://opinio.mx${previewPath}"\n  title="Calificación y prestigio en Opinio México"\n  width="100%"\n  height="${format.height}"\n  loading="lazy"\n  style="border:0;display:block;max-width:440px;"\n></iframe>`
      : `<iframe\n  src="https://opinio.mx${previewPath}"\n  title="Perfil de confianza en Opinio.mx"\n  width="100%"\n  height="${format.height}"\n  loading="lazy"\n  style="border:0;max-width:480px;"\n></iframe>`
    : '';

  async function createWidget() {
    if (creating) return;
    setCreating(true);
    setError('');
    setFeedback('');
    try {
      const result = await createOrUpdateWidgetAction({
        businessId: business.id,
        widgetType: selectedStyle,
        theme: selectedTheme,
        config: { style: selectedStyle },
      });
      if (result.success && result.widget) {
        setWidgets((previous) => [result.widget!, ...previous]);
        setFeedback('Widget creado. El código de inserción está listo para copiar.');
      } else {
        setError('No se pudo crear el widget. Inténtalo de nuevo.');
      }
    } catch {
      setError('No pudimos conectar. Vuelve a intentar crear el widget.');
    } finally {
      setCreating(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(embedCode);
      setFeedback('Código copiado. Pégalo en un bloque HTML de tu tienda.');
    } catch {
      setError('No se pudo copiar. Selecciona el código y cópialo manualmente.');
    }
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <p role="status" className="rounded-xl border border-op-green-border bg-op-green-soft p-4 text-sm text-op-green-dark">
          {feedback}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-op-danger-soft p-4 text-sm text-op-danger">
          {error}
        </p>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <section className="space-y-6 rounded-2xl border border-op-border bg-op-sheet p-5 md:p-7">
          <div>
            <h2 className="text-xl font-semibold text-op-ink">Sellos y Cintas de Confianza</h2>
            <p className="mt-2 text-sm leading-relaxed text-op-muted">
              Muestra las opiniones verificadas y el índice de {business.brand_name} en tu propia página web.
            </p>
          </div>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-op-ink">1. Elige un formato</legend>
            <div className="space-y-2">
              {formats.map((item) => (
                <label
                  key={item.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                    selectedStyle === item.id
                      ? 'border-op-green bg-op-green-soft'
                      : 'border-op-border hover:bg-op-canvas'
                  )}
                >
                  <input
                    type="radio"
                    name="widget-format"
                    value={item.id}
                    checked={selectedStyle === item.id}
                    onChange={() => {
                      setSelectedStyle(item.id);
                      setFeedback('');
                      setError('');
                    }}
                    className="mt-1 text-op-green focus:ring-op-green"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-op-ink">{item.name}</span>
                    <span className="mt-1 block text-sm text-op-muted">{item.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-op-ink">2. Elige el tema</legend>
            <div className="grid grid-cols-3 gap-3">
              {(['light', 'dark', 'transparent'] as const).map((theme) => (
                <label
                  key={theme}
                  className={cn(
                    'flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold capitalize transition-colors',
                    selectedTheme === theme
                      ? 'border-op-green bg-op-green-soft text-op-green-dark'
                      : 'border-op-border text-op-secondary hover:bg-op-canvas'
                  )}
                >
                  <input
                    type="radio"
                    name="widget-theme"
                    value={theme}
                    checked={selectedTheme === theme}
                    onChange={() => setSelectedTheme(theme)}
                    className="text-op-green focus:ring-op-green"
                  />
                  {theme === 'light' ? 'Claro' : theme === 'dark' ? 'Oscuro' : 'Transparente'}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="border-t border-op-border pt-5">
            <button
              type="button"
              onClick={createWidget}
              disabled={creating}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-op-green px-4 text-sm font-semibold text-white hover:bg-op-green-dark disabled:opacity-60 transition-colors"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {creating
                ? 'Creando widget…'
                : currentWidget
                ? 'Regenerar token de este formato'
                : 'Crear widget'}
            </button>
            <p className="mt-3 text-xs leading-relaxed text-op-muted">
              El widget enlaza al pasaporte público oficial en Opinio México. Su información se actualiza automáticamente con cada reseña verificada.
            </p>
          </div>
        </section>

        <div className="min-w-0 space-y-6">
          <section className="overflow-hidden rounded-2xl border border-op-border bg-op-sheet p-5 md:p-7">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-op-ink">
              <Eye className="h-5 w-5 text-op-green" aria-hidden="true" /> Vista previa en vivo
            </h2>
            {currentWidget ? (
              <>
                <div
                  className={cn(
                    'overflow-hidden rounded-xl border p-4 flex items-center justify-center transition-colors',
                    selectedTheme === 'dark'
                      ? 'bg-slate-900 border-slate-700'
                      : selectedTheme === 'transparent'
                      ? 'bg-slate-800/80 border-slate-700'
                      : 'bg-op-canvas border-op-border'
                  )}
                >
                  <iframe
                    key={previewPath}
                    src={previewPath}
                    title={`Vista previa del widget de ${business.brand_name}`}
                    className="w-full border-0"
                    height={format.height}
                  />
                </div>
                <Link
                  href={previewPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-op-green-dark hover:underline"
                >
                  Abrir vista previa en pestaña nueva <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">(nueva pestaña)</span>
                </Link>
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-op-strong bg-op-canvas px-5 py-12 text-center">
                <Code2 className="mx-auto mb-3 h-8 w-8 text-op-muted" aria-hidden="true" />
                <h3 className="text-base font-semibold text-op-ink">Tu primer {format.name.toLowerCase()}</h3>
                <p className="mt-2 text-sm leading-relaxed text-op-muted">
                  Crea este formato para ver el widget con los datos de tu negocio y obtener su código.
                </p>
              </div>
            )}
          </section>

          {currentWidget && (
            <section className="rounded-2xl border border-op-border bg-op-sheet p-5 md:p-7">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-op-ink">3. Inserta el widget en tu sitio</h2>
                <button
                  type="button"
                  onClick={copyCode}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-op-border px-3 text-sm font-semibold text-op-green-dark hover:bg-op-green-soft transition-colors"
                >
                  <Copy className="h-4 w-4" aria-hidden="true" /> Copiar código
                </button>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-op-muted">
                Pega este iframe en el HTML de tu cabecera, hero o pie de página. También es compatible con React / Next.js.
              </p>
              <textarea
                aria-label="Código HTML para insertar el widget"
                readOnly
                value={embedCode}
                onFocus={(event) => event.target.select()}
                rows={7}
                className="w-full resize-y rounded-xl border border-op-border bg-op-canvas p-4 font-mono text-xs leading-relaxed text-op-ink focus:outline-none"
              />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
