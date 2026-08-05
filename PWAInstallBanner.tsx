import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Check, Sparkles, Info } from 'lucide-react';
import { logAuditEvent } from '../services/auditLogService';

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
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
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

    // Detect iOS Safari
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIos && !isStandalone) {
      setShowIosGuide(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        logAuditEvent('PWA_INSTALADO', 'SYSTEM', 'O aplicativo ACS D\'Vila foi instalado na Tela Inicial do celular.');
      }
      setDeferredPrompt(null);
    } catch (e) {
      console.warn('Erro ao instalar PWA:', e);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('acs_pwa_banner_dismissed', 'true');
  };

  if (isInstalled || isDismissed) return null;

  return (
    <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-900 text-white border-b border-emerald-500/30 px-4 py-2.5 flex items-center justify-between gap-3 text-xs shadow-md animate-fadeIn">
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
            {showIosGuide
              ? 'No Safari: Toque em Compartilhar ➔ "Adicionar à Tela de Início"'
              : 'Acesse offline sem internet, com velocidade 0ms e ícone na tela inicial.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl transition shadow-sm flex items-center gap-1.5 text-xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Instalar Agora</span>
          </button>
        )}

        <button
          onClick={handleDismiss}
          className="p-1 text-slate-400 hover:text-white rounded-lg transition"
          title="Fechar aviso"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
