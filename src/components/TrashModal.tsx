import React, { useState, useMemo } from 'react';
import { TrashItem, TrashItemType, TrashRetentionDays } from '../types';
import { Trash2, RotateCcw, X, Search, Filter, AlertTriangle, Clock, User, Home, Calendar, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  trashItems: TrashItem[];
  retentionDays: TrashRetentionDays;
  onChangeRetentionDays: (days: TrashRetentionDays) => void;
  onRestoreItem: (item: TrashItem) => void;
  onRestoreAllItems: () => void;
  onPermanentlyDeleteItem: (id: string) => void;
  onEmptyTrash: () => void;
}

export const TrashModal: React.FC<TrashModalProps> = ({
  isOpen,
  onClose,
  trashItems,
  retentionDays,
  onChangeRetentionDays,
  onRestoreItem,
  onRestoreAllItems,
  onPermanentlyDeleteItem,
  onEmptyTrash
}) => {
  const [filterType, setFilterType] = useState<'all' | TrashItemType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmEmpty, setShowConfirmEmpty] = useState(false);
  const [confirmSingleDeleteId, setConfirmSingleDeleteId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    return trashItems.filter((item) => {
      const matchesType = filterType === 'all' || item.type === filterType;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q));
      return matchesType && matchesSearch;
    });
  }, [trashItems, filterType, searchQuery]);

  if (!isOpen) return null;

  const countPatients = trashItems.filter((i) => i.type === 'patient').length;
  const countDomiciles = trashItems.filter((i) => i.type === 'domicile').length;
  const countEvents = trashItems.filter((i) => i.type === 'event').length;

  const getDaysRemaining = (deletedAtIso: string): number | null => {
    if (retentionDays <= 0) return null;
    const deletedTime = new Date(deletedAtIso).getTime();
    if (isNaN(deletedTime)) return null;
    const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
    const ageMs = Date.now() - deletedTime;
    const remainingMs = maxAgeMs - ageMs;
    const days = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
    return days > 0 ? days : 0;
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/20 rounded-2xl border border-rose-400/30">
              <Trash2 className="h-6 w-6 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Lixeira e Recuperação</h2>
                <span className="px-2.5 py-0.5 bg-rose-500/30 border border-rose-400/30 text-rose-200 text-xs font-extrabold rounded-full">
                  {trashItems.length} {trashItems.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Restaure cadastros, residências ou visitas excluídos acidentalmente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Retention Setting Banner & Control */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <Clock className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Exclusão Automática:</strong> Itens na lixeira serão apagados permanentemente após o tempo configurado.
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-bold text-slate-600 shrink-0">Período padrão:</label>
            <select
              value={retentionDays}
              onChange={(e) => onChangeRetentionDays(Number(e.target.value) as TrashRetentionDays)}
              className="text-xs font-semibold bg-white border border-slate-300 text-slate-800 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500 w-full sm:w-auto shadow-2xs"
            >
              <option value={0}>Desativado (Nunca apagar)</option>
              <option value={7}>7 dias</option>
              <option value={15}>15 dias</option>
              <option value={30}>30 dias (Recomendado)</option>
              <option value={60}>60 dias</option>
              <option value={90}>90 dias</option>
            </select>
          </div>
        </div>

        {/* Toolbar: Filters, Search & Global Actions */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-col gap-3 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl gap-1 overflow-x-auto text-xs font-bold">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                  filterType === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({trashItems.length})
              </button>
              <button
                onClick={() => setFilterType('patient')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  filterType === 'patient'
                    ? 'bg-white text-emerald-900 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="h-3.5 w-3.5 text-emerald-600" />
                Munícipes ({countPatients})
              </button>
              <button
                onClick={() => setFilterType('domicile')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  filterType === 'domicile'
                    ? 'bg-white text-blue-900 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Home className="h-3.5 w-3.5 text-blue-600" />
                Residências ({countDomiciles})
              </button>
              <button
                onClick={() => setFilterType('event')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  filterType === 'event'
                    ? 'bg-white text-purple-900 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="h-3.5 w-3.5 text-purple-600" />
                Visitas ({countEvents})
              </button>
            </div>

            {/* Global Actions */}
            {trashItems.length > 0 && (
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={onRestoreAllItems}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Restaurar todos os itens da lixeira de volta para o sistema"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-emerald-600" />
                  Restaurar Todos
                </button>
                <button
                  onClick={() => setShowConfirmEmpty(true)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-xl text-xs font-bold border border-rose-200 transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Apagar permanentemente todos os itens da lixeira"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                  Esvaziar Lixeira
                </button>
              </div>
            )}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar item por nome, endereço ou detalhes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Confirmation Modal for Empty Trash */}
        {showConfirmEmpty && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2 text-rose-900 text-xs font-bold">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
              <span>Deseja realmente esvaziar a lixeira? Todos os {trashItems.length} itens serão excluídos permanentemente.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowConfirmEmpty(false)}
                className="px-3 py-1.5 bg-white text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold border border-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onEmptyTrash();
                  setShowConfirmEmpty(false);
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-2xs"
              >
                Sim, Esvaziar Agora
              </button>
            </div>
          </div>
        )}

        {/* Trash Item List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto mb-3 border border-slate-200">
                <Trash2 className="h-8 w-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                {trashItems.length === 0 ? 'Lixeira Vazia' : 'Nenhum item encontrado'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {trashItems.length === 0
                  ? 'Nenhum munícipe, residência ou visita foi excluído. Se você excluir algum registro, ele virá para cá e poderá ser restaurado facilmente.'
                  : 'Tente alterar os termos da busca ou mudar o filtro selecionado acima.'}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const daysRem = getDaysRemaining(item.deletedAt);
              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-2xl p-3.5 hover:border-slate-300 transition shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    {/* Icon by type */}
                    <div
                      className={`p-2.5 rounded-2xl border shrink-0 mt-0.5 ${
                        item.type === 'patient'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.type === 'domicile'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-purple-50 text-purple-700 border-purple-200'
                      }`}
                    >
                      {item.type === 'patient' && <User className="h-5 w-5" />}
                      {item.type === 'domicile' && <Home className="h-5 w-5" />}
                      {item.type === 'event' && <Calendar className="h-5 w-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {item.title}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide border ${
                            item.type === 'patient'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : item.type === 'domicile'
                              ? 'bg-blue-100 text-blue-800 border-blue-200'
                              : 'bg-purple-100 text-purple-800 border-purple-200'
                          }`}
                        >
                          {item.type === 'patient' && 'Munícipe'}
                          {item.type === 'domicile' && 'Residência'}
                          {item.type === 'event' && 'Visita'}
                        </span>
                      </div>

                      {item.subtitle && (
                        <p className="text-xs text-slate-600 mt-0.5">{item.subtitle}</p>
                      )}

                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Excluído: {formatDate(item.deletedAt)}
                        </span>
                        {daysRem !== null && (
                          <span
                            className={`font-semibold ${
                              daysRem <= 3 ? 'text-rose-600 font-extrabold' : 'text-amber-700'
                            }`}
                          >
                            ⏳ Expira em {daysRem} {daysRem === 1 ? 'dia' : 'dias'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 justify-end shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <button
                      onClick={() => onRestoreItem(item)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Restaurar este item para a lista original"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restaurar
                    </button>

                    {confirmSingleDeleteId === item.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            onPermanentlyDeleteItem(item.id);
                            setConfirmSingleDeleteId(null);
                          }}
                          className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                          title="Confirmar exclusão definitiva"
                        >
                          Apagar
                        </button>
                        <button
                          onClick={() => setConfirmSingleDeleteId(null)}
                          className="px-2 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmSingleDeleteId(item.id)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded-xl text-xs font-bold border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                        title="Excluir permanentemente este item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Apagar
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            Exclusões por engano podem ser recuperadas a qualquer momento.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Fechar Lixeira
          </button>
        </div>
      </div>
    </div>
  );
};
