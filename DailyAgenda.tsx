import React, { useState } from 'react';
import { CalendarEvent, GoogleContact, Domicile, VisitStatus } from '../types';
import { VisitStatusButtons, VisitStatusBadge } from './VisitStatusButtons';
import { VisitExecutionModal } from './VisitExecutionModal';
import { VisitSummaryModal } from './VisitSummaryModal';
import { generateRecurringEvents } from '../utils/acsScheduler';
import { getBrasiliaDateStr, formatBrasiliaDateDisplay, addDaysBrasilia } from '../utils/dateUtils';
import {
  MapPin,
  Phone,
  MessageSquare,
  Clock,
  Plus,
  Search,
  Building,
  User,
  ExternalLink,
  ChevronRight,
  Edit3,
  Calendar,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  AlertCircle,
  HeartPulse,
  Home,
  Repeat,
  FolderOpen,
  FileText,
  Trash2,
  Bell,
  Volume2
} from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';
import { playChimeSound, requestPushPermission, isPushEnabled } from '../services/notificationService';

interface DailyAgendaProps {
  events: CalendarEvent[];
  contacts: GoogleContact[];
  domiciles?: Domicile[];
  selectedDate: string;
  onDateChange?: (date: string) => void;
  onUpdateEventStatus: (eventId: string, newStatus: VisitStatus, observation?: string) => void;
  onAddEvent: (newEvent: Partial<CalendarEvent>) => void;
  onDeleteEvent?: (eventId: string) => void;
  onOpenRouteTab: () => void;
  onUpdateContact?: (contact: GoogleContact) => void;
  onUpdateDomicile?: (domicile: Domicile) => void;
}

const VISIT_REASONS = [
  'Visita Periódica',
  'Visita de Atualização Cadastral',
  'Visita de Acompanhamento com o Médico',
  'Visita Pós-Alta com o Médico',
  'Visita de Fechamento de Pré-Natal com Enfermeiro(a)',
  'Visita de Acamado com o Enfermeiro(a)',
  'Visita de Solicitação de Busca Ativa',
  'Visita de Acompanhamento a Coleta de Exames',
  'Acompanhamento Gestante & Pré-Natal',
  'Puericultura (Acompanhamento do Bebê/Criança)',
  'Controle de Hipertensão (HAS) e Diabetes (DM)',
  'Acompanhamento Paciente Acamado / Domiciliado',
  'Busca Ativa de Faltosos / Vacinação',
  'Orientação Preventiva / Dengue e Zoonoses',
  'Outro Atendimento de Saúde'
];

