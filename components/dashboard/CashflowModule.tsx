'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Activity,
  AlertCircle,
  Calendar,
  Lock,
  ShieldCheck,
  Zap,
  CreditCard,
  Download,
  X,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TransactionModal } from './TransactionModal';
import { BillingTargetsPanel } from './BillingTargetsPanel';
import { useStore, Transaction } from '@/store/useStore';
import { monthlyCost } from '@/lib/financePlanning';
import { showToast } from '@/lib/toast';

const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = new Date().toISOString().split('T')[0];

const initialPaymentForm = {
  name: '',
  amount: '',
  dueDate: today,
  scope: 'personal',
  businessId: '',
  accountId: '',
  notes: '',
};

const initialReserveForm = {
  name: '',
  amount: '',
  scope: 'personal',
  businessId: '',
  accountId: '',
  priority: 'Media',
  targetDate: '',
};

export function CashflowModule() {
  const { accounts, transactions, protectedFunds, recurringExpenses, debts, businesses, createRecurringExpense, createProtectedFund } = useStore();
  const [period, setPeriod] = useState('this_week');
  const [business, setBusiness] = useState('all');
  const [view, setView] = useState('real_projected');
  const [distMode, setDistMode] = useState('stability');
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; type: 'ingreso' | 'gasto' }>({ isOpen: false, type: 'ingreso' });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm);
  const [reserveForm, setReserveForm] = useState(initialReserveForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredTransactions = business === 'all'
    ? transactions
    : business === 'personal'
      ? transactions.filter((transaction) => transaction.scope === 'personal')
      : transactions.filter((transaction) => transaction.business_id === business);

  const currentMoney = accounts.reduce((sum, account) => sum + Number(account.current_balance), 0);
  const expectedIncome = filteredTransactions.filter((transaction) => transaction.type === 'ingreso' && isInSelectedPeriod(transaction.date, period)).reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const upcomingRecurring = recurringExpenses.filter((expense) => expense.status === 'active' && isUpcoming(expense.next_run_date));
  const upcomingRecurringTotal = upcomingRecurring.reduce((sum, expense) => sum + monthlyCost(expense), 0);
  const upcomingDebtMinimums = debts.filter((debt) => debt.status !== 'Pagada').reduce((sum, debt) => sum + Number(debt.minimum || 0), 0);
  const upcomingOutflows = upcomingRecurringTotal + upcomingDebtMinimums;
  const protectedMoney = protectedFunds.filter((fund) => fund.status === 'active').reduce((sum, fund) => sum + Number(fund.amount), 0);
  const safeFreeMoney = currentMoney - protectedMoney - upcomingOutflows;
  const hasAnyData = accounts.length > 0 || transactions.length > 0 || protectedFunds.length > 0 || recurringExpenses.length > 0 || debts.length > 0;
  const projectionData = buildProjectionData(currentMoney, filteredTransactions, upcomingRecurring);
  const recentIncome = filteredTransactions.filter((transaction) => transaction.type === 'ingreso').slice(0, 5);
  const recentExpenses = filteredTransactions.filter((transaction) => transaction.type === 'gasto').slice(0, 5);

  const businessFlow = businesses.map((item) => {
    const txs = transactions.filter((transaction) => transaction.business_id === item.id);
    const income = txs.filter((transaction) => transaction.type === 'ingreso').reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const out = txs.filter((transaction) => transaction.type === 'gasto').reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const committed = protectedFunds.filter((fund) => fund.business_id === item.id && fund.status === 'active').reduce((sum, fund) => sum + Number(fund.amount), 0);
    const available = accounts.filter((account) => account.business_id === item.id).reduce((sum, account) => sum + Number(account.current_balance), 0);
    return { ...item, income, out, net: income - out, available, committed };
  });

  const resetForms = () => {
    setPaymentForm(initialPaymentForm);
    setReserveForm(initialReserveForm);
    setFormError('');
    setShowPaymentModal(false);
    setShowReserveModal(false);
  };

  const handleCreatePayment = async () => {
    setSaving(true);
    setFormError('');
    try {
      await createRecurringExpense({
        name: paymentForm.name,
        scope: paymentForm.scope as 'personal' | 'negocio',
        category: 'pago_programado',
        amount: Number(paymentForm.amount),
        frequency: 'Mensual',
        start_date: paymentForm.dueDate,
        next_run_date: paymentForm.dueDate,
        payment_method: '',
        mode: 'reminder',
        business_id: paymentForm.scope === 'negocio' ? paymentForm.businessId : null,
        account_id: paymentForm.accountId || null,
        notes: paymentForm.notes,
      });
      showToast({ type: 'success', title: 'Pago proximo agregado', description: 'El flujo fue actualizado.' });
      resetForms();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear el pago proximo.';
      setFormError(message);
      showToast({ type: 'error', title: 'No se pudo guardar', description: message });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateReserve = async () => {
    setSaving(true);
    setFormError('');
    try {
      await createProtectedFund({
        name: reserveForm.name,
        scope: reserveForm.scope as 'personal' | 'negocio',
        fund_type: 'Gastos fijos',
        amount: Number(reserveForm.amount),
        priority: reserveForm.priority,
        target_date: reserveForm.targetDate,
        block_withdrawals: true,
        business_id: reserveForm.scope === 'negocio' ? reserveForm.businessId : null,
        account_id: reserveForm.accountId || null,
      });
      showToast({ type: 'success', title: 'Reserva creada', description: 'El flujo fue actualizado.' });
      resetForms();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear la reserva.';
      setFormError(message);
      showToast({ type: 'error', title: 'No se pudo guardar', description: message });
    } finally {
      setSaving(false);
    }
  };

  const handleRecalculate = () => {
    showToast({ type: 'info', title: 'Distribucion recalculada', description: 'La pantalla ya usa los datos actuales de Supabase.' });
  };

  const handleExport = () => {
    const rows = [
      ['Concepto', 'Monto'],
      ['Dinero actual', String(currentMoney)],
      ['Entradas esperadas', String(expectedIncome)],
      ['Salidas proximas', String(upcomingOutflows)],
      ['Dinero No Tocar', String(protectedMoney)],
      ['Dinero libre seguro', String(safeFreeMoney)],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Flujo_Caja_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold tracking-tight md:text-3xl">Flujo de Caja</h2>
          <p className="text-muted-foreground mt-1">Visualiza cuanto dinero entra, cuanto sale y cuanto puedes usar sin afectar tus compromisos.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={period} onChange={setPeriod} options={[
            ['today', 'Hoy'],
            ['this_week', 'Esta semana'],
            ['this_month', 'Este mes'],
            ['next_7', 'Proximos 7 dias'],
            ['next_30', 'Proximos 30 dias'],
          ]} />
          <Select value={business} onChange={setBusiness} options={[
            ['all', 'Todos'],
            ['personal', 'Finanzas personales'],
            ...businesses.map((item) => [item.id, item.name] as [string, string]),
          ]} />
          <Select value={view} onChange={setView} options={[
            ['real', 'Real'],
            ['projected', 'Proyectado'],
            ['real_projected', 'Real + proyectado'],
          ]} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" className="text-success border-success/30 hover:bg-success/10 hover:text-success" onClick={() => setModalConfig({ isOpen: true, type: 'ingreso' })}>
          <Plus className="w-4 h-4 mr-2" /> Registrar ingreso
        </Button>
        <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={() => setModalConfig({ isOpen: true, type: 'gasto' })}>
          <Plus className="w-4 h-4 mr-2" /> Registrar gasto
        </Button>
        <Button variant="secondary" onClick={() => setShowPaymentModal(true)}>
          <Calendar className="w-4 h-4 mr-2" /> Agregar pago proximo
        </Button>
        <Button variant="secondary" onClick={() => setShowReserveModal(true)}>
          <Lock className="w-4 h-4 mr-2" /> Crear reserva
        </Button>
        <Button variant="outline" onClick={handleRecalculate}>
          <Activity className="w-4 h-4 mr-2" /> Recalcular distribucion
        </Button>
        <Button variant="outline" className="ml-auto" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" /> Exportar flujo
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Summary title="Dinero actual" value={currentMoney} icon={<Wallet className="w-4 h-4 text-primary" />} />
        <Summary title="Entradas esperadas" value={expectedIncome} icon={<ArrowUpRight className="w-4 h-4 text-success" />} tone="success" />
        <Summary title="Salidas proximas" value={upcomingOutflows} icon={<ArrowDownRight className="w-4 h-4 text-destructive" />} tone="destructive" />
        <Summary title="Dinero No Tocar" value={protectedMoney} icon={<Lock className="w-4 h-4" />} tone="destructive" emphasized />
        <Summary title="Dinero libre seguro" value={safeFreeMoney} icon={<ShieldCheck className="w-4 h-4" />} tone="success" emphasized />
      </div>

      <BillingTargetsPanel />

      <Card className="border-l-4 border-l-blue-500 bg-blue-500/5 shadow-md">
        <CardContent className="p-6 flex items-start gap-4">
          <Zap className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-display font-semibold text-blue-400 text-lg">Decision rapida de Noa</h4>
            <p className="text-base text-foreground/90 mt-2 leading-relaxed">
              {hasAnyData
                ? `Tu dinero libre seguro actual es ${money(safeFreeMoney)}. Esta decision se calcula con tus cuentas, reservas, recurrentes y deudas registradas.`
                : 'Todavia no tengo suficiente informacion para darte una decision financiera. Registra tus primeras cuentas, ingresos, gastos o deudas para calcular tu flujo real.'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-display font-semibold">Como usar mi dinero</h3>
          <Select value={distMode} onChange={setDistMode} options={[
            ['growth', 'Crecimiento'],
            ['debts', 'Pagar deudas'],
            ['stability', 'Estabilidad'],
            ['emergency', 'Emergencia'],
          ]} />
        </div>
        {hasAnyData ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <DistributionCard title="Deudas" value={upcomingDebtMinimums} />
            <DistributionCard title="Gastos fijos" value={upcomingRecurringTotal} />
            <DistributionCard title="Reservas" value={protectedMoney} />
            <DistributionCard title="Libre seguro" value={Math.max(safeFreeMoney, 0)} tone="success" />
          </div>
        ) : (
          <EmptyState text="No hay distribucion disponible todavia. Registra dinero disponible, deudas o reservas para calcular como usar tu dinero." />
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Proyeccion de flujo</CardTitle>
              <CardDescription>Evolucion del balance con movimientos y pagos reales</CardDescription>
            </div>
            {hasAnyData && <Badge variant="outline">Datos reales</Badge>}
          </CardHeader>
          <CardContent>
            {projectionData.length > 0 ? (
              <div className="h-[250px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="currentColor" className="text-muted-foreground" />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} stroke="currentColor" className="text-muted-foreground" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="balance" name="Balance" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState text="No hay datos suficientes para proyectar el flujo de caja." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pagos proximos</CardTitle>
            <CardDescription>Recurrentes y deudas registradas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingRecurring.map((expense) => (
              <UpcomingItem key={expense.id} title={expense.name} amount={monthlyCost(expense)} date={expense.due_date || expense.next_run_date} />
            ))}
            {debts.filter((debt) => Number(debt.minimum || 0) > 0).map((debt) => (
              <UpcomingItem key={debt.id} title={debt.name} amount={Number(debt.minimum || 0)} date={debt.due_date || 'Sin fecha'} icon={<CreditCard className="w-4 h-4 text-destructive" />} />
            ))}
            {upcomingRecurring.length === 0 && debts.filter((debt) => Number(debt.minimum || 0) > 0).length === 0 && (
              <EmptyState text="No tienes pagos proximos registrados." compact />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-display font-semibold">Flujo por negocio</h3>
        {businessFlow.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {businessFlow.map((item) => (
              <Card key={item.id} className="flex flex-col">
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="text-base truncate">{item.name}</CardTitle>
                </CardHeader>
                <CardContent className="pt-3 space-y-2 flex-1">
                  <FlowRow label="Entradas" value={item.income} tone="success" />
                  <FlowRow label="Salidas" value={item.out} tone="destructive" />
                  <FlowRow label="Flujo neto" value={item.net} strong />
                  <FlowRow label="Disponible" value={item.available} />
                  <FlowRow label="Comprometido" value={item.committed} tone="destructive" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState text="No hay negocios registrados para calcular flujo por negocio." />
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <MovementList title="Entradas de dinero" transactions={recentIncome} type="ingreso" />
        <MovementList title="Salidas de dinero" transactions={recentExpenses} type="gasto" />
      </div>

      <TransactionModal isOpen={modalConfig.isOpen} type={modalConfig.type} onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} />

      {showPaymentModal && (
        <DataModal title="Agregar pago proximo" description="Crea un recordatorio real dentro de gastos recurrentes." onClose={resetForms} onSave={handleCreatePayment} saving={saving} error={formError}>
          <Field label="Nombre"><input className="form-field" value={paymentForm.name} onChange={(event) => setPaymentForm({ ...paymentForm, name: event.target.value })} /></Field>
          <Field label="Monto"><input className="form-field" type="number" min="0" step="0.01" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} /></Field>
          <Field label="Fecha"><input className="form-field" type="date" value={paymentForm.dueDate} onChange={(event) => setPaymentForm({ ...paymentForm, dueDate: event.target.value })} /></Field>
          <ScopeFields scope={paymentForm.scope} setScope={(scope) => setPaymentForm({ ...paymentForm, scope, businessId: '' })} businessId={paymentForm.businessId} setBusinessId={(businessId) => setPaymentForm({ ...paymentForm, businessId })} businesses={businesses} />
        </DataModal>
      )}

      {showReserveModal && (
        <DataModal title="Crear reserva" description="Aparta dinero real como Dinero No Tocar." onClose={resetForms} onSave={handleCreateReserve} saving={saving} error={formError} destructive>
          <Field label="Nombre"><input className="form-field" value={reserveForm.name} onChange={(event) => setReserveForm({ ...reserveForm, name: event.target.value })} /></Field>
          <Field label="Monto"><input className="form-field" type="number" min="0" step="0.01" value={reserveForm.amount} onChange={(event) => setReserveForm({ ...reserveForm, amount: event.target.value })} /></Field>
          <Field label="Fecha meta"><input className="form-field" type="date" value={reserveForm.targetDate} onChange={(event) => setReserveForm({ ...reserveForm, targetDate: event.target.value })} /></Field>
          <ScopeFields scope={reserveForm.scope} setScope={(scope) => setReserveForm({ ...reserveForm, scope, businessId: '' })} businessId={reserveForm.businessId} setBusinessId={(businessId) => setReserveForm({ ...reserveForm, businessId })} businesses={businesses} />
        </DataModal>
      )}
    </div>
  );
}

function isInSelectedPeriod(dateValue: string, period: string) {
  const date = new Date(dateValue);
  const now = new Date();
  if (period === 'today') return date.toDateString() === now.toDateString();
  if (period === 'this_month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  if (period === 'next_7') return date >= now && date <= addDays(now, 7);
  if (period === 'next_30') return date >= now && date <= addDays(now, 30);
  return date >= addDays(now, -7) && date <= now;
}

function isUpcoming(dateValue: string) {
  const date = new Date(dateValue);
  const now = new Date();
  return date >= new Date(now.toISOString().split('T')[0]);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function buildProjectionData(currentMoney: number, transactions: Transaction[], upcoming: { name: string; amount: number; next_run_date: string }[]) {
  if (currentMoney === 0 && transactions.length === 0 && upcoming.length === 0) return [];
  const points = [{ name: 'Hoy', balance: currentMoney }];
  let running = currentMoney;
  upcoming
    .slice()
    .sort((a, b) => a.next_run_date.localeCompare(b.next_run_date))
    .slice(0, 6)
    .forEach((expense) => {
      running -= Number(expense.amount);
      points.push({ name: new Date(expense.next_run_date).toLocaleDateString('es-PA', { day: '2-digit', month: 'short' }), balance: running });
    });
  return points;
}

function Summary({ title, value, icon, tone, emphasized }: { title: string; value: number; icon: React.ReactNode; tone?: 'success' | 'destructive'; emphasized?: boolean }) {
  const color = tone === 'success' ? 'text-success' : tone === 'destructive' ? 'text-destructive' : '';
  const card = emphasized && tone === 'success' ? 'bg-success/10 border-success/20' : emphasized && tone === 'destructive' ? 'bg-destructive/10 border-destructive/20' : 'bg-card';
  return (
    <Card className={card}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm font-medium flex items-center justify-between ${color || 'text-muted-foreground'}`}>{title} {icon}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold font-display ${color}`}>{money(value)}</div>
      </CardContent>
    </Card>
  );
}

function DistributionCard({ title, value, tone }: { title: string; value: number; tone?: 'success' }) {
  return (
    <Card className={tone === 'success' ? 'border-l-4 border-l-success' : 'border-l-4 border-l-border'}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <span className="font-medium">{title}</span>
          <span className={`font-bold text-lg ${tone === 'success' ? 'text-success' : ''}`}>{money(value)}</span>
        </div>
        <p className="text-xs text-muted-foreground">Calculado desde datos guardados en Supabase.</p>
      </CardContent>
    </Card>
  );
}

function MovementList({ title, transactions, type }: { title: string; transactions: Transaction[]; type: 'ingreso' | 'gasto' }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className={`${type === 'ingreso' ? 'text-success' : 'text-destructive'} flex items-center gap-2`}>
          {type === 'ingreso' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />} {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="flex justify-between items-center p-2 rounded-xl hover:bg-muted/50">
              <div>
                <p className="text-sm font-medium">{transaction.notes || transaction.category || 'Movimiento'}</p>
                <p className="text-xs text-muted-foreground">{new Date(transaction.date).toLocaleDateString('es-PA')}</p>
              </div>
              <span className={`font-bold ${type === 'ingreso' ? 'text-success' : 'text-destructive'}`}>{type === 'ingreso' ? '+' : '-'}{money(Number(transaction.amount))}</span>
            </div>
          ))}
          {transactions.length === 0 && <EmptyState text={`No hay ${type === 'ingreso' ? 'entradas' : 'salidas'} registradas.`} compact />}
        </div>
      </CardContent>
    </Card>
  );
}

function UpcomingItem({ title, amount, date, icon }: { title: string; amount: number; date: string; icon?: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          {icon || <Activity className="w-4 h-4 text-orange-400" />}
          <span className="font-medium text-sm">{title}</span>
        </div>
        <span className="font-bold text-destructive">{money(amount)}</span>
      </div>
      <p className="text-xs text-muted-foreground">Fecha: {date}</p>
    </div>
  );
}

function FlowRow({ label, value, tone, strong }: { label: string; value: number; tone?: 'success' | 'destructive'; strong?: boolean }) {
  const color = tone === 'success' ? 'text-success' : tone === 'destructive' ? 'text-destructive' : '';
  return (
    <div className={`flex justify-between text-sm ${strong ? 'font-semibold pt-1 border-t border-border/50' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${color}`}>{money(value)}</span>
    </div>
  );
}

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={`rounded-xl border border-dashed border-border bg-muted/20 text-center text-sm text-muted-foreground ${compact ? 'p-4' : 'p-8'}`}>
      {text}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary">
      {options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
    </select>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm font-medium text-muted-foreground">{label}</span>{children}</label>;
}

function ScopeFields({ scope, setScope, businessId, setBusinessId, businesses }: { scope: string; setScope: (scope: string) => void; businessId: string; setBusinessId: (id: string) => void; businesses: { id: string; name: string }[] }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant={scope === 'personal' ? 'default' : 'outline'} onClick={() => setScope('personal')}>Personal</Button>
        <Button type="button" variant={scope === 'negocio' ? 'default' : 'outline'} onClick={() => setScope('negocio')}>Negocio</Button>
      </div>
      {scope === 'negocio' && (
        <Field label="Negocio">
          <select className="form-field" value={businessId} onChange={(event) => setBusinessId(event.target.value)}>
            <option value="">Selecciona negocio</option>
            {businesses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
      )}
    </>
  );
}

function DataModal({ title, description, children, onClose, onSave, saving, error, destructive }: { title: string; description: string; children: React.ReactNode; onClose: () => void; onSave: () => void; saving: boolean; error: string; destructive?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <Card className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto border-border shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
          <div><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></div>
          <button onClick={onClose} className="rounded-xl p-1 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          {children}
          {error && <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        </CardContent>
        <CardFooter className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant={destructive ? 'destructive' : 'default'} onClick={onSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
