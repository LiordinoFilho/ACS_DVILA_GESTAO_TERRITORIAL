import React, { useState } from 'react';
import { getBrasiliaDateStr } from '../utils/dateUtils';
import { Brain, Calendar, Pill, Search, Plus, Trash2, Check, AlertCircle, Clock, X, ShieldAlert, Link as LinkIcon, ExternalLink, FileText } from 'lucide-react';

export interface PsychiatricMedication {
  id: string;
  name: string;
  category: 'Depressão' | 'Ansiedade / Pânico' | 'Epilepsia / Convulsões' | 'Esquizofrenia / Psicoses' | 'Transtorno Bipolar' | 'Outros';
  indication: string;
}

export const PSYCHIATRIC_MEDICATIONS_DATABASE: PsychiatricMedication[] = [
  // Depressão
  { id: 'fluoxetina', name: 'Fluoxetina (20mg)', category: 'Depressão', indication: 'Depressão, Ansiedade, TOC, Bulimia' },
  { id: 'sertralina', name: 'Sertralina (50mg / 100mg)', category: 'Depressão', indication: 'Depressão, Síndrome do Pânico, Ansiedade Social' },
  { id: 'amitriptilina', name: 'Amitriptilina (25mg / 75mg)', category: 'Depressão', indication: 'Depressão maior, Dor crônica neuropática, Enxaqueca' },
  { id: 'escitalopram', name: 'Escitalopram (10mg / 20mg)', category: 'Depressão', indication: 'Depressão e Transtorno de Ansiedade Generalizada (TAG)' },
  { id: 'citalopram', name: 'Citalopram (20mg)', category: 'Depressão', indication: 'Depressão e Transtornos Fóbico-Ansiosos' },
  { id: 'nortriptilina', name: 'Nortriptilina (25mg / 50mg)', category: 'Depressão', indication: 'Depressão em idosos, Enurese noturna, Dor neuropática' },
  { id: 'clomipramina', name: 'Clomipramina (25mg)', category: 'Depressão', indication: 'TOC (Transtorno Obsessivo-Compulsivo) e Depressão' },
  { id: 'venlafaxina', name: 'Venlafaxina (75mg / 150mg)', category: 'Depressão', indication: 'Depressão recorrente e Fobia Social' },

  // Ansiedade / Pânico (Ansiolíticos e Benzodiazepínicos)
  { id: 'clonazepam', name: 'Clonazepam / Rivotril (0.5mg / 2mg / Gotas)', category: 'Ansiedade / Pânico', indication: 'Transtorno do Pânico, Ansiedade aguda, Crises epiléticas' },
  { id: 'diazepam', name: 'Diazepam (5mg / 10mg)', category: 'Ansiedade / Pânico', indication: 'Ansiedade grave, Espasmos musculares, Sedação prévia' },
  { id: 'lorazepam', name: 'Lorazepam (1mg / 2mg)', category: 'Ansiedade / Pânico', indication: 'Ansiedade intensa e Transtornos do Sono' },
  { id: 'alprazolam', name: 'Alprazolam (0.5mg / 1mg)', category: 'Ansiedade / Pânico', indication: 'Ansiedade e Transtorno do Pânico com Agorafobia' },

  // Epilepsia & Anticonvulsivantes
  { id: 'carbamazepina', name: 'Carbamazepina (200mg / 400mg / Xarope)', category: 'Epilepsia / Convulsões', indication: 'Epilepsia (crises parciais/generalizadas) e Neuralgia do Trigêmeo' },
  { id: 'valproato', name: 'Valproato de Sódio / Ácido Valpróico (250mg / 500mg)', category: 'Epilepsia / Convulsões', indication: 'Epilepsia, Mania Bipolar, Profilaxia de Enxaqueca' },
  { id: 'fenobarbital', name: 'Fenobarbital / Gardenal (100mg / Gotas)', category: 'Epilepsia / Convulsões', indication: 'Epilepsia, Crises Convulsivas febris' },
  { id: 'fenitoina', name: 'Fenitoína / Hidantal (100mg)', category: 'Epilepsia / Convulsões', indication: 'Crises Tônico-Clônicas e Epilepsia' },
  { id: 'lamotrigina', name: 'Lamotrigina (25mg / 50mg / 100mg)', category: 'Epilepsia / Convulsões', indication: 'Epilepsia e Prevenção de Depressão Bipolar' },
  { id: 'topiramato', name: 'Topiramato (25mg / 50mg / 100mg)', category: 'Epilepsia / Convulsões', indication: 'Epilepsia, Profilaxia de Enxaqueca, Compulsão' },
  { id: 'levetiracetam', name: 'Levetiracetam (250mg / 500mg)', category: 'Epilepsia / Convulsões', indication: 'Crises Epiléticas Focais e Mioclônicas' },

  // Esquizofrenia & Psicoses
  { id: 'risperidona', name: 'Risperidona (1mg / 2mg / 3mg / Gotas)', category: 'Esquizofrenia / Psicoses', indication: 'Esquizofrenia, Autismo, Irritabilidade e Agitação' },
  { id: 'haloperidol', name: 'Haloperidol / Haldol (1mg / 5mg / Gotas)', category: 'Esquizofrenia / Psicoses', indication: 'Psicoses agudas e crônicas, Esquizofrenia, Tiques' },
  { id: 'clorpromazina', name: 'Clorpromazina / Amplictil (25mg / 100mg)', category: 'Esquizofrenia / Psicoses', indication: 'Esquizofrenia, Mania, Estados de Excitação' },
  { id: 'quetiapina', name: 'Quetiapina (25mg / 100mg / 200mg)', category: 'Esquizofrenia / Psicoses', indication: 'Esquizofrenia, Transtorno Bipolar, Depressão refratária' },
  { id: 'olanzapina', name: 'Olanzapina (5mg / 10mg)', category: 'Esquizofrenia / Psicoses', indication: 'Esquizofrenia e Episódios Maníacos' },
  { id: 'clozapina', name: 'Clozapina (25mg / 100mg)', category: 'Esquizofrenia / Psicoses', indication: 'Esquizofrenia refratária a outros antipsicóticos' },

  // Transtorno Bipolar & Estabilizadores
  { id: 'litio', name: 'Carbonato de Lítio (300mg)', category: 'Transtorno Bipolar', indication: 'Transtorno Afetivo Bipolar (Maníaco-Depressivo)' },
  { id: 'aripiprazol', name: 'Aripiprazol (10mg / 15mg)', category: 'Transtorno Bipolar', indication: 'Esquizofrenia, Transtorno Bipolar I' },
];

