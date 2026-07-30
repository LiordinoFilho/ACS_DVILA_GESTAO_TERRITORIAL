import { Domicile, GoogleContact, CalendarEvent } from '../types';

export interface ACSBackupData {
  version: string;
  createdAt: string;
  appName: string;
  userEmail?: string;
  summary: {
    domicilesCount: number;
    patientsCount: number;
    visitsCount: number;
  };
  data: {
    domiciles: Domicile[];
    contacts: GoogleContact[];
    events: CalendarEvent[];
    settings?: {
      defaultMicroarea?: string;
      customMicroareas?: string[];
      lastUpdated?: string;
    };
  };
  checksum?: string;
}

export interface BackupSnapshot {
  id: string;
  date: string;
  summaryText: string;
  sizeKb: number;
  data: ACSBackupData;
}

// Generate simple hash checksum for integrity verification
function generateChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
  * Build a standardized ACS Backup package object
  */
export function createBackupPackage(
  domiciles: Domicile[],
  contacts: GoogleContact[],
  events: CalendarEvent[],
  userEmail?: string
): ACSBackupData {
  const packageWithoutChecksum = {
    version: '2.0',
    createdAt: new Date().toISOString(),
    appName: "ACS D'Vila Gestão Territorial",
    userEmail: userEmail || 'acs.territorio@saude.gov.br',
    summary: {
      domicilesCount: domiciles.length,
      patientsCount: contacts.length,
      visitsCount: events.length,
    },
    data: {
      domiciles,
      contacts,
      events,
      settings: {
        lastUpdated: new Date().toISOString(),
      },
    },
  };

  const jsonString = JSON.stringify(packageWithoutChecksum);
  const checksum = generateChecksum(jsonString);

  return {
    ...packageWithoutChecksum,
    checksum,
  };
}

/**
  * Download backup directly as a lightweight file (.acsbackup or .json)
  */
export function downloadBackupFile(backup: ACSBackupData): void {
  const jsonContent = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `ACS_DVila_Backup_${dateStr}.acsbackup`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
  * Upload backup directly to user's Google Drive via Google Drive API v3
  */
export async function uploadBackupToGoogleDrive(
  backup: ACSBackupData,
  accessToken: string
): Promise<{ success: boolean; fileId?: string; fileName?: string; error?: string }> {
  try {
    if (!accessToken) {
      return { success: false, error: 'Token do Google não encontrado. Faça login novamente.' };
    }

    const dateStr = new Date().toISOString().replace('T', '_').substring(0, 19);
    const fileName = `ACS_DVila_Backup_Oficial_${dateStr}.acsbackup`;
    const fileContent = JSON.stringify(backup, null, 2);

    const metadata = {
      name: fileName,
      mimeType: 'application/json',
      description: `Backup do Sistema ACS D'Vila - ${backup.summary.patientsCount} Pacientes, ${backup.summary.domicilesCount} Domicílios, ${backup.summary.visitsCount} Visitas.`,
    };

    const boundary = 'foo_bar_baz_acs_drive';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      fileContent +
      closeDelimiter;

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartRequestBody,
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Erro na API do Google Drive:', errText);
      return {
        success: false,
        error: `Falha ao salvar no Google Drive (${response.status}). Verifique as permissões.`,
      };
    }

    const resData = await response.json();
    return {
      success: true,
      fileId: resData.id,
      fileName,
    };
  } catch (err: any) {
    console.error('Exceção ao fazer upload para o Google Drive:', err);
    return {
      success: false,
      error: err.message || 'Erro de conexão com o Google Drive.',
    };
  }
}

/**
  * Validate and parse uploaded backup file content
  */
export function parseAndValidateBackup(fileText: string): {
  valid: boolean;
  backupData?: ACSBackupData;
  errorMessage?: string;
} {
  try {
    const parsed = JSON.parse(fileText);

    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, errorMessage: 'Formato do arquivo inválido. Não é um JSON válido.' };
    }

    // Support both .acsbackup native and exported JSON structure
    const dataSection = parsed.data || parsed;
    const domiciles = Array.isArray(dataSection.domiciles) ? dataSection.domiciles : [];
    const contacts = Array.isArray(dataSection.contacts) ? dataSection.contacts : Array.isArray(parsed.contacts) ? parsed.contacts : [];
    const events = Array.isArray(dataSection.events) ? dataSection.events : Array.isArray(parsed.events) ? parsed.events : [];

    if (domiciles.length === 0 && contacts.length === 0 && events.length === 0) {
      return { valid: false, errorMessage: 'O arquivo não contém cadastros de pacientes, domicílios ou visitas reconhecíveis.' };
    }

    const validatedBackup: ACSBackupData = {
      version: parsed.version || '1.0',
      createdAt: parsed.createdAt || new Date().toISOString(),
      appName: parsed.appName || "ACS D'Vila",
      userEmail: parsed.userEmail || '',
      summary: {
        domicilesCount: domiciles.length,
        patientsCount: contacts.length,
        visitsCount: events.length,
      },
      data: {
        domiciles,
        contacts,
        events,
        settings: dataSection.settings || {},
      },
    };

    return { valid: true, backupData: validatedBackup };
  } catch (e: any) {
    return { valid: false, errorMessage: `Erro de leitura do arquivo: ${e.message}` };
  }
}

/**
  * Save a daily snapshot locally in localStorage/IndexedDB snapshot list
  */
export function saveLocalSnapshot(backup: ACSBackupData): void {
  try {
    const snapshotsRaw = localStorage.getItem('acs_auto_snapshots');
    let snapshots: BackupSnapshot[] = snapshotsRaw ? JSON.parse(snapshotsRaw) : [];

    const jsonString = JSON.stringify(backup);
    const sizeKb = Math.round(jsonString.length / 1024);

    const newSnapshot: BackupSnapshot = {
      id: `snap_${Date.now()}`,
      date: new Date().toLocaleString('pt-BR'),
      summaryText: `${backup.summary.patientsCount} Pacientes | ${backup.summary.domicilesCount} Domicílios | ${backup.summary.visitsCount} Visitas`,
      sizeKb,
      data: backup,
    };

    // Keep up to 10 latest snapshots to avoid exceeding localStorage quota
    snapshots = [newSnapshot, ...snapshots.slice(0, 9)];
    localStorage.setItem('acs_auto_snapshots', JSON.stringify(snapshots));
  } catch (e) {
    console.warn('Não foi possível salvar snapshot automático local:', e);
  }
}

/**
  * Retrieve local snapshots history
  */
export function getLocalSnapshots(): BackupSnapshot[] {
  try {
    const snapshotsRaw = localStorage.getItem('acs_auto_snapshots');
    return snapshotsRaw ? JSON.parse(snapshotsRaw) : [];
  } catch (e) {
    return [];
  }
}
