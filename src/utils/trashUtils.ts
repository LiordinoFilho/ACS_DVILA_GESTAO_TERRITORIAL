import { GoogleContact, Domicile, CalendarEvent, TrashItem, TrashItemType, TrashRetentionDays } from '../types';

const TRASH_STORAGE_KEY = 'acs_trash_items';
const TRASH_RETENTION_KEY = 'acs_trash_retention_days';

export function getSavedTrashRetentionDays(): TrashRetentionDays {
  try {
    const saved = localStorage.getItem(TRASH_RETENTION_KEY);
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if ([0, 7, 15, 30, 60, 90].includes(parsed)) {
        return parsed as TrashRetentionDays;
      }
    }
  } catch (e) {
    console.error('Error reading trash retention days:', e);
  }
  return 30; // Default: 30 days retention
}

export function saveTrashRetentionDays(days: TrashRetentionDays): void {
  try {
    localStorage.setItem(TRASH_RETENTION_KEY, days.toString());
  } catch (e) {
    console.error('Error saving trash retention days:', e);
  }
}

export function getSavedTrashItems(): TrashItem[] {
  try {
    const saved = localStorage.getItem(TRASH_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading trash items:', e);
  }
  return [];
}

export function saveTrashItems(items: TrashItem[]): void {
  try {
    localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving trash items:', e);
  }
}

/**
  Purges items that have exceeded the retention period threshold.
 */
export function purgeExpiredTrashItems(items: TrashItem[], retentionDays: TrashRetentionDays): TrashItem[] {
  if (retentionDays <= 0) {
    return items; // 0 = Nunca
  }

  const now = Date.now();
  const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;

  return items.filter((item) => {
    const deletedTime = new Date(item.deletedAt).getTime();
    if (isNaN(deletedTime)) return true;
    const ageMs = now - deletedTime;
    return ageMs < maxAgeMs;
  });
}

/**
 * Creates a TrashItem from a deleted patient/contact
 */
export function createTrashItemFromContact(contact: GoogleContact): TrashItem {
  return {
    id: `trash_contact_${contact.id}_${Date.now()}`,
    type: 'patient',
    deletedAt: new Date().toISOString(),
    originalData: contact,
    title: contact.name || 'Munícipe Sem Nome',
    subtitle: `${contact.microarea || 'Sem Microárea'} • ${contact.phone || contact.cpf || 'Sem telefone/CPF'}`
  };
}

/**
 * Creates a TrashItem from a deleted domicile
 */
export function createTrashItemFromDomicile(domicile: Domicile): TrashItem {
  const membersCount = domicile.familyMembers?.length || 0;
  return {
    id: `trash_domicile_${domicile.id}_${Date.now()}`,
    type: 'domicile',
    deletedAt: new Date().toISOString(),
    originalData: domicile,
    title: `${domicile.street}, ${domicile.number}`,
    subtitle: `${domicile.neighborhood || 'Bairro'} • ${domicile.microarea || 'Sem Microárea'} (${membersCount} ${membersCount === 1 ? 'membro' : 'membros'})`
  };
}

/**
 * Creates a TrashItem from a deleted calendar/visit event
 */
export function createTrashItemFromEvent(event: CalendarEvent): TrashItem {
  return {
    id: `trash_event_${event.id}_${Date.now()}`,
    type: 'event',
    deletedAt: new Date().toISOString(),
    originalData: event,
    title: event.title || 'Visita Domiciliar',
    subtitle: `Data: ${event.date || 'Sem data'} • Horário: ${event.startTime || ''} - ${event.endTime || ''} (${event.address || ''})`
  };
}
