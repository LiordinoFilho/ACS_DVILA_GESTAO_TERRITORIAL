import { GoogleContact, CalendarEvent } from '../types';

/**
 * Format a Date object to YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Add days to a given YYYY-MM-DD date or Date object
 */
export function addDays(baseDate: string | Date, days: number): string {
  const d = typeof baseDate === 'string' ? new Date(baseDate + 'T00:00:00') : new Date(baseDate);
  d.setDate(d.getDate() + days);
  return formatDateISO(d);
}

/**
 * Add months to a given YYYY-MM-DD date or Date object
 */
export function addMonths(baseDate: string | Date, months: number): string {
  const d = typeof baseDate === 'string' ? new Date(baseDate + 'T00:00:00') : new Date(baseDate);
  d.setMonth(d.getMonth() + months);
  return formatDateISO(d);
}

/**
 * Calculate detailed age and auto-classify Idoso (>=60) and Criança (<2 years / up to 1yr 11m 30d)
 */
export function calculateDetailedAge(birthDateStr?: string) {
  if (!birthDateStr) return { years: null, isElderly: false, isChildUnder2: false };
  const birth = new Date(birthDateStr + 'T00:00:00');
  if (isNaN(birth.getTime())) return { years: null, isElderly: false, isChildUnder2: false };
  const today = new Date();

  let years = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  const dayDiff = today.getDate() - birth.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    years--;
  }

  const isElderly = years >= 60;
  // Criança de 0 até 1 ano 11 meses e 30 dias (menor que 2 anos de idade)
  const isChildUnder2 = years < 2 && years >= 0;

  return { years, isElderly, isChildUnder2 };
}

/**
 * Calculate age in years
 */
export function calculateAge(birthDateStr?: string): number | null {
  return calculateDetailedAge(birthDateStr).years;
}

/**
 * Get nearest target date for annual anniversary + days offset.
 * E.g., 5 days after birth date. If that anniversary date in the current year is far in the past,
 * it returns the upcoming anniversary or the closest future date.
 */
function getAnniversaryDate(birthDateStr: string, daysOffset: number): string {
  const birth = new Date(birthDateStr + 'T00:00:00');
  if (isNaN(birth.getTime())) {
    return addDays(new Date(), daysOffset);
  }
  const today = new Date();
  let targetYear = today.getFullYear();
  
  let anniversary = new Date(targetYear, birth.getMonth(), birth.getDate());
  anniversary.setDate(anniversary.getDate() + daysOffset);

  // If already passed more than 30 days ago, set to next year's anniversary or upcoming date
  const diffDays = (today.getTime() - anniversary.getTime()) / (1000 * 3600 * 24);
  if (diffDays > 30) {
    anniversary = new Date(targetYear + 1, birth.getMonth(), birth.getDate());
    anniversary.setDate(anniversary.getDate() + daysOffset);
  }

  return formatDateISO(anniversary);
}

/**
 * Automatically generates mandatory ACS Priority Visits & Alerts for a patient
 */
