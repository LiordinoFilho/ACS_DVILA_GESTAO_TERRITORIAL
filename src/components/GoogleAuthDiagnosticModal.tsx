import React, { useState, useEffect } from 'react';
import { getAccessToken } from '../lib/firebaseAuth';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink,
  Lock,
  Globe,
  Cookie,
  Key,
  X
} from 'lucide-react';

interface DiagnosticData {
  timestamp: string;
  configured: boolean;
  clientIdPreview: string | null;
  appUrl: string;
  redirectUri: string;
  cookiesReceived: string[];
  hasTokenCookie: boolean;
  hasTokenHeader: boolean;
  isAuthenticated: boolean;
  testUserResult: { success: boolean; email?: string; name?: string; error?: string } | null;
  testContactsResult: { success: boolean; count?: number; error?: string } | null;
  testCalendarResult: { success: boolean; count?: number; error?: string } | null;
  logs: string[];
}

interface GoogleAuthDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecheckAuth: () => void;
}

export const GoogleAuthDiagnosticModal: React.FC<GoogleAuthDiagnosticModalProps> = ({
  isOpen,
  onClose,
  onRecheckAuth
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [copied, setCopied] = useState(false);
  const [popupStatus, setPopupStatus] = useState<string>('Não testado');

  const runDiagnostic = async () => {
    setLoading(true);
    try {
      const token = getAccessToken();
      const storedTokens = localStorage.getItem('google_tokens');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['X-Google-Tokens'] = storedTokens || JSON.stringify({ access_token: token });
      } else if (storedTokens) {
        headers['X-Google-Tokens'] = typeof storedTokens === 'string' ? storedTokens : JSON.stringify(storedTokens);
        try {
          const parsed = typeof storedTokens === 'string' ? JSON.parse(storedTokens) : storedTokens;
          if (parsed.access_token) {
            headers['Authorization'] = `Bearer ${parsed.access_token}`;
          }
        } catch (e) {}
      }

      const res = await fetch('/api/debug/auth', { headers });
      const json: DiagnosticData = await res.json();
      setData(json);
    } catch (err: any) {
      console.error('Erro ao executar diagnóstico:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostic();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestPopup = () => {
    setPopupStatus('Testando abertura...');
    try {
      const testWin = window.open('about:blank', 'test_popup_check', 'width=300,height=300');
      if (!testWin || testWin.closed || typeof testWin.closed === 'undefined') {
        setPopupStatus('🔴 BLOQUEADO: Seu navegador bloqueou a janela Popup! Ative as permissões de Popups no navegador.');
      } else {
        testWin.close();
        setPopupStatus('🟢 PERMITIDO: As janelas Popups estão autorizadas no seu navegador.');
      }
    } catch (e: any) {
      setPopupStatus(`🔴 ERRO: ${e.message || String(e)}`);
    }
  };

  const handleCopyLogs = () => {
    if (!data) return;
    const clientLogs = [
      `=== RELATÓRIO DE DIAGNÓSTICO GOOGLE OAUTH ===`,
      `Data/Hora: ${data.timestamp}`,
      `Origem do Navegador: ${window.location.origin}`,
      `Status do Popup: ${popupStatus}`,
      `Token LocalStorage: ${localStorage.getItem('google_tokens') ? 'Presente' : 'Ausente'}`,
      `Cookies Habilitados: ${navigator.cookieEnabled ? 'SIM' : 'NÃO'}`,
      `---------------------------------------------`,
      ...data.logs
    ].join('\n');

    navigator.clipboard.writeText(clientLogs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDirectConnect = async () => {
    try {
      const res = await fetch('/api/auth/url');
      const info = await res.json();
      if (info.url) {
        window.open(info.url, '_blank');
      } else {
        window.open('/api/auth/google', '_blank');
      }
    } catch (e) {
      window.open('/api/auth/google', '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
              <ShieldAlert className="h-6 w-6 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Diagnóstico de Conexão Google</h2>
              <p className="text-xs text-indigo-200">
                Inspeção em tempo real de OAuth, Popups, Cookies e APIs do Google
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Quick Checks Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Key className="h-3.5 w-3.5 text-indigo-600" /> Credenciais Server
              </span>
              <div className="mt-2 flex items-center gap-1.5">
                {data?.configured ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-800">OAuth Configurado</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-800">Credenciais Ausentes</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Cookie className="h-3.5 w-3.5 text-indigo-600" /> Session / Cookies
              </span>
              <div className="mt-2 flex items-center gap-1.5">
                {data?.hasTokenCookie || data?.hasTokenHeader ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-800">Token Recebido</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-800">Sem Token Ativo</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-indigo-600" /> Google Contatos
              </span>
              <div className="mt-2 flex items-center gap-1.5">
                {data?.testContactsResult?.success ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-slate-800">Sincronizado</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-slate-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-800">Desconectado</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Popup & Cookies Browser Inspector */}
          <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-indigo-600" /> Testar Bloqueadores do Navegador (Popups e Cookies)
            </h3>
            <p className="text-xs text-indigo-950 leading-relaxed">
              Alguns navegadores ou extensões bloqueiam janelas popups ou cookies de terceiros em iFrames. Clique no botão abaixo para verificar se o seu navegador permite a abertura da janela do Google.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleTestPopup}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
              >
                Testar Abertura de Popup
              </button>
              <span className="text-xs font-semibold text-slate-700">{popupStatus}</span>
            </div>
          </div>

          {/* Console / Terminal Log Output */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Log do Servidor e Diagnóstico detalhado:
              </span>
              <button
                onClick={runDiagnostic}
                disabled={loading}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Atualizar Diagnóstico</span>
              </button>
            </div>

            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800 max-h-60 overflow-y-auto">
              {loading ? (
                <div className="text-slate-400 animate-pulse">Executando verificações de rede no servidor e nas APIs Google...</div>
              ) : (
                data?.logs?.map((line, idx) => (
                  <div
                    key={idx}
                    className={
                      line.includes('ERRO') || line.includes('NÃO')
                        ? 'text-red-400'
                        : line.includes('OK') || line.includes('SIM')
                        ? 'text-emerald-400'
                        : line.startsWith('[')
                        ? 'text-indigo-300 font-bold mt-2'
                        : 'text-slate-300'
                    }
                  >
                    {line}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Recommendations */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
            <p className="font-bold">💡 O que fazer se não estiver conectando?</p>
            <ul className="list-disc pl-4 space-y-1 text-amber-800">
              <li>Clique no botão <strong>"Conectar em Nova Aba"</strong> abaixo para realizar o login diretamente sem restrições de iFrame.</li>
              <li>Copie o relatório de diagnóstico e nos forneça o texto para sabermos o código de erro exato retornado pelo Google.</li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={handleCopyLogs}
            disabled={!data}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>{copied ? 'Copiado!' : 'Copiar Relatório de Log'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDirectConnect}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Conectar em Nova Aba</span>
            </button>
            <button
              onClick={() => {
                runDiagnostic();
                onRecheckAuth();
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              Re-verificar Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
