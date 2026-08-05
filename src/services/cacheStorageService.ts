import { Domicile, GoogleContact, CalendarEvent, TrashItem } from '../types';
import { INITIAL_CONTACTS, INITIAL_DOMICILES, getInitialEvents } from '../mockData';

const DB_NAME = 'ACS_DVila_CacheDB';
const DB_VERSION = 1;
const STORE_NAME = 'acs_data_store';

interface RAMCacheData {
  domiciles: Domicile[];
  contacts: GoogleContact[];
  events: CalendarEvent[];
  trashItems: TrashItem[];
  lastSavedAt: string;
}

// In-Memory RAM Singleton Cache
let ramCache: RAMCacheData | null = null;

// IndexedDB Helper
function openIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (event: any) => resolve(event.target.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveToIndexedDB(key: string, value: any): Promise<boolean> {
  try {
    const db = await openIDB();
    if (!db) return false;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

async function loadFromIndexedDB<T>(key: string): Promise<T | null> {
  try {
    const db = await openIDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

let diskSaveTimeout: any = null;
let serverSaveTimeout: any = null;
let driveSaveTimeout: any = null;

/**
 * Save data across all layers:
 * Layer 1: In-Memory RAM Cache (Instant - 0ms)
 * Layer 2: Local Storage & IndexedDB (Debounced to prevent UI lag during typing)
 * Layer 3: Servidor Local / Cloud Cache Backup (Throttled background fetch)
 * Layer 4: Google Drive (Auto-synced to user's Drive folder in background)
 */
export async function saveAllAppData(
  domiciles: Domicile[],
  contacts: GoogleContact[],
  events: CalendarEvent[],
  trashItems: TrashItem[] = [],
  immediate = false
): Promise<void> {
  const timestamp = new Date().toISOString();

  // 1. Instant Save in RAM Memory Cache (0ms latency, zero UI blocking)
  ramCache = {
    domiciles,
    contacts,
    events,
    trashItems,
    lastSavedAt: timestamp
  };

  const performDiskSave = () => {
    try {
      localStorage.setItem('acs_domiciles', JSON.stringify(domiciles));
      localStorage.setItem('acs_patients', JSON.stringify(contacts));
      localStorage.setItem('acs_visits', JSON.stringify(events));
      localStorage.setItem('acs_trash_items', JSON.stringify(trashItems));
      localStorage.setItem('acs_cache_last_saved', timestamp);
    } catch (e) {
      console.warn('LocalStorage quota warning:', e);
    }

    saveToIndexedDB('domiciles', domiciles);
    saveToIndexedDB('contacts', contacts);
    saveToIndexedDB('events', events);
    saveToIndexedDB('trashItems', trashItems);
  };

  const performServerSave = () => {
    try {
      fetch('/api/cache/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domiciles,
          contacts,
          events,
          trashItems,
          timestamp
        })
      }).catch(() => {});
    } catch {}
  };

  const performDriveSave = () => {
    try {
      fetch('/api/drive/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: '2.0',
          createdAt: new Date().toISOString(),
          appName: "ACS D'Vila Gestão Territorial",
          summary: {
            domicilesCount: domiciles.length,
            patientsCount: contacts.length,
            visitsCount: events.length
          },
          data: {
            domiciles,
            contacts,
            events,
            trashItems
          }
        })
      }).catch(() => {});
    } catch {}
  };

  if (immediate) {
    if (diskSaveTimeout) clearTimeout(diskSaveTimeout);
    if (serverSaveTimeout) clearTimeout(serverSaveTimeout);
    if (driveSaveTimeout) clearTimeout(driveSaveTimeout);
    performDiskSave();
    performServerSave();
    performDriveSave();
  } else {
    if (diskSaveTimeout) clearTimeout(diskSaveTimeout);
    diskSaveTimeout = setTimeout(performDiskSave, 1000);

    if (serverSaveTimeout) clearTimeout(serverSaveTimeout);
    serverSaveTimeout = setTimeout(performServerSave, 5000);

    if (driveSaveTimeout) clearTimeout(driveSaveTimeout);
    driveSaveTimeout = setTimeout(performDriveSave, 10000);
  }
}

/**
 * Loads data seamlessly from RAM -> LocalStorage -> IndexedDB -> Server Cache -> Mock Defaults
 */
