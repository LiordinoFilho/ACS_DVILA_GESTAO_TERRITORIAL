import { GoogleContact, Domicile } from '../types';
import { downloadCSV } from './csvParser';

/**
 * Calculates age from YYYY-MM-DD birthdate string
 */
export function calculateAge(dateStr?: string): number | null {
  if (!dateStr) return null;
  const birth = new Date(dateStr);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

/**
 * Cleans street text by removing house numbers, complements, CEPs in parentheses, etc.
 * Example: "Rua. Moacir Sales Davila, 385, Casa 2 ( 6288010 )" -> "Rua. Moacir Sales Davila"
 */
export function extractCleanStreetName(raw: string): string {
  if (!raw) return 'Outro / Sem Rua Cadastrada';

  // Remove CEP in parentheses or standalone CEP format
  let str = raw.replace(/\(\s*(?:CEP:?\s*)?\d{7,8}\s*\)/gi, '');
  str = str.replace(/\bCEP:?\s*\d{5}[-.]?\d{3}\b/gi, '');

  // Remove parenthesized text e.g. (Casa 2)
  str = str.replace(/\([^)]*\)/g, '');

  // Split by comma or semicolon or newline
  const parts = str.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean);
  let firstPart = parts[0] || '';

  // If firstPart contains hyphen e.g. "Rua X - 120 - Centro", split hyphen
  if (firstPart.includes(' - ')) {
    const subParts = firstPart.split(' - ');
    firstPart = subParts[0].trim();
  }

  // Remove trailing numbers, "Nº 123", "n° 123", "#123", "S/N"
  firstPart = firstPart.replace(/(?:\b(?:nº|n°|n|num|número|#|s\/n|sn)\s*)?\d+[a-zA-Z]?.*$/i, '').trim();

  // Remove trailing punctuation
  firstPart = firstPart.replace(/[-_.,;\s]+$/, '').trim();

  if (!firstPart || firstPart.length < 2) {
    return 'Outro / Sem Rua Cadastrada';
  }

  return firstPart;
}

/**
 * Extracts normalized street name for a given contact without house numbers
 */
export function getContactStreet(contact: GoogleContact, domiciles: Domicile[]): string {
  if (contact.domicileId) {
    const dom = domiciles.find((d) => d.id === contact.domicileId);
    if (dom && dom.street && dom.street.trim()) {
      return extractCleanStreetName(dom.street.trim());
    }
  }

  if (contact.company) {
    const cleanFromCompany = extractCleanStreetName(contact.company);
    if (cleanFromCompany && cleanFromCompany !== 'Outro / Sem Rua Cadastrada') {
      return cleanFromCompany;
    }
  }

  if (contact.address) {
    const cleanFromAddr = extractCleanStreetName(contact.address);
    if (cleanFromAddr && cleanFromAddr !== 'Outro / Sem Rua Cadastrada') {
      return cleanFromAddr;
    }
  }

  return 'Outro / Sem Rua Cadastrada';
}

/**
 * Returns a sorted list of all unique street names found in domiciles and contact addresses
 */
export function getUniqueStreets(contacts: GoogleContact[], domiciles: Domicile[]): string[] {
  const streetSet = new Set<string>();

  domiciles.forEach((d) => {
    if (d.street && d.street.trim()) {
      const clean = extractCleanStreetName(d.street.trim());
      if (clean && clean !== 'Outro / Sem Rua Cadastrada') {
        streetSet.add(clean);
      }
    }
  });

  contacts.forEach((c) => {
    const st = getContactStreet(c, domiciles);
    if (st && st !== 'Outro / Sem Rua Cadastrada') {
      streetSet.add(st);
    }
  });

  return Array.from(streetSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/**
 * Formats and triggers download of a CSV file for Microsoft Excel
 */
export function exportPatientsToExcel(
  patients: GoogleContact[],
  domiciles: Domicile[],
  categoryLabel: string,
  streetFilterLabel: string
) {
  const headers = [
    'Nome do Paciente',
    'Cartao SUS (CNS)',
    'CPF',
    'Data de Nascimento',
    'Idade',
    'Genero',
    'Telefone / WhatsApp',
    'Logradouro / Rua',
    'Numero / Comp.',
    'Microarea',
    'Nome da Mae',
    'Categorias e Grupos de Saude',
    'Observacoes'
  ];

  const rows = patients.map((c) => {
    const hp = c.healthProfile;
    const street = getContactStreet(c, domiciles);
    const age = calculateAge(c.birthDate);

    const healthCategories: string[] = [];
    if (hp?.isPregnant) healthCategories.push(`Gestante (${hp.gestationalAgeWeeks || '?'} sem)`);
    if (hp?.isPuerpera) healthCategories.push('Puerpera');
    if (hp?.isHypertensive) healthCategories.push('Hipertenso (HAS)');
    if (hp?.isDiabetic) healthCategories.push('Diabetico (DM)');
    if (hp?.isInsulinDependent) healthCategories.push('InsulinoDependente');
    if (hp?.isBedridden) healthCategories.push('Acamado');
    if (hp?.isElderly) healthCategories.push('Idoso');
    if (hp?.isChildUnder2) healthCategories.push('Crianca (0-2a)');
    if (hp?.hasSpecialNeeds) healthCategories.push('PCD / Deficiencia');
    if (hp?.hasMentalCondition) healthCategories.push('Saude Mental');
    if (hp?.hasAlcoholism) healthCategories.push('Alcool');
    if (hp?.hasAsthma) healthCategories.push('Asma');
    if (hp?.hasCancer) healthCategories.push('Cancer');
    if (hp?.hasChronicDiseases) healthCategories.push('Doencas Cronicas');
    if (hp?.hasCOPD) healthCategories.push('DPOC');
    if (hp?.isBolsaFamilia) healthCategories.push('Bolsa Familia');

    return [
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.cns || '').replace(/"/g, '""')}"`,
      `"${(c.cpf || '').replace(/"/g, '""')}"`,
      `"${c.birthDate || ''}"`,
      `"${age !== null ? age + ' anos' : ''}"`,
      `"${c.gender || ''}"`,
      `"${c.phone || ''}"`,
      `"${street.replace(/"/g, '""')}"`,
      `"${(c.addressNumber || '') + (c.addressComplement ? ' ' + c.addressComplement : '')}"`,
      `"${c.microarea || ''}"`,
      `"${(c.motherName || '').replace(/"/g, '""')}"`,
      `"${healthCategories.join(', ')}"`,
      `"${(c.notes || hp?.notes || '').replace(/"/g, '""')}"`
    ];
  });

  const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const catSanitized = categoryLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const streetSanitized = streetFilterLabel.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `relatorio_eSUS_${catSanitized}_${streetSanitized}_${dateStr}.csv`;

  downloadCSV(filename, csvContent);
}
