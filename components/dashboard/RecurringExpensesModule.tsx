'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Repeat, Calendar, AlertCircle, Play, Pause, Trash2, Clock, TrendingDown, X, Building2, Tags } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { buildFixedExpenseSummary, fixedExpenseCategories, getBusinessUnitId, getBusinessUnitName, money, monthlyCost, PERSONAL_UNIT_ID } from '@/lib/financePlanning';
import { showToast } from '@/lib/toast';

export type Frequency = 'Diario' | 'Semanal' | 'Quincenal' | 'Mensual' | 'Anual' | 'Personalizado';

const frequencies: Frequency[] = ['Diario', 'Semanal', 'Quincenal', 'Mensual', 'Anual', 'Personalizado'];
const chartColors = ['#4f46e5', '#059669', '#f97316', '#db2777', '#0ea5e9', '#a855f7', '#64748b'];
const today = new Date().toISOString().split('T')[0];

const initialExpenseForm = {
  name: '',
  scope: 'personal',
  businessId: '',
  businessUnitId: PERSONAL_UNIT_ID,
  accountId: '',
  category: 'Otros',
  customCategory: '',
  amount: '',
  frequency: 'Mensual',
  startDate: today,
  dueDate: today,
  paymentMethod: '',
  mode: 'reminder',
  isRequired: true,
  isActive: true,
  notes: '',
};

