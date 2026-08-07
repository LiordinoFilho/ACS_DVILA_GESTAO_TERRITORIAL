import React, { useState } from 'react';
import { CalendarEvent, GoogleContact, Domicile, DomicileMember } from '../types';
import { VISIT_STATUS_CONFIG } from './VisitStatusButtons';
import {
  Printer,
  Copy,
  Check,
  FileText,
  User,
  Home,
  Users,
  MapPin,
  Calendar,
  Clock,
  Activity,
  Sparkles,
  Phone,
  ShieldCheck,
  X,
  Cross,
  MapPinOff,
  Building2
} from 'lucide-react';

interface VisitSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent;
  contacts: GoogleContact[];
  domiciles: Domicile[];
}

export const VisitSummaryModal: React.FC<VisitSummaryModalProps> = ({
  isOpen,
  onClose,
  event,
  contacts,
  domiciles
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const scheduledContact = contacts.find((c) => c.id === event.contactId || c.name === event.contactName);
  const scheduledDomicile = domiciles.find(
    (d) => d.id === event.domicileId || d.id === scheduledContact?.domicileId || `${d.street}, ${d.number}`.toLowerCase().includes(event.address.toLowerCase())
  );

  const familyMembers: DomicileMember[] = scheduledDomicile?.familyMembers || (scheduledContact ? [
    {
      patientId: scheduledContact.id,
      patientName: scheduledContact.name,
      relationship: scheduledContact.familyRelationship || 'Responsável Familiar',
      isHeadOfHousehold: scheduledContact.isHeadOfHousehold ?? true,
      cns: scheduledContact.cns,
      birthDate: scheduledContact.birthDate,
      phone: scheduledContact.phone
    }
  ] : []);

  const statusConfig = VISIT_STATUS_CONFIG[event.status] || VISIT_STATUS_CONFIG.realizada;

  // Print function with standalone window fallback for PDF saving
  const handlePrint = () => {
    try {
      const printElement = document.getElementById('printable-visit-summary');
      if (!printElement) {
        window.focus();
        window.print();
        return;
      }

      const printWindow = window.open('', '_blank', 'width=900,height=850');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <title>Resumo Visita - ${event.contactName || event.title}</title>
              <script src="https://cdn.tailwindcss.com"></script>
              <style>
                @media print {
                  body { padding: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  .no-print { display: none !important; }
                }
                body { font-family: system-ui, -apple-system, sans-serif; background: #ffffff; color: #0f172a; padding: 24px; }
              </style>
            </head>
            <body>
              <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 12px 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                <span style="font-weight: bold; font-size: 14px; color: #334155;">📄 Resumo de Visita Domiciliar ACS (e-SUS)</span>
                <div>
                  <button onclick="window.print()" style="background: #059669; color: white; border: none; padding: 10px 18px; font-weight: bold; font-size: 13px; border-radius: 10px; cursor: pointer; margin-right: 8px;">
                    🖨️ Imprimir / Salvar como PDF
                  </button>
                  <button onclick="window.close()" style="background: #475569; color: white; border: none; padding: 10px 18px; font-weight: bold; font-size: 13px; border-radius: 10px; cursor: pointer;">
                    Fechar
                  </button>
                </div>
              </div>
              <div>${printElement.innerHTML}</div>
              <script>
                setTimeout(() => {
                  window.focus();
                  window.print();
                }, 600);
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        window.focus();
        window.print();
      }
    } catch (err) {
      console.error("Print error:", err);
      window.focus();
      window.print();
    }
  };

  // Copy structured report to clipboard for e-SUS copy-pasting
  const handleCopyReport = () => {
    let reportText = `=== FICHA DE RESUMO DE VISITA DOMICILIAR (e-SUS / SISAB) ===\n`;
    reportText += `Data: ${event.date} | Horário: ${event.startTime} - ${event.endTime}\n`;
    reportText += `Motivo da Visita: ${event.visitReason || 'Acompanhamento de Rotina'}\n`;
    reportText += `Resultado: ${statusConfig.label}\n`;
    reportText += `Endereço: ${event.address}\n`;
    if (event.observation) {
      reportText += `Observações da Visita: ${event.observation}\n`;
    }
    reportText += `\n--- DADOS DOS MORADORES RESIDENTES (${familyMembers.length}) ---\n\n`;

    familyMembers.forEach((m, idx) => {
      const contact = contacts.find((c) => c.id === m.patientId || c.name === m.patientName);
      const hp = contact?.healthProfile;

      reportText += `MORADOR ${idx + 1}: ${m.patientName}\n`;
      reportText += `• Parentesco: ${m.relationship} ${m.isHeadOfHousehold ? '(Responsável Familiar)' : ''}\n`;
      if (m.cns || contact?.cns) reportText += `• CNS (Cartão SUS): ${contact?.cns || m.cns}\n`;
      if (contact?.cpf) reportText += `• CPF: ${contact.cpf}\n`;
      if (contact?.birthDate || m.birthDate) reportText += `• Data Nasc.: ${contact?.birthDate || m.birthDate}\n`;
      if (contact?.gender) reportText += `• Sexo: ${contact.gender}\n`;
      if (contact?.motherName) reportText += `• Nome da Mãe: ${contact.motherName}\n`;
      if (contact?.phone || m.phone) reportText += `• Telefone: ${contact?.phone || m.phone}\n`;

      if (hp || contact?.labels) {
        const conditions: string[] = [];
        const labels = contact?.labels || [];
        if (labels.includes('Óbito')) conditions.push('Óbito (Cadastro Dispensado)');
        if (labels.includes('Não mora mais no território')) conditions.push('Não mora mais no território (Dispensado)');
        if (labels.includes('Não mora mais no Município') || labels.includes('Não mora mais no domicílio')) conditions.push('Não mora mais no Município (Dispensado)');
        if (hp?.isPregnant) conditions.push(`Gestante (${hp.gestationalAgeWeeks ? hp.gestationalAgeWeeks + ' sem' : ''})`);
        if (hp?.isPuerpera) conditions.push('Puérpera');
        if (hp?.isHypertensive) conditions.push('Hipertenso (HAS)');
        if (hp?.isDiabetic) conditions.push('Diabético (DM)');
        if (hp?.isInsulinDependent) conditions.push('InsulinoDependente');
        if (hp?.isBedridden) conditions.push('Acamado');
        if (hp?.isElderly) conditions.push('Idoso (60+)');
        if (hp?.isChildUnder2) conditions.push('Criança (0-2a)');
        if (hp?.hasAsthma) conditions.push('Asma');
        if (hp?.hasCOPD) conditions.push('DPOC');
        if (hp?.hasCancer) conditions.push('Câncer');
        if (hp?.hasHanseniasis) conditions.push('Hanseníase');
        if (hp?.hasSyphilis) conditions.push('Sífilis');
        if (hp?.hasTuberculosis) conditions.push('Tuberculose');
        if (hp?.isBolsaFamilia) conditions.push('Bolsa Família');

        if (conditions.length > 0) {
          reportText += `• Condições e Situação e-SUS: ${conditions.join(', ')}\n`;
        }
      }
      reportText += `\n`;
    });

    if (scheduledDomicile) {
      reportText += `--- INFRAESTRUTURA DOMICILIAR ---\n`;
      reportText += `• Tipo Residência: ${scheduledDomicile.residenceType}\n`;
      reportText += `• Posse: ${scheduledDomicile.ownership}\n`;
      reportText += `• Água: ${scheduledDomicile.waterSupply}\n`;
      reportText += `• Saneamento: ${scheduledDomicile.sanitation}\n`;
      reportText += `• Lixo: ${scheduledDomicile.garbageCollection}\n`;
      reportText += `• Energia: ${scheduledDomicile.hasElectricity ? 'Sim' : 'Não'}\n`;
    }

    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="bg-white rounded-3xl max-w-4xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Header - Hidden on Print */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 flex items-center justify-between gap-4 border-b border-blue-800 shrink-0 print:hidden">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-blue-500/20 text-blue-200 text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg border border-blue-400/30">
                📋 FICHA RESUMO DA VISITA DOMICILIAR
              </span>
              <span className="text-xs text-blue-200">Pronto para Lançamento e-SUS / SISAB</span>
            </div>
            <h2 className="text-lg font-extrabold text-white">
              Resumo do Atendimento & Dados dos Moradores
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReport}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
              title="Copiar texto estruturado para colar no e-SUS"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copiado!' : 'Copiar e-SUS'}
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Printer className="h-4 w-4" />
              Salvar em PDF / Imprimir
            </button>

            <button
              onClick={onClose}
              className="px-3 py-2 text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
              title="Fechar Janela"
            >
              <X className="h-4 w-4" />
              <span className="hidden sm:inline">Fechar</span>
            </button>
          </div>
        </div>

        {/* Printable Report Content */}
        <div id="printable-visit-summary" className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50 print:bg-white print:p-8 print:space-y-4">
          {/* Header Report Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:border-slate-300 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Relatório Oficial de Acompanhamento ACS
                </span>
                <h1 className="text-xl font-black text-slate-900 mt-1">{event.title}</h1>
                <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  {event.address}
                </p>
              </div>

              <div className="text-right sm:text-right flex sm:flex-col items-center sm:items-end justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                  {statusConfig.icon}
                  {statusConfig.label}
                </span>
                <span className="text-xs font-mono text-slate-500 font-bold">
                  Data: {event.date} ({event.startTime} - {event.endTime})
                </span>
              </div>
            </div>

            {/* Visit Reason & Observation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">Motivo do Agendamento / Visita</span>
                <span className="text-xs font-extrabold text-slate-900 mt-0.5 block">{event.visitReason || 'Visita Domiciliar de Acompanhamento'}</span>
              </div>

              <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                <span className="text-[11px] font-bold text-emerald-800 uppercase block">Observação Registrada na Visita</span>
                <span className="text-xs font-medium text-emerald-950 mt-0.5 block">{event.observation || 'Atendimento realizado sem intercorrências atípicas.'}</span>
              </div>
            </div>
          </div>

          {/* Resident List with Highlighted Data */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                Ficha Cadastral e de Saúde dos Moradores ({familyMembers.length})
              </h3>
              <span className="text-xs text-slate-500 font-semibold print:hidden">
                ✨ Destaques em verde indicam dados atualizados no atendimento
              </span>
            </div>

            {familyMembers.length === 0 ? (
              <div className="p-6 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
                Nenhum morador registrado no domicílio.
              </div>
            ) : (
              <div className="space-y-4">
                {familyMembers.map((member, index) => {
                  const contact = contacts.find((c) => c.id === member.patientId || c.name === member.patientName);
                  const hp = contact?.healthProfile;

                  return (
                    <div
                      key={member.patientId || member.patientName || index}
                      className="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-xs print:border-slate-300 space-y-4 relative overflow-hidden"
                    >
                      {/* Top Bar of Resident Card */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-extrabold text-xs">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                              {member.patientName}
                              {member.isHeadOfHousehold && (
                                <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-200">
                                  👑 Chefe de Família
                                </span>
                              )}
                            </h4>
                            <span className="text-xs text-slate-500 font-medium">
                              Relação Familiar: <strong className="text-slate-800">{member.relationship}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-lg border border-emerald-300 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            Pronto p/ e-SUS
                          </span>
                        </div>
                      </div>

                      {/* Personal Identification Details Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">Cartão SUS / CNS</span>
                          <span className="font-mono font-extrabold text-slate-900 block mt-0.5">
                            {contact?.cns || member.cns || 'Não informado'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">CPF</span>
                          <span className="font-mono font-extrabold text-slate-900 block mt-0.5">
                            {contact?.cpf || 'Não informado'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">Data de Nascimento</span>
                          <span className="font-bold text-slate-900 block mt-0.5">
                            {contact?.birthDate || member.birthDate || 'Não informada'}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">Sexo / Telefone</span>
                          <span className="font-bold text-slate-900 block mt-0.5">
                            {contact?.gender || 'N/I'} • {contact?.phone || member.phone || 'S/ Tel'}
                          </span>
                        </div>

                        {contact?.motherName && (
                          <div className="col-span-2 sm:col-span-4 border-t border-slate-200/60 pt-2 mt-1">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">Nome da Mãe</span>
                            <span className="font-semibold text-slate-900 block">{contact.motherName}</span>
                          </div>
                        )}
                      </div>

                      {/* e-SUS Health Profile Badges & Conditions */}
                      <div className="space-y-2">
                        <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block flex items-center gap-1.5">
                          <Activity className="h-3.5 w-3.5 text-emerald-600" />
                          Condições Clínicas e Acompanhamento e-SUS:
                        </span>

                        <div className="flex flex-wrap gap-1.5">
                          {contact?.labels?.includes('Óbito') && (
                            <span className="bg-zinc-900 text-white text-xs font-extrabold px-2.5 py-1 rounded-lg border border-zinc-950 flex items-center gap-1 shadow-xs">
                              <Cross className="h-3 w-3 text-zinc-300" /> Óbito (Cadastro Dispensado)
                            </span>
                          )}
                          {contact?.labels?.includes('Não mora mais no território') && (
                            <span className="bg-sky-600 text-white text-xs font-extrabold px-2.5 py-1 rounded-lg border border-sky-700 flex items-center gap-1 shadow-xs">
                              <MapPinOff className="h-3 w-3" /> Não mora mais no território
                            </span>
                          )}
                          {(contact?.labels?.includes('Não mora mais no Município') || contact?.labels?.includes('Não mora mais no domicílio')) && (
                            <span className="bg-indigo-600 text-white text-xs font-extrabold px-2.5 py-1 rounded-lg border border-indigo-700 flex items-center gap-1 shadow-xs">
                              <Building2 className="h-3 w-3" /> Não mora mais no Município
                            </span>
                          )}
                          {hp?.isPregnant && (
                            <span className="bg-pink-100 text-pink-900 text-xs font-extrabold px-2.5 py-1 rounded-lg border border-pink-300 flex items-center gap-1">
                              🤰 Gestante {hp.gestationalAgeWeeks ? `(${hp.gestationalAgeWeeks} sem)` : ''}
                            </span>
                          )}
                          {hp?.isPuerpera && (
                            <span className="bg-pink-100 text-pink-900 text-xs font-extrabold px-2.5 py-1 rounded-lg border border-pink-300">
                              🌸 Puérpera
                            </span>
                          )}
                          {hp?.isHypertensive && (
                            <span className="bg-red-100 text-red-900 text-xs font-extrabold px-2.5 py-1 rounded-lg border border-red-300">
                              🩺 Hipertenso (HAS)
                            </span>
                          )}
                          {hp?.isDiabetic && (
                            <span className="bg-amber-100 text-amber-900 text-xs font-extrabold px-2.5 py-1 rounded-lg border border-amber-300">
                              🩸 Diabético (DM)
                            </span>
                          )}
                          {hp?.isInsulinDependent && (
                            <span className="bg-amber-100 text-amber-900 text-xs font-extrabold px-2.5 py-1 rounded-lg border border-amber-300">
                              💉 InsulinoDependente
                            </span>
                          )}
                          {hp?.isBedridden && (
                            <span className="bg-purple-100 text-purple-900 text-xs font-extrabold px-2.5 py-1 rounded-lg border border-purple-300">
                              🛏️ Acamado / Domiciliado
                            </span>
                          )}
                          {hp?.isElderly && (
                            <span className="bg-emerald-100 text-emerald-900 text-xs font-extrabold px-2.5 py-1 rounded-lg border border-emerald-300">
                              👴 Idoso (60+ anos)
                            </span>
                          )}
                          {hp?.isChildUnder2 && (
                            <span className="bg-blue-100 text-blue-900 text-xs font-extrabold px-2.5 py-1 rounded-lg border border-blue-300">
                              👶 Criança (0-2 anos)
                            </span>
                          )}
                          {hp?.hasAsthma && (
                            <span className="bg-teal-100 text-teal-900 text-xs font-bold px-2.5 py-1 rounded-lg border border-teal-300">
                              🫁 Asma
                            </span>
                          )}
                          {hp?.hasCOPD && (
                            <span className="bg-teal-100 text-teal-900 text-xs font-bold px-2.5 py-1 rounded-lg border border-teal-300">
                              🫁 DPOC
                            </span>
                          )}
                          {hp?.hasCancer && (
                            <span className="bg-rose-100 text-rose-900 text-xs font-bold px-2.5 py-1 rounded-lg border border-rose-300">
                              🧬 Câncer
                            </span>
                          )}
                          {hp?.hasHanseniasis && (
                            <span className="bg-orange-100 text-orange-900 text-xs font-bold px-2.5 py-1 rounded-lg border border-orange-300">
                              🦠 Hanseníase
                            </span>
                          )}
                          {hp?.hasSyphilis && (
                            <span className="bg-orange-100 text-orange-900 text-xs font-bold px-2.5 py-1 rounded-lg border border-orange-300">
                              🦠 Sífilis
                            </span>
                          )}
                          {hp?.hasTuberculosis && (
                            <span className="bg-orange-100 text-orange-900 text-xs font-bold px-2.5 py-1 rounded-lg border border-orange-300">
                              🦠 Tuberculose
                            </span>
                          )}
                          {hp?.isBolsaFamilia && (
                            <span className="bg-sky-100 text-sky-900 text-xs font-bold px-2.5 py-1 rounded-lg border border-sky-300">
                              🏷️ Bolsa Família
                            </span>
                          )}

                          {!hp?.isPregnant &&
                            !hp?.isPuerpera &&
                            !hp?.isHypertensive &&
                            !hp?.isDiabetic &&
                            !hp?.isBedridden &&
                            !hp?.isElderly &&
                            !hp?.isChildUnder2 && (
                              <span className="text-xs text-slate-500 italic bg-slate-100 px-2.5 py-1 rounded-lg">
                                Sem agravos / acompanhamento de rotina habitual
                              </span>
                            )}
                        </div>

                        {hp?.notes && (
                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 mt-2">
                            <strong>Anotações do Morador:</strong> {hp.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Domicile Infrastructure Summary */}
          {scheduledDomicile && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs print:border-slate-300 space-y-3">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Home className="h-4 w-4 text-emerald-600" />
                Dados do Domicílio e Condições Sanitárias
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Tipo Domicílio</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{scheduledDomicile.residenceType}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Situação de Posse</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{scheduledDomicile.ownership}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Água</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{scheduledDomicile.waterSupply}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Saneamento / Esgoto</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{scheduledDomicile.sanitation}</span>
                </div>
              </div>
            </div>
          )}

          {/* Signature / Official e-SUS Footer for Print */}
          <div className="hidden print:block pt-8 text-center text-xs text-slate-500 space-y-2 border-t border-slate-200 mt-8">
            <p>____________________________________________________</p>
            <p className="font-bold text-slate-800">Assinatura do Agente Comunitário de Saúde (ACS)</p>
            <p>e-SUS Atenção Primária à Saúde • Sistema Oficial do SUS</p>
          </div>
        </div>

        {/* Modal Sticky Footer Bar - Always visible & hidden on print */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold rounded-xl text-xs transition border border-slate-700 flex items-center gap-2 shadow-sm"
          >
            <X className="h-4 w-4 text-slate-400" />
            Fechar Janela de Resumo
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopyReport}
              className="px-4 py-2.5 bg-blue-900/80 hover:bg-blue-800 text-blue-200 border border-blue-700/60 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copiado p/ e-SUS!' : 'Copiar e-SUS'}
            </button>

            <button
              onClick={handlePrint}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl text-xs transition shadow-lg shadow-emerald-600/30 flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Salvar em PDF / Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
