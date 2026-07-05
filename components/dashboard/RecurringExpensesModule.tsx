'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Repeat, Calendar, AlertCircle, Play, Pause, Trash2, Clock, TrendingDown, X } from 'lucide-react';
import { showToast } from '@/lib/toast';

export type Frequency = 'Diario' | 'Semanal' | 'Quincenal' | 'Mensual' | 'Anual' | 'Personalizado';

const frequencies: Frequency[] = ['Diario', 'Semanal', 'Quincenal', 'Mensual', 'Anual', 'Personalizado'];
const today = new Date().toISOString().split('T')[0];

const initialExpenseForm = {
  name: '',
  scope: 'personal',
  businessId: '',
  accountId: '',
  category: '',
  amount: '',
  frequency: 'Mensual',
  startDate: today,
  nextRunDate: today,
  paymentMethod: '',
  mode: 'reminder',
  notes: '',
};

export function RecurringExpensesModule() {
  const { recurringExpenses, businesses, accounts, createRecurringExpense, updateRecurringExpenseStatus, deleteRecurringExpense } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(initialExpenseForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const activeExpenses = recurringExpenses.filter((expense) => expense.status === 'active');

  const calculateMonthlyCost = (expense: { frequency: string; amount: number }) => {
    switch (expense.frequency) {
      case 'Diario': return Number(expense.amount) * 30;
      case 'Semanal': return Number(expense.amount) * 4.33;
      case 'Quincenal': return Number(expense.amount) * 2;
      case 'Mensual': return Number(expense.amount);
      case 'Anual': return Number(expense.amount) / 12;
      default: return Number(expense.amount);
    }
  };

  const totalMonthly = activeExpenses.reduce((sum, expense) => sum + calculateMonthlyCost(expense), 0);
  const totalDaily = totalMonthly / 30;
  const totalWeekly = totalMonthly / 4.33;
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingExpenses = activeExpenses.filter((expense) => expense.next_run_date >= todayStr).sort((a, b) => a.next_run_date.localeCompare(b.next_run_date));
  const highestImpact = [...activeExpenses].sort((a, b) => calculateMonthlyCost(b) - calculateMonthlyCost(a))[0];

  const resetModal = () => {
    setForm(initialExpenseForm);
    setError('');
    setShowAddModal(false);
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      await createRecurringExpense({
        name: form.name,
        scope: form.scope as 'personal' | 'negocio',
        category: form.category,
        amount: Number(form.amount),
        frequency: form.frequency,
        start_date: form.startDate,
        next_run_date: form.nextRunDate,
        payment_method: form.paymentMethod,
        mode: form.mode,
        business_id: form.scope === 'negocio' ? form.businessId : null,
        account_id: form.accountId || null,
        notes: form.notes,
      });
      showToast({ type: 'success', title: 'Recurrente creado', description: 'El dashboard fue actualizado.' });
      resetModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar el recurrente.';
      setError(message);
      showToast({ type: 'error', title: 'No se pudo guardar el recurrente', description: message });
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    setWorkingId(id);
    try {
      await updateRecurringExpenseStatus(id, currentStatus === 'active' ? 'paused' : 'active');
      showToast({ type: 'success', title: 'Recurrente actualizado' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar el recurrente.';
      showToast({ type: 'error', title: 'No se pudo actualizar', description: message });
    } finally {
      setWorkingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setWorkingId(id);
    try {
      await deleteRecurringExpense(id);
      showToast({ type: 'success', title: 'Recurrente eliminado', description: 'El dashboard fue actualizado.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar el recurrente.';
      showToast({ type: 'error', title: 'No se pudo eliminar', description: message });
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="mx-auto h-full max-w-7xl space-y-5 overflow-y-auto pb-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold md:text-3xl">Gastos Recurrentes</h2>
          <p className="text-muted-foreground mt-1">Automatiza y monitorea tus pagos repetitivos.</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="w-full gap-2 rounded-xl sm:w-auto">
          <Plus className="w-4 h-4" /> Nuevo recurrente
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard icon={<Calendar className="w-4 h-4" />} label="Proyeccion mensual" value={`$${totalMonthly.toFixed(2)}`} description="Impacto total estimado por mes" tone="red" />
        <SummaryCard icon={<Clock className="w-4 h-4" />} label="Gasto diario promedio" value={`$${totalDaily.toFixed(2)}`} description={`~$${totalWeekly.toFixed(2)} por semana`} />
        <SummaryCard icon={<TrendingDown className="w-4 h-4" />} label="Mayor impacto" value={highestImpact ? highestImpact.name : 'N/A'} description={highestImpact ? `$${calculateMonthlyCost(highestImpact).toFixed(2)} al mes` : 'Sin gastos activos'} />
      </div>

      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-start gap-3 text-primary">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium">Insights financieros</h4>
          <ul className="text-sm opacity-80 mt-1 space-y-1 list-disc list-inside">
            {upcomingExpenses.length === 0 && <li>Aun no hay gastos recurrentes activos.</li>}
            {upcomingExpenses.length > 0 && upcomingExpenses[0].next_run_date === todayStr && (
              <li>Tienes gastos recurrentes programados para hoy ({upcomingExpenses.filter((expense) => expense.next_run_date === todayStr).length}).</li>
            )}
            <li>Tus recurrentes mensuales suman ${totalMonthly.toFixed(2)}.</li>
            {highestImpact && highestImpact.frequency === 'Diario' && (
              <li>{highestImpact.name} diario consume ${calculateMonthlyCost(highestImpact).toFixed(2)} al mes.</li>
            )}
          </ul>
        </div>
      </div>

      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Suscripciones y gastos fijos</CardTitle>
          <CardDescription>Administra los pagos que se repiten en el tiempo.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recurringExpenses.map((expense) => (
              <div key={expense.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/5 transition-colors gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Repeat className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium flex items-center gap-2">
                      {expense.name}
                      {expense.status === 'paused' && <Badge variant="secondary" className="text-xs">Pausado</Badge>}
                      {expense.status === 'cancelled' && <Badge variant="secondary" className="text-xs">Cancelado</Badge>}
                    </h4>
                    <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-2 mt-1">
                      <span>{expense.frequency}</span>
                      <span>-</span>
                      <span className={expense.mode === 'auto_register' ? 'text-primary' : 'text-orange-500'}>
                        {expense.mode === 'auto_register' ? 'Auto-registrar' : 'Solo recordar'}
                      </span>
                      <span>-</span>
                      <span>Proximo: {expense.next_run_date}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6">
                  <div className="text-right">
                    <p className="font-bold text-lg">${Number(expense.amount).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{expense.category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" disabled={workingId === expense.id} onClick={() => toggleStatus(expense.id, expense.status)} className="h-8 w-8 text-muted-foreground hover:text-primary">
                      {expense.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" disabled={workingId === expense.id} onClick={() => handleDelete(expense.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {recurringExpenses.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Repeat className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No tienes gastos recurrentes configurados.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end justify-center p-4 sm:items-center">
          <Card className="w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl shadow-xl border-border/50">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <div>
                <CardTitle>Nuevo gasto recurrente</CardTitle>
                <CardDescription>Configura un pago automatico o recordatorio.</CardDescription>
              </div>
              <button onClick={resetModal} className="rounded-xl p-1 text-muted-foreground hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <Field label="Nombre">
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="form-field" placeholder="Ej: alquiler oficina" />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Categoria">
                  <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="form-field" placeholder="Ej: alquiler" />
                </Field>
                <Field label="Monto">
                  <input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="form-field" placeholder="0.00" />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Frecuencia">
                  <select value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value })} className="form-field">
                    {frequencies.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
                  </select>
                </Field>
                <Field label="Metodo de pago">
                  <input value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })} className="form-field" placeholder="Ej: tarjeta" />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Fecha inicio">
                  <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} className="form-field" />
                </Field>
                <Field label="Proxima fecha">
                  <input type="date" value={form.nextRunDate} onChange={(event) => setForm({ ...form, nextRunDate: event.target.value })} className="form-field" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={form.scope === 'personal' ? 'default' : 'outline'} onClick={() => setForm({ ...form, scope: 'personal', businessId: '' })}>Personal</Button>
                <Button type="button" variant={form.scope === 'negocio' ? 'default' : 'outline'} onClick={() => setForm({ ...form, scope: 'negocio' })}>Negocio</Button>
              </div>
              {form.scope === 'negocio' && (
                <Field label="Negocio">
                  <select value={form.businessId} onChange={(event) => setForm({ ...form, businessId: event.target.value })} className="form-field">
                    <option value="">Selecciona negocio</option>
                    {businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Cuenta relacionada">
                <select value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })} className="form-field">
                  <option value="">Opcional</option>
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </Field>
              <Field label="Modo">
                <select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value })} className="form-field">
                  <option value="reminder">Solo recordar</option>
                  <option value="auto_register">Auto-registrar</option>
                </select>
              </Field>
              <Field label="Notas">
                <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="form-field" placeholder="Opcional" />
              </Field>
              {error && <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={resetModal} className="rounded-xl">Cancelar</Button>
              <Button onClick={handleSave} disabled={loading} className="rounded-xl">
                {loading ? 'Guardando...' : 'Guardar gasto'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, description, tone }: { icon: React.ReactNode; label: string; value: string; description: string; tone?: 'red' }) {
  return (
    <Card className="rounded-2xl border-border/50 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center space-x-2 text-muted-foreground mb-2">
          {icon}
          <h3 className="font-medium text-sm">{label}</h3>
        </div>
        <p className={`text-2xl font-display font-bold md:text-3xl ${tone === 'red' ? 'text-red-500' : ''}`}>{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
