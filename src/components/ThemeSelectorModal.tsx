import React from 'react';
import { APP_THEMES, ThemeId, AppTheme } from '../utils/themeUtils';
import { Palette, X, Smartphone, Monitor, Check, Sparkles } from 'lucide-react';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThemeId: ThemeId;
  onSelectTheme: (id: ThemeId) => void;
  isMobileFrame: boolean;
  onToggleMobileFrame: (enable: boolean) => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  currentThemeId,
  onSelectTheme,
  isMobileFrame,
  onToggleMobileFrame
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-sky-500 to-teal-400 text-slate-950 rounded-2xl font-black shadow-md">
              <Palette className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Aparência & Moldura do Aplicativo
              </h2>
              <p className="text-xs text-slate-400">
                Escolha o tema de fundo em gradiente e o formato de exibição (Celular / Monitor).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* View Mode Toggle: Mobile Frame vs Desktop */}
        <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>Modo de Enquadramento de Tela:</span>
            <span className="text-[11px] text-emerald-400 font-mono">
              {isMobileFrame ? 'Moldura Smartphone Ativa' : 'Visão Total / Desktop'}
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onToggleMobileFrame(true)}
              className={`flex items-center justify-center gap-2.5 p-3.5 rounded-xl border text-xs font-bold transition ${
                isMobileFrame
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Smartphone className="h-5 w-5" />
              <div className="text-left">
                <p className="font-extrabold leading-none">Visão Celular (Smartphone)</p>
                <p className="text-[10px] text-slate-400 font-normal mt-0.5">Com Moldura & Dock Flutuante</p>
              </div>
            </button>

            <button
              onClick={() => onToggleMobileFrame(false)}
              className={`flex items-center justify-center gap-2.5 p-3.5 rounded-xl border text-xs font-bold transition ${
                !isMobileFrame
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-sm'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Monitor className="h-5 w-5" />
              <div className="text-left">
                <p className="font-extrabold leading-none">Visão Expandida (Desktop)</p>
                <p className="text-[10px] text-slate-400 font-normal mt-0.5">Aproveita 100% da Largura da Tela</p>
              </div>
            </button>
          </div>
        </div>

        {/* Background Gradient Themes Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-300 tracking-wider uppercase flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Temas de Fundo (Exemplos das Amostras)
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">5 Estilos de Gradiente</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {APP_THEMES.map((theme) => {
              const isSelected = theme.id === currentThemeId;
              return (
                <button
                  key={theme.id}
                  onClick={() => onSelectTheme(theme.id)}
                  className={`relative flex flex-col justify-between text-left p-4 rounded-2xl border transition overflow-hidden group ${
                    isSelected
                      ? 'border-emerald-400 ring-2 ring-emerald-500/30 bg-slate-800 shadow-lg'
                      : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                  }`}
                >
                  {/* Visual Background Gradient Strip */}
                  <div className={`h-16 w-full rounded-xl bg-gradient-to-b ${theme.previewGradient} mb-3 p-2.5 flex items-end justify-between border border-slate-300/30 shadow-inner`}>
                    <span className="text-[10px] font-bold text-slate-800 bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded-full shadow-xs">
                      {theme.styleTag}
                    </span>
                    {isSelected && (
                      <span className="bg-emerald-600 text-white p-1 rounded-full shadow-md">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-extrabold text-white group-hover:text-emerald-300 transition flex items-center gap-2">
                      {theme.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{theme.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs transition shadow-md"
          >
            Concluir & Salvar
          </button>
        </div>
      </div>
    </div>
  );
};
