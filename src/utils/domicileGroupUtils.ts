import { GoogleContact, Domicile, DomicileMember, FamilyRelationship, DEFAULT_MICROAREA, TrashItem, CalendarEvent } from '../types';
import { searchAddressByCEP, ViaCepResult } from '../services/apiService';
import { getBrasiliaDateStr } from './dateUtils';
import { calculateAge } from './exportUtils';

export interface ProcessResult {
  updatedContacts: GoogleContact[];
  updatedDomiciles: Domicile[];
  summary: {
    totalContactsProcessed: number;
    cepFoundCount: number;
    domicilesCreated: number;
    domicilesUpdated: number;
    details: string[];
  };
}

/**
 * Extracts CEP from text string and fixes missing leading zero if 7 digits.
 * Example input: "Rua. Moacir Sales Davila, 385, Casa 2 ( 6288010 )"
 * Output fixed CEP: "06288010"
 */
export function extractAndFixCEP(text: string): { rawCep: string; fixedCep: string } | null {
  if (!text) return null;

  // Search for 7 or 8 consecutive digits in parentheses or standalone after address
  // Pattern 1: ( 6288010 ) or (6288010) or CEP: 6288010 or 62880-010
  const parenMatch = text.match(/\(\s*(\d{7,8})\s*\)/);
  if (parenMatch && parenMatch[1]) {
    const raw = parenMatch[1];
    const fixed = raw.length === 7 ? `0${raw}` : raw;
    return { rawCep: raw, fixedCep: fixed };
  }

  // Pattern 2: Standard formatted CEP e.g. 62880-010 or 06288-010
  const formattedMatch = text.match(/\b(\d{4,5})[-.]?(\d{3})\b/);
  if (formattedMatch) {
    const combined = `${formattedMatch[1]}${formattedMatch[2]}`;
    if (combined.length === 7) {
      return { rawCep: combined, fixedCep: `0${combined}` };
    } else if (combined.length === 8) {
      return { rawCep: combined, fixedCep: combined };
    }
  }

  // Pattern 3: Sequence of 7 digits anywhere in the address string
  const sevenDigitMatch = text.match(/\b(\d{7})\b/);
  if (sevenDigitMatch) {
    const raw = sevenDigitMatch[1];
    return { rawCep: raw, fixedCep: `0${raw}` };
  }

  // Pattern 4: Sequence of 8 digits
  const eightDigitMatch = text.match(/\b(\d{8})\b/);
  if (eightDigitMatch) {
    const raw = eightDigitMatch[1];
    return { rawCep: raw, fixedCep: raw };
  }

  return null;
}

export function normalizeDateToISO(dateStr: string): string {
  if (!dateStr) return '';
  const clean = dateStr.trim();

  // Match YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  // Match DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const brMatch = clean.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Match DD/MM/YY
  const brShortMatch = clean.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2})$/);
  if (brShortMatch) {
    const day = brShortMatch[1].padStart(2, '0');
    const month = brShortMatch[2].padStart(2, '0');
    let year = parseInt(brShortMatch[3], 10);
    year = year > 25 ? 1900 + year : 2000 + year;
    return `${year}-${month}-${day}`;
  }

  return clean;
}

export function extractBirthDateFromNotes(notes?: string): string | undefined {
  if (!notes) return undefined;

  const lines = notes.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Pattern 1: Keywords like NASC, NASCIMENTO, DATA DE NASCIMENTO, DATA NASC, D.N, DN, DOB, ANIVERSARIO, Nasc.
    const birthMatch = trimmed.match(/(?:DATA\s+DE\s+NASCIMENTO|DATA\s+NASC|NASCIMENTO|NASC\.?|D\.?N\.?|DOB|ANIVERS[ÁA]RIO)[:=.\s\-]*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}|\d{4}-\d{2}-\d{2})/i);
    if (birthMatch) {
      const iso = normalizeDateToISO(birthMatch[1]);
      if (iso && iso.length === 10) return iso;
    }
  }

  // Fallback: search anywhere in notes for keywords + date
  const globalMatch = notes.match(/(?:NASC|D\.?N\.?|DOB|ANIVERS[ÁA]RIO|NASCIMENTO)[^\d]*(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}|\d{4}-\d{2}-\d{2})/i);
  if (globalMatch) {
    const iso = normalizeDateToISO(globalMatch[1]);
    if (iso && iso.length === 10) return iso;
  }

  // Fallback 2: Standalone date in notes e.g. "15/04/1985"
  const standaloneMatch = notes.match(/\b(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{4})\b/);
  if (standaloneMatch) {
    const iso = normalizeDateToISO(standaloneMatch[1]);
    if (iso && iso.length === 10) return iso;
  }

  return undefined;
}

