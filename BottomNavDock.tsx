import React from 'react';
import { Calendar, Home, Users, MapPin, Activity } from 'lucide-react';
import { AppTheme } from '../utils/themeUtils';

interface BottomNavDockProps {
  activeTab: 'agenda' | 'domiciles' | 'patients' | 'route' | 'metrics';
  setActiveTab: (tab: 'agenda' | 'domiciles' | 'patients' | 'route' | 'metrics') => void;
  theme: AppTheme;
  visitCount?: number;
  domicileCount?: number;
  patientCount?: number;
}

export const BottomNavDock: React.FC<BottomNavDockProps> = ({
  activeTab,
  setActiveTab,
  theme,
  visitCount = 0,
  domicileCount = 0,
  patientCount = 0
}) => {
  const navItems = [
    {
      id: 'agenda' as const,
      label: 'Visitas',
      icon: Calendar,
      badge: visitCount > 0 ? visitCount : undefined
    },
    {
      id: 'domiciles' as const,
      label: 'Domicílios',
      icon: Home,
      badge: domicileCount > 0 ? domicileCount : undefined
    },
    {
      id: 'patients' as const,
      label: 'Munícipes',
      icon: Users,
      badge: patientCount > 0 ? patientCount : undefined
    },
    {
      id: 'route' as const,
      label: 'Rota GPS',
      icon: MapPin
    },
    {
      id: 'metrics' as const,
      label: 'e-SUS',
      icon: Activity
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-2 pb-2 pt-1 pointer-events-none flex justify-center">
      <nav
        className={`pointer-events-auto max-w-md w-full rounded-2xl shadow-2xl border border-white/20 p-1.5 flex items-center justify-around backdrop-blur-xl ${theme.footerBg} transition-all duration-300`}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition transform active:scale-90 ${
                isActive
                  ? 'bg-white/20 text-white font-black shadow-inner'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${isActive ? 'scale-110 text-amber-300' : 'opacity-80'}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-black h-3.5 min-w-[14px] px-1 rounded-full flex items-center justify-center border border-slate-900 shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight leading-none ${isActive ? 'font-extrabold text-white' : 'font-medium text-slate-300'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
