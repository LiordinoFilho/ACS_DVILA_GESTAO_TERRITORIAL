import React, { useState, useEffect, useCallback } from 'react';
import { GoogleContact, CalendarEvent, Domicile, UserProfile, VisitStatus, MICROAREAS, DEFAULT_MICROAREA, setDefaultMicroarea } from './types';
import { INITIAL_CONTACTS, INITIAL_DOMICILES, getInitialEvents } from './mockData';
import { Header } from './components/Header';
import { DailyAgenda } from './components/DailyAgenda';
import { DomicileManager } from './components/DomicileManager';
import { PatientManager } from './components/PatientManager';
import { RouteMap } from './components/RouteMap';
import { MetricsOverview } from './components/MetricsOverview';
import { GoogleAuthDiagnosticModal } from './components/GoogleAuthDiagnosticModal';
import { LoginScreen } from './components/LoginScreen';
import { LGPDModal } from './components/LGPDModal';
import { SecurityAndBackupModal } from './components/SecurityAndBackupModal';
import { PinLockModal } from './components/PinLockModal';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { BottomNavDock } from './components/BottomNavDock';
import { getSavedThemeId, saveThemeId, getThemeById, ThemeId } from './utils/themeUtils';
import { initAuth, googleSignIn, logoutFirebase, getAccessToken } from './lib/firebaseAuth';
import { processAndGroupContactsByCEP } from './utils/domicileGroupUtils';
import { Sparkles, ShieldAlert, LogIn } from 'lucide-react';

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
    return new Date().toISOString().split('T')[0];
  });

  const [activeTab, setActiveTab] = useState<'agenda' | 'domiciles' | 'patients' | 'route' | 'metrics'>('agenda');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState<boolean>(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState<boolean>(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);
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

  // Save to LocalStorage whenever ACS states change
  useEffect(() => {
    localStorage.setItem('acs_domiciles', JSON.stringify(domiciles));
  }, [domiciles]);

  useEffect(() => {
    localStorage.setItem('acs_patients', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('acs_visits', JSON.stringify(events));
  }, [events]);

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

  // Startup auto-grouping effect for contacts & domiciles by CEP and Empresa
  useEffect(() => {
    processAndGroupContactsByCEP(contacts, domiciles).then(({ updatedContacts, updatedDomiciles }) => {
      setContacts(updatedContacts);
      setDomiciles(updatedDomiciles);
    });
  }, []);

  // Check auth status on load
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { headers: getAuthHeaders() });
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
      console.error('Erro ao verificar autenticação:', err);
    }
  }, []);

  // Fetch Contacts from Google API if connected
  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch('/api/contacts', { headers: getAuthHeaders() });
      const data = await res.json();

      if (data.authenticated) {
        setIsGoogleTokenExpired(false);
        if (data.contacts && data.contacts.length > 0) {
          const { updatedContacts, updatedDomiciles } = await processAndGroupContactsByCEP(
            data.contacts,
            domiciles
          );
          setContacts(updatedContacts);
          setDomiciles(updatedDomiciles);
        }
      } else {
        if (getAccessToken() || localStorage.getItem('google_tokens')) {
          setIsGoogleTokenExpired(true);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar contatos do Google:', err);
    }
  }, [domiciles]);

  // Fetch Events from Google Calendar API
  const fetchEvents = useCallback(async (dateStr: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/calendar/events?date=${dateStr}`, { headers: getAuthHeaders() });
      const data = await res.json();

      if (data.authenticated) {
        setIsGoogleTokenExpired(false);
        if (data.events && data.events.length > 0) {
          setEvents(data.events);
        }
      } else {
        if (getAccessToken() || localStorage.getItem('google_tokens')) {
          setIsGoogleTokenExpired(true);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar agenda:', err);
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
      fetchEvents(selectedDate);
    }
  }, [selectedDate, user.isAuthenticated, fetchContacts, fetchEvents]);

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

  // Handle Google Login Flow via Firebase Popup with server url fallback
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
        await fetchContacts();
        await fetchEvents(selectedDate);
        return;
      }
    } catch (err: any) {
      console.warn('Firebase login error, trying direct OAuth popup:', err);
      // Fallback to server OAuth popup / url if needed
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      let targetUrl = '/api/auth/google';
      try {
        const urlRes = await fetch('/api/auth/url');
        const data = await urlRes.json();
        if (data.configured && data.url) {
          targetUrl = data.url;
        }
      } catch (e) {}

      const popup = window.open(
        targetUrl,
        'google_oauth_popup',
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=yes`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        window.open(targetUrl, '_blank');
      }
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
    await checkAuth();
    if (user.isAuthenticated) {
      await fetchContacts();
      await fetchEvents(selectedDate);
    }
    setIsLoading(false);
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
    setDomiciles((prev) => prev.filter((d) => d.id !== id));
  };

  // --- Patient Handlers ---
  const handleAddContact = async (newContact: GoogleContact) => {
    // Automatically process CEP, ViaCEP, company field ("Empresa"), and Domicile grouping
    const { updatedContacts, updatedDomiciles } = await processAndGroupContactsByCEP(
      [newContact, ...contacts],
      domiciles
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
        console.error('Erro ao criar contato no Google Contatos:', err);
      }
    }
  };

  const handleUpdateContact = async (updatedContact: GoogleContact) => {
    const list = contacts.map((c) => (c.id === updatedContact.id ? updatedContact : c));
    const { updatedContacts, updatedDomiciles } = await processAndGroupContactsByCEP(
      list,
      domiciles
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
        console.error('Erro ao atualizar contato no Google Contatos:', err);
      }
    }
  };

  const handleDeleteContact = async (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));

    if (user.isAuthenticated && id.startsWith('people/')) {
      try {
        await fetch(`/api/contacts?resourceName=${encodeURIComponent(id)}`, {
          method: 'DELETE'
        });
      } catch (err) {
        console.error('Erro ao excluir contato no Google Contatos:', err);
      }
    }

    // Remove from domiciles
    setDomiciles((prev) =>
      prev.map((d) => ({
        ...d,
        familyMembers: d.familyMembers.filter((m) => m.patientId !== id)
      }))
    );
  };

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
      startTime: newEventData.startTime || '08:30',
      endTime: newEventData.endTime || '09:30',
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
      domiciles
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
      endTime: '10:00'
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
      endTime: '10:00'
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
    localStorage.setItem('acs_domiciles', JSON.stringify(newDomiciles));
    localStorage.setItem('acs_patients', JSON.stringify(newContacts));
    localStorage.setItem('acs_visits', JSON.stringify(newEvents));
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
          onOpenDiagnostic={() => setIsDiagnosticModalOpen(true)}
          isLoading={isLoading}
        />
        <GoogleAuthDiagnosticModal
          isOpen={isDiagnosticModalOpen}
          onClose={() => setIsDiagnosticModalOpen(false)}
          onRecheckAuth={checkAuth}
        />
      </>
    );
  }

  const handleApplyGrouping = (updatedContacts: GoogleContact[], updatedDomiciles: Domicile[]) => {
    setContacts(updatedContacts);
    setDomiciles(updatedDomiciles);
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

        {/* Header with Navigation & Microarea Metrics */}
        <Header
          user={user}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onConnectGoogle={handleConnectGoogle}
          onOpenDiagnostic={() => setIsDiagnosticModalOpen(true)}
          onOpenSecurityAndBackup={() => setIsSecurityModalOpen(true)}
          onOpenThemeSelector={() => setIsThemeModalOpen(true)}
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
              onOpenRouteTab={() => setActiveTab('route')}
              onUpdateContact={handleUpdateContact}
              onUpdateDomicile={handleUpdateDomicile}
            />
          )}

          {activeTab === 'domiciles' && (
            <DomicileManager
              domiciles={domiciles}
              contacts={contacts}
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

      <GoogleAuthDiagnosticModal
        isOpen={isDiagnosticModalOpen}
        onClose={() => setIsDiagnosticModalOpen(false)}
        onRecheckAuth={checkAuth}
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
    </div>
  );
}
