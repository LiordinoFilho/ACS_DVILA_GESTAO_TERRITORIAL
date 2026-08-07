import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleContact, CalendarEvent, Domicile, DomicileMember, UserProfile, VisitStatus, MICROAREAS, DEFAULT_MICROAREA, setDefaultMicroarea, TrashItem, TrashRetentionDays } from './types';
import { INITIAL_CONTACTS, INITIAL_DOMICILES, getInitialEvents } from './mockData';
import { Header } from './components/Header';
import { DailyAgenda } from './components/DailyAgenda';
import { DomicileManager } from './components/DomicileManager';
import { PatientManager } from './components/PatientManager';
import { RouteMap } from './components/RouteMap';
import { MetricsOverview } from './components/MetricsOverview';
import { LoginScreen } from './components/LoginScreen';
import { LGPDModal } from './components/LGPDModal';
import { SecurityAndBackupModal } from './components/SecurityAndBackupModal';
import { PinLockModal } from './components/PinLockModal';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { TrashModal } from './components/TrashModal';
import { DuplicateMergerModal } from './components/DuplicateMergerModal';
import { GeminiAssistantModal } from './components/GeminiAssistantModal';
import { Bot } from 'lucide-react';
import { BottomNavDock } from './components/BottomNavDock';
import { getSavedThemeId, saveThemeId, getThemeById, ThemeId } from './utils/themeUtils';
import {
  findDuplicateCandidates,
  getDismissedDuplicateKeys,
  dismissDuplicateGroup,
  mergeContactData,
  DuplicateCandidateGroup
} from './utils/duplicateUtils';
import {
  getSavedTrashItems,
  saveTrashItems,
  getSavedTrashRetentionDays,
  saveTrashRetentionDays,
  purgeExpiredTrashItems,
  createTrashItemFromContact,
  createTrashItemFromDomicile,
  createTrashItemFromEvent
} from './utils/trashUtils';
import { initAuth, googleSignIn, logoutFirebase, getAccessToken } from './lib/firebaseAuth';
import { processAndGroupContactsByCEP, generateDomicileAddressKey, extractBirthDateFromNotes } from './utils/domicileGroupUtils';
import { getContactStreet } from './utils/exportUtils';
import { getBrasiliaDateStr } from './utils/dateUtils';
import { saveAllAppData, loadAllAppData } from './services/cacheStorageService';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { Sparkles, ShieldAlert, LogIn, CheckCircle2, WifiOff, Wifi } from 'lucide-react';

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Google-Tokens'] = JSON.stringify({ access_token: token });
  }
  return headers;
};

