import React, { useState } from 'react';
import { GoogleContact, Domicile, CalendarEvent } from '../types';
import { FileUp, X, CheckCircle2, AlertCircle, UserCheck, Home, FileText, Upload } from 'lucide-react';

interface ImportSharedDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (imported: {
    contacts: GoogleContact[];
    domiciles: Domicile[];
    events: CalendarEvent[];
  }) => void;
}

export const ImportSharedDataModal: React.FC<ImportSharedDataModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const [jsonText, setJsonText] = useState('');
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Process File Upload (.json)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        setJsonText(content);
        validateAndParse(content);
      } catch (err) {
        setErrorMessage('Erro ao ler o arquivo selecionado.');
      }
    };
    reader.readAsText(file);
  };

  const validateAndParse = (text: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const data = JSON.parse(text);
      if (data.type === 'ACS_PATIENT_TRANSFER_PACKAGE' || data.patient) {
        setParsedData(data);
      } else {
        setErrorMessage('Formato de arquivo inválido. O arquivo deve ser um pacote de transferência ACS.');
        setParsedData(null);
      }
    } catch (e) {
      setErrorMessage('Conteúdo JSON inválido. Certifique-se de ter enviado um arquivo válido.');
      setParsedData(null);
    }
  };

  const handleConfirmImport = () => {
    if (!parsedData) return;

    const newContacts: GoogleContact[] = [];
    const newDomiciles: Domicile[] = [];
    const newEvents: CalendarEvent[] = [];

    // 1. Patient
    if (parsedData.patient) {
      newContacts.push(parsedData.patient);
    }

    // 2. Family members
    if (parsedData.familyMembers && Array.isArray(parsedData.familyMembers)) {
      parsedData.familyMembers.forEach((m: GoogleContact) => {
        if (!newContacts.some((c) => c.id === m.id)) {
          newContacts.push(m);
        }
      });
    }

    // 3. Domicile
    if (parsedData.domicile) {
      newDomiciles.push(parsedData.domicile);
    }

    // 4. Visit history
    if (parsedData.visitHistory && Array.isArray(parsedData.visitHistory)) {
      newEvents.push(...parsedData.visitHistory);
    }

    onImportSuccess({
      contacts: newContacts,
      domiciles: newDomiciles,
      events: newEvents
    });

    setSuccessMessage(`Importação concluída com sucesso! ${newContacts.length} munícipe(s) e ${newDomiciles.length} moradia(s) adicionados.`);
    setTimeout(() => {
      onClose();
      setParsedData(null);
      setJsonText('');
      setSuccessMessage(null);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
              <FileUp className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold tracking-tight">Importar Ficha Compartilhada de Colega</h3>
              <p className="text-[11px] text-slate-300">
                Recebeu uma ficha de outro ACS? Carregue o arquivo .JSON recebido.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs text-slate-800 overflow-y-auto">
          {successMessage ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <h4 className="text-base font-bold text-emerald-950">Sucesso!</h4>
              <p className="text-xs text-emerald-800 font-medium">{successMessage}</p>
            </div>
          ) : (
            <>
              {/* File Drop / Select Area */}
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:bg-slate-50 transition relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-800">Clique para selecionar o arquivo .JSON recebido</p>
                <p className="text-[10px] text-slate-500 mt-0.5">ou arraste a ficha de transferência aqui</p>
              </div>

              {/* Text Area fallback */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">
                  Ou cole o código JSON da ficha aqui:
                </label>
                <textarea
                  rows={4}
                  value={jsonText}
                  onChange={(e) => {
                    setJsonText(e.target.value);
                    validateAndParse(e.target.value);
                  }}
                  placeholder='Cole o texto formatado JSON...'
                  className="w-full text-[11px] font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2 text-xs font-medium">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Parsed Data Preview */}
              {parsedData && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                  <h4 className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Ficha Reconhecida com Sucesso!
                  </h4>

                  <div className="space-y-1 text-[11px] text-slate-700 font-medium">
                    {parsedData.patient && (
                      <p className="flex items-center gap-1.5 font-bold text-slate-900">
                        <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                        Paciente: {parsedData.patient.name} (CNS: {parsedData.patient.cns || '—'})
                      </p>
                    )}

                    {parsedData.domicile && (
                      <p className="flex items-center gap-1.5">
                        <Home className="h-3.5 w-3.5 text-teal-600" />
                        Moradia: {parsedData.domicile.street}, Nº {parsedData.domicile.number}
                      </p>
                    )}

                    {parsedData.familyMembers?.length > 0 && (
                      <p className="flex items-center gap-1.5">
                        👨‍👩‍👧‍👦 {parsedData.familyMembers.length} membro(s) familiar(es) incluído(s)
                      </p>
                    )}

                    {parsedData.visitHistory?.length > 0 && (
                      <p className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-purple-600" />
                        {parsedData.visitHistory.length} registro(s) de visita e histórico
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!successMessage && (
          <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
            >
              Cancelar
            </button>

            <button
              disabled={!parsedData}
              onClick={handleConfirmImport}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition"
            >
              Confirmar Importação no Sistema
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