export function generateAutoVisitsForPatient(
  patient: GoogleContact,
  existingEvents: CalendarEvent[] = []
): CalendarEvent[] {
  const newVisits: CalendarEvent[] = [];
  const hp = patient.healthProfile;
  const birthDateStr = patient.birthDate || '1990-01-01';
  
  // Calculate age-based automatic classifications
  const { isElderly: calcElderly, isChildUnder2: calcChild } = calculateDetailedAge(birthDateStr);
  const isElderly = hp?.isElderly || calcElderly;
  const isChild = hp?.isChildUnder2 || calcChild;
  const isBolsaFamilia = hp?.isBolsaFamilia || patient.labels.some((l) => l.toLowerCase().includes('bolsa família'));

  // Helper to prevent duplicate events for the same patient and same title/reason
  const isAlreadyScheduled = (title: string, dateStr: string) => {
    return existingEvents.some(
      (e) => e.contactId === patient.id && e.title === title && e.date === dateStr
    ) || newVisits.some(
      (e) => e.contactId === patient.id && e.title === title && e.date === dateStr
    );
  };

  const createEventObj = (
    title: string,
    dateStr: string,
    visitReason: string,
    description: string,
    eventType: 'visita' | 'alerta_consulta' | 'busca_ativa' = 'visita',
    startTime = '08:30',
    endTime = '09:30'
  ): CalendarEvent => ({
    id: `auto_${patient.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    title,
    contactId: patient.id,
    contactName: patient.name,
    domicileId: patient.domicileId,
    phone: patient.phone,
    address: patient.address || 'Endereço territorial do paciente',
    startTime,
    endTime,
    date: dateStr,
    visitReason,
    description,
    status: 'pendente',
    eventType,
    isAutoScheduled: true
  });

  // 1. IDOSO (60+ anos)
  if (isElderly) {
    const baseDate = getAnniversaryDate(birthDateStr, 5);
    // 1st Visit: 5 days after birth date
    const title = 'Visita de Acompanhamento ao Idoso';
    if (!isAlreadyScheduled(title, baseDate)) {
      newVisits.push(
        createEventObj(
          title,
          baseDate,
          'Acompanhamento do Idoso',
          'Visita periódica de acompanhamento e avaliação multidimensional da saúde do idoso (5 dias após data de nascimento).'
        )
      );
    }

    // 6-month interval recurrence (Generate 2 future visits)
    const datePlus6m = addMonths(baseDate, 6);
    if (!isAlreadyScheduled(title, datePlus6m)) {
      newVisits.push(
        createEventObj(
          title,
          datePlus6m,
          'Acompanhamento do Idoso',
          'Visita periódica semestral de acompanhamento da saúde do idoso.'
        )
      );
    }

    const datePlus12m = addMonths(baseDate, 12);
    if (!isAlreadyScheduled(title, datePlus12m)) {
      newVisits.push(
        createEventObj(
          title,
          datePlus12m,
          'Acompanhamento do Idoso',
          'Visita periódica semestral de acompanhamento da saúde do idoso.'
        )
      );
    }
  }

  // 2. RECÉM-NASCIDO / CRIANÇA (RN)
  if (isChild) {
    // 1ª Visita RN: 20 days after birth date
    const rn20Days = addDays(birthDateStr, 20);
    const rnTitle1 = '1° Visita de acompanhamento ao RN';
    if (!isAlreadyScheduled(rnTitle1, rn20Days)) {
      newVisits.push(
        createEventObj(
          rnTitle1,
          rn20Days,
          'Puericultura (Acompanhamento RN)',
          'Primeira visita de acompanhamento do recém-nascido aos 20 dias de vida (Avaliação do coto umbilical, amamentação e triagem neonatal).'
        )
      );
    }

    // 2ª Visita Criança: 6 months after birth date
    const child6Months = addMonths(birthDateStr, 6);
    const childTitle2 = '2° visita de Acompanhamento a Criança com 6 meses';
    if (!isAlreadyScheduled(childTitle2, child6Months)) {
      newVisits.push(
        createEventObj(
          childTitle2,
          child6Months,
          'Puericultura (Acompanhamento Criança)',
          'Segunda visita de acompanhamento infantil aos 6 meses (Introdução alimentar e desenvolvimento neuropsicomotor).'
        )
      );
    }

    // Pediatrician Appointment Alerts: 1m, 2m, 3m, 5m, 7m, 9m, 11m, 17m, 23m
    const pediatricMonths = [1, 2, 3, 5, 7, 9, 11, 17, 23];
    pediatricMonths.forEach((m) => {
      const alertDate = addMonths(birthDateStr, m);
      const alertTitle = `Alerta: Marcar Consulta com Pediatra (${m}º mês)`;
      if (!isAlreadyScheduled(alertTitle, alertDate)) {
        newVisits.push(
          createEventObj(
            alertTitle,
            alertDate,
            'Alerta de Consulta com Pediatra',
            `Lembrete ACS para agendar consulta de Puericultura com Pediatra para a criança no ${m}º mês de vida.`,
            'alerta_consulta',
            '08:00',
            '08:30'
          )
        );
      }
    });
  }

  // 3. DIABÉTICOS E HIPERTENSOS
  if (hp?.isDiabetic) {
    const baseDate = getAnniversaryDate(birthDateStr, 5);
    const title = 'Visita de acompanhamento ao Diabético';
    if (!isAlreadyScheduled(title, baseDate)) {
      newVisits.push(
        createEventObj(
          title,
          baseDate,
          'Controle de Diabetes (DM)',
          'Visita de acompanhamento do paciente diabético (Verificação de glicemia, uso de medicação e pé diabético).'
        )
      );
    }
    const datePlus6m = addMonths(baseDate, 6);
    if (!isAlreadyScheduled(title, datePlus6m)) {
      newVisits.push(
        createEventObj(
          title,
          datePlus6m,
          'Controle de Diabetes (DM)',
          'Visita semestral de acompanhamento do paciente diabético.'
        )
      );
    }
  }

  if (hp?.isHypertensive) {
    const baseDate = getAnniversaryDate(birthDateStr, 5);
    const title = 'Visita de Acompanhamento ao Hipertenso';
    if (!isAlreadyScheduled(title, baseDate)) {
      newVisits.push(
        createEventObj(
          title,
          baseDate,
          'Controle de Hipertensão (HAS)',
          'Visita de acompanhamento do paciente hipertenso (Aferição de Pressão Arterial e adesão ao tratamento).'
        )
      );
    }
    const datePlus6m = addMonths(baseDate, 6);
    if (!isAlreadyScheduled(title, datePlus6m)) {
      newVisits.push(
        createEventObj(
          title,
          datePlus6m,
          'Controle de Hipertensão (HAS)',
          'Visita semestral de acompanhamento do paciente hipertenso.'
        )
      );
    }
  }

  // 4. GESTANTES
  if (hp?.isPregnant) {
    const prenatalStart = hp.prenatalStartDate || formatDateISO(new Date());

    // 1ª Visita: 2 months after prenatal start
    const date1 = addMonths(prenatalStart, 2);
    const title1 = '1° Visita de Acompanhamento a Gestante';
    if (!isAlreadyScheduled(title1, date1)) {
      newVisits.push(
        createEventObj(
          title1,
          date1,
          'Acompanhamento Gestante & Pré-Natal',
          'Primeira visita de acompanhamento à gestante no 2º mês do pré-natal.'
        )
      );
    }

    // 2ª Visita: 4 months after prenatal start
    const date2 = addMonths(prenatalStart, 4);
    const title2 = '2° visita de Acompanhamento a Gestante';
    if (!isAlreadyScheduled(title2, date2)) {
      newVisits.push(
        createEventObj(
          title2,
          date2,
          'Acompanhamento Gestante & Pré-Natal',
          'Segunda visita de acompanhamento à gestante no 4º mês do pré-natal.'
        )
      );
    }

    // 3ª Visita: 6 months after prenatal start
    const date3 = addMonths(prenatalStart, 6);
    const title3 = '3° visita de Acompanhamento a Gestante';
    if (!isAlreadyScheduled(title3, date3)) {
      newVisits.push(
        createEventObj(
          title3,
          date3,
          'Acompanhamento Gestante & Pré-Natal',
          'Terceira visita de acompanhamento à gestante no 6º mês do pré-natal.'
        )
      );
    }

    // Monthly Alerts: Once per month from month 1 to month 9 starting from prenatalStartDate
    for (let m = 1; m <= 9; m++) {
      const alertDate = addMonths(prenatalStart, m);
      const alertTitle = `Alerta: Marcar Consulta Pré-Natal G.O / Médico da Família (Mês ${m})`;
      if (!isAlreadyScheduled(alertTitle, alertDate)) {
        newVisits.push(
          createEventObj(
            alertTitle,
            alertDate,
            'Alerta de Consulta Pré-Natal',
            `Lembrete ACS para agendamento de consulta médica/G.O de Pré-Natal referente ao ${m}º mês do pré-natal.`,
            'alerta_consulta',
            '08:00',
            '08:30'
          )
        );
      }
    }
  }

  // 4.5. PUÉRPERA (Pós-Parto)
  if (hp?.isPuerpera) {
    const prenatalEnd = hp.prenatalEndDate || formatDateISO(new Date());
    const puerperaDate = addDays(prenatalEnd, 20);
    const puerperaTitle = 'Visita de Acompanhamento a Puérpera';
    if (!isAlreadyScheduled(puerperaTitle, puerperaDate)) {
      newVisits.push(
        createEventObj(
          puerperaTitle,
          puerperaDate,
          'Acompanhamento de Puérpera (Pós-Parto)',
          'Visita de Acompanhamento a Puérpera agendada para 20 dias após a data de fechamento do pré-natal (Avaliação de saúde pós-parto, coto umbilical e amamentação).'
        )
      );
    }
  }

  // 5. BOLSA FAMÍLIA
  if (isBolsaFamilia) {
    const currentYear = new Date().getFullYear();
    const sem1Title = 'Busca Ativa do Bolsa Família (1º Semestre)';
    const sem2Title = 'Busca Ativa do Bolsa Família (2º Semestre)';

    // April & May (1st Semester)
    const aprilDate = `${currentYear}-04-15`;
    const mayDate = `${currentYear}-05-15`;

    if (!isAlreadyScheduled(sem1Title, aprilDate)) {
      newVisits.push(
        createEventObj(
          sem1Title,
          aprilDate,
          'Busca Ativa Bolsa Família',
          'Acompanhamento das condicionalidades de saúde do Bolsa Família (1º Semestre - Abril).',
          'busca_ativa'
        )
      );
    }
    if (!isAlreadyScheduled(sem1Title, mayDate)) {
      newVisits.push(
        createEventObj(
          sem1Title,
          mayDate,
          'Busca Ativa Bolsa Família',
          'Acompanhamento das condicionalidades de saúde do Bolsa Família (1º Semestre - Maio).',
          'busca_ativa'
        )
      );
    }

    // October & November (2nd Semester)
    const octDate = `${currentYear}-10-15`;
    const novDate = `${currentYear}-11-15`;

    if (!isAlreadyScheduled(sem2Title, octDate)) {
      newVisits.push(
        createEventObj(
          sem2Title,
          octDate,
          'Busca Ativa Bolsa Família',
          'Acompanhamento das condicionalidades de saúde do Bolsa Família (2º Semestre - Outubro).',
          'busca_ativa'
        )
      );
    }
    if (!isAlreadyScheduled(sem2Title, novDate)) {
      newVisits.push(
        createEventObj(
          sem2Title,
          novDate,
          'Busca Ativa Bolsa Família',
          'Acompanhamento das condicionalidades de saúde do Bolsa Família (2º Semestre - Novembro).',
          'busca_ativa'
        )
      );
    }
  }

  // 6. SAÚDE MENTAL - ALERTAS DE RENOVAÇÃO DE RECEITA A CADA 2 MESES (60 dias)
  if (hp?.hasMentalCondition) {
    const rxDate = hp.mentalHealthPrescriptionDate || formatDateISO(new Date());
    const medsText = (hp.mentalHealthMedications && hp.mentalHealthMedications.length > 0)
      ? hp.mentalHealthMedications.join(', ')
      : 'Medicamentos de Controle Especial';
    const linkText = hp.mentalHealthPrescriptionLink
      ? `\n🔗 Link da Receita no Drive: ${hp.mentalHealthPrescriptionLink}`
      : '';

    // Evento na data da receita / hoje para agendar consulta de acompanhamento
    const initTitle = 'Agendar Consulta - Renovação / Avaliação de Saúde Mental';
    if (!isAlreadyScheduled(initTitle, rxDate)) {
      newVisits.push(
        createEventObj(
          initTitle,
          rxDate,
          'Agendar Consulta - Saúde Mental',
          `Lembrete ACS: Agendar consulta médica / psiquiátrica para acompanhamento e renovação de receita de Saúde Mental. Medicamentos: ${medsText}.${linkText}`,
          'alerta_consulta',
          '08:00',
          '08:30'
        )
      );
    }

    // Gerar alertas de renovação a cada 2 meses de forma contínua e perpétua (sem limite de 12 meses - gerando até 120 meses / 10 anos à frente)
    for (let m = 2; m <= 120; m += 2) {
      const alertDate = addMonths(rxDate, m);
      const yearNum = Math.floor((m - 1) / 12) + 1;
      const alertTitle = `Agendar Consulta - Renovar Receita de Saúde Mental (${m}º Mês)`;
      const description = `Lembrete ACS: Vencimento da receita médica de controle especial de Saúde Mental (${m}º mês / Ano ${yearNum}). Medicamentos em uso: ${medsText}. Data de referência da receita: ${rxDate}. Validade da receita de 60 dias a vencer.${linkText}`;

      if (!isAlreadyScheduled(alertTitle, alertDate)) {
        newVisits.push(
          createEventObj(
            alertTitle,
            alertDate,
            'Agendar Consulta - Saúde Mental',
            description,
            'alerta_consulta',
            '08:00',
            '08:30'
          )
        );
      }
    }
  }

  return newVisits;
}

/**
 * Generate recurring visit events based on selected recurrence
 */
export function generateRecurringEvents(
  baseEvent: CalendarEvent,
  recurrence: 'none' | 'weekly' | 'biweekly' | 'monthly' | 'six_months' | 'yearly'
): CalendarEvent[] {
  if (recurrence === 'none') return [baseEvent];

  const events: CalendarEvent[] = [baseEvent];
  let count = 3; // default iterations
  if (recurrence === 'weekly') count = 4;
  if (recurrence === 'biweekly') count = 4;
  if (recurrence === 'monthly') count = 6;
  if (recurrence === 'six_months') count = 3;
  if (recurrence === 'yearly') count = 2;

  let currentDate = baseEvent.date;

  for (let i = 1; i < count; i++) {
    if (recurrence === 'weekly') {
      currentDate = addDays(currentDate, 7);
    } else if (recurrence === 'biweekly') {
      currentDate = addDays(currentDate, 14);
    } else if (recurrence === 'monthly') {
      currentDate = addMonths(currentDate, 1);
    } else if (recurrence === 'six_months') {
      currentDate = addMonths(currentDate, 6);
    } else if (recurrence === 'yearly') {
      currentDate = addMonths(currentDate, 12);
    }

    events.push({
      ...baseEvent,
      id: `${baseEvent.id}_rec_${i}`,
      date: currentDate,
      recurrence
    });
  }

  return events;
}