export const DailyAgenda: React.FC<DailyAgendaProps> = ({
  events,
  contacts,
  domiciles = [],
  selectedDate,
  onDateChange,
  onUpdateEventStatus,
  onAddEvent,
  onDeleteEvent,
  onOpenRouteTab,
  onUpdateContact,
  onUpdateDomicile
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [activeExecutionEvent, setActiveExecutionEvent] = useState<CalendarEvent | null>(null);
  const [activeSummaryEvent, setActiveSummaryEvent] = useState<CalendarEvent | null>(null);

  // Modal State for New Visit
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedDomicileId, setSelectedDomicileId] = useState('');
  const [visitReason, setVisitReason] = useState(VISIT_REASONS[0]);
  const [newTitle, setNewTitle] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newDate, setNewDate] = useState(selectedDate);
  const [newStartTime, setNewStartTime] = useState('08:30');
  const [newEndTime, setNewEndTime] = useState('09:30');
  const [newDescription, setNewDescription] = useState('');
  const [recurrence, setRecurrence] = useState<'none' | 'weekly' | 'biweekly' | 'monthly' | 'six_months' | 'yearly'>('none');

  // Format date helper
  const getDateDisplayInfo = (dateStr: string) => {
    return formatBrasiliaDateDisplay(dateStr);
  };

  const dateInfo = getDateDisplayInfo(selectedDate);

  const handleDateOffset = (offsetDays: number) => {
    if (!onDateChange) return;
    onDateChange(addDaysBrasilia(selectedDate, offsetDays));
  };

  const handleSetToday = () => {
    if (onDateChange) {
      onDateChange(getBrasiliaDateStr());
    }
  };

  // Handle contact selection auto-fill
  const handleContactSelect = (contactId: string) => {
    setSelectedContactId(contactId);
    const contact = contacts.find((c) => c.id === contactId);
    if (contact) {
      setNewTitle(`Visita Domiciliar ACS - ${contact.name}`);
      setNewAddress(contact.address || '');
      if (contact.domicileId) {
        setSelectedDomicileId(contact.domicileId);
      }
    }
  };

  const handleDomicileSelect = (domId: string) => {
    setSelectedDomicileId(domId);
    const dom = domiciles.find((d) => d.id === domId);
    if (dom) {
      setNewTitle(`Visita Domiciliar ACS - ${dom.street}, ${dom.number}`);
      setNewAddress(`${dom.street}, ${dom.number} - ${dom.neighborhood}, ${dom.city}`);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newAddress) return;

    const contact = contacts.find((c) => c.id === selectedContactId);
    const targetDate = newDate || selectedDate;

    const baseEvent: CalendarEvent = {
      id: `ev_${Date.now()}`,
      title: newTitle,
      address: newAddress,
      startTime: newStartTime,
      endTime: newEndTime,
      date: targetDate,
      visitReason,
      description: newDescription,
      contactId: contact?.id,
      contactName: contact?.name,
      domicileId: selectedDomicileId,
      phone: contact?.phone,
      status: 'pendente',
      recurrence
    };

    const generatedEvents = generateRecurringEvents(baseEvent, recurrence);
    generatedEvents.forEach((ev) => onAddEvent(ev));

    // Reset Form
    setIsAddModalOpen(false);
    setSelectedContactId('');
    setSelectedDomicileId('');
    setNewTitle('');
    setNewAddress('');
    setNewDescription('');
    setRecurrence('none');
  };

  // Open note edit popup
  const handleStartEditNote = (event: CalendarEvent) => {
    setEditingEventId(event.id);
    setNoteText(event.observation || '');
  };

  const handleSaveNote = (eventId: string, currentStatus: VisitStatus) => {
    onUpdateEventStatus(eventId, currentStatus, noteText);
    setEditingEventId(null);
  };

  // 1. Filter events by selectedDate FIRST
  const dayEvents = events.filter((ev) => (ev.date ? ev.date === selectedDate : true));

  // Find all distinct dates with events for quick-jump navigation
  const datesWithEvents: string[] = events
    .map((e) => e.date)
    .filter((d): d is string => typeof d === 'string' && d.length > 0)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort();

  // 2. Filter dayEvents by search and status
  const filteredEvents = dayEvents.filter((ev) => {
    const matchesSearch =
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.contactName && ev.contactName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterStatus === 'todas') return true;
    if (filterStatus === 'pendentes') return ev.status === 'pendente';
    if (filterStatus === 'realizadas') return ev.status === 'realizada';
    if (filterStatus === 'nao_encontrado') return ev.status === 'nao_encontrado';
    if (filterStatus === 'reagendadas') return ev.status === 'reagendado' || ev.status === 'cancelado';
    return true;
  });

  // Calculate quick stats for selected day
  const total = dayEvents.length;
  const realizadas = dayEvents.filter((e) => e.status === 'realizada').length;
  const naoEncontradas = dayEvents.filter((e) => e.status === 'nao_encontrado').length;
  const pendentes = dayEvents.filter((e) => e.status === 'pendente').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Control Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-200">
                <CalendarIcon className="h-5 w-5" />
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {dateInfo.title}
              </h2>
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                {total} {total === 1 ? 'visita' : 'visitas'}
              </span>

              <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 p-0.5 rounded-xl">
                <button
                  type="button"
                  onClick={async () => {
                    playChimeSound();
                    await requestPushPermission();
                  }}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="Testar alerta sonoro e ativar notificações push no celular"
                >
                  <Bell className="h-3.5 w-3.5 text-slate-950" />
                  <span>Alertas Sonoros</span>
                </button>
                <InfoTooltip
                  title="Alertas & Notificações"
                  content="Dispara bip sonoro e notificações push nativas para visitas prioritárias (gestantes, acamados, idosos) no dia."
                />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Agenda territorial do Agente Comunitário de Saúde integrada ao Google Agenda.
            </p>
          </div>

          {/* Date Selector Navigation Controls */}
          {onDateChange && (
            <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl text-white shadow-sm flex-wrap border border-slate-800">
              <button
                type="button"
                onClick={() => handleDateOffset(-1)}
                className="px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition"
                title="Dia Anterior"
              >
                &larr; Ontem
              </button>
              <button
                type="button"
                onClick={handleSetToday}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => handleDateOffset(1)}
                className="px-3 py-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl text-xs font-bold transition"
                title="Próximo Dia"
              >
                Amanhã &rarr;
              </button>
              <div className="pl-2 border-l border-slate-800">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && onDateChange(e.target.value)}
                  className="bg-slate-900 text-slate-100 text-xs px-2.5 py-1 rounded-xl border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Quick Summary Chips & Schedule Action */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
              <CheckCircle className="h-4 w-4" />
              <span>{realizadas} Realizadas</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
              <Clock className="h-4 w-4" />
              <span>{pendentes} Pendentes</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200">
              <XCircle className="h-4 w-4" />
              <span>{naoEncontradas} Ausentes</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setNewDate(selectedDate);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition"
          >
            <Plus className="h-4 w-4" />
            Agendar Visita Domiciliar
          </button>
        </div>

        {/* Quick-Jump pill bar for other dates with visits */}
        {datesWithEvents.length > 0 && (
          <div className="pt-2.5 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-slate-500 font-bold text-[11px] shrink-0 flex items-center gap-1">
              📅 Outras datas com visitas:
            </span>
            <div className="flex items-center gap-1.5">
              {datesWithEvents.map((dStr) => {
                const count = events.filter((e) => e.date === dStr).length;
                const isCurrent = dStr === selectedDate;
                const [y, m, d] = dStr.split('-');
                return (
                  <button
                    key={dStr}
                    type="button"
                    onClick={() => onDateChange && onDateChange(dStr)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap border ${
                      isCurrent
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    {d}/{m} ({count} {count === 1 ? 'visita' : 'visitas'})
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por munícipe, endereço ou motivo da visita..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'todas', label: 'Todas' },
            { id: 'pendentes', label: 'Pendentes' },
            { id: 'realizadas', label: 'Realizadas' },
            { id: 'nao_encontrado', label: 'Não Encontrado' },
            { id: 'reagendadas', label: 'Reagendadas / Outras' }
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterStatus(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                filterStatus === f.id
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Agenda List */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <div className="h-16 w-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <Calendar className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Nenhuma visita agendada para {dateInfo.isToday ? 'hoje' : 'esta data'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
            Não há visitas cadastradas para <strong>{dateInfo.formatted || selectedDate}</strong>.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setNewDate(selectedDate);
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Agendar Visita Domiciliar para este Dia
            </button>
            {!dateInfo.isToday && (
              <button
                type="button"
                onClick={handleSetToday}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border border-slate-200"
              >
                Voltar para Hoje
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event, index) => {
            const isEditingNote = editingEventId === event.id;
            const displayAddress = (() => {
              if (event.address && event.address !== 'Sem endereço cadastrado' && event.address.trim() !== '') {
                return event.address;
              }
              if (event.contactId) {
                const c = contacts.find((c) => c.id === event.contactId);
                if (c && c.address) return c.address;
              }
              if (event.contactName) {
                const c = contacts.find((c) => c.name.toLowerCase() === event.contactName?.toLowerCase());
                if (c && c.address) return c.address;
              }
              if (event.domicileId && domiciles) {
                const d = domiciles.find((d) => d.id === event.domicileId);
                if (d) {
                  const compStr = d.complement ? ` (${d.complement})` : '';
                  return `${d.street}, ${d.number}${compStr} - ${d.neighborhood}`;
                }
              }
              return event.address || 'Sem endereço cadastrado';
            })();

            const eventWithResolvedAddress = { ...event, address: displayAddress };

            return (
              <div
                key={event.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition relative group"
              >
                {/* Time Indicator & Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center justify-center h-8 px-3 rounded-xl bg-slate-900 text-white font-mono text-xs font-bold">
                      <Clock className="h-3.5 w-3.5 mr-1.5 text-blue-400" />
                      {event.startTime} - {event.endTime}
                    </span>

                    <span className="text-xs font-semibold text-slate-400">#Visita {index + 1}</span>

                    <VisitStatusBadge status={event.status} />

                    {event.visitReason && (
                      <span className="text-[11px] font-bold bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
                        📋 {event.visitReason}
                      </span>
                    )}
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveSummaryEvent(eventWithResolvedAddress)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs shadow-blue-600/20"
                      title="Abrir resumo completo com dados de cada morador e exportação PDF para o e-SUS"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Resumo da Visita
                    </button>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayAddress)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-medium transition"
                    >
                      <MapPin className="h-3.5 w-3.5 text-amber-600" />
                      Google Maps
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>

                    {onDeleteEvent && (
                      <button
                        onClick={() => {
                          if (confirm(`Deseja enviar a visita "${event.title}" para a Lixeira?`)) {
                            onDeleteEvent(event.id);
                          }
                        }}
                        className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 border border-slate-200 rounded-xl transition"
                        title="Enviar visita para a Lixeira"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Event Details */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  <div className="lg:col-span-7 space-y-2">
                    <h3 className="text-base font-bold text-slate-900 leading-snug">{event.title}</h3>

                    {event.contactName && (
                      <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-bold text-slate-900">{event.contactName}</span>
                        {event.phone && (
                          <div className="flex items-center gap-2 ml-2">
                            <a
                              href={`tel:${event.phone.replace(/\D/g, '')}`}
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium"
                            >
                              <Phone className="h-3 w-3" />
                              {event.phone}
                            </a>
                            <a
                              href={`https://wa.me/${event.phone.replace(/\D/g, '').length <= 11 ? '55' + event.phone.replace(/\D/g, '') : event.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${event.contactName}, sou seu Agente Comunitário de Saúde (ACS).`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 bg-[#25D366] hover:bg-[#20ba5a] text-white px-2 py-0.5 rounded-lg text-[10px] font-bold transition shadow-xs"
                              title="Abrir WhatsApp do paciente"
                            >
                              WhatsApp
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                      <span className="font-medium">{displayAddress}</span>
                    </div>

                    {event.description && (
                      <p className="text-xs text-slate-500 italic pl-1 border-l-2 border-slate-200">
                        "{event.description}"
                      </p>
                    )}

                    <div className="pt-1">
                      <button
                        onClick={() => setActiveExecutionEvent(eventWithResolvedAddress)}
                        className="w-full py-2 px-3 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 hover:from-slate-800 hover:to-teal-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-between gap-2 shadow-sm"
                      >
                        <span className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-emerald-400" />
                          Abrir Visita (Atualizar Cadastros e Finalizar)
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </button>
                    </div>
                  </div>

                  {/* Status & Feedback Panel */}
                  <div className="lg:col-span-5 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80 space-y-3">
                    <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Resultado da Visita Domiciliar</span>
                      {event.updatedAt && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          Registrado às {event.updatedAt}
                        </span>
                      )}
                    </div>

                    <VisitStatusButtons
                      currentStatus={event.status}
                      onChangeStatus={(newStatus) => onUpdateEventStatus(event.id, newStatus, event.observation)}
                    />

                    {/* Observations section */}
                    <div className="pt-2 border-t border-slate-200/60">
                      {isEditingNote ? (
                        <div className="space-y-2">
                          <textarea
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Registrar anotação da visita (ex: PA aferida 120/80, orientações de medicação, agendado retorno...)"
                            className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 text-slate-800"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingEventId(null)}
                              className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSaveNote(event.id, event.status)}
                              className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800"
                            >
                              Salvar Anotação
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-1.5 text-xs text-slate-600">
                            <MessageSquare className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            {event.observation ? (
                              <span className="text-slate-800 font-medium">{event.observation}</span>
                            ) : (
                              <span className="text-slate-400 italic">Sem observações registradas ainda</span>
                            )}
                          </div>
                          <button
                            onClick={() => handleStartEditNote(event)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition"
                            title="Editar observação da visita"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Appointment Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Agendar Nova Visita Domiciliar
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Selecionar Munícipe Cadastrado
                </label>
                <select
                  value={selectedContactId}
                  onChange={(e) => handleContactSelect(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-medium"
                >
                  <option value="">Selecione um paciente ou preencha manualmente abaixo...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.cns ? `(CNS: ${c.cns})` : ''} - {c.microarea || 'Microárea 01'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Motivo Principal da Visita *</label>
                <select
                  value={visitReason}
                  onChange={(e) => setVisitReason(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-semibold"
                >
                  {VISIT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Título da Visita *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Visita Domiciliar - Acompanhamento Gestante"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Endereço Domiciliar (para Rota no Google Maps) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>

              {/* Date and Recurrence Controls */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                      <CalendarIcon className="h-3.5 w-3.5 text-blue-600" />
                      Data do Agendamento *
                    </label>
                    <input
                      type="date"
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                      <Repeat className="h-3.5 w-3.5 text-blue-600" />
                      Repetir Visita (Google Agenda)
                    </label>
                    <select
                      value={recurrence}
                      onChange={(e) => setRecurrence(e.target.value as any)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                    >
                      <option value="none">Não se repete (Visita única)</option>
                      <option value="weekly">Semanalmente</option>
                      <option value="biweekly">Quinzenalmente</option>
                      <option value="monthly">Mensalmente</option>
                      <option value="six_months">A cada 6 meses (Padrão e-SUS)</option>
                      <option value="yearly">Anualmente</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-blue-100">
                  <span className="text-[11px] font-bold text-slate-500">Atalhos de data:</span>
                  <button
                    type="button"
                    onClick={() => setNewDate(getBrasiliaDateStr())}
                    className="px-2 py-0.5 bg-white hover:bg-blue-100 text-blue-700 text-[11px] font-semibold rounded-lg border border-blue-200"
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewDate(addDaysBrasilia(getBrasiliaDateStr(), 1))}
                    className="px-2 py-0.5 bg-white hover:bg-blue-100 text-blue-700 text-[11px] font-semibold rounded-lg border border-blue-200"
                  >
                    Amanhã
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewDate(addDaysBrasilia(getBrasiliaDateStr(), 7))}
                    className="px-2 py-0.5 bg-white hover:bg-blue-100 text-blue-700 text-[11px] font-semibold rounded-lg border border-blue-200"
                  >
                    +7 dias
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Horário Início *</label>
                  <input
                    type="time"
                    required
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Horário Fim *</label>
                  <input
                    type="time"
                    required
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pauta / Observações Previas</label>
                <textarea
                  placeholder="Instruções para a visita, exames a solicitar, orientações..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition"
                >
                  Salvar na Agenda do Google
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visit Execution Portal Modal */}
      {activeExecutionEvent && (
        <VisitExecutionModal
          isOpen={!!activeExecutionEvent}
          onClose={() => setActiveExecutionEvent(null)}
          event={activeExecutionEvent}
          contacts={contacts}
          domiciles={domiciles}
          onUpdateContact={onUpdateContact || (() => {})}
          onUpdateDomicile={onUpdateDomicile || (() => {})}
          onUpdateEventStatus={onUpdateEventStatus}
        />
      )}

      {/* Visit Summary Modal (e-SUS PDF / Launch Report) */}
      {activeSummaryEvent && (
        <VisitSummaryModal
          isOpen={!!activeSummaryEvent}
          onClose={() => setActiveSummaryEvent(null)}
          event={activeSummaryEvent}
          contacts={contacts}
          domiciles={domiciles}
        />
      )}
    </div>
  );
};
