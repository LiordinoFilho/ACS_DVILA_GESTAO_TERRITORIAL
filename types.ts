export const BASE_MICROAREAS = [
  'Microárea 01 - Rosa',
  'Microárea 02 - Rosa',
  'Microárea 01 - Cinza',
  'Microárea 02 - Cinza',
  'Microárea 01 - Amarela',
  'Microárea 02 - Amarela',
  'Microárea 01 - Azul',
  'Microárea 02 - Azul'
] as const;

export const MICROAREAS = BASE_MICROAREAS;

export type MicroareaType = string;

export const DEFAULT_MICROAREA: string = 'Microárea 02 - Rosa';

export function cleanMicroareaName(str?: string): string {
  if (!str) return '';
  return str
    .replace(/[\u{1F534}\u{1F535}\u{1F7E1}\u{1F7E2}\u{1F7E0}\u{1F7E3}\u{1F7E4}\u{26AB}\u{26AA}\u{1F3F5}\u{1FA77}\u{1FA76}]/gu, '')
    .replace(/[🔴🔵🟡🟢🟠🟣🟤⚫⚪🩷🩶]/g, '')
    .replace(/^[\s•●·.-]+|[\s•●·.-]+$/g, '')
    .trim();
}

export function getSavedMicroareas(): string[] {
  try {
    const custom = localStorage.getItem('acs_custom_microareas');
    let customList: string[] = [];
    if (custom) {
      const parsed = JSON.parse(custom);
      if (Array.isArray(parsed)) {
        customList = parsed.map(cleanMicroareaName).filter(Boolean);
      }
    }
    const combined = Array.from(new Set([...BASE_MICROAREAS, ...customList]));
    return combined;
  } catch (e) {
    console.error('Error reading saved microareas:', e);
    return [...BASE_MICROAREAS];
  }
}

