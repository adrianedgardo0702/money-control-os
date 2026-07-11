'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, AlertCircle, ArrowDownRight, ArrowUpRight, Briefcase, RefreshCcw, ShieldCheck, Target, Wallet, X } from 'lucide-react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '@/store/useStore';
import { showToast } from '@/lib/toast';
import { BillingTargetsPanel } from './BillingTargetsPanel';
import { buildFixedExpenseSummary, buildTargetPlan, currentMonthIncome, getBusinessUnitName, money, PERSONAL_UNIT_ID } from '@/lib/financePlanning';

const chartColors = ['#111827', '#16a34a', '#64748b', '#f97316', '#6366f1'];

export function Overview() {
  const {
    accounts,
    transactions,
    protectedFunds,
    recurringExpenses,
    debts,
    businesses,
    monthlyTarget,
    businessTargetWeights,
    lastSyncedAt,
    dataError,
    fetchInitialData,
  } = useStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [period, setPeriod] = useState('this_month');
  const [unit, setUnit] = useState('all');
  const [showTargetDetails, setShowTargetDetails] = useState(false);

  const filteredTransactions = filterTransactions(transactions, period, unit);
  const selectedAccounts = filterAccounts(accounts, unit);
  const selectedProtectedFunds = filterProtectedFunds(protectedFunds, unit);
  const totalMoney = selectedAccounts.reduce((sum, account) => sum + Number(account.current_balance || 0), 0);
  const protectedMoney = selectedProtectedFunds.filter((fund) => fund.status === 'active').reduce((sum, fund) => sum + Number(fund.amount || 0), 0);
  const fixedSummary = buildFixedExpenseSummary(recurringExpenses, businesses);
  const dueDebtMinimums = debts.filter((debt) => debt.status !== 'Pagada').reduce((sum, debt) => sum + Number(debt.minimum || 0), 0);
  const committedMoney = protectedMoney + dueDebtMinimums;
  const safeFreeMoney = totalMoney - committedMoney;
  const plan = buildTargetPlan({ target: monthlyTarget, weights: businessTargetWeights, businesses, recurringExpenses, debts, transactions, protectedFunds });

  const todayKey = new Date().toISOString().split('T')[0];
  const todayTransactions = transactions.filter((transaction) => new Date(transaction.date).toISOString().split('T')[0] === todayKey);
  const todayIncome = todayTransactions.filter((transaction) => transaction.type === 'ingreso').reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const todayExpenses = todayTransactions.filter((transaction) => transaction.type === 'gasto').reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const todayNet = todayIncome - todayExpenses;
  const upcomingDebts = debts.filter((debt) => Number(debt.minimum || 0) > 0 && debt.status !== 'Pagada').length;
  const incomePeriod = filteredTransactions.filter((transaction) => transaction.type === 'ingreso').reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const expensesPeriod = filteredTransactions.filter((transaction) => transaction.type === 'gasto').reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const flowChart = buildFlowChart(filteredTransactions);
  const unitDistribution = buildUnitDistribution(accounts, businesses);
  const unitSummaries = buildUnitSummaries(transactions, businesses, period);
  const hasChartData = flowChart.some((point) => point.ingresos > 0 || point.gastos > 0);
  const hasDistribution = unitDistribution.some((item) => item.value > 0);
  const syncLabel = lastSyncedAt ? new Intl.DateTimeFormat('es-PA', { hour: '2-digit', minute: '2-digit' }).format(new Date(lastSyncedAt)) : 'sin actualizar';

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await fetchInitialData();
      const refreshedError = useStore.getState().dataError;
      if (refreshedError) {
        showToast({ type: 'error', title: 'No se pudieron actualizar los datos', description: refreshedError });
      } else {
        showToast({ type: 'success', title: 'Datos actualizados', description: 'La informacion fue consultada nuevamente.' });
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Noa Finanzas</p>
          <p className="mt-1 text-sm font-medium text-muted-foreground">ViciousLabs S.A.</p>
          <h2 className="mt-4 text-2xl font-display font-bold tracking-tight md:text-3xl">Dashboard General</h2>
          <p className="mt-1 text-muted-foreground">Resumen claro de tu dinero, flujo y metas.</p>
          {dataError ? <p className="mt-2 text-xs font-medium text-destructive">{dataError}</p> : <p className="mt-2 text-xs text-muted-foreground">Actualizado {syncLabel}</p>}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row md:items-center">
          <Select value={period} onChange={setPeriod} options={[['today', 'Hoy'], ['this_week', 'Esta semana'], ['this_month', 'Este mes'], ['next_30', 'Proximos 30 dias']]} />
          <Select value={unit} onChange={setUnit} options={[['all', 'Todas las unidades'], ['personal', 'Finanzas personales'], ...businesses.map((business) => [business.id, business.name] as [string, string])]} />
          <Button variant="outline" onClick={handleRefreshData} disabled={isRefreshing} className="h-9">
            <RefreshCcw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} /> Actualizar datos
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <HeroMetric title="Dinero total" value={totalMoney} icon={<Wallet className="h-5 w-5" />} />
        <HeroMetric title="Dinero no tocar" value={committedMoney} icon={<ShieldCheck className="h-5 w-5" />} tone="warning" />
        <HeroMetric title="Libre seguro" value={safeFreeMoney} icon={<Activity className="h-5 w-5" />} tone="success" />
      </section>

      <Card className="overflow-hidden border-border bg-card shadow-sm">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Wallet className="h-4 w-4" /> Dinero Real Disponible</div>
            <p className="mt-4 text-4xl font-display font-bold tracking-tight">{money(Math.max(totalMoney, 0))}</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              {accounts.length === 0
                ? 'Registra cuentas, gastos fijos y deudas para calcular tu dinero real disponible.'
                : safeFreeMoney >= 0
                  ? `Tienes ${money(totalMoney)} visibles. Puedes usar ${money(safeFreeMoney)} de forma segura considerando reservas y pagos minimos registrados.`
                  : `Tienes ${money(totalMoney)} visibles, pero tus compromisos superan el saldo disponible. Revisa reservas, deudas y gastos fijos.`}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <CompactLine label="Visible" value={totalMoney} />
            <CompactLine label="Comprometido" value={committedMoney} tone="warning" />
            <CompactLine label="Libre seguro" value={safeFreeMoney} tone="success" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Meta del mes</CardTitle>
            <CardDescription>Version compacta. Los detalles avanzados estan guardados aparte.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowTargetDetails(true)}>Ver detalle de metas</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <CompactMetric label="Meta mensual" value={plan.idealMonthly} />
            <CompactMetric label="Facturado" value={currentMonthIncome(transactions)} tone="success" />
            <CompactMetric label="Faltante" value={plan.idealMonthly > 0 ? plan.missingToIdeal : 0} tone="warning" muted={plan.idealMonthly === 0} />
            <CompactMetric label="Meta diaria" value={plan.idealMonthly > 0 ? plan.idealDaily : 0} />
          </div>
          {plan.idealMonthly > 0 ? (
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Progreso</span>
                <span className="font-semibold text-foreground">{plan.progressToIdeal}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-success" style={{ width: `${plan.progressToIdeal}%` }} />
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">Configura una meta mensual para ver progreso, faltante y meta diaria.</p>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-3 md:grid-cols-4">
        <SmallOperational title="Ingresos del dia" value={todayIncome} icon={<ArrowUpRight className="h-4 w-4" />} tone="success" />
        <SmallOperational title="Gastos del dia" value={todayExpenses} icon={<ArrowDownRight className="h-4 w-4" />} tone="warning" />
        <SmallOperational title="Neto hoy" value={todayNet} icon={<Activity className="h-4 w-4" />} tone={todayNet >= 0 ? 'success' : 'warning'} />
        <SmallOperational title="Deudas proximas" text={upcomingDebts > 0 ? `${upcomingDebts} por revisar` : 'Sin deudas proximas'} icon={<AlertCircle className="h-4 w-4" />} />
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-lg font-display font-semibold">Resumen por unidad</h3>
          <p className="text-sm text-muted-foreground">Ingresos, gastos y neto del periodo seleccionado.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {unitSummaries.map((item) => <UnitCard key={item.id} item={item} />)}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Ingresos vs gastos</CardTitle>
            <CardDescription>{money(incomePeriod)} entraron · {money(expensesPeriod)} salieron</CardDescription>
          </CardHeader>
          <CardContent>
            {hasChartData ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flowChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                    <Tooltip formatter={(value) => money(Number(value))} />
                    <Bar dataKey="ingresos" fill="var(--color-success)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="gastos" fill="var(--color-destructive)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyChart />}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle>Distribucion de dinero</CardTitle>
            <CardDescription>Saldo actual por unidad financiera.</CardDescription>
          </CardHeader>
          <CardContent>
            {hasDistribution ? (
              <div className="grid gap-4 md:grid-cols-[1fr_1fr] md:items-center">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={unitDistribution} dataKey="value" nameKey="name" innerRadius={54} outerRadius={92} paddingAngle={3}>
                        {unitDistribution.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value) => money(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {unitDistribution.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between rounded-lg border border-border bg-background p-2 text-sm">
                      <span className="flex min-w-0 items-center gap-2 truncate"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />{item.name}</span>
                      <span className="font-semibold">{money(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <EmptyChart text="No hay saldos suficientes para graficar todavia." />}
          </CardContent>
        </Card>
      </section>

      <Card className="border-l-4 border-l-primary bg-card shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Briefcase className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <h3 className="font-display font-semibold">Decision rapida de Noa</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{quickDecision({ accountsCount: accounts.length, safeFreeMoney, dueDebtMinimums, fixedMonthly: fixedSummary.totalMonthly })}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {showTargetDetails && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-6xl overflow-y-auto rounded-xl bg-background shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background p-4">
              <div>
                <h3 className="font-display text-lg font-semibold">Detalle de metas</h3>
                <p className="text-sm text-muted-foreground">Gastos fijos, deudas, reinversion, utilidad y reparto por negocio.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowTargetDetails(false)}><X className="h-5 w-5" /></Button>
            </div>
            <div className="p-4">
              <BillingTargetsPanel />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function filterTransactions(transactions: ReturnType<typeof useStore.getState>['transactions'], period: string, unit: string) {
  return transactions.filter((transaction) => {
    const inPeriod = isInPeriod(transaction.date, period);
    const inUnit = unit === 'all' || (unit === 'personal' ? transaction.scope === 'personal' : transaction.business_id === unit);
    return inPeriod && inUnit;
  });
}

function filterAccounts(accounts: ReturnType<typeof useStore.getState>['accounts'], unit: string) {
  if (unit === 'all') return accounts;
  if (unit === 'personal') return accounts.filter((account) => account.is_personal);
  return accounts.filter((account) => account.business_id === unit);
}

function filterProtectedFunds(funds: ReturnType<typeof useStore.getState>['protectedFunds'], unit: string) {
  if (unit === 'all') return funds;
  if (unit === 'personal') return funds.filter((fund) => fund.scope === 'personal');
  return funds.filter((fund) => fund.business_id === unit);
}

function isInPeriod(dateValue: string, period: string) {
  const date = new Date(dateValue);
  const now = new Date();
  if (period === 'today') return date.toDateString() === now.toDateString();
  if (period === 'this_week') return date >= addDays(now, -7) && date <= addDays(now, 1);
  if (period === 'next_30') return date >= addDays(now, -30) && date <= addDays(now, 1);
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function buildFlowChart(transactions: ReturnType<typeof useStore.getState>['transactions']) {
  const formatter = new Intl.DateTimeFormat('es-PA', { day: '2-digit', month: 'short' });
  const totals = new Map<string, { key: string; name: string; ingresos: number; gastos: number }>();
  transactions.forEach((transaction) => {
    const date = new Date(transaction.date);
    const key = date.toISOString().slice(0, 10);
    const row = totals.get(key) || { key, name: formatter.format(date), ingresos: 0, gastos: 0 };
    if (transaction.type === 'ingreso') row.ingresos += Number(transaction.amount || 0);
    if (transaction.type === 'gasto') row.gastos += Number(transaction.amount || 0);
    totals.set(key, row);
  });
  return Array.from(totals.values()).sort((a, b) => a.key.localeCompare(b.key)).slice(-10);
}

function buildUnitDistribution(accounts: ReturnType<typeof useStore.getState>['accounts'], businesses: ReturnType<typeof useStore.getState>['businesses']) {
  const rows = new Map<string, { name: string; value: number }>();
  accounts.forEach((account) => {
    const id = account.is_personal ? PERSONAL_UNIT_ID : account.business_id || 'shared';
    const name = getBusinessUnitName(id, businesses);
    const row = rows.get(id) || { name, value: 0 };
    row.value += Number(account.current_balance || 0);
    rows.set(id, row);
  });
  return Array.from(rows.values()).filter((row) => row.value > 0).sort((a, b) => b.value - a.value);
}

function buildUnitSummaries(transactions: ReturnType<typeof useStore.getState>['transactions'], businesses: ReturnType<typeof useStore.getState>['businesses'], period: string) {
  const units = [{ id: PERSONAL_UNIT_ID, name: 'Finanzas personales' }, ...businesses.map((business) => ({ id: business.id, name: business.name }))];
  return units.map((unit) => {
    const txs = transactions.filter((transaction) => isInPeriod(transaction.date, period) && (unit.id === PERSONAL_UNIT_ID ? transaction.scope === 'personal' : transaction.business_id === unit.id));
    const income = txs.filter((transaction) => transaction.type === 'ingreso').reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    const expense = txs.filter((transaction) => transaction.type === 'gasto').reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    const net = income - expense;
    return { ...unit, income, expense, net, hasData: txs.length > 0 };
  });
}

function quickDecision({ accountsCount, safeFreeMoney, dueDebtMinimums, fixedMonthly }: { accountsCount: number; safeFreeMoney: number; dueDebtMinimums: number; fixedMonthly: number }) {
  if (accountsCount === 0) return 'Todavia faltan datos para darte una recomendacion precisa. Registra cuentas, deudas y gastos fijos.';
  if (safeFreeMoney <= 0) return `No conviene usar dinero libre ahora. Revisa ${money(dueDebtMinimums)} en pagos minimos y ${money(fixedMonthly)} en gastos fijos mensuales.`;
  return `Puedes usar ${money(safeFreeMoney)} de forma segura. Prioriza pagar ${money(dueDebtMinimums)} en deudas y reserva ${money(fixedMonthly)} para gastos fijos.`;
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 rounded-lg border border-border bg-card px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary">
      {options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}
    </select>
  );
}

function HeroMetric({ title, value, icon, tone }: { title: string; value: number; icon: React.ReactNode; tone?: 'success' | 'warning' }) {
  const color = tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-orange-500' : 'text-foreground';
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="p-5">
        <div className={`flex items-center justify-between text-sm font-medium ${tone ? color : 'text-muted-foreground'}`}>
          <span>{title}</span>
          {icon}
        </div>
        <p className={`mt-4 text-3xl font-display font-bold tracking-tight ${color}`}>{money(value)}</p>
      </CardContent>
    </Card>
  );
}

function CompactLine({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'warning' }) {
  const color = tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-orange-500' : 'text-foreground';
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-bold ${color}`}>{money(value)}</p>
    </div>
  );
}

function CompactMetric({ label, value, tone, muted }: { label: string; value: number; tone?: 'success' | 'warning'; muted?: boolean }) {
  const color = muted ? 'text-muted-foreground' : tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-orange-500' : 'text-foreground';
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-bold ${color}`}>{money(value)}</p>
    </div>
  );
}

function SmallOperational({ title, value, text, icon, tone }: { title: string; value?: number; text?: string; icon: React.ReactNode; tone?: 'success' | 'warning' }) {
  const isZero = Number(value || 0) === 0 && !text;
  const color = tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-orange-500' : 'text-foreground';
  return (
    <Card className={`border-border bg-card shadow-sm ${isZero ? 'opacity-70' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{title}</span>
          {icon}
        </div>
        <p className={`mt-2 text-lg font-bold ${text ? 'text-foreground' : color}`}>{text || money(value || 0)}</p>
      </CardContent>
    </Card>
  );
}

function UnitCard({ item }: { item: { name: string; income: number; expense: number; net: number; hasData: boolean } }) {
  const status = !item.hasData ? 'Sin movimientos aun' : item.net >= 0 ? 'Saludable' : 'Revisar';
  const statusClass = !item.hasData ? 'text-muted-foreground' : item.net >= 0 ? 'text-success' : 'text-orange-500';
  return (
    <Card className="border-border bg-card shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h4 className="truncate font-semibold">{item.name}</h4>
          <span className={`shrink-0 text-xs font-semibold ${statusClass}`}>{status}</span>
        </div>
        {item.hasData ? (
          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
            <MiniStat label="Ingresos" value={item.income} tone="success" />
            <MiniStat label="Gastos" value={item.expense} tone="warning" />
            <MiniStat label="Neto" value={item.net} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Sin movimientos aun</p>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'warning' }) {
  const color = tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-orange-500' : value < 0 ? 'text-orange-500' : 'text-foreground';
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`truncate text-sm font-bold ${color}`}>{money(value)}</p>
    </div>
  );
}

function EmptyChart({ text = 'No hay suficientes movimientos para graficar todavia.' }: { text?: string }) {
  return <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">{text}</div>;
}