export function detectNeighborhood(addressText: string, fallbackBairro: string = 'Bairro Territorial'): string {
  if (!addressText) return fallbackBairro;
  if (/vila\s*\.?\s*men[ck]|vilamen[ck]|menck/i.test(addressText)) {
    return 'Vila Menck';
  }
  if (fallbackBairro && !/bairro|territorial|cidade/i.test(fallbackBairro)) {
    return fallbackBairro;
  }
  return fallbackBairro;
}

export function sanitizeComplement(complement?: string, logradouro?: string): string {
  if (!complement) return '';
  let comp = complement.trim();
  if (!comp) return '';

  // Clean trailing punctuation or leading/trailing dashes/commas
  comp = comp.replace(/^[-,;:\s]+|[-,;:\s]+$/g, '').trim();
  if (!comp) return '';

  const normComp = comp.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normLog = (logradouro || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // If complement matches or contains the logradouro street name, ignore it as complement
  if (normLog && normLog.length > 3 && (normComp === normLog || normLog.includes(normComp))) {
    return '';
  }

  // Reject street type prefixes (excluding viela, which is valid in complement e.g. Viela 21, Viela 5, Casa 2)
  if (/^(rua|av|avenida|travessa|alameda|praça|praca|rodovia|estrada|servid[aã]o)\b/i.test(comp)) {
    return '';
  }

  // Reject explicit Neighborhood / Bairro names (e.g. Vila Menck, VilaMenck, VilaMenk, Vila. Menck, Osasco, Bairro, Centro, etc.)
  if (
    /\b(bairro|centro|s[ãa]o paulo|osasco|cear[aá]|brasil|cep:|\d{5}[-.]?\d{3})\b/i.test(comp) ||
    /vila\s*\.?\s*men[ck]/i.test(comp) ||
    /vilamen[ck]/i.test(comp) ||
    /menck/i.test(comp) ||
    /jardim|jd\.|parque|pq\./i.test(comp)
  ) {
    return '';
  }

  // Clean any remaining neighborhood string trailing in complement
  comp = comp.replace(/,?\s*(vila\s*\.?\s*men[ck]|vilamen[ck]|menck|bairro.*|osasco.*|s[ãa]o paulo.*)/i, '').trim();
  comp = comp.replace(/^[-,;:\s]+|[-,;:\s]+$/g, '').trim();

  return comp;
}

/**
 * Extracts house number and complement from address string
 * Example input: "Rua. Moacir Sales Davila, 385, Casa 2 ( 6288010 )"
 * houseNumber: "385"
 * complement: "Casa 2"
 */
export function extractNumberAndComplement(addressText: string): { houseNumber: string; complement: string } {
  if (!addressText) return { houseNumber: 'S/N', complement: '' };

  // Strip out parenthesized CEP if present e.g. ( 6288010 )
  const cleanText = addressText.replace(/\(\s*\d{7,8}\s*\)/g, '').trim();

  let houseNumber = '';
  let complement = '';

  // Split by comma WITHOUT filtering empty parts first, preserving CSV column slots
  const rawCommaParts = cleanText.split(',').map((p) => p.trim());

  if (rawCommaParts.length >= 2) {
    let numIdx = -1;
    for (let i = 0; i < rawCommaParts.length; i++) {
      const part = rawCommaParts[i];
      if (!part) continue;

      const numMatch = part.match(/(?:n[º°o]?\s*)?(\d+[a-zA-Z]?)/i);
      if (numMatch && numMatch[1].length <= 5) {
        houseNumber = numMatch[1];
        numIdx = i;

        const remainingInPart = part.replace(numMatch[0], '').replace(/^[-,;:\s]+|[-,;:\s]+$/g, '').trim();
        if (remainingInPart) {
          complement = remainingInPart;
        }
        break;
      }
    }

    if (numIdx !== -1 && !complement) {
      // Check next comma slot (CSV Complement column position)
      if (numIdx + 1 < rawCommaParts.length) {
        const nextSlot = rawCommaParts[numIdx + 1];
        // If nextSlot is empty string (e.g. from ", ,"), there is NO complement!
        if (nextSlot === '' || !nextSlot) {
          complement = '';
        } else {
          // If nextSlot has text, verify it's not neighborhood or city
          const sanitized = sanitizeComplement(nextSlot, rawCommaParts[0]);
          if (sanitized) {
            complement = sanitized;
          }
        }
      }
    }
  }

  // Fallback for non-comma separated addresses
  if (!houseNumber) {
    const parts = cleanText.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean);
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const numMatch = part.match(/(?:n[º°o]?\s*)?(\d+[a-zA-Z]?)/i);
      if (numMatch && numMatch[1].length <= 5) {
        houseNumber = numMatch[1];
        const remainingInPart = part.replace(numMatch[0], '').replace(/^[-_\s]+/, '').trim();
        if (remainingInPart) {
          complement = remainingInPart;
        } else if (i + 1 < parts.length) {
          complement = parts[i + 1];
        }
        break;
      }
    }
  }

  if (!houseNumber) {
    houseNumber = 'S/N';
  }

  const logradouroPart = rawCommaParts[0] || cleanText.split(',')[0] || '';
  const sanitizedComp = sanitizeComplement(complement, logradouroPart);

  return { houseNumber, complement: sanitizedComp };
}

