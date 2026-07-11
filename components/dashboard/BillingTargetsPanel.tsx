'use client';

import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, TrendingUp, CalendarDays, PiggyBank, Save, Settings2, AlertCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { buildTargetPlan, defaultMonthlyTarget, money, PERSONAL_UNIT_ID } from '@/lib/financePlanning';
import { showToast } from '@/lib/toast';

type TargetForm = typeof defaultMonthlyTarget;

export function BillingTargetsPanel({ compact = false }: { compact?: boolean }) {
  const {
    businesses,
    recurringExpenses,
    debts,
    transactions,
    protectedFunds,
    monthlyTarget,
    businessTargetWeights,
    upsertMonthlyTarget,
    upsertBusinessTargetWeights,
  } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TargetForm>(defaultMonthlyTarget);
  const [weights, setWeights] = useState<Record<string, string>>({});
  const plan = buildTargetPlan({ target: monthlyTarget, weights: businessTargetWeights, businesses, recurringExpenses, debts, transactions, protectedFunds });
  const businessUnits = [{ id: PERSONAL_UNIT_ID, name: 'Finanzas personales' }, ...businesses.map((business) => ({ id: business.id, name: business.name }))];
  const realVsTarget = [
    { name: 'Real', value: plan.realMonthlyRevenue },
    { name: 'Minima', value: plan.breakEvenMonthly },
    { name: 'Ideal', value: plan.idealMonthly },
  ];

  const currentWeights = () => {
    const nextWeights: Record<string, string> = {};
    businessUnits.forEach((unit) => {
      const saved = businessTargetWeights.find((weight) => weight.business_unit_id === unit.id);
      nextWeights[unit.id] = String(saved?.weight_percent ?? 0);
    });
    return nextWeights;
  };

  const toggleEditor = () => {
    if (!isEditing) {
      setForm(monthlyTarget || defaultMonthlyTarget);
      setWeights(currentWeights());
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertMonthlyTarget({
        operating_days_per_month: Number(form.operating_days_per_month || 26),
        personal_budget_target: Number(form.personal_budget_target || 0),
        debt_payment_target: Number(form.debt_payment_target || 0),
        reinvestment_target: Number(form.reinvestment_target || 0),
        desired_profit: Number(form.desired_profit || 0),
        reserve_target: Number(form.reserve_target || 0),
        growth_target: Number(form.growth_target || 0),
      });
      await upsertBusinessTargetWeights(businessUnits.map((unit) => ({
        business_unit_id: unit.id,
        weight_percent: Number(weights[unit.id] || 0),
      })));
      setIsEditing(false);
      showToast({ type: 'success', title: 'Metas guardadas', description: 'Las metas de facturacion fueron recalculadas.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudieron guardar las metas.';
      showToast({ type: 'error', title: 'No se pudieron guardar las metas', description: message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Metas de Facturacion</CardTitle>
          <CardDescription>Calcula cuanto necesitas vender por mes, semana, dia y por negocio.</CardDescription>
        </div>
        <Button variant={isEditing ? 'default' : 'outline'} onClick={toggleEditor}>
          <Settings2 className="mr-2 h-4 w-4" /> {isEditing ? 'Cerrar configuracion' : 'Editar metas'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          <Metric label="Gastos fijos mensuales" value={plan.fixed.totalMonthly} icon={<CalendarDays className="h-4 w-4" />} />
          <Metric label="Pagos minimos deuda" value={plan.debtPayment} icon={<AlertCircle className="h-4 w-4" />} tone="warning" />
          <Metric label="Meta mensual minima" value={plan.breakEvenMonthly} icon={<Target className="h-4 w-4" />} />
          <Metric label="Meta mensual ideal" value={plan.idealMonthly} icon={<TrendingUp className="h-4 w-4" />} tone="success" />
          <Metric label="Meta diaria ideal" value={plan.idealDaily} icon={<PiggyBank className="h-4 w-4" />} tone="success" />
        </div>

        {!compact && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Metric label="Presupuesto personal" value={plan.personalBudget} />
            <Metric label="Reinversion objetivo" value={plan.reinvestment} />
            <Metric label="Utilidad objetivo" value={plan.desiredProfit} tone="success" />
            <Metric label="Diferencia vs meta" value={plan.missingToIdeal} tone={plan.missingToIdeal > 0 ? 'warning' : 'success'} />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">Progreso de facturacion del mes</span>
            <span className="font-bold">{plan.progressToIdeal}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-background">
            <div className="h-full rounded-full bg-success" style={{ width: `${plan.progressToIdeal}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">Facturacion real: {money(plan.realMonthlyRevenue)} · Falta para meta ideal: {money(plan.missingToIdeal)}</p>
        </div>

        {isEditing && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <NumberField label="Dias operativos" value={form.operating_days_per_month} onChange={(value) => setForm({ ...form, operating_days_per_month: Number(value) })} />
              <NumberField label="Presupuesto personal" value={form.personal_budget_target} onChange={(value) => setForm({ ...form, personal_budget_target: Number(value) })} />
              <NumberField label="Pago de deudas" value={form.debt_payment_target} onChange={(value) => setForm({ ...form, debt_payment_target: Number(value) })} />
              <NumberField label="Reinversion" value={form.reinvestment_target} onChange={(value) => setForm({ ...form, reinvestment_target: Number(value) })} />
              <NumberField label="Utilidad deseada" value={form.desired_profit} onChange={(value) => setForm({ ...form, desired_profit: Number(value) })} />
              <NumberField label="Reserva" value={form.reserve_target} onChange={(value) => setForm({ ...form, reserve_target: Number(value) })} />
              <NumberField label="Crecimiento" value={form.growth_target} onChange={(value) => setForm({ ...form, growth_target: Number(value) })} />
            </div>
            <div>
              <h4 className="mb-2 text-sm font-semibold">Reparto por negocio</h4>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {businessUnits.map((unit) => (
                  <NumberField key={unit.id} label={`${unit.name} %`} value={Number(weights[unit.id] || 0)} onChange={(value) => setWeights({ ...weights, [unit.id]: value })} />
                ))}
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving}><Save className="mr-2 h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar metas'}</Button>
          </div>
        )}

        {!compact && (
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Facturacion real vs meta" description="Comparacion del mes actual." data={realVsTarget} />
            <ChartCard title="Meta por negocio" description="Segun porcentajes configurados." data={plan.targetByBusiness.map((item) => ({ name: item.name, value: item.monthly }))} empty="Configura porcentajes por negocio para ver el reparto." />
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <Insight text={`Necesitas facturar ${money(plan.idealDaily)} por dia para cubrir gastos fijos, deudas, reinversion y utilidad objetivo.`} />
          <Insight text={plan.missingToIdeal > 0 ? `Actualmente vas ${money(plan.missingToIdeal)} por debajo de la meta mensual ideal.` : 'Ya cubriste la meta mensual ideal configurada.'} />
          <Insight text={`Tus gastos fijos mas altos estan en ${plan.fixed.highestCategory?.name || 'sin categoria'} y ${plan.fixed.highestBusiness?.name || 'sin empresa'}.`} />
          <Insight text={`Para cerrar con utilidad de ${money(plan.desiredProfit)} necesitas facturar ${money(Math.max(0, plan.idealMonthly - plan.realMonthlyRevenue))} adicionales.`} />
        </div>

        {plan.targetByBusiness.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {plan.targetByBusiness.map((row) => (
              <div key={row.id} className="rounded-xl border border-border bg-card p-4">
                <p className="truncate text-sm font-semibold">{row.name}</p>
                <p className="mt-2 text-xl font-bold text-primary">{money(row.daily)}/dia</p>
                <p className="text-xs text-muted-foreground">{money(row.monthly)} al mes · {row.weight}%</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, icon, tone }: { label: string; value: number; icon?: React.ReactNode; tone?: 'success' | 'warning' }) {
  const color = tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : '';
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className={`flex items-center justify-between text-sm font-medium ${color || 'text-muted-foreground'}`}>
        <span>{label}</span>
        {icon}
      </div>
      <p className={`mt-2 text-xl font-display font-bold ${color}`}>{money(value)}</p>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: string) => void }) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-muted-foreground">{label}</span>
      <input className="form-field" type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ChartCard({ title, description, data, empty }: { title: string; description: string; data: { name: string; value: number }[]; empty?: string }) {
  const hasData = data.some((item) => Number(item.value) > 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => String(value).slice(0, 12)} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                <Tooltip formatter={(value) => money(Number(value))} />
                <Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">{empty || 'No hay datos suficientes.'}</div>
        )}
      </CardContent>
    </Card>
  );
}

function Insight({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-sm text-muted-foreground">
      {text}
    </div>
  );
}
