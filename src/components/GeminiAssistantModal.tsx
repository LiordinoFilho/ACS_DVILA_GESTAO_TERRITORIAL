import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, X, User, Loader2, Info, ShieldCheck, HelpCircle, FileText, CheckCircle2, AlertTriangle, RefreshCw, Copy, Check } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

interface GeminiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextData?: {
    domicilesCount?: number;
    patientsCount?: number;
    todayVisitsCount?: number;
    microarea?: string;
  };
}

const QUICK_PROMPTS = [
  "Como registrar corretamente a Visita Domiciliar (VD) no e-SUS?",
  "Quais os sinais de alerta para visitas em gestantes?",
  "Como priorizar a rotina de visitas para idosos e acamados?",
  "Dicas para prevenção de Dengue e orientações para o munícipe",
  "O que verificar na visita de puerpério e recém-nascido?"
];

export const GeminiAssistantModal: React.FC<GeminiAssistantModalProps> = ({
  isOpen,
  onClose,
  contextData
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      content: 'Olá, Agente Comunitário de Saúde! Sou o **Agente Aguiar IA**, seu assistente virtual especializado em Atenção Primária à Saúde e e-SUS.\n\nComo posso ajudar seu trabalho no território hoje? Pode me perguntar sobre fichas de cadastro, acompanhamento de gestantes, hipertensos, acamados ou protocolos de visita domiciliar.',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          contextData
        })
      });

      const resText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(resText);
      } catch (e) {
        throw new Error(
          response.ok
            ? 'Resposta em formato inválido do servidor.'
            : 'O servidor do Agente Aguiar IA está indisponível ou configurando a chave do Gemini no momento.'
        );
      }

      if (data.success && data.reply) {
        const modelMsg: Message = {
          id: `model-${Date.now()}`,
          role: 'model',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, modelMsg]);
      } else {
        throw new Error(data.error || 'Erro ao processar resposta');
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: `⚠️ Ops, ocorreu uma falha na comunicação: ${err.message || 'Verifique sua conexão'}. Por favor, tente novamente.`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    if (confirm('Deseja limpar o histórico dessa conversa com a IA?')) {
      setMessages([
        {
          id: 'welcome-reset',
          role: 'model',
          content: 'Conversa reiniciada. Como posso ajudar nas suas visitas de hoje?',
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-2 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 text-slate-100 rounded-3xl border border-emerald-500/30 w-full max-w-2xl h-[92vh] max-h-[750px] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-900/80 via-teal-900/90 to-slate-900 border-b border-emerald-500/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Bot className="h-5 w-5 text-emerald-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
                  Agente Aguiar IA
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-emerald-400" /> Gemini 3.6
                  </span>
                </h2>
              </div>
              <p className="text-[11px] text-slate-300">Assistente Técnico do ACS • Apoio ao e-SUS e Saúde Territorial</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClearHistory}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              title="Limpar histórico"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Privacy Notice Banner */}
        <div className="bg-emerald-950/40 border-b border-emerald-800/40 px-4 py-2 flex items-center gap-2 text-[11px] text-emerald-200 shrink-0">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>
            <strong>LGPD & Privacidade Garantida:</strong> Consultas anonimizadas no servidor. Nenhum dado de munícipe é exposto ou retido.
          </span>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'model' && (
                <div className="h-7 w-7 rounded-xl bg-teal-800/80 text-teal-200 border border-teal-600/40 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-4 w-4 text-teal-300" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 relative group ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-xs shadow-md font-medium'
                    : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-bl-xs leading-relaxed'
                }`}
              >
                {/* Text Formatting */}
                <div className="whitespace-pre-wrap text-xs font-sans space-y-1">
                  {msg.content.split('\n').map((line, idx) => {
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return <strong key={idx} className="block text-emerald-300 font-bold text-sm my-1">{line.replace(/\*\*/g, '')}</strong>;
                    }
                    if (line.startsWith('- ') || line.startsWith('* ')) {
                      return (
                        <div key={idx} className="flex items-start gap-1.5 ml-1 my-0.5">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span>{line.substring(2)}</span>
                        </div>
                      );
                    }
                    return <p key={idx}>{line}</p>;
                  })}
                </div>

                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-700/40">
                  <span>{msg.timestamp}</span>
                  {msg.role === 'model' && (
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="text-slate-400 hover:text-emerald-300 transition flex items-center gap-1 cursor-pointer"
                      title="Copiar texto"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="h-7 w-7 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start items-center">
              <div className="h-7 w-7 rounded-xl bg-teal-800/80 text-teal-200 border border-teal-600/40 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-teal-300 animate-spin" />
              </div>
              <div className="bg-slate-800/90 text-slate-300 px-4 py-2.5 rounded-2xl border border-slate-700/80 flex items-center gap-2 text-xs">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                <span>Agente Aguiar IA está analisando sua consulta...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="p-2.5 bg-slate-950/60 border-t border-slate-800/80 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 w-max">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0 flex items-center gap-1 mr-1">
              <HelpCircle className="h-3 w-3 text-amber-400" /> Sugestões:
            </span>
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-950/80 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-200 border border-slate-700 rounded-xl text-[11px] font-medium transition whitespace-nowrap cursor-pointer shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input Box */}
        <div className="p-3 bg-slate-900 border-t border-slate-800/90 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Pergunte sobre fichas do e-SUS, VD, prioridades ou vacinação..."
              className="flex-1 bg-slate-950 text-slate-100 placeholder-slate-500 text-xs px-4 py-3 rounded-2xl border border-slate-800 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/80 transition"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="p-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl transition shadow-md shadow-emerald-900/30 flex items-center justify-center cursor-pointer shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
