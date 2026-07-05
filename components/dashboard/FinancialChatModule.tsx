'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Mic, FileText, Trash2, MessageSquare, AlertCircle, ShieldCheck, Lock, CreditCard, Wallet, TrendingUp } from 'lucide-react';
import { useStore } from '@/store/useStore';

type Message = {
  id: string;
  role: 'user' | 'noa';
  content: string;
  cards?: { label: string; value: string }[];
};

const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const quickQuestions = [
  'Cuanto dinero libre tengo?',
  'Que deudas tengo registradas?',
  'Que dinero no debo tocar?',
  'Como va mi flujo?',
];

function formatText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}

export function FinancialChatModule() {
  const { accounts, transactions, protectedFunds, recurringExpenses, debts, businesses } = useStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [mode, setMode] = useState('honesta');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const metrics = useMemo(() => {
    const totalMoney = accounts.reduce((sum, account) => sum + Number(account.current_balance), 0);
    const protectedMoney = protectedFunds.filter((fund) => fund.status === 'active').reduce((sum, fund) => sum + Number(fund.amount), 0);
    const debtPending = debts.reduce((sum, debt) => sum + Number(debt.pending), 0);
    const recurringTotal = recurringExpenses.filter((expense) => expense.status === 'active').reduce((sum, expense) => sum + Number(expense.amount), 0);
    const income = transactions.filter((transaction) => transaction.type === 'ingreso').reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const expenses = transactions.filter((transaction) => transaction.type === 'gasto').reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const safeFree = totalMoney - protectedMoney - recurringTotal;
    return { totalMoney, protectedMoney, debtPending, recurringTotal, income, expenses, safeFree, hasData: accounts.length + transactions.length + protectedFunds.length + recurringExpenses.length + debts.length > 0 };
  }, [accounts, debts, protectedFunds, recurringExpenses, transactions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const visibleMessages = messages.length > 0 ? messages : [{
    id: 'init-1',
    role: 'noa' as const,
    content: metrics.hasData
      ? `Hola, soy Noa. Solo voy a usar datos reales. Tu dinero total registrado es **${money(metrics.totalMoney)}** y tu dinero libre seguro estimado es **${money(metrics.safeFree)}**.`
      : 'Hola, soy Noa. Todavia no tengo suficiente informacion real para darte recomendaciones financieras. Registra cuentas, ingresos, gastos, reservas o deudas para empezar.',
  }];

  const contextCards = [
    { title: 'Dinero libre seguro', value: money(metrics.safeFree), subtext: 'Calculado con cuentas, reservas y recurrentes', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Dinero protegido', value: money(metrics.protectedMoney), subtext: 'Reservas activas', icon: Lock, color: 'text-rose-600', bg: 'bg-rose-50' },
    { title: 'Deudas pendientes', value: money(metrics.debtPending), subtext: 'Saldo pendiente registrado', icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Dinero total', value: money(metrics.totalMoney), subtext: 'Saldo en cuentas', icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Ingresos registrados', value: money(metrics.income), subtext: 'Movimientos reales', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text };
    setMessages((current) => [...current, userMsg]);
    setInputValue('');

    const lowerText = text.toLowerCase();
    let content = 'Todavia no tengo suficiente informacion real para responder con una recomendacion. Registra datos en cuentas, movimientos, deudas, recurrentes o reservas.';
    let cards: Message['cards'] = [];

    if (metrics.hasData) {
      if (lowerText.includes('libre') || lowerText.includes('gastar')) {
        content = `Tu dinero libre seguro estimado es **${money(metrics.safeFree)}**. Este calculo sale de dinero total menos reservas activas y gastos recurrentes activos.`;
        cards = [
          { label: 'Dinero total', value: money(metrics.totalMoney) },
          { label: 'Reservas', value: money(metrics.protectedMoney) },
          { label: 'Recurrentes', value: money(metrics.recurringTotal) },
        ];
      } else if (lowerText.includes('deuda')) {
        content = debts.length > 0
          ? `Tienes **${money(metrics.debtPending)}** en deudas pendientes registradas. Revisa el modulo Deudas para registrar pagos o ajustar prioridades.`
          : 'No hay deudas registradas todavia.';
        cards = debts.slice(0, 3).map((debt) => ({ label: debt.name, value: money(Number(debt.pending)) }));
      } else if (lowerText.includes('no debo tocar') || lowerText.includes('no tocar')) {
        content = protectedFunds.length > 0
          ? `Tu Dinero No Tocar registrado suma **${money(metrics.protectedMoney)}**.`
          : 'No hay reservas protegidas registradas todavia.';
        cards = protectedFunds.slice(0, 3).map((fund) => ({ label: fund.name, value: money(Number(fund.amount)) }));
      } else {
        content = `Con datos reales registrados: ingresos **${money(metrics.income)}**, gastos **${money(metrics.expenses)}**, deudas **${money(metrics.debtPending)}**, reservas **${money(metrics.protectedMoney)}**.`;
      }
    }

    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'noa', content, cards }]);
  };

  return (
    <div className="flex h-[calc(100dvh-9rem)] flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-[#0F172A] shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 md:-m-4 md:h-[calc(100vh-6rem)] md:p-6">
      <div className="mb-4 flex shrink-0 flex-col justify-between gap-3 sm:flex-row sm:items-center md:mb-6">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight md:text-2xl">
            <MessageSquare className="w-6 h-6 text-indigo-600" />
            Chat Financiero
          </h2>
          <p className="text-[#475569] text-sm mt-1">Noa responde solo con datos reales registrados en la app.</p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
          <select value={mode} onChange={(event) => setMode(event.target.value)} className="h-9 min-w-0 flex-1 rounded-xl border border-[#E2E8F0] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:flex-none">
            <option value="honesta">Modo: Honesta</option>
            <option value="conservadora">Modo: Conservadora</option>
            <option value="crecimiento">Modo: Crecimiento</option>
            <option value="emergencia">Modo: Emergencia</option>
          </select>
          <Button variant="outline" size="icon" onClick={() => setMessages([])} title="Limpiar chat" className="border-[#E2E8F0] text-[#475569] hover:bg-slate-100 hover:text-rose-600">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-6 overflow-y-auto pr-2 pb-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#475569] mb-3">Contexto financiero actual</h3>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
              {contextCards.map((card) => (
                <div key={card.title} className="bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-sm flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${card.bg} ${card.color} shrink-0`}>
                    <card.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-[#475569] truncate">{card.title}</p>
                    <p className="font-bold text-sm text-[#0F172A] truncate">{card.value}</p>
                    <p className="text-[10px] text-[#475569] mt-0.5 leading-tight">{card.subtext}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#475569] mb-3">Estado</h3>
            <div className="space-y-2">
              {!metrics.hasData && <Alert text="No hay datos suficientes para recomendaciones financieras." />}
              {metrics.hasData && metrics.safeFree < 0 && <Alert text="El dinero libre seguro esta en negativo. Revisa reservas y recurrentes." />}
              {metrics.hasData && businesses.length === 0 && <Alert text="No hay negocios registrados para comparar unidades financieras." />}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {visibleMessages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'noa' && (
                  <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white shrink-0 mr-3 mt-1">
                    <span className="font-bold text-xs">N</span>
                  </div>
                )}
                <div className={`max-w-[85%] md:max-w-[75%] flex flex-col gap-3 ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${message.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-[#E2E8F0] text-[#0F172A] rounded-bl-none shadow-sm'}`}>
                    {message.role === 'noa' ? formatText(message.content) : message.content}
                  </div>
                  {message.cards && message.cards.length > 0 && (
                    <div className="w-full grid grid-cols-2 md:grid-cols-3 gap-2">
                      {message.cards.map((card) => (
                        <div key={card.label} className="bg-white border border-[#E2E8F0] p-3 rounded-lg shadow-sm">
                          <p className="text-[10px] text-[#475569] uppercase tracking-wider font-semibold">{card.label}</p>
                          <p className="font-bold text-sm text-[#0F172A] mt-0.5 truncate">{card.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-4 py-2 border-t border-[#E2E8F0] bg-[#F8FAFC] overflow-x-auto whitespace-nowrap">
            <div className="flex gap-2">
              {quickQuestions.map((question) => (
                <button key={question} onClick={() => handleSendMessage(question)} className="inline-block px-3 py-1.5 bg-white border border-[#E2E8F0] hover:border-indigo-300 text-[#475569] text-xs rounded-full shadow-sm">
                  {question}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-white border-t border-[#E2E8F0]">
            <div className="flex items-end gap-2">
              <Button variant="ghost" size="icon" className="shrink-0 text-[#475569] hover:bg-slate-100">
                <FileText className="w-5 h-5" />
              </Button>
              <div className="flex-1 relative">
                <textarea
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleSendMessage(inputValue);
                    }
                  }}
                  placeholder="Preguntale a Noa sobre tus datos reales..."
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none max-h-32 min-h-[44px]"
                  rows={1}
                />
                <Button size="icon" variant="ghost" className="absolute right-1 bottom-1 text-[#475569] hover:text-indigo-600 hover:bg-indigo-50" onClick={() => handleSendMessage(inputValue)}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0 text-[#475569] hover:bg-slate-100 hidden sm:flex">
                <Mic className="w-5 h-5" />
              </Button>
            </div>
            <p className="mt-2 px-2 text-[10px] text-[#475569]">Noa no inventa datos: si falta informacion, te lo dira.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Alert({ text }: { text: string }) {
  return (
    <div className="p-3 rounded-lg border text-xs font-medium flex gap-2 bg-amber-50 border-amber-200 text-amber-700">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>{text}</span>
    </div>
  );
}
