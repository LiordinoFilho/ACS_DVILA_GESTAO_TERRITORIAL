import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, X, Loader2, CheckCircle2, ShieldCheck, AlertCircle, FileText, HeartPulse, User } from 'lucide-react';
import { GoogleContact } from '../types';

interface PatientAdviceModalProps {
  isOpen: boolean;
  patient: GoogleContact | null;
  onClose: () => void;
}

export const PatientAdviceModal: React.FC<PatientAdviceModalProps> = ({
  isOpen,
  patient,
  onClose
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [adviceData, setAdviceData] = useState<{ adviceList: string[]; summary: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && patient) {
      fetchAdvice();
    } else {
      setAdviceData(null);
      setError(null);
    }
  }, [isOpen, patient]);

  if (!isOpen || !patient) return null;

  const fetchAdvice = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const priorityTags = patient.healthProfile?.priorityTags || [];
      const ageCategory = patient.healthProfile?.ageCategory || 'Adulto';
      const conditionNotes = patient.notes || patient.healthProfile?.notes || '';

      const res = await fetch('/api/gemini/patient-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priorityTags,
          ageCategory,
          conditionNotes,
          visitReason: 'Visita Domiciliar de Rotina e Acompanhamento de Saúde'
        })
      });

      const body = await res.json();
      if (body.success && body.data) {
        setAdviceData(body.data);
      } else {
        throw new Error(body.error || 'Erro ao gerar orientações com IA');
      }
    } catch (e: any) {
      setError(e.message || 'Erro de conexão com o servidor de IA.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 text-slate-100 rounded-3xl border border-emerald-500/30 w-full max-w-lg shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-900/80 via-teal-900/90 to-slate-900 border-b border-emerald-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-extrabold shrink-0 shadow-lg shadow-emerald-900/40">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
                Orientações de Visita IA (Gemini)
              </h2>
              <p className="text-[11px] text-slate-300">
                Sugestões de abordagem domiciliar para o ACS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Patient Anon Header */}
        <div className="p-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="font-bold text-slate-200">{patient.name}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {patient.healthProfile?.priorityTags?.slice(0, 3).map((tag, idx) => (
              <span key={idx} className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* LGPD Badge */}
        <div className="bg-emerald-950/40 border-b border-emerald-800/30 px-4 py-1.5 flex items-center gap-2 text-[10px] text-emerald-200 shrink-0">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span>Processamento 100% anonimizado no servidor de acordo com a LGPD.</span>
        </div>

        {/* Content Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs font-sans">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
              <p className="text-slate-300 font-bold text-xs">Analisando o perfil e gerando orientações de visita...</p>
              <p className="text-slate-500 text-[11px]">O Gemini 3.6 está preparando os pontos de observação e escuta ativa para a sua Visita Domiciliar.</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="h-4 w-4 text-rose-400" />
                <span>Não foi possível gerar as orientações</span>
              </div>
              <p className="text-[11px] text-rose-200/90">{error}</p>
              <button
                onClick={fetchAdvice}
                className="mt-2 px-3 py-1.5 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-500 transition cursor-pointer"
              >
                Tentar Novamente
              </button>
            </div>
          ) : adviceData ? (
            <div className="space-y-4">
              {adviceData.summary && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500/30 rounded-2xl">
                  <p className="text-[11px] font-extrabold text-emerald-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <HeartPulse className="h-3.5 w-3.5" /> Síntese da Abordagem
                  </p>
                  <p className="text-xs text-slate-200 font-medium">{adviceData.summary}</p>
                </div>
              )}

              <div>
                <h3 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Pontos de Atenção para a Visita Domiciliar (VD):
                </h3>
                <div className="space-y-2">
                  {adviceData.adviceList?.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl flex items-start gap-2.5"
                    >
                      <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-300 font-black text-[11px] flex items-center justify-center shrink-0 border border-emerald-500/30 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed font-sans">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
