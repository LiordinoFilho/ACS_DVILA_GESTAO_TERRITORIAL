import React, { useState, useMemo } from 'react';
import {
  Domicile,
  DomicileMember,
  GoogleContact,
  FamilyRelationship,
  MICROAREAS,
  DEFAULT_MICROAREA,
  getMicroareaStyle,
  cleanMicroareaName,
  getSavedMicroareas,
  saveCustomMicroarea,
  setDefaultMicroarea
} from '../types';
import { extractCleanStreetName, getUniqueStreets } from '../utils/exportUtils';
import { searchAddressByCEP } from '../services/apiService';
import { AddressGroupModal } from './AddressGroupModal';
import { SetDefaultMicroareaModal } from './SetDefaultMicroareaModal';
import { MicroareaInputSelector } from './MicroareaInputSelector';
import {
  Home,
  Plus,
  Search,
  Users,
  MapPin,
  Trash2,
  Calendar,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Droplets,
  Zap,
  Building,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Dog,
  ExternalLink,
  Loader2,
  Layers
} from 'lucide-react';

interface DomicileManagerProps {
  domiciles: Domicile[];
  contacts: GoogleContact[];
  onAddDomicile: (domicile: Domicile) => void;
  onUpdateDomicile: (domicile: Domicile) => void;
  onDeleteDomicile: (id: string) => void;
  onScheduleVisitForDomicile: (domicile: Domicile) => void;
  onAddContact?: (contact: GoogleContact) => void;
  onApplyGrouping?: (updatedContacts: GoogleContact[], updatedDomiciles: Domicile[]) => void;
  onApplyMicroareaToAll?: (selectedMicroarea: string, applyToExisting: boolean) => Promise<void> | void;
}

const RELATIONSHIP_OPTIONS: FamilyRelationship[] = [
  'Responsável Familiar',
  'Cônjuge / Companheiro(a)',
  'Filho(a)',
  'Enteado(a)',
  'Pai / Mãe',
  'Irmão / Irmã',
  'Avô / Avó',
  'Neto(a)',
  'Outro Parente',
  'Não Parente'
];