/**
 * Normalizes company name field according to user specification:
 * Company ("Empresa") = "Nome de Logradouro + Número da Casa + Complemento"
 * Example: "Rua Moacir Sales Dávila, 385, Casa 2"
 */
export function buildCompanyAddressString(logradouro: string, houseNumber: string, complement?: string): string {
  const cleanLogradouro = (logradouro || '').trim().replace(/^Rua\.\s*/i, 'Rua ');
  const cleanNumber = (houseNumber || 'S/N').trim();
  const cleanComp = sanitizeComplement(complement, cleanLogradouro);

  if (cleanComp) {
    return `${cleanLogradouro}, ${cleanNumber}, ${cleanComp}`;
  }
  return `${cleanLogradouro}, ${cleanNumber}`;
}

/**
 * Normalizes key for household grouping comparison (ignores case, accents, punctuation)
 */
export function generateDomicileAddressKey(logradouro: string, houseNumber: string, complement?: string): string {
  const compStr = buildCompanyAddressString(logradouro, houseNumber, complement);
  return compStr
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Re-evaluates and resolves the Responsável Familiar (Head of Household) for a domicile:
 *
 * Rules:
 * 1. If any member in the domicile or the domicile itself was MANUALLY set/edited by the operator
 *    (manuallySetHeadOfHousehold === true or hasManuallySetHeadOfHousehold === true),
 *    PRESERVE that operator selection as priority!
 *
 * 2. Otherwise (initial information entry / "primeira entrada de informações"):
 *    a) Identify scheduled patients (pacientes agendados na agenda) for this domicile.
 *    b) Filter scheduled patients who are at least 18 years old (calculateAge(birthDate) >= 18).
 *    c) If 1 or more scheduled patients are >= 18 years old:
 *       - Sort them by age descending (de maior idade).
 *       - Pick the oldest scheduled patient >= 18 as Responsável Familiar.
 *    d) If no scheduled patient is >= 18 (or no scheduled patients exist):
 *       - Pick the oldest member in the domicile who is >= 18 as Responsável Familiar.
 *       - If no members are >= 18 or birthDates are missing, preserve existing head or default.
 */
