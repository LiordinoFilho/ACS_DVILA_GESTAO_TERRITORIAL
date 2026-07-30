import { GoogleContact, Domicile, DomicileMember, FamilyRelationship, DEFAULT_MICROAREA } from '../types';
import { searchAddressByCEP, ViaCepResult } from '../services/apiService';

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

  // Match pattern: ", 385, Casa 2" or ", 385 - Casa 2" or "385 Casa 2" or "Nº 385"
  const parts = cleanText.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean);

  // Usually parts[0] is street name, parts[1] is number, parts[2] is complement or neighborhood
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // Check if part contains digits (house number)
    const numMatch = part.match(/(?:n[º°o]?\s*)?(\d+[a-zA-Z]?)/i);

    if (numMatch && !houseNumber) {
      // Make sure it's not a zip code or year
      const candidate = numMatch[1];
      if (candidate.length <= 5) {
        houseNumber = candidate;

        // Anything remaining in this part or next parts might be complement
        const remainingInPart = part.replace(numMatch[0], '').replace(/^[-_\s]+/, '').trim();
        if (remainingInPart) {
          complement = remainingInPart;
        } else if (i + 1 < parts.length) {
          const nextPart = parts[i + 1];
          // Check if next part is complement (not neighborhood/city)
          if (!/bairro|centro|são paulo|fortaleza|itaiçaba|ceará|brasil/i.test(nextPart)) {
            complement = nextPart;
          }
        }
        break;
      }
    }
  }

  if (!houseNumber) {
    houseNumber = 'S/N';
  }

  return { houseNumber, complement };
}

/**
 * Normalizes company name field according to user specification:
 * Company ("Empresa") = "Nome de Logradouro + Número da Casa + Complemento"
 * Example: "Rua Moacir Sales Dávila, 385, Casa 2"
 */
export function buildCompanyAddressString(logradouro: string, houseNumber: string, complement?: string): string {
  const cleanLogradouro = (logradouro || '').trim().replace(/^Rua\.\s*/i, 'Rua ');
  const cleanNumber = (houseNumber || 'S/N').trim();
  const cleanComp = (complement || '').trim();

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
 * Runs complete CEP normalization, ViaCEP lookup, company field update,
 * and automatic Household/Domicile grouping on a list of contacts.
 */
export async function processAndGroupContactsByCEP(
  contacts: GoogleContact[],
  existingDomiciles: Domicile[]
): Promise<ProcessResult> {
  const updatedContacts: GoogleContact[] = [];
  const domicileMap = new Map<string, Domicile>();
  const details: string[] = [];

  // Index existing domiciles by their normalized address key
  existingDomiciles.forEach((dom) => {
    const key = generateDomicileAddressKey(dom.street, dom.number, dom.complement);
    domicileMap.set(key, { ...dom, familyMembers: [...dom.familyMembers] });
  });

  let cepFoundCount = 0;
  let domicilesCreated = 0;
  let domicilesUpdated = 0;

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
    const finalComp = contact.addressComplement || complement;

    if (cepInfo) {
      cepFoundCount++;
      const { fixedCep, rawCep } = cepInfo;
      fixedCepFormatted = fixedCep.length === 8 ? `${fixedCep.substring(0, 5)}-${fixedCep.substring(5)}` : fixedCep;

      // Query ViaCEP API
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
        // Fallback to parsed logradouro if ViaCEP search returned empty
        const parsedLog = fullAddressText.split(',')[0]?.replace(/\(\s*\d+\s*\)/g, '').trim() || 'Logradouro Territorial';
        officialLogradouro = parsedLog;
        details.push(`⚠️ ${contact.name}: CEP ${fixedCep} não retornou logradouro via API. Usado: ${parsedLog}`);
      }
    } else {
      // Fallback if no CEP found in address
      const parsedLog = fullAddressText.split(',')[0]?.replace(/\(\s*\d+\s*\)/g, '').trim() || 'Logradouro Territorial';
      officialLogradouro = parsedLog;
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
        createdAt: new Date().toISOString().split('T')[0]
      };
      domicileMap.set(addressKey, domicile);
    } else {
      domicilesUpdated++;
    }

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
      birthDate: contact.birthDate,
      phone: contact.phone
    };

    if (existingMemberIdx >= 0) {
      domicile.familyMembers[existingMemberIdx] = newMember;
    } else {
      domicile.familyMembers.push(newMember);
    }

    // Create updated contact with standardized address, company field, and domicileId
    const updatedContact: GoogleContact = {
      ...contact,
      address: fullFormattedAddress,
      addressNumber: finalNumber,
      addressComplement: finalComp,
      company: companyAddress, // <--- Google Contacts "Empresa" field
      domicileId: domicile.id,
      city: officialCity,
      state: officialState
    };

    updatedContacts.push(updatedContact);
  }

  const finalDomiciles = Array.from(domicileMap.values());

  return {
    updatedContacts,
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
