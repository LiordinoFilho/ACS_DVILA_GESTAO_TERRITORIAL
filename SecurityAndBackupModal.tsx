import React, { useState, useEffect } from 'react';
import { Domicile, GoogleContact, CalendarEvent } from '../types';
import { 
  createBackupPackage, 
  downloadBackupFile, 
  uploadBackupToGoogleDrive, 
  parseAndValidateBackup,
  saveLocalSnapshot,
  getLocalSnapshots,
  ACSBackupData,
  BackupSnapshot
} from '../services/backupService';
import { getAccessToken } from '../lib/firebaseAuth';
import { 
  Shield, 
  HardDrive, 
  CloudUpload, 
  Download, 
  Upload, 
  KeyRound, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  FileCheck, 
  History, 
  X, 
  Sparkles,
  Loader2,
  Trash2,
  LockKeyhole
} from 'lucide-react';

interface SecurityAndBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  domiciles: Domicile[];
  contacts: GoogleContact[];
  events: CalendarEvent[];
  userEmail?: string;
  onRestoreData: (newDomiciles: Domicile[], newContacts: GoogleContact[], newEvents: CalendarEvent[]) => void;
  appPin: string | null;
  onSetAppPin: (pin: string | null) => void;
}

export const SecurityAndBackupModal: React.FC<SecurityAndBackupModalProps> = ({
  isOpen,
  onClose,
  domiciles,
  contacts,
  events,
  userEmail,
  onRestoreData,
  appPin,
  onSetAppPin,
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'security'>('backup');
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [driveResult, setDriveResult] = useState<{ success: boolean; msg: string } | null>(null);

  // Restore file state
  const [pendingBackup, setPendingBackup] = useState<ACSBackupData | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');

  // Snapshots
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);

  // Security / PIN setup
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinSuccessMsg, setPinSuccessMsg] = useState('');
  const [pinErrorMsg, setPinErrorMsg] = useState('');

  // Factory reset state
  const [resetConfirmationText, setResetConfirmationText] = useState('');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSnapshots(getLocalSnapshots());
      setDriveResult(null);
      setRestoreError(null);
      setPendingBackup(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentBackup = createBackupPackage(domiciles, contacts, events, userEmail);

  // 1. Download Local Backup File
  const handleDownloadBackup = () => {
    downloadBackupFile(currentBackup);
    saveLocalSnapshot(currentBackup);
    setSnapshots(getLocalSnapshots());
  };

  // 2. Upload Backup directly to Google Drive
  const handleUploadDrive = async () => {
    setIsUploadingToDrive(true);
    setDriveResult(null);

    const token = getAccessToken();
    if (!token) {
      setDriveResult({
        success: false,
        msg: 'Sua conta do Google precisa estar conectada para enviar arquivos ao Google Drive. Clique em "Conectar Google" no topo do app.',
      });
      setIsUploadingToDrive(false);
      return;
    }

    const res = await uploadBackupToGoogleDrive(currentBackup, token);
    setIsUploadingToDrive(false);

    if (res.success) {
      saveLocalSnapshot(currentBackup);
      setSnapshots(getLocalSnapshots());
      setDriveResult({
        success: true,
        msg: `Backup gravado no seu Google Drive com sucesso! Nome do arquivo: "${res.fileName}"`,
      });
    } else {
      setDriveResult({
        success: false,
        msg: res.error || 'Não foi possível concluir o upload no Google Drive.',
      });
    }
  };

  // 3. Handle File Selection for Restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreError(null);
    setPendingBackup(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = parseAndValidateBackup(content);
      if (res.valid && res.backupData) {
        setPendingBackup(res.backupData);
      } else {
        setRestoreError(res.errorMessage || 'Arquivo de backup inválido.');
      }
    };
    reader.readAsText(file);
  };

  // 4. Confirm Restore
  const handleExecuteRestore = (backupToRestore: ACSBackupData) => {
    let finalDomiciles = backupToRestore.data.domiciles || [];
    let finalContacts = backupToRestore.data.contacts || [];
    let finalEvents = backupToRestore.data.events || [];

    if (restoreMode === 'merge') {
      // Merge unique domiciles
      const domMap = new Map<string, Domicile>();
      domiciles.forEach(d => domMap.set(d.id, d));
      finalDomiciles.forEach(d => domMap.set(d.id, d));
      finalDomiciles = Array.from(domMap.values());

      // Merge unique contacts
      const conMap = new Map<string, GoogleContact>();
      contacts.forEach(c => conMap.set(c.id || c.name, c));
      finalContacts.forEach(c => conMap.set(c.id || c.name, c));
      finalContacts = Array.from(conMap.values());

      // Merge unique events
      const evMap = new Map<string, CalendarEvent>();
      events.forEach(e => evMap.set(e.id, e));
      finalEvents.forEach(e => evMap.set(e.id, e));
      finalEvents = Array.from(evMap.values());
    }

    onRestoreData(finalDomiciles, finalContacts, finalEvents);
    setPendingBackup(null);
    alert('Restauração de dados concluída com sucesso!');
  };

  // 5. Save PIN
  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinErrorMsg('');
    setPinSuccessMsg('');

    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      setPinErrorMsg('O PIN deve conter exatamente 4 números.');
      return;
    }

    if (newPin !== confirmPin) {
      setPinErrorMsg('Os números digitados não coincidem.');
      return;
    }

    onSetAppPin(newPin);
    setPinSuccessMsg('Senha PIN ativada com sucesso!');
    setNewPin('');
    setConfirmPin('');
  };

  const handleRemovePin = () => {
    if (confirm('Deseja desativar a senha PIN de proteção do aplicativo?')) {
      onSetAppPin(null);
      setPinSuccessMsg('Senha PIN removida.');
    }
  };

  // 6. Execute Factory Reset
  const handleExecuteReset = () => {
    if (resetConfirmationText.toUpperCase() === 'EXCLUIR') {
      onRestoreData([], [], []);
      localStorage.removeItem('acs_domiciles');
      localStorage.removeItem('acs_patients');
      localStorage.removeItem('acs_visits');
      localStorage.removeItem('acs_auto_snapshots');
      alert('Todos os cadastros foram limpos do seu dispositivo.');
      setIsResetConfirmOpen(false);
      onClose();
    } else {
      alert('Palavra de confirmação incorreta. Digite exatamente EXCLUIR.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-slate-100 flex flex-col my-8 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/10 border border-teal-500/30 text-teal-400 rounded-2xl">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Central de Backup & Segurança do APP</h2>
              <p className="text-xs text-slate-400">Proteção de dados locais, cópias no Google Drive e restauração</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-xl transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 border-b-2 ${
              activeTab === 'backup'
                ? 'border-teal-400 text-teal-300 bg-slate-800/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="h-4 w-4" />
            <span>Backup e Restauração (Drive / Arquivo)</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition flex items-center gap-2 border-b-2 ${
              activeTab === 'security'
                ? 'border-indigo-400 text-indigo-300 bg-slate-800/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="h-4 w-4" />
            <span>Segurança, PIN & LGPD</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[75vh] space-y-6">
          {activeTab === 'backup' && (
            <>
              {/* Backup Summary Box */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-400 block mb-1">
                    Volume de Dados Atuais no Dispositivo
                  </span>
                  <div className="text-sm font-bold text-white flex items-center gap-3">
                    <span>👥 {contacts.length} Pacientes</span>
                    <span>🏡 {domiciles.length} Domicílios</span>
                    <span>📅 {events.length} Visitas</span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700/50">
                  Formato ultra-leve (<strong className="text-slate-200">.acsbackup</strong>)
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Save to Google Drive */}
                <div className="bg-slate-800/40 border border-teal-500/30 rounded-2xl p-4 flex flex-col justify-between hover:border-teal-500/50 transition">
                  <div className="mb-3">
                    <div className="flex items-center gap-2 text-teal-300 font-extrabold text-sm mb-1">
                      <CloudUpload className="h-5 w-5" />
                      <span>Salvar no Google Drive ☁️</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Envia uma cópia completa dos cadastros diretamente para a nuvem da sua conta Google conectada.
                    </p>
                  </div>

                  <button
                    onClick={handleUploadDrive}
                    disabled={isUploadingToDrive}
                    className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isUploadingToDrive ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Gerando Backup no Drive...</span>
                      </>
                    ) : (
                      <>
                        <CloudUpload className="h-4 w-4" />
                        <span>Fazer Backup no Google Drive</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Download Local File */}
                <div className="bg-slate-800/40 border border-indigo-500/30 rounded-2xl p-4 flex flex-col justify-between hover:border-indigo-500/50 transition">
                  <div className="mb-3">
                    <div className="flex items-center gap-2 text-indigo-300 font-extrabold text-sm mb-1">
                      <Download className="h-5 w-5" />
                      <span>Baixar Arquivo de Backup 📥</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Gera o arquivo compactado em seu celular/computador para guardar em pen drive, WhatsApp ou e-mail.
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadBackup}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Baixar Backup (.acsbackup)</span>
                  </button>
                </div>
              </div>

              {driveResult && (
                <div className={`p-3.5 rounded-2xl text-xs font-bold border flex items-center gap-2 ${
                  driveResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                }`}>
                  {driveResult.success ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" /> : <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />}
                  <span>{driveResult.msg}</span>
                </div>
              )}

              {/* Restore Section */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
                  <Upload className="h-5 w-5 text-amber-400" />
                  <span>Restaurar Cadastros a Partir de Backup</span>
                </div>

                <p className="text-xs text-slate-400">
                  Selecione um arquivo de backup previamente salvo (<strong className="text-slate-300">.acsbackup</strong> ou <strong className="text-slate-300">.json</strong>) para recuperar seus pacientes e visitas.
                </p>

                <input
                  type="file"
                  accept=".acsbackup,.json"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                />

                {restoreError && (
                  <p className="text-xs font-bold text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                    {restoreError}
                  </p>
                )}

                {pendingBackup && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                      <span>✓ Arquivo Validado Com Sucesso</span>
                      <span>Criado em: {new Date(pendingBackup.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>

                    <div className="text-xs text-slate-200 space-y-1">
                      <p>Conteúdo Encontrado no Arquivo:</p>
                      <div className="font-bold text-white flex gap-3">
                        <span>• {pendingBackup.summary.patientsCount} Pacientes</span>
                        <span>• {pendingBackup.summary.domicilesCount} Domicílios</span>
                        <span>• {pendingBackup.summary.visitsCount} Visitas</span>
                      </div>
                    </div>

                    {/* Restore Mode */}
                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-200">
                        <input
                          type="radio"
                          name="restoreMode"
                          value="replace"
                          checked={restoreMode === 'replace'}
                          onChange={() => setRestoreMode('replace')}
                          className="accent-amber-500"
                        />
                        <span>Substituir todos os dados atuais</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-200">
                        <input
                          type="radio"
                          name="restoreMode"
                          value="merge"
                          checked={restoreMode === 'merge'}
                          onChange={() => setRestoreMode('merge')}
                          className="accent-amber-500"
                        />
                        <span>Mesclar com cadastros existentes</span>
                      </label>
                    </div>

                    <button
                      onClick={() => handleExecuteRestore(pendingBackup)}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Confirmar e Restaurar Todos os Registros</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Automatic Local Snapshots */}
              {snapshots.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <History className="h-4 w-4 text-teal-400" />
                    <span>Histórico de Snapshots Locais Automáticos</span>
                  </div>

                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {snapshots.map((snap) => (
                      <div
                        key={snap.id}
                        className="bg-slate-800/50 border border-slate-700/50 p-3 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-200">{snap.date}</p>
                          <p className="text-[11px] text-slate-400">{snap.summaryText} ({snap.sizeKb} KB)</p>
                        </div>

                        <button
                          onClick={() => handleExecuteRestore(snap.data)}
                          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-teal-300 font-bold rounded-lg transition text-[11px] cursor-pointer"
                        >
                          Restaurar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* PIN Code Security Box */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-100 text-sm">
                    <KeyRound className="h-5 w-5 text-indigo-400" />
                    <span>Proteção por Senha / PIN de 4 Dígitos</span>
                  </div>

                  {appPin ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                      <LockKeyhole className="h-3.5 w-3.5" />
                      <span>PIN Ativo</span>
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-bold">
                      Sem PIN
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400">
                  Exige uma senha de 4 números sempre que o aplicativo for aberto no celular ou computador, evitando acessos não autorizados de terceiros aos dados dos pacientes.
                </p>

                {pinSuccessMsg && (
                  <p className="text-xs font-bold text-emerald-300 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/30">
                    ✓ {pinSuccessMsg}
                  </p>
                )}

                {pinErrorMsg && (
                  <p className="text-xs font-bold text-rose-300 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/30">
                    ⚠ {pinErrorMsg}
                  </p>
                )}

                <form onSubmit={handleSavePin} className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Digite novo PIN (4 números)
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        placeholder="Ex: 1234"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white text-center tracking-widest focus:outline-none focus:border-indigo-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Confirme o PIN
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value)}
                        placeholder="Ex: 1234"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white text-center tracking-widest focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
                    >
                      {appPin ? 'Alterar PIN' : 'Ativar Senha PIN'}
                    </button>

                    {appPin && (
                      <button
                        type="button"
                        onClick={handleRemovePin}
                        className="px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold rounded-xl text-xs transition cursor-pointer"
                      >
                        Desativar PIN
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* LGPD Compliance Overview */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <FileCheck className="h-4 w-4 text-emerald-400" />
                  <span>Conformidade LGPD & Criptografia do Armazenamento</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Todos os dados de saúde são mantidos estritamente sob o controle do Agente Comunitário de Saúde (Operador dos dados). O aplicativo segue as diretrizes da Lei nº 13.709/2018 (LGPD), assegurando confidencialidade total e armazenamento local no navegador/celular.
                </p>
              </div>

              {/* Danger Zone: Emergency Factory Reset */}
              <div className="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                  <Trash2 className="h-5 w-5" />
                  <span>Limpeza Geral de Dados (Reset)</span>
                </div>
                <p className="text-xs text-slate-300">
                  Apaga permanentemente todos os registros de pacientes, domicílios e visitas deste dispositivo. Certifique-se de ter um backup antes de executar.
                </p>

                {!isResetConfirmOpen ? (
                  <button
                    onClick={() => setIsResetConfirmOpen(true)}
                    className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    Iniciar Limpeza Geral
                  </button>
                ) : (
                  <div className="bg-rose-900/40 border border-rose-500/50 p-4 rounded-xl space-y-3">
                    <p className="text-xs font-bold text-rose-200">
                      Para confirmar a exclusão de todos os dados do dispositivo, digite a palavra <span className="text-white underline">EXCLUIR</span> abaixo:
                    </p>
                    <input
                      type="text"
                      value={resetConfirmationText}
                      onChange={(e) => setResetConfirmationText(e.target.value)}
                      placeholder="Digite EXCLUIR"
                      className="w-full bg-slate-900 border border-rose-500/60 rounded-xl px-3 py-2 text-xs font-bold text-white uppercase"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleExecuteReset}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                      >
                        Confirmar Exclusão Definitiva
                      </button>
                      <button
                        onClick={() => setIsResetConfirmOpen(false)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