export function resolveDomicileHeadOfHousehold(
  domicile: Domicile,
  contacts: GoogleContact[],
  events?: CalendarEvent[]
): Domicile {
  if (!domicile.familyMembers || domicile.familyMembers.length === 0) {
    return domicile;
  }

  const memberContactsMap = new Map<string, GoogleContact>();
  contacts.forEach((c) => memberContactsMap.set(c.id, c));

  // Check if head of household was manually set by operator
  const hasManualHead =
    domicile.hasManuallySetHeadOfHousehold ||
    domicile.familyMembers.some((m) => {
      if (m.manuallySetHeadOfHousehold) return true;
      const contact = memberContactsMap.get(m.patientId);
      return contact?.manuallySetHeadOfHousehold;
    });

  if (hasManualHead) {
    // Preserve the manually set head of household
    const manualMember = domicile.familyMembers.find((m) => {
      if (m.manuallySetHeadOfHousehold) return true;
      const c = memberContactsMap.get(m.patientId);
      return c?.manuallySetHeadOfHousehold;
    });

    if (manualMember) {
      const updatedMembers = domicile.familyMembers.map((m) => {
        const isThisManualHead = m.patientId === manualMember.patientId;
        return {
          ...m,
          isHeadOfHousehold: isThisManualHead,
          relationship: (isThisManualHead
            ? 'Responsável Familiar'
            : m.relationship === 'Responsável Familiar'
            ? 'Outro Parente'
            : m.relationship) as FamilyRelationship,
          manuallySetHeadOfHousehold: isThisManualHead ? true : m.manuallySetHeadOfHousehold
        };
      });
      return {
        ...domicile,
        hasManuallySetHeadOfHousehold: true,
        familyMembers: updatedMembers
      };
    }
  }

  // --- Initial Information Entry ("Primeira entrada de informações") ---
  // Determine scheduled patient IDs for this domicile
  const scheduledPatientIds = new Set<string>();
  if (events && events.length > 0) {
    events.forEach((ev) => {
      if (ev.domicileId === domicile.id) {
        if (ev.contactId) scheduledPatientIds.add(ev.contactId);
      } else if (ev.contactId) {
        const c = memberContactsMap.get(ev.contactId);
        if (c && (c.domicileId === domicile.id || domicile.familyMembers.some((m) => m.patientId === c.id))) {
          scheduledPatientIds.add(ev.contactId);
        }
      } else if (ev.contactName) {
        const normEventName = ev.contactName.trim().toLowerCase();
        domicile.familyMembers.forEach((m) => {
          if (m.patientName.trim().toLowerCase() === normEventName) {
            scheduledPatientIds.add(m.patientId);
          }
        });
      }
    });
  }

  // Calculate age and adult status for members
  const memberCandidates = domicile.familyMembers.map((m) => {
    const contact = memberContactsMap.get(m.patientId);
    const bDate = m.birthDate || contact?.birthDate;
    const age = calculateAge(bDate);
    const isScheduled = scheduledPatientIds.has(m.patientId);

    return {
      member: m,
      contact,
      age,
      isScheduled,
      isAdult: age !== null && age >= 18
    };
  });

  // Scheduled patients who are adults (>= 18)
  const scheduledAdultCandidates = memberCandidates.filter((c) => c.isScheduled && c.isAdult);

  let chosenHeadId: string | null = null;

  if (scheduledAdultCandidates.length > 0) {
    // Pick the oldest scheduled adult patient (de maior idade)
    scheduledAdultCandidates.sort((a, b) => (b.age || 0) - (a.age || 0));
    chosenHeadId = scheduledAdultCandidates[0].member.patientId;
  } else {
    // If no scheduled patient is >= 18, check all adults (>= 18) in the domicile
    const allAdultCandidates = memberCandidates.filter((c) => c.isAdult);
    if (allAdultCandidates.length > 0) {
      allAdultCandidates.sort((a, b) => (b.age || 0) - (a.age || 0));
      chosenHeadId = allAdultCandidates[0].member.patientId;
    } else {
      // If no adults found, keep existing head or fallback to first member
      const existingHead = domicile.familyMembers.find((m) => m.isHeadOfHousehold);
      if (existingHead) {
        chosenHeadId = existingHead.patientId;
      } else {
        chosenHeadId = domicile.familyMembers[0].patientId;
      }
    }
  }

  const updatedMembers = domicile.familyMembers.map((m) => {
    const isHead = m.patientId === chosenHeadId;
    return {
      ...m,
      isHeadOfHousehold: isHead,
      relationship: (isHead
        ? 'Responsável Familiar'
        : m.relationship === 'Responsável Familiar'
        ? 'Outro Parente'
        : m.relationship) as FamilyRelationship
    };
  });

  return {
    ...domicile,
    familyMembers: updatedMembers
  };
}

/**
 * Runs complete CEP normalization, ViaCEP lookup, company field update,
 * and automatic Household/Domicile grouping on a list of contacts.
 */
