import React, { useState } from 'react';
import { Lock, ShieldCheck, Check, FileText } from 'lucide-react';

interface LGPDModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

export const LGPDModal: React.FC<LGPDModalProps> = ({ isOpen, onAccept }) => {
  const [showFullDetails, setShowFullDetails] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="max-w-md w-full bg-[#181e2e] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 flex flex-col items-center relative overflow-hidden">
        {/* Subtle decorative glow accent */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Golden Padlock Icon Frame matching user screenshot */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center mb-5 shadow-inner">
          <Lock className="h-8 w-8 text-amber-400" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-black tracking-tight text-white mb-4 text-center">
          Aviso de Privacidade (LGPD)
        </h2>

        {/* Main Body Description */}
        <div className="text-xs sm:text-sm text-slate-300 leading-relaxed text-center space-y-3.5 mb-6">
          <p>
            Este aplicativo funciona <strong className="text-white font-bold">100% offline</strong> e integrado de forma privada ao seu ecossistema Google. Todos os dados sensíveis dos munícipes, famílias e visitas ficam salvos <strong className="text-amber-300 font-bold">exclusivamente na memória do seu aparelho</strong> e na sua conta do Google.
          </p>
          
          <p className="bg-slate-800/80 border border-slate-700/60 p-3 rounded-2xl text-slate-200 text-xs text-left">
            <span className="font-bold text-amber-400 block mb-1">⚖️ Responsabilidade do Operador (LGPD):</span>
            Você é o <strong className="text-white">único responsável e operador dos dados</strong> (Lei nº 13.709/2018) pela guarda, sigilo e uso ético dessas informações de saúde no território, na qualidade de titular da conta e Agente Comunitário de Saúde (ACS).
          </p>

          <p className="text-xs text-slate-400">
            Recomendamos realizar backups periódicos diretamente no seu Google Drive ou em arquivo local em <strong className="text-slate-300">Backup & Segurança</strong>.
          </p>
        </div>

        {/* Expanded Details Section toggle */}
        {showFullDetails && (
          <div className="w-full bg-slate-900/90 border border-slate-700/80 rounded-2xl p-3.5 mb-5 text-[11px] text-slate-300 text-left space-y-2 max-h-40 overflow-y-auto">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400 mb-1">
              <ShieldCheck className="h-4 w-4" />
              <span>Diretrizes de Segurança do ACS D'Vila:</span>
            </div>
            <ul className="list-disc pl-4 space-y-1 text-slate-300">
              <li>Nenhum dado de pacientes é vendido, compartilhado ou enviado a servidores terceiros.</li>
              <li>O controle de acesso é restrito através do login da sua conta corporativa Google e PIN de segurança opcional.</li>
              <li>Em caso de perda ou troca de aparelho, restaure seus dados facilmente utilizando o arquivo de backup `.acsbackup`.</li>
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowFullDetails(!showFullDetails)}
          className="text-xs font-semibold text-slate-400 hover:text-slate-200 underline mb-5 flex items-center gap-1"
        >
          <FileText className="h-3.5 w-3.5" />
          <span>{showFullDetails ? 'Ocultar detalhes legais' : 'Ler mais detalhes sobre a LGPD'}</span>
        </button>

        {/* Primary Accept Button */}
        <button
          type="button"
          onClick={onAccept}
          className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm rounded-2xl shadow-lg transition transform active:scale-98 flex items-center justify-center gap-2 border border-blue-400/40 cursor-pointer"
        >
          <Check className="h-5 w-5 stroke-[3]" />
          <span>Li e Aceito os Termos</span>
        </button>
      </div>
    </div>
  );
};