export default function App() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return getBrasiliaDateStr();
  });

  const [activeTab, setActiveTab] = useState<'agenda' | 'domiciles' | 'patients' | 'route' | 'metrics'>('agenda');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState<boolean>(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<{ show: boolean; message: string; subtext?: string } | null>(null);
  const [isTrashOpen, setIsTrashOpen] = useState<boolean>(false);
  const [isDuplicateMergerOpen, setIsDuplicateMergerOpen] = useState<boolean>(false);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState<boolean>(false);
  const [dismissedDuplicateKeys, setDismissedDuplicateKeys] = useState<string[]>(() => getDismissedDuplicateKeys());
  const [trashRetentionDays, setTrashRetentionDays] = useState<TrashRetentionDays>(getSavedTrashRetentionDays);
  const [trashItems, setTrashItems] = useState<TrashItem[]>(() => {
    const saved = getSavedTrashItems();
    return purgeExpiredTrashItems(saved, getSavedTrashRetentionDays());
  });
  const [currentThemeId, setCurrentThemeId] = useState<ThemeId>(getSavedThemeId);
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(() => {
    const saved = localStorage.getItem('acs_mobile_frame');
    return saved !== null ? saved === 'true' : false;
  });
  const [isLoginScreenVisible, setIsLoginScreenVisible] = useState<boolean>(true);
  const [isGoogleTokenExpired, setIsGoogleTokenExpired] = useState<boolean>(false);

  // LGPD Acceptance state
  const [isLGPDAccepted, setIsLGPDAccepted] = useState<boolean>(() => {
    return localStorage.getItem('acs_lgpd_accepted') === 'true';
  });

  // App PIN Security state
  const [appPin, setAppPin] = useState<string | null>(() => {
    return localStorage.getItem('acs_app_pin');
  });
  const [isPinLocked, setIsPinLocked] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('acs_app_pin'));
  });

  // User State
  const [user, setUser] = useState<UserProfile>({
    name: 'Agente Comunitário de Saúde (ACS)',
    email: 'acs.territorio@saude.gov.br',
    isAuthenticated: false,
    isDemo: true
  });

  // Local Storage Persistent States for ACS Data
  const [domiciles, setDomiciles] = useState<Domicile[]>(() => {
    const saved = localStorage.getItem('acs_domiciles');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved domiciles:', e);
      }
    }
    return INITIAL_DOMICILES;
  });

  const [contacts, setContacts] = useState<GoogleContact[]>(() => {
    const saved = localStorage.getItem('acs_patients');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved patients:', e);
      }
    }
    return INITIAL_CONTACTS;
  });

  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('acs_visits');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved visits:', e);
      }
    }
    return getInitialEvents();
  });

  const candidateDuplicateGroups = React.useMemo(() => {
    return findDuplicateCandidates(contacts, dismissedDuplicateKeys);
  }, [contacts, dismissedDuplicateKeys]);

  const isHydratedRef = useRef(false);

  // Startup background hydration check from IndexedDB or Server Backup if needed
  useEffect(() => {
    loadAllAppData().then(({ domiciles: loadedDom, contacts: loadedCont, events: loadedEv, trashItems: loadedTrash, source }) => {
      if (source === 'IndexedDB' || source === 'ServerCache') {
        setDomiciles(loadedDom);
        setContacts(loadedCont);
        setEvents(loadedEv);
        setTrashItems(loadedTrash);
      }
      isHydratedRef.current = true;
    });
  }, []);

  // Safe unified persistence: Writes across RAM Cache, LocalStorage, IndexedDB and Server Backup File
  useEffect(() => {
    if (!isHydratedRef.current) return;
    saveAllAppData(domiciles, contacts, events, trashItems);
  }, [domiciles, contacts, events, trashItems]);

  // Network connectivity state listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const purged = purgeExpiredTrashItems(trashItems, trashRetentionDays);
    saveTrashItems(purged);
  }, [trashItems, trashRetentionDays]);

  // Migration effect to convert legacy microareas to circle emoji versions
  useEffect(() => {
    const validMicroareas = new Set<string>(MICROAREAS);

    setContacts((prevContacts) => {
      let changed = false;
      const updated = prevContacts.map((c) => {
        let ma = c.microarea || '';
        if (ma.includes('Rosa 🩷')) ma = ma.replace('Rosa 🩷', 'Rosa 🔴');
        if (ma.includes('Cinza 🩶')) ma = ma.replace('Cinza 🩶', 'Cinza ⚫');

        if (!ma || !validMicroareas.has(ma)) {
          ma = DEFAULT_MICROAREA;
        }

        if (ma !== c.microarea) {
          changed = true;
          const newLabels = (c.labels || []).map((l) =>
            l.startsWith('Microárea') ? ma : l
          );
          return { ...c, microarea: ma, labels: newLabels };
        }
        return c;
      });
      return changed ? updated : prevContacts;
    });

    setDomiciles((prevDomiciles) => {
      let changed = false;
      const updated = prevDomiciles.map((d) => {
        let ma = d.microarea || '';
        if (ma.includes('Rosa 🩷')) ma = ma.replace('Rosa 🩷', 'Rosa 🔴');
        if (ma.includes('Cinza 🩶')) ma = ma.replace('Cinza 🩶', 'Cinza ⚫');

        if (!ma || !validMicroareas.has(ma)) {
          ma = DEFAULT_MICROAREA;
        }

        if (ma !== d.microarea) {
          changed = true;
          return { ...d, microarea: ma };
        }
        return d;
      });
      return changed ? updated : prevDomiciles;
    });
  }, []);

  // Check auth status on load
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();

      if (data.isAuthenticated) {
        setUser({
          name: data.name,
          email: data.email,
          picture: data.picture,
          isAuthenticated: true,
          isDemo: false
        });
        setIsLoginScreenVisible(false);
      } else {
        setUser((prev) => ({ ...prev, isAuthenticated: false, isDemo: true }));
      }
    } catch (err) {
      console.warn('Aviso: Verificação de autenticação off-line ou indisponível. Mantendo dados salvos localmente.');
    }
  }, []);

  const domicilesRef = useRef(domiciles);
  domicilesRef.current = domiciles;

  const trashItemsRef = useRef(trashItems);
  trashItemsRef.current = trashItems;

  // Fetch Contacts from Google API if connected (Safe Merge with Local Data)
  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch('/api/contacts', { headers: getAuthHeaders() });
      if (!res.ok) {
        console.warn('Aviso ao buscar contatos:', res.statusText || res.status);
        return;
      }
      const data = await res.json();

      if (data.authenticated) {
        setIsGoogleTokenExpired(false);
        if (data.contacts && Array.isArray(data.contacts) && data.contacts.length > 0) {
          setContacts((prevContacts) => {
            const contactMap = new Map<string, GoogleContact>();
            // Preserve all existing local contacts
            prevContacts.forEach((c) => contactMap.set(c.id, c));

            // Merge in remote contacts
            data.contacts.forEach((remote: GoogleContact) => {
              const parsedBirthDate = remote.birthDate || extractBirthDateFromNotes(remote.notes);
              const remoteWithBirthDate = { ...remote, birthDate: parsedBirthDate || remote.birthDate };

              const existing = contactMap.get(remote.id);
              if (existing) {
                contactMap.set(remote.id, {
                  ...existing,
                  ...remoteWithBirthDate,
                  birthDate: remoteWithBirthDate.birthDate || existing.birthDate,
                  microarea: existing.microarea || remote.microarea,
                  healthProfile: existing.healthProfile || remote.healthProfile,
                  domicileId: existing.domicileId || remote.domicileId,
                  unlinkedFromDomicile: existing.unlinkedFromDomicile ?? remote.unlinkedFromDomicile
                });
              } else {
                contactMap.set(remote.id, remoteWithBirthDate);
              }
            });

            return Array.from(contactMap.values());
          });
        }
      } else {
        if (getAccessToken() || localStorage.getItem('google_tokens')) {
          setIsGoogleTokenExpired(true);
        }
      }
    } catch (err) {
      console.warn('Aviso: Conexão off-line ou servidor indisponível. Mantendo contatos salvos no cache local (RAM/Disco).');
    }
  }, []);

  // Fetch Events from Google Calendar API (Safe Merge with Local Data)
  const fetchEvents = useCallback(async (dateStr: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/calendar/events?date=${dateStr}`, { headers: getAuthHeaders() });
      if (!res.ok) {
        console.warn('Aviso ao buscar agenda:', res.statusText || res.status);
        return;
      }
      const data = await res.json();

      if (data.authenticated) {
        setIsGoogleTokenExpired(false);
        if (data.events && Array.isArray(data.events)) {
          setEvents((prevEvents) => {
            const eventMap = new Map<string, CalendarEvent>();
            // Preserve ALL local events across all dates
            prevEvents.forEach((e) => eventMap.set(e.id, e));

            // Merge remote events safely
            data.events.forEach((remoteEv: CalendarEvent) => {
              const existing = eventMap.get(remoteEv.id);
              if (existing) {
                eventMap.set(remoteEv.id, {
                  ...remoteEv,
                  // Keep local status and observation if updated locally
                  status: existing.status !== 'pendente' ? existing.status : remoteEv.status,
                  observation: existing.observation !== undefined ? existing.observation : remoteEv.observation,
                  updatedAt: existing.updatedAt || remoteEv.updatedAt
                });
              } else {
                eventMap.set(remoteEv.id, remoteEv);
              }
            });

            return Array.from(eventMap.values());
          });
        }
      } else {
        if (getAccessToken() || localStorage.getItem('google_tokens')) {
          setIsGoogleTokenExpired(true);
        }
      }
    } catch (err) {
      console.warn('Aviso: Conexão off-line ou servidor indisponível. Mantendo agenda salva no cache local.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = initAuth(
      (firebaseUser, token) => {
        setUser({
          name: firebaseUser.displayName || 'Agente Comunitário de Saúde (ACS)',
          email: firebaseUser.email || 'acs.territorio@saude.gov.br',
          picture: firebaseUser.photoURL || undefined,
          isAuthenticated: true,
          isDemo: false
        });
        setIsLoginScreenVisible(false);
      },
      () => {
        checkAuth();
      }
    );

    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return () => {
      unsubscribe();
    };
  }, [checkAuth]);

  useEffect(() => {
    if (user.isAuthenticated) {
      fetchContacts();
    }
  }, [user.isAuthenticated, fetchContacts]);

  useEffect(() => {
    if (user.isAuthenticated) {
      fetchEvents(selectedDate);
    }
  }, [selectedDate, user.isAuthenticated, fetchEvents]);

  // Hash fragment listener for OAuth redirect (Implicit Flow)
  useEffect(() => {
    const parseHashToken = async () => {
      const hash = window.location.hash || window.location.search;
      if (hash && (hash.includes('access_token=') || hash.includes('token='))) {
        try {
          const params = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash);
          const accessToken = params.get('access_token');
          if (accessToken) {
            const tokenData = JSON.stringify({
              access_token: accessToken,
              created_at: Date.now()
            });
            localStorage.setItem('google_tokens', tokenData);
            window.history.replaceState(null, '', window.location.pathname);

            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', tokens: tokenData }, '*');
              setTimeout(() => window.close(), 500);
            } else {
              await checkAuth();
              await fetchContacts();
              await fetchEvents(selectedDate);
            }
          }
        } catch (e) {
          console.error('Erro ao processar token da URL:', e);
        }
      }
    };

    parseHashToken();
  }, [checkAuth, fetchContacts, fetchEvents, selectedDate]);

  // Listen for popup OAuth success
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS' || event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        if (event.data?.tokens) {
          try {
            const tokStr = typeof event.data.tokens === 'string' ? event.data.tokens : JSON.stringify(event.data.tokens);
            localStorage.setItem('google_tokens', tokStr);
          } catch (e) {}
        }
        checkAuth();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkAuth]);

  // Handle Google Login Flow via Firebase Auth SDK
  const handleConnectGoogle = async () => {
    setIsLoading(true);
    try {
      const res = await googleSignIn();
      if (res && res.user) {
        setUser({
          name: res.user.displayName || 'Agente Comunitário de Saúde (ACS)',
          email: res.user.email || 'acs.territorio@saude.gov.br',
          picture: res.user.photoURL || undefined,
          isAuthenticated: true,
          isDemo: false
        });
        setIsLoginScreenVisible(false);
        setIsGoogleTokenExpired(false);
        await fetchContacts();
        await fetchEvents(selectedDate);
      }
    } catch (err: any) {
      console.warn('Erro na conexão com Google:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutFirebase();
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser({
        name: 'Agente Comunitário de Saúde (ACS)',
        email: 'acs.territorio@saude.gov.br',
        isAuthenticated: false,
        isDemo: true
      });
      setIsLoginScreenVisible(true);
    } catch (err) {
      console.error('Erro no logout:', err);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    // 1. Force immediately saving all local state across RAM, LocalStorage, IndexedDB and Server Backup File
    await saveAllAppData(domiciles, contacts, events, trashItems, true);

    await checkAuth();
    if (user.isAuthenticated) {
      await fetchContacts();
      await fetchEvents(selectedDate);
      setSyncToast({
        show: true,
        message: 'Sincronização com Google concluída!',
        subtext: `${contacts.length} cadastros e ${events.length} visitas gravados na memória RAM, cache local e backup.`
      });
    } else {
      // Local/Demo Mode: Re-verify links and CEP auto-grouping safely
      const { updatedContacts, updatedDomiciles } = await processAndGroupContactsByCEP(contacts, domiciles, {
        autoCreateMissingDomiciles: false,
        trashItems
      });
      setContacts(updatedContacts);
      setDomiciles(updatedDomiciles);
      await saveAllAppData(updatedDomiciles, updatedContacts, events, trashItems, true);

      setSyncToast({
        show: true,
        message: 'Memória RAM & Cache Local Atualizados!',
        subtext: 'Suas modificações foram gravadas com sucesso na memória RAM, cache de disco e arquivo de backup.'
      });
    }
    setIsLoading(false);

    setTimeout(() => {
      setSyncToast(null);
    }, 4500);
  };

  // --- Domicile Handlers ---
  const handleAddDomicile = (newDom: Domicile) => {
    setDomiciles((prev) => [newDom, ...prev]);
  };

  const handleUpdateDomicile = (updatedDom: Domicile) => {
    setDomiciles((prev) => prev.map((d) => (d.id === updatedDom.id ? updatedDom : d)));

    // Sync domicile ID back to linked patients in contacts
    const memberIds = new Set(updatedDom.familyMembers.map((m) => m.patientId));
    setContacts((prev) =>
      prev.map((c) => {
        if (memberIds.has(c.id)) {
          const member = updatedDom.familyMembers.find((m) => m.patientId === c.id);
          return {
            ...c,
            domicileId: updatedDom.id,
            familyRelationship: member?.relationship,
            isHeadOfHousehold: member?.isHeadOfHousehold
          };
        }
        return c;
      })
    );
  };

  const handleDeleteDomicile = (id: string) => {
    const domToDelete = domiciles.find((d) => d.id === id);
    let domAddressKey = '';
    if (domToDelete) {
      const trashItem = createTrashItemFromDomicile(domToDelete);
      setTrashItems((prev) => [trashItem, ...prev]);
      if (domToDelete.street && domToDelete.number) {
        domAddressKey = generateDomicileAddressKey(domToDelete.street, domToDelete.number, domToDelete.complement);
      }
    }

    // Filter out deleted domicile
    setDomiciles((prev) => prev.filter((d) => d.id !== id));

    // Unlink contacts that belonged to this domicile or matching address and flag them so they don't auto-recreate the deleted domicile
    setContacts((prev) =>
      prev.map((c) => {
        const contactStreet = c.street || getContactStreet(c, domiciles);
        const contactAddrKey =
          contactStreet && c.addressNumber
            ? generateDomicileAddressKey(contactStreet, c.addressNumber, c.addressComplement)
            : '';
        if (c.domicileId === id || (domAddressKey && contactAddrKey === domAddressKey)) {
          return {
            ...c,
            domicileId: undefined,
            unlinkedFromDomicile: true
          };
        }
        return c;
      })
    );
  };

  // --- Patient Handlers ---
  const handleAddContact = async (newContact: GoogleContact) => {
    // Automatically process CEP, ViaCEP, company field ("Empresa"), and Domicile grouping
    const { updatedContacts, updatedDomiciles } = await processAndGroupContactsByCEP(
      [newContact, ...contacts],
      domiciles,
      { autoCreateMissingDomiciles: false, trashItems }
    );

    setContacts(updatedContacts);
    setDomiciles(updatedDomiciles);

    const processedNewContact = updatedContacts.find((c) => c.id === newContact.id) || newContact;

    if (user.isAuthenticated) {
      try {
        const res = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(processedNewContact)
        });
        const data = await res.json();
        if (data.success && data.contact?.id) {
          setContacts((prev) =>
            prev.map((c) => (c.id === newContact.id ? { ...c, id: data.contact.id } : c))
          );
        }
      } catch (err) {
        console.warn('Aviso ao criar contato no Google Contatos (salvo localmente no dispositivo):', err);
      }
    }
  };

  const handleUpdateContact = async (updatedContact: GoogleContact) => {
    const list = contacts.map((c) => (c.id === updatedContact.id ? updatedContact : c));
    const { updatedContacts, updatedDomiciles } = await processAndGroupContactsByCEP(
      list,
      domiciles,
      { autoCreateMissingDomiciles: false, trashItems }
    );

    setContacts(updatedContacts);
    setDomiciles(updatedDomiciles);

    const processedContact = updatedContacts.find((c) => c.id === updatedContact.id) || updatedContact;

    if (user.isAuthenticated) {
      try {
        if (processedContact.id.startsWith('people/')) {
          await fetch('/api/contacts', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(processedContact)
          });
        } else {
          const res = await fetch('/api/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(processedContact)
          });
          const data = await res.json();
          if (data.success && data.contact?.id) {
            setContacts((prev) =>
              prev.map((c) => (c.id === updatedContact.id ? { ...c, id: data.contact.id } : c))
            );
          }
        }
      } catch (err) {
        console.warn('Aviso ao atualizar contato no Google Contatos (salvo localmente no dispositivo):', err);
      }
    }
  };

  const handleDeleteContact = async (id: string) => {
    const contactToDelete = contacts.find((c) => c.id === id);
    if (contactToDelete) {
      const trashItem = createTrashItemFromContact(contactToDelete);
      setTrashItems((prev) => [trashItem, ...prev]);
    }

    setContacts((prev) => prev.filter((c) => c.id !== id));

    if (user.isAuthenticated && id.startsWith('people/')) {
      try {
        await fetch(`/api/contacts?resourceName=${encodeURIComponent(id)}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.warn('Aviso ao excluir contato no Google Contatos (removido localmente no dispositivo):', err);
      }
    }

    // Remove from domiciles and reassign head of household if needed
    setDomiciles((prev) =>
      prev.map((d) => {
        const remainingMembers = d.familyMembers.filter((m) => m.patientId !== id);
        if (remainingMembers.length === d.familyMembers.length) return d;

        const removedMemberWasHead = d.familyMembers.some((m) => m.patientId === id && m.isHeadOfHousehold);
        if (removedMemberWasHead && remainingMembers.length > 0) {
          remainingMembers[0] = {
            ...remainingMembers[0],
            isHeadOfHousehold: true,
            relationship: 'Responsável Familiar'
          };
        }

        return {
          ...d,
          familyMembers: remainingMembers
        };
      })
    );
  };

  const handleDeleteEvent = (eventId: string) => {
    const eventToDelete = events.find((e) => e.id === eventId);
    if (eventToDelete) {
      const trashItem = createTrashItemFromEvent(eventToDelete);
      setTrashItems((prev) => [trashItem, ...prev]);
    }
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  // --- Trash Handlers ---
  const handleRestoreTrashItem = (item: TrashItem) => {
    if (item.type === 'patient') {
      const restored = { ...(item.originalData as GoogleContact), unlinkedFromDomicile: false };
      setContacts((prev) => (prev.some((c) => c.id === restored.id) ? prev : [restored, ...prev]));

      if (restored.domicileId) {
        setDomiciles((prev) =>
          prev.map((d) => {
            if (d.id === restored.domicileId) {
              const exists = d.familyMembers.some((m) => m.patientId === restored.id);
              if (!exists) {
                const isHead = d.familyMembers.length === 0 || !!restored.isHeadOfHousehold;
                const newMember: DomicileMember = {
                  patientId: restored.id,
                  patientName: restored.name,
                  relationship: restored.familyRelationship || (isHead ? 'Responsável Familiar' : 'Outro Parente'),
                  isHeadOfHousehold: isHead,
                  cns: restored.cns,
                  birthDate: restored.birthDate,
                  phone: restored.phone
                };
                return { ...d, familyMembers: [...d.familyMembers, newMember] };
              }
            }
            return d;
          })
        );
      }
    } else if (item.type === 'domicile') {
      const restoredDom = item.originalData as Domicile;
      setDomiciles((prev) => (prev.some((d) => d.id === restoredDom.id) ? prev : [restoredDom, ...prev]));

      const memberIds = new Set(restoredDom.familyMembers.map((m) => m.patientId));
      setContacts((prev) =>
        prev.map((c) => {
          if (memberIds.has(c.id)) {
            const member = restoredDom.familyMembers.find((m) => m.patientId === c.id);
            return {
              ...c,
              domicileId: restoredDom.id,
              unlinkedFromDomicile: false,
              familyRelationship: member?.relationship,
              isHeadOfHousehold: member?.isHeadOfHousehold
            };
          }
          return c;
        })
      );
    } else if (item.type === 'event') {
      const restored = item.originalData as CalendarEvent;
      setEvents((prev) => (prev.some((e) => e.id === restored.id) ? prev : [restored, ...prev]));
    }
    setTrashItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const handleRestoreAllTrashItems = () => {
    trashItems.forEach((item) => {
      handleRestoreTrashItem(item);
    });
    setTrashItems([]);
  };

  const handlePermanentlyDeleteTrashItem = (id: string) => {
    setTrashItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleEmptyTrash = () => {
    setTrashItems([]);
  };

  const handleChangeRetentionDays = (days: TrashRetentionDays) => {
    setTrashRetentionDays(days);
    saveTrashRetentionDays(days);
    setTrashItems((prev) => purgeExpiredTrashItems(prev, days));
  };

  const handleConfirmMergeDuplicates = useCallback(
    (groupsToMerge: { group: DuplicateCandidateGroup; mergedContact: GoogleContact }[]) => {
      if (groupsToMerge.length === 0) return;

      let updatedContacts = [...contacts];
      let updatedEvents = [...events];
      let updatedDomiciles = [...domiciles];
      let newTrashItems: TrashItem[] = [];

      groupsToMerge.forEach(({ group, mergedContact }) => {
        const primaryId = group.primaryContact.id;
        const secondaryIds = group.secondaryContacts.map((s) => s.id);
        const secondaryIdsSet = new Set(secondaryIds);

        // 1. Replace primary contact with mergedContact, remove secondary contacts
        updatedContacts = updatedContacts
          .map((c) => (c.id === primaryId ? mergedContact : c))
          .filter((c) => !secondaryIdsSet.has(c.id));

        // 2. Move secondary contacts to Trash
        group.secondaryContacts.forEach((sec) => {
          const trashItem = createTrashItemFromContact(sec);
          trashItem.subtitle = `[Unificado em ${mergedContact.name}] ${trashItem.subtitle}`;
          newTrashItems.push(trashItem);
        });

        // 3. Re-link Calendar Events
        updatedEvents = updatedEvents.map((ev) => {
          if (ev.contactId && secondaryIdsSet.has(ev.contactId)) {
            return {
              ...ev,
              contactId: primaryId,
              contactName: mergedContact.name,
              address: ev.address || mergedContact.address || ''
            };
          }
          return ev;
        });

        // 4. Re-link Domicile Members and deduplicate members
        updatedDomiciles = updatedDomiciles.map((dom) => {
          if (!dom.familyMembers || dom.familyMembers.length === 0) return dom;

          let membersChanged = false;
          const updatedMembers: DomicileMember[] = [];
          const seenPatientIds = new Set<string>();

          dom.familyMembers.forEach((member) => {
            let targetId = member.patientId;
            let targetName = member.patientName;

            if (secondaryIdsSet.has(member.patientId)) {
              targetId = primaryId;
              targetName = mergedContact.name;
              membersChanged = true;
            }

            if (!seenPatientIds.has(targetId)) {
              seenPatientIds.add(targetId);
              updatedMembers.push({
                ...member,
                patientId: targetId,
                patientName: targetName,
                cns: targetId === primaryId ? mergedContact.cns || member.cns : member.cns,
                birthDate: targetId === primaryId ? mergedContact.birthDate || member.birthDate : member.birthDate,
                phone: targetId === primaryId ? mergedContact.phone || member.phone : member.phone
              });
            } else {
              membersChanged = true;
            }
          });

          return membersChanged ? { ...dom, familyMembers: updatedMembers } : dom;
        });
      });

      setContacts(updatedContacts);
      setEvents(updatedEvents);
      setDomiciles(updatedDomiciles);

      const allTrash = [...newTrashItems, ...trashItems];
      setTrashItems(allTrash);

      // Save to RAM cache, local storage, indexedDB and background backup
      saveAllAppData(updatedDomiciles, updatedContacts, updatedEvents, allTrash);

      setSyncToast({
        show: true,
        message: 'Unificação Concluída com Sucesso! ✨',
        subtext: `${groupsToMerge.length} ${groupsToMerge.length === 1 ? 'cadastro unificado' : 'cadastros unificados'}. Histórico de visitas e cadastros domiciliares foram reatrelados ao cadastro principal.`
      });

      setIsDuplicateMergerOpen(false);
    },
    [contacts, events, domiciles, trashItems]
  );

  const handleDismissDuplicateGroup = useCallback((groupKey: string) => {
    const updatedKeys = dismissDuplicateGroup(groupKey);
    setDismissedDuplicateKeys(updatedKeys);
  }, []);

  // --- Visit Event Handlers ---
  const handleUpdateEventStatus = async (eventId: string, newStatus: VisitStatus, observation?: string) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setEvents((prev) =>
      prev.map((ev) =>
        ev.id === eventId
          ? {
              ...ev,
              status: newStatus,
              observation: observation !== undefined ? observation : ev.observation,
              updatedAt: timeStr
            }
          : ev
      )
    );

    try {
      await fetch(`/api/visits/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, observation })
      });
    } catch (err) {
      console.error('Erro ao salvar status da visita:', err);
    }
  };

  const handleAddEvent = async (newEventData: Partial<CalendarEvent>) => {
    const newEv: CalendarEvent = {
      id: `ev_${Date.now()}`,
      title: newEventData.title || 'Visita Domiciliar ACS',
      address: newEventData.address || '',
      startTime: newEventData.startTime || '09:00',
      endTime: newEventData.endTime || '18:00',
      date: selectedDate,
      visitReason: newEventData.visitReason || 'Acompanhamento de Saúde',
      description: newEventData.description || '',
      contactId: newEventData.contactId,
      contactName: newEventData.contactName,
      domicileId: newEventData.domicileId,
      phone: newEventData.phone,
      status: 'pendente'
    };

    setEvents((prev) => [...prev, newEv]);

    if (user.isAuthenticated) {
      try {
        await fetch('/api/calendar/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newEventData)
        });
      } catch (err) {
        console.error('Erro ao enviar evento ao Google Agenda:', err);
      }
    }
  };

  // Batch Event Creation
  const handleAddEventsBatch = (newEvs: CalendarEvent[]) => {
    setEvents((prev) => [...prev, ...newEvs]);
  };

  // Batch CSV Contact Import with Auto CEP & Empresa Grouping
  const handleImportContactsCSV = async (importedContacts: GoogleContact[]) => {
    const existingIds = new Set(contacts.map((c) => c.id));
    const newItems = importedContacts.filter((c) => !existingIds.has(c.id));
    const combined = [...newItems, ...contacts];

    const { updatedContacts, updatedDomiciles } = await processAndGroupContactsByCEP(
      combined,
      domiciles,
      { autoCreateMissingDomiciles: true, trashItems }
    );

    setContacts(updatedContacts);
    setDomiciles(updatedDomiciles);
  };

  // Handler to set default microarea and apply to all contacts and domiciles
  const handleApplyMicroareaToAll = async (newMicroarea: string, applyToExisting: boolean) => {
    setDefaultMicroarea(newMicroarea);

    if (!applyToExisting) return;

    setContacts((prevContacts) =>
      prevContacts.map((c) => {
        const oldLabels = c.labels || [];
        const filteredLabels = oldLabels.filter((l) => !l.startsWith('Microárea'));
        return {
          ...c,
          microarea: newMicroarea,
          labels: [newMicroarea, ...filteredLabels]
        };
      })
    );

    setDomiciles((prevDomiciles) =>
      prevDomiciles.map((d) => ({
        ...d,
        microarea: newMicroarea
      }))
    );
  };

  // Quick Schedule Actions
  const handleScheduleVisitForContact = (contact: GoogleContact) => {
    handleAddEvent({
      title: `Visita Domiciliar - ${contact.name}`,
      address: contact.address || '',
      contactId: contact.id,
      contactName: contact.name,
      phone: contact.phone,
      startTime: '09:00',
      endTime: '18:00'
    });
    setActiveTab('agenda');
  };

  const handleScheduleVisitForDomicile = (domicile: Domicile) => {
    const head = domicile.familyMembers.find((m) => m.isHeadOfHousehold) || domicile.familyMembers[0];
    handleAddEvent({
      title: `Visita Domiciliar - ${domicile.street}, ${domicile.number}`,
      address: `${domicile.street}, ${domicile.number} - ${domicile.neighborhood}`,
      domicileId: domicile.id,
      contactId: head?.patientId,
      contactName: head?.patientName,
      startTime: '09:00',
      endTime: '18:00'
    });
    setActiveTab('agenda');
  };

  const handleAcceptLGPD = () => {
    setIsLGPDAccepted(true);
    localStorage.setItem('acs_lgpd_accepted', 'true');
  };

  const handleSetAppPin = (pin: string | null) => {
    setAppPin(pin);
    if (pin) {
      localStorage.setItem('acs_app_pin', pin);
    } else {
      localStorage.removeItem('acs_app_pin');
      setIsPinLocked(false);
    }
  };

  const handleRestoreData = (newDomiciles: Domicile[], newContacts: GoogleContact[], newEvents: CalendarEvent[]) => {
    setDomiciles(newDomiciles);
    setContacts(newContacts);
    setEvents(newEvents);
    saveAllAppData(newDomiciles, newContacts, newEvents, trashItems, true);
  };

  if (isLoginScreenVisible && !user.isAuthenticated) {
    return (
      <>
        <LGPDModal
          isOpen={!isLGPDAccepted}
          onAccept={handleAcceptLGPD}
        />
        {appPin && (
          <PinLockModal
            isOpen={isPinLocked}
            correctPin={appPin}
            onUnlockSuccess={() => setIsPinLocked(false)}
          />
        )}
        <LoginScreen
          onLoginGoogle={handleConnectGoogle}
          onContinueDemo={() => setIsLoginScreenVisible(false)}
          isLoading={isLoading}
        />
      </>
    );
  }

  const handleApplyGrouping = (updatedContacts: GoogleContact[], updatedDomiciles: Domicile[]) => {
    setContacts(updatedContacts);
    setDomiciles(updatedDomiciles);

    // Synchronize addresses across all scheduled events in state
    setEvents((prevEvents) =>
      prevEvents.map((ev) => {
        let matchingContact = updatedContacts.find((c) => c.id === ev.contactId);
        if (!matchingContact && ev.contactName) {
          matchingContact = updatedContacts.find(
            (c) => c.name.toLowerCase() === ev.contactName?.toLowerCase()
          );
        }
        if (!matchingContact && ev.title) {
          const titleParts = ev.title.split(/[:\-]/);
          if (titleParts.length > 1) {
            const extractedName = titleParts[titleParts.length - 1].trim();
            if (extractedName.length >= 3) {
              matchingContact = updatedContacts.find(
                (c) => c.name.toLowerCase() === extractedName.toLowerCase() ||
                          c.name.toLowerCase().includes(extractedName.toLowerCase()) ||
                          extractedName.toLowerCase().includes(c.name.toLowerCase())
              );
            }
          }
        }

        if (matchingContact) {
          let newAddr = matchingContact.address;
          if ((!newAddr || newAddr === 'Sem endereço cadastrado' || newAddr === 'Endereço territorial do paciente') && matchingContact.domicileId) {
            const d = updatedDomiciles.find((dom) => dom.id === matchingContact?.domicileId);
            if (d) {
              const compStr = d.complement ? `, ${d.complement}` : '';
              newAddr = `${d.street}, ${d.number}${compStr} - ${d.neighborhood}`;
            }
          }
          if (newAddr && newAddr !== 'Sem endereço cadastrado') {
            return {
              ...ev,
              contactId: matchingContact.id,
              contactName: matchingContact.name,
              domicileId: matchingContact.domicileId || ev.domicileId,
              address: newAddr
            };
          }
        }
        return ev;
      })
    );
  };

  const currentTheme = getThemeById(currentThemeId);

  // Count visits for selected date
  const selectedDateVisitsCount = events.filter((e) => (e.date ? e.date === selectedDate : true)).length;

  return (
    <div className={`min-h-screen text-slate-900 font-sans antialiased selection:bg-emerald-600 selection:text-white transition-colors duration-500 ${currentTheme.bgGradient} ${isMobileFrame ? 'flex flex-col items-center justify-start py-0 sm:py-6 px-0 sm:px-4' : ''}`}>
      {/* LGPD Privacy Modal (Appears before accepting) */}
      <LGPDModal
        isOpen={!isLGPDAccepted}
        onAccept={handleAcceptLGPD}
      />

      {/* App PIN Lock Modal */}
      {appPin && (
        <PinLockModal
          isOpen={isPinLocked}
          correctPin={appPin}
          onUnlockSuccess={() => setIsPinLocked(false)}
        />
      )}

      {/* Smartphone Frame Outer Wrapper (if isMobileFrame is true on desktop) */}
      <div className={isMobileFrame ? 'w-full sm:max-w-[450px] sm:my-2 sm:rounded-[42px] sm:border-[8px] sm:border-slate-900 sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] sm:ring-1 sm:ring-white/20 flex flex-col relative overflow-hidden transition-all duration-300 min-h-screen sm:min-h-[850px] bg-slate-100/90 backdrop-blur-md' : 'w-full'}>
        {/* Smartphone Notch Bar (Visible in desktop mobile frame) */}
        {isMobileFrame && (
          <div className="hidden sm:flex items-center justify-between px-6 py-2 bg-slate-950 text-slate-400 text-[10px] shrink-0 font-mono select-none">
            <span className="font-bold text-slate-300">09:41</span>
            <div className="h-3.5 w-24 bg-slate-900 rounded-full border border-slate-800/80 flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-slate-700"></div>
            </div>
            <span className="text-emerald-400 font-bold">5G 100%</span>
          </div>
        )}

        {/* PWA Mobile Native App Install Banner */}
        <PWAInstallBanner />

        {/* Header with Navigation & Microarea Metrics */}
        <Header
          user={user}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onConnectGoogle={handleConnectGoogle}
          onOpenSecurityAndBackup={() => setIsSecurityModalOpen(true)}
          onOpenThemeSelector={() => setIsThemeModalOpen(true)}
          onOpenDuplicateMerger={() => setIsDuplicateMergerOpen(true)}
          onOpenGeminiAssistant={() => setIsGeminiModalOpen(true)}
          duplicateCount={candidateDuplicateGroups.length}
          onOpenTrash={() => setIsTrashOpen(true)}
          trashCount={trashItems.length}
          onLogout={handleLogout}
          onRefresh={handleRefresh}
          isLoading={isLoading}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          domicileCount={domiciles.length}
          patientCount={contacts.length}
        />

        {/* Main Content Area */}
        <main className={`flex-1 ${isMobileFrame ? 'px-3.5 py-4 pb-28' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28'}`}>
          {/* Offline Mode Banner */}
          {!isOnline && (
            <div className="mb-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 text-amber-900 dark:text-amber-200 animate-fadeIn transition-all shadow-sm">
              <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
                <WifiOff className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-950 dark:text-amber-100">Modo Off-line Ativo</p>
                <p className="text-xs text-amber-800 dark:text-amber-300/90">
                  Sem conexão no momento. Digitação e edições estão salvas instantaneamente na Memória RAM e Cache Local.
                </p>
              </div>
            </div>
          )}

          {/* Sync Success Toast Notification */}
          {syncToast && syncToast.show && (
            <div className="mb-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3 text-emerald-900 dark:text-emerald-200 animate-fadeIn transition-all shadow-sm">
              <div className="p-2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-950 dark:text-emerald-100">{syncToast.message}</p>
                {syncToast.subtext && <p className="text-xs text-emerald-800 dark:text-emerald-300/90">{syncToast.subtext}</p>}
              </div>
            </div>
          )}

          {/* Banner for Google Integrations */}
          {!user.isAuthenticated && (
            <div className="mb-5 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-4 rounded-2xl shadow-sm border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-400/30 shrink-0">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <h4 className="text-xs font-bold text-white">Aplicativo de Trabalho do Agente Comunitário de Saúde (ACS)</h4>
                  <p className="text-[11px] text-slate-300">
                    Integrado ao <strong>Google Contatos</strong>, <strong>Google Agenda</strong> e <strong>Google Maps</strong> para cadastro domiciliar, composições familiares e planejamento de rotas no território.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <button
                  onClick={handleConnectGoogle}
                  className="w-full sm:w-auto justify-center px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs transition shadow-md flex items-center gap-1.5"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Conectar Google</span>
                </button>
              </div>
            </div>
          )}

          {isGoogleTokenExpired && (
            <div className="mb-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-200">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-100">Sua sessão do Google Contatos/Agenda precisa de renovação</p>
                  <p className="text-xs text-amber-300/80">
                    Os tokens do Google expiram periodicamente por segurança. Clique abaixo para reconectar sua conta e sincronizar os contatos e agenda em tempo real.
                  </p>
                </div>
              </div>
              <button
                onClick={handleConnectGoogle}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs transition shadow-md whitespace-nowrap shrink-0 flex items-center gap-2"
              >
                <LogIn className="h-4 w-4" />
                <span>Reconectar Google</span>
              </button>
            </div>
          )}

          {activeTab === 'agenda' && (
            <DailyAgenda
              events={events}
              contacts={contacts}
              domiciles={domiciles}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onUpdateEventStatus={handleUpdateEventStatus}
              onAddEvent={handleAddEvent}
              onDeleteEvent={handleDeleteEvent}
              onOpenRouteTab={() => setActiveTab('route')}
              onUpdateContact={handleUpdateContact}
              onUpdateDomicile={handleUpdateDomicile}
            />
          )}

          {activeTab === 'domiciles' && (
            <DomicileManager
              domiciles={domiciles}
              contacts={contacts}
              events={events}
              trashItems={trashItems}
              onAddDomicile={handleAddDomicile}
              onUpdateDomicile={handleUpdateDomicile}
              onDeleteDomicile={handleDeleteDomicile}
              onScheduleVisitForDomicile={handleScheduleVisitForDomicile}
              onApplyGrouping={handleApplyGrouping}
              onApplyMicroareaToAll={handleApplyMicroareaToAll}
            />
          )}

          {activeTab === 'patients' && (
            <PatientManager
              contacts={contacts}
              domiciles={domiciles}
              events={events}
              trashItems={trashItems}
              onAddContact={handleAddContact}
              onUpdateContact={handleUpdateContact}
              onDeleteContact={handleDeleteContact}
              onScheduleVisitForContact={handleScheduleVisitForContact}
              onAddEventsBatch={handleAddEventsBatch}
              onImportContactsCSV={handleImportContactsCSV}
              onApplyGrouping={handleApplyGrouping}
              onApplyMicroareaToAll={handleApplyMicroareaToAll}
            />
          )}

          {activeTab === 'route' && (
            <RouteMap events={events} selectedDate={selectedDate} />
          )}

          {activeTab === 'metrics' && (
            <MetricsOverview
              events={events}
              selectedDate={selectedDate}
              domiciles={domiciles}
              contacts={contacts}
            />
          )}
        </main>
      </div>

      {/* Persistent Bottom Navigation Dock */}
      <BottomNavDock
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        theme={currentTheme}
        visitCount={selectedDateVisitsCount}
        domicileCount={domiciles.length}
        patientCount={contacts.length}
      />

      {/* Theme & Frame Selector Modal */}
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        currentThemeId={currentThemeId}
        onSelectTheme={(id) => {
          setCurrentThemeId(id);
          saveThemeId(id);
        }}
        isMobileFrame={isMobileFrame}
        onToggleMobileFrame={(enable) => {
          setIsMobileFrame(enable);
          localStorage.setItem('acs_mobile_frame', String(enable));
        }}
      />

      <SecurityAndBackupModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        domiciles={domiciles}
        contacts={contacts}
        events={events}
        userEmail={user.email}
        onRestoreData={handleRestoreData}
        appPin={appPin}
        onSetAppPin={handleSetAppPin}
      />

      <DuplicateMergerModal
        isOpen={isDuplicateMergerOpen}
        onClose={() => setIsDuplicateMergerOpen(false)}
        candidateGroups={candidateDuplicateGroups}
        onConfirmMerge={handleConfirmMergeDuplicates}
        onDismissGroup={handleDismissDuplicateGroup}
      />

      <TrashModal
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
        trashItems={trashItems}
        retentionDays={trashRetentionDays}
        onChangeRetentionDays={handleChangeRetentionDays}
        onRestoreItem={handleRestoreTrashItem}
        onRestoreAllItems={handleRestoreAllTrashItems}
        onPermanentlyDeleteItem={handlePermanentlyDeleteTrashItem}
        onEmptyTrash={handleEmptyTrash}
      />

      {/* Gemini AI Assistant Modal */}
      <GeminiAssistantModal
        isOpen={isGeminiModalOpen}
        onClose={() => setIsGeminiModalOpen(false)}
        contextData={{
          domicilesCount: domiciles.length,
          patientsCount: contacts.length,
          todayVisitsCount: selectedDateVisitsCount
        }}
      />

      {/* Floating Action Button for Instant Access to Agente Aguiar IA */}
      {!isGeminiModalOpen && (
        <button
          onClick={() => setIsGeminiModalOpen(true)}
          className="fixed bottom-20 right-4 z-40 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white p-3.5 rounded-full shadow-2xl border-2 border-emerald-400/50 flex items-center gap-2 group transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          title="Abrir Agente Aguiar IA (Assistente Gemini do ACS)"
        >
          <Bot className="h-6 w-6 text-amber-300 animate-bounce" />
          <span className="hidden sm:inline-block font-black text-xs pr-1">IA Aguiar</span>
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border border-slate-900"></span>
          </span>
        </button>
      )}
    </div>
  );
}
