import React, { useState } from 'react';
import { GoogleContact, Domicile, TrashItem, CalendarEvent } from '../types';
import { processAndGroupContactsByCEP, ProcessResult } from '../utils/domicileGroupUtils';
import { Sparkles, Home, Building, CheckCircle2, AlertCircle, Loader2, RefreshCw, Users, MapPin, ExternalLink } from 'lucide-react';

interface AddressGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: GoogleContact[];
  domiciles: Domicile[];
  events?: CalendarEvent[];
  trashItems?: TrashItem[];
  onApplyGrouping: (updatedContacts: GoogleContact[], updatedDomiciles: Domicile[]) => void;
  isAuthenticatedWithGoogle?: boolean;
}

export const AddressGroupModal: React.FC<AddressGroupModalProps> = ({
  isOpen,
  onClose,
  contacts,
  domiciles,
  events = [],
  trashItems = [],
  onApplyGrouping,
  isAuthenticatedWithGoogle = false
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>('');

  if (!isOpen) return null;

  const handleRunProcessing = async () => {
    setIsProcessing(true);
    setSyncStatus('');
    try {
      const res = await processAndGroupContactsByCEP(contacts, domiciles, {
        autoCreateMissingDomiciles: true,
        trashItems,
        events
      });
      setResult(res);
    } catch (err: any) {
      console.error('Erro ao processar CEPs e agrupar domicílios:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyAndSync = async () => {
    if (!result) return;

    onApplyGrouping(result.updatedContacts, result.updatedDomiciles);

    if (isAuthenticatedWithGoogle) {
      setIsSyncingGoogle(true);
      setSyncStatus('Sincronizando campo "Empresa" e endereços no Google Contatos...');
      let successCount = 0;

      for (const contact of result.updatedContacts) {
        if (contact.id && contact.id.startsWith('people/')) {
          try {
            await fetch('/api/contacts', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(contact)
            });
            successCount++;
          } catch (e) {
            console.warn('Aviso ao atualizar contato no Google:', e);
          }
        }
      }
      setSyncStatus(`✅ ${successCount} contatos atualizados com sucesso no Google Contatos!`);
      setIsSyncingGoogle(false);
    }

    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-teal-600 to-emerald-500 text-white rounded-2xl shadow-md">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Agrupar Domicílios por CEP & Residência (Google Contatos)
              </h3>
              <p className="text-xs text-slate-500">
                Correção de CEP (com zero à esquerda), busca oficial na API ViaCEP e formação da composição familiar.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 rounded-lg hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        {/* Automatic Execution Notification Banner */}
        <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-3 text-xs text-emerald-900">
          <div className="p-1.5 bg-emerald-500 text-white rounded-xl shrink-0">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <strong className="block font-bold">⚡ Agrupamento em Tempo Real Ativo!</strong>
            <p className="text-[11px] text-emerald-800">
              Sempre que qualquer cadastro for realizado (manualmente ou importado de arquivo/fonte externa), o sistema realiza a normalização de CEP, consulta do ViaCEP, padronização do campo "Casa" e agrupa o morador ao domicílio <strong>automaticamente sem necessidade de cliques</strong>.
            </p>
          </div>
        </div>

        {/* Feature Highlights Banner */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-xs text-slate-700">
          <div className="flex items-start gap-2">
            <Building className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900">Campo "Casa" do Google Contatos:</strong> Será preenchido unicamente com <span className="bg-teal-100 text-teal-900 font-bold px-1.5 py-0.5 rounded">Logradouro + Número + Complemento</span> (ex: <i>Rua Moacir Sales Dávila, 385, Casa 2</i>).
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Home className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900">Normalização por CEP:</strong> Identifica a sequência de 7 dígitos (ex: <i>6288010</i>), adiciona o zero à esquerda suprimido no Excel (<span className="bg-emerald-100 text-emerald-900 font-bold px-1.5 py-0.5 rounded">06288010</span>) e corrige grafia de ruas via ViaCEP.
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Users className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-900">Composição Familiar Automática:</strong> Pessoas com o mesmo endereço oficial e número de casa serão automaticamente vinculadas ao mesmo Domicílio Cadastrado.
            </div>
          </div>
        </div>

        {/* Action Button */}
        {!result && (
          <div className="mt-6 text-center">
            <button
              onClick={handleRunProcessing}
              disabled={isProcessing}
              className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold rounded-2xl text-xs shadow-lg shadow-teal-600/20 transition flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Consultando ViaCEP e Processando {contacts.length} Contatos...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Iniciar Agrupamento por CEP & Preencher Residência</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Results Summary & Logs */}
        {result && (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-teal-50/60 p-3.5 rounded-2xl border border-teal-200/80 text-center text-xs">
              <div>
                <span className="text-[10px] text-teal-700 uppercase font-bold block">Contatos Analisados</span>
                <span className="text-base font-extrabold text-teal-900">{result.summary.totalContactsProcessed}</span>
              </div>
              <div>
                <span className="text-[10px] text-teal-700 uppercase font-bold block">CEPs Corrigidos (0 à esq.)</span>
                <span className="text-base font-extrabold text-emerald-700">{result.summary.cepFoundCount}</span>
              </div>
              <div>
                <span className="text-[10px] text-teal-700 uppercase font-bold block">Domicílios Criados</span>
                <span className="text-base font-extrabold text-blue-700">{result.summary.domicilesCreated}</span>
              </div>
              <div>
                <span className="text-[10px] text-teal-700 uppercase font-bold block">Domicílios Atualizados</span>
                <span className="text-base font-extrabold text-indigo-700">{result.summary.domicilesUpdated}</span>
              </div>
            </div>

            {/* Generated Domiciles Preview */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Home className="h-4 w-4 text-teal-600" /> Domicílios e Composições Familiares Formadas ({result.updatedDomiciles.length})
              </h4>

              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {result.updatedDomiciles.map((dom) => (
                  <div key={dom.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900">
                        📍 {dom.street}, {dom.number} {dom.complement ? `(${dom.complement})` : ''}
                      </span>
                      <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                        {dom.familyMembers.length} moradores
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {dom.familyMembers.map((m) => (
                        <span key={m.patientId} className="bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded text-[11px]">
                          👤 {m.patientName} {m.isHeadOfHousehold ? '(Responsável)' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Processing Logs */}
            <div>
              <h4 className="text-[11px] font-bold text-slate-500 mb-1">Log de Processamento e ViaCEP API:</h4>
              <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl text-[10px] font-mono max-h-32 overflow-y-auto space-y-1">
                {result.summary.details.map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
              </div>
            </div>

            {syncStatus && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{syncStatus}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyAndSync}
                disabled={isSyncingGoogle}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
              >
                {isSyncingGoogle ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Sincronizando com Google...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Confirmar e Salvar Domicílios / Casa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
