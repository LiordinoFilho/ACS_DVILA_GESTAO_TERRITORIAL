import React, { useState, useEffect } from 'react';
import { getBrasiliaDateStr } from '../utils/dateUtils';
import { CalendarEvent, GoogleContact, Domicile, DomicileMember, VisitStatus, FamilyRelationship, PatientHealthProfile, DEFAULT_MICROAREA, MICROAREAS, getSavedMicroareas, cleanMicroareaName } from '../types';
import {
  FileText,
  User,
  Home,
  Users,
  CheckCircle,
  CheckCircle2,
  Check,
  XCircle,
  Clock,
  Phone,
  MessageSquare,
  MapPin,
  Calendar,
  Activity,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  HeartPulse,
  Save,
  X,
  MapPinOff,
  Building2,
  Cross
} from 'lucide-react';

interface VisitExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent;
  contacts: GoogleContact[];
  domiciles: Domicile[];
  onUpdateContact: (contact: GoogleContact) => void;
  onUpdateDomicile: (domicile: Domicile) => void;
  onUpdateEventStatus: (eventId: string, newStatus: VisitStatus, observation?: string) => void;
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

export const VisitExecutionModal: React.FC<VisitExecutionModalProps> = ({
  isOpen,
  onClose,
  event,
  contacts,
  domiciles,
  onUpdateContact,
  onUpdateDomicile,
  onUpdateEventStatus
}) => {
  if (!isOpen) return null;

  // Find linked contact and linked domicile
  const scheduledContact = (() => {
    if (event.contactId) {
      const c = contacts.find((item) => item.id === event.contactId);
      if (c) return c;
    }
    if (event.contactName) {
      const c = contacts.find((item) => item.name.toLowerCase() === event.contactName?.toLowerCase());
      if (c) return c;
    }
    if (event.title) {
      const titleParts = event.title.split(/[:\-]/);
      if (titleParts.length > 1) {
        const extractedName = titleParts[titleParts.length - 1].trim();
        if (extractedName.length >= 3) {
          const c = contacts.find(
            (item) => item.name.toLowerCase() === extractedName.toLowerCase() ||
                      item.name.toLowerCase().includes(extractedName.toLowerCase()) ||
                      extractedName.toLowerCase().includes(item.name.toLowerCase())
          );
          if (c) return c;
        }
      }
    }
    return undefined;
  })();

  const scheduledDomicile = domiciles.find(
    (d) => d.id === event.domicileId || d.id === scheduledContact?.domicileId || (event.address && `${d.street}, ${d.number}`.toLowerCase().includes(event.address.toLowerCase()))
  );

  // Get list of family members living in this domicile
  const currentFamilyMembers: DomicileMember[] = scheduledDomicile?.familyMembers || (scheduledContact ? [
    {
      patientId: scheduledContact.id,
      patientName: scheduledContact.name,
      relationship: scheduledContact.familyRelationship || 'Responsável Familiar',
      isHeadOfHousehold: scheduledContact.isHeadOfHousehold ?? true,
      cns: scheduledContact.cns,
      birthDate: scheduledContact.birthDate,
      phone: scheduledContact.phone
    }
  ] : []);

  // Track member special status tags locally
  const [memberStatusMap, setMemberStatusMap] = useState<Record<string, 'obito' | 'mudou_se_territorio' | 'mudou_se_municipio' | null>>({});

  // Initialize status map from contacts labels
  useEffect(() => {
    if (!isOpen) return;
    const initialMap: Record<string, 'obito' | 'mudou_se_territorio' | 'mudou_se_municipio' | null> = {};
    currentFamilyMembers.forEach((m) => {
      const key = m.patientId || m.patientName;
      const c = contacts.find((contact) => contact.id === m.patientId || contact.name === m.patientName);
      const labels = c?.labels || [];
      if (labels.includes('Óbito')) {
        initialMap[key] = 'obito';
      } else if (labels.includes('Não mora mais no território')) {
        initialMap[key] = 'mudou_se_territorio';
      } else if (labels.includes('Não mora mais no Município') || labels.includes('Não mora mais no domicílio')) {
        initialMap[key] = 'mudou_se_municipio';
      }
    });
    setMemberStatusMap((prev) => ({ ...initialMap, ...prev }));
  }, [isOpen, event.id, contacts]);

  // Active Sub-Modals or Views inside Visit Portal
  const [activeSubModal, setActiveSubModal] = useState<'none' | 'edit_patient' | 'edit_domicile' | 'edit_member'>('none');
  const [targetContactForEdit, setTargetContactForEdit] = useState<GoogleContact | null>(null);

  // Visit Completion State
  const [visitObservation, setVisitObservation] = useState(event.observation || '');
  const [selectedStatus, setSelectedStatus] = useState<VisitStatus>(event.status || 'realizada');
  const [isFinalizing, setIsFinalizing] = useState(false);

  // State for Editing Individual Patient (Target Patient or Family Member)
  const [pName, setPName] = useState('');
  const [pCns, setPCns] = useState('');
  const [pCpf, setPCpf] = useState('');
  const [pBirthDate, setPBirthDate] = useState('');
  const [pGender, setPGender] = useState<'M' | 'F' | 'Outro'>('F');
  const [pMotherName, setPMotherName] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pAddress, setPAddress] = useState('');
  const [pMicroarea, setPMicroarea] = useState(DEFAULT_MICROAREA);
  const [pFamilyRel, setPFamilyRel] = useState<FamilyRelationship>('Responsável Familiar');
  const [pIsHead, setPIsHead] = useState(false);

  // Health Profile State for Patient Edit
  const [hpIsPregnant, setHpIsPregnant] = useState(false);
  const [hpGestationalWeeks, setHpGestationalWeeks] = useState<number | undefined>(undefined);
  const [hpPrenatalStart, setHpPrenatalStart] = useState('');
  const [hpIsPuerpera, setHpIsPuerpera] = useState(false);
  const [hpIsHypertensive, setHpIsHypertensive] = useState(false);
  const [hpIsDiabetic, setHpIsDiabetic] = useState(false);
  const [hpIsBedridden, setHpIsBedridden] = useState(false);
  const [hpIsElderly, setHpIsElderly] = useState(false);
  const [hpIsChildUnder2, setHpIsChildUnder2] = useState(false);
  const [hpIsBolsaFamilia, setHpIsBolsaFamilia] = useState(false);
  const [hpIsVaccinationUpToDate, setHpIsVaccinationUpToDate] = useState(true);
  const [hpHasMentalCondition, setHpHasMentalCondition] = useState(false);
  const [hpHasSpecialNeeds, setHpHasSpecialNeeds] = useState(false);
  const [hpHasAlcoholism, setHpHasAlcoholism] = useState(false);
  const [hpIsEligibleFluVaccineHome, setHpIsEligibleFluVaccineHome] = useState(false);
  const [hpHasAsthma, setHpHasAsthma] = useState(false);
  const [hpIsSissCadwebUpdated, setHpIsSissCadwebUpdated] = useState(false);
  const [hpHasCancer, setHpHasCancer] = useState(false);
  const [hpHasMalnutrition, setHpHasMalnutrition] = useState(false);
  const [hpHasChronicDiseases, setHpHasChronicDiseases] = useState(false);
  const [hpHasCOPD, setHpHasCOPD] = useState(false);
  const [hpHasHanseniasis, setHpHasHanseniasis] = useState(false);
  const [hpIsInsulinDependent, setHpIsInsulinDependent] = useState(false);
  const [hpHasOtherDrugsSubstanceUse, setHpHasOtherDrugsSubstanceUse] = useState(false);
  const [hpIsOxygenDependent, setHpIsOxygenDependent] = useState(false);
  const [hpIsPalliativeCare, setHpIsPalliativeCare] = useState(false);
  const [hpIsPcdAuditory, setHpIsPcdAuditory] = useState(false);
  const [hpIsPcdAutism, setHpIsPcdAutism] = useState(false);
  const [hpIsPcdChronicMetabolic, setHpIsPcdChronicMetabolic] = useState(false);
  const [hpIsPcdPhysical, setHpIsPcdPhysical] = useState(false);
  const [hpIsPcdIntellectual, setHpIsPcdIntellectual] = useState(false);
  const [hpIsPcdMental, setHpIsPcdMental] = useState(false);
  const [hpIsPcdMultiple, setHpIsPcdMultiple] = useState(false);
  const [hpIsPcdVisual, setHpIsPcdVisual] = useState(false);
  const [hpHasSyphilis, setHpHasSyphilis] = useState(false);
  const [hpHasSymptomaticRespiratory, setHpHasSymptomaticRespiratory] = useState(false);
  const [hpIsSmoker, setHpIsSmoker] = useState(false);
  const [hpHasTuberculosis, setHpHasTuberculosis] = useState(false);
  const [hpHasSocialVulnerability, setHpHasSocialVulnerability] = useState(false);
  const [hpNotes, setHpNotes] = useState('');

  // Domicile Edit Form State
  const [domStreet, setDomStreet] = useState('');
  const [domNumber, setDomNumber] = useState('');
  const [domComplement, setDomComplement] = useState('');
  const [domNeighborhood, setDomNeighborhood] = useState('');
  const [domMicroarea, setDomMicroarea] = useState(DEFAULT_MICROAREA);
  const [domResidenceType, setDomResidenceType] = useState<Domicile['residenceType']>('Casa');
  const [domOwnership, setDomOwnership] = useState<Domicile['ownership']>('Próprio');
  const [domWater, setDomWater] = useState<Domicile['waterSupply']>('Rede Encanada');
  const [domSanitation, setDomSanitation] = useState<Domicile['sanitation']>('Rede Pública');
  const [domGarbage, setDomGarbage] = useState<Domicile['garbageCollection']>('Coletado');
  const [domElectricity, setDomElectricity] = useState(true);
  const [domPets, setDomPets] = useState(false);
  const [domPetsDetail, setDomPetsDetail] = useState('');
  const [domMembers, setDomMembers] = useState<DomicileMember[]>([]);

  // Add Morador inside Domicile Modal
  const [newMemberPatientId, setNewMemberPatientId] = useState('');
  const [newMemberRel, setNewMemberRel] = useState<FamilyRelationship>('Filho(a)');

  // Helper to sync status notes into visit observation report
  const updateObservationWithMemberStatuses = (newMap: Record<string, 'obito' | 'mudou_se_territorio' | 'mudou_se_municipio' | null>) => {
    const statusLines: string[] = [];
    const statusLabelsMap = {
      obito: 'Óbito',
      mudou_se_territorio: 'Não mora mais no território',
      mudou_se_municipio: 'Não mora mais no Município'
    };

    currentFamilyMembers.forEach((m) => {
      const key = m.patientId || m.patientName;
      const st = newMap[key];
      if (st) {
        statusLines.push(`• Morador ${m.patientName}: Situação registrada - ${statusLabelsMap[st]} (Cadastro individual dispensado)`);
      }
    });

    setVisitObservation((prevObs) => {
      const cleanPrev = prevObs
        .split('\n')
        .filter((line) => !line.includes('Situação registrada -') && !line.includes('[SITUAÇÃO DOS MORADORES]'))
        .join('\n')
        .trim();

      if (statusLines.length === 0) {
        return cleanPrev;
      }

      const statusSection = `\n[SITUAÇÃO DOS MORADORES]\n${statusLines.join('\n')}`;
      return cleanPrev ? `${cleanPrev}\n${statusSection}` : statusSection.trim();
    });
  };

  // Toggle individual status tags for family member (Óbito, Não mora mais no território, Não mora mais no Município)
  const handleToggleMemberStatusTag = (member: DomicileMember, statusTag: 'obito' | 'mudou_se_territorio' | 'mudou_se_municipio') => {
    const memberKey = member.patientId || member.patientName;
    const currentStatus = memberStatusMap[memberKey];
    const newStatus = currentStatus === statusTag ? null : statusTag;

    const newMap = { ...memberStatusMap, [memberKey]: newStatus };
    setMemberStatusMap(newMap);

    // Automatically update visit observations report text
    updateObservationWithMemberStatuses(newMap);

    const existingContact = contacts.find((c) => c.id === member.patientId || c.name === member.patientName);

    const tagMap = {
      obito: 'Óbito',
      mudou_se_territorio: 'Não mora mais no território',
      mudou_se_municipio: 'Não mora mais no Município'
    };

    const targetTag = tagMap[statusTag];

    if (existingContact) {
      const currentLabels = existingContact.labels || [];
      const cleanLabels = currentLabels.filter((l) => !Object.values(tagMap).includes(l));
      const updatedLabels = newStatus ? [...cleanLabels, targetTag] : cleanLabels;

      const updatedContact: GoogleContact = {
        ...existingContact,
        labels: updatedLabels,
        notes: existingContact.notes
          ? `${existingContact.notes}\n[${new Date().toLocaleDateString('pt-BR')}] Situação: ${newStatus ? targetTag : 'Ativo/Sem restrição'}`
          : `[${new Date().toLocaleDateString('pt-BR')}] Situação: ${newStatus ? targetTag : 'Ativo/Sem restrição'}`
      };

      onUpdateContact(updatedContact);
    } else {
      // Create new contact entry with label
      const newContact: GoogleContact = {
        id: member.patientId || `temp_${Date.now()}`,
        name: member.patientName,
        cns: member.cns,
        phone: member.phone,
        birthDate: member.birthDate,
        labels: newStatus ? ['Acompanhamento ACS', targetTag] : ['Acompanhamento ACS'],
        address: event.address,
        notes: `[${new Date().toLocaleDateString('pt-BR')}] Situação: ${newStatus ? targetTag : 'Ativo/Sem restrição'}`
      };
      onUpdateContact(newContact);
    }
  };

  // Helper to populate Patient Edit Form
  const handleOpenPatientEdit = (contactToEdit: GoogleContact) => {
    setTargetContactForEdit(contactToEdit);
    setPName(contactToEdit.name || '');
    setPCns(contactToEdit.cns || '');
    setPCpf(contactToEdit.cpf || '');
    setPBirthDate(contactToEdit.birthDate || '');
    setPGender(contactToEdit.gender || 'F');
    setPMotherName(contactToEdit.motherName || '');
    setPPhone(contactToEdit.phone || '');
    setPAddress(contactToEdit.address || event.address || '');
    setPMicroarea(contactToEdit.microarea || DEFAULT_MICROAREA);
    setPFamilyRel(contactToEdit.familyRelationship || 'Responsável Familiar');
    setPIsHead(!!contactToEdit.isHeadOfHousehold);

    const hp = contactToEdit.healthProfile;
    setHpIsPregnant(hp?.isPregnant || false);
    setHpGestationalWeeks(hp?.gestationalAgeWeeks);
    setHpPrenatalStart(hp?.prenatalStartDate || '');
    setHpIsPuerpera(hp?.isPuerpera || false);
    setHpIsHypertensive(hp?.isHypertensive || false);
    setHpIsDiabetic(hp?.isDiabetic || false);
    setHpIsBedridden(hp?.isBedridden || false);
    setHpIsElderly(hp?.isElderly || false);
    setHpIsChildUnder2(hp?.isChildUnder2 || false);
    setHpIsBolsaFamilia(hp?.isBolsaFamilia || false);
    setHpIsVaccinationUpToDate(hp?.isVaccinationUpToDate ?? true);
    setHpHasMentalCondition(hp?.hasMentalCondition || false);
    setHpHasSpecialNeeds(hp?.hasSpecialNeeds || false);
    setHpHasAlcoholism(hp?.hasAlcoholism || false);
    setHpIsEligibleFluVaccineHome(hp?.isEligibleFluVaccineHome || false);
    setHpHasAsthma(hp?.hasAsthma || false);
    setHpIsSissCadwebUpdated(hp?.isSissCadwebUpdated || false);
    setHpHasCancer(hp?.hasCancer || false);
    setHpHasMalnutrition(hp?.hasMalnutrition || false);
    setHpHasChronicDiseases(hp?.hasChronicDiseases || false);
    setHpHasCOPD(hp?.hasCOPD || false);
    setHpHasHanseniasis(hp?.hasHanseniasis || false);
    setHpIsInsulinDependent(hp?.isInsulinDependent || false);
    setHpHasOtherDrugsSubstanceUse(hp?.hasOtherDrugsSubstanceUse || false);
    setHpIsOxygenDependent(hp?.isOxygenDependent || false);
    setHpIsPalliativeCare(hp?.isPalliativeCare || false);
    setHpIsPcdAuditory(hp?.isPcdAuditory || false);
    setHpIsPcdAutism(hp?.isPcdAutism || false);
    setHpIsPcdChronicMetabolic(hp?.isPcdChronicMetabolic || false);
    setHpIsPcdPhysical(hp?.isPcdPhysical || false);
    setHpIsPcdIntellectual(hp?.isPcdIntellectual || false);
    setHpIsPcdMental(hp?.isPcdMental || false);
    setHpIsPcdMultiple(hp?.isPcdMultiple || false);
    setHpIsPcdVisual(hp?.isPcdVisual || false);
    setHpHasSyphilis(hp?.hasSyphilis || false);
    setHpHasSymptomaticRespiratory(hp?.hasSymptomaticRespiratory || false);
    setHpIsSmoker(hp?.isSmoker || false);
    setHpHasTuberculosis(hp?.hasTuberculosis || false);
    setHpHasSocialVulnerability(hp?.hasSocialVulnerability || false);
    setHpNotes(hp?.notes || '');

    setActiveSubModal('edit_patient');
  };

  // Save Patient Edit
  const handleSavePatientEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetContactForEdit || !pName) return;

    const autoLabels: string[] = [];
    if (hpIsPregnant) autoLabels.push('Gestante');
    if (hpIsPuerpera) autoLabels.push('Puérpera');
    if (hpIsHypertensive) autoLabels.push('Hipertenso');
    if (hpIsDiabetic) autoLabels.push('Diabético');
    if (hpIsBedridden) autoLabels.push('Acamado');
    if (hpIsChildUnder2) autoLabels.push('Criança (0-2a)');
    if (hpIsElderly) autoLabels.push('Idoso');
    if (hpIsBolsaFamilia) autoLabels.push('Bolsa Família');

    const updatedContact: GoogleContact = {
      ...targetContactForEdit,
      name: pName,
      cns: pCns,
      cpf: pCpf,
      birthDate: pBirthDate,
      gender: pGender,
      motherName: pMotherName,
      phone: pPhone,
      address: pAddress,
      microarea: pMicroarea,
      familyRelationship: pFamilyRel,
      isHeadOfHousehold: pIsHead,
      manuallySetHeadOfHousehold: pIsHead || pFamilyRel === 'Responsável Familiar' ? true : undefined,
      labels: Array.from(new Set([...(targetContactForEdit.labels || []), ...autoLabels])),
      healthProfile: {
        isPregnant: hpIsPregnant,
        gestationalAgeWeeks: hpGestationalWeeks,
        prenatalStartDate: hpPrenatalStart,
        isPuerpera: hpIsPuerpera,
        isHypertensive: hpIsHypertensive,
        isDiabetic: hpIsDiabetic,
        isBedridden: hpIsBedridden,
        isElderly: hpIsElderly,
        isChildUnder2: hpIsChildUnder2,
        isBolsaFamilia: hpIsBolsaFamilia,
        isVaccinationUpToDate: hpIsVaccinationUpToDate,
        hasMentalCondition: hpHasMentalCondition,
        hasSpecialNeeds: hpHasSpecialNeeds,
        hasAlcoholism: hpHasAlcoholism,
        isEligibleFluVaccineHome: hpIsEligibleFluVaccineHome,
        hasAsthma: hpHasAsthma,
        isSissCadwebUpdated: hpIsSissCadwebUpdated,
        hasCancer: hpHasCancer,
        hasMalnutrition: hpHasMalnutrition,
        hasChronicDiseases: hpHasChronicDiseases,
        hasCOPD: hpHasCOPD,
        hasHanseniasis: hpHasHanseniasis,
        isInsulinDependent: hpIsInsulinDependent,
        hasOtherDrugsSubstanceUse: hpHasOtherDrugsSubstanceUse,
        isOxygenDependent: hpIsOxygenDependent,
        isPalliativeCare: hpIsPalliativeCare,
        isPcdAuditory: hpIsPcdAuditory,
        isPcdAutism: hpIsPcdAutism,
        isPcdChronicMetabolic: hpIsPcdChronicMetabolic,
        isPcdPhysical: hpIsPcdPhysical,
        isPcdIntellectual: hpIsPcdIntellectual,
        isPcdMental: hpIsPcdMental,
        isPcdMultiple: hpIsPcdMultiple,
        isPcdVisual: hpIsPcdVisual,
        hasSyphilis: hpHasSyphilis,
        hasSymptomaticRespiratory: hpHasSymptomaticRespiratory,
        isSmoker: hpIsSmoker,
        hasTuberculosis: hpHasTuberculosis,
        hasSocialVulnerability: hpHasSocialVulnerability,
        notes: hpNotes
      }
    };

    onUpdateContact(updatedContact);
    setActiveSubModal('none');
    setTargetContactForEdit(null);
  };

  // Helper to populate Domicile Edit Form
  const handleOpenDomicileEdit = () => {
    const dom = scheduledDomicile || {
      id: `dom_${Date.now()}`,
      street: event.address.split(',')[0] || 'Rua Territorial',
      number: event.address.split(',')[1] || '100',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      microarea: DEFAULT_MICROAREA,
      residenceType: 'Casa' as const,
      ownership: 'Próprio' as const,
      waterSupply: 'Rede Encanada' as const,
      sanitation: 'Rede Pública' as const,
      garbageCollection: 'Coletado' as const,
      hasElectricity: true,
      hasPets: false,
      familyMembers: scheduledContact
        ? [
            {
              patientId: scheduledContact.id,
              patientName: scheduledContact.name,
              relationship: scheduledContact.familyRelationship || 'Responsável Familiar',
              isHeadOfHousehold: scheduledContact.isHeadOfHousehold ?? true,
              cns: scheduledContact.cns,
              birthDate: scheduledContact.birthDate,
              phone: scheduledContact.phone
            }
          ]
        : []
    };

    setDomStreet(dom.street || '');
    setDomNumber(dom.number || '');
    setDomComplement(dom.complement || '');
    setDomNeighborhood(dom.neighborhood || '');
    setDomMicroarea(dom.microarea || DEFAULT_MICROAREA);
    setDomResidenceType(dom.residenceType || 'Casa');
    setDomOwnership(dom.ownership || 'Próprio');
    setDomWater(dom.waterSupply || 'Rede Encanada');
    setDomSanitation(dom.sanitation || 'Rede Pública');
    setDomGarbage(dom.garbageCollection || 'Coletado');
    setDomElectricity(dom.hasElectricity ?? true);
    setDomPets(dom.hasPets ?? false);
    setDomPetsDetail(dom.petsDetail || '');
    setDomMembers(dom.familyMembers || []);

    setActiveSubModal('edit_domicile');
  };

  // Add Morador inside Domicile Modal
  const handleAddMemberToDomicile = () => {
    if (!newMemberPatientId) return;
    const pat = contacts.find((c) => c.id === newMemberPatientId);
    if (!pat) return;

    if (domMembers.some((m) => m.patientId === pat.id)) {
      alert('Este morador já está cadastrado nesta composição familiar.');
      return;
    }

    const newMember: DomicileMember = {
      patientId: pat.id,
      patientName: pat.name,
      relationship: newMemberRel,
      isHeadOfHousehold: newMemberRel === 'Responsável Familiar',
      cns: pat.cns,
      birthDate: pat.birthDate,
      phone: pat.phone
    };

    setDomMembers([...domMembers, newMember]);
    setNewMemberPatientId('');
  };

  // Remove Morador
  const handleRemoveMemberFromDomicile = (patientId: string) => {
    setDomMembers(domMembers.filter((m) => m.patientId !== patientId));
  };

  // Save Domicile Edit
  const handleSaveDomicileEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!domStreet || !domNumber) return;

    const updatedDom: Domicile = {
      id: scheduledDomicile ? scheduledDomicile.id : `dom_${Date.now()}`,
      street: domStreet,
      number: domNumber,
      complement: domComplement,
      neighborhood: domNeighborhood,
      city: scheduledDomicile?.city || 'São Paulo',
      state: scheduledDomicile?.state || 'SP',
      microarea: domMicroarea,
      residenceType: domResidenceType,
      ownership: domOwnership,
      waterSupply: domWater,
      sanitation: domSanitation,
      garbageCollection: domGarbage,
      hasElectricity: domElectricity,
      hasPets: domPets,
      petsDetail: domPetsDetail,
      familyMembers: domMembers,
      createdAt: scheduledDomicile?.createdAt || getBrasiliaDateStr()
    };

    onUpdateDomicile(updatedDom);
    setActiveSubModal('none');
  };

  // Finalize Visit Handler
  const handleFinalizeVisit = (status: VisitStatus) => {
    onUpdateEventStatus(event.id, status, visitObservation);
    setIsFinalizing(true);
    setTimeout(() => {
      setIsFinalizing(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header Portal */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 flex items-start justify-between gap-4 border-b border-slate-800 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                📂 ATENDIMENTO DA VISITA DOMICILIAR
              </span>
              <span className="text-xs text-slate-300 font-semibold">{event.startTime} - {event.endTime}</span>
              {event.visitReason && (
                <span className="bg-blue-500/20 text-blue-300 text-[11px] font-bold px-2 py-0.5 rounded-md border border-blue-400/30">
                  {event.visitReason}
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-white leading-tight">
              {event.title}
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-300 flex-wrap pt-1">
              <span className="flex items-center gap-1 font-medium">
                <MapPin className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                {event.address}
              </span>
              {scheduledContact?.phone && (
                <a
                  href={`https://wa.me/${scheduledContact.phone.replace(/\D/g, '').length <= 11 ? '55' + scheduledContact.phone.replace(/\D/g, '') : scheduledContact.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${scheduledContact.name}, estou em visita domiciliar do ACS.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 bg-[#25D366] hover:bg-[#20ba5a] text-white px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition shadow-xs"
                >
                  <Phone className="h-3 w-3" />
                  WhatsApp {scheduledContact.phone}
                </a>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition"
            title="Fechar portal de visita"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Main Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* Main 3 Workflows Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Atualizar Cadastro Individual */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition">
                    <User className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                    Passo 1
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">1. Atualizar Cadastro Individual</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">
                    Atualize dados pessoais (CNS, CPF, Telefone) e condições de saúde e-SUS (HAS, DM, Gestante, etc.) do paciente agendado.
                  </p>
                </div>
                {scheduledContact && (
                  <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-100/80 text-xs text-blue-950 font-medium">
                    <span className="font-bold">{scheduledContact.name}</span>
                    {scheduledContact.cns && <span className="block text-[11px] text-blue-700">CNS: {scheduledContact.cns}</span>}
                  </div>
                )}
              </div>

              <button
                onClick={() => scheduledContact ? handleOpenPatientEdit(scheduledContact) : alert('Selecione ou vincule um munícipe para atualizar o cadastro individual.')}
                className="mt-4 w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Edit3 className="h-4 w-4" />
                Atualizar Cadastro Individual
              </button>
            </div>

            {/* Card 2: Atualizar Cadastro Domiciliar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition">
                    <Home className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                    Passo 2
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">2. Atualizar Cadastro Domiciliar</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">
                    Atualize endereço, infraestrutura de saneamento, água, energia e inclua/retire moradores da composição familiar.
                  </p>
                </div>
                {scheduledDomicile && (
                  <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100/80 text-xs text-emerald-950 font-medium">
                    <span className="font-bold">{scheduledDomicile.street}, {scheduledDomicile.number}</span>
                    <span className="block text-[11px] text-emerald-700">{scheduledDomicile.familyMembers.length} morador(es) na família</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleOpenDomicileEdit}
                className="mt-4 w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Edit3 className="h-4 w-4" />
                Atualizar Cadastro Domiciliar
              </button>
            </div>

            {/* Card 3: Atualizar Membros Familiares */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between hover:border-purple-300 hover:shadow-md transition group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition">
                    <Users className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                    Passo 3
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">3. Membros Familiares Residentes</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">
                    Visualize todos os moradores do domicílio e abra o cadastro de cada um para atualizar dados pessoais e de saúde.
                  </p>
                </div>
                <div className="bg-purple-50/60 p-2.5 rounded-xl border border-purple-100/80 text-xs text-purple-950 font-medium flex items-center justify-between">
                  <span>{currentFamilyMembers.length} Morador(es) Registrado(s)</span>
                  <span className="text-[10px] bg-purple-200 text-purple-900 font-extrabold px-1.5 py-0.5 rounded">
                    Família
                  </span>
                </div>
              </div>

              <a
                href="#membros-familiares-section"
                className="mt-4 w-full py-2.5 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Users className="h-4 w-4" />
                Ver Membros Familiares ({currentFamilyMembers.length})
              </a>
            </div>
          </div>

          {/* Section: Membros Familiares Residentes no Domicílio */}
          <div id="membros-familiares-section" className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  Composição Familiar & Moradores do Domicílio
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clique no botão de edição de qualquer morador para atualizar o cadastro individual e de saúde dele durante a visita.
                </p>
              </div>

              <button
                onClick={handleOpenDomicileEdit}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-xl text-xs font-bold transition border border-purple-200"
              >
                <Plus className="h-3.5 w-3.5" />
                Incluir / Remover Morador
              </button>
            </div>

            {currentFamilyMembers.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-500">Nenhum morador vinculado a este domicílio ainda.</p>
                <button
                  onClick={handleOpenDomicileEdit}
                  className="mt-2 text-xs font-bold text-purple-600 hover:underline"
                >
                  Vincular moradores agora
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentFamilyMembers.map((member) => {
                  const memberContact = contacts.find((c) => c.id === member.patientId || c.name === member.patientName);
                  const hp = memberContact?.healthProfile;

                  const memberKey = member.patientId || member.patientName;
                  const activeStatus = memberStatusMap[memberKey];

                  return (
                    <div
                      key={member.patientId || member.patientName}
                      className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                        activeStatus
                          ? 'bg-slate-100/90 border-slate-300 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-extrabold text-slate-900">
                            {member.patientName}
                          </span>
                          {member.isHeadOfHousehold && (
                            <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-200">
                              👑 Chefe de Família
                            </span>
                          )}
                          <span className="bg-slate-200 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            {member.relationship}
                          </span>

                          {/* Status badges */}
                          {activeStatus === 'obito' && (
                            <span className="bg-zinc-900 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-zinc-950 flex items-center gap-1 shadow-2xs">
                              <Cross className="h-2.5 w-2.5 text-zinc-300" /> Óbito
                            </span>
                          )}
                          {activeStatus === 'mudou_se_territorio' && (
                            <span className="bg-sky-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-sky-700 flex items-center gap-1 shadow-2xs">
                              <MapPinOff className="h-2.5 w-2.5" /> Fora do Território
                            </span>
                          )}
                          {activeStatus === 'mudou_se_municipio' && (
                            <span className="bg-indigo-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-indigo-700 flex items-center gap-1 shadow-2xs">
                              <Building2 className="h-2.5 w-2.5" /> Fora do Município
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 flex items-center gap-3 flex-wrap">
                          {member.cns && <span>CNS: {member.cns}</span>}
                          {member.birthDate && <span>Nasc: {member.birthDate}</span>}
                        </div>

                        {/* Health badges snippet */}
                        {hp && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {hp.isPregnant && <span className="text-[9px] bg-pink-100 text-pink-800 px-1.5 py-0.5 rounded-md font-bold">🤰 Gestante</span>}
                            {hp.isHypertensive && <span className="text-[9px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded-md font-bold">🩺 HAS</span>}
                            {hp.isDiabetic && <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md font-bold">🩸 DM</span>}
                            {hp.isBedridden && <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-md font-bold">🛏️ Acamado</span>}
                            {hp.isElderly && <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-bold">👴 60+</span>}
                            {hp.isChildUnder2 && <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-md font-bold">👶 0-2a</span>}
                          </div>
                        )}

                        {activeStatus && (
                          <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 p-2 rounded-lg text-[10px] font-bold flex items-center gap-1.5 mt-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span>
                              Situação registrada ({activeStatus === 'obito' ? 'Óbito' : activeStatus === 'mudou_se_territorio' ? 'Fora do território' : 'Fora do Município'}). Não necessita de atualização de cadastro.
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-start sm:items-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                        {activeStatus ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 text-[10px] font-extrabold px-2 py-1 rounded-md border border-emerald-300">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Cadastro Dispensado
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (memberContact) {
                                  handleOpenPatientEdit(memberContact);
                                } else {
                                  handleOpenPatientEdit({
                                    id: member.patientId,
                                    name: member.patientName,
                                    cns: member.cns,
                                    phone: member.phone,
                                    birthDate: member.birthDate,
                                    labels: ['Acompanhamento ACS'],
                                    address: event.address
                                  });
                                }
                              }}
                              className="text-[10px] font-bold text-slate-500 hover:text-slate-800 underline"
                            >
                              Editar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (memberContact) {
                                handleOpenPatientEdit(memberContact);
                              } else {
                                handleOpenPatientEdit({
                                  id: member.patientId,
                                  name: member.patientName,
                                  cns: member.cns,
                                  phone: member.phone,
                                  birthDate: member.birthDate,
                                  labels: ['Acompanhamento ACS'],
                                  address: event.address
                                });
                              }
                            }}
                            className="px-2.5 py-1.5 bg-white hover:bg-purple-600 hover:text-white text-purple-700 border border-purple-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-2xs"
                            title="Atualizar dados de saúde e cadastrais deste morador"
                          >
                            <Edit3 className="h-3 w-3" />
                            Atualizar Cadastro
                          </button>
                        )}

                        {/* Status buttons right below 'Atualizar Cadastro' */}
                        <div className="flex flex-wrap items-center gap-1 justify-start sm:justify-end">
                          <button
                            type="button"
                            onClick={() => handleToggleMemberStatusTag(member, 'obito')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border transition flex items-center gap-1 ${
                              activeStatus === 'obito'
                                ? 'bg-zinc-900 text-white border-zinc-950 ring-2 ring-zinc-800 ring-offset-1 shadow-xs'
                                : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                            }`}
                            title="Marcar/Desmarcar Óbito para este morador"
                          >
                            {activeStatus === 'obito' ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Cross className="h-3 w-3 text-zinc-600" />
                            )}
                            Óbito
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleMemberStatusTag(member, 'mudou_se_territorio')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border transition flex items-center gap-1 ${
                              activeStatus === 'mudou_se_territorio'
                                ? 'bg-sky-600 text-white border-sky-700 ring-2 ring-sky-500 ring-offset-1 shadow-xs'
                                : 'bg-white text-sky-700 border-sky-300 hover:bg-sky-50'
                            }`}
                            title="Marcar/Desmarcar Não mora mais no território"
                          >
                            {activeStatus === 'mudou_se_territorio' ? (
                              <Check className="h-3 w-3 text-white" />
                            ) : (
                              <MapPinOff className="h-3 w-3 text-sky-600" />
                            )}
                            Não mora mais no território
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleMemberStatusTag(member, 'mudou_se_municipio')}
                            className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border transition flex items-center gap-1 ${
                              activeStatus === 'mudou_se_municipio'
                                ? 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-500 ring-offset-1 shadow-xs'
                                : 'bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50'
                            }`}
                            title="Marcar/Desmarcar Não mora mais no Município"
                          >
                            {activeStatus === 'mudou_se_municipio' ? (
                              <Check className="h-3 w-3 text-white" />
                            ) : (
                              <Building2 className="h-3 w-3 text-indigo-600" />
                            )}
                            Não mora mais no Município
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section: Observações e Finalização da Visita (Visita Realizada) */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-white to-emerald-500/5 p-5 rounded-2xl border-2 border-emerald-500/40 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-emerald-950 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                Finalização e Registro do Atendimento da Visita
              </h3>
              {event.updatedAt && (
                <span className="text-xs text-emerald-800 font-mono font-bold">
                  Último registro às {event.updatedAt}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Anotações e Observações da Visita Domiciliar (e-SUS / ACS):
              </label>
              <textarea
                value={visitObservation}
                onChange={(e) => setVisitObservation(e.target.value)}
                placeholder="Exemplo: PA aferida 120/80 mmHg. Glicemia de jejum 98 mg/dL. Verificada caderneta de vacinação da criança (todas aplicadas). Orientada gestante quanto a exames do 3º trimestre."
                className="w-full text-xs p-3 bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium h-24 shadow-xs"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedStatus('realizada')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                    selectedStatus === 'realizada'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Visita Realizada
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStatus('nao_encontrado')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    selectedStatus === 'nao_encontrado'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-white text-rose-800 border border-rose-300 hover:bg-rose-50'
                  }`}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Não Encontrado
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStatus('reagendado')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    selectedStatus === 'reagendado'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-white text-purple-800 border border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  Reagendado
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleFinalizeVisit(selectedStatus)}
                disabled={isFinalizing}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 shrink-0"
              >
                {isFinalizing ? (
                  <span>Salvando Atendimento...</span>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    REGISTRAR & FINALIZAR ATENDIMENTO
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* SUB-MODAL 1: EDIT PATIENT FORM */}
        {activeSubModal === 'edit_patient' && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-3 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  <h3 className="text-base font-extrabold text-slate-900">
                    Atualizar Cadastro Individual & Saúde e-SUS: {pName}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveSubModal('none')}
                  className="text-slate-400 hover:text-slate-600 p-1 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSavePatientEdit} className="space-y-5">
                {/* Dados Pessoais Basicos */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-4 w-4 text-blue-600" />
                    1. Identificação do Munícipe / Paciente
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo *</label>
                      <input
                        type="text"
                        required
                        value={pName}
                        onChange={(e) => setPName(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Cartão SUS / CNS (15 dígitos)</label>
                      <input
                        type="text"
                        value={pCns}
                        onChange={(e) => setPCns(e.target.value)}
                        placeholder="700000000000000"
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">CPF</label>
                      <input
                        type="text"
                        value={pCpf}
                        onChange={(e) => setPCpf(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Data de Nascimento</label>
                      <input
                        type="date"
                        value={pBirthDate}
                        onChange={(e) => setPBirthDate(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
                      <input
                        type="text"
                        value={pPhone}
                        onChange={(e) => setPPhone(e.target.value)}
                        placeholder="(11) 98765-4321"
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-medium text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Sexo Biológico</label>
                      <select
                        value={pGender}
                        onChange={(e) => setPGender(e.target.value as any)}
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
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
                        value={pMotherName}
                        onChange={(e) => setPMotherName(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Parentesco na Família</label>
                      <select
                        value={pFamilyRel}
                        onChange={(e) => setPFamilyRel(e.target.value as FamilyRelationship)}
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      >
                        {RELATIONSHIP_OPTIONS.map((rel) => (
                          <option key={rel} value={rel}>
                            {rel}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Condições Clínicas e Acompanhamento e-SUS */}
                <div className="space-y-4 bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200">
                  <h4 className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-emerald-600" />
                    2. Classificação de Enfermidades e Acompanhamento e-SUS
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs font-bold">
                      <input type="checkbox" checked={hpIsPregnant} onChange={(e) => setHpIsPregnant(e.target.checked)} className="h-4 w-4 text-emerald-600 rounded" />
                      <span>🤰 Gestante</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs font-bold">
                      <input type="checkbox" checked={hpIsPuerpera} onChange={(e) => setHpIsPuerpera(e.target.checked)} className="h-4 w-4 text-emerald-600 rounded" />
                      <span>🌸 Puérpera</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs font-bold">
                      <input type="checkbox" checked={hpIsHypertensive} onChange={(e) => setHpIsHypertensive(e.target.checked)} className="h-4 w-4 text-emerald-600 rounded" />
                      <span>🩺 Hipertenso (HAS)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs font-bold">
                      <input type="checkbox" checked={hpIsDiabetic} onChange={(e) => setHpIsDiabetic(e.target.checked)} className="h-4 w-4 text-emerald-600 rounded" />
                      <span>🩸 Diabético (DM)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs font-bold">
                      <input type="checkbox" checked={hpIsInsulinDependent} onChange={(e) => setHpIsInsulinDependent(e.target.checked)} className="h-4 w-4 text-emerald-600 rounded" />
                      <span>💉 InsulinoDependente</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs font-bold">
                      <input type="checkbox" checked={hpIsBedridden} onChange={(e) => setHpIsBedridden(e.target.checked)} className="h-4 w-4 text-emerald-600 rounded" />
                      <span>🛏️ Acamado</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs font-bold">
                      <input type="checkbox" checked={hpIsElderly} onChange={(e) => setHpIsElderly(e.target.checked)} className="h-4 w-4 text-emerald-600 rounded" />
                      <span>👴 Idoso (60+)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs font-bold">
                      <input type="checkbox" checked={hpIsChildUnder2} onChange={(e) => setHpIsChildUnder2(e.target.checked)} className="h-4 w-4 text-emerald-600 rounded" />
                      <span>👶 Criança (0-2a)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs font-bold">
                      <input type="checkbox" checked={hpHasAsthma} onChange={(e) => setHpHasAsthma(e.target.checked)} className="h-4 w-4 text-emerald-600 rounded" />
                      <span>🫁 Asma</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs font-bold">
                      <input type="checkbox" checked={hpHasCOPD} onChange={(e) => setHpHasCOPD(e.target.checked)} className="h-4 w-4 text-emerald-600 rounded" />
                      <span>🫁 DPOC</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs font-bold">
                      <input type="checkbox" checked={hpHasCancer} onChange={(e) => setHpHasCancer(e.target.checked)} className="h-4 w-4 text-emerald-600 rounded" />
                      <span>🧬 Câncer</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs font-bold">
                      <input type="checkbox" checked={hpHasHanseniasis} onChange={(e) => setHpHasHanseniasis(e.target.checked)} className="h-4 w-4 text-emerald-600 rounded" />
                      <span>🦠 Hanseníase</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs font-bold">
                      <input type="checkbox" checked={hpHasSyphilis} onChange={(e) => setHpHasSyphilis(e.target.checked)} className="h-4 w-4 text-emerald-600 rounded" />
                      <span>🦠 Sífilis</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs font-bold">
                      <input type="checkbox" checked={hpHasTuberculosis} onChange={(e) => setHpHasTuberculosis(e.target.checked)} className="h-4 w-4 text-emerald-600 rounded" />
                      <span>🦠 Tuberculose</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs font-bold">
                      <input type="checkbox" checked={hpHasMentalCondition} onChange={(e) => setHpHasMentalCondition(e.target.checked)} className="h-4 w-4 text-emerald-600 rounded" />
                      <span>🧠 Saúde Mental</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs font-bold">
                      <input type="checkbox" checked={hpHasAlcoholism} onChange={(e) => setHpHasAlcoholism(e.target.checked)} className="h-4 w-4 text-emerald-600 rounded" />
                      <span>🍺 Álcool</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs font-bold">
                      <input type="checkbox" checked={hpIsSmoker} onChange={(e) => setHpIsSmoker(e.target.checked)} className="h-4 w-4 text-emerald-600 rounded" />
                      <span>🚬 Tabagista</span>
                    </label>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer text-xs font-bold">
                      <input type="checkbox" checked={hpHasSpecialNeeds} onChange={(e) => setHpHasSpecialNeeds(e.target.checked)} className="h-4 w-4 text-emerald-600 rounded" />
                      <span>♿ PCD Deficiência</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setActiveSubModal('none')}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
                  >
                    <Save className="h-4 w-4" />
                    Salvar Cadastro Individual
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* SUB-MODAL 2: EDIT DOMICILE FORM */}
        {activeSubModal === 'edit_domicile' && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-3 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-base font-extrabold text-slate-900">
                    Atualizar Cadastro Domiciliar & Composição Familiar
                  </h3>
                </div>
                <button
                  onClick={() => setActiveSubModal('none')}
                  className="text-slate-400 hover:text-slate-600 p-1 font-bold text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveDomicileEdit} className="space-y-5">
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    1. Endereço e Localização do Domicílio
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Rua / Logradouro *</label>
                      <input
                        type="text"
                        required
                        value={domStreet}
                        onChange={(e) => setDomStreet(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Número *</label>
                      <input
                        type="text"
                        required
                        value={domNumber}
                        onChange={(e) => setDomNumber(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Complemento</label>
                      <input
                        type="text"
                        value={domComplement}
                        onChange={(e) => setDomComplement(e.target.value)}
                        placeholder="Apto, Casa 2, Bloco B"
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Bairro</label>
                      <input
                        type="text"
                        value={domNeighborhood}
                        onChange={(e) => setDomNeighborhood(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Microárea</label>
                      <select
                        value={domMicroarea}
                        onChange={(e) => setDomMicroarea(e.target.value)}
                        className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800"
                      >
                        {getSavedMicroareas().map((m) => (
                          <option key={m} value={m}>
                            {cleanMicroareaName(m)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Composição Familiar */}
                <div className="space-y-3 bg-purple-50/60 p-4 rounded-2xl border border-purple-200">
                  <h4 className="text-xs font-extrabold text-purple-900 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-purple-600" />
                      2. Gerenciar Composição Familiar (Moradores)
                    </span>
                    <span className="text-[11px] font-bold text-purple-700">{domMembers.length} morador(es)</span>
                  </h4>

                  {/* Add New Resident Dropdown */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2.5 rounded-xl border border-purple-200">
                    <select
                      value={newMemberPatientId}
                      onChange={(e) => setNewMemberPatientId(e.target.value)}
                      className="flex-1 text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                    >
                      <option value="">Selecione um munícipe para incluir no domicílio...</option>
                      {contacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.cns ? `(CNS: ${c.cns})` : ''}
                        </option>
                      ))}
                    </select>

                    <select
                      value={newMemberRel}
                      onChange={(e) => setNewMemberRel(e.target.value as FamilyRelationship)}
                      className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
                    >
                      {RELATIONSHIP_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleAddMemberToDomicile}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition shrink-0 flex items-center justify-center gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Incluir Morador
                    </button>
                  </div>

                  {/* Moradores Table/List */}
                  <div className="space-y-2 pt-2">
                    {domMembers.length === 0 ? (
                      <p className="text-xs text-slate-500 italic p-3 text-center bg-white rounded-xl">
                        Nenhum morador vinculado a este domicílio ainda.
                      </p>
                    ) : (
                      domMembers.map((m) => (
                        <div
                          key={m.patientId || m.patientName}
                          className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-medium"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{m.patientName}</span>
                            <span className="ml-2 text-[11px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md font-semibold">
                              {m.relationship}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveMemberFromDomicile(m.patientId)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="Retirar morador da família"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setActiveSubModal('none')}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
                  >
                    <Save className="h-4 w-4" />
                    Salvar Cadastro Domiciliar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
