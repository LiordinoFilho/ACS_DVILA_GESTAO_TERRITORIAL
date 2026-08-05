import { CalendarEvent } from '../types';
import { getBrasiliaDateStr } from '../utils/dateUtils';

const NOTIFICATION_SOUND_KEY = 'acs_sound_enabled';
const PUSH_NOTIFICATION_KEY = 'acs_push_enabled';

// Web Audio API Synthesizer Chime
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtxClass) {
      audioCtx = new AudioCtxClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a pleasant double-chime sound (A5 -> C6) for priority alerts
 */
export function playChimeSound(): void {
  try {
    if (!isSoundEnabled()) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Tone 1: A5 (880Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: C6 (1046.5Hz) - plays 120ms later
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, now + 0.12);
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.5);
  } catch (e) {
    console.warn('Erro ao reproduzir alerta sonoro:', e);
  }
}

/**
 * Checks audio sound enabled status
 */
export function isSoundEnabled(): boolean {
  try {
    const val = localStorage.getItem(NOTIFICATION_SOUND_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

/**
 * Toggles sound alert state
 */
export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(NOTIFICATION_SOUND_KEY, String(enabled));
  } catch {}
}

/**
 * Checks push notification enabled status
 */
export function isPushEnabled(): boolean {
  try {
    const val = localStorage.getItem(PUSH_NOTIFICATION_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Toggles push notification state and requests browser permission
 */
export async function requestPushPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    alert('Notificações não são suportadas neste navegador.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    const granted = permission === 'granted';
    localStorage.setItem(PUSH_NOTIFICATION_KEY, String(granted));
    
    if (granted) {
      sendPushNotification('ACS D\'Vila Notificações Ativas 🔔', {
        body: 'Você receberá alertas sonoros e visuais de visitas prioritárias do e-SUS.',
        icon: '/pwa-icon.jpg'
      });
      playChimeSound();
    }
    return granted;
  } catch (e) {
    console.warn('Erro ao solicitar permissão de notificação:', e);
    return false;
  }
}

/**
 * Sends a native browser push notification
 */
export function sendPushNotification(title: string, options?: NotificationOptions): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted' && isPushEnabled()) {
    try {
      new Notification(title, {
        icon: '/pwa-icon.jpg',
        badge: '/pwa-icon.jpg',
        ...options
      });
    } catch (e) {
      console.warn('Erro ao disparar notificação:', e);
    }
  }
}

/**
 * Scans today's events for unvisited priority targets and alerts the ACS
 */
export function scanAndNotifyPriorityVisits(events: CalendarEvent[], targetDateStr: string): number {
  const targetDate = getBrasiliaDateStr(targetDateStr);
  const todayVisits = events.filter(e => getBrasiliaDateStr(e.date) === targetDate && e.status === 'pendente');
  const priorityVisits = todayVisits.filter(e => {
    const titleLower = (e.title || '').toLowerCase();
    const reasonLower = (e.visitReason || '').toLowerCase();
    const obsLower = (e.observation || '').toLowerCase();
    return (
      titleLower.includes('gestante') ||
      titleLower.includes('puerpera') ||
      titleLower.includes('acamado') ||
      titleLower.includes('hipertenso') ||
      titleLower.includes('diabetico') ||
      titleLower.includes('prioridade') ||
      titleLower.includes('rn') ||
      titleLower.includes('recém-nascido') ||
      reasonLower.includes('gestante') ||
      reasonLower.includes('acamado') ||
      obsLower.includes('gestante') ||
      obsLower.includes('acamado')
    );
  });

  if (priorityVisits.length > 0) {
    playChimeSound();
    sendPushNotification(`ACS D'Vila: ${priorityVisits.length} Visita(s) Prioritária(s) Hoje! 🚨`, {
      body: `Paciente: ${priorityVisits[0].contactName} - ${priorityVisits[0].title || 'Visita e-SUS'}`,
      tag: 'priority_visit_alert'
    });
  }

  return priorityVisits.length;
}
