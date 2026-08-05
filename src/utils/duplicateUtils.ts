import { GoogleContact, CalendarEvent, Domicile } from '../types';

export interface DuplicateCandidateGroup {
  id: string; // Unique ID for candidate pair/group
  key: string; // Persistent signature key for dismissal (e.g. "dup_c1_c2")
  reason: string; // Human readable reason (e.g., "CPF Idêntico", "CNS Idêntico", "Nome e Data de Nascimento Idênticos", "Nome Idêntico")
  matchScore: number; // 100 = CPF/CNS, 90 = Name+DOB, 80 = Name+Address, 70 = Same Name
  primaryContact: GoogleContact;
  secondaryContacts: GoogleContact[];
}

const DISMISSED_DUPLICATES_STORAGE_KEY = 'acs_dismissed_duplicate_keys';

export function getDismissedDuplicateKeys(): string[] {
  try {
    const saved = localStorage.getItem(DISMISSED_DUPLICATES_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao ler chaves de duplicados dispensados:', e);
  }
  return [];
}

export function saveDismissedDuplicateKeys(keys: string[]): void {
  try {
    localStorage.setItem(DISMISSED_DUPLICATES_STORAGE_KEY, JSON.stringify(keys));
  } catch (e) {
    console.error('Erro ao salvar chaves de duplicados dispensados:', e);
  }
}

export function dismissDuplicateGroup(groupKey: string): string[] {
  const current = getDismissedDuplicateKeys();
  if (!current.includes(groupKey)) {
    const updated = [...current, groupKey];
    saveDismissedDuplicateKeys(updated);
    return updated;
  }
  return current;
}

function cleanDigits(val?: string): string {
  if (!val) return '';
  return val.replace(/\D/g, '');
}

function normalizeText(val?: string): string {
  if (!val) return '';
  return val
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Finds duplicate contact candidate groups across the patient list.
 */
export function findDuplicateCandidates(
  contacts: GoogleContact[],
  dismissedKeys: string[] = getDismissedDuplicateKeys()
): DuplicateCandidateGroup[] {
  const dismissedSet = new Set(dismissedKeys);
  const candidateGroups: DuplicateCandidateGroup[] = [];

  // Used to prevent creating reciprocal duplicates (A-B and B-A)
  const processedPairs = new Set<string>();

  for (let i = 0; i < contacts.length; i++) {
    for (let j = i + 1; j < contacts.length; j++) {
      const c1 = contacts[i];
      const c2 = contacts[j];

      // Pair signature key (sorted IDs)
      const sortedIds = [c1.id, c2.id].sort();
      const pairKey = `dup_${sortedIds[0]}_${sortedIds[1]}`;

      if (dismissedSet.has(pairKey) || processedPairs.has(pairKey)) {
        continue;
      }

      let reason = '';
      let matchScore = 0;

      const cpf1 = cleanDigits(c1.cpf);
      const cpf2 = cleanDigits(c2.cpf);
      const cns1 = cleanDigits(c1.cns);
      const cns2 = cleanDigits(c2.cns);

      const name1 = normalizeText(c1.name);
      const name2 = normalizeText(c2.name);

      const dob1 = c1.birthDate?.trim();
      const dob2 = c2.birthDate?.trim();

      const mother1 = normalizeText(c1.motherName);
      const mother2 = normalizeText(c2.motherName);

      const address1 = normalizeText(c1.address);
      const address2 = normalizeText(c2.address);

      // 1. CPF match (if valid 11 digits)
      if (cpf1 && cpf2 && cpf1.length === 11 && cpf1 === cpf2) {
        reason = `CPF Idêntico (${c1.cpf})`;
        matchScore = 100;
      }
      // 2. CNS match (if valid 15 digits)
      else if (cns1 && cns2 && cns1.length === 15 && cns1 === cns2) {
        reason = `CNS Idêntico (${c1.cns})`;
        matchScore = 100;
      }
      // 3. Name + BirthDate match
      else if (name1 && name2 && name1 === name2 && dob1 && dob2 && dob1 === dob2) {
        reason = `Nome e Data de Nascimento Idênticos (${c1.name} • ${dob1})`;
        matchScore = 95;
      }
      // 4. Name + Mother Name match
      else if (name1 && name2 && name1 === name2 && mother1 && mother2 && mother1 === mother2 && mother1.length > 3) {
        reason = `Nome do Munícipe e Nome da Mãe Idênticos (${c1.name})`;
        matchScore = 90;
      }
      // 5. Name + Domicile / Address match
      else if (
        name1 &&
        name2 &&
        name1 === name2 &&
        ((c1.domicileId && c2.domicileId && c1.domicileId === c2.domicileId) ||
          (address1 && address2 && address1.length > 5 && address1 === address2))
      ) {
        reason = `Nome e Endereço/Residência Idênticos (${c1.name})`;
        matchScore = 85;
      }
      // 6. Exact Name match (only if names are full names > 6 chars)
      else if (name1 && name2 && name1 === name2 && name1.length >= 6) {
        reason = `Nome Completo Exatamente Igual (${c1.name})`;
        matchScore = 75;
      }

      if (matchScore > 0) {
        processedPairs.add(pairKey);

        // Decide primary: prefer contact with CNS/CPF, or more complete fields, or older ID
        const scoreC1 = (c1.cns ? 2 : 0) + (c1.cpf ? 2 : 0) + (c1.birthDate ? 1 : 0) + (c1.motherName ? 1 : 0) + (c1.address ? 1 : 0);
        const scoreC2 = (c2.cns ? 2 : 0) + (c2.cpf ? 2 : 0) + (c2.birthDate ? 1 : 0) + (c2.motherName ? 1 : 0) + (c2.address ? 1 : 0);

        const primary = scoreC1 >= scoreC2 ? c1 : c2;
        const secondary = scoreC1 >= scoreC2 ? c2 : c1;

        candidateGroups.push({
          id: `grp_${pairKey}`,
          key: pairKey,
          reason,
          matchScore,
          primaryContact: primary,
          secondaryContacts: [secondary]
        });
      }
    }
  }

  // Sort by match score descending
  return candidateGroups.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Intelligent field merger combining secondary contact into primary contact.
 */
export function mergeContactData(primary: GoogleContact, secondaryList: GoogleContact[]): GoogleContact {
  let merged: GoogleContact = { ...primary };

  for (const secondary of secondaryList) {
    // Fill empty fields in primary from secondary
    merged.cns = merged.cns || secondary.cns;
    merged.cpf = merged.cpf || secondary.cpf;
    merged.birthDate = merged.birthDate || secondary.birthDate;
    merged.gender = merged.gender || secondary.gender;
    merged.motherName = merged.motherName || secondary.motherName;
    merged.email = merged.email || secondary.email;
    merged.phone = merged.phone || secondary.phone;
    merged.address = merged.address || secondary.address;
    merged.addressNumber = merged.addressNumber || secondary.addressNumber;
    merged.addressComplement = merged.addressComplement || secondary.addressComplement;
    merged.city = merged.city || secondary.city;
    merged.state = merged.state || secondary.state;
    merged.microarea = merged.microarea || secondary.microarea;
    merged.domicileId = merged.domicileId || secondary.domicileId;
    merged.familyRelationship = merged.familyRelationship || secondary.familyRelationship;
    merged.avatarUrl = merged.avatarUrl || secondary.avatarUrl;
    if (merged.isHeadOfHousehold === undefined) {
      merged.isHeadOfHousehold = secondary.isHeadOfHousehold;
    }

    // Combine labels (unique union)
    const combinedLabels = Array.from(new Set([...(merged.labels || []), ...(secondary.labels || [])]));
    merged.labels = combinedLabels;

    // Combine notes (if secondary notes exist and are different)
    if (secondary.notes && secondary.notes.trim()) {
      if (!merged.notes || !merged.notes.trim()) {
        merged.notes = secondary.notes;
      } else if (!merged.notes.includes(secondary.notes.trim())) {
        merged.notes = `${merged.notes.trim()}\n[Nota de cadastro unificado]: ${secondary.notes.trim()}`;
      }
    }

    // Combine health profiles safely
    const h1 = merged.healthProfile || {};
    const h2 = secondary.healthProfile || {};

    merged.healthProfile = {
      isPregnant: Boolean(h1.isPregnant || h2.isPregnant),
      gestationalAgeWeeks: Math.max(h1.gestationalAgeWeeks || 0, h2.gestationalAgeWeeks || 0) || undefined,
      isHypertensive: Boolean(h1.isHypertensive || h2.isHypertensive),
      isDiabetic: Boolean(h1.isDiabetic || h2.isDiabetic),
      isBedridden: Boolean(h1.isBedridden || h2.isBedridden),
      isElderly: Boolean(h1.isElderly || h2.isElderly),
      isChildUnder2: Boolean(h1.isChildUnder2 || h2.isChildUnder2),
      isVaccinationUpToDate: h1.isVaccinationUpToDate ?? h2.isVaccinationUpToDate ?? true,
      hasSpecialNeeds: Boolean(h1.hasSpecialNeeds || h2.hasSpecialNeeds),
      notes: [h1.notes, h2.notes].filter(Boolean).join(' | ') || undefined
    };
  }

  return merged;
}
