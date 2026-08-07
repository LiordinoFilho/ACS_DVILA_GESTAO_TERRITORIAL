import React, { useState } from 'react';
import { GoogleContact } from '../types';
import { DuplicateCandidateGroup, mergeContactData } from '../utils/duplicateUtils';
import { Users, GitMerge, CheckCircle, XCircle, AlertTriangle, ShieldCheck, HeartPulse, MapPin, Calendar, Phone, IdCard, ChevronRight, X } from 'lucide-react';

interface DuplicateMergerModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateGroups: DuplicateCandidateGroup[];
  onConfirmMerge: (groupsToMerge: { group: DuplicateCandidateGroup; mergedContact: GoogleContact }[]) => void;
  onDismissGroup: (groupKey: string) => void;
}

export const DuplicateMergerModal: React.FC<DuplicateMergerModalProps> = ({
  isOpen,
  onClose,
  candidateGroups,
  onConfirmMerge,
  onDismissGroup
}) => {
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(() => new Set(candidateGroups.map(g => g.id)));

  if (!isOpen) return null;

  const toggleSelectGroup = (groupId: string) => {
    setSelectedGroupIds(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedGroupIds(new Set(candidateGroups.map(g => g.id)));
  };

  const deselectAll = () => {
    setSelectedGroupIds(new Set());
  };

  const handleMergeSelected = () => {
    const activeGroupsToMerge = candidateGroups.filter(g => selectedGroupIds.has(g.id));
    if (activeGroupsToMerge.length === 0) return;

    const payload = activeGroupsToMerge.map(group => ({
      group,
      mergedContact: mergeContactData(group.primaryContact, group.secondaryContacts)
    }));

    onConfirmMerge(payload);
  };

  const selectedCount = selectedGroupIds.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 text-white flex items-center justify-between border-b border-amber-900/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400">
              <GitMerge className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">Unificar Cadastros Duplicados</h2>
                <span className="px-2.5 py-0.5 bg-rose-500 text-white text-xs font-black rounded-full animate-pulse">
                  {candidateGroups.length} {candidateGroups.length === 1 ? 'duplicado' : 'duplicados'}
                </span>
              </div>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Revise os cadastros repetidos e faça a fusão preservando histórico de visitas e composição familiar.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition"
            title="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50/50">
          {candidateGroups.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">Nenhum cadastro duplicado encontrado!</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Todos os munícipes do seu território estão com cadastros únicos e organizados.
              </p>
            </div>
          ) : (
            <>
              {/* Batch Select Controls Header */}
              <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <span className="font-semibold text-slate-900">Seleção para Unificação:</span>
                  <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md">
                    {selectedCount} de {candidateGroups.length} selecionados
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={selectAll}
                    className="text-emerald-700 font-bold hover:underline"
                  >
                    Selecionar Todos
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    onClick={deselectAll}
                    className="text-slate-500 hover:underline"
                  >
                    Desmarcar Todos
                  </button>
                </div>
              </div>

              {/* Group Cards List */}
              <div className="space-y-4">
                {candidateGroups.map((group, index) => {
                  const isChecked = selectedGroupIds.has(group.id);
                  const p = group.primaryContact;
                  const s = group.secondaryContacts[0]; // main secondary contact

                  return (
                    <div
                      key={group.id}
                      className={`bg-white rounded-2xl border transition shadow-xs overflow-hidden ${
                        isChecked ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200 opacity-90'
                      }`}
                    >
                      {/* Group Card Header */}
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectGroup(group.id)}
                            className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                                {group.reason}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium">
                                Par #{index + 1}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons per group */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onDismissGroup(group.key)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-2xs"
                            title="Dispensar sugestão se forem pessoas diferentes"
                          >
                            <XCircle className="h-3.5 w-3.5 text-slate-400" />
                            <span>Dispensar</span>
                          </button>
                        </div>
                      </div>

                      {/* Side by Side Comparison */}
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                        {/* Primary Contact Column */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              Cadastro Principal (Será Mantido)
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {p.id.slice(0, 8)}</span>
                          </div>

                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            <Users className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>{p.name}</span>
                          </div>

                          <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            {p.cns && (
                              <div className="flex items-center gap-1.5">
                                <IdCard className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span>CNS: <strong>{p.cns}</strong></span>
                              </div>
                            )}
                            {p.cpf && (
                              <div className="flex items-center gap-1.5">
                                <IdCard className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span>CPF: <strong>{p.cpf}</strong></span>
                              </div>
                            )}
                            {p.birthDate && (
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span>Nasc: {p.birthDate}</span>
                              </div>
                            )}
                            {p.motherName && (
                              <div className="text-[11px] text-slate-500">
                                Mãe: {p.motherName}
                              </div>
                            )}
                            {p.address && (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 truncate">
                                <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                <span className="truncate">{p.address}</span>
                              </div>
                            )}
                            {p.microarea && (
                              <div className="text-[10px] font-bold text-slate-500">
                                {p.microarea}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Secondary Contact Column */}
                        <div className="space-y-2 pt-3 md:pt-0 md:pl-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              Cadastro Duplicado (Será Unificado)
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {s?.id.slice(0, 8)}</span>
                          </div>

                          {s && (
                            <>
                              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                <Users className="h-4 w-4 text-amber-600 shrink-0" />
                                <span>{s.name}</span>
                              </div>

                              <div className="text-xs text-slate-600 space-y-1 bg-amber-50/40 p-2.5 rounded-xl border border-amber-100/60">
                                {s.cns && (
                                  <div className="flex items-center gap-1.5">
                                    <IdCard className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span>CNS: <strong>{s.cns}</strong></span>
                                  </div>
                                )}
                                {s.cpf && (
                                  <div className="flex items-center gap-1.5">
                                    <IdCard className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span>CPF: <strong>{s.cpf}</strong></span>
                                  </div>
                                )}
                                {s.birthDate && (
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span>Nasc: {s.birthDate}</span>
                                  </div>
                                )}
                                {s.motherName && (
                                  <div className="text-[11px] text-slate-500">
                                    Mãe: {s.motherName}
                                  </div>
                                )}
                                {s.address && (
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600 truncate">
                                    <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                    <span className="truncate">{s.address}</span>
                                  </div>
                                )}
                                {s.microarea && (
                                  <div className="text-[10px] font-bold text-slate-500">
                                    {s.microarea}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer / Primary Action Bar */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              Ao unificar, os dados vazios são preenchidos e as visitas/moradias são vinculadas ao cadastro principal.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-300"
            >
              Cancelar
            </button>

            {candidateGroups.length > 0 && (
              <button
                onClick={handleMergeSelected}
                disabled={selectedCount === 0}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-700 hover:to-amber-900 text-white rounded-xl text-xs font-extrabold transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <GitMerge className="h-4 w-4" />
                <span>Confirmar e Unificar {selectedCount} {selectedCount === 1 ? 'Cadastro Duplicado' : 'Cadastros Duplicados'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
