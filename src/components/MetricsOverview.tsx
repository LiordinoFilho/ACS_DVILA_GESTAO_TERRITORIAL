import React, { useState } from 'react';
import { CalendarEvent, Domicile, GoogleContact } from '../types';
import { VISIT_STATUS_CONFIG } from './VisitStatusButtons';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Printer,
  Check,
  TrendingUp,
  FileText,
  Activity,
  Users,
  Home,
  HeartPulse,
  Baby,
  ShieldCheck,
  Share2
} from 'lucide-react';

interface MetricsOverviewProps {
  events: CalendarEvent[];
  selectedDate: string;
  domiciles?: Domicile[];
  contacts?: GoogleContact[];
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({
  events,
  selectedDate,
  domiciles = [],
  contacts = []
}) => {
  const [copied, setCopied] = useState(false);

  // Calculate visit metrics
  const totalVisits = events.length;
  const realizadas = events.filter((e) => e.status === 'realizada').length;
  const naoEncontradas = events.filter((e) => e.status === 'nao_encontrado').length;
  const pendentes = events.filter((e) => e.status === 'pendente').length;
  const reagendadas = events.filter((e) => e.status === 'reagendado').length;
  const canceladas = events.filter((e) => e.status === 'cancelado').length;

  const taxaSucesso = totalVisits > 0 ? Math.round((realizadas / totalVisits) * 100) : 0;

  // Calculate territory demographic & health indicators
  const totalPatients = contacts.length;
  const totalDomiciles = domiciles.length;
  const totalFamilies = domiciles.reduce((acc, d) => acc + (d.familyMembers?.length > 0 ? 1 : 0), 0);

  const totalGestantes = contacts.filter((c) => c.healthProfile?.isPregnant).length;
  const totalHipertensos = contacts.filter((c) => c.healthProfile?.isHypertensive).length;
  const totalDiabeticos = contacts.filter((c) => c.healthProfile?.isDiabetic).length;
  const totalAcamados = contacts.filter((c) => c.healthProfile?.isBedridden).length;
  const totalCriancas = contacts.filter((c) => c.healthProfile?.isChildUnder2).length;
  const totalIdosos = contacts.filter((c) => c.healthProfile?.isElderly).length;

  // Format date display
  const [y, m, d] = selectedDate.split('-');
  const dateFormatted = `${d}/${m}/${y}`;

  // Generate ACS Daily Activity Report Text (for WhatsApp/USF)
  const generateReportText = () => {
    let text = `🏥 *RELATÓRIO DIÁRIO DE ATIVIDADES DO ACS*\n`;
    text += `📅 *Data:* ${dateFormatted}\n`;
    text += `🏘️ *Território:* ${totalDomiciles} Domicílios | ${totalPatients} Munícipes Cadastrados\n\n`;

    text += `📊 *RESUMO DAS VISITAS DOMICILIARES:*\n`;
    text += `• Total Programado: ${totalVisits}\n`;
    text += `• Realizadas: ${realizadas} (${taxaSucesso}% de cobertura)\n`;
    text += `• Recusados / Ausentes: ${naoEncontradas}\n`;
    text += `• Pendentes: ${pendentes}\n\n`;

    text += `🎯 *ACOMPANHAMENTOS PRIORITÁRIOS NO TERRITÓRIO:*\n`;
    text += `• 🤰 Gestantes: ${totalGestantes}\n`;
    text += `• 🩺 Hipertensos (HAS): ${totalHipertensos}\n`;
    text += `• 🩸 Diabéticos (DM): ${totalDiabeticos}\n`;
    text += `• 🛏️ Acamados/Domiciliados: ${totalAcamados}\n`;
    text += `• 👶 Crianças (0-2 anos): ${totalCriancas}\n\n`;

    text += `📋 *DETALHAMENTO DAS VISITAS DO DIA:*\n`;
    events.forEach((ev, idx) => {
      const statusLabel = VISIT_STATUS_CONFIG[ev.status]?.label || ev.status;
      text += `\n${idx + 1}. *${ev.title}* [${ev.startTime}]\n`;
      text += `   📍 Endereço: ${ev.address}\n`;
      if (ev.visitReason) text += `   📋 Motivo: ${ev.visitReason}\n`;
      text += `   🏷️ Status: *${statusLabel}*\n`;
      if (ev.observation) text += `   💬 Obs: ${ev.observation}\n`;
    });

    return text;
  };

  const handleCopyReport = () => {
    const text = generateReportText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Indicadores de Saúde & Relatórios e-SUS</h2>
          <p className="text-xs text-slate-500 mt-1">
            Painel consolidado do ACS para prestação de contas na Unidade Saúde da Família (USF).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyReport}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Relatório Copiado!' : 'Copiar Relatório para WhatsApp/USF'}
          </button>

          <button
            onClick={handlePrint}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition"
            title="Imprimir Relatório Diário"
          >
            <Printer className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Territory Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cadastrados */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Munícipes Cadastrados</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{totalPatients}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Cadastros Individuais</p>
          </div>
          <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
            <Users className="h-5 w-5" />
          </div>
        </div>

        {/* Domicílios */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Domicílios Mapeados</p>
            <h3 className="text-2xl font-black text-teal-600 mt-1">{totalDomiciles}</h3>
            <p className="text-[10px] text-teal-700 font-semibold mt-0.5">{totalFamilies} famílias agrupadas</p>
          </div>
          <div className="h-10 w-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center font-bold">
            <Home className="h-5 w-5" />
          </div>
        </div>

        {/* Visitas Concluídas */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Visitas do Dia ({dateFormatted})</p>
            <h3 className="text-2xl font-black text-blue-600 mt-1">{realizadas} / {totalVisits}</h3>
            <p className="text-[10px] text-blue-700 font-semibold mt-0.5">{taxaSucesso}% de conclusão</p>
          </div>
          <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* Grupos de Risco */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Público Prioritário</p>
            <h3 className="text-2xl font-black text-purple-600 mt-1">
              {totalGestantes + totalHipertensos + totalDiabeticos + totalAcamados}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Gestantes, HAS, DM, Acamados</p>
          </div>
          <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold">
            <HeartPulse className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Health Priority Breakdown Cards */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-600" />
          Mapeamento do Perfil Epidemiológico do Território
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-200 text-center space-y-1">
            <span className="text-lg">🤰</span>
            <p className="text-lg font-black text-purple-900">{totalGestantes}</p>
            <p className="text-[11px] font-bold text-purple-700">Gestantes</p>
          </div>

          <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-center space-y-1">
            <span className="text-lg">🩺</span>
            <p className="text-lg font-black text-amber-900">{totalHipertensos}</p>
            <p className="text-[11px] font-bold text-amber-700">Hipertensos</p>
          </div>

          <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 text-center space-y-1">
            <span className="text-lg">🩸</span>
            <p className="text-lg font-black text-blue-900">{totalDiabeticos}</p>
            <p className="text-[11px] font-bold text-blue-700">Diabéticos</p>
          </div>

          <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 text-center space-y-1">
            <span className="text-lg">🛏️</span>
            <p className="text-lg font-black text-rose-900">{totalAcamados}</p>
            <p className="text-[11px] font-bold text-rose-700">Acamados</p>
          </div>

          <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-center space-y-1">
            <span className="text-lg">👶</span>
            <p className="text-lg font-black text-emerald-900">{totalCriancas}</p>
            <p className="text-[11px] font-bold text-emerald-700">Crianças (0-2a)</p>
          </div>

          <div className="bg-slate-100 p-3.5 rounded-xl border border-slate-200 text-center space-y-1">
            <span className="text-lg">👴</span>
            <p className="text-lg font-black text-slate-900">{totalIdosos}</p>
            <p className="text-[11px] font-bold text-slate-700">Idosos (60+)</p>
          </div>
        </div>
      </div>

      {/* Detailed Visit Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Listagem Completa de Visitas do Dia ({dateFormatted})</h3>
          <span className="text-xs font-mono text-slate-500 font-semibold">{events.length} Registros</span>
        </div>

        <div className="divide-y divide-slate-100 overflow-x-auto">
          {events.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              Nenhuma visita agendada nesta data.
            </div>
          ) : (
            events.map((ev, i) => (
              <div key={ev.id} className="p-4 hover:bg-slate-50/80 transition flex items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">#{i + 1}</span>
                    <p className="text-xs font-bold text-slate-900 truncate">{ev.title}</p>
                    <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {ev.startTime} - {ev.endTime}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">{ev.address}</p>
                  {ev.observation && (
                    <p className="text-xs text-blue-700 bg-blue-50/70 px-2.5 py-1 rounded-lg border border-blue-100 inline-block font-medium">
                      Obs: {ev.observation}
                    </p>
                  )}
                </div>

                <span className="text-xs font-bold capitalize px-3 py-1 rounded-full bg-slate-100 text-slate-800 shrink-0">
                  {ev.status.replace('_', ' ')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
