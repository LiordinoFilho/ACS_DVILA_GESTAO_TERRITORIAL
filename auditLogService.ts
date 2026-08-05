import { Domicile, GoogleContact, CalendarEvent } from '../types';

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO string
  formattedDate: string; // e.g. 04/08/2026 10:15:32
  action: string;
  category: 'PATIENT' | 'VISIT' | 'DOMICILE' | 'SYSTEM' | 'SYNC' | 'SECURITY';
  description: string;
  userEmail?: string;
  details?: string;
}

const AUDIT_STORAGE_KEY = 'acs_audit_logs_v1';
const MAX_AUDIT_LOGS = 500;

let memoryAuditLogs: AuditLogEntry[] = [];

// Initialize memory logs from LocalStorage
function initMemoryLogs(): AuditLogEntry[] {
  if (memoryAuditLogs.length > 0) return memoryAuditLogs;
  try {
    const stored = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (stored) {
      memoryAuditLogs = JSON.parse(stored);
      return memoryAuditLogs;
    }
  } catch (e) {
    console.warn('Erro ao carregar logs de auditoria:', e);
  }
  return [];
}

/**
 * Persists an audit log entry to memory and localStorage
 */
export function logAuditEvent(
  action: string,
  category: AuditLogEntry['category'],
  description: string,
  details?: string,
  userEmail?: string
): AuditLogEntry {
  const now = new Date();
  const entry: AuditLogEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: now.toISOString(),
    formattedDate: now.toLocaleString('pt-BR'),
    action,
    category,
    description,
    userEmail: userEmail || 'ACS D\'Vila (Agente Aguiar)',
    details
  };

  const logs = initMemoryLogs();
  logs.unshift(entry);

  // Keep max limit
  if (logs.length > MAX_AUDIT_LOGS) {
    logs.pop();
  }

  memoryAuditLogs = logs;

  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    console.warn('Erro ao salvar log de auditoria no localStorage:', e);
  }

  return entry;
}

/**
 * Get all recorded audit log entries
 */
export function getAuditLogs(): AuditLogEntry[] {
  return initMemoryLogs();
}

/**
 * Clear audit logs (with a system log recorded after)
 */
export function clearAuditLogs(): void {
  memoryAuditLogs = [];
  try {
    localStorage.removeItem(AUDIT_STORAGE_KEY);
  } catch (e) {}
  logAuditEvent('LIMPEZA_LOGS', 'SECURITY', 'Histórico de auditoria foi limpo pelo Agente.');
}

/**
 * Export audit logs to official CSV file for e-SUS audit
 */
export function exportAuditLogsToCSV(): void {
  const logs = getAuditLogs();
  if (logs.length === 0) {
    alert('Nenhum log de auditoria registrado para exportar.');
    return;
  }

  const headers = ['ID', 'Data/Hora', 'Categoria', 'Ação', 'Descrição', 'Usuário/Agente', 'Detalhes'];
  const rows = logs.map(l => [
    l.id,
    l.formattedDate,
    l.category,
    `"${l.action.replace(/"/g, '""')}"`,
    `"${l.description.replace(/"/g, '""')}"`,
    `"${(l.userEmail || '').replace(/"/g, '""')}"`,
    `"${(l.details || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `relatorio_auditoria_acs_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
