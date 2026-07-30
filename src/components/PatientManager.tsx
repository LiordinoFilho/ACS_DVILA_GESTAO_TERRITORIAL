import React, { useState, useMemo } from 'react';
import {
  GoogleContact,
  Domicile,
  FamilyRelationship,
  PatientHealthProfile,
  CalendarEvent,
  MICROAREAS,
  DEFAULT_MICROAREA,
  getMicroareaStyle,
  cleanMicroareaName,
  getSavedMicroareas,
  saveCustomMicroarea,
  setDefaultMicroarea
} from '../types';
import { searchAddressByCEP } from '../services/apiService';
import { generateAutoVisitsForPatient, generateRecurringEvents, addDays, calculateDetailedAge } from '../utils/acsScheduler';
import { parsePatientsCSV, generateSampleCSV, downloadCSV } from '../utils/csvParser';
import { MentalHealthPrescriptionModal } from './MentalHealthPrescriptionModal';
import { ReportExportModal } from './ReportExportModal';
import { SharePatientModal } from './SharePatientModal';
import { ImportSharedDataModal } from './ImportSharedDataModal';
import { AddressGroupModal } from './AddressGroupModal';
import { SetDefaultMicroareaModal } from './SetDefaultMicroareaModal';
import { MicroareaInputSelector } from './MicroareaInputSelector';
import { getContactStreet, getUniqueStreets, exportPatientsToExcel } from '../utils/exportUtils';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Heart,
  Baby,
  Activity,
  UserCheck,
  Tag,
  ExternalLink,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  FileText,
  User,
  ShieldCheck,
  Info,
  Loader2,
  Upload,
  Download,
  FileSpreadsheet,
  Printer,
  Sparkles,
  Repeat,
  Calendar as CalendarIcon,
  Brain,
  Pill,
  Link as LinkIcon,
  Share2,
  FileUp,
  Building,
  Layers
} from 'lucide-react';

interface PatientManagerProps {
  contacts: GoogleContact[];
  domiciles: Domicile[];
  events?: CalendarEvent[];
  onAddContact: (contact: GoogleContact) => void;
  onUpdateContact: (contact: GoogleContact) => void;
  onDeleteContact: (id: string) => void;
  onScheduleVisitForContact: (contact: GoogleContact) => void;
  onAddEventsBatch?: (events: CalendarEvent[]) => void;
  onImportContactsCSV?: (newContacts: GoogleContact[]) => void;
  onApplyGrouping?: (updatedContacts: GoogleContact[], updatedDomiciles: Domicile[]) => void;
  onApplyMicroareaToAll?: (selectedMicroarea: string, applyToExisting: boolean) => Promise<void> | void;
}

// WhatsApp Icon SVG Component
const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c0-5.445 4.43-9.874 9.877-9.874 2.636 0 5.115 1.026 6.978 2.89a9.82 9.82 0 012.883 6.981c.001 5.447-4.428 9.875-9.859 9.875M12.05 2C6.49 2 1.98 6.51 1.98 12.07c0 1.98.57 3.82 1.57 5.37L2 22l4.71-1.51a10.015 10.015 0 005.34 1.53c5.56 0 10.07-4.51 10.07-10.07C22.12 6.51 17.61 2 12.05 2z" />
  </svg>
);

