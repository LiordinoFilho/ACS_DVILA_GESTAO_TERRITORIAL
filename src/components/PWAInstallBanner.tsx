import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Check, Sparkles, Info, ExternalLink, Share, MoreVertical, PlusSquare, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('acs_pwa_banner_dismissed') === 'true';
  });
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>('android');
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    // Detect iframe
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }

    // Check if app is already running as standalone PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Auto detect platform tab
    const userAgent = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      setActiveTab('ios');
    } else if (/Android/.test(userAgent)) {
      setActiveTab('android');
    } else {
      setActiveTab('desktop');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // If inside iframe preview, open in new tab first so browser allows PWA install
    if (isInIframe) {
      window.open(window.location.href, '_blank');
      setShowModal(true);
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setShowModal(false);
        }
        setDeferredPrompt(null);
        return;
      } catch (err) {
        console.warn('Erro ao disparar prompt nativo PWA:', err);
      }
    }

    // Fallback: show interactive step-by-step instructions
    setShowModal(true);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    localStorage.setItem('acs_pwa_banner_dismissed', 'true');
  };

  if (isInstalled || isDismissed) return null;

  return (
    <>
      <div 
        onClick={() => handleInstallClick()}
        className="bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-900 text-white border-b border-emerald-500/30 px-4 py-2.5 flex items-center justify-between gap-3 text-xs shadow-md animate-fadeIn cursor-pointer hover:bg-slate-900/90 transition select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-xl shrink-0">
            <Smartphone className="h-4 w-4" />
          </div>
          <div className="truncate">
            <p className="font-extrabold text-emerald-300 flex items-center gap-1.5 truncate">
              <span>Instalar ACS D'Vila no Celular</span>
              <span className="bg-emerald-500 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded-full uppercase tracking-wider">PWA Nativo</span>
            </p>
            <p className="text-[11px] text-slate-300 truncate">
              {isInIframe
                ? 'Toque para abrir em janela própria e instalar com 1 clique'
                : 'Velocidade 0ms, acesso offline e ícone direto na tela inicial.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl transition shadow-sm flex items-center gap-1.5 text-xs cursor-pointer active:scale-95"
          >
            {isInIframe ? (
              <>
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Instalar (Abrir Aba)</span>
              </>
            ) : deferredPrompt ? (
              <>
                <Download className="h-3.5 w-3.5" />
                <span>Instalar Agora</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Como Instalar</span>
              </>
            )}
          </button>

          <button
            onClick={handleDismiss}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition"
            title="Fechar aviso"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Modal Guia de Instalação PWA */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-md w-full p-5 text-white shadow-2xl overflow-hidden relative">
            {/* Header Modal */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-emerald-300">Instalação PWA Nativo</h3>
                  <p className="text-xs text-slate-400">ACS D'Vila no seu dispositivo</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* If in iframe banner */}
            {isInIframe && (
              <div className="my-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <p className="font-semibold text-amber-300">Visualizando no Preview Incorporado</p>
                  <p className="text-[11px] text-amber-200/80 mt-0.5">
                    Os navegadores bloqueiam a instalação PWA dentro de quadros de preview. Abrimos uma nova aba para você.
                  </p>
                  <button
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="mt-2 px-3 py-1 bg-amber-500 text-slate-950 font-extrabold rounded-lg text-[11px] flex items-center gap-1 hover:bg-amber-400"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Abrir em Nova Aba Agora</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tabs Platform Selector */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 my-4 gap-1 text-xs">
              <button
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'android' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Android</span>
              </button>
              <button
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'ios' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>iPhone/iPad</span>
              </button>
              <button
                onClick={() => setActiveTab('desktop')}
                className={`flex-1 py-1.5 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'desktop' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Computador</span>
              </button>
            </div>

            {/* Instructions per Platform */}
            <div className="space-y-3 text-xs bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
              {activeTab === 'android' && (
                <ol className="space-y-2.5 list-decimal list-inside text-slate-300">
                  <li className="leading-relaxed">
                    Abra o site no navegador <strong className="text-white">Google Chrome</strong>.
                  </li>
                  <li className="leading-relaxed">
                    Toque no menu dos <strong className="text-emerald-400 inline-flex items-center gap-1"><MoreVertical className="h-3.5 w-3.5" /> 3 pontos</strong> no canto superior direito.
                  </li>
                  <li className="leading-relaxed">
                    Selecione a opção <strong className="text-emerald-300">"Instalar aplicativo"</strong> ou <strong className="text-emerald-300">"Adicionar à tela inicial"</strong>.
                  </li>
                  <li className="leading-relaxed">
                    Confirme em <strong className="text-white">Instalar</strong>. Pronto! O ícone ficará junto aos seus outros apps.
                  </li>
                </ol>
              )}

              {activeTab === 'ios' && (
                <ol className="space-y-2.5 list-decimal list-inside text-slate-300">
                  <li className="leading-relaxed">
                    Abra o site no navegador <strong className="text-white">Safari</strong> do seu iPhone ou iPad.
                  </li>
                  <li className="leading-relaxed">
                    Toque no botão de <strong className="text-emerald-400 inline-flex items-center gap-1"><Share className="h-3.5 w-3.5" /> Compartilhar</strong> (quadrado com seta para cima no menu inferior).
                  </li>
                  <li className="leading-relaxed">
                    Role a lista para baixo e toque em <strong className="text-emerald-300 inline-flex items-center gap-1"><PlusSquare className="h-3.5 w-3.5" /> Adicionar à Tela de Início</strong>.
                  </li>
                  <li className="leading-relaxed">
                    Toque em <strong className="text-white">Adicionar</strong> no canto superior direito.
                  </li>
                </ol>
              )}

              {activeTab === 'desktop' && (
                <ol className="space-y-2.5 list-decimal list-inside text-slate-300">
                  <li className="leading-relaxed">
                    No <strong className="text-white">Google Chrome</strong> ou <strong className="text-white">Microsoft Edge</strong>:
                  </li>
                  <li className="leading-relaxed">
                    Procure o ícone de instalação <strong className="text-emerald-400 inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" /> ⊕</strong> na barra de endereços (à direita do URL).
                  </li>
                  <li className="leading-relaxed">
                    Ou clique nos <strong className="text-emerald-400">3 pontos ⋮ ➔ Salvar e Compartilhar ➔ Instalar ACS D'Vila</strong>.
                  </li>
                </ol>
              )}
            </div>

            {/* Action buttons in modal */}
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition"
              >
                Entendi, fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

