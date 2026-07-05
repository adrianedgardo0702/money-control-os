'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Activity, Wallet, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useStore } from '@/store/useStore';

const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const buildWeeklyChart = (transactions: { type: string; amount: number; date: string }[]) => {
  const formatter = new Intl.DateTimeFormat('es-PA', { weekday: 'short' });
  const days = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().split('T')[0];
    return { key, name: formatter.format(date), ingresos: 0, gastos: 0 };
  });

  const byDay = new Map(days.map((day) => [day.key, day]));
  transactions.forEach((transaction) => {
    const key = new Date(transaction.date).toISOString().split('T')[0];
    const day = byDay.get(key);
    if (!day) return;
    if (transaction.type === 'ingreso') day.ingresos += Number(transaction.amount);
    if (transaction.type === 'gasto') day.gastos += Number(transaction.amount);
  });

  return days;
};

export function Overview() {
  const { accounts, transactions, protectedFunds, debts, businesses } = useStore();
  const totalMoney = accounts.reduce((sum, account) => sum + Number(account.current_balance), 0);
  const protectedMoney = protectedFunds.filter((fund) => fund.status === 'active').reduce((sum, fund) => sum + Number(fund.amount), 0);
  const safeFreeMoney = totalMoney - protectedMoney;
  const debtTotal = debts.reduce((sum, debt) => sum + Number(debt.pending), 0);

  const todayKey = new Date().toISOString().split('T')[0];
  const todayTransactions = transactions.filter((transaction) => new Date(transaction.date).toISOString().split('T')[0] === todayKey);
  const todayIncome = todayTransactions.filter((transaction) => transaction.type === 'ingreso').reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const todayExpenses = todayTransactions.filter((transaction) => transaction.type === 'gasto').reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const todayProfit = todayIncome - todayExpenses;
  const margin = todayIncome > 0 ? Math.round((todayProfit / todayIncome) * 100) : 0;
  const chartData = buildWeeklyChart(transactions);
  const bestBusiness = businesses
    .map((business) => {
      const businessTxs = transactions.filter((transaction) => transaction.business_id === business.id);
      const income = businessTxs.filter((transaction) => transaction.type === 'ingreso').reduce((sum, transaction) => sum + Number(transaction.amount), 0);
      const expense = businessTxs.filter((transaction) => transaction.type === 'gasto').reduce((sum, transaction) => sum + Number(transaction.amount), 0);
      return { name: business.name, profit: income - expense };
    })
    .sort((a, b) => b.profit - a.profit)[0];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold tracking-tight md:text-3xl">Dashboard General</h2>
          <p className="text-muted-foreground mt-1">Resumen de tu flujo de caja y salud financiera.</p>
        </div>
        <div className="grid w-full grid-cols-3 gap-2 text-left md:w-auto md:gap-6 md:text-right">
          <HeaderMetric label="Dinero total" value={money(totalMoney)} />
          <HeaderMetric label="Dinero No Tocar" value={money(protectedMoney)} className="text-destructive" />
          <HeaderMetric label="Libre seguro" value={money(safeFreeMoney)} className="text-success" large />
        </div>
      </div>

      {safeFreeMoney < 0 && (
        <Card className="border-l-4 border-l-destructive bg-destructive/5">
          <CardContent className="p-4 flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-destructive">Atencion requerida</h4>
              <p className="text-sm text-destructive/80 mt-1">
                Tus reservas protegidas superan el dinero disponible. Revisa cuentas o ajusta reservas.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Ingresos del dia" value={money(todayIncome)} icon={<ArrowUpRight className="w-4 h-4 text-success" />} />
        <MetricCard title="Gastos del dia" value={money(todayExpenses)} icon={<ArrowDownRight className="w-4 h-4 text-destructive" />} />
        <MetricCard title="Ganancia neta hoy" value={money(todayProfit)} description={`Margen estimado: ${margin}%`} icon={<Activity className="w-4 h-4 text-primary" />} tone="success" />
        <MetricCard title="Total deudas" value={money(debtTotal)} description={debtTotal > 0 ? 'Pendiente registrado' : 'Sin deudas registradas'} icon={<Wallet className="w-4 h-4 text-muted-foreground" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Flujo de Caja Semanal</CardTitle>
            <CardDescription>Comparativa de ingresos y gastos de los ultimos 7 dias.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} stroke="currentColor" className="text-muted-foreground" />
                  <Tooltip
                    cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 500 }}
                  />
                  <Bar dataKey="ingresos" name="Ingresos" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gastos" name="Gastos" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Como usar mi dinero</CardTitle>
            <CardDescription>Recomendacion basada en tu dinero libre real.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Allocation label="Deudas sugeridas" value={Math.max(safeFreeMoney, 0) * 0.2} percent={20} color="bg-destructive" />
            <Allocation label="Reinversion sugerida" value={Math.max(safeFreeMoney, 0) * 0.4} percent={40} color="bg-primary" note={bestBusiness ? `${bestBusiness.name} tiene mejor resultado neto.` : 'Crea negocios para calcular reinversion.'} />
            <Allocation label="Gastos fijos y reserva" value={Math.max(safeFreeMoney, 0) * 0.25} percent={25} color="bg-border" />
            <Allocation label="Uso personal maximo" value={Math.max(safeFreeMoney, 0) * 0.15} percent={15} color="bg-success" note="Limite sugerido para no afectar reservas." tone="success" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function HeaderMetric({ label, value, className = 'text-foreground', large = false }: { label: string; value: string; className?: string; large?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col">
      <p className={`truncate text-xs font-medium md:text-sm ${className}`}>{label}</p>
      <p className={`${large ? 'text-xl md:text-3xl' : 'text-lg md:text-2xl'} font-display font-bold ${className}`}>{value}</p>
    </div>
  );
}

function MetricCard({ title, value, description, icon, tone }: { title: string; value: string; description?: string; icon: React.ReactNode; tone?: 'success' }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold font-display ${tone === 'success' ? 'text-success' : ''}`}>{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

function Allocation({ label, value, percent, color, note, tone }: { label: string; value: number; percent: number; color: string; note?: string; tone?: 'success' }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-muted-foreground">{label} ({percent}%)</span>
        <span className={`font-bold ${tone === 'success' ? 'text-success' : ''}`}>{money(value)}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
      {note && <p className={`text-xs ${tone === 'success' ? 'text-success/80' : 'text-muted-foreground'} font-medium`}>{note}</p>}
    </div>
  );
}
