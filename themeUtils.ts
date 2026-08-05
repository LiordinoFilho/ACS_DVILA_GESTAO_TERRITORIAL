export type ThemeId = 'céu-límpido' | 'horizonte-azul' | 'oceano-serena' | 'nuvem-suave' | 'azul-precisão';

export interface AppTheme {
  id: ThemeId;
  name: string;
  subtitle: string;
  styleTag: string;
  bgGradient: string;
  cardBg: string;
  accentBg: string;
  accentText: string;
  borderAccent: string;
  footerBg: string;
  previewGradient: string;
}

export const APP_THEMES: AppTheme[] = [
  {
    id: 'oceano-serena',
    name: 'Oceano Serena',
    subtitle: 'Gradiente de Azul Marinho / Verde Água para Branco',
    styleTag: 'Refreshing, Calm, Coastal (Recomendado SUS)',
    bgGradient: 'bg-gradient-to-b from-teal-200/80 via-emerald-100/60 to-slate-100',
    cardBg: 'bg-white/90 backdrop-blur-md',
    accentBg: 'bg-emerald-600',
    accentText: 'text-emerald-700',
    borderAccent: 'border-emerald-300',
    footerBg: 'bg-teal-900/95 text-white',
    previewGradient: 'from-teal-300 via-emerald-200 to-white'
  },
  {
    id: 'céu-límpido',
    name: 'Céu Límpido',
    subtitle: 'Transição de Azul Claro para Branco',
    styleTag: 'Minimalist, Airy, Clean',
    bgGradient: 'bg-gradient-to-b from-sky-200/80 via-sky-100/60 to-slate-100',
    cardBg: 'bg-white/90 backdrop-blur-md',
    accentBg: 'bg-sky-600',
    accentText: 'text-sky-700',
    borderAccent: 'border-sky-300',
    footerBg: 'bg-sky-900/95 text-white',
    previewGradient: 'from-sky-200 via-sky-100 to-white'
  },
  {
    id: 'horizonte-azul',
    name: 'Horizonte Azul',
    subtitle: 'Gradiente Suave de Azul Azure',
    styleTag: 'Bright, Precise, Medical',
    bgGradient: 'bg-gradient-to-b from-sky-300/80 via-sky-100/60 to-slate-100',
    cardBg: 'bg-white/90 backdrop-blur-md',
    accentBg: 'bg-blue-600',
    accentText: 'text-blue-700',
    borderAccent: 'border-blue-300',
    footerBg: 'bg-sky-950/95 text-white',
    previewGradient: 'from-sky-300 via-blue-100 to-white'
  },
  {
    id: 'nuvem-suave',
    name: 'Nuvem Suave',
    subtitle: 'Quase Branco com Footer Suave',
    styleTag: 'Subtle, Soft, Pure',
    bgGradient: 'bg-gradient-to-b from-slate-200/70 via-slate-100/50 to-slate-50',
    cardBg: 'bg-white/95 backdrop-blur-md',
    accentBg: 'bg-slate-700',
    accentText: 'text-slate-800',
    borderAccent: 'border-slate-300',
    footerBg: 'bg-slate-900/95 text-white',
    previewGradient: 'from-slate-200 via-slate-100 to-white'
  },
  {
    id: 'azul-precisão',
    name: 'Azul de Precisão',
    subtitle: 'Gradiente Profundo de Azul Cobalt',
    styleTag: 'Cool, Structured, Modern',
    bgGradient: 'bg-gradient-to-b from-blue-400/80 via-blue-100/60 to-slate-100',
    cardBg: 'bg-white/90 backdrop-blur-md',
    accentBg: 'bg-indigo-600',
    accentText: 'text-indigo-700',
    borderAccent: 'border-indigo-300',
    footerBg: 'bg-blue-950/95 text-white',
    previewGradient: 'from-blue-400 via-blue-200 to-white'
  }
];

export const getSavedThemeId = (): ThemeId => {
  const saved = localStorage.getItem('acs_app_theme');
  if (saved && APP_THEMES.some((t) => t.id === saved)) {
    return saved as ThemeId;
  }
  return 'oceano-serena';
};

export const saveThemeId = (id: ThemeId) => {
  localStorage.setItem('acs_app_theme', id);
};

export const getThemeById = (id: ThemeId): AppTheme => {
  return APP_THEMES.find((t) => t.id === id) || APP_THEMES[0];
};
