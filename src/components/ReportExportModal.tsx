import React, { useState, useMemo } from 'react';
import { GoogleContact, Domicile, cleanMicroareaName } from '../types';
import { calculateAge, getContactStreet, getUniqueStreets, exportPatientsToExcel } from '../utils/exportUtils';
import { Printer, Download, FileSpreadsheet, X, Search, Filter, ShieldCheck, MapPin, CheckCircle2 } from 'lucide-react';

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: GoogleContact[];
  domiciles: Domicile[];
  initialCategory?: string;
  initialStreet?: string;
}

export const CATEGORY_OPTIONS = [
  { id: 'todos', label: 'Todos os Pacientes' },
  { id: 'gestante', label: '🤰 Gestantes' },
  { id: 'puerpera', label: '🌸 Puérperas' },
  { id: 'hipertenso', label: '🩺 Hipertensos (HAS)' },
  { id: 'diabetico', label: '🩸 Diabéticos (DM)' },
  { id: 'insulino', label: '💉 InsulinoDependente' },
  { id: 'acamado', label: '🛏️ Acamados / Domiciliados' },
  { id: 'crianca', label: '👶 Crianças (0-2 anos)' },
  { id: 'idoso', label: '👴 Idosos (60+ anos)' },
  { id: 'deficiencia', label: '♿ PCD / Deficiência' },
  { id: 'saude_mental', label: '🧠 Saúde Mental' },
  { id: 'alcool', label: '🍺 Álcool' },
  { id: 'outras_drogas', label: '💊 Outras Drogas' },
  { id: 'tabagista', label: '🚬 Tabagista' },
  { id: 'asma', label: '🫁 Asma' },
  { id: 'dpoc', label: '🫁 DPOC' },
  { id: 'sintomaticos_resp', label: '🫁 Sintomático Respiratório' },
  { id: 'oxigenio', label: '🫁 Oxigênio Dependente' },
  { id: 'cancer', label: '🧬 Câncer' },
  { id: 'hanseniase', label: '🦠 Hanseníase' },
  { id: 'sifilis', label: '🦠 Sífilis' },
  { id: 'tuberculose', label: '🦠 Tuberculose' },
  { id: 'desnutricao', label: '🍲 Desnutrição' },
  { id: 'paliativos', label: '🏥 Cuidados Paliativos' },
  { id: 'doencas_cronicas', label: '🏥 Doenças Crônicas' },
  { id: 'bolsa_familia', label: '🏷️ Bolsa Família' },
  { id: 'vulnerabilidade', label: '🏷️ Vulnerabilidade Social' },
  { id: 'cadweb', label: '📋 Cad. Siss/Cadweb' },
  { id: 'vacina_gripe', label: '💉 Vacina Gripe Domiciliar' }
];

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  isOpen,
  onClose,
  contacts,
  domiciles,
  initialCategory = 'todos',
  initialStreet = 'todas'
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedStreet, setSelectedStreet] = useState<string>(initialStreet);
  const [selectedMicroarea, setSelectedMicroarea] = useState<string>('todas');

  if (!isOpen) return null;

  // Extract unique streets in territory
  const streets = getUniqueStreets(contacts, domiciles);

  // Filter patients based on selected Category + Street + Microarea
  const filteredPatients = contacts.filter((c) => {
    const hp = c.healthProfile;

    // 1. Category Filter
    let matchesCategory = true;
    if (selectedCategory === 'gestante') matchesCategory = !!hp?.isPregnant;
    else if (selectedCategory === 'puerpera') matchesCategory = !!hp?.isPuerpera;
    else if (selectedCategory === 'hipertenso') matchesCategory = !!hp?.isHypertensive;
    else if (selectedCategory === 'diabetico') matchesCategory = !!hp?.isDiabetic;
    else if (selectedCategory === 'insulino') matchesCategory = !!hp?.isInsulinDependent;
    else if (selectedCategory === 'acamado') matchesCategory = !!hp?.isBedridden;
    else if (selectedCategory === 'crianca') matchesCategory = !!hp?.isChildUnder2;
    else if (selectedCategory === 'idoso') matchesCategory = !!hp?.isElderly;
    else if (selectedCategory === 'deficiencia') matchesCategory = !!(hp?.hasSpecialNeeds || hp?.isPcdAuditory || hp?.isPcdAutism || hp?.isPcdPhysical || hp?.isPcdVisual);
    else if (selectedCategory === 'saude_mental') matchesCategory = !!hp?.hasMentalCondition;
    else if (selectedCategory === 'alcool') matchesCategory = !!hp?.hasAlcoholism;
    else if (selectedCategory === 'outras_drogas') matchesCategory = !!hp?.hasOtherDrugsSubstanceUse;
    else if (selectedCategory === 'tabagista') matchesCategory = !!hp?.isSmoker;
    else if (selectedCategory === 'asma') matchesCategory = !!hp?.hasAsthma;
    else if (selectedCategory === 'dpoc') matchesCategory = !!hp?.hasCOPD;
    else if (selectedCategory === 'sintomaticos_resp') matchesCategory = !!hp?.hasSymptomaticRespiratory;
    else if (selectedCategory === 'oxigenio') matchesCategory = !!hp?.isOxygenDependent;
    else if (selectedCategory === 'cancer') matchesCategory = !!hp?.hasCancer;
    else if (selectedCategory === 'hanseniase') matchesCategory = !!hp?.hasHanseniasis;
    else if (selectedCategory === 'sifilis') matchesCategory = !!hp?.hasSyphilis;
    else if (selectedCategory === 'tuberculose') matchesCategory = !!hp?.hasTuberculosis;
    else if (selectedCategory === 'desnutricao') matchesCategory = !!hp?.hasMalnutrition;
    else if (selectedCategory === 'paliativos') matchesCategory = !!hp?.isPalliativeCare;
    else if (selectedCategory === 'doencas_cronicas') matchesCategory = !!hp?.hasChronicDiseases;
    else if (selectedCategory === 'bolsa_familia') matchesCategory = !!hp?.isBolsaFamilia;
    else if (selectedCategory === 'vulnerabilidade') matchesCategory = !!hp?.hasSocialVulnerability;
    else if (selectedCategory === 'cadweb') matchesCategory = !!hp?.isSissCadwebUpdated;
    else if (selectedCategory === 'vacina_gripe') matchesCategory = !!hp?.isEligibleFluVaccineHome;

    if (!matchesCategory) return false;

    // 2. Street Filter
    if (selectedStreet !== 'todas') {
      const contactStreet = getContactStreet(c, domiciles);
      if (contactStreet.toLowerCase() !== selectedStreet.toLowerCase()) {
        return false;
      }
    }

    // 3. Microarea Filter
    if (selectedMicroarea !== 'todas' && c.microarea !== selectedMicroarea) {
      return false;
    }

    return true;
  });

  const categoryObj = CATEGORY_OPTIONS.find((o) => o.id === selectedCategory);
  const categoryLabel = categoryObj ? categoryObj.label : 'Todos os Pacientes';

  const handleExcelExport = () => {
    exportPatientsToExcel(filteredPatients, domiciles, categoryLabel, selectedStreet === 'todas' ? 'Todas_as_Ruas' : selectedStreet);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in duration-150">
        
        {/* Modal Top Navigation Bar (Hidden when printing) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-500 text-white font-bold flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold tracking-tight">Relatório & Exportação de Categorias e-SUS</h3>
              <p className="text-[11px] text-slate-300">Filtre por categoria e rua para gerar arquivo Excel ou imprimir em PDF.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExcelExport}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              title="Baixar planilha formatada para Microsoft Excel"
            >
              <Download className="h-4 w-4" />
              <span>Exportar Excel (.CSV)</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              title="Abrir tela de impressão / Salvar como PDF"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar (Hidden when printing) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0 print:hidden">
          {/* Category Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Categoria / Grupo Prioritário:
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Street Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Filtrar por Rua / Logradouro:
            </label>
            <select
              value={selectedStreet}
              onChange={(e) => setSelectedStreet(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="todas">Todas as Ruas do Território</option>
              {streets.map((st) => (
                <option key={st} value={st}>
                  📍 {st}
                </option>
              ))}
            </select>
          </div>

          {/* Microarea Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Microárea:
            </label>
            <select
              value={selectedMicroarea}
              onChange={(e) => setSelectedMicroarea(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="todas">Todas as Microáreas</option>
              {Array.from(new Set(contacts.map((c) => cleanMicroareaName(c.microarea)).filter(Boolean)))
                .sort()
                .map((m) => (
                  <option key={m} value={m!}>
                    {m}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Report Document Body (Print Target) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-white" id="printable-report-area">
          {/* Printable Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-emerald-800 tracking-tight">SUS</span>
                <span className="text-xs font-bold text-slate-400">|</span>
                <span className="text-xs font-bold text-slate-700">Atenção Primária à Saúde — UBS D'Vila</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                Relatório Operacional do Agente Comunitário de Saúde (ACS)
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Consolidado de Pacientes por Categoria de Saúde e Logradouro Territorial.
              </p>
            </div>

            <div className="text-right text-[11px] font-mono text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <p><strong>Emissão:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              <p><strong>Total de Registros:</strong> {filteredPatients.length} munícipe(s)</p>
            </div>
          </div>

          {/* Filter Status Summary Box */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <span className="text-[10px] text-emerald-800 font-bold block uppercase">Categoria Selecionada:</span>
                <span className="font-extrabold text-emerald-950 text-sm">{categoryLabel}</span>
              </div>

              <div>
                <span className="text-[10px] text-emerald-800 font-bold block uppercase">Rua / Logradouro:</span>
                <span className="font-extrabold text-slate-900">
                  {selectedStreet === 'todas' ? 'Todas as Ruas' : selectedStreet}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-emerald-800 font-bold block uppercase">Microárea:</span>
                <span className="font-bold text-slate-800">{selectedMicroarea === 'todas' ? 'Todas' : selectedMicroarea}</span>
              </div>
            </div>

            <span className="bg-emerald-700 text-white font-extrabold text-xs px-3 py-1 rounded-full font-mono">
              {filteredPatients.length} Registros Encontrados
            </span>
          </div>

          {/* Main Patients Table */}
          {filteredPatients.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl">
              <p className="text-sm font-bold text-slate-700">Nenhum paciente encontrado para os filtros selecionados.</p>
              <p className="text-xs text-slate-500 mt-1">
                Tente selecionar outra rua ou alterar a categoria de saúde acima.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-300 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2.5 border-r border-slate-200 w-8 text-center font-mono">#</th>
                    <th className="p-2.5 border-r border-slate-200">Nome do Paciente</th>
                    <th className="p-2.5 border-r border-slate-200 font-mono">CNS / SUS</th>
                    <th className="p-2.5 border-r border-slate-200">D. Nasc. (Idade)</th>
                    <th className="p-2.5 border-r border-slate-200">Rua & Endereço</th>
                    <th className="p-2.5 border-r border-slate-200">Telefone / Whats</th>
                    <th className="p-2.5">Perfil de Saúde / Categorias</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                  {filteredPatients.map((patient, idx) => {
                    const street = getContactStreet(patient, domiciles);
                    const age = calculateAge(patient.birthDate);
                    const hp = patient.healthProfile;

                    // Collect active health condition badges for display
                    const conditions: string[] = [];
                    if (hp?.isPregnant) conditions.push(`🤰 Gestante (${hp.gestationalAgeWeeks || 12}s)`);
                    if (hp?.isPuerpera) conditions.push('🌸 Puérpera');
                    if (hp?.isHypertensive) conditions.push('🩺 HAS');
                    if (hp?.isDiabetic) conditions.push('🩸 DM');
                    if (hp?.isInsulinDependent) conditions.push('💉 Insulino');
                    if (hp?.isBedridden) conditions.push('🛏️ Acamado');
                    if (hp?.isElderly) conditions.push('👴 Idoso');
                    if (hp?.isChildUnder2) conditions.push('👶 Criança');
                    if (hp?.hasSpecialNeeds) conditions.push('♿ PCD');
                    if (hp?.hasMentalCondition) conditions.push('🧠 Saúde Mental');
                    if (hp?.isBolsaFamilia) conditions.push('🏷️ Bolsa Família');

                    return (
                      <tr key={patient.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="p-2.5 border-r border-slate-200 text-center font-mono text-[11px] text-slate-500 font-bold">
                          {idx + 1}
                        </td>

                        <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900">
                          {patient.name}
                          {patient.motherName && (
                            <span className="block text-[10px] text-slate-500 font-normal">
                              Mãe: {patient.motherName}
                            </span>
                          )}
                        </td>

                        <td className="p-2.5 border-r border-slate-200 font-mono text-[11px] text-emerald-800 font-semibold">
                          {patient.cns || '—'}
                        </td>

                        <td className="p-2.5 border-r border-slate-200 text-[11px] whitespace-nowrap">
                          {patient.birthDate ? patient.birthDate.split('-').reverse().join('/') : '—'}
                          {age !== null && (
                            <span className="block text-[10px] font-bold text-slate-600">
                              ({age} anos)
                            </span>
                          )}
                        </td>

                        <td className="p-2.5 border-r border-slate-200 text-[11px]">
                          <span className="font-bold text-slate-900 block">{street}</span>
                          <span className="text-[10px] text-slate-500">
                            {patient.addressNumber ? `Nº ${patient.addressNumber}` : ''} {patient.addressComplement || ''} ({patient.microarea || 'Microárea 01'})
                          </span>
                        </td>

                        <td className="p-2.5 border-r border-slate-200 text-[11px] font-mono whitespace-nowrap">
                          {patient.phone || '—'}
                        </td>

                        <td className="p-2.5 text-[11px]">
                          {conditions.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {conditions.map((cond, i) => (
                                <span
                                  key={i}
                                  className="bg-slate-200/90 text-slate-800 text-[9px] font-bold px-1.5 py-0.5 rounded"
                                >
                                  {cond}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Geral</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Signature Block for Print */}
          <div className="pt-10 border-t border-slate-300 grid grid-cols-2 gap-12 text-center text-xs text-slate-700">
            <div>
              <div className="border-t border-slate-800 pt-1 font-bold">
                Assinatura do Agente Comunitário de Saúde (ACS)
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Equipe de Saúde da Família — UBS D'Vila</p>
            </div>

            <div>
              <div className="border-t border-slate-800 pt-1 font-bold">
                Assinatura do Enfermeiro / Supervisor de Área
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Visto e Validação da Unidade de Saúde</p>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions (Hidden when printing) */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0 print:hidden">
          <p className="text-xs text-slate-500">
            Exibindo <strong>{filteredPatients.length}</strong> paciente(s) no relatório.
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition"
            >
              Fechar
            </button>

            <button
              onClick={handleExcelExport}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Download className="h-4 w-4" />
              <span>Exportar Excel (.CSV)</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
