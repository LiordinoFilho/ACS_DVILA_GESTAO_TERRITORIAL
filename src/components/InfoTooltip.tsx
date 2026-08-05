import React, { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';

interface InfoTooltipProps {
  content: string;
  title?: string;
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ content, title, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-flex items-center shrink-0 ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer focus:outline-none"
        title="Informações adicionais"
        aria-label="Informações"
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs border border-slate-700 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
            <span className="font-bold text-amber-300 flex items-center gap-1 text-[11px] uppercase tracking-wide">
              <Info className="h-3 w-3" />
              {title || 'Informação do Recurso'}
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="p-0.5 text-slate-400 hover:text-white rounded"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <p className="text-slate-200 leading-relaxed text-[11px] font-normal">{content}</p>
          {/* Arrow indicator */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
};
