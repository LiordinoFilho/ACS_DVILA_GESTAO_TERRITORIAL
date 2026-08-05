import React from 'react';
import { ShieldCheck, Calendar, Users, MapPin, Sparkles, ShieldAlert, HeartPulse, CheckCircle2, ArrowRight } from 'lucide-react';

interface LoginScreenProps {
  onLoginGoogle: () => void;
  onContinueDemo: () => void;
  isLoading?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginGoogle,
  onContinueDemo,
  isLoading = false,
}) => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-slate-950">
      {/* Decorative top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-lg shadow-emerald-500/20 shrink-0 overflow-hidden">
            <img src="/pwa-icon.jpg" alt="ACS D'Vila Logo" className="h-full w-full object-cover rounded-[14px]" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
              <span>ACS Território</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Saúde da Família
              </span>
            </h1>
            <p className="text-xs text-slate-400">Sistema Único de Saúde (SUS) &bull; Agente Comunitário</p>
          </div>
        </div>
      </header>

      {/* Main Content Hero */}
      <main className="relative z-10 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 flex flex-col justify-center items-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span>Plataforma Unificada com Integração Google Workspace</span>
        </div>

        {/* Heading */}
        <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight max-w-3xl">
          Acesso ao Sistema do Agente Comunitário de Saúde
        </h2>
        <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
          Faça login com sua <strong className="text-emerald-300 font-semibold">Conta Google</strong> para gerenciar visitas domiciliares, fichas de cadastros, mapas de rota e sincronizar contatos e agenda em tempo real.
        </p>

        {/* Login Action Cards */}
        <div className="mt-8 w-full max-w-md bg-slate-800/90 border border-slate-700/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md text-left flex flex-col gap-5">
          <div className="space-y-1 text-center">
            <h3 className="text-lg font-bold text-white">Entrar na sua Conta</h3>
            <p className="text-xs text-slate-400">Escolha a opção de login para acessar seu território</p>
          </div>

          {/* Google Login Primary Button */}
          <button
            onClick={onLoginGoogle}
            disabled={isLoading}
            className="w-full py-3.5 px-5 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-2xl transition shadow-lg flex items-center justify-center gap-3 border border-slate-200 active:scale-[0.98] disabled:opacity-50 text-sm"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{isLoading ? 'Conectando...' : 'Entrar com a Conta Google'}</span>
          </button>

          <div className="relative my-1 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700"></div></div>
            <span className="relative bg-slate-800 px-3 text-[11px] uppercase tracking-wider text-slate-400 font-bold">ou</span>
          </div>

          {/* Demo / Offline Mode Button */}
          <button
            onClick={onContinueDemo}
            className="w-full py-3 px-4 bg-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold rounded-2xl transition border border-slate-600/80 flex items-center justify-center gap-2 text-xs"
          >
            <span>Acessar no Modo Demonstração (Local / Offline)</span>
            <ArrowRight className="h-4 w-4 text-emerald-400" />
          </button>

          {/* Info Features */}
          <div className="pt-2 border-t border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Sincronização com Google Contatos (Cadastros)</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Agendamento Automático no Google Agenda</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Roteirização Inteligente no Google Maps</span>
            </div>
          </div>
        </div>

        {/* Features Highlights Grid */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full text-left">
          <div className="p-5 bg-slate-800/40 border border-slate-800 rounded-2xl flex flex-col gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl w-max">
              <Users className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Cadastros Domiciliares</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Organize famílias por logradouro, número, tipo de imóvel e vincule fichas individuais com CNS e contatos.
            </p>
          </div>

          <div className="p-5 bg-slate-800/40 border border-slate-800 rounded-2xl flex flex-col gap-2">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl w-max">
              <Calendar className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Agenda de Visitas Domiciliares</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Planeje horários para gestantes, hipertensos, diabéticos e acamados com status de acompanhamento.
            </p>
          </div>

          <div className="p-5 bg-slate-800/40 border border-slate-800 rounded-2xl flex flex-col gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl w-max">
              <MapPin className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Roteiro de Campo no Mapa</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Visualize pontos das visitas diárias e abra rotas no Google Maps diretamente do celular ou tablet.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 border-t border-slate-800/80 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span>Autenticação Segura via Google OAuth 2.0 &bull; SSL Criptografado</span>
        </div>
        <p>Desenvolvido para Agentes Comunitários de Saúde (ACS)</p>
      </footer>
    </div>
  );
};
