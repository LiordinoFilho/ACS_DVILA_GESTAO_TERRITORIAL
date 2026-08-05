import React from 'react';
import { UserProfile } from '../types';
import { formatBrasiliaDateDisplay, addDaysBrasilia, getBrasiliaDateStr } from '../utils/dateUtils';
import { Calendar, RefreshCw, MapPin, Users, LogOut, Sparkles, Home, Activity, HeartPulse, ShieldAlert, ExternalLink, ShieldCheck, HardDrive, Palette, Smartphone, Trash2, GitMerge, FileText, BellRing } from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';

// Official Google Contacts SVG Icon Component
const GoogleContactsIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="5" fill="#1A73E8" />
    <path d="M12 6C9.79 6 8 7.79 8 10C8 12.21 9.79 14 12 14C14.21 14 16 12.21 16 10C16 7.79 14.21 6 12 6ZM12 12C10.9 12 10 11.1 10 10C10 8.9 10.9 8 12 8C13.1 8 14 8.9 14 10C14 11.1 13.1 12 12 12Z" fill="white" />
    <path d="M12 15C9.33 15 4 16.34 4 19V20H20V19C20 16.34 14.67 15 12 15ZM18 18.5H6C6.58 17.61 9.4 16.5 12 16.5C14.6 16.5 17.42 17.61 18 18.5Z" fill="white" />
  </svg>
);

// Official Google Calendar SVG Icon Component
const GoogleCalendarIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="3" width="20" height="19" rx="4" fill="#FFFFFF" />
    <path d="M2 7C2 4.79086 3.79086 3 6 3H18C20.2091 3 22 4.79086 22 7V8H2V7Z" fill="#1A73E8" />
    <rect x="6" y="1" width="2" height="4" rx="1" fill="#4285F4" />
    <rect x="16" y="1" width="2" height="4" rx="1" fill="#4285F4" />
    <text x="12" y="18" textAnchor="middle" fill="#1967D2" fontSize="9" fontWeight="900" fontFamily="sans-serif">31</text>
  </svg>
);

// Official SISSAMB Osasco SVG Icon Component
const SissambIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="5" fill="#00875A" />
    <path d="M12 4C7.58 4 4 7.58 4 12C4 16.42 7.58 20 12 20C16.42 20 20 16.42 20 12C20 7.58 16.42 4 12 4ZM16 13H13V16H11V13H8V11H11V8H13V11H16V13Z" fill="white" />
    <circle cx="12" cy="12" r="8.5" stroke="#E6F4EA" strokeWidth="1" strokeDasharray="2 2" fill="none" />
  </svg>
);

// Official CADSUS / Cartão SUS SVG Icon Component
const CadSusIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="5" fill="#005CA9" />
    <path d="M10 5H14V10H19V14H14V19H10V14H5V10H10V5Z" fill="#FFFFFF" />
    <path d="M11 6H13V11H18V13H13V18H11V13H6V11H11V6Z" fill="#00A3E0" />
    <circle cx="17.5" cy="6.5" r="1.5" fill="#FFCD00" />
    <circle cx="6.5" cy="17.5" r="1.5" fill="#009B3A" />
  </svg>
);

// Official CientíficaLab SVG Icon Component
const CientificaLabIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="5" fill="#00838F" />
    <path d="M11 5V9.17L7.22 15.48C6.67 16.4 7.33 17.5 8.4 17.5H15.6C16.67 17.5 17.33 16.4 16.78 15.48L13 9.17V5H14V3.5H10V5H11Z" fill="white" />
    <path d="M9.5 13.5L14.5 13.5L15.6 15.3C15.8 15.6 15.6 16 15.2 16H8.8C8.4 16 8.2 15.6 8.4 15.3L9.5 13.5Z" fill="#80DEEA" />
    <circle cx="12" cy="11" r="1" fill="#FFFFFF" />
  </svg>
);

// Trava Indestrutível do Logo do App (SVG Nativo + Image Error Fallback)
const ACSAppLogo: React.FC = () => {
  const [imgError, setImgError] = React.useState(false);

  return (
    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-xs shadow-emerald-500/20 shrink-0 overflow-hidden relative">
      {!imgError ? (
        <img
          src="/pwa-icon.jpg"
          alt="ACS D'Vila Logo"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover rounded-[10px]"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-emerald-700 to-teal-900 flex flex-col items-center justify-center text-white rounded-[10px] select-none p-1">
          <svg className="w-5 h-5 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[7.5px] font-black tracking-tighter leading-none text-emerald-200 mt-0.5">ACS</span>
        </div>
      )}
    </div>
  );
};