export function saveCustomMicroarea(microareaName: string): void {
  const cleaned = cleanMicroareaName(microareaName);
  if (!cleaned) return;
  try {
    const current = getSavedMicroareas();
    if (!current.includes(cleaned)) {
      const updated = [...current, cleaned];
      localStorage.setItem('acs_custom_microareas', JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Error saving custom microarea:', e);
  }
}

export function getDefaultMicroarea(): string {
  try {
    const saved = localStorage.getItem('acs_default_microarea');
    if (saved) {
      const cleaned = cleanMicroareaName(saved);
      if (cleaned) return cleaned;
    }
  } catch (e) {
    console.error('Error reading default microarea:', e);
  }
  return DEFAULT_MICROAREA;
}

export function setDefaultMicroarea(microarea: string): void {
  const cleaned = cleanMicroareaName(microarea);
  if (!cleaned) return;
  try {
    localStorage.setItem('acs_default_microarea', cleaned);
    saveCustomMicroarea(cleaned);
  } catch (e) {
    console.error('Error saving default microarea:', e);
  }
}

export function formatCustomMicroarea(numStr: string, colorStr: string): string {
  let cleanNum = numStr.trim();
  if (!cleanNum) cleanNum = '01';
  if (!/^micro[áa]rea/i.test(cleanNum)) {
    cleanNum = `Microárea ${cleanNum}`;
  } else {
    // Standardize capitalization
    cleanNum = cleanNum.replace(/^micro[áa]rea/i, 'Microárea');
  }

  let cleanColor = colorStr.trim();
  if (cleanColor) {
    // Capitalize first letter
    cleanColor = cleanColor.charAt(0).toUpperCase() + cleanColor.slice(1);
  }

  return cleanColor ? `${cleanNum} - ${cleanColor}` : cleanNum;
}

export interface MicroareaColorStyle {
  bg: string;
  text: string;
  border: string;
  dotBg: string;
  emoji: string;
}

export function getMicroareaStyle(microareaStr?: string): MicroareaColorStyle {
  if (!microareaStr) {
    return {
      bg: 'bg-pink-100',
      text: 'text-pink-900',
      border: 'border-pink-300',
      dotBg: 'bg-pink-500',
      emoji: ''
    };
  }

  const lower = microareaStr.toLowerCase();

  if (lower.includes('rosa') || lower.includes('pink')) {
    return { bg: 'bg-pink-100', text: 'text-pink-900', border: 'border-pink-300', dotBg: 'bg-pink-500', emoji: '' };
  }

  if (lower.includes('cinza') || lower.includes('gray') || lower.includes('grey') || lower.includes('preta') || lower.includes('preto')) {
    return { bg: 'bg-slate-200', text: 'text-slate-800', border: 'border-slate-400', dotBg: 'bg-slate-600', emoji: '' };
  }

  if (lower.includes('amarela') || lower.includes('amarelo') || lower.includes('yellow')) {
    return { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300', dotBg: 'bg-amber-500', emoji: '' };
  }

  if (lower.includes('azul') || lower.includes('blue')) {
    return { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-300', dotBg: 'bg-blue-500', emoji: '' };
  }

  if (lower.includes('verde') || lower.includes('green')) {
    return { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-300', dotBg: 'bg-emerald-500', emoji: '' };
  }

  if (lower.includes('roxo') || lower.includes('roxa') || lower.includes('purple') || lower.includes('violeta') || lower.includes('lilas') || lower.includes('lilás')) {
    return { bg: 'bg-purple-100', text: 'text-purple-900', border: 'border-purple-300', dotBg: 'bg-purple-500', emoji: '' };
  }

  if (lower.includes('laranja') || lower.includes('orange')) {
    return { bg: 'bg-orange-100', text: 'text-orange-900', border: 'border-orange-300', dotBg: 'bg-orange-500', emoji: '' };
  }

  if (lower.includes('vermelho') || lower.includes('vermelha') || lower.includes('red')) {
    return { bg: 'bg-red-100', text: 'text-red-900', border: 'border-red-300', dotBg: 'bg-red-500', emoji: '' };
  }

  if (lower.includes('marrom') || lower.includes('brown')) {
    return { bg: 'bg-stone-200', text: 'text-stone-900', border: 'border-stone-400', dotBg: 'bg-stone-600', emoji: '' };
  }

  if (lower.includes('turquesa') || lower.includes('cyan') || lower.includes('cian')) {
    return { bg: 'bg-cyan-100', text: 'text-cyan-900', border: 'border-cyan-300', dotBg: 'bg-cyan-500', emoji: '' };
  }

  return {
    bg: 'bg-teal-100',
    text: 'text-teal-900',
    border: 'border-teal-300',
    dotBg: 'bg-teal-500',
    emoji: ''
  };
}

export type VisitStatus =
  | 'pendente'
  | 'realizada'
  | 'nao_encontrado'
  | 'reagendado'
  | 'cancelado'
  | 'mudou_se_territorio'
  | 'mudou_se_municipio'
  | 'obito';

export type FamilyRelationship =
  | 'Responsável Familiar'
  | 'Cônjuge / Companheiro(a)'
  | 'Filho(a)'
  | 'Enteado(a)'
  | 'Pai / Mãe'
  | 'Irmão / Irmã'
  | 'Avô / Avó'
  | 'Neto(a)'
  | 'Outro Parente'
  | 'Não Parente';

export interface PatientHealthProfile {
  isPregnant?: boolean;
  gestationalAgeWeeks?: number;
  prenatalStartDate?: string; // Data de Abertura do Pré-Natal (YYYY-MM-DD)
  isPuerpera?: boolean; // Puérpera (Pós-parto)
  prenatalEndDate?: string; // Data de Fechamento do Pré-Natal / Parto (YYYY-MM-DD)
  isHypertensive?: boolean; // HAS (Hipertensão Arterial) / P.A
  isDiabetic?: boolean; // DM (Diabetes Mellitus) / Dia
  isBedridden?: boolean; // Acamado / Domiciliado
  isElderly?: boolean; // 60+ anos
  isChildUnder2?: boolean; // Criança 0-2 anos
  isBolsaFamilia?: boolean; // Beneficiário Bolsa Família
  isVaccinationUpToDate?: boolean;
  hasMentalCondition?: boolean;
  mentalHealthPrescriptionDate?: string; // Data da última atualização da receita (YYYY-MM-DD)
  mentalHealthMedications?: string[]; // Lista de remédios de saúde mental receitados
  mentalHealthPrescriptionLink?: string; // Link do Drive / arquivo da receita de Saúde Mental
  hasSpecialNeeds?: boolean;

  // Categorias adicionais de enfermidades e classificação de saúde
  hasAlcoholism?: boolean; // Álcool
  isEligibleFluVaccineHome?: boolean; // Apto a Vacinação Domiciliar da Gripe
  hasAsthma?: boolean; // Asma
  isSissCadwebUpdated?: boolean; // Cad. Atualizado Siss/Cadweb
  hasCancer?: boolean; // Câncer
  hasMalnutrition?: boolean; // Desnutrição
  hasChronicDiseases?: boolean; // Doenças Crônicas
  hasCOPD?: boolean; // DPOC
  hasHanseniasis?: boolean; // Hanseníase
  isInsulinDependent?: boolean; // InsulinoDependente
  hasOtherDrugsSubstanceUse?: boolean; // Outras Drogas
  isOxygenDependent?: boolean; // Oxigênio Dependente
  isPalliativeCare?: boolean; // Paliativos
  isPcdAuditory?: boolean; // PCD. Auditivo
  isPcdAutism?: boolean; // PCD. Autismo
  isPcdChronicMetabolic?: boolean; // PCD. Doença Metabólica Crônica
  isPcdPhysical?: boolean; // PCD. Físico
  isPcdIntellectual?: boolean; // PCD. Intelectual
  isPcdMental?: boolean; // PCD. Mental
  isPcdMultiple?: boolean; // PCD. Múltipla
  isPcdVisual?: boolean; // PCD. Visual
  hasSyphilis?: boolean; // Sífilis
  hasSymptomaticRespiratory?: boolean; // Sintomáticos Respiratórios
  isSmoker?: boolean; // Tabagista
  hasTuberculosis?: boolean; // Tuberculose
  hasSocialVulnerability?: boolean; // Vulnerabilidade Social

  notes?: string;
}

export interface GoogleContact {
  id: string;
  name: string;
  cns?: string; // Cartão Nacional de Saúde (CNS / SUS)
  cpf?: string;
  birthDate?: string;
  gender?: 'M' | 'F' | 'Outro';
  motherName?: string;
  email?: string;
  phone?: string;
  address?: string;
  addressNumber?: string; // Número da Casa
  addressComplement?: string; // Complemento (Apt, Bloco, etc)
  city?: string;
  state?: string;
  microarea?: string; // Ex: "Microárea 01"
  labels: string[];
  notes?: string;
  avatarUrl?: string;
  lat?: number;
  lng?: number;
  company?: string;
  domicileId?: string; // Vinculo com Domicilio
  unlinkedFromDomicile?: boolean; // Flag to prevent auto-recreating deleted domiciles
  familyRelationship?: FamilyRelationship;
  isHeadOfHousehold?: boolean; // Responsável Familiar
  healthProfile?: PatientHealthProfile;
}

export interface DomicileMember {
  patientId: string;
  patientName: string;
  relationship: FamilyRelationship;
  isHeadOfHousehold: boolean;
  cns?: string;
  birthDate?: string;
  phone?: string;
}

export interface Domicile {
  id: string;
  street: string; // Logradouro / Rua
  number: string;
  complement?: string;
  neighborhood: string; // Bairro
  zipCode?: string; // CEP
  city: string;
  state: string;
  microarea: string; // Microárea (ex: "Microárea 01")
  residenceType: 'Casa' | 'Apartamento' | 'Cortiço' | 'Habitação Loteamento' | 'Outro';
  ownership: 'Próprio' | 'Alugado' | 'Cedido' | 'Outro';
  waterSupply: 'Rede Encanada' | 'Poço / Nascente' | 'Cisterna' | 'Outro';
  sanitation: 'Rede Pública' | 'Fossa Séptica' | 'Fossa Rudimentar' | 'Sem Saneamento';
  garbageCollection: 'Coletado' | 'Queimado / Enterrado' | 'Descartado a Céu Aberto';
  hasElectricity: boolean;
  hasPets: boolean;
  petsDetail?: string;
  roomsCount?: number; // Quantidade de cômodos
  residesSince?: string; // Mora desde (ano/data)
  familyIncome?: '1 salário' | '2 salários' | '3 salários' | '4 salários ou mais' | string; // Renda Familiar
  membersCount?: number; // Quantidade de membros
  lat?: number;
  lng?: number;
  notes?: string;
  familyMembers: DomicileMember[];
  createdAt?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  contactId?: string;
  contactName?: string;
  domicileId?: string;
  phone?: string;
  address: string;
  city?: string;
  lat?: number;
  lng?: number;
  startTime: string; // e.g. "08:30"
  endTime: string;   // e.g. "09:30"
  date: string;      // "YYYY-MM-DD"
  visitReason?: string; // Ex: "Acompanhamento Gestante", "Busca Ativa", "Controle HAS/DM", "Cadastro Domiciliar"
  description?: string;
  status: VisitStatus;
  observation?: string;
  updatedAt?: string;
  googleEventId?: string;
  recurrence?: 'none' | 'weekly' | 'biweekly' | 'monthly' | 'six_months' | 'yearly';
  eventType?: 'visita' | 'alerta_consulta' | 'busca_ativa';
  isAutoScheduled?: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  picture?: string;
  microarea?: string;
  usfName?: string;
  isAuthenticated: boolean;
  isDemo?: boolean;
}

export interface DailySummary {
  total: number;
  realizadas: number;
  naoEncontradas: number;
  pendentes: number;
  reagendadas: number;
  canceladas: number;
  taxaSucesso: number;
}

export type TrashItemType = 'patient' | 'domicile' | 'event';
export type TrashRetentionDays = 0 | 7 | 15 | 30 | 60 | 90;

export interface TrashItem {
  id: string;
  type: TrashItemType;
  deletedAt: string;
  originalData: GoogleContact | Domicile | CalendarEvent;
  title: string;
  subtitle?: string;
}