export const PatientManager: React.FC<PatientManagerProps> = ({
  contacts,
  domiciles,
  events = [],
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  onScheduleVisitForContact,
  onAddEventsBatch,
  onImportContactsCSV,
  onApplyGrouping,
  onApplyMicroareaToAll
}) => {
  const [selectedFilter, setSelectedFilter] = useState<
    'todos' | 'gestante' | 'puerpera' | 'hipertenso' | 'diabetico' | 'acamado' | 'crianca' | 'idoso' | 'deficiencia'
  >('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMicroarea, setSelectedMicroarea] = useState('todas');
  const [selectedStreet, setSelectedStreet] = useState<string>('todas');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSetMicroareaModalOpen, setIsSetMicroareaModalOpen] = useState(false);
  const [sharingPatient, setSharingPatient] = useState<GoogleContact | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isImportSharedModalOpen, setIsImportSharedModalOpen] = useState(false);
  const [isAddressGroupModalOpen, setIsAddressGroupModalOpen] = useState(false);
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);

  const handleOpenShareModal = (contact: GoogleContact) => {
    setSharingPatient(contact);
    setIsShareModalOpen(true);
  };

  const handleImportSharedSuccess = (imported: {
    contacts: GoogleContact[];
    domiciles: Domicile[];
    events: CalendarEvent[];
  }) => {
    if (onImportContactsCSV && imported.contacts.length > 0) {
      onImportContactsCSV(imported.contacts);
    } else {
      imported.contacts.forEach((c) => onAddContact(c));
    }
    if (onAddEventsBatch && imported.events.length > 0) {
      onAddEventsBatch(imported.events);
    }
  };

  // Modal State: Patient Form (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);

  // Patient Personal Form Fields
  const [name, setName] = useState('');
  const [cns, setCns] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('1990-01-01');
  const [gender, setGender] = useState<'M' | 'F' | 'Outro'>('F');
  const [motherName, setMotherName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [addressNeighborhood, setAddressNeighborhood] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [cep, setCep] = useState('');
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [microarea, setMicroarea] = useState<string>(DEFAULT_MICROAREA);
  const [isMicroareaDefaultChecked, setIsMicroareaDefaultChecked] = useState(false);

  // Helper to build formatted full address string
  const buildFullAddress = (street: string, num: string, comp: string, neigh: string, city: string) => {
    const parts = [];
    if (street) parts.push(street);
    if (num) parts.push(`Nº ${num}`);
    if (comp) parts.push(comp);
    if (neigh) parts.push(neigh);
    if (city) parts.push(city);
    return parts.join(', ');
  };

  // CEP Auto-Fill via Free ViaCEP API
  const handleCepSearch = async () => {
    if (!cep) return;
    setIsSearchingCep(true);
    const res = await searchAddressByCEP(cep);
    setIsSearchingCep(false);

    if (res) {
      const st = res.logradouro || '';
      const nh = res.bairro || '';
      const ct = (res.localidade && res.uf) ? `${res.localidade} - ${res.uf}` : '';

      setAddressStreet(st);
      setAddressNeighborhood(nh);
      setAddressCity(ct);

      const full = buildFullAddress(st, addressNumber, addressComplement, nh, ct);
      setAddress(full);
    } else {
      alert('CEP não encontrado via API ViaCEP.');
    }
  };
  const [domicileId, setDomicileId] = useState('');

  // Auto-fill address when selecting an existing registered domicile
  const handleSelectDomicile = (selectedDomId: string) => {
    setDomicileId(selectedDomId);
    if (!selectedDomId) return;

    const dom = domiciles.find((d) => d.id === selectedDomId);
    if (dom) {
      const street = dom.street || '';
      const number = dom.number || '';
      const complement = dom.complement || '';
      const neighborhood = dom.neighborhood || '';
      const city = dom.city || 'São Paulo - SP';

      setAddressStreet(street);
      setAddressNumber(number);
      setAddressComplement(complement);
      setAddressNeighborhood(neighborhood);
      setAddressCity(city);
      setAddress(buildFullAddress(street, number, complement, neighborhood, city));
      if (dom.cep) setCep(dom.cep);
      if (dom.microarea) setMicroarea(dom.microarea);
    }
  };
  const [familyRelationship, setFamilyRelationship] = useState<FamilyRelationship>('Responsável Familiar');
  const [isHeadOfHousehold, setIsHeadOfHousehold] = useState(false);
  const [notes, setNotes] = useState('');

  // Health Profile Fields
  const [isPregnant, setIsPregnant] = useState(false);
  const [gestationalAgeWeeks, setGestationalAgeWeeks] = useState(12);
  const [prenatalStartDate, setPrenatalStartDate] = useState('');
  const [isPuerpera, setIsPuerpera] = useState(false);
  const [prenatalEndDate, setPrenatalEndDate] = useState('');
  const [isHypertensive, setIsHypertensive] = useState(false);
  const [isDiabetic, setIsDiabetic] = useState(false);
  const [isBedridden, setIsBedridden] = useState(false);
  const [isElderly, setIsElderly] = useState(false);
  const [isChildUnder2, setIsChildUnder2] = useState(false);
  const [isBolsaFamilia, setIsBolsaFamilia] = useState(false);
  const [hasSpecialNeeds, setHasSpecialNeeds] = useState(false);
  const [hasMentalCondition, setHasMentalCondition] = useState(false);
  const [isVaccinationUpToDate, setIsVaccinationUpToDate] = useState(true);

  // Categorias Adicionais de Enfermidades e Acompanhamento
  const [hasAlcoholism, setHasAlcoholism] = useState(false);
  const [isEligibleFluVaccineHome, setIsEligibleFluVaccineHome] = useState(false);
  const [hasAsthma, setHasAsthma] = useState(false);
  const [isSissCadwebUpdated, setIsSissCadwebUpdated] = useState(false);
  const [hasCancer, setHasCancer] = useState(false);
  const [hasMalnutrition, setHasMalnutrition] = useState(false);
  const [hasChronicDiseases, setHasChronicDiseases] = useState(false);
  const [hasCOPD, setHasCOPD] = useState(false);
  const [hasHanseniasis, setHasHanseniasis] = useState(false);
  const [isInsulinDependent, setIsInsulinDependent] = useState(false);
  const [hasOtherDrugsSubstanceUse, setHasOtherDrugsSubstanceUse] = useState(false);
  const [isOxygenDependent, setIsOxygenDependent] = useState(false);
  const [isPalliativeCare, setIsPalliativeCare] = useState(false);
  const [isPcdAuditory, setIsPcdAuditory] = useState(false);
  const [isPcdAutism, setIsPcdAutism] = useState(false);
  const [isPcdChronicMetabolic, setIsPcdChronicMetabolic] = useState(false);
  const [isPcdPhysical, setIsPcdPhysical] = useState(false);
  const [isPcdIntellectual, setIsPcdIntellectual] = useState(false);
  const [isPcdMental, setIsPcdMental] = useState(false);
  const [isPcdMultiple, setIsPcdMultiple] = useState(false);
  const [isPcdVisual, setIsPcdVisual] = useState(false);
  const [hasSyphilis, setHasSyphilis] = useState(false);
  const [hasSymptomaticRespiratory, setHasSymptomaticRespiratory] = useState(false);
  const [isSmoker, setIsSmoker] = useState(false);
  const [hasTuberculosis, setHasTuberculosis] = useState(false);
  const [hasSocialVulnerability, setHasSocialVulnerability] = useState(false);

  const [healthNotes, setHealthNotes] = useState('');

  // Mental Health Prescription States
  const [mentalHealthPrescriptionDate, setMentalHealthPrescriptionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [mentalHealthMedications, setMentalHealthMedications] = useState<string[]>([]);
  const [mentalHealthPrescriptionLink, setMentalHealthPrescriptionLink] = useState<string>('');
  const [isMentalHealthModalOpen, setIsMentalHealthModalOpen] = useState(false);
  const [mentalHealthTargetPatient, setMentalHealthTargetPatient] = useState<{ id?: string; name: string } | null>(null);

  // CSV Import Modal State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvRawText, setCsvRawText] = useState('');
  const [csvPreviewPatients, setCsvPreviewPatients] = useState<GoogleContact[]>([]);
  const [csvStatusMessage, setCsvStatusMessage] = useState('');

  // Schedule Visit Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleTargetContact, setScheduleTargetContact] = useState<GoogleContact | null>(null);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleStartTime, setScheduleStartTime] = useState('08:30');
  const [scheduleEndTime, setScheduleEndTime] = useState('09:30');
  const [scheduleReason, setScheduleReason] = useState('Acompanhamento de Saúde');
  const [scheduleRecurrence, setScheduleRecurrence] = useState<'none' | 'weekly' | 'biweekly' | 'monthly' | 'six_months' | 'yearly'>('none');
  const [scheduleDescription, setScheduleDescription] = useState('');

  // Helper function to launch WhatsApp
  const handleOpenWhatsApp = (phoneNumber: string, patientName: string) => {
    if (!phoneNumber) return;
    const cleanDigits = phoneNumber.replace(/\D/g, '');
    if (!cleanDigits) return;

    // Add country code 55 for Brazil if not present
    const formattedNumber = cleanDigits.length <= 11 ? `55${cleanDigits}` : cleanDigits;
    const message = encodeURIComponent(`Olá ${patientName}, sou seu Agente Comunitário de Saúde (ACS). Entrei em contato referente ao seu acompanhamento na USF.`);
    
    window.open(`https://wa.me/${formattedNumber}?text=${message}`, '_blank');
  };

  // Helper to calculate age in years
  const calculateAge = (dateStr?: string) => {
    if (!dateStr) return null;
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  };

  const handleOpenQuickMentalHealthModal = (contact: GoogleContact) => {
    setMentalHealthTargetPatient({ id: contact.id, name: contact.name });
    setMentalHealthPrescriptionDate(contact.healthProfile?.mentalHealthPrescriptionDate || new Date().toISOString().split('T')[0]);
    setMentalHealthMedications(contact.healthProfile?.mentalHealthMedications || []);
    setMentalHealthPrescriptionLink(contact.healthProfile?.mentalHealthPrescriptionLink || '');
    setIsMentalHealthModalOpen(true);
  };

  const handleSaveMentalHealthPrescription = (date: string, meds: string[], link?: string) => {
    setMentalHealthPrescriptionDate(date);
    setMentalHealthMedications(meds);
    setMentalHealthPrescriptionLink(link || '');
    setHasMentalCondition(true);

    if (mentalHealthTargetPatient?.id) {
      const targetContact = contacts.find((c) => c.id === mentalHealthTargetPatient.id);
      if (targetContact) {
        const updatedProfile: PatientHealthProfile = {
          ...targetContact.healthProfile,
          hasMentalCondition: true,
          mentalHealthPrescriptionDate: date,
          mentalHealthMedications: meds,
          mentalHealthPrescriptionLink: link
        };

        const updatedContact: GoogleContact = {
          ...targetContact,
          healthProfile: updatedProfile
        };

        onUpdateContact(updatedContact);

        const newAlerts = generateAutoVisitsForPatient(updatedContact, events);
        if (newAlerts.length > 0 && onAddEventsBatch) {
          onAddEventsBatch(newAlerts);
          alert(`✅ Receita de Saúde Mental atualizada para ${updatedContact.name}!\n📅 ${newAlerts.length} alerta(s) de renovação a cada 2 meses (60 dias) agendados com sucesso.`);
        }
      }
    }
  };

  // Open Edit Modal with prepopulated values
  const handleStartEdit = (contact: GoogleContact) => {
    setEditingPatientId(contact.id);
    setName(contact.name || '');
    setCns(contact.cns || '');
    setCpf(contact.cpf || '');
    setBirthDate(contact.birthDate || '1990-01-01');
    setGender(contact.gender || 'F');
    setMotherName(contact.motherName || '');
    setPhone(contact.phone || '');
    setEmail(contact.email || '');
    setAddress(contact.address || '');
    setAddressNumber(contact.addressNumber || '');
    setAddressComplement(contact.addressComplement || '');
    setAddressStreet(contact.address ? contact.address.split(',')[0] || '' : '');
    setAddressNeighborhood('');
    setAddressCity(contact.city ? `${contact.city} - ${contact.state || 'SP'}` : '');
    setMicroarea(contact.microarea || DEFAULT_MICROAREA);
    setDomicileId(contact.domicileId || '');
    setFamilyRelationship(contact.familyRelationship || 'Responsável Familiar');
    setIsHeadOfHousehold(contact.isHeadOfHousehold || false);
    setNotes(contact.notes || '');

    const hp = contact.healthProfile;
    setIsPregnant(hp?.isPregnant || false);
    setGestationalAgeWeeks(hp?.gestationalAgeWeeks || 12);
    setPrenatalStartDate(hp?.prenatalStartDate || '');
    setIsPuerpera(hp?.isPuerpera || false);
    setPrenatalEndDate(hp?.prenatalEndDate || '');
    setIsHypertensive(hp?.isHypertensive || false);
    setIsDiabetic(hp?.isDiabetic || false);
    setIsBedridden(hp?.isBedridden || false);
    setIsElderly(hp?.isElderly || false);
    setIsChildUnder2(hp?.isChildUnder2 || false);
    setIsBolsaFamilia(hp?.isBolsaFamilia || false);
    setHasSpecialNeeds(hp?.hasSpecialNeeds || false);
    setHasMentalCondition(hp?.hasMentalCondition || false);
    setMentalHealthPrescriptionDate(hp?.mentalHealthPrescriptionDate || new Date().toISOString().split('T')[0]);
    setMentalHealthMedications(hp?.mentalHealthMedications || []);
    setMentalHealthPrescriptionLink(hp?.mentalHealthPrescriptionLink || '');
    setIsVaccinationUpToDate(hp?.isVaccinationUpToDate ?? true);

    setHasAlcoholism(hp?.hasAlcoholism || false);
    setIsEligibleFluVaccineHome(hp?.isEligibleFluVaccineHome || false);
    setHasAsthma(hp?.hasAsthma || false);
    setIsSissCadwebUpdated(hp?.isSissCadwebUpdated || false);
    setHasCancer(hp?.hasCancer || false);
    setHasMalnutrition(hp?.hasMalnutrition || false);
    setHasChronicDiseases(hp?.hasChronicDiseases || false);
    setHasCOPD(hp?.hasCOPD || false);
    setHasHanseniasis(hp?.hasHanseniasis || false);
    setIsInsulinDependent(hp?.isInsulinDependent || false);
    setHasOtherDrugsSubstanceUse(hp?.hasOtherDrugsSubstanceUse || false);
    setIsOxygenDependent(hp?.isOxygenDependent || false);
    setIsPalliativeCare(hp?.isPalliativeCare || false);
    setIsPcdAuditory(hp?.isPcdAuditory || false);
    setIsPcdAutism(hp?.isPcdAutism || false);
    setIsPcdChronicMetabolic(hp?.isPcdChronicMetabolic || false);
    setIsPcdPhysical(hp?.isPcdPhysical || false);
    setIsPcdIntellectual(hp?.isPcdIntellectual || false);
    setIsPcdMental(hp?.isPcdMental || false);
    setIsPcdMultiple(hp?.isPcdMultiple || false);
    setIsPcdVisual(hp?.isPcdVisual || false);
    setHasSyphilis(hp?.hasSyphilis || false);
    setHasSymptomaticRespiratory(hp?.hasSymptomaticRespiratory || false);
    setIsSmoker(hp?.isSmoker || false);
    setHasTuberculosis(hp?.hasTuberculosis || false);
    setHasSocialVulnerability(hp?.hasSocialVulnerability || false);

    setHealthNotes(hp?.notes || '');

    setIsModalOpen(true);
  };

  const handleStartNew = () => {
    setEditingPatientId(null);
    setName('');
    setCns('');
    setCpf('');
    setBirthDate('1990-01-01');
    setGender('F');
    setMotherName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setAddressStreet('');
    setAddressNumber('');
    setAddressComplement('');
    setAddressNeighborhood('');
    setAddressCity('');
    setCep('');
    setMicroarea(DEFAULT_MICROAREA);
    setDomicileId('');
    setFamilyRelationship('Responsável Familiar');
    setIsHeadOfHousehold(false);
    setNotes('');

    setIsPregnant(false);
    setGestationalAgeWeeks(12);
    setPrenatalStartDate('');
    setIsPuerpera(false);
    setPrenatalEndDate('');
    setIsHypertensive(false);
    setIsDiabetic(false);
    setIsBedridden(false);
    setIsElderly(false);
    setIsChildUnder2(false);
    setIsBolsaFamilia(false);
    setHasSpecialNeeds(false);
    setHasMentalCondition(false);
    setMentalHealthPrescriptionDate(new Date().toISOString().split('T')[0]);
    setMentalHealthMedications([]);
    setMentalHealthPrescriptionLink('');
    setIsVaccinationUpToDate(true);

    setHasAlcoholism(false);
    setIsEligibleFluVaccineHome(false);
    setHasAsthma(false);
    setIsSissCadwebUpdated(false);
    setHasCancer(false);
    setHasMalnutrition(false);
    setHasChronicDiseases(false);
    setHasCOPD(false);
    setHasHanseniasis(false);
    setIsInsulinDependent(false);
    setHasOtherDrugsSubstanceUse(false);
    setIsOxygenDependent(false);
    setIsPalliativeCare(false);
    setIsPcdAuditory(false);
    setIsPcdAutism(false);
    setIsPcdChronicMetabolic(false);
    setIsPcdPhysical(false);
    setIsPcdIntellectual(false);
    setIsPcdMental(false);
    setIsPcdMultiple(false);
    setIsPcdVisual(false);
    setHasSyphilis(false);
    setHasSymptomaticRespiratory(false);
    setIsSmoker(false);
    setHasTuberculosis(false);
    setHasSocialVulnerability(false);

    setHealthNotes('');

    setIsModalOpen(true);
  };

  // Submit Patient Form & Auto-Schedule Visits
  const handleSubmitPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const cleanMa = cleanMicroareaName(microarea) || DEFAULT_MICROAREA;
    saveCustomMicroarea(cleanMa);

    if (isMicroareaDefaultChecked) {
      setDefaultMicroarea(cleanMa);
      if (onApplyMicroareaToAll) {
        onApplyMicroareaToAll(cleanMa, true);
      }
    }

    // Check detailed age to auto-flag elderly or child under 2
    const { isElderly: autoElderly, isChildUnder2: autoChild } = calculateDetailedAge(birthDate);
    const finalElderly = isElderly || autoElderly;
    const finalChild = isChildUnder2 || autoChild;

    // Generate automatic Google Contact labels
    const autoLabels = ['Google Contatos', cleanMa];
    if (isPregnant) autoLabels.push('Gestante');
    if (isPuerpera) autoLabels.push('Puérpera');
    if (isHypertensive) autoLabels.push('Hipertenso');
    if (isDiabetic) autoLabels.push('Diabético');
    if (isBedridden) autoLabels.push('Acamado');
    if (finalChild) autoLabels.push('Criança (0-2a)');
    if (finalElderly) autoLabels.push('Idoso');
    if (isBolsaFamilia) autoLabels.push('Bolsa Família');
    if (hasAlcoholism) autoLabels.push('Álcool');
    if (isEligibleFluVaccineHome) autoLabels.push('Vacinação Gripe Domiciliar');
    if (hasAsthma) autoLabels.push('Asma');
    if (isSissCadwebUpdated) autoLabels.push('Cad. Siss/Cadweb');
    if (hasCancer) autoLabels.push('Câncer');
    if (hasMalnutrition) autoLabels.push('Desnutrição');
    if (hasChronicDiseases) autoLabels.push('Doenças Crônicas');
    if (hasCOPD) autoLabels.push('DPOC');
    if (hasHanseniasis) autoLabels.push('Hanseníase');
    if (isInsulinDependent) autoLabels.push('InsulinoDependente');
    if (hasOtherDrugsSubstanceUse) autoLabels.push('Outras Drogas');
    if (isOxygenDependent) autoLabels.push('Oxigênio Dependente');
    if (isPalliativeCare) autoLabels.push('Paliativos');
    if (isPcdAuditory) autoLabels.push('PCD Auditivo');
    if (isPcdAutism) autoLabels.push('PCD Autismo');
    if (isPcdChronicMetabolic) autoLabels.push('PCD Metabólica');
    if (isPcdPhysical) autoLabels.push('PCD Físico');
    if (isPcdIntellectual) autoLabels.push('PCD Intelectual');
    if (isPcdMental) autoLabels.push('PCD Mental');
    if (isPcdMultiple) autoLabels.push('PCD Múltipla');
    if (isPcdVisual) autoLabels.push('PCD Visual');
    if (hasSyphilis) autoLabels.push('Sífilis');
    if (hasSymptomaticRespiratory) autoLabels.push('Sintomático Respiratório');
    if (isSmoker) autoLabels.push('Tabagista');
    if (hasTuberculosis) autoLabels.push('Tuberculose');
    if (hasSocialVulnerability) autoLabels.push('Vulnerabilidade Social');
    if (hasMentalCondition) autoLabels.push('Saúde Mental');

    const healthProfile: PatientHealthProfile = {
      isPregnant,
      gestationalAgeWeeks: isPregnant ? gestationalAgeWeeks : undefined,
      prenatalStartDate: isPregnant ? prenatalStartDate : undefined,
      isPuerpera,
      prenatalEndDate: isPuerpera ? prenatalEndDate : undefined,
      isHypertensive,
      isDiabetic,
      isBedridden,
      isElderly: finalElderly,
      isChildUnder2: finalChild,
      isBolsaFamilia,
      hasSpecialNeeds,
      hasMentalCondition,
      mentalHealthPrescriptionDate: hasMentalCondition ? mentalHealthPrescriptionDate : undefined,
      mentalHealthMedications: hasMentalCondition ? mentalHealthMedications : undefined,
      mentalHealthPrescriptionLink: hasMentalCondition ? mentalHealthPrescriptionLink : undefined,
      isVaccinationUpToDate,
      hasAlcoholism,
      isEligibleFluVaccineHome,
      hasAsthma,
      isSissCadwebUpdated,
      hasCancer,
      hasMalnutrition,
      hasChronicDiseases,
      hasCOPD,
      hasHanseniasis,
      isInsulinDependent,
      hasOtherDrugsSubstanceUse,
      isOxygenDependent,
      isPalliativeCare,
      isPcdAuditory,
      isPcdAutism,
      isPcdChronicMetabolic,
      isPcdPhysical,
      isPcdIntellectual,
      isPcdMental,
      isPcdMultiple,
      isPcdVisual,
      hasSyphilis,
      hasSymptomaticRespiratory,
      isSmoker,
      hasTuberculosis,
      hasSocialVulnerability,
      notes: healthNotes
    };

    const finalAddress = buildFullAddress(
      addressStreet,
      addressNumber,
      addressComplement,
      addressNeighborhood,
      addressCity
    ) || address;

    const patientData: GoogleContact = {
      id: editingPatientId || `cnt_${Date.now()}`,
      name,
      cns,
      cpf,
      birthDate,
      gender,
      motherName,
      phone,
      email,
      address: finalAddress,
      addressNumber,
      addressComplement,
      microarea,
      domicileId,
      familyRelationship,
      isHeadOfHousehold,
      labels: autoLabels,
      notes,
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`,
      healthProfile
    };

    if (editingPatientId) {
      onUpdateContact(patientData);
    } else {
      onAddContact(patientData);
    }

    // Auto-generate priority visits for this patient
    const autoVisits = generateAutoVisitsForPatient(patientData, events);
    if (autoVisits.length > 0 && onAddEventsBatch) {
      onAddEventsBatch(autoVisits);
      alert(`✅ Paciente salvo!\n📅 ${autoVisits.length} visita(s) e alerta(s) de acompanhamento e-SUS foram agendados automaticamente.`);
    }

    setIsModalOpen(false);
  };

  // Open Schedule Modal with Date & Recurrence Picker
  const handleOpenScheduleModal = (contact: GoogleContact) => {
    setScheduleTargetContact(contact);
    setScheduleDate(new Date().toISOString().split('T')[0]);
    setScheduleStartTime('08:30');
    setScheduleEndTime('09:30');
    setScheduleReason('Acompanhamento de Saúde');
    setScheduleRecurrence('none');
    setScheduleDescription(`Visita Domiciliar ACS para o munícipe ${contact.name}`);
    setIsScheduleModalOpen(true);
  };

  // Submit Schedule Modal
  const handleConfirmScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleTargetContact) return;

    const baseEvent: CalendarEvent = {
      id: `ev_${Date.now()}`,
      title: `Visita Domiciliar - ${scheduleTargetContact.name}`,
      address: scheduleTargetContact.address || 'Endereço no Território',
      startTime: scheduleStartTime,
      endTime: scheduleEndTime,
      date: scheduleDate,
      visitReason: scheduleReason,
      description: scheduleDescription,
      contactId: scheduleTargetContact.id,
      contactName: scheduleTargetContact.name,
      domicileId: scheduleTargetContact.domicileId,
      phone: scheduleTargetContact.phone,
      status: 'pendente',
      recurrence: scheduleRecurrence
    };

    const generated = generateRecurringEvents(baseEvent, scheduleRecurrence);
    if (onAddEventsBatch) {
      onAddEventsBatch(generated);
    } else {
      generated.forEach((g) => onScheduleVisitForContact(scheduleTargetContact));
    }

    setIsScheduleModalOpen(false);
    alert(`📅 ${generated.length} visita(s) agendada(s) com sucesso para ${scheduleTargetContact.name}!`);
  };

  // Run Auto-Scheduler for ALL existing contacts
  const handleRunAllAutoSchedulers = () => {
    let totalGenerated: CalendarEvent[] = [];
    contacts.forEach((contact) => {
      const generated = generateAutoVisitsForPatient(contact, [...events, ...totalGenerated]);
      totalGenerated = [...totalGenerated, ...generated];
    });

    if (totalGenerated.length > 0) {
      if (onAddEventsBatch) {
        onAddEventsBatch(totalGenerated);
      }
      alert(`🎉 Sucesso! ${totalGenerated.length} agendamento(s) e alerta(s) prioritários e-SUS (Gestantes, Idosos, RNs, Hipertensos, Diabéticos, Bolsa Família) foram criados na agenda.`);
    } else {
      alert('ℹ️ Todos os pacientes já possuem seus agendamentos prioritários atualizados na agenda.');
    }
  };

  // CSV Import Handlers
  const handleOpenCsvModal = () => {
    setCsvRawText('');
    setCsvPreviewPatients([]);
    setCsvStatusMessage('');
    setIsCsvModalOpen(true);
  };

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setCsvRawText(content);
        const parsed = parsePatientsCSV(content);
        setCsvPreviewPatients(parsed);
        setCsvStatusMessage(`${parsed.length} paciente(s) localizado(s) no arquivo CSV.`);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleConfirmCsvImport = () => {
    if (csvPreviewPatients.length === 0) return;

    if (onImportContactsCSV) {
      onImportContactsCSV(csvPreviewPatients);
    } else {
      csvPreviewPatients.forEach((p) => onAddContact(p));
    }

    // Run auto-scheduler on imported contacts
    let autoVisits: CalendarEvent[] = [];
    csvPreviewPatients.forEach((p) => {
      const visits = generateAutoVisitsForPatient(p, [...events, ...autoVisits]);
      autoVisits = [...autoVisits, ...visits];
    });

    if (autoVisits.length > 0 && onAddEventsBatch) {
      onAddEventsBatch(autoVisits);
    }

    setIsCsvModalOpen(false);
    alert(`✨ Importação Concluída!\n\n👥 ${csvPreviewPatients.length} pacientes importados para o e-SUS.\n📅 ${autoVisits.length} visita(s) e alerta(s) de grupos prioritários agendados automaticamente!`);
  };

  // Extract unique Microareas
  const microareas = useMemo(() => {
    const set = new Set<string>(getSavedMicroareas());
    contacts.forEach((c) => {
      if (c.microarea) set.add(cleanMicroareaName(c.microarea));
    });
    return Array.from(set).map(cleanMicroareaName).filter(Boolean);
  }, [contacts]);

  // Extract unique Streets in territory
  const availableStreets = useMemo(() => {
    return getUniqueStreets(contacts, domiciles);
  }, [contacts, domiciles]);

  // Filter Patients by Search, Microarea, Street, and Health Category
  const filteredContacts = contacts.filter((c) => {
    const fullSearch = `${c.name} ${c.cns || ''} ${c.cpf || ''} ${c.motherName || ''} ${c.phone || ''} ${c.address || ''}`.toLowerCase();
    const matchesQuery = fullSearch.includes(searchQuery.toLowerCase());

    if (!matchesQuery) return false;

    if (selectedMicroarea !== 'todas' && c.microarea !== selectedMicroarea) {
      return false;
    }

    // Street Filter
    if (selectedStreet !== 'todas') {
      const contactStreet = getContactStreet(c, domiciles);
      if (contactStreet.toLowerCase() !== selectedStreet.toLowerCase()) {
        return false;
      }
    }

    const hp = c.healthProfile;
    if (selectedFilter === 'todos') return true;
    if (selectedFilter === 'gestante') return hp?.isPregnant;
    if (selectedFilter === 'puerpera') return hp?.isPuerpera;
    if (selectedFilter === 'hipertenso') return hp?.isHypertensive;
    if (selectedFilter === 'diabetico') return hp?.isDiabetic;
    if (selectedFilter === 'acamado') return hp?.isBedridden;
    if (selectedFilter === 'crianca') return hp?.isChildUnder2;
    if (selectedFilter === 'idoso') return hp?.isElderly;
    if (selectedFilter === 'deficiencia') return hp?.hasSpecialNeeds || hp?.isPcdAuditory || hp?.isPcdAutism || hp?.isPcdChronicMetabolic || hp?.isPcdPhysical || hp?.isPcdIntellectual || hp?.isPcdMental || hp?.isPcdMultiple || hp?.isPcdVisual;
    if (selectedFilter === 'alcool') return hp?.hasAlcoholism;
    if (selectedFilter === 'vacina_gripe') return hp?.isEligibleFluVaccineHome;
    if (selectedFilter === 'asma') return hp?.hasAsthma;
    if (selectedFilter === 'cadweb') return hp?.isSissCadwebUpdated;
    if (selectedFilter === 'cancer') return hp?.hasCancer;
    if (selectedFilter === 'desnutricao') return hp?.hasMalnutrition;
    if (selectedFilter === 'doencas_cronicas') return hp?.hasChronicDiseases;
    if (selectedFilter === 'dpoc') return hp?.hasCOPD;
    if (selectedFilter === 'hanseniase') return hp?.hasHanseniasis;
    if (selectedFilter === 'insulino') return hp?.isInsulinDependent;
    if (selectedFilter === 'outras_drogas') return hp?.hasOtherDrugsSubstanceUse;
    if (selectedFilter === 'oxigenio') return hp?.isOxygenDependent;
    if (selectedFilter === 'paliativos') return hp?.isPalliativeCare;
    if (selectedFilter === 'saude_mental') return hp?.hasMentalCondition;
    if (selectedFilter === 'sifilis') return hp?.hasSyphilis;
    if (selectedFilter === 'sintomaticos_resp') return hp?.hasSymptomaticRespiratory;
    if (selectedFilter === 'tabagista') return hp?.isSmoker;
    if (selectedFilter === 'tuberculose') return hp?.hasTuberculosis;
    if (selectedFilter === 'vulnerabilidade') return hp?.hasSocialVulnerability;
    if (selectedFilter === 'bolsa_familia') return hp?.isBolsaFamilia;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Cadastros Individuais (Todos os Pacientes)
            </h2>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {contacts.length} Pacientes Cadastrados
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Lista e fichas do e-SUS com Cartão SUS (CNS), CPF, agendamento automático para grupos prioritários e <strong>importação por arquivo .CSV</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            title="Relatório em PDF e Planilha Excel para qualquer Categoria e Rua"
          >
            <Printer className="h-4 w-4" />
            <span>Relatório / PDF & Excel</span>
          </button>

          <button
            onClick={() => downloadCSV('modelo_pacientes_acs.csv', generateSampleCSV())}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition"
            title="Baixar modelo de arquivo .CSV pré-formatado"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Modelo .CSV</span>
          </button>

          <button
            onClick={handleOpenCsvModal}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            title="Importar lista completa de munícipes via arquivo .CSV"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Importar .CSV</span>
          </button>

          <button
            onClick={() => setIsImportSharedModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            title="Importar ficha de paciente transferida por outro Agente de Saúde (.JSON)"
          >
            <FileUp className="h-3.5 w-3.5" />
            <span>Importar Ficha Recebida</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsAddressGroupModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
              title="Agrupamento automático ativo! Normaliza CEP, busca ViaCEP, preenche Casa no Google Contatos e agrupa domicílios sem interferência."
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Agrupar por CEP & Residência</span>
            </button>
            <span className="hidden sm:flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Auto
            </span>
          </div>

          <button
            onClick={handleRunAllAutoSchedulers}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold shadow-xs transition"
            title="Gerar automaticamente agendamentos e alertas e-SUS para todos os grupos prioritários"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Agendamento Automático</span>
          </button>

          <button
            onClick={handleStartNew}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Cadastro</span>
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
              placeholder="Buscar por Nome do Paciente, CNS / Cartão SUS, CPF, Telefone, Nome da Mãe ou Endereço..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800 font-medium"
            />
          </div>

          {/* Street selector dropdown */}
          <select
            value={selectedStreet}
            onChange={(e) => setSelectedStreet(e.target.value)}
            className="text-xs py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[200px]"
          >
            <option value="todas">📍 Todas as Ruas ({contacts.length})</option>
            {availableStreets.map((st) => {
              const countOnStreet = contacts.filter((c) => getContactStreet(c, domiciles).toLowerCase() === st.toLowerCase()).length;
              return (
                <option key={st} value={st}>
                  📍 {st} ({countOnStreet})
                </option>
              );
            })}
          </select>

          {/* Microarea selector dropdown */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedMicroarea}
              onChange={(e) => setSelectedMicroarea(e.target.value)}
              className="text-xs py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="todas">Todas as Microáreas ({contacts.length})</option>
              {microareas.map((m) => (
                <option key={m} value={m}>
                  {m} ({contacts.filter((c) => c.microarea === m).length})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setIsSetMicroareaModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 rounded-xl text-xs font-bold transition shadow-2xs shrink-0"
              title="Escolher Microárea, torná-la padrão para novos cadastros e aplicar a todos os cadastros existentes"
            >
              <Layers className="h-3.5 w-3.5 text-teal-600" />
              <span>Definir Padrão / Aplicar Geral</span>
            </button>
          </div>
        </div>

        {/* Category Header with Quick Export Buttons */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 flex-wrap gap-2">
          <span className="text-xs font-bold text-slate-700">Categorias de Saúde & Grupos Prioritários:</span>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportPatientsToExcel(filteredContacts, domiciles, selectedFilter, selectedStreet)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition"
              title="Exportar dados filtrados direto para planilha Excel (.CSV)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Exportar Excel ({filteredContacts.length})</span>
            </button>

            <button
              onClick={() => setIsReportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold transition"
              title="Abrir relatório formatado para impressão em PDF"
            >
              <Printer className="h-3.5 w-3.5 text-blue-600" />
              <span>Imprimir PDF</span>
            </button>
          </div>
        </div>

        {/* Health Condition Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'todos', label: `Todos (${contacts.length})` },
            { id: 'gestante', label: `🤰 Gestantes (${contacts.filter((c) => c.healthProfile?.isPregnant).length})` },
            { id: 'puerpera', label: `🌸 Puérperas (${contacts.filter((c) => c.healthProfile?.isPuerpera).length})` },
            { id: 'hipertenso', label: `🩺 Hipertensos (${contacts.filter((c) => c.healthProfile?.isHypertensive).length})` },
            { id: 'diabetico', label: `🩸 Diabéticos (${contacts.filter((c) => c.healthProfile?.isDiabetic).length})` },
            { id: 'insulino', label: `💉 InsulinoDependente (${contacts.filter((c) => c.healthProfile?.isInsulinDependent).length})` },
            { id: 'acamado', label: `🛏️ Acamados (${contacts.filter((c) => c.healthProfile?.isBedridden).length})` },
            { id: 'crianca', label: `👶 Crianças (${contacts.filter((c) => c.healthProfile?.isChildUnder2).length})` },
            { id: 'idoso', label: `👴 Idosos (${contacts.filter((c) => c.healthProfile?.isElderly).length})` },
            { id: 'deficiencia', label: `♿ PCD / Deficiência (${contacts.filter((c) => c.healthProfile?.hasSpecialNeeds || c.healthProfile?.isPcdAuditory || c.healthProfile?.isPcdAutism || c.healthProfile?.isPcdPhysical || c.healthProfile?.isPcdVisual).length})` },
            { id: 'saude_mental', label: `🧠 Saúde Mental (${contacts.filter((c) => c.healthProfile?.hasMentalCondition).length})` },
            { id: 'alcool', label: `🍺 Álcool (${contacts.filter((c) => c.healthProfile?.hasAlcoholism).length})` },
            { id: 'outras_drogas', label: `💊 Outras Drogas (${contacts.filter((c) => c.healthProfile?.hasOtherDrugsSubstanceUse).length})` },
            { id: 'tabagista', label: `🚬 Tabagista (${contacts.filter((c) => c.healthProfile?.isSmoker).length})` },
            { id: 'asma', label: `🫁 Asma (${contacts.filter((c) => c.healthProfile?.hasAsthma).length})` },
            { id: 'dpoc', label: `🫁 DPOC (${contacts.filter((c) => c.healthProfile?.hasCOPD).length})` },
            { id: 'sintomaticos_resp', label: `🫁 Sintomático Resp. (${contacts.filter((c) => c.healthProfile?.hasSymptomaticRespiratory).length})` },
            { id: 'oxigenio', label: `🫁 Oxigênio Dep. (${contacts.filter((c) => c.healthProfile?.isOxygenDependent).length})` },
            { id: 'cancer', label: `🧬 Câncer (${contacts.filter((c) => c.healthProfile?.hasCancer).length})` },
            { id: 'hanseniase', label: `🦠 Hanseníase (${contacts.filter((c) => c.healthProfile?.hasHanseniasis).length})` },
            { id: 'sifilis', label: `🦠 Sífilis (${contacts.filter((c) => c.healthProfile?.hasSyphilis).length})` },
            { id: 'tuberculose', label: `🦠 Tuberculose (${contacts.filter((c) => c.healthProfile?.hasTuberculosis).length})` },
            { id: 'desnutricao', label: `🍲 Desnutrição (${contacts.filter((c) => c.healthProfile?.hasMalnutrition).length})` },
            { id: 'paliativos', label: `🏥 Paliativos (${contacts.filter((c) => c.healthProfile?.isPalliativeCare).length})` },
            { id: 'doencas_cronicas', label: `🏥 Doenças Crônicas (${contacts.filter((c) => c.healthProfile?.hasChronicDiseases).length})` },
            { id: 'bolsa_familia', label: `🏷️ Bolsa Família (${contacts.filter((c) => c.healthProfile?.isBolsaFamilia).length})` },
            { id: 'vulnerabilidade', label: `🏷️ Vulnerabilidade Social (${contacts.filter((c) => c.healthProfile?.hasSocialVulnerability).length})` },
            { id: 'cadweb', label: `📋 Cad. Siss/Cadweb (${contacts.filter((c) => c.healthProfile?.isSissCadwebUpdated).length})` },
            { id: 'vacina_gripe', label: `💉 Vacina Gripe Domiciliar (${contacts.filter((c) => c.healthProfile?.isEligibleFluVaccineHome).length})` }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                selectedFilter === f.id
                  ? 'bg-slate-900 text-white font-semibold shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Patient Cards Grid */}
      {filteredContacts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Nenhum munícipe encontrado</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Tente mudar o termo da busca ou selecione outro filtro de saúde.
          </p>
          <button
            onClick={handleStartNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
          >
            <Plus className="h-4 w-4" />
            Cadastrar Novo Paciente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredContacts.map((contact) => {
            const hp = contact.healthProfile;
            const domicile = domiciles.find((d) => d.id === contact.domicileId);
            const age = calculateAge(contact.birthDate);
            const isExpanded = expandedPatientId === contact.id;

            return (
              <div
                key={contact.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Card Top Bar */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-800 font-extrabold text-sm flex items-center justify-center shrink-0 border border-emerald-200">
                        {contact.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate">{contact.name}</h3>
                        <div className="flex items-center gap-2 text-[11px] font-mono">
                          {contact.cns && (
                            <span className="font-semibold text-emerald-700">CNS: {contact.cns}</span>
                          )}
                          {age !== null && (
                            <span className="text-slate-500 font-sans font-medium">({age} anos)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenShareModal(contact)}
                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                        title="Compartilhar / Transferir Paciente para Colega ACS"
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleStartEdit(contact)}
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                        title="Atualizar Dados Pessoais e de Saúde do Paciente"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Microarea & Domicile Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                    {(() => {
                      const maStr = cleanMicroareaName(contact.microarea || DEFAULT_MICROAREA);
                      const style = getMicroareaStyle(maStr);
                      return (
                        <span className={`inline-flex items-center gap-1 font-bold ${style.bg} ${style.text} px-2.5 py-0.5 rounded-full border ${style.border} shadow-xs`}>
                          {maStr}
                        </span>
                      );
                    })()}
                    {domicile ? (
                      <span className="font-semibold bg-teal-50 text-teal-800 px-2 py-0.5 rounded-full border border-teal-200 truncate max-w-[200px]">
                        🏠 {domicile.street}, {domicile.number}
                      </span>
                    ) : (
                      <span className="font-medium bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                        Sem Domicílio Vinculado
                      </span>
                    )}
                  </div>

                  {/* Health Profile Priority Badges */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {hp?.isPregnant && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded-full border border-purple-200">
                        🤰 Gestante ({hp.gestationalAgeWeeks || 12} sem)
                      </span>
                    )}
                    {hp?.isPuerpera && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-pink-100 text-pink-900 px-2.5 py-0.5 rounded-full border border-pink-200">
                        🌸 Puérpera {hp.prenatalEndDate ? `(Parto: ${hp.prenatalEndDate})` : ''}
                      </span>
                    )}
                    {hp?.isHypertensive && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-200">
                        🩺 Hipertenso (HAS)
                      </span>
                    )}
                    {hp?.isDiabetic && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded-full border border-blue-200">
                        🩸 Diabético (DM)
                      </span>
                    )}
                    {hp?.isBedridden && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-rose-100 text-rose-900 px-2.5 py-0.5 rounded-full border border-rose-200">
                        🛏️ Acamado
                      </span>
                    )}
                    {hp?.isChildUnder2 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        👶 Criança (0-2a)
                      </span>
                    )}
                    {hp?.isElderly && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200">
                        👴 Idoso (60+)
                      </span>
                    )}
                    {hp?.hasSpecialNeeds && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-indigo-100 text-indigo-900 px-2.5 py-0.5 rounded-full border border-indigo-200">
                        ♿ Deficiência
                      </span>
                    )}
                    {hp?.hasAlcoholism && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-orange-100 text-orange-900 px-2.5 py-0.5 rounded-full border border-orange-200">
                        🍺 Álcool
                      </span>
                    )}
                    {hp?.isEligibleFluVaccineHome && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-teal-100 text-teal-900 px-2.5 py-0.5 rounded-full border border-teal-200">
                        💉 Vacinação Gripe Domiciliar
                      </span>
                    )}
                    {hp?.hasAsthma && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-cyan-100 text-cyan-900 px-2.5 py-0.5 rounded-full border border-cyan-200">
                        🫁 Asma
                      </span>
                    )}
                    {hp?.isSissCadwebUpdated && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        📋 Cad. Siss/Cadweb
                      </span>
                    )}
                    {hp?.hasCancer && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-violet-100 text-violet-900 px-2.5 py-0.5 rounded-full border border-violet-200">
                        🧬 Câncer
                      </span>
                    )}
                    {hp?.hasMalnutrition && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-yellow-100 text-yellow-900 px-2.5 py-0.5 rounded-full border border-yellow-200">
                        🍲 Desnutrição
                      </span>
                    )}
                    {hp?.hasChronicDiseases && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-stone-100 text-stone-900 px-2.5 py-0.5 rounded-full border border-stone-200">
                        🏥 Doenças Crônicas
                      </span>
                    )}
                    {hp?.hasCOPD && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-sky-100 text-sky-900 px-2.5 py-0.5 rounded-full border border-sky-200">
                        🫁 DPOC
                      </span>
                    )}
                    {hp?.hasHanseniasis && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-red-100 text-red-900 px-2.5 py-0.5 rounded-full border border-red-200">
                        🦠 Hanseníase
                      </span>
                    )}
                    {hp?.isInsulinDependent && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded-full border border-blue-200">
                        💉 InsulinoDependente
                      </span>
                    )}
                    {hp?.hasOtherDrugsSubstanceUse && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-200">
                        💊 Outras Drogas
                      </span>
                    )}
                    {hp?.isOxygenDependent && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-teal-100 text-teal-900 px-2.5 py-0.5 rounded-full border border-teal-200">
                        🫁 Oxigênio Dependente
                      </span>
                    )}
                    {hp?.isPalliativeCare && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded-full border border-purple-200">
                        🏥 Cuidados Paliativos
                      </span>
                    )}
                    {hp?.isPcdAuditory && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-indigo-100 text-indigo-900 px-2.5 py-0.5 rounded-full border border-indigo-200">
                        👂 PCD Auditivo
                      </span>
                    )}
                    {hp?.isPcdAutism && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-indigo-100 text-indigo-900 px-2.5 py-0.5 rounded-full border border-indigo-200">
                        🧩 PCD Autismo
                      </span>
                    )}
                    {hp?.isPcdChronicMetabolic && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-indigo-100 text-indigo-900 px-2.5 py-0.5 rounded-full border border-indigo-200">
                        🧬 PCD Metabólica
                      </span>
                    )}
                    {hp?.isPcdPhysical && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-indigo-100 text-indigo-900 px-2.5 py-0.5 rounded-full border border-indigo-200">
                        🦾 PCD Físico
                      </span>
                    )}
                    {hp?.isPcdIntellectual && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-indigo-100 text-indigo-900 px-2.5 py-0.5 rounded-full border border-indigo-200">
                        🧠 PCD Intelectual
                      </span>
                    )}
                    {hp?.isPcdMental && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-indigo-100 text-indigo-900 px-2.5 py-0.5 rounded-full border border-indigo-200">
                        🧠 PCD Mental
                      </span>
                    )}
                    {hp?.isPcdMultiple && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-indigo-100 text-indigo-900 px-2.5 py-0.5 rounded-full border border-indigo-200">
                        ♿ PCD Múltipla
                      </span>
                    )}
                    {hp?.isPcdVisual && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-indigo-100 text-indigo-900 px-2.5 py-0.5 rounded-full border border-indigo-200">
                        👁️ PCD Visual
                      </span>
                    )}
                    {hp?.hasSyphilis && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-rose-100 text-rose-900 px-2.5 py-0.5 rounded-full border border-rose-200">
                        🦠 Sífilis
                      </span>
                    )}
                    {hp?.hasSymptomaticRespiratory && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-200">
                        🫁 Sintomático Respiratório
                      </span>
                    )}
                    {hp?.isSmoker && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-[#e5e7eb] text-gray-800 px-2.5 py-0.5 rounded-full border border-gray-300">
                        🚬 Tabagista
                      </span>
                    )}
                    {hp?.hasTuberculosis && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-red-100 text-red-900 px-2.5 py-0.5 rounded-full border border-red-200">
                        🦠 Tuberculose
                      </span>
                    )}
                    {hp?.hasSocialVulnerability && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-orange-100 text-orange-900 px-2.5 py-0.5 rounded-full border border-orange-200">
                        🏷️ Vulnerabilidade Social
                      </span>
                    )}
                  </div>

                  {/* Mental Health Prescription Card Banner */}
                  {hp?.hasMentalCondition && (
                    <div className="w-full p-2.5 bg-purple-50/90 border border-purple-200 rounded-xl flex flex-col gap-1.5 text-xs">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <span className="font-extrabold text-purple-950 flex items-center gap-1">
                          <Brain className="h-4 w-4 text-purple-700 shrink-0" />
                          Saúde Mental
                        </span>
                        <div className="flex items-center gap-1.5">
                          {hp.mentalHealthPrescriptionLink && (
                            <a
                              href={hp.mentalHealthPrescriptionLink.startsWith('http') ? hp.mentalHealthPrescriptionLink : `https://${hp.mentalHealthPrescriptionLink}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-2 py-1 text-[10px] bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 font-bold rounded-lg transition flex items-center gap-1 shrink-0"
                              title="Abrir receita no Drive / Arquivo"
                            >
                              <ExternalLink className="h-3 w-3 text-purple-700" />
                              Ver Receita
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenQuickMentalHealthModal(contact);
                            }}
                            className="px-2.5 py-1 text-[10px] bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg shadow-sm transition flex items-center gap-1 shrink-0"
                          >
                            <Pill className="h-3 w-3" />
                            Atualizar Receita
                          </button>
                        </div>
                      </div>
                      <div className="text-[11px] text-purple-900 font-medium space-y-0.5">
                        <p>Receita: <strong>{hp.mentalHealthPrescriptionDate ? new Date(hp.mentalHealthPrescriptionDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não registrada'}</strong></p>
                        {hp.mentalHealthMedications && hp.mentalHealthMedications.length > 0 && (
                          <p className="text-[10px] text-purple-700 font-semibold line-clamp-2">
                            💊 Remédios: {hp.mentalHealthMedications.join(', ')}
                          </p>
                        )}
                        {hp.mentalHealthPrescriptionLink && (
                          <p className="text-[10px] text-purple-800 font-semibold truncate flex items-center gap-1 pt-0.5 border-t border-purple-200/60">
                            <LinkIcon className="h-3 w-3 text-purple-600 shrink-0" />
                            <a
                              href={hp.mentalHealthPrescriptionLink.startsWith('http') ? hp.mentalHealthPrescriptionLink : `https://${hp.mentalHealthPrescriptionLink}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="underline hover:text-purple-950 truncate"
                            >
                              Anexo: {hp.mentalHealthPrescriptionLink}
                            </a>
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Direct Contact & WhatsApp Button */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
                    {contact.phone ? (
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-slate-800 font-bold">
                          <Phone className="h-3.5 w-3.5 text-slate-500" />
                          <span>{contact.phone}</span>
                        </div>

                        {/* WhatsApp Direct Open Button */}
                        <button
                          onClick={() => handleOpenWhatsApp(contact.phone!, contact.name)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-xs font-bold transition shadow-sm shrink-0"
                          title="Abrir conversa no WhatsApp"
                        >
                          <WhatsAppIcon className="h-4 w-4" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Nenhum telefone/WhatsApp cadastrado</p>
                    )}

                    {contact.address && (
                      <div className="flex items-start gap-1.5 text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                        <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <span className="truncate">{contact.address}</span>
                      </div>
                    )}

                    {contact.company && (
                      <div className="flex items-start gap-1.5 text-[11px] text-teal-800 bg-teal-50/80 p-1.5 rounded-lg border border-teal-200/60 font-semibold">
                        <Building className="h-3.5 w-3.5 text-teal-600 shrink-0 mt-0.5" />
                        <span className="truncate" title="Endereço Casa no Google Contatos (Campo Empresa)">
                          Casa: {contact.company}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Expandable Info Preview */}
                  {isExpanded && (
                    <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 space-y-2 text-xs text-slate-700 animate-in fade-in duration-150">
                      {contact.cpf && (
                        <p className="font-mono text-[11px]">
                          <strong>CPF:</strong> {contact.cpf}
                        </p>
                      )}
                      {contact.motherName && (
                        <p className="text-[11px]">
                          <strong>Nome da Mãe:</strong> {contact.motherName}
                        </p>
                      )}
                      {contact.birthDate && (
                        <p className="text-[11px]">
                          <strong>Data Nasc:</strong> {contact.birthDate.split('-').reverse().join('/')}
                        </p>
                      )}
                      {contact.familyRelationship && (
                        <p className="text-[11px]">
                          <strong>Relação Familiar:</strong> {contact.familyRelationship} {contact.isHeadOfHousehold ? '(Chefe da Família)' : ''}
                        </p>
                      )}
                      {hp?.notes && (
                        <div className="pt-1 border-t border-emerald-200/60 text-[11px]">
                          <strong>Anotações Clínicas:</strong>
                          <p className="text-slate-600 italic mt-0.5">"{hp.notes}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                    <button
                      onClick={() => handleOpenScheduleModal(contact)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      Agendar Visita
                    </button>

                    <button
                      onClick={() => handleOpenShareModal(contact)}
                      className="px-2.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0"
                      title="Compartilhar paciente individual, família e moradia com outro ACS"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      <span>Transferir</span>
                    </button>

                    <button
                      onClick={() => handleStartEdit(contact)}
                      className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
                    >
                      Editar
                    </button>
                  </div>

                  <button
                    onClick={() => setExpandedPatientId(isExpanded ? null : contact.id)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-xl transition"
                    title={isExpanded ? 'Ocultar Detalhes' : 'Ver Todos os Dados'}
                  >
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  <button
                    onClick={() => onDeleteContact(contact.id)}
                    className="p-2 text-slate-300 hover:text-rose-600 transition"
                    title="Excluir Cadastro"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Complete Patient Create / Edit Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                {editingPatientId ? 'Atualizar Ficha do Paciente (Cadastro Individual)' : 'Novo Cadastro Individual do Paciente'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPatient} className="space-y-5">
              {/* Section 1: Dados Pessoais do Paciente */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-4 w-4 text-emerald-600" />
                  1. Dados Pessoais e Documentação (e-SUS)
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo do Paciente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Maria Aparecida da Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Cartão SUS (CNS - 15 dígitos)</label>
                    <input
                      type="text"
                      placeholder="Ex: 700123456789012"
                      value={cns}
                      onChange={(e) => setCns(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">CPF</label>
                    <input
                      type="text"
                      placeholder="Ex: 123.456.789-00"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Data de Nascimento *</label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBirthDate(val);
                        const { isElderly: autoElderly, isChildUnder2: autoChild } = calculateDetailedAge(val);
                        setIsElderly(autoElderly);
                        setIsChildUnder2(autoChild);
                      }}
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Sexo</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                    >
                      <option value="F">Feminino</option>
                      <option value="M">Masculino</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nome da Mãe</label>
                    <input
                      type="text"
                      placeholder="Ex: Joana Maria da Silva"
                      value={motherName}
                      onChange={(e) => setMotherName(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Contato, WhatsApp e Domicílio */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-emerald-600" />
                  2. Contato, WhatsApp & Endereço no Território
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Telefone / WhatsApp do Paciente *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ex: (11) 98765-4321"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="flex-1 text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-bold"
                      />
                      {phone && (
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsApp(phone, name || 'Paciente')}
                          className="px-3 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl text-xs font-bold flex items-center gap-1 transition shrink-0"
                          title="Testar conversa no WhatsApp"
                        >
                          <WhatsAppIcon className="h-4 w-4" />
                          Testar
                        </button>
                      )}
                    </div>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Vincular a Domicílio Cadastrado</label>
                    <select
                      value={domicileId}
                      onChange={(e) => handleSelectDomicile(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                    >
                      <option value="">Selecione um Domicílio do Território...</option>
                      {domiciles.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.street}, {d.number} {d.complement ? `(${d.complement})` : ''} - Microárea {cleanMicroareaName(d.microarea)}
                        </option>
                      ))}
                    </select>
                    {domicileId && (
                      <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 p-2 rounded-xl mt-1.5 font-bold flex items-center gap-1.5 shadow-2xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Endereço, CEP e Microárea preenchidos automaticamente do Domicílio selecionado.</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Relação / Parentesco na Família</label>
                    <select
                      value={familyRelationship}
                      onChange={(e) => setFamilyRelationship(e.target.value as FamilyRelationship)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                    >
                      <option value="Responsável Familiar">Responsável Familiar</option>
                      <option value="Cônjuge / Companheiro(a)">Cônjuge / Companheiro(a)</option>
                      <option value="Filho(a)">Filho(a)</option>
                      <option value="Enteado(a)">Enteado(a)</option>
                      <option value="Pai / Mãe">Pai / Mãe</option>
                      <option value="Irmão / Irmã">Irmão / Irmã</option>
                      <option value="Avô / Avó">Avô / Avó</option>
                      <option value="Neto(a)">Neto(a)</option>
                      <option value="Outro Parente">Outro Parente</option>
                      <option value="Não Parente">Não Parente</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>CEP (API ViaCEP Gratuita)</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-mono font-bold">
                      Busca Grátis
                    </span>
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Ex: 01310-100"
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      className="flex-1 text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-900 font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleCepSearch}
                      disabled={isSearchingCep}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 shrink-0"
                    >
                      {isSearchingCep ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Buscando...</span>
                        </>
                      ) : (
                        <>
                          <Search className="h-3.5 w-3.5" />
                          <span>Preencher por CEP</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-3 mt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">Logradouro / Rua</label>
                        <input
                          type="text"
                          placeholder="Ex: Av. Paulista"
                          value={addressStreet}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAddressStreet(val);
                            setAddress(buildFullAddress(val, addressNumber, addressComplement, addressNeighborhood, addressCity));
                          }}
                          className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Número da Casa *</label>
                        <input
                          type="text"
                          placeholder="Ex: 1000 ou S/N"
                          value={addressNumber}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAddressNumber(val);
                            setAddress(buildFullAddress(addressStreet, val, addressComplement, addressNeighborhood, addressCity));
                          }}
                          className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 font-extrabold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Complemento</label>
                        <input
                          type="text"
                          placeholder="Ex: Apt 42, Bloco B, Casa 2"
                          value={addressComplement}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAddressComplement(val);
                            setAddress(buildFullAddress(addressStreet, addressNumber, val, addressNeighborhood, addressCity));
                          }}
                          className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Bairro</label>
                        <input
                          type="text"
                          placeholder="Ex: Bela Vista"
                          value={addressNeighborhood}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAddressNeighborhood(val);
                            setAddress(buildFullAddress(addressStreet, addressNumber, addressComplement, val, addressCity));
                          }}
                          className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Cidade / UF</label>
                        <input
                          type="text"
                          placeholder="Ex: São Paulo - SP"
                          value={addressCity}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAddressCity(val);
                            setAddress(buildFullAddress(addressStreet, addressNumber, addressComplement, addressNeighborhood, val));
                          }}
                          className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Endereço Residencial Completo (Formatado)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Av. Paulista, Nº 1000, Apt 42, Bela Vista, São Paulo - SP"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-semibold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Condições de Saúde e Grupos Prioritários */}
              <div className="space-y-4 bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200">
                <h4 className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-emerald-600" />
                  3. Classificação de Enfermidades e Acompanhamento e-SUS
                </h4>

                {/* Sub-grupo 1: Acompanhamento e Ciclos de Vida */}
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                    👥 Acompanhamento e Ciclos de Vida
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={isPregnant}
                        onChange={(e) => setIsPregnant(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🤰 Gestante</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={isPuerpera}
                        onChange={(e) => setIsPuerpera(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🌸 Puérpera (Pós-Parto)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={isChildUnder2}
                        onChange={(e) => setIsChildUnder2(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">👶 Criança (0-2 anos)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={isElderly}
                        onChange={(e) => setIsElderly(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">👴 Idoso (60+ anos)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={isBolsaFamilia}
                        onChange={(e) => setIsBolsaFamilia(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🏷️ Bolsa Família</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={isSissCadwebUpdated}
                        onChange={(e) => setIsSissCadwebUpdated(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">📋 Cad. Siss/Cadweb</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={hasSocialVulnerability}
                        onChange={(e) => setHasSocialVulnerability(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🏷️ Vulnerabilidade Social</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={isVaccinationUpToDate}
                        onChange={(e) => setIsVaccinationUpToDate(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">💉 Vacinas em Dia</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={isEligibleFluVaccineHome}
                        onChange={(e) => setIsEligibleFluVaccineHome(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">💉 Vacina Gripe Domiciliar</span>
                    </label>
                  </div>
                </div>

                {/* Sub-grupo 2: Condições Crônicas e Metabólicas */}
                <div className="space-y-2 pt-2 border-t border-emerald-200/60">
                  <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                    🩺 Condições Crônicas e Metabólicas
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={isHypertensive}
                        onChange={(e) => setIsHypertensive(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🩺 Hipertenso (HAS)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={isDiabetic}
                        onChange={(e) => setIsDiabetic(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🩸 Diabético (DM)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={isInsulinDependent}
                        onChange={(e) => setIsInsulinDependent(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">💉 InsulinoDependente</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={hasChronicDiseases}
                        onChange={(e) => setHasChronicDiseases(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🏥 Doenças Crônicas</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={isPcdChronicMetabolic}
                        onChange={(e) => setIsPcdChronicMetabolic(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🧬 PCD Doença Metabólica Crônica</span>
                    </label>
                  </div>
                </div>

                {/* Sub-grupo 3: Doenças Infectocontagiosas, Respiratórias e Especiais */}
                <div className="space-y-2 pt-2 border-t border-emerald-200/60">
                  <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                    🫁 Respiratórias, Infectocontagiosas e Acompanhamento Especial
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={hasAsthma}
                        onChange={(e) => setHasAsthma(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🫁 Asma</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={hasCOPD}
                        onChange={(e) => setHasCOPD(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🫁 DPOC</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={hasSymptomaticRespiratory}
                        onChange={(e) => setHasSymptomaticRespiratory(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🫁 Sintomático Respiratório</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={isOxygenDependent}
                        onChange={(e) => setIsOxygenDependent(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🫁 Oxigênio Dependente</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={hasCancer}
                        onChange={(e) => setHasCancer(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🧬 Câncer</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={hasHanseniasis}
                        onChange={(e) => setHasHanseniasis(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🦠 Hanseníase</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={hasSyphilis}
                        onChange={(e) => setHasSyphilis(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🦠 Sífilis</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={hasTuberculosis}
                        onChange={(e) => setHasTuberculosis(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🦠 Tuberculose</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={hasMalnutrition}
                        onChange={(e) => setHasMalnutrition(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🍲 Desnutrição</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={isPalliativeCare}
                        onChange={(e) => setIsPalliativeCare(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🏥 Cuidados Paliativos</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={isBedridden}
                        onChange={(e) => setIsBedridden(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🛏️ Acamado / Domiciliado</span>
                    </label>
                  </div>
                </div>

                {/* Sub-grupo 4: Saúde Mental, Hábitos e Dependências */}
                <div className="space-y-2 pt-2 border-t border-emerald-200/60">
                  <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                    🧠 Saúde Mental, Hábitos e Dependências
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div className="flex flex-col justify-between p-2.5 bg-purple-50/80 rounded-xl border border-purple-200">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasMentalCondition}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setHasMentalCondition(checked);
                            if (checked) {
                              setMentalHealthTargetPatient({ id: editingPatientId || undefined, name: name || 'Paciente' });
                              setIsMentalHealthModalOpen(true);
                            }
                          }}
                          className="h-4 w-4 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <span className="text-xs font-bold text-purple-950 flex items-center gap-1">
                          🧠 Saúde Mental
                        </span>
                      </label>

                      {hasMentalCondition && (
                        <div className="mt-2 pt-1.5 border-t border-purple-200/80 flex flex-col gap-1">
                          <span className="text-[10px] font-semibold text-purple-900">
                            Receita: <strong>{mentalHealthPrescriptionDate ? new Date(mentalHealthPrescriptionDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Hoje'}</strong>
                            {mentalHealthMedications.length > 0 && ` • ${mentalHealthMedications.length} remédio(s)`}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setMentalHealthTargetPatient({ id: editingPatientId || undefined, name: name || 'Paciente' });
                              setIsMentalHealthModalOpen(true);
                            }}
                            className="px-2 py-1 bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-bold rounded-lg transition shrink-0 shadow-sm flex items-center gap-1 justify-center"
                          >
                            <Pill className="h-3 w-3" />
                            Configurar Receita & Remédios
                          </button>
                        </div>
                      )}
                    </div>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={hasAlcoholism}
                        onChange={(e) => setHasAlcoholism(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🍺 Álcool</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={hasOtherDrugsSubstanceUse}
                        onChange={(e) => setHasOtherDrugsSubstanceUse(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">💊 Outras Drogas</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={isSmoker}
                        onChange={(e) => setIsSmoker(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🚬 Tabagista</span>
                    </label>
                  </div>
                </div>

                {/* Sub-grupo 5: Pessoa com Deficiência (PCD) */}
                <div className="space-y-2 pt-2 border-t border-emerald-200/60">
                  <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                    ♿ Pessoa com Deficiência (PCD) e Reabilitação
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={hasSpecialNeeds}
                        onChange={(e) => setHasSpecialNeeds(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">♿ Reabilitação / Deficiência</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={isPcdAuditory}
                        onChange={(e) => setIsPcdAuditory(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">👂 PCD Auditivo</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={isPcdAutism}
                        onChange={(e) => setIsPcdAutism(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🧩 PCD Autismo (TEA)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={isPcdPhysical}
                        onChange={(e) => setIsPcdPhysical(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🦾 PCD Físico</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={isPcdIntellectual}
                        onChange={(e) => setIsPcdIntellectual(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🧠 PCD Intelectual</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={isPcdMental}
                        onChange={(e) => setIsPcdMental(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">🧠 PCD Mental</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={isPcdMultiple}
                        onChange={(e) => setIsPcdMultiple(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">♿ PCD Múltipla</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-slate-200 cursor-pointer hover:bg-emerald-50/50 transition">
                      <input
                        type="checkbox"
                        checked={isPcdVisual}
                        onChange={(e) => setIsPcdVisual(e.target.checked)}
                        className="h-4 w-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">👁️ PCD Visual</span>
                    </label>
                  </div>
                </div>

                {isPregnant && (
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-3">
                    <div className="flex items-center gap-2 font-bold text-purple-900 text-xs">
                      <span>🤰 Dados do Acompanhamento Pré-Natal e-SUS</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-purple-900 mb-0.5">
                          Semanas de Gestação
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={42}
                          value={gestationalAgeWeeks}
                          onChange={(e) => setGestationalAgeWeeks(parseInt(e.target.value) || 12)}
                          className="w-full text-xs p-2 bg-white border border-purple-300 rounded-lg font-bold text-purple-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-purple-900 mb-0.5">
                          Data de Abertura do Pré-Natal *
                        </label>
                        <input
                          type="date"
                          value={prenatalStartDate}
                          onChange={(e) => setPrenatalStartDate(e.target.value)}
                          className="w-full text-xs p-2 bg-white border border-purple-300 rounded-lg font-mono font-bold text-purple-900"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {isPuerpera && (
                  <div className="p-3 bg-pink-50 rounded-xl border border-pink-200 space-y-3">
                    <div className="flex items-center gap-2 font-bold text-pink-900 text-xs">
                      <span>🌸 Acompanhamento de Puérpera (Pós-Parto) e-SUS</span>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-pink-900 mb-0.5">
                        Data de Fechamento do Pré-Natal (Data do Parto) *
                      </label>
                      <input
                        type="date"
                        value={prenatalEndDate}
                        onChange={(e) => setPrenatalEndDate(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-pink-300 rounded-lg font-mono font-bold text-pink-900"
                      />
                      <p className="text-[10px] text-pink-700 mt-1">
                        ✨ Agendamento Automático: A "Visita de Acompanhamento a Puérpera" será marcada para 20 dias após esta data.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Anotações Clínicas / Medicamentos em Uso
                  </label>
                  <textarea
                    placeholder="Histórico de saúde, medicações contínuas, alertas importantes para as visitas..."
                    value={healthNotes}
                    onChange={(e) => setHealthNotes(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 h-20 text-slate-800"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition"
                >
                  Salvar Cadastro Individual
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Agendar Visita com Data, Horário e Recorrência */}
      {isScheduleModalOpen && scheduleTargetContact && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Agendar Visita Domiciliar ACS
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Paciente: <strong>{scheduleTargetContact.name}</strong> ({scheduleTargetContact.microarea || 'Microárea 01'})
                </p>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Data da Visita *</label>
                <input
                  type="date"
                  required
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Horário de Início</label>
                  <input
                    type="time"
                    value={scheduleStartTime}
                    onChange={(e) => setScheduleStartTime(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Horário de Término</label>
                  <input
                    type="time"
                    value={scheduleEndTime}
                    onChange={(e) => setScheduleEndTime(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Motivo / Tipo de Visita e-SUS</label>
                <select
                  value={scheduleReason}
                  onChange={(e) => setScheduleReason(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-bold"
                >
                  <option value="Visita Periódica">Visita Periódica</option>
                  <option value="Visita de Atualização Cadastral">Visita de Atualização Cadastral</option>
                  <option value="Visita de Acompanhamento com o Médico">Visita de Acompanhamento com o Médico</option>
                  <option value="Visita Pós-Alta com o Médico">Visita Pós-Alta com o Médico</option>
                  <option value="Visita de Fechamento de Pré-Natal com Enfermeiro(a)">Visita de Fechamento de Pré-Natal com Enfermeiro(a)</option>
                  <option value="Visita de Acamado com o Enfermeiro(a)">Visita de Acamado com o Enfermeiro(a)</option>
                  <option value="Visita de Solicitação de Busca Ativa">Visita de Solicitação de Busca Ativa</option>
                  <option value="Visita de Acompanhamento a Coleta de Exames">Visita de Acompanhamento a Coleta de Exames</option>
                  <option value="Acompanhamento de Saúde">Acompanhamento de Saúde de Rotina</option>
                  <option value="Acompanhamento de Gestante">Acompanhamento de Gestante (Pré-Natal)</option>
                  <option value="Acompanhamento do Idoso">Visita de Acompanhamento ao Idoso (60+)</option>
                  <option value="Acompanhamento de Criança / RN">Visita de Acompanhamento ao RN / Criança</option>
                  <option value="Busca Ativa Bolsa Família">Busca Ativa Bolsa Família / Vacinação</option>
                  <option value="Controle de Endemias e Dengue">Controle de Endemias e Arboviroses</option>
                  <option value="Acompanhamento Hipertenso / Diabético">Acompanhamento HAS / DM</option>
                  <option value="Outro">Outro Motivo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Repeat className="h-3.5 w-3.5 text-blue-600" />
                  <span>Esse evento se repete de quanto em quanto tempo?</span>
                </label>
                <select
                  value={scheduleRecurrence}
                  onChange={(e) => setScheduleRecurrence(e.target.value as any)}
                  className="w-full text-xs p-2.5 bg-blue-50/70 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-950 font-bold"
                >
                  <option value="none">Não se repete (Evento Único)</option>
                  <option value="weekly">Semanalmente (A cada 7 dias)</option>
                  <option value="biweekly">A cada 15 dias (Quinzenal)</option>
                  <option value="monthly">Mensalmente (A cada 30 dias)</option>
                  <option value="six_months">A cada 6 Meses (Semestral - ex: Idosos / Crônicos)</option>
                  <option value="yearly">Anualmente (A cada 1 ano)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Observações da Visita</label>
                <textarea
                  value={scheduleDescription}
                  onChange={(e) => setScheduleDescription(e.target.value)}
                  placeholder="Instruções ou lembretes específicos para esta visita..."
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 h-16 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Importar Lista de Pacientes (.CSV) */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-teal-600" />
                  Importar Lista de Pacientes (.CSV)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Importe todos os munícipes do seu território de uma só vez usando um arquivo CSV ou colar texto formatado.
                </p>
              </div>
              <button
                onClick={() => setIsCsvModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Option A: Upload File */}
              <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl text-center space-y-2 hover:border-teal-500 transition">
                <Upload className="h-8 w-8 text-teal-600 mx-auto" />
                <p className="text-xs font-bold text-slate-800">
                  Clique para selecionar o arquivo .CSV de pacientes
                </p>
                <p className="text-[11px] text-slate-500">
                  Suporta arquivos com colunas: Nome, CNS, CPF, DataNascimento, Sexo, Telefone, Endereco, Microarea, Gestante, Hipertenso, Diabetico, Idoso, Crianca, BolsaFamilia.
                </p>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleCsvFileUpload}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-teal-600 file:text-white hover:file:bg-teal-700 cursor-pointer pt-2"
                />
              </div>

              {/* Option B: Direct CSV Paste */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Ou cole o conteúdo CSV diretamente aqui:
                  </label>
                  <button
                    type="button"
                    onClick={() => downloadCSV('modelo_pacientes_acs.csv', generateSampleCSV())}
                    className="text-[11px] font-bold text-teal-700 hover:underline flex items-center gap-1"
                  >
                    <Download className="h-3 w-3" />
                    Baixar Exemplo
                  </button>
                </div>
                <textarea
                  rows={4}
                  placeholder={`Nome,CNS,CPF,DataNascimento,Sexo,Telefone,Endereco,Microarea,Gestante,Hipertenso,Diabetico,Idoso,BolsaFamilia\nMaria Silva,701234567890123,123.456.789-00,1955-08-10,F,(11)98765-4321,Rua A 100,Microárea 01,Nao,Sim,Sim,Sim,Nao`}
                  value={csvRawText}
                  onChange={(e) => {
                    setCsvRawText(e.target.value);
                    const parsed = parsePatientsCSV(e.target.value);
                    setCsvPreviewPatients(parsed);
                    setCsvStatusMessage(`${parsed.length} paciente(s) identificado(s).`);
                  }}
                  className="w-full text-xs font-mono p-3 bg-slate-900 text-emerald-400 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {csvStatusMessage && (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between text-xs font-bold text-teal-900">
                  <span>{csvStatusMessage}</span>
                  <span className="bg-teal-200 text-teal-900 text-[10px] px-2 py-0.5 rounded-full font-mono">
                    Pronto para Importar
                  </span>
                </div>
              )}

              {/* CSV Preview Table */}
              {csvPreviewPatients.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-800">
                    Pré-visualização dos Pacientes ({csvPreviewPatients.length}):
                  </h4>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-700 sticky top-0 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2">Nome</th>
                          <th className="p-2">CNS / CPF</th>
                          <th className="p-2">Microárea</th>
                          <th className="p-2">Condições</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {csvPreviewPatients.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-bold">{p.name}</td>
                            <td className="p-2 font-mono text-[11px]">{p.cns || p.cpf || '-'}</td>
                            <td className="p-2 font-mono">{p.microarea}</td>
                            <td className="p-2 text-[10px]">
                              {p.healthProfile?.isPregnant && '🤰 '}
                              {p.healthProfile?.isHypertensive && '🩺 '}
                              {p.healthProfile?.isDiabetic && '🩸 '}
                              {p.healthProfile?.isElderly && '👴 '}
                              {p.healthProfile?.isBolsaFamilia && '🏷️ '}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCsvImport}
                  disabled={csvPreviewPatients.length === 0}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Confirmar Importação de {csvPreviewPatients.length} Pacientes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mental Health Prescription Modal */}
      <MentalHealthPrescriptionModal
        isOpen={isMentalHealthModalOpen}
        onClose={() => setIsMentalHealthModalOpen(false)}
        patientName={mentalHealthTargetPatient?.name || name || 'Paciente'}
        initialDate={mentalHealthPrescriptionDate}
        initialMeds={mentalHealthMedications}
        initialLink={mentalHealthPrescriptionLink}
        onSave={handleSaveMentalHealthPrescription}
      />

      {/* Report & Excel / PDF Export Modal */}
      <ReportExportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        contacts={contacts}
        domiciles={domiciles}
        initialCategory={selectedFilter}
        initialStreet={selectedStreet}
      />

      {/* Share / Transfer Patient Modal */}
      <SharePatientModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setSharingPatient(null);
        }}
        patient={sharingPatient}
        allContacts={contacts}
        domiciles={domiciles}
        events={events || []}
      />

      {/* Import Shared Ficha Package Modal */}
      <ImportSharedDataModal
        isOpen={isImportSharedModalOpen}
        onClose={() => setIsImportSharedModalOpen(false)}
        onImportSuccess={handleImportSharedSuccess}
      />

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
