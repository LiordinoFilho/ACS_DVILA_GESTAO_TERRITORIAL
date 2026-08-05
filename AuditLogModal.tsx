import React, { useState, useEffect } from 'react';
import { getAuditLogs, exportAuditLogsToCSV, clearAuditLogs, AuditLogEntry } from '../services/auditLogService';
import { InfoTooltip } from './InfoTooltip';
import {
  FileText,
  Search,
  Download,
  Trash2,
  X,
  ShieldCheck,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  UserCheck,
  RefreshCw
} from 'lucide-react';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    if (isOpen) {
      setLogs(getAuditLogs());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || log.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleClear = () => {
    if (confirm('Deseja limpar todo o histórico de logs de auditoria local?')) {
      clearAuditLogs();
      setLogs(getAuditLogs());
    }
  };

  const getCategoryBadgeClass = (category: AuditLogEntry['category']) => {
    switch (category) {
      case 'PATIENT':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'VISIT':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'DOMICILE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'SECURITY':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'SYNC':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-slate-100 flex flex-col my-8 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-2xl">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">Logs de Auditoria & Integridade e-SUS</h2>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-bold">
                  Conformidade e-SUS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Registro cronológico em segundo plano para prestação de contas das ações do ACS
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar: Search, Filters, Export */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/40 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por ação, paciente ou palavra-chave..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-400"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {['ALL', 'PATIENT', 'VISIT', 'DOMICILE', 'SYNC', 'SECURITY'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                {cat === 'ALL' && 'Todos'}
                {cat === 'PATIENT' && 'Munícipes'}
                {cat === 'VISIT' && 'Visitas'}
                {cat === 'DOMICILE' && 'Domicílios'}
                {cat === 'SYNC' && 'Sincronização'}
                {cat === 'SECURITY' && 'Segurança'}
              </button>
            ))}
          </div>

          {/* Export & Clear Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={exportAuditLogsToCSV}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Exportar (.CSV)</span>
            </button>

            {logs.length > 0 && (
              <button
                onClick={handleClear}
                className="p-2 bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 rounded-xl border border-slate-700 transition"
                title="Limpar logs locais"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Logs List Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Clock className="h-10 w-10 mx-auto text-slate-600 opacity-50" />
              <p className="text-sm font-bold text-slate-400">Nenhum log de auditoria encontrado.</p>
              <p className="text-xs text-slate-500">
                As ações executadas no aplicativo são registradas automaticamente em background.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-950/60 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl transition space-y-1.5"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getCategoryBadgeClass(log.category)}`}>
                      {log.category}
                    </span>
                    <span className="text-xs font-black text-white">{log.action}</span>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-500" />
                    {log.formattedDate}
                  </span>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed font-medium">{log.description}</p>

                {log.details && (
                  <p className="text-[11px] text-slate-400 bg-slate-900/80 p-2 rounded-xl border border-slate-800 font-mono">
                    {log.details}
                  </p>
                )}

                <div className="text-[10px] text-slate-500 flex items-center gap-1 pt-0.5">
                  <UserCheck className="h-3 w-3 text-emerald-500" />
                  <span>Agente responsável: {log.userEmail}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