export async function processAndGroupContactsByCEP(
  contacts: GoogleContact[],
  existingDomiciles: Domicile[],
  options: {
    autoCreateMissingDomiciles?: boolean;
    trashItems?: TrashItem[];
    trashedAddressKeys?: Set<string>;
    events?: CalendarEvent[];
  } = {}
): Promise<ProcessResult> {
  const autoCreate = options.autoCreateMissingDomiciles ?? false;
  const updatedContacts: GoogleContact[] = [];
  const domicileMap = new Map<string, Domicile>();
  const details: string[] = [];

  // Index trashed domiciles to prevent re-creating deleted ones
  const trashedKeys = new Set<string>(options.trashedAddressKeys || []);
  if (options.trashItems) {
    options.trashItems.forEach((item) => {
      if (item.type === 'domicile' && item.originalData) {
        const dom = item.originalData as Domicile;
        if (dom && dom.street && dom.number) {
          const key = generateDomicileAddressKey(dom.street, dom.number, dom.complement);
          trashedKeys.add(key);
        }
      }
    });
  }

  // Index existing domiciles by their normalized address key and ID
  existingDomiciles.forEach((dom) => {
    const key = generateDomicileAddressKey(dom.street, dom.number, dom.complement);
    domicileMap.set(key, { ...dom, familyMembers: [...dom.familyMembers] });
  });

  let cepFoundCount = 0;
  let domicilesCreated = 0;
  let domicilesUpdated = 0;

  // Pre-fetch CEPs in batches to prevent UI freeze and network bottlenecks
  const uniqueCepsToFetch = new Set<string>();
  contacts.forEach((contact) => {
    const cepInfo = extractAndFixCEP(contact.address || '');
    if (cepInfo) {
      uniqueCepsToFetch.add(cepInfo.fixedCep);
    }
  });

  // Batch process CEPs with max 5 parallel requests
  const cepArray = Array.from(uniqueCepsToFetch);
  const BATCH_SIZE = 5;
  for (let i = 0; i < cepArray.length; i += BATCH_SIZE) {
    const batch = cepArray.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map((cep) => searchAddressByCEP(cep).catch(() => null)));
  }

  for (const contact of contacts) {
    const fullAddressText = contact.address || '';
    const cepInfo = extractAndFixCEP(fullAddressText);

    let officialLogradouro = '';
    let officialBairro = contact.city || 'Bairro Territorial';
    let officialCity = contact.city || 'Cidade';
    let officialState = contact.state || 'UF';
    let fixedCepFormatted = '';

    const { houseNumber, complement } = extractNumberAndComplement(fullAddressText);
    const finalNumber = contact.addressNumber || houseNumber;

    if (cepInfo) {
      cepFoundCount++;
      const { fixedCep, rawCep } = cepInfo;
      fixedCepFormatted = fixedCep.length === 8 ? `${fixedCep.substring(0, 5)}-${fixedCep.substring(5)}` : fixedCep;

      // Query ViaCEP API (Instant 0ms from RAM/LocalStorage cache after pre-fetch)
      const viaCepRes = await searchAddressByCEP(fixedCep);

      if (viaCepRes && viaCepRes.logradouro) {
        officialLogradouro = viaCepRes.logradouro;
        if (viaCepRes.bairro) officialBairro = viaCepRes.bairro;
        if (viaCepRes.localidade) officialCity = viaCepRes.localidade;
        if (viaCepRes.uf) officialState = viaCepRes.uf;

        details.push(
          `✅ ${contact.name}: CEP ${rawCep} -> ${fixedCep} (${viaCepRes.logradouro}, ${officialCity}/${officialState})`
        );
      } else {
        // Fallback: se ViaCEP não retornar logradouro, manter o endereço original do cadastro
        const existingAddr = contact.company || contact.address || fullAddressText;
        const parsedLog = existingAddr.split(',')[0]?.replace(/\(\s*\d+\s*\)/g, '').replace(/^Rua\.\s*/i, 'Rua ').trim();
        officialLogradouro = parsedLog || 'Logradouro Territorial';
        details.push(`⚠️ ${contact.name}: CEP ${fixedCep} sem retorno da API. Mantido endereço do cadastro: ${officialLogradouro}`);
      }
    } else {
      // Sem CEP no cadastro: "se algum endereço não conter o CEP, deixar o endereço do cadastro"
      const existingAddr = contact.company || contact.address || fullAddressText;
      const parsedLog = existingAddr.split(',')[0]?.replace(/\(\s*\d+\s*\)/g, '').replace(/^Rua\.\s*/i, 'Rua ').trim();
      officialLogradouro = parsedLog || 'Logradouro Territorial';
    }

    const rawComp = contact.addressComplement || complement;
    const finalComp = sanitizeComplement(rawComp, officialLogradouro);

    // Ensure neighborhood is detected properly (e.g. Vila Menck)
    officialBairro = detectNeighborhood(`${fullAddressText} ${contact.notes || ''}`, officialBairro);

    // Parse/extract birth date from contact notes if missing
    let contactBirthDate = contact.birthDate;
    if (!contactBirthDate || contactBirthDate.trim() === '') {
      contactBirthDate = extractBirthDateFromNotes(contact.notes);
    } else {
      contactBirthDate = normalizeDateToISO(contactBirthDate);
    }

    // Standardize Google Contacts Company ("Empresa") field: Logradouro + Número + Complemento
    const companyAddress = buildCompanyAddressString(officialLogradouro, finalNumber, finalComp);
    const fullFormattedAddress = `${companyAddress} - ${officialBairro}, ${officialCity}/${officialState}${fixedCepFormatted ? ` (CEP: ${fixedCepFormatted})` : ''}`;

    // Address key for grouping domiciles
    const addressKey = generateDomicileAddressKey(officialLogradouro, finalNumber, finalComp);

    // Find or Create Domicile
    let domicile = domicileMap.get(addressKey);

    if (!domicile && contact.domicileId) {
      for (const d of domicileMap.values()) {
        if (d.id === contact.domicileId) {
          domicile = d;
          break;
        }
      }
    }

    if (!domicile) {
      if (autoCreate && !contact.unlinkedFromDomicile && !trashedKeys.has(addressKey)) {
        domicilesCreated++;
        domicile = {
          id: `dom_cep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          street: officialLogradouro,
          number: finalNumber,
          complement: finalComp || undefined,
          neighborhood: officialBairro,
          zipCode: fixedCepFormatted || undefined,
          city: officialCity,
          state: officialState,
          microarea: contact.microarea || DEFAULT_MICROAREA,
          residenceType: 'Casa',
          ownership: 'Próprio',
          waterSupply: 'Rede Encanada',
          sanitation: 'Rede Pública',
          garbageCollection: 'Coletado',
          hasElectricity: true,
          hasPets: false,
          familyMembers: [],
          createdAt: getBrasiliaDateStr()
        };
        domicileMap.set(addressKey, domicile);
      }
    } else {
      domicilesUpdated++;
    }

    if (domicile) {
      // Check if member is already in family composition
      const existingMemberIdx = domicile.familyMembers.findIndex((m) => m.patientId === contact.id);

      const isHead = contact.isHeadOfHousehold || domicile.familyMembers.length === 0;
      const relationship: FamilyRelationship = contact.familyRelationship || (isHead ? 'Responsável Familiar' : 'Outro Parente');

      const newMember: DomicileMember = {
        patientId: contact.id,
        patientName: contact.name,
        relationship,
        isHeadOfHousehold: isHead,
        cns: contact.cns,
        birthDate: contactBirthDate,
        phone: contact.phone
      };

      if (existingMemberIdx >= 0) {
        domicile.familyMembers[existingMemberIdx] = newMember;
      } else {
        domicile.familyMembers.push(newMember);
      }
    }

    // Create updated contact with standardized address, company field, and domicileId
    const isUnlinked = domicile ? false : (contact.unlinkedFromDomicile || trashedKeys.has(addressKey));
    const updatedContact: GoogleContact = {
      ...contact,
      birthDate: contactBirthDate || contact.birthDate,
      address: fullFormattedAddress,
      addressNumber: finalNumber,
      addressComplement: finalComp,
      company: companyAddress, // <--- Google Contacts "Empresa" field
      domicileId: domicile ? domicile.id : undefined,
      unlinkedFromDomicile: isUnlinked,
      city: officialCity,
      state: officialState
    };

    updatedContacts.push(updatedContact);
  }

  // Resolve Responsável Familiar for all domiciles (prioritizing manual edits, then scheduled patient >= 18 oldest)
  const finalDomiciles = Array.from(domicileMap.values()).map((dom) => {
    return resolveDomicileHeadOfHousehold(dom, contacts, options.events);
  });

  // Sync head of household status back to updatedContacts
  const domicileHeadMap = new Map<string, { isHead: boolean; rel: FamilyRelationship }>();
  finalDomiciles.forEach((dom) => {
    dom.familyMembers.forEach((m) => {
      domicileHeadMap.set(m.patientId, { isHead: m.isHeadOfHousehold, rel: m.relationship });
    });
  });

  const finalContacts = updatedContacts.map((c) => {
    const headInfo = domicileHeadMap.get(c.id);
    if (headInfo) {
      return {
        ...c,
        isHeadOfHousehold: headInfo.isHead,
        familyRelationship: headInfo.rel
      };
    }
    return c;
  });

  return {
    updatedContacts: finalContacts,
    updatedDomiciles: finalDomiciles,
    summary: {
      totalContactsProcessed: contacts.length,
      cepFoundCount,
      domicilesCreated,
      domicilesUpdated,
      details
    }
  };
}
