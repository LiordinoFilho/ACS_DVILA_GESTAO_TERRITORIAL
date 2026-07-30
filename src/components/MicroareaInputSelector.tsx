import React, { useState, useEffect } from 'react';
import {
  getSavedMicroareas,
  cleanMicroareaName,
  getMicroareaStyle,
  formatCustomMicroarea,
  saveCustomMicroarea
} from '../types';
import { Tag, Sparkles, CheckCircle2 } from 'lucide-react';

interface MicroareaInputSelectorProps {
  value: string;
  onChange: (newMicroarea: string, isSetDefault: boolean) => void;
  label?: string;
  showApplyToAllCheckbox?: boolean;
  className?: string;
}

export const MicroareaInputSelector: React.FC<MicroareaInputSelectorProps> = ({
  value,
  onChange,
  label = 'Microárea *',
  showApplyToAllCheckbox = true,
  className = '',
}) => {
  const savedMicroareas = getSavedMicroareas();
  const cleanValue = cleanMicroareaName(value) || savedMicroareas[0] || 'Microárea 02 - Rosa';

  // Check if initial value matches a saved option or is custom
  const isCustomInitial = !savedMicroareas.includes(cleanValue);

  const [selectedOption, setSelectedOption] = useState<string>(
    isCustomInitial ? 'outros' : cleanValue
  );

  // States for custom entry
  const [customNum, setCustomNum] = useState(() => {
    if (isCustomInitial) {
      const match = cleanValue.match(/micro[áa]rea\s*([^-]+)/i);
      return match ? match[1].trim() : '03';
    }
    return '03';
  });

  const [customColor, setCustomColor] = useState(() => {
    if (isCustomInitial) {
      const parts = cleanValue.split('-');
      return parts.length > 1 ? parts[1].trim() : 'Verde';
    }
    return 'Verde';
  });

  const [isSetDefault, setIsSetDefault] = useState(false);

  // Keep internal option in sync if value prop changes from outside
  useEffect(() => {
    const cleaned = cleanMicroareaName(value);
    if (cleaned) {
      if (savedMicroareas.includes(cleaned)) {
        setSelectedOption(cleaned);
      } else {
        setSelectedOption('outros');
        const match = cleaned.match(/micro[áa]rea\s*([^-]+)/i);
        if (match) setCustomNum(match[1].trim());
        const parts = cleaned.split('-');
        if (parts.length > 1) setCustomColor(parts[1].trim());
      }
    }
  }, [value]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedOption(val);

    if (val === 'outros') {
      const formatted = formatCustomMicroarea(customNum, customColor);
      onChange(formatted, isSetDefault);
    } else {
      onChange(val, isSetDefault);
    }
  };

  const handleNumChange = (val: string) => {
    setCustomNum(val);
    const formatted = formatCustomMicroarea(val, customColor);
    saveCustomMicroarea(formatted);
    onChange(formatted, isSetDefault);
  };

  const handleColorChange = (val: string) => {
    setCustomColor(val);
    const formatted = formatCustomMicroarea(customNum, val);
    saveCustomMicroarea(formatted);
    onChange(formatted, isSetDefault);
  };

  const handleCheckboxChange = (checked: boolean) => {
    setIsSetDefault(checked);
    const currentFormatted =
      selectedOption === 'outros'
        ? formatCustomMicroarea(customNum, customColor)
        : selectedOption;
    onChange(currentFormatted, checked);
  };

  const currentFormattedMicroarea =
    selectedOption === 'outros'
      ? formatCustomMicroarea(customNum, customColor)
      : selectedOption;

  const currentStyle = getMicroareaStyle(currentFormattedMicroarea);

  return (
    <div className={`space-y-2.5 ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-slate-700">
          {label}
        </label>
      )}

      {/* Main Select Dropdown */}
      <select
        value={selectedOption}
        onChange={handleSelectChange}
        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium"
      >
        {savedMicroareas.map((m) => (
          <option key={m} value={m}>
            {cleanMicroareaName(m)}
          </option>
        ))}
        <option value="outros">➕ Outros (Digitar número e cor)...</option>
      </select>

      {/* Custom Inputs Panel when "Outros" is selected */}
      {selectedOption === 'outros' && (
        <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-2xl space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-teal-900">
            <Tag className="h-3.5 w-3.5 text-teal-600" />
            <span>Cadastrar Nova Microárea Personalizada:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Número da Microárea:
              </label>
              <input
                type="text"
                value={customNum}
                onChange={(e) => handleNumChange(e.target.value)}
                placeholder="Ex: 03"
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Padrão: Microárea 03</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Cor da Microárea:
              </label>
              <input
                type="text"
                value={customColor}
                onChange={(e) => handleColorChange(e.target.value)}
                placeholder="Ex: Verde, Roxo, Laranja..."
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Ex: Verde, Roxo, Azul...</span>
            </div>
          </div>

          {/* Live Preview Button/Badge in chosen color */}
          <div className="pt-1 flex items-center justify-between gap-2 border-t border-teal-200/60">
            <span className="text-[11px] font-bold text-slate-600">Pré-visualização do Botão:</span>
            <span
              className={`inline-flex items-center gap-1 font-extrabold text-xs px-3 py-1 rounded-full border ${currentStyle.bg} ${currentStyle.text} ${currentStyle.border} shadow-2xs`}
            >
              {currentFormattedMicroarea}
            </span>
          </div>

          {/* Checkbox to set as default and apply to all */}
          {showApplyToAllCheckbox && (
            <label className="flex items-center gap-2.5 pt-1.5 border-t border-teal-200/60 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isSetDefault}
                onChange={(e) => handleCheckboxChange(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 shrink-0"
              />
              <div className="text-[11px] text-teal-900 font-bold">
                Tornar esta Microárea padrão e aplicar para todos os cadastros
              </div>
            </label>
          )}
        </div>
      )}
    </div>
  );
};
