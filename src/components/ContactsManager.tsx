import React, { useState, useMemo } from 'react';
import { GoogleContact, CalendarEvent } from '../types';
import {
  Users,
  Tag,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Building,
  Calendar,
  ExternalLink,
  Edit2,
  Trash2,
  UserCheck,
  Sparkles
} from 'lucide-react';

interface ContactsManagerProps {
  contacts: GoogleContact[];
  onAddContact: (contact: GoogleContact) => void;
  onScheduleVisitForContact: (contact: GoogleContact) => void;
}

export const ContactsManager: React.FC<ContactsManagerProps> = ({
  contacts,
  onAddContact,
  onScheduleVisitForContact
}) => {
  const [selectedLabel, setSelectedLabel] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State for New Contact
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [labelsInput, setLabelsInput] = useState('Cliente, Rota Centro');
  const [notes, setNotes] = useState('');

  // Extract all unique labels/etiquetas
  const allLabels = useMemo(() => {
    const set = new Set<string>();
    contacts.forEach((c) => {
      c.labels.forEach((l) => set.add(l));
    });
    return Array.from(set);
  }, [contacts]);

  // Filter contacts
  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedLabel === 'todos') return true;
    return c.labels.includes(selectedLabel);
  });

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const labels = labelsInput
      .split(',')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const newContact: GoogleContact = {
      id: `cnt_${Date.now()}`,
      name,
      company,
      phone,
      email,
      address,
      labels: labels.length > 0 ? labels : ['Google Contatos'],
      notes,
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`
    };

    onAddContact(newContact);

    // Reset Form
    setIsAddModalOpen(false);
    setName('');
    setCompany('');
    setPhone('');
    setEmail('');
    setAddress('');
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Google Contatos (Etiquetas)</h2>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {contacts.length} Cadastrados
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Contatos etiquetados e sincronizados para integração rápida com Google Agenda e Google Maps.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition"
        >
          <Plus className="h-4 w-4" />
          Novo Contato com Etiqueta
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, empresa, telefone ou endereço..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800"
          />
        </div>

        {/* Labels / Etiquetas Chips Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-1 shrink-0">
            <Tag className="h-3.5 w-3.5" /> Etiquetas:
          </span>
          <button
            onClick={() => setSelectedLabel('todos')}
            className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition ${
              selectedLabel === 'todos'
                ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({contacts.length})
          </button>

          {allLabels.map((lbl) => {
            const count = contacts.filter((c) => c.labels.includes(lbl)).length;
            const isSelected = selectedLabel === lbl;

            return (
              <button
                key={lbl}
                onClick={() => setSelectedLabel(lbl)}
                className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap border transition ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 font-semibold shadow-sm'
                    : 'bg-emerald-50/70 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100'
                }`}
              >
                {lbl} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Contacts Cards Grid */}
      {filteredContacts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Nenhum contato encontrado</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Tente mudar o termo da busca ou selecione outra etiqueta.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Header Profile */}
                <div className="flex items-start gap-3">
                  {contact.avatarUrl ? (
                    <img
                      src={contact.avatarUrl}
                      alt={contact.name}
                      className="h-12 w-12 rounded-2xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-800 font-bold text-base flex items-center justify-center shrink-0">
                      {contact.name.charAt(0)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-900 truncate leading-snug">{contact.name}</h3>
                    {contact.company && (
                      <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                        <Building className="h-3 w-3 shrink-0" />
                        {contact.company}
                      </p>
                    )}
                  </div>
                </div>

                {/* Etiquetas Badges */}
                <div className="flex flex-wrap gap-1">
                  {contact.labels.map((lbl) => (
                    <span
                      key={lbl}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200"
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {lbl}
                    </span>
                  ))}
                </div>

                {/* Info Fields */}
                <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                  {contact.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <a
                        href={`tel:${contact.phone.replace(/\D/g, '')}`}
                        className="hover:text-blue-600 font-medium"
                      >
                        {contact.phone}
                      </a>
                    </div>
                  )}

                  {contact.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}

                  {contact.address && (
                    <div className="flex items-start gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100 mt-2">
                      <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span className="text-[11px] font-medium text-slate-700 line-clamp-2">
                        {contact.address}
                      </span>
                    </div>
                  )}

                  {contact.notes && (
                    <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-100 mt-2">
                      "{contact.notes}"
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={() => onScheduleVisitForContact(contact)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Agendar na Agenda
                </button>

                {contact.address && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl transition"
                    title="Ver no Google Maps"
                  >
                    <MapPin className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Contact Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                Novo Contato no Google Contatos
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateContact} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Empresa</label>
                  <input
                    type="text"
                    placeholder="Ex: Mercado Central"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Ex: (11) 99999-8888"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Endereço Completo (para Google Maps)</label>
                <input
                  type="text"
                  placeholder="Ex: Rua Augusta, 1200 - Consolação, São Paulo - SP"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Etiquetas (separadas por vírgula)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Cliente VIP, Rota Zona Sul, Prospect"
                  value={labelsInput}
                  onChange={(e) => setLabelsInput(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Anotações do Contato</label>
                <textarea
                  placeholder="Observações do perfil ou histórico..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 h-20 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition"
                >
                  Salvar Contato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