export async function loadAllAppData(): Promise<{
  domiciles: Domicile[];
  contacts: GoogleContact[];
  events: CalendarEvent[];
  trashItems: TrashItem[];
  source: 'RAM' | 'LocalStorage' | 'IndexedDB' | 'ServerCache' | 'GoogleDrive' | 'MockDefaults';
}> {
  // 1. Check RAM Cache
  if (ramCache) {
    return {
      domiciles: ramCache.domiciles,
      contacts: ramCache.contacts,
      events: ramCache.events,
      trashItems: ramCache.trashItems,
      source: 'RAM'
    };
  }

  // 2. Check LocalStorage
  try {
    const domStr = localStorage.getItem('acs_domiciles');
    const patStr = localStorage.getItem('acs_patients');
    const visStr = localStorage.getItem('acs_visits');
    const trsStr = localStorage.getItem('acs_trash_items');

    if (domStr || patStr || visStr) {
      const domiciles: Domicile[] = domStr ? JSON.parse(domStr) : INITIAL_DOMICILES;
      const contacts: GoogleContact[] = patStr ? JSON.parse(patStr) : INITIAL_CONTACTS;
      const events: CalendarEvent[] = visStr ? JSON.parse(visStr) : getInitialEvents();
      const trashItems: TrashItem[] = trsStr ? JSON.parse(trsStr) : [];

      // Hydrate RAM cache
      ramCache = { domiciles, contacts, events, trashItems, lastSavedAt: new Date().toISOString() };

      return { domiciles, contacts, events, trashItems, source: 'LocalStorage' };
    }
  } catch (e) {
    console.warn('Error reading from LocalStorage cache:', e);
  }

  // 3. Check IndexedDB
  try {
    const idbDomiciles = await loadFromIndexedDB<Domicile[]>('domiciles');
    const idbContacts = await loadFromIndexedDB<GoogleContact[]>('contacts');
    const idbEvents = await loadFromIndexedDB<CalendarEvent[]>('events');
    const idbTrash = await loadFromIndexedDB<TrashItem[]>('trashItems');

    if (idbDomiciles || idbContacts || idbEvents) {
      const domiciles = idbDomiciles || INITIAL_DOMICILES;
      const contacts = idbContacts || INITIAL_CONTACTS;
      const events = idbEvents || getInitialEvents();
      const trashItems = idbTrash || [];

      // Hydrate RAM cache and LocalStorage
      ramCache = { domiciles, contacts, events, trashItems, lastSavedAt: new Date().toISOString() };
      saveAllAppData(domiciles, contacts, events, trashItems);

      return { domiciles, contacts, events, trashItems, source: 'IndexedDB' };
    }
  } catch (e) {
    console.warn('Error reading from IndexedDB:', e);
  }

  // 4. Check Server Cache File
  try {
    const res = await fetch('/api/cache/backup');
    if (res.ok) {
      const body = await res.json();
      if (body.success && body.data) {
        const domiciles: Domicile[] = body.data.domiciles || INITIAL_DOMICILES;
        const contacts: GoogleContact[] = body.data.contacts || INITIAL_CONTACTS;
        const events: CalendarEvent[] = body.data.events || getInitialEvents();
        const trashItems: TrashItem[] = body.data.trashItems || [];

        // Hydrate RAM cache and Local Storage
        ramCache = { domiciles, contacts, events, trashItems, lastSavedAt: new Date().toISOString() };
        saveAllAppData(domiciles, contacts, events, trashItems);

        return { domiciles, contacts, events, trashItems, source: 'ServerCache' };
      }
    }
  } catch (e) {
    console.warn('Error reading server cache backup:', e);
  }

  // 5. Check Google Drive Automatic Cloud Backup
  try {
    const driveRes = await fetch('/api/drive/backup');
    if (driveRes.ok) {
      const driveBody = await driveRes.json();
      if (driveBody.success && driveBody.data) {
        const dataSec = driveBody.data.data || driveBody.data;
        const domiciles: Domicile[] = Array.isArray(dataSec.domiciles) ? dataSec.domiciles : INITIAL_DOMICILES;
        const contacts: GoogleContact[] = Array.isArray(dataSec.contacts) ? dataSec.contacts : INITIAL_CONTACTS;
        const events: CalendarEvent[] = Array.isArray(dataSec.events) ? dataSec.events : getInitialEvents();
        const trashItems: TrashItem[] = Array.isArray(dataSec.trashItems) ? dataSec.trashItems : [];

        // Hydrate RAM cache and Local Storage
        ramCache = { domiciles, contacts, events, trashItems, lastSavedAt: new Date().toISOString() };
        saveAllAppData(domiciles, contacts, events, trashItems);

        return { domiciles, contacts, events, trashItems, source: 'GoogleDrive' };
      }
    }
  } catch (e) {
    console.warn('Error reading Google Drive backup:', e);
  }

  // 6. Fallback to Initial Mock Defaults
  const domiciles = INITIAL_DOMICILES;
  const contacts = INITIAL_CONTACTS;
  const events = getInitialEvents();
  const trashItems: TrashItem[] = [];

  ramCache = { domiciles, contacts, events, trashItems, lastSavedAt: new Date().toISOString() };
  saveAllAppData(domiciles, contacts, events, trashItems);

  return { domiciles, contacts, events, trashItems, source: 'MockDefaults' };
}

/**
 * Returns current RAM Cache snapshot if available
 */
export function getRAMCacheSnapshot(): RAMCacheData | null {
  return ramCache;
}
