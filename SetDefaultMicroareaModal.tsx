import React, { useState } from 'react';
import {
  getSavedMicroareas,
  cleanMicroareaName,
  getMicroareaStyle,
  getDefaultMicroarea,
  setDefaultMicroarea,
  formatCustomMicroarea,
  saveCustomMicroarea,
  GoogleContact,
  Domicile
} from '../types';
import { Settings, CheckCircle2, AlertTriangle, Users, Home, Sparkles, X, Layers, Tag } from 'lucide-react';

interface SetDefaultMicroareaModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: GoogleContact[];
  domiciles: Domicile[];
  onApplyMicroareaToAll: (selectedMicroarea: string, applyToExisting: boolean) => Promise<void> | void;
}

export const SetDefaultMicroareaModal: React.FC<SetDefaultMicroareaModalProps> = ({
  isOpen,
  onClose,
  contacts,
  domiciles,
  onApplyMicroareaToAll,
}) => {
  const savedList = getSavedMicroareas();
  const currentDefault = cleanMicroareaName(getDefaultMicroarea());

  const [selectedMicroarea, setSelectedMicroarea] = useState<string>(currentDefault);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customNum, setCustomNum] = useState('03');
  const [customColor, setCustomColor] = useState('Verde');
  const [isApplying, setIsApplying] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeMicroareaTarget = isCustomMode
    ? formatCustomMicroarea(customNum, customColor)
    : selectedMicroarea;

  const handleConfirm = async (applyToExisting: boolean) => {
    setIsApplying(true);
    setSuccessMsg(null);

    try {
      const target = isCustomMode
        ? formatCustomMicroarea(customNum, customColor)
        : selectedMicroarea;

      saveCustomMicroarea(target);

      // 1. Set as new system default
      setDefaultMicroarea(target);

      // 2. Trigger parent callback to update state and localStorage
      await onApplyMicroareaToAll(target, applyToExisting);

      if (applyToExisting) {
        setSuccessMsg(
          `Microárea "${target}" definida como padrão! ${contacts.length} paciente(s) e ${domiciles.length} domicílio(s) foram atualizados para esta microárea.`
        );
      } else {
        setSuccessMsg(
          `Microárea "${target}" foi definida como padrão para novos cadastros.`
        );
      }

      setTimeout(() => {
        setIsApplying(false);
        setSuccessMsg(null);
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Erro ao definir microárea padrão:', err);
      setIsApplying(false);
    }
  };

  const previewStyle = getMicroareaStyle(activeMicroareaTarget);

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-700 via-emerald-700 to-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Layers className="h-5 w-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Definir Microárea Padrão & Aplicar Geral</h3>
              <p className="text-xs text-emerald-100">Configure a microárea de atuação do ACS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-100 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {successMsg ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3 animate-in fade-in">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="font-extrabold text-emerald-900 text-base">Configuração Atualizada!</h4>
              <p className="text-xs text-emerald-800 font-medium leading-relaxed">{successMsg}</p>
            </div>
          ) : (
            <>
              {/* Status Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Microárea Padrão Atual:</span>
                  <span className="font-extrabold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    {currentDefault}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-600 font-bold">
                  <span className="flex items-center gap-1" title="Total de Pacientes">
                    <Users className="h-3.5 w-3.5 text-teal-600" /> {contacts.length}
                  </span>
                  <span className="flex items-center gap-1" title="Total de Domicílios">
                    <Home className="h-3.5 w-3.5 text-emerald-600" /> {domiciles.length}
                  </span>
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                  Selecione a Microárea Desejada:
                </label>
                
                {/* Microareas Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {savedList.map((m) => {
                    const cleanM = cleanMicroareaName(m);
                    const style = getMicroareaStyle(cleanM);
                    const isSelected = !isCustomMode && selectedMicroarea === cleanM;
                    const isCurrentDefault = currentDefault === cleanM;
                    const patientCount = contacts.filter((c) => cleanMicroareaName(c.microarea) === cleanM).length;
                    const domicileCount = domiciles.filter((d) => cleanMicroareaName(d.microarea) === cleanM).length;

                    return (
                      <button
                        key={cleanM}
                        type="button"
                        onClick={() => {
                          setIsCustomMode(false);
                          setSelectedMicroarea(cleanM);
                        }}
                        className={`p-3 rounded-xl border text-left transition flex items-center justify-between gap-2 relative ${
                          isSelected
                            ? `${style.bg} ${style.border} ${style.text} ring-2 ring-teal-600 font-extrabold shadow-sm`
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="truncate">
                            <span className="text-xs font-bold block truncate">{cleanM}</span>
                            <span className="text-[10px] opacity-75 block font-normal">
                              {patientCount} pac. • {domicileCount} dom.
                            </span>
                          </div>
                        </div>

                        {isCurrentDefault && (
                          <span className="text-[9px] font-extrabold bg-teal-100 text-teal-800 border border-teal-300 px-1.5 py-0.5 rounded-full shrink-0">
                            Padrão
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Outros Custom Option Button */}
                  <button
                    type="button"
                    onClick={() => setIsCustomMode(true)}
                    className={`p-3 rounded-xl border text-left transition flex items-center justify-between gap-2 relative ${
                      isCustomMode
                        ? 'bg-teal-50 border-teal-400 text-teal-900 ring-2 ring-teal-600 font-extrabold shadow-sm'
                        : 'bg-slate-50 border-dashed border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-teal-600 shrink-0" />
                      <span className="text-xs font-bold">➕ Outros (Digitar número e cor)...</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Custom Microarea Input Panel */}
              {isCustomMode && (
                <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-teal-900">
                    <Tag className="h-4 w-4 text-teal-600" />
                    <span>Digitar Nova Microárea Personalizada:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Número da Microárea:
                      </label>
                      <input
                        type="text"
                        value={customNum}
                        onChange={(e) => setCustomNum(e.target.value)}
                        placeholder="Ex: 03"
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-800"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">Padrão: Microárea [número]</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Cor da Microárea:
                      </label>
                      <input
                        type="text"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        placeholder="Ex: Verde, Roxo, Laranja..."
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-800"
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">Ex: Verde, Roxo, Azul...</span>
                    </div>
                  </div>

                  {/* Live Badge Preview */}
                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-teal-200/60">
                    <span className="text-xs font-bold text-slate-700">Pré-visualização do Botão:</span>
                    <span
                      className={`inline-flex items-center gap-1 font-extrabold text-xs px-3 py-1 rounded-full border ${previewStyle.bg} ${previewStyle.text} ${previewStyle.border} shadow-2xs`}
                    >
                      {activeMicroareaTarget}
                    </span>
                  </div>
                </div>
              )}

              {/* Information Alert */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">O que acontece ao escolher e aplicar?</p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Ao escolher a Microárea (<strong>{activeMicroareaTarget}</strong>) e clicar em <strong>"Aplicar a Todos"</strong>, todos os <strong>{contacts.length} pacientes</strong> e <strong>{domiciles.length} domicílios</strong> cadastrados passarão a pertencer a esta Microárea, e os novos cadastros futuros também a utilizarão automaticamente!
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  disabled={isApplying}
                  onClick={() => handleConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-teal-600/20 transition disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {isApplying ? 'Aplicando Alteração...' : `Tornar Padrão ("${activeMicroareaTarget}") e Aplicar a TODOS (${contacts.length} Pacientes e ${domiciles.length} Domicílios)`}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={isApplying}
                  onClick={() => handleConfirm(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition disabled:opacity-50"
                >
                  <Settings className="h-3.5 w-3.5 text-slate-500" />
                  <span>Apenas Tornar Padrão para Novos Cadastros (Manter existentes)</span>
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