export const DomicileManager: React.FC<DomicileManagerProps> = ({
  domiciles,
  contacts,
  onAddDomicile,
  onUpdateDomicile,
  onDeleteDomicile,
  onScheduleVisitForDomicile,
  onApplyGrouping,
  onApplyMicroareaToAll
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMicroarea, setSelectedMicroarea] = useState('todas');
  const [selectedStreet, setSelectedStreet] = useState('todas');
  const [expandedDomicileId, setExpandedDomicileId] = useState<string | null>(domiciles[0]?.id || null);
  const [isAddressGroupModalOpen, setIsAddressGroupModalOpen] = useState(false);
  const [isSetMicroareaModalOpen, setIsSetMicroareaModalOpen] = useState(false);

  // Modal State: Create Domicile
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('Bela Vista');
  const [zipCode, setZipCode] = useState('01310-100');
  const [city, setCity] = useState('São Paulo');
  const [state, setState] = useState('SP');
  const [microarea, setMicroarea] = useState<string>(DEFAULT_MICROAREA);
  const [isMicroareaDefaultChecked, setIsMicroareaDefaultChecked] = useState(false);
  const [residenceType, setResidenceType] = useState<Domicile['residenceType']>('Casa');
  const [ownership, setOwnership] = useState<Domicile['ownership']>('Próprio');
  const [waterSupply, setWaterSupply] = useState<Domicile['waterSupply']>('Rede Encanada');
  const [sanitation, setSanitation] = useState<Domicile['sanitation']>('Rede Pública');
  const [garbageCollection, setGarbageCollection] = useState<Domicile['garbageCollection']>('Coletado');
  const [hasElectricity, setHasElectricity] = useState(true);
  const [hasPets, setHasPets] = useState(false);
  const [petsDetail, setPetsDetail] = useState('');
  const [roomsCount, setRoomsCount] = useState<number | ''>(4);
  const [residesSince, setResidesSince] = useState<string>('2020');
  const [familyIncome, setFamilyIncome] = useState<string>('1 salário');
  const [membersCount, setMembersCount] = useState<number | ''>(1);
  const [notes, setNotes] = useState('');
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // Search Address by CEP via free ViaCEP API
  const handleCepSearch = async () => {
    if (!zipCode) return;
    setIsSearchingCep(true);
    const res = await searchAddressByCEP(zipCode);
    setIsSearchingCep(false);

    if (res) {
      if (res.logradouro) setStreet(res.logradouro);
      if (res.bairro) setNeighborhood(res.bairro);
      if (res.localidade) setCity(res.localidade);
      if (res.uf) setState(res.uf);
    } else {
      alert('CEP não encontrado ou formato inválido. Verifique e tente novamente.');
    }
  };

  // Modal State: Link Family Member to Domicile
  const [linkingDomicileId, setLinkingDomicileId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [relationship, setRelationship] = useState<FamilyRelationship>('Filho(a)');
  const [isHeadOfHousehold, setIsHeadOfHousehold] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');

  // Extract unique Microareas
  const microareas = useMemo(() => {
    const set = new Set<string>(getSavedMicroareas());
    domiciles.forEach((d) => {
      if (d.microarea) set.add(cleanMicroareaName(d.microarea));
    });
    return Array.from(set).map(cleanMicroareaName).filter(Boolean);
  }, [domiciles]);

  // Extract unique Streets in domiciles and contacts
  const availableStreets = useMemo(() => {
    return getUniqueStreets(contacts, domiciles);
  }, [contacts, domiciles]);

  // Filter Domiciles
  const filteredDomiciles = domiciles.filter((d) => {
    const fullAddr = `${d.street} ${d.number} ${d.neighborhood} ${d.microarea}`.toLowerCase();
    const matchesSearch = fullAddr.includes(searchQuery.toLowerCase()) ||
      d.familyMembers.some((m) => m.patientName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (selectedMicroarea !== 'todas' && d.microarea !== selectedMicroarea) return false;
    if (selectedStreet !== 'todas') {
      const cleanDomStreet = extractCleanStreetName(d.street || '');
      if (cleanDomStreet.toLowerCase() !== selectedStreet.toLowerCase()) return false;
    }
    return true;
  });

  // Handle Form Submit: Create Domicile
  const handleCreateDomicileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!street || !number) return;

    const cleanMa = cleanMicroareaName(microarea) || DEFAULT_MICROAREA;
    saveCustomMicroarea(cleanMa);

    if (isMicroareaDefaultChecked) {
      setDefaultMicroarea(cleanMa);
      if (onApplyMicroareaToAll) {
        onApplyMicroareaToAll(cleanMa, true);
      }
    }

    const newDom: Domicile = {
      id: `dom_${Date.now()}`,
      street,
      number,
      complement,
      neighborhood,
      zipCode,
      city,
      state,
      microarea: cleanMa,
      residenceType,
      ownership,
      waterSupply,
      sanitation,
      garbageCollection,
      hasElectricity,
      hasPets,
      petsDetail,
      roomsCount: typeof roomsCount === 'number' ? roomsCount : undefined,
      residesSince: residesSince || undefined,
      familyIncome: familyIncome || '1 salário',
      membersCount: typeof membersCount === 'number' ? membersCount : undefined,
      notes,
      familyMembers: [],
      createdAt: new Date().toISOString().split('T')[0]
    };

    onAddDomicile(newDom);

    // Reset Form
    setIsCreateModalOpen(false);
    setStreet('');
    setNumber('');
    setComplement('');
    setNotes('');
  };

  // Handle Link Patient to Domicile (Composição Familiar)
  const handleAddMemberToDomicile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingDomicileId || !selectedPatientId) return;

    const targetDom = domiciles.find((d) => d.id === linkingDomicileId);
    const patient = contacts.find((c) => c.id === selectedPatientId);

    if (!targetDom || !patient) return;

    // Check if member already in this domicile
    const existingIndex = targetDom.familyMembers.findIndex((m) => m.patientId === patient.id);

    const isHead = relationship === 'Responsável Familiar' || isHeadOfHousehold;

    let updatedMembers = [...targetDom.familyMembers];

    if (isHead) {
      // Clear head flag on other members if setting new head
      updatedMembers = updatedMembers.map((m) => ({ ...m, isHeadOfHousehold: false }));
    }

    const newMember: DomicileMember = {
      patientId: patient.id,
      patientName: patient.name,
      relationship: isHead ? 'Responsável Familiar' : relationship,
      isHeadOfHousehold: isHead,
      cns: patient.cns,
      birthDate: patient.birthDate,
      phone: patient.phone
    };

    if (existingIndex >= 0) {
      updatedMembers[existingIndex] = newMember;
    } else {
      updatedMembers.push(newMember);
    }

    const updatedDomicile: Domicile = {
      ...targetDom,
      familyMembers: updatedMembers
    };

    onUpdateDomicile(updatedDomicile);

    // Reset Link Modal
    setLinkingDomicileId(null);
    setSelectedPatientId('');
    setRelationship('Filho(a)');
    setIsHeadOfHousehold(false);
    setMemberSearch('');
  };

  // Handle Remove Member from Family Composition
  const handleRemoveMember = (domicileId: string, patientId: string) => {
    const targetDom = domiciles.find((d) => d.id === domicileId);
    if (!targetDom) return;

    const updatedDomicile: Domicile = {
      ...targetDom,
      familyMembers: targetDom.familyMembers.filter((m) => m.patientId !== patientId)
    };

    onUpdateDomicile(updatedDomicile);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Cadastro Domiciliar & Composição Familiar</h2>
            <span className="bg-teal-100 text-teal-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {domiciles.length} Domicílios
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cadastre as residências do território e agrupe os moradores de Google Contatos para formar o núcleo familiar.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsAddressGroupModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-emerald-600/20 transition"
              title="Agrupamento Automático por CEP & Residência ativado para todos os cadastros"
            >
              <Sparkles className="h-4 w-4" />
              Agrupar por CEP & Residência
            </button>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-300 flex items-center gap-1 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Automático Ativo
            </span>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition"
          >
            <Plus className="h-4 w-4" />
            Novo Domicílio
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por rua, número, morador ou microárea..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white text-slate-800"
            />
          </div>

          {/* Street selector dropdown */}
          <select
            value={selectedStreet}
            onChange={(e) => setSelectedStreet(e.target.value)}
            className="text-xs py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 min-w-[200px]"
          >
            <option value="todas">📍 Todas as Ruas ({domiciles.length})</option>
            {availableStreets.map((st) => {
              const countOnStreet = domiciles.filter((d) => d.street.toLowerCase() === st.toLowerCase()).length;
              return (
                <option key={st} value={st}>
                  📍 {st} ({countOnStreet})
                </option>
              );
            })}
          </select>
        </div>

        {/* Microarea Chips Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-1 shrink-0">
            <MapPin className="h-3.5 w-3.5" /> Microárea:
          </span>
          <button
            onClick={() => setSelectedMicroarea('todas')}
            className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition ${
              selectedMicroarea === 'todas'
                ? 'bg-teal-600 text-white font-semibold shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({domiciles.length})
          </button>

          <button
            type="button"
            onClick={() => setIsSetMicroareaModalOpen(true)}
            className="px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap border border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-800 transition inline-flex items-center gap-1.5 shadow-2xs shrink-0"
            title="Escolher Microárea, torná-la padrão e aplicar a todos os cadastros"
          >
            <Layers className="h-3.5 w-3.5 text-teal-600" />
            <span>Definir Padrão / Aplicar Geral</span>
          </button>

          {microareas.map((m) => {
            const count = domiciles.filter((d) => d.microarea === m).length;
            const isSelected = selectedMicroarea === m;
            const style = getMicroareaStyle(m);

            return (
              <button
                key={m}
                onClick={() => setSelectedMicroarea(m)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap border transition inline-flex items-center gap-1.5 ${
                  isSelected
                    ? `${style.bg} ${style.text} ${style.border} ring-2 ring-teal-600 shadow-sm`
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cleanMicroareaName(m)} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Domiciles Accordion / Cards List */}
      {filteredDomiciles.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <Home className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Nenhum domicílio encontrado</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Crie um novo cadastro domiciliar ou limpe o termo de busca.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition"
          >
            <Plus className="h-4 w-4" />
            Cadastrar Domicílio
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDomiciles.map((dom) => {
            const isExpanded = expandedDomicileId === dom.id;
            const headOfHousehold = dom.familyMembers.find((m) => m.isHeadOfHousehold || m.relationship === 'Responsável Familiar');

            // Find full patient profiles for health badge indicators
            const memberProfiles = dom.familyMembers.map((m) =>
              contacts.find((c) => c.id === m.patientId)
            ).filter(Boolean) as GoogleContact[];

            const hasPregnant = memberProfiles.some((p) => p.healthProfile?.isPregnant);
            const hasHypertensive = memberProfiles.some((p) => p.healthProfile?.isHypertensive);
            const hasDiabetic = memberProfiles.some((p) => p.healthProfile?.isDiabetic);
            const hasBedridden = memberProfiles.some((p) => p.healthProfile?.isBedridden);
            const hasChild = memberProfiles.some((p) => p.healthProfile?.isChildUnder2);

            return (
              <div
                key={dom.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md transition overflow-hidden"
              >
                {/* Domicile Card Header */}
                <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-teal-100 text-teal-800 font-bold flex items-center justify-center shrink-0 border border-teal-200">
                      <Home className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-extrabold text-slate-900 truncate">
                          {dom.street}, {dom.number} {dom.complement ? `(${dom.complement})` : ''}
                        </h3>
                        {(() => {
                          const cleanMa = cleanMicroareaName(dom.microarea);
                          const style = getMicroareaStyle(cleanMa);
                          return (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${style.bg} ${style.text} px-2 py-0.5 rounded-full border ${style.border}`}>
                              {cleanMa}
                            </span>
                          );
                        })()}
                        <span className="text-[10px] font-semibold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full border border-teal-200">
                          {dom.residenceType}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>{dom.neighborhood} • {dom.city}/{dom.state}</span>
                        {headOfHousehold && (
                          <span className="text-slate-700 font-semibold">
                            • Responsável: <span className="text-teal-700">{headOfHousehold.patientName}</span>
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Priority Health Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {hasPregnant && (
                      <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">
                        🤰 Gestante
                      </span>
                    )}
                    {hasHypertensive && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                        🩺 Hipertenso
                      </span>
                    )}
                    {hasDiabetic && (
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                        🩸 Diabético
                      </span>
                    )}
                    {hasBedridden && (
                      <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-200">
                        🛏️ Acamado
                      </span>
                    )}
                    {hasChild && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                        👶 Criança
                      </span>
                    )}

                    <button
                      onClick={() => setExpandedDomicileId(isExpanded ? null : dom.id)}
                      className="p-1.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 ml-2 transition"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details & Family Composition Section */}
                {isExpanded && (
                  <div className="p-5 space-y-5 bg-white">
                    {/* Sanitary & Living Conditions Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Renda Familiar</span>
                        <span className="font-semibold text-emerald-800">{dom.familyIncome || '1 salário'}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Qtd. Cômodos</span>
                        <span className="font-semibold text-slate-800">{dom.roomsCount ? `${dom.roomsCount} cômodo(s)` : 'N/I'}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Mora Desde</span>
                        <span className="font-semibold text-slate-800">{dom.residesSince ? `Desde ${dom.residesSince}` : 'N/I'}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Membros na Casa</span>
                        <span className="font-semibold text-slate-800">{dom.membersCount || dom.familyMembers.length || 1} morador(es)</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Abastecimento Água</span>
                        <span className="font-semibold text-slate-800">{dom.waterSupply}</span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Animais no Domicílio</span>
                        <span className="font-semibold text-slate-800">
                          {dom.hasPets ? (dom.petsDetail || 'Sim (Possui Animais)') : 'Não possui'}
                        </span>
                      </div>
                    </div>

                    {/* Composição Familiar Header & Add Member Button */}
                    <div className="border border-teal-100 rounded-2xl p-4 bg-teal-50/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <Users className="h-4 w-4 text-teal-600" />
                            Composição Familiar ({dom.familyMembers.length} Moradores Cadastrados)
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Junte os pacientes cadastrados no Google Contatos a esta residência para formar o núcleo familiar.
                          </p>
                        </div>

                        <button
                          onClick={() => setLinkingDomicileId(dom.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Buscar e Buscar Paciente para esta Família
                        </button>
                      </div>

                      {/* Family Members List Table */}
                      {dom.familyMembers.length === 0 ? (
                        <div className="p-4 text-center bg-white rounded-xl border border-dashed border-teal-200">
                          <p className="text-xs text-slate-500 font-medium">
                            Nenhum morador vinculado ainda. Clique no botão acima para adicionar munícipes a este domicílio.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {dom.familyMembers.map((member) => {
                            const profile = contacts.find((c) => c.id === member.patientId);

                            return (
                              <div
                                key={member.patientId}
                                className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <h5 className="text-xs font-bold text-slate-900 truncate">
                                      {member.patientName}
                                    </h5>
                                    {member.isHeadOfHousehold && (
                                      <span className="text-[9px] font-extrabold bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded border border-teal-200">
                                        Responsável
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-[10px] text-slate-500 font-medium">
                                    Parentesco: {member.relationship}
                                  </p>

                                  {(member.phone || profile?.phone) && (
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <span className="text-[10px] text-slate-600 font-semibold">{member.phone || profile?.phone}</span>
                                      <a
                                        href={`https://wa.me/${(member.phone || profile?.phone!).replace(/\D/g, '').length <= 11 ? '55' + (member.phone || profile?.phone!).replace(/\D/g, '') : (member.phone || profile?.phone!).replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${member.patientName}, sou seu Agente Comunitário de Saúde (ACS).`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center bg-[#25D366] hover:bg-[#20ba5a] text-white px-1.5 py-0.5 rounded text-[9px] font-bold transition shadow-2xs"
                                        title="Abrir WhatsApp"
                                      >
                                        WhatsApp
                                      </a>
                                    </div>
                                  )}

                                  {member.cns && (
                                    <p className="text-[10px] text-slate-400 font-mono">
                                      CNS: {member.cns}
                                    </p>
                                  )}

                                  {/* Health Profile Tags for this Member */}
                                  {profile?.healthProfile && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {profile.healthProfile.isPregnant && (
                                        <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 rounded">Gestante</span>
                                      )}
                                      {profile.healthProfile.isHypertensive && (
                                        <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 rounded">HAS</span>
                                      )}
                                      {profile.healthProfile.isDiabetic && (
                                        <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 rounded">DM</span>
                                      )}
                                      {profile.healthProfile.isBedridden && (
                                        <span className="text-[9px] bg-rose-100 text-rose-800 font-bold px-1.5 rounded">Acamado</span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <button
                                  onClick={() => handleRemoveMember(dom.id, member.patientId)}
                                  className="p-1.5 text-slate-300 hover:text-rose-600 transition"
                                  title="Remover morador deste domicílio"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Actions Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onScheduleVisitForDomicile(dom)}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          Agendar Visita no Google Agenda
                        </button>

                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${dom.street}, ${dom.number}, ${dom.city}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold transition"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          Ver no Google Maps
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                      </div>

                      <button
                        onClick={() => onDeleteDomicile(dom.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 transition"
                        title="Excluir Domicílio"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Domicile */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Home className="h-5 w-5 text-teal-600" />
                Novo Cadastro Domiciliar
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDomicileSubmit} className="space-y-4">
              {/* CEP Lookup with Free ViaCEP API */}
              <div className="bg-teal-50/70 p-3 rounded-2xl border border-teal-200/80">
                <label className="block text-xs font-bold text-teal-900 mb-1 flex items-center justify-between">
                  <span>CEP (Preenchimento Automático via API ViaCEP)</span>
                  <span className="text-[10px] text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full font-mono">
                    API Gratuita
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: 01310-100"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="flex-1 text-xs p-2.5 bg-white border border-teal-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-slate-900 font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleCepSearch}
                    disabled={isSearchingCep}
                    className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 shrink-0"
                  >
                    {isSearchingCep ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Buscando...</span>
                      </>
                    ) : (
                      <>
                        <Search className="h-3.5 w-3.5" />
                        <span>Buscar CEP</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Logradouro / Rua *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Av. Paulista"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Número *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 1000"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Complemento</label>
                  <input
                    type="text"
                    placeholder="Ex: Apto 42"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bairro</label>
                  <input
                    type="text"
                    placeholder="Ex: Bela Vista"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  />
                </div>
                <div>
                  <MicroareaInputSelector
                    value={microarea}
                    onChange={(newMa, isSetDefault) => {
                      setMicroarea(newMa);
                      setIsMicroareaDefaultChecked(isSetDefault);
                    }}
                    showApplyToAllCheckbox={true}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Renda Familiar *</label>
                  <select
                    value={familyIncome}
                    onChange={(e) => setFamilyIncome(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 font-semibold"
                  >
                    <option value="1 salário">1 salário</option>
                    <option value="2 salários">2 salários</option>
                    <option value="3 salários">3 salários</option>
                    <option value="4 salários ou mais">4 salários ou mais</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quantidade de Cômodos</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    placeholder="Ex: 4"
                    value={roomsCount}
                    onChange={(e) => setRoomsCount(e.target.value ? Number(e.target.value) : '')}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mora Desde (Ano/Mês)</label>
                  <input
                    type="text"
                    placeholder="Ex: 2018 ou 05/2018"
                    value={residesSince}
                    onChange={(e) => setResidesSince(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quantidade de Membros</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    placeholder="Ex: 3"
                    value={membersCount}
                    onChange={(e) => setMembersCount(e.target.value ? Number(e.target.value) : '')}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Domicílio</label>
                  <select
                    value={residenceType}
                    onChange={(e) => setResidenceType(e.target.value as any)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  >
                    <option value="Casa">Casa</option>
                    <option value="Apartamento">Apartamento</option>
                    <option value="Cortiço">Cortiço</option>
                    <option value="Habitação Loteamento">Habitação em Loteamento</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Situação de Posse</label>
                  <select
                    value={ownership}
                    onChange={(e) => setOwnership(e.target.value as any)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  >
                    <option value="Próprio">Próprio</option>
                    <option value="Alugado">Alugado</option>
                    <option value="Cedido">Cedido</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Abastecimento de Água</label>
                  <select
                    value={waterSupply}
                    onChange={(e) => setWaterSupply(e.target.value as any)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  >
                    <option value="Rede Encanada">Rede Encanada</option>
                    <option value="Poço / Nascente">Poço / Nascente</option>
                    <option value="Cisterna">Cisterna</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              {/* Animais no Domicílio */}
              <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-200/80 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasPets}
                    onChange={(e) => setHasPets(e.target.checked)}
                    className="h-4 w-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                    <Dog className="h-4 w-4 text-teal-600" />
                    Possui Animais no Domicílio
                  </span>
                </label>

                {hasPets && (
                  <div>
                    <label className="block text-[11px] font-bold text-teal-800 mb-1">
                      Especifique os Animais e Quantidade:
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 2 cães e 1 gato"
                      value={petsDetail}
                      onChange={(e) => setPetsDetail(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Anotações do Domicílio</label>
                <textarea
                  placeholder="Observações sobre acesso, cão bravo, telefone da casa..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 h-16 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md transition"
                >
                  Salvar Cadastro Domiciliar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Link Member to Family Composition */}
      {linkingDomicileId && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-teal-600" />
                Agrupar Paciente nesta Família
              </h3>
              <button
                onClick={() => setLinkingDomicileId(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMemberToDomicile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Buscar Paciente Cadastrado (Google Contatos) *
                </label>

                <input
                  type="text"
                  placeholder="Digitar nome para filtrar..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full text-xs p-2 mb-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />

                <select
                  required
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 font-medium"
                >
                  <option value="">Selecione um paciente cadastrado...</option>
                  {contacts
                    .filter((c) =>
                      c.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
                      (c.cns && c.cns.includes(memberSearch))
                    )
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.cns ? `(CNS: ${c.cns})` : ''} - {c.microarea || 'Sem Microárea'}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Parentesco com o Domicílio / Família *
                </label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value as FamilyRelationship)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 font-semibold"
                >
                  {RELATIONSHIP_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="chkHead"
                  checked={isHeadOfHousehold || relationship === 'Responsável Familiar'}
                  onChange={(e) => setIsHeadOfHousehold(e.target.checked)}
                  className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                />
                <label htmlFor="chkHead" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Marcar este munícipe como Responsável Familiar (Chefe da Família)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLinkingDomicileId(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!selectedPatientId}
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-xl shadow-md transition"
                >
                  Vincular à Composição Familiar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Address Grouping & Google Contacts Company Field */}
      <AddressGroupModal
        isOpen={isAddressGroupModalOpen}
        onClose={() => setIsAddressGroupModalOpen(false)}
        contacts={contacts}
        domiciles={domiciles}
        onApplyGrouping={(updatedContacts, updatedDomiciles) => {
          if (onApplyGrouping) {
            onApplyGrouping(updatedContacts, updatedDomiciles);
          }
        }}
      />

      {/* Modal: Set Default Microarea and Apply to All */}
      <SetDefaultMicroareaModal
        isOpen={isSetMicroareaModalOpen}
        onClose={() => setIsSetMicroareaModalOpen(false)}
        contacts={contacts}
        domiciles={domiciles}
        onApplyMicroareaToAll={async (newMicroarea, applyToExisting) => {
          if (onApplyMicroareaToAll) {
            await onApplyMicroareaToAll(newMicroarea, applyToExisting);
          }
        }}
      />
    </div>
  );
};
