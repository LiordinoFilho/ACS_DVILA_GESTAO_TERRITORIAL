import React, { useState } from 'react';
import { GoogleContact, Domicile, CalendarEvent } from '../types';
import { calculateAge, getContactStreet } from '../utils/exportUtils';
import {
  Share2,
  X,
  CheckCircle2,
  Copy,
  Download,
  Mail,
  Send,
  User,
  Users,
  Home,
  FileText,
  Check,
  Smartphone,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

interface SharePatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: GoogleContact | null;
  allContacts: GoogleContact[];
  domiciles: Domicile[];
  events: CalendarEvent[];
}

export const SharePatientModal: React.FC<SharePatientModalProps> = ({
  isOpen,
  onClose,
  patient,
  allContacts,
  domiciles,
  events
}) => {
  const [includePatient, setIncludePatient] = useState(true);
  const [includeFamily, setIncludeFamily] = useState(true);
  const [includeDomicile, setIncludeDomicile] = useState(true);
  const [includeRecords, setIncludeRecords] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !patient) return null;

  // Find linked Domicile
  const domicile = patient.domicileId
    ? domiciles.find((d) => d.id === patient.domicileId)
    : domiciles.find(
        (d) =>
          patient.address &&
          d.street &&
          patient.address.toLowerCase().includes(d.street.toLowerCase()) &&
          patient.addressNumber === d.number
      );

  // Find linked family members in same domicile or with matching domicileId/family
  const familyMembers = domicile
    ? allContacts.filter((c) => c.domicileId === domicile.id && c.id !== patient.id)
    : allContacts.filter(
        (c) =>
          c.id !== patient.id &&
          c.address &&
          patient.address &&
          c.address.toLowerCase() === patient.address.toLowerCase() &&
          c.addressNumber === patient.addressNumber
      );

  // Find visit history / calendar events for this patient
  const patientEvents = events.filter(
    (e) => e.contactId === patient.id || (e.contactName && e.contactName.toLowerCase() === patient.name.toLowerCase())
  );

  // Calculate age
  const age = calculateAge(patient.birthDate);
  const streetName = getContactStreet(patient, domiciles);

  // Helper to generate health profile text description
  const formatHealthProfileText = (c: GoogleContact) => {
    const hp = c.healthProfile;
    if (!hp) return 'Sem condições prioritization cadastradas';

    const conditions: string[] = [];
    if (hp.isPregnant) conditions.push(`Gestante (${hp.gestationalAgeWeeks || '?'} sem)`);
    if (hp.isPuerpera) conditions.push('Puérpera (Pós-parto)');
    if (hp.isHypertensive) conditions.push('Hipertenso (HAS)');
    if (hp.isDiabetic) conditions.push('Diabético (DM)');
    if (hp.isInsulinDependent) conditions.push('InsulinoDependente');
    if (hp.isBedridden) conditions.push('Acamado / Domiciliado');
    if (hp.isElderly) conditions.push('Idoso (60+)');
    if (hp.isChildUnder2) conditions.push('Criança (0-2 anos)');
    if (hp.hasSpecialNeeds) conditions.push('PCD / Deficiência');
    if (hp.hasMentalCondition) conditions.push('Saúde Mental');
    if (hp.hasAlcoholism) conditions.push('Álcool');
    if (hp.hasAsthma) conditions.push('Asma');
    if (hp.hasCancer) conditions.push('Câncer');
    if (hp.hasChronicDiseases) conditions.push('Doenças Crônicas');
    if (hp.hasCOPD) conditions.push('DPOC');
    if (hp.isBolsaFamilia) conditions.push('Bolsa Família');

    return conditions.length > 0 ? conditions.join(', ') : 'Hiperdia / Sem agravos graves';
  };

  // Generate plain text report formatted for WhatsApp / Mail / Clipboard
  const generateFormattedText = () => {
    const lines: string[] = [];
    lines.push(`📋 *FICHA DE TRANSFERÊNCIA DE PACIENTE DE ÁREA (e-SUS / ACS)*`);
    lines.push(`--------------------------------------------------`);
    lines.push(`📅 *Data da Transferência:* ${new Date().toLocaleDateString('pt-BR')}`);
    lines.push(`🏠 *Área / Microárea Origem:* ${patient.microarea || 'Microárea 01'}`);
    lines.push(``);

    if (includePatient) {
      lines.push(`👤 *1. PACIENTE INDIVIDUAL:*`);
      lines.push(`• *Nome:* ${patient.name}`);
      lines.push(`• *CNS / Cartão SUS:* ${patient.cns || 'Não informado'}`);
      lines.push(`• *CPF:* ${patient.cpf || 'Não informado'}`);
      lines.push(`• *Data de Nasc.:* ${patient.birthDate ? patient.birthDate.split('-').reverse().join('/') : '—'} ${age !== null ? `(${age} anos)` : ''}`);
      lines.push(`• *Gênero:* ${patient.gender || '—'}`);
      lines.push(`• *Mãe:* ${patient.motherName || 'Não informado'}`);
      lines.push(`• *Telefone / WhatsApp:* ${patient.phone || 'Não informado'}`);
      lines.push(`• *Condições de Saúde:* ${formatHealthProfileText(patient)}`);
      if (patient.notes || patient.healthProfile?.notes) {
        lines.push(`• *Anotações:* ${patient.notes || patient.healthProfile?.notes}`);
      }
      lines.push(``);
    }

    if (includeDomicile && domicile) {
      lines.push(`🏠 *2. DADOS DA MORADIA / DOMICÍLIO:*`);
      lines.push(`• *Endereço:* ${domicile.street}, Nº ${domicile.number} ${domicile.complement ? ' - ' + domicile.complement : ''}`);
      lines.push(`• *Bairro:* ${domicile.neighborhood || '—'} - CEP: ${domicile.zipCode || '—'}`);
      lines.push(`• *Microárea Domiciliar:* ${domicile.microarea}`);
      lines.push(`• *Tipo de Imóvel:* ${domicile.residenceType || 'Casa'}`);
      lines.push(`• *Abastecimento de Água:* ${domicile.waterSupply || 'Rede Encanada'}`);
      lines.push(`• *Saneamento:* ${domicile.sanitation || 'Rede Pública'}`);
      lines.push(`• *Animais no Domicílio:* ${domicile.hasPets ? `Sim (${domicile.petsDetail || 'Sim'})` : 'Não'}`);
      lines.push(``);
    } else if (includeDomicile && patient.address) {
      lines.push(`🏠 *2. DADOS DA MORADIA / ENDEREÇO:*`);
      lines.push(`• *Endereço:* ${patient.address} Nº ${patient.addressNumber || ''}`);
      lines.push(``);
    }

    if (includeFamily && familyMembers.length > 0) {
      lines.push(`👨‍👩‍👧‍👦 *3. MEMBROS DA FAMÍLIA VINCULADOS (${familyMembers.length}):*`);
      familyMembers.forEach((m, idx) => {
        lines.push(`  ${idx + 1}. *${m.name}*`);
        lines.push(`     - Parentesco: ${m.familyRelationship || 'Familiar'}`);
        lines.push(`     - CNS: ${m.cns || '—'}`);
        lines.push(`     - Nasc: ${m.birthDate ? m.birthDate.split('-').reverse().join('/') : '—'}`);
        lines.push(`     - Perfil de Saúde: ${formatHealthProfileText(m)}`);
      });
      lines.push(``);
    }

    if (includeRecords && patientEvents.length > 0) {
      lines.push(`📜 *4. HISTÓRICO DE VISITAS E REGISTROS (${patientEvents.length}):*`);
      patientEvents.forEach((e, idx) => {
        lines.push(`  ${idx + 1}. Data: ${e.date.split('-').reverse().join('/')} - Status: ${e.status.toUpperCase()}`);
        lines.push(`     Motivo: ${e.visitReason || e.title}`);
        if (e.observation) lines.push(`     Obs: "${e.observation}"`);
      });
      lines.push(``);
    }

    lines.push(`--------------------------------------------------`);
    lines.push(`📍 *ACS D'Vila - Sistema de Gestão Territorial de Saúde*`);
    return lines.join('\n');
  };

  // Generate complete JSON structure for exact file import
  const generateTransferJSON = () => {
    return {
      type: 'ACS_PATIENT_TRANSFER_PACKAGE',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      sourceMicroarea: patient.microarea || 'Microárea 01',
      includedOptions: {
        includePatient,
        includeFamily,
        includeDomicile,
        includeRecords
      },
      patient: includePatient ? patient : null,
      domicile: includeDomicile ? domicile || null : null,
      familyMembers: includeFamily ? familyMembers : [],
      visitHistory: includeRecords ? patientEvents : []
    };
  };

  // Channel Handler: WhatsApp
  const handleShareWhatsApp = () => {
    const text = generateFormattedText();
    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  // Channel Handler: E-mail
  const handleShareEmail = () => {
    const text = generateFormattedText();
    const subject = encodeURIComponent(`Transferência de Paciente e-SUS: ${patient.name}`);
    const body = encodeURIComponent(text);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
  };

  // Channel Handler: Clipboard Copy
  const handleCopyText = async () => {
    const text = generateFormattedText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  // Channel Handler: Web Share API
  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Transferência de Paciente: ${patient.name}`,
          text: generateFormattedText()
        });
      } catch (err) {
        console.log('Compartilhamento cancelado ou não suportado:', err);
      }
    } else {
      handleCopyText();
    }
  };

  // Channel Handler: JSON File Download
  const handleDownloadJSON = () => {
    const jsonPackage = generateTransferJSON();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(jsonPackage, null, 2));
    const downloadAnchor = document.createElement('a');
    const sanitizedName = patient.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `transferencia_paciente_${sanitizedName}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Channel Handler: vCard (.vcf) Download for 1-click Google Contacts import on mobile
  const handleDownloadVCard = () => {
    const vcards: string[] = [];

    const createVCardString = (c: GoogleContact, isMain = false) => {
      const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
      lines.push(`FN:${c.name}`);
      lines.push(`N:${c.name.split(' ').slice(1).join(' ') || ''};${c.name.split(' ')[0]};;;`);

      if (c.phone) {
        lines.push(`TEL;TYPE=CELL:${c.phone}`);
      }

      if (c.email) {
        lines.push(`EMAIL;TYPE=INTERNET:${c.email}`);
      }

      const fullAddress = c.address ? `${c.address}${c.addressNumber ? `, Nº ${c.addressNumber}` : ''}` : '';
      if (fullAddress) {
        lines.push(`ADR;TYPE=HOME:;;${c.address || ''} ${c.addressNumber || ''};${c.city || ''};${c.state || ''};${domicile?.zipCode || ''};Brasil`);
      }

      if (c.company) {
        lines.push(`ORG:${c.company}`);
      }

      const noteParts: string[] = [];
      if (c.cns) noteParts.push(`CNS: ${c.cns}`);
      if (c.microarea) noteParts.push(`Microárea: ${c.microarea}`);
      if (c.birthDate) noteParts.push(`Data Nasc: ${c.birthDate}`);
      if (c.gender) noteParts.push(`Gênero: ${c.gender}`);
      if (c.familyRelationship) noteParts.push(`Parentesco: ${c.familyRelationship}`);

      if (isMain) {
        if (includeRecords && patientEvents.length > 0) {
          noteParts.push(`Histórico Visitas: ${patientEvents.length} registros`);
        }
        if (includeDomicile && domicile) {
          noteParts.push(`Domicílio: ${domicile.street}, ${domicile.number}`);
        }
      }

      if (noteParts.length > 0) {
        lines.push(`NOTE:${noteParts.join(' | ')}`);
      }

      lines.push('END:VCARD');
      return lines.join('\r\n');
    };

    if (includePatient) {
      vcards.push(createVCardString(patient, true));
    }

    if (includeFamily && familyMembers.length > 0) {
      familyMembers.forEach((fm) => {
        vcards.push(createVCardString(fm, false));
      });
    }

    if (vcards.length === 0) return;

    const vcfContent = vcards.join('\r\n\r\n');
    const blob = new Blob([vcfContent], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    const sanitizedName = patient.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', `contato_${sanitizedName}.vcf`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in duration-150">
        
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center shrink-0">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold tracking-tight">Compartilhar / Transferir de Área</h3>
              <p className="text-[11px] text-slate-300">
                Transfira a ficha e histórico do munícipe para outro colega ACS.
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-800">
          
          {/* Target Patient Card Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Paciente Selecionado:</span>
              <p className="text-sm font-black text-slate-900">{patient.name}</p>
              <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                CNS: <strong>{patient.cns || 'Sem CNS'}</strong> • CPF: <strong>{patient.cpf || 'Sem CPF'}</strong>
              </p>
            </div>

            <div className="text-right font-mono text-[11px] bg-white px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="text-slate-500 block text-[9px] uppercase font-bold">Rua / Logradouro:</span>
              <strong className="text-emerald-800">{streetName}</strong>
            </div>
          </div>

          {/* Transfer Content Options Checkboxes */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-900">
              1. Selecione o que deseja incluir no pacote de compartilhamento:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Individual Patient */}
              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                  includePatient
                    ? 'bg-blue-50/80 border-blue-300 text-blue-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={includePatient}
                  onChange={(e) => setIncludePatient(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <div className="space-y-0.5">
                  <span className="text-xs flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-blue-600" />
                    Paciente Individual
                  </span>
                  <p className="text-[10px] text-slate-500 font-normal">
                    Ficha cadastral, CNS, CPF, contato e perfil de saúde do e-SUS.
                  </p>
                </div>
              </label>

              {/* Option 2: Family Members */}
              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                  includeFamily
                    ? 'bg-blue-50/80 border-blue-300 text-blue-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={includeFamily}
                  onChange={(e) => setIncludeFamily(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <div className="space-y-0.5">
                  <span className="text-xs flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-emerald-600" />
                    Membros da Família ({familyMembers.length})
                  </span>
                  <p className="text-[10px] text-slate-500 font-normal">
                    {familyMembers.length > 0
                      ? `Incluir ${familyMembers.length} dependente(s) vinculado(s).`
                      : 'Nenhum outro familiar encontrado.'}
                  </p>
                </div>
              </label>

              {/* Option 3: Domicile / Housing */}
              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                  includeDomicile
                    ? 'bg-blue-50/80 border-blue-300 text-blue-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={includeDomicile}
                  onChange={(e) => setIncludeDomicile(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <div className="space-y-0.5">
                  <span className="text-xs flex items-center gap-1">
                    <Home className="h-3.5 w-3.5 text-teal-600" />
                    Dados do Domicílio / Moradia
                  </span>
                  <p className="text-[10px] text-slate-500 font-normal">
                    Endereço completo, tipo de habitação, água e saneamento.
                  </p>
                </div>
              </label>

              {/* Option 4: Visit Records & History */}
              <label
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                  includeRecords
                    ? 'bg-blue-50/80 border-blue-300 text-blue-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <input
                  type="checkbox"
                  checked={includeRecords}
                  onChange={(e) => setIncludeRecords(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <div className="space-y-0.5">
                  <span className="text-xs flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-purple-600" />
                    Histórico de Visitas ({patientEvents.length})
                  </span>
                  <p className="text-[10px] text-slate-500 font-normal">
                    Registros e evolução das visitas domiciliares realizadas.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Formatted Text Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900">
                2. Pré-visualização do Texto de Transferência:
              </label>

              <button
                type="button"
                onClick={handleCopyText}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copiar Texto</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              readOnly
              value={generateFormattedText()}
              rows={6}
              className="w-full text-[11px] font-mono p-3 bg-slate-900 text-emerald-300 rounded-xl border border-slate-800 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Free Sharing Channels Actions Grid */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-900">
              3. Escolha o canal para enviar ao Agente de Saúde colega:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* WhatsApp Button */}
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="flex items-center justify-center gap-2 p-3 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-xl font-bold transition shadow-sm"
              >
                <Send className="h-4 w-4" />
                <span>Enviar pelo WhatsApp</span>
              </button>

              {/* Email Button */}
              <button
                type="button"
                onClick={handleShareEmail}
                className="flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-sm"
              >
                <Mail className="h-4 w-4" />
                <span>Enviar por E-mail</span>
              </button>

              {/* vCard (.VCF) Download for 1-click Mobile Contact Import */}
              <button
                type="button"
                onClick={handleDownloadVCard}
                className="flex items-center justify-center gap-2 p-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold transition shadow-sm"
                title="Gera arquivo .VCF nativo do Google Contatos/Celular. A pessoa clica no e-mail/arquivo no celular e adicione com 1 toque!"
              >
                <User className="h-4 w-4 text-teal-200" />
                <span>Baixar vCard (.VCF Celular)</span>
              </button>

              {/* JSON File Package Download (For direct import in colleague app) */}
              <button
                type="button"
                onClick={handleDownloadJSON}
                className="flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition shadow-sm"
                title="Baixa arquivo .JSON para o outro ACS importar direto no sistema"
              >
                <Download className="h-4 w-4 text-emerald-400" />
                <span>Baixar Pacote (.JSON)</span>
              </button>

              {/* Web Share API */}
              <button
                type="button"
                onClick={handleWebShare}
                className="flex items-center justify-center gap-2 p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold border border-slate-300 transition"
              >
                <Smartphone className="h-4 w-4 text-blue-600" />
                <span>Outros Aplicativos</span>
              </button>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>Dados protegidos para uso exclusivo de ACS/e-SUS.</span>
          </p>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
