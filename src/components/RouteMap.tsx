import React, { useState } from 'react';
import { CalendarEvent } from '../types';
import { VisitStatusBadge } from './VisitStatusButtons';
import {
  MapPin,
  Navigation,
  ArrowRight,
  ExternalLink,
  Clock,
  Layers,
  ChevronUp,
  ChevronDown,
  Sparkles,
  CheckCircle,
  Map,
  Compass,
  CheckSquare,
  Square,
  Copy,
  Check
} from 'lucide-react';

interface RouteMapProps {
  events: CalendarEvent[];
  selectedDate: string;
}

export const RouteMap: React.FC<RouteMapProps> = ({ events, selectedDate }) => {
  // Order of events for the route
  const [routeEvents, setRouteEvents] = useState<CalendarEvent[]>(() => {
    return [...events].filter((e) => (e.date ? e.date === selectedDate : true) && e.address && e.address !== 'Sem endereço cadastrado');
  });

  // Track selected events for inclusion in the route
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const valid = events.filter((e) => (e.date ? e.date === selectedDate : true) && e.address && e.address !== 'Sem endereço cadastrado');
    return new Set(valid.map((e) => e.id));
  });

  const [copied, setCopied] = useState(false);

  // Re-sync when events or selectedDate changes
  React.useEffect(() => {
    const valid = events.filter((e) => (e.date ? e.date === selectedDate : true) && e.address && e.address !== 'Sem endereço cadastrado');
    setRouteEvents(valid);
    setSelectedIds(new Set(valid.map((e) => e.id)));
  }, [events, selectedDate]);

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    const updated = [...routeEvents];
    const temp = updated[idx];
    updated[idx] = updated[idx - 1];
    updated[idx - 1] = temp;
    setRouteEvents(updated);
  };

  const moveDown = (idx: number) => {
    if (idx >= routeEvents.length - 1) return;
    const updated = [...routeEvents];
    const temp = updated[idx];
    updated[idx] = updated[idx + 1];
    updated[idx + 1] = temp;
    setRouteEvents(updated);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(routeEvents.map((e) => e.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Get active selected events in their current ordered sequence
  const activeEvents = routeEvents.filter((e) => selectedIds.has(e.id));

  // Generate Google Maps Directions URL
  const generateGoogleMapsRouteUrl = () => {
    if (activeEvents.length === 0) return '#';

    // Clean address list in the specified order
    const addresses = activeEvents.map((ev) => ev.address.trim());

    if (addresses.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addresses[0])}`;
    }

    // Google Maps multi-stop path format:
    // https://www.google.com/maps/dir/Stop1/Stop2/Stop3/Stop4
    // This format natively opens all stops in order on Desktop, Android, and iOS Google Maps apps.
    const encodedPath = addresses.map((addr) => encodeURIComponent(addr)).join('/');
    return `https://www.google.com/maps/dir/${encodedPath}`;
  };

  // Alternative query parameter URL format (with properly encoded %7C waypoints)
  const generateGoogleMapsQueryUrl = () => {
    if (activeEvents.length === 0) return '#';

    const addresses = activeEvents.map((ev) => ev.address.trim());
    const origin = encodeURIComponent(addresses[0]);

    if (addresses.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${origin}`;
    }

    const destination = encodeURIComponent(addresses[addresses.length - 1]);
    const waypointsArray = addresses.slice(1, -1);

    if (waypointsArray.length > 0) {
      // CRITICAL FIX: waypoints MUST be joined with %7C (URL-encoded pipe), NOT raw |
      const waypoints = waypointsArray.map((addr) => encodeURIComponent(addr)).join('%7C');
      return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
    }

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  };

  const copyRouteLink = () => {
    const url = generateGoogleMapsRouteUrl();
    if (url === '#') return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Route Action Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <Compass className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-bold tracking-tight">Otimização de Rota no Google Maps</h2>
          </div>
          <p className="text-xs text-slate-300">
            Encontrados <strong className="text-amber-400">{routeEvents.length} endereços</strong> programados para o dia ({selectedDate}).{' '}
            <span className="text-emerald-400 font-bold">{activeEvents.length} selecionados</span> para a rota.
          </p>
        </div>

        {activeEvents.length > 0 && (
          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2.5">
            <button
              onClick={copyRouteLink}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold rounded-xl text-xs transition"
              title="Copiar Link da Rota Otimizada"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Link Copiado!' : 'Copiar Link'}</span>
            </button>

            <a
              href={generateGoogleMapsRouteUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-xl text-sm shadow-lg shadow-amber-500/25 transition transform active:scale-95"
            >
              <Navigation className="h-5 w-5 fill-slate-950" />
              <span>Abrir Rota com {activeEvents.length} Paradas no Google Maps</span>
              <ExternalLink className="h-4 w-4 opacity-80" />
            </a>
          </div>
        )}
      </div>

      {/* Grid: Route List + Map Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Sequence of Visits */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                Itinerário de Paradas do Dia
              </h3>
              <p className="text-[11px] text-slate-500">
                Selecione as visitas e reordene o trajeto conforme sua necessidade antes de abrir no GPS.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={selectAll}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-200 transition"
              >
                Selecionar Todos
              </button>
              <button
                onClick={deselectAll}
                className="text-[11px] font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg border border-slate-200 transition"
              >
                Desmarcar
              </button>
              <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                {activeEvents.length}/{routeEvents.length} selecionados
              </span>
            </div>
          </div>

          {routeEvents.length === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <MapPin className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="text-xs">Nenhum compromisso com endereço cadastrado para esta data.</p>
            </div>
          ) : (
            <div className="space-y-3 relative">
              {/* Vertical timeline line */}
              <div className="absolute left-[38px] top-6 bottom-6 w-0.5 bg-slate-200 z-0" />

              {routeEvents.map((ev, idx) => {
                const isSelected = selectedIds.has(ev.id);
                // Calculate position index among selected items
                const selectedIndex = activeEvents.findIndex((e) => e.id === ev.id);

                const isFirst = idx === 0;
                const isLast = idx === routeEvents.length - 1;

                let badgeColor = 'bg-slate-900 text-white';
                if (ev.status === 'realizada') badgeColor = 'bg-emerald-600 text-white';
                if (ev.status === 'nao_encontrado') badgeColor = 'bg-rose-600 text-white';
                if (ev.status === 'pendente') badgeColor = 'bg-amber-500 text-white';

                return (
                  <div
                    key={ev.id}
                    className={`relative z-10 flex items-start gap-3 p-3.5 rounded-xl border transition ${
                      isSelected
                        ? 'bg-slate-50/90 border-slate-300 shadow-xs'
                        : 'bg-slate-50/40 border-slate-200/60 opacity-60'
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleSelect(ev.id)}
                      className="mt-1 text-slate-500 hover:text-emerald-600 transition shrink-0"
                      title={isSelected ? 'Desmarcar visita da rota' : 'Incluir visita na rota'}
                    >
                      {isSelected ? (
                        <CheckSquare className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Square className="h-5 w-5 text-slate-400" />
                      )}
                    </button>

                    {/* Number Pin Badge */}
                    <div
                      className={`h-7 w-7 rounded-full ${
                        isSelected ? badgeColor : 'bg-slate-300 text-slate-600'
                      } flex items-center justify-center font-extrabold text-xs shrink-0 shadow-sm border-2 border-white mt-0.5`}
                    >
                      {isSelected ? selectedIndex + 1 : '-'}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{ev.title}</h4>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold">
                            {ev.startTime}
                          </span>
                          <VisitStatusBadge status={ev.status} className="text-[10px] py-0.5 px-2" />
                        </div>
                      </div>

                      {ev.contactName && (
                        <p className="text-[11px] font-semibold text-slate-700">Contato: {ev.contactName}</p>
                      )}

                      <p className="text-[11px] text-slate-600 flex items-center gap-1 font-medium">
                        <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                        <span className="truncate">{ev.address}</span>
                      </p>

                      {isSelected && selectedIndex === 0 && (
                        <span className="inline-block text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md mt-1">
                          1ª Parada (Origem)
                        </span>
                      )}

                      {isSelected && selectedIndex > 0 && selectedIndex === activeEvents.length - 1 && activeEvents.length > 1 && (
                        <span className="inline-block text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-md mt-1">
                          Última Parada (Destino Final)
                        </span>
                      )}
                    </div>

                    {/* Up/Down controls */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        disabled={isFirst}
                        onClick={() => moveUp(idx)}
                        className="p-1 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white transition"
                        title="Mover para cima"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        disabled={isLast}
                        onClick={() => moveDown(idx)}
                        className="p-1 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white transition"
                        title="Mover para baixo"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Visual Interactive Map Representation */}
        <div className="lg:col-span-5 bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold flex items-center gap-2 text-white">
              <Map className="h-4 w-4 text-amber-400" />
              Visualização Interativa da Rota
            </h3>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-medium px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
              <span>Google Maps Multi-Paradas</span>
            </span>
          </div>

          {/* Interactive Graphic Representation of Route Pins */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 min-h-[340px] flex flex-col justify-between relative overflow-hidden">
            {/* Grid background effect */}
            <div
              className="absolute inset-0 opacity-15"
              style={{
                backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px)`,
                backgroundSize: '16px 16px'
              }}
            />

            <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between">
              <span>Sequência da Rota</span>
              <span className="font-mono text-[10px] text-amber-400">Total: {activeEvents.length} Paradas</span>
            </div>

            {/* Pins Graphic */}
            <div className="relative z-10 py-6 space-y-3">
              {activeEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Nenhuma parada selecionada. Marque as visitas na lista ao lado para formar a rota.
                </div>
              ) : (
                activeEvents.map((ev, i) => (
                  <div
                    key={ev.id}
                    className="flex items-center gap-3 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800/90 backdrop-blur-sm"
                  >
                    <div className="h-6 w-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-200 truncate">{ev.title}</p>
                      <p className="text-[10px] text-slate-400 truncate">{ev.address}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(ev.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-mono bg-emerald-950/60 rounded border border-emerald-800/80 transition"
                        title="Ver no OpenStreetMap"
                      >
                        OSM
                      </a>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-amber-400 transition"
                        title="Ver local individual no Google Maps"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom launcher button inside card */}
            <div className="relative z-10 pt-3 border-t border-slate-800/80 space-y-2">
              <a
                href={generateGoogleMapsRouteUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-md ${
                  activeEvents.length > 0
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-slate-800 text-slate-500 pointer-events-none'
                }`}
              >
                <Navigation className="h-4 w-4" />
                <span>Iniciar Rota GPS ({activeEvents.length} Paradas)</span>
              </a>

              {activeEvents.length > 1 && (
                <a
                  href={generateGoogleMapsQueryUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 pt-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>Link alternativo (formato Query / Waypoints)</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