interface HeaderProps {
  user: UserProfile;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onConnectGoogle: () => void;
  onOpenSecurityAndBackup?: () => void;
  onOpenAuditLogs?: () => void;
  onOpenThemeSelector?: () => void;
  onOpenDuplicateMerger?: () => void;
  duplicateCount?: number;
  onOpenTrash?: () => void;
  trashCount?: number;
  onLogout: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  activeTab: 'agenda' | 'domiciles' | 'patients' | 'route' | 'metrics';
  setActiveTab: (tab: 'agenda' | 'domiciles' | 'patients' | 'route' | 'metrics') => void;
  domicileCount?: number;
  patientCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  selectedDate,
  onDateChange,
  onConnectGoogle,
  onOpenSecurityAndBackup,
  onOpenAuditLogs,
  onOpenThemeSelector,
  onOpenDuplicateMerger,
  duplicateCount = 0,
  onOpenTrash,
  trashCount = 0,
  onLogout,
  onRefresh,
  isLoading,
  activeTab,
  setActiveTab,
  domicileCount = 0,
  patientCount = 0
}) => {

  const formatDateDisplay = (dateStr: string) => {
    return formatBrasiliaDateDisplay(dateStr);
  };

  const setDateOffset = (offsetDays: number) => {
    const nextDate = addDaysBrasilia(selectedDate, offsetDays);
    onDateChange(nextDate);
  };

  const setToday = () => {
    onDateChange(getBrasiliaDateStr());
  };

  return (
    <header className="bg-white/95 backdrop-blur-md text-slate-800 border-b border-slate-200/90 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Row 1: Top bar with Branding & App Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between py-2.5 gap-3 border-b border-slate-100">
          <div className="flex items-center gap-3 justify-between md:justify-start">
            <div className="flex items-center gap-2.5">
              <ACSAppLogo />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                    ACS D'Vila <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200/80">Território & Saúde</span>
                  </h1>
                </div>
                <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <span className="text-emerald-700 font-bold">Agente Comunitário de Saúde</span>
                  <span className="text-slate-300">•</span>
                  <span>Google Contatos / Agenda / Maps</span>
                </p>
              </div>
            </div>

            {/* Mobile sync button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="md:hidden p-2 rounded-lg bg-slate-100 text-slate-700 hover:text-slate-900 transition border border-slate-200"
              title="Sincronizar"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>

          {/* User Auth & Main Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap md:flex-nowrap justify-end">
            {onOpenSecurityAndBackup && (
              <div className="flex items-center gap-0.5 bg-teal-50/80 border border-teal-200/80 p-0.5 rounded-xl">
                <button
                  onClick={onOpenSecurityAndBackup}
                  className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Segurança</span>
                </button>
                <InfoTooltip
                  title="Backup & Segurança"
                  content="Gerencie backup no Google Drive, exportação local em JSON, restauração de emergência e código PIN da LGPD."
                />
              </div>
            )}

            {onOpenAuditLogs && (
              <div className="flex items-center gap-0.5 bg-indigo-50/80 border border-indigo-200/80 p-0.5 rounded-xl">
                <button
                  onClick={onOpenAuditLogs}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Auditoria</span>
                </button>
                <InfoTooltip
                  title="Logs de Auditoria e-SUS"
                  content="Histórico de alterações e auditoria em background para prestação de contas no e-SUS e relatórios."
                />
              </div>
            )}

            {onOpenThemeSelector && (
              <div className="flex items-center gap-0.5 bg-sky-50/80 border border-sky-200/80 p-0.5 rounded-xl">
                <button
                  onClick={onOpenThemeSelector}
                  className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs"
                >
                  <Palette className="h-3.5 w-3.5" />
                  <span>Tema</span>
                </button>
                <InfoTooltip
                  title="Personalização Visual"
                  content="Personalize cores do mapa territorial, temas gradientes e modo de exibição em tela cheia ou moldura mobile."
                />
              </div>
            )}

            {onOpenDuplicateMerger && (
              <div className="flex items-center gap-0.5 bg-amber-50/80 border border-amber-200/80 p-0.5 rounded-xl">
                <button
                  onClick={onOpenDuplicateMerger}
                  className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-extrabold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs relative"
                >
                  <GitMerge className="h-3.5 w-3.5 text-slate-950" />
                  <span>Unificar</span>
                  {duplicateCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[10px] font-black rounded-full animate-pulse">
                      {duplicateCount}
                    </span>
                  )}
                </button>
                <InfoTooltip
                  title="Unificação Inteligente"
                  content="Identifica e mescla cadastros duplicados (mesmo CPF, CNS ou Nome) reatrelando o histórico de visitas ao cadastro principal."
                />
              </div>
            )}

            {onOpenTrash && (
              <div className="flex items-center gap-0.5 bg-rose-50/80 border border-rose-200/80 p-0.5 rounded-xl">
                <button
                  onClick={onOpenTrash}
                  className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs relative"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Lixeira</span>
                  {trashCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-white text-rose-700 text-[10px] font-black rounded-full">
                      {trashCount}
                    </span>
                  )}
                </button>
                <InfoTooltip
                  title="Lixeira Segura"
                  content="Recupere munícipes, residências e visitas excluídas acidentalmente com retenção configurável."
                />
              </div>
            )}

            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold border border-slate-700 transition shadow-2xs shrink-0 cursor-pointer"
              title="Sincronizar com Google Contatos e Agenda"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-emerald-400' : 'text-slate-300'}`} />
              Sincronizar
            </button>

            {user.isAuthenticated ? (
              <div className="flex items-center gap-2 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 shrink-0">
                {user.picture ? (
                  <img src={user.picture} alt={user.name} className="h-6 w-6 rounded-full border border-emerald-500 shadow-2xs" />
                ) : (
                  <div className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0)}
                  </div>
                )}
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-bold text-slate-800 leading-none">{user.name}</p>
                  <p className="text-[10px] text-slate-500">{user.email}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="p-1 text-slate-400 hover:text-rose-600 transition ml-0.5"
                  title="Sair do Google"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden lg:inline-flex items-center gap-1 text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-bold">
                  <Sparkles className="h-3 w-3 text-amber-600" /> Modo ACS Ativo
                </span>
                <button
                  onClick={onConnectGoogle}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs transition shadow-xs"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Conectar Google
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Direct External Apps & Health Systems Links + Status Pill */}
        <div className="flex flex-col md:flex-row items-center justify-between py-2 gap-2 border-b border-slate-100">
          {/* Direct External Apps & Health Systems Quick Links */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full py-0.5 w-full md:w-auto">
            <a
              href="https://contacts.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-blue-50/80 text-slate-700 hover:text-blue-900 rounded-xl text-xs font-bold border border-slate-200 hover:border-blue-300 transition shadow-2xs group shrink-0"
              title="Abrir Google Contatos diretamente em uma nova aba ou aplicativo do celular"
            >
              <GoogleContactsIcon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
              <span className="hidden lg:inline">Google Contatos</span>
              <span className="lg:hidden">Contatos</span>
              <ExternalLink className="h-3 w-3 text-blue-500 opacity-80 group-hover:opacity-100" />
            </a>

            <a
              href="https://calendar.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-blue-50/80 text-slate-700 hover:text-blue-900 rounded-xl text-xs font-bold border border-slate-200 hover:border-blue-300 transition shadow-2xs group shrink-0"
              title="Abrir Google Agenda diretamente em uma nova aba ou aplicativo do celular"
            >
              <GoogleCalendarIcon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
              <span className="hidden lg:inline">Google Agenda</span>
              <span className="lg:hidden">Agenda</span>
              <ExternalLink className="h-3 w-3 text-blue-500 opacity-80 group-hover:opacity-100" />
            </a>

            <a
              href="https://sissamb.osasco.sp.gov.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-emerald-50/80 text-slate-700 hover:text-emerald-900 rounded-xl text-xs font-bold border border-slate-200 hover:border-emerald-300 transition shadow-2xs group shrink-0"
              title="Abrir SISSAMB Saúde Osasco diretamente em uma nova aba ou aplicativo"
            >
              <SissambIcon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
              <span className="hidden lg:inline">SISSAMB Osasco</span>
              <span className="lg:hidden">SISSAMB</span>
              <ExternalLink className="h-3 w-3 text-emerald-600 opacity-80 group-hover:opacity-100" />
            </a>

            <a
              href="https://cadastro.saude.gov.br/segcartao/?contextType=external&username=string&contextValue=%2Foam&password=sercure_string&challenge_url=https%3A%2F%2Fcadastro.saude.gov.br%2Fsegcartao&request_id=8285361639685691817&authn_try_count=0&locale=pt_BR&resource_url=http%253A%252F%252Fcadastro.saude.gov.br%252Fnovocartao%252Frestrito%252FusuarioConsulta.jsp"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-sky-50/80 text-slate-700 hover:text-sky-900 rounded-xl text-xs font-bold border border-slate-200 hover:border-sky-300 transition shadow-2xs group shrink-0"
              title="Abrir CADSUS / Cartão Nacional de Saúde (Ministério da Saúde)"
            >
              <CadSusIcon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
              <span className="hidden lg:inline">Cartão SUS (CADSUS)</span>
              <span className="lg:hidden">CADSUS</span>
              <ExternalLink className="h-3 w-3 text-sky-600 opacity-80 group-hover:opacity-100" />
            </a>

            <a
              href="https://laudos.cientificalab.com.br/laudos/sair/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-cyan-50/80 text-slate-700 hover:text-cyan-900 rounded-xl text-xs font-bold border border-slate-200 hover:border-cyan-300 transition shadow-2xs group shrink-0"
              title="Abrir Sistema de Laudos CientíficaLab"
            >
              <CientificaLabIcon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
              <span className="hidden lg:inline">Laudos CientíficaLab</span>
              <span className="lg:hidden">CientíficaLab</span>
              <ExternalLink className="h-3 w-3 text-cyan-600 opacity-80 group-hover:opacity-100" />
            </a>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100/90 border border-slate-200 text-xs shrink-0">
            <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Modo Off-line Ativo
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1 text-teal-800 font-bold">
              <Home className="h-3.5 w-3.5 text-teal-600" /> Domicílios ({domicileCount})
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1 text-emerald-800 font-bold">
              <Users className="h-3.5 w-3.5 text-emerald-600" /> Munícipes ({patientCount})
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1 text-amber-800 font-bold">
              <MapPin className="h-3.5 w-3.5 text-amber-600" /> Maps
            </span>
          </div>
        </div>

        {/* Date Selector & Navigation Tabs */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between py-2.5 gap-3">
          {/* Date Picker Bar */}
          <div className="flex items-center justify-between bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/90 gap-2 shadow-2xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDateOffset(-1)}
                className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-xl text-xs transition font-bold"
                title="Dia anterior"
              >
                &larr; Ontem
              </button>
              <button
                onClick={setToday}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition shadow-2xs"
              >
                Hoje
              </button>
              <button
                onClick={() => setDateOffset(1)}
                className="px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-xl text-xs transition font-bold"
                title="Próximo dia"
              >
                Amanhã &rarr;
              </button>
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && onDateChange(e.target.value)}
                className="bg-white text-slate-800 text-xs px-2.5 py-1 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-semibold shadow-2xs"
              />
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/90 overflow-x-auto shadow-2xs">
            <button
              onClick={() => setActiveTab('agenda')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                activeTab === 'agenda'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Calendar className="h-4 w-4" />
              Visitas Domiciliares
            </button>

            <button
              onClick={() => setActiveTab('domiciles')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                activeTab === 'domiciles'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Home className="h-4 w-4" />
              Cadastro Domiciliar & Família
            </button>

            <button
              onClick={() => setActiveTab('patients')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                activeTab === 'patients'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Users className="h-4 w-4" />
              Cadastro Individual (Munícipes)
            </button>

            <button
              onClick={() => setActiveTab('route')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                activeTab === 'route'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <MapPin className="h-4 w-4" />
              Rotas no Google Maps
            </button>

            <button
              onClick={() => setActiveTab('metrics')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                activeTab === 'metrics'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Activity className="h-4 w-4" />
              Indicadores e-SUS
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
