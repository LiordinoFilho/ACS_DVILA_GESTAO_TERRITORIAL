import { GoogleContact, PatientHealthProfile, DEFAULT_MICROAREA } from '../types';
import { calculateDetailedAge } from './acsScheduler';

/**
 * Downloads a text file (CSV)
 */
export function downloadCSV(filename: string, content: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates sample CSV template for ACS Patient Import
 */
export function generateSampleCSV(): string {
  const headers = [
    'Nome',
    'CNS',
    'CPF',
    'DataNascimento',
    'Genero',
    'NomeMae',
    'Telefone',
    'Endereco',
    'Microarea',
    'Gestante',
    'DataAberturaPreNatal',
    'Puerpera',
    'DataFechamentoPreNatal',
    'Hipertenso',
    'Diabetico',
    'Acamado',
    'Idoso',
    'CriancaRN',
    'BolsaFamilia',
    'PCD'
  ];

  const rows = [
    [
      'Ana Maria de Souza',
      '700123456789012',
      '123.456.789-00',
      '1995-03-15',
      'F',
      'Juliana de Souza',
      '(11) 98765-4321',
      'Rua das Flores, 120 - Centro',
      'Microárea 01',
      'Sim',
      '2026-05-10',
      'Não',
      '',
      'Não',
      'Não',
      'Não',
      'Não',
      'Não',
      'Sim',
      'Não'
    ],
    [
      'Benedito Ruy Barbosa',
      '700987654321098',
      '234.567.890-11',
      '1954-08-20',
      'M',
      'Maria Barbosa',
      '(11) 97654-3210',
      'Av. Principal, 450 - Bairro Alto',
      'Microárea 01',
      'Não',
      '',
      'Não',
      '',
      'Sim',
      'Sim',
      'Não',
      'Sim',
      'Não',
      'Não',
      'Não'
    ],
    [
      'Carla Mendes (Puérpera)',
      '700888999000111',
      '456.789.012-33',
      '1998-11-05',
      'F',
      'Marta Mendes',
      '(11) 96543-2109',
      'Rua das Palmeiras, 88 - Centro',
      'Microárea 01',
      'Não',
      '',
      'Sim',
      '2026-07-01',
      'Não',
      'Não',
      'Não',
      'Não',
      'Não',
      'Sim',
      'Não'
    ]
  ];

  return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
}

/**
 * Parses raw CSV content into GoogleContact patient objects
 */
export function parsePatientsCSV(csvText: string): GoogleContact[] {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Detect delimiter (semi-colon or comma)
  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') ? ';' : ',';

  const cleanHeader = (h: string) =>
    h
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  const headers = headerLine.split(delimiter).map(cleanHeader);

  const parsedPatients: GoogleContact[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(delimiter).map((col) => col.trim().replace(/^["']|["']$/g, ''));
    if (row.length === 0 || !row[0]) continue;

    let name = '';
    let cns = '';
    let cpf = '';
    let birthDate = '1990-01-01';
    let gender: 'M' | 'F' | 'Outro' = 'F';
    let motherName = '';
    let phone = '';
    let address = '';
    let microarea = DEFAULT_MICROAREA;
    let isPregnant = false;
    let prenatalStartDate = '';
    let isPuerpera = false;
    let prenatalEndDate = '';
    let isHypertensive = false;
    let isDiabetic = false;
    let isBedridden = false;
    let isElderly = false;
    let isChildUnder2 = false;
    let isBolsaFamilia = false;
    let hasSpecialNeeds = false;

    headers.forEach((h, idx) => {
      const val = row[idx] || '';
      const isTrue = ['sim', 's', 'true', '1', 'yes'].includes(val.toLowerCase());

      if (h.includes('nome') && !h.includes('mae')) name = val;
      if (h === 'cns' || h.includes('cartao')) cns = val;
      if (h === 'cpf') cpf = val;
      if (h.includes('nasc') || h.includes('birth')) {
        if (val) {
          // Normalize DD/MM/YYYY to YYYY-MM-DD if needed
          if (val.includes('/')) {
            const parts = val.split('/');
            if (parts.length === 3) {
              birthDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          } else {
            birthDate = val;
          }
        }
      }
      if (h.includes('genero') || h.includes('sexo')) {
        const g = val.toUpperCase();
        if (g.startsWith('M')) gender = 'M';
        else if (g.startsWith('F')) gender = 'F';
        else gender = 'Outro';
      }
      if (h.includes('mae')) motherName = val;
      if (h.includes('tel') || h.includes('cel')) phone = val;
      if (h.includes('end') || h.includes('rua') || h.includes('logradouro')) address = val;
      if (h.includes('micro')) microarea = val || DEFAULT_MICROAREA;
      if (h.includes('preg') || h.includes('gestante') || h.includes('gravida')) isPregnant = isTrue;
      if (h.includes('puerpera') || h.includes('posparto')) isPuerpera = isTrue;
      if (h.includes('fechamentoprenatal') || h.includes('dataparto') || h.includes('parto')) {
        if (val) {
          if (val.includes('/')) {
            const parts = val.split('/');
            if (parts.length === 3) {
              prenatalEndDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          } else {
            prenatalEndDate = val;
          }
        }
      }
      if (h.includes('prenatal') || h.includes('abertura')) {
        if (val) {
          if (val.includes('/')) {
            const parts = val.split('/');
            if (parts.length === 3) {
              prenatalStartDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          } else {
            prenatalStartDate = val;
          }
        }
      }
      if (h.includes('hiperten') || h === 'has') isHypertensive = isTrue;
      if (h.includes('diabet') || h === 'dm') isDiabetic = isTrue;
      if (h.includes('acamad')) isBedridden = isTrue;
      if (h.includes('idoso')) isElderly = isTrue;
      if (h.includes('crianca') || h.includes('rn')) isChildUnder2 = isTrue;
      if (h.includes('bolsa') || h.includes('familia')) isBolsaFamilia = isTrue;
      if (h.includes('pcd') || h.includes('defic')) hasSpecialNeeds = isTrue;
    });

    if (!name) continue;

    // Automatic Classification according to birthDate
    const { isElderly: autoElderly, isChildUnder2: autoChild } = calculateDetailedAge(birthDate);
    if (autoElderly) isElderly = true;
    if (autoChild) isChildUnder2 = true;

    const labels = ['Google Contatos', microarea];
    if (isPregnant) labels.push('Gestante');
    if (isPuerpera) labels.push('Puérpera');
    if (isHypertensive) labels.push('Hipertenso');
    if (isDiabetic) labels.push('Diabético');
    if (isBedridden) labels.push('Acamado');
    if (isElderly) labels.push('Idoso');
    if (isChildUnder2) labels.push('Criança (0-2a)');
    if (isBolsaFamilia) labels.push('Bolsa Família');

    const healthProfile: PatientHealthProfile = {
      isPregnant,
      prenatalStartDate: isPregnant ? prenatalStartDate : undefined,
      isPuerpera,
      prenatalEndDate: isPuerpera ? prenatalEndDate : undefined,
      isHypertensive,
      isDiabetic,
      isBedridden,
      isElderly,
      isChildUnder2,
      isBolsaFamilia,
      hasSpecialNeeds,
      isVaccinationUpToDate: true
    };

    parsedPatients.push({
      id: `cnt_csv_${Date.now()}_${i}`,
      name,
      cns,
      cpf,
      birthDate,
      gender,
      motherName,
      phone,
      address: address || 'Endereço Territorial Cadastrado',
      microarea,
      labels,
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`,
      healthProfile
    });
  }

  return parsedPatients;
}