interface MentalHealthPrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  initialDate?: string;
  initialMeds?: string[];
  initialLink?: string;
  onSave: (date: string, meds: string[], link?: string) => void;
}

export const MentalHealthPrescriptionModal: React.FC<MentalHealthPrescriptionModalProps> = ({
  isOpen,
  onClose,
  patientName,
  initialDate,
  initialMeds = [],
  initialLink = '',
  onSave
}) => {
  if (!isOpen) return null;

  const todayIso = getBrasiliaDateStr();
  const [prescriptionDate, setPrescriptionDate] = useState<string>(initialDate || todayIso);
  const [selectedMeds, setSelectedMeds] = useState<string[]>(initialMeds);
  const [prescriptionLink, setPrescriptionLink] = useState<string>(initialLink || '');
  const [activeCategory, setActiveCategory] = useState<string>('Todas');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [customMedInput, setCustomMedInput] = useState<string>('');

  // Categories list
  const categories = ['Todas', 'Depressão', 'Ansiedade / Pânico', 'Epilepsia / Convulsões', 'Esquizofrenia / Psicoses', 'Transtorno Bipolar'];

  // Filtered meds
  const filteredMeds = PSYCHIATRIC_MEDICATIONS_DATABASE.filter((med) => {
    const matchesCat = activeCategory === 'Todas' || med.category === activeCategory;
    const matchesSearch = med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          med.indication.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const toggleMed = (medName: string) => {
    if (selectedMeds.includes(medName)) {
      setSelectedMeds(selectedMeds.filter((m) => m !== medName));
    } else {
      setSelectedMeds([...selectedMeds, medName]);
    }
  };

  const handleAddCustomMed = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customMedInput.trim();
    if (trimmed && !selectedMeds.includes(trimmed)) {
      setSelectedMeds([...selectedMeds, trimmed]);
      setCustomMedInput('');
    }
  };

  const handleRemoveMed = (medName: string) => {
    setSelectedMeds(selectedMeds.filter((m) => m !== medName));
  };

  const handleConfirmSave = () => {
    onSave(prescriptionDate, selectedMeds, prescriptionLink);
    onClose();
  };

  // Compute upcoming 2-month alert date
  const computeNextAlertDate = () => {
    if (!prescriptionDate) return 'N/I';
    const d = new Date(prescriptionDate + 'T00:00:00');
    if (isNaN(d.getTime())) return 'N/I';
    d.setMonth(d.getMonth() + 2);
    return d.toLocaleDateString('pt-BR');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md">
              <Brain className="h-6 w-6 text-purple-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                Prescrição de Saúde Mental
                <span className="text-[10px] bg-purple-500/40 text-purple-100 px-2 py-0.5 rounded-full border border-purple-300/30 uppercase tracking-wider">
                  Renovação 60 Dias
                </span>
              </h2>
              <p className="text-xs text-purple-200">
                Paciente: <span className="font-bold text-white">{patientName || 'Selecionado'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-purple-200 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1 text-slate-800">
          {/* Info Banner */}
          <div className="p-3 bg-purple-50 border border-purple-200/80 rounded-xl text-xs text-purple-900 flex items-start gap-2.5">
            <ShieldAlert className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Validade da Receita Especial de Saúde Mental: 60 Dias</p>
              <p className="text-[11px] text-purple-700 mt-0.5">
                Ao salvar a data da última receita e os medicamentos em uso, o sistema criará <strong>Alertas automáticos de Renovação a cada 2 meses de forma contínua (sem limite de 12 meses)</strong> no seu calendário e na agenda e-SUS para que você não perca dados ou precise reconfigurar anualmente.
              </p>
            </div>
          </div>

          {/* Section 1: Prescription Date */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
            <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-purple-600" />
              Data da Última Atualização de Receita Médica *
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="date"
                value={prescriptionDate}
                onChange={(e) => setPrescriptionDate(e.target.value)}
                className="text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-bold text-purple-950 flex-1"
              />
              <button
                type="button"
                onClick={() => setPrescriptionDate(todayIso)}
                className="px-3 py-2 text-xs bg-purple-100 hover:bg-purple-200 text-purple-800 font-semibold rounded-xl transition flex items-center justify-center gap-1"
              >
                <Clock className="h-3.5 w-3.5" />
                Definir para Hoje ({new Date().toLocaleDateString('pt-BR')})
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Próximo alerta de renovação calculated para: <span className="font-bold text-purple-700">{computeNextAlertDate()}</span>
            </p>
          </div>

          {/* Section 1.5: Link para Arquivo / Google Drive da Receita */}
          <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-200 space-y-2">
            <label className="block text-xs font-bold text-purple-950 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <LinkIcon className="h-4 w-4 text-purple-700" />
                Anexar receitas de Saúde Mental (Link do Google Drive / Arquivo) 🔗
              </span>
              {prescriptionLink && (
                <a
                  href={prescriptionLink.startsWith('http') ? prescriptionLink : `https://${prescriptionLink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-purple-700 hover:text-purple-900 font-bold underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Abrir receita
                </a>
              )}
            </label>
            <div className="relative">
              <input
                type="url"
                placeholder="Cole o link do Google Drive ou documento da receita (ex: https://drive.google.com/file/d/...)"
                value={prescriptionLink}
                onChange={(e) => setPrescriptionLink(e.target.value)}
                className="text-xs p-2.5 w-full bg-white border border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-purple-950 placeholder-slate-400 font-medium"
              />
            </div>
            <p className="text-[10px] text-purple-800 flex items-center gap-1">
              <FileText className="h-3 w-3 text-purple-600 shrink-0" />
              Guarde o link do arquivo digitalizado no Drive para consulta rápida durante as visitas domiciliares.
            </p>
          </div>

          {/* Section 2: Selected Medications Pills */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Pill className="h-4 w-4 text-purple-600" />
                Medicamentos Receitados Selecionados ({selectedMeds.length})
              </span>
              {selectedMeds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedMeds([])}
                  className="text-[11px] text-rose-600 hover:underline font-semibold"
                >
                  Limpar todos
                </button>
              )}
            </label>

            {selectedMeds.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Nenhum medicamento selecionado ainda. Escolha na lista abaixo ou adicione manualmente.</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 p-2.5 bg-purple-50/60 border border-purple-200/60 rounded-xl max-h-28 overflow-y-auto">
                {selectedMeds.map((med) => (
                  <span
                    key={med}
                    className="inline-flex items-center gap-1.5 bg-purple-700 text-white text-xs px-2.5 py-1 rounded-full shadow-sm font-semibold"
                  >
                    {med}
                    <button
                      type="button"
                      onClick={() => handleRemoveMed(med)}
                      className="hover:bg-purple-800 p-0.5 rounded-full transition"
                      title="Remover"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Custom Medication Input */}
          <form onSubmit={handleAddCustomMed} className="flex gap-2">
            <input
              type="text"
              placeholder="Adicionar outro remédio não listado (ex: Escitalopram 10mg)..."
              value={customMedInput}
              onChange={(e) => setCustomMedInput(e.target.value)}
              className="flex-1 text-xs p-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800"
            />
            <button
              type="submit"
              disabled={!customMedInput.trim()}
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar
            </button>
          </form>

          {/* Section 3: Web/SUS Database Medications List */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                🏥 Lista de Psicofármacos SUS / RENAME (Atenção Básica & Especializada)
              </span>

              {/* Search Filter */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar medicamento ou indicação..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-xs pl-8 pr-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-56"
                />
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition ${
                    activeCategory === cat
                      ? 'bg-purple-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Meds Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {filteredMeds.map((med) => {
                const isSelected = selectedMeds.includes(med.name);
                return (
                  <div
                    key={med.id}
                    onClick={() => toggleMed(med.name)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-purple-50 border-purple-400 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-purple-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`mt-0.5 h-4 w-4 rounded flex items-center justify-center shrink-0 transition ${
                      isSelected ? 'bg-purple-700 text-white' : 'border border-slate-300 bg-white'
                    }`}>
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-bold ${isSelected ? 'text-purple-900' : 'text-slate-800'}`}>
                          {med.name}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded font-semibold">
                          {med.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                        {med.indication}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            <span className="font-bold text-slate-700">{selectedMeds.length}</span> medicamento(s) selecionado(s)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmSave}
              className="px-5 py-2 text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Check className="h-4 w-4" />
              Salvar & Gerar Alertas (2 Meses)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
