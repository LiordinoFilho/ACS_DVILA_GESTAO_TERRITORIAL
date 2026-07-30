import React from 'react';
import { VisitStatus } from '../types';
import { CheckCircle2, XCircle, Clock, CalendarDays, Ban, MapPinOff, Building2, Cross } from 'lucide-react';

interface VisitStatusButtonsProps {
  currentStatus: VisitStatus;
  onChangeStatus: (newStatus: VisitStatus) => void;
  size?: 'sm' | 'md' | 'lg';
}

export const VISIT_STATUS_CONFIG: Record<
  VisitStatus,
  { label: string; bg: string; text: string; border: string; activeBg: string; icon: React.ReactNode }
> = {
  realizada: {
    label: 'Visita Realizada',
    bg: 'bg-emerald-50 hover:bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
    activeBg: 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/30',
    icon: <CheckCircle2 className="h-4 w-4" />
  },
  nao_encontrado: {
    label: 'Não Encontrado',
    bg: 'bg-rose-50 hover:bg-rose-100',
    text: 'text-rose-700',
    border: 'border-rose-300',
    activeBg: 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-500/30',
    icon: <XCircle className="h-4 w-4" />
  },
  pendente: {
    label: 'Pendente',
    bg: 'bg-amber-50 hover:bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-300',
    activeBg: 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/30',
    icon: <Clock className="h-4 w-4" />
  },
  reagendado: {
    label: 'Reagendado',
    bg: 'bg-purple-50 hover:bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-300',
    activeBg: 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-500/30',
    icon: <CalendarDays className="h-4 w-4" />
  },
  cancelado: {
    label: 'Cancelado',
    bg: 'bg-slate-100 hover:bg-slate-200',
    text: 'text-slate-700',
    border: 'border-slate-300',
    activeBg: 'bg-slate-600 text-white border-slate-600 shadow-sm shadow-slate-500/30',
    icon: <Ban className="h-4 w-4" />
  },
  mudou_se_territorio: {
    label: 'Mudou-se de Território',
    bg: 'bg-sky-50 hover:bg-sky-100',
    text: 'text-sky-700',
    border: 'border-sky-300',
    activeBg: 'bg-sky-600 text-white border-sky-600 shadow-sm shadow-sky-500/30',
    icon: <MapPinOff className="h-4 w-4" />
  },
  mudou_se_municipio: {
    label: 'Mudou-se do Município',
    bg: 'bg-indigo-50 hover:bg-indigo-100',
    text: 'text-indigo-700',
    border: 'border-indigo-300',
    activeBg: 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/30',
    icon: <Building2 className="h-4 w-4" />
  },
  obito: {
    label: 'Óbito',
    bg: 'bg-zinc-100 hover:bg-zinc-200',
    text: 'text-zinc-800',
    border: 'border-zinc-400',
    activeBg: 'bg-zinc-800 text-white border-zinc-900 shadow-sm shadow-zinc-800/30',
    icon: <Cross className="h-4 w-4" />
  }
};

export const VisitStatusBadge: React.FC<{ status: VisitStatus; className?: string }> = ({ status, className = '' }) => {
  const config = VISIT_STATUS_CONFIG[status] || VISIT_STATUS_CONFIG.pendente;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
};

export const VisitStatusButtons: React.FC<VisitStatusButtonsProps> = ({
  currentStatus,
  onChangeStatus,
  size = 'md'
}) => {
  const statuses: VisitStatus[] = [
    'realizada',
    'nao_encontrado',
    'pendente',
    'reagendado',
    'cancelado'
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {statuses.map((status) => {
        const config = VISIT_STATUS_CONFIG[status];
        const isActive = currentStatus === status;

        return (
          <button
            key={status}
            type="button"
            onClick={() => onChangeStatus(status)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
              isActive
                ? config.activeBg
                : `${config.bg} ${config.text} ${config.border} opacity-80 hover:opacity-100`
            }`}
          >
            {config.icon}
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
};