export function RecurringExpensesModule() {
  const { recurringExpenses, businesses, accounts, createRecurringExpense, updateRecurringExpenseStatus, deleteRecurringExpense } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [view, setView] = useState<'empresa' | 'categoria'>('empresa');
  const [form, setForm] = useState(initialExpenseForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const summary = buildFixedExpenseSummary(recurringExpenses, businesses);

  const businessOptions = [
    { id: PERSONAL_UNIT_ID, name: 'Finanzas personales' },
    ...businesses.map((business) => ({ id: business.id, name: business.name })),
  ];
  const customCategoryOptions = Array.from(new Set(recurringExpenses.map((expense) => expense.category).filter(Boolean)))
    .filter((category) => !fixedExpenseCategories.includes(category))
    .sort((a, b) => a.localeCompare(b));

  const openCreateModal = (businessUnitId?: string) => {
    const business = businesses.find((item) => item.id === businessUnitId);
    setForm({
      ...initialExpenseForm,
      scope: business ? 'negocio' : 'personal',
      businessId: business?.id || '',
      businessUnitId: business?.id || PERSONAL_UNIT_ID,
    });
    setError('');
    setShowAddModal(true);
  };

  const resetModal = () => {
    setForm(initialExpenseForm);
    setError('');
    setShowAddModal(false);
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    const category = form.category === 'Personalizada' ? form.customCategory.trim() : form.category;

    try {
      await createRecurringExpense({
        name: form.name,
        scope: form.scope as 'personal' | 'negocio',
        category,
        amount: Number(form.amount),
        frequency: form.frequency,
        start_date: form.startDate,
        next_run_date: form.dueDate,
        due_date: form.dueDate,
        business_unit_id: form.businessUnitId,
        is_required: form.isRequired,
        is_active: form.isActive,
        payment_method: form.paymentMethod,
        mode: form.mode,
        business_id: form.scope === 'negocio' ? form.businessId : null,
        account_id: form.accountId || null,
        notes: form.notes,
      });
      showToast({ type: 'success', title: 'Gasto fijo creado', description: 'Los totales mensuales fueron actualizados.' });
      resetModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar el gasto fijo.';
      setError(message);
      showToast({ type: 'error', title: 'No se pudo guardar', description: message });
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    setWorkingId(id);
    try {
      await updateRecurringExpenseStatus(id, currentStatus === 'active' ? 'paused' : 'active');
      showToast({ type: 'success', title: 'Gasto fijo actualizado' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar.';
      showToast({ type: 'error', title: 'No se pudo actualizar', description: message });
    } finally {
      setWorkingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setWorkingId(id);
    try {
      await deleteRecurringExpense(id);
      showToast({ type: 'success', title: 'Gasto fijo eliminado' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar.';
      showToast({ type: 'error', title: 'No se pudo eliminar', description: message });
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold md:text-3xl">Gastos Recurrentes</h2>
          <p className="text-muted-foreground mt-1">Gastos fijos mensuales por empresa, categoria y fecha de pago.</p>
        </div>
        <Button onClick={() => openCreateModal()} className="w-full gap-2 rounded-xl sm:w-auto">
          <Plus className="w-4 h-4" /> Nuevo gasto fijo
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard label="Total gastos fijos" value={money(summary.totalMonthly)} icon={<Calendar className="w-4 h-4" />} tone="red" />
        <SummaryCard label="Fijos personales" value={money(summary.personalMonthly)} icon={<Clock className="w-4 h-4" />} />
        <SummaryCard label="Fijos negocios" value={money(summary.businessMonthly)} icon={<Building2 className="w-4 h-4" />} />
        <SummaryCard label="Pagos este mes" value={String(summary.upcomingThisMonth)} icon={<Repeat className="w-4 h-4" />} />
        <SummaryCard label="Mayor empresa" value={summary.highestBusiness?.name || 'Sin datos'} description={summary.highestBusiness ? money(summary.highestBusiness.total) : undefined} icon={<TrendingDown className="w-4 h-4" />} />
        <SummaryCard label="Mayor categoria" value={summary.highestCategory?.name || 'Sin datos'} description={summary.highestCategory ? money(summary.highestCategory.total) : undefined} icon={<Tags className="w-4 h-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gastos fijos por empresa</CardTitle>
            <CardDescription>Dona calculada desde recurrentes activos.</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.businessRows.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={summary.businessRows} dataKey="total" nameKey="name" innerRadius={58} outerRadius={95} paddingAngle={3}>
                      {summary.businessRows.map((row, index) => <Cell key={row.id} fill={chartColors[index % chartColors.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => money(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState text="No hay gastos fijos activos para graficar por empresa." />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gastos fijos por categoria</CardTitle>
            <CardDescription>Barras por seccion mensual.</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.categoryRows.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.categoryRows.slice(0, 8)} margin={{ top: 8, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} interval={0} tickFormatter={(value) => String(value).slice(0, 12)} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                    <Tooltip formatter={(value) => money(Number(value))} />
                    <Bar dataKey="total" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState text="No hay gastos fijos activos para graficar por categoria." />}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={view === 'empresa' ? 'default' : 'outline'} onClick={() => setView('empresa')}>Vista por empresa</Button>
        <Button variant={view === 'categoria' ? 'default' : 'outline'} onClick={() => setView('categoria')}>Vista por seccion</Button>
      </div>

      {view === 'empresa' ? (
        <GroupedList
          groups={summary.businessRows}
          emptyText="No hay gastos fijos por empresa."
          actionLabel="Agregar gasto en esta empresa"
          onAdd={openCreateModal}
          onToggle={toggleStatus}
          onDelete={handleDelete}
          workingId={workingId}
          businesses={businesses}
        />
      ) : (
        <GroupedList
          groups={summary.categoryRows.map((row) => ({ ...row, id: row.name }))}
          emptyText="No hay gastos fijos por categoria."
          onToggle={toggleStatus}
          onDelete={handleDelete}
          workingId={workingId}
          businesses={businesses}
        />
      )}

      <Card className="border-l-4 border-l-primary bg-primary/5">
        <CardContent className="p-5 flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-semibold text-primary">Lectura rapida</p>
            <p className="mt-1 text-muted-foreground">
              Tus gastos fijos activos suman {money(summary.totalMonthly)} al mes. La carga mas alta esta en {summary.highestBusiness?.name || 'sin empresa'} y la categoria mas costosa es {summary.highestCategory?.name || 'sin categoria'}.
            </p>
          </div>
        </CardContent>
      </Card>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end justify-center p-4 sm:items-center">
          <Card className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl shadow-xl border-border/50">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <div>
                <CardTitle>Nuevo gasto fijo</CardTitle>
                <CardDescription>Registra empresa, categoria, monto mensualizado y fecha de pago.</CardDescription>
              </div>
              <button onClick={resetModal} className="rounded-xl p-1 text-muted-foreground hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <Field label="Nombre"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="form-field" placeholder="Ej: alquiler oficina" /></Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Empresa / unidad">
                  <select value={form.businessUnitId} onChange={(event) => {
                    const unitId = event.target.value;
                    const isBusiness = businesses.some((business) => business.id === unitId);
                    setForm({ ...form, businessUnitId: unitId, businessId: isBusiness ? unitId : '', scope: isBusiness ? 'negocio' : 'personal' });
                  }} className="form-field">
                    {businessOptions.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                  </select>
                </Field>
                <Field label="Seccion / categoria">
                  <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="form-field">
                    {fixedExpenseCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                    {customCategoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
                    <option value="Personalizada">Personalizada</option>
                  </select>
                </Field>
              </div>
              {form.category === 'Personalizada' && (
                <Field label="Categoria personalizada">
                  <input
                    value={form.customCategory}
                    onChange={(event) => setForm({ ...form, customCategory: event.target.value })}
                    className="form-field"
                    placeholder="Ej: comida, comida de perros, colegio"
                  />
                </Field>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Monto"><input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="form-field" placeholder="0.00" /></Field>
                <Field label="Frecuencia">
                  <select value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value })} className="form-field">
                    {frequencies.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Fecha inicio"><input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} className="form-field" /></Field>
                <Field label="Fecha de pago"><input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="form-field" /></Field>
              </div>
              <Field label="Cuenta relacionada">
                <select value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })} className="form-field">
                  <option value="">Opcional</option>
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm"><input type="checkbox" checked={form.isRequired} onChange={(event) => setForm({ ...form, isRequired: event.target.checked })} /> Obligatorio</label>
                <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> Activo</label>
              </div>
              <Field label="Notas"><input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="form-field" placeholder="Opcional" /></Field>
              {error && <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={resetModal} className="rounded-xl">Cancelar</Button>
              <Button onClick={handleSave} disabled={loading} className="rounded-xl">{loading ? 'Guardando...' : 'Guardar gasto'}</Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}

function GroupedList({ groups, emptyText, actionLabel, onAdd, onToggle, onDelete, workingId, businesses }: {
  groups: { id: string; name: string; total: number; expenses: ReturnType<typeof useStore.getState>['recurringExpenses'] }[];
  emptyText: string;
  actionLabel?: string;
  onAdd?: (id: string) => void;
  onToggle: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  workingId: string | null;
  businesses: ReturnType<typeof useStore.getState>['businesses'];
}) {
  if (groups.length === 0) return <EmptyState text={emptyText} />;
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <Card key={group.id}>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{group.name}</CardTitle>
              <CardDescription>{money(group.total)} al mes · {group.expenses.length} gastos fijos</CardDescription>
            </div>
            {actionLabel && onAdd && group.id !== 'shared' && <Button variant="outline" size="sm" onClick={() => onAdd(group.id)}><Plus className="mr-2 h-4 w-4" />{actionLabel}</Button>}
          </CardHeader>
          <CardContent className="space-y-3">
            {group.expenses.map((expense) => (
              <div key={expense.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="font-medium flex flex-wrap items-center gap-2">
                    {expense.name}
                    {expense.status !== 'active' && <Badge variant="secondary">Pausado</Badge>}
                    {expense.is_required === false && <Badge variant="outline">Opcional</Badge>}
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {getBusinessUnitName(getBusinessUnitId(expense), businesses)} · {expense.category || 'Otros'} · Pago: {expense.due_date || expense.next_run_date}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 md:justify-end">
                  <div className="text-right">
                    <p className="font-bold">{money(monthlyCost(expense))}</p>
                    <p className="text-xs text-muted-foreground">{money(Number(expense.amount))} / {expense.frequency}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" disabled={workingId === expense.id} onClick={() => onToggle(expense.id, expense.status)} className="h-8 w-8">
                      {expense.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" disabled={workingId === expense.id} onClick={() => onDelete(expense.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SummaryCard({ icon, label, value, description, tone }: { icon: React.ReactNode; label: string; value: string; description?: string; tone?: 'red' }) {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <h3 className="text-sm font-medium">{label}</h3>
          {icon}
        </div>
        <p className={`mt-2 truncate text-xl font-display font-bold ${tone === 'red' ? 'text-destructive' : ''}`}>{value}</p>
        {description && <p className="mt-1 truncate text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">{text}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm font-medium text-muted-foreground">{label}</span>{children}</label>;
}
