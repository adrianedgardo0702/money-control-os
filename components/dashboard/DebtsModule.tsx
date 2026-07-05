'use client';

import { useState } from 'react';
import { useStore, Debt } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, AlertTriangle, TrendingDown, CheckCircle2, Calendar, ShieldCheck, Plus, X } from 'lucide-react';
import { showToast } from '@/lib/toast';

const initialDebtForm = {
  name: '',
  type: 'Tarjeta de credito',
  category: '',
  originalAmount: '',
  pending: '',
  paid: '0',
  minimum: '',
  dueDate: '',
  interest: '0',
  priority: 'Media',
  status: 'Al dia',
  risk: 'Medio',
  recommendation: '',
};

const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function DebtsModule() {
  const { debts, createDebt } = useStore();
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [form, setForm] = useState(initialDebtForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [simulatorInput, setSimulatorInput] = useState('');

  const totalPending = debts.reduce((sum, debt) => sum + Number(debt.pending), 0);
  const minimumMonthly = debts.reduce((sum, debt) => sum + Number(debt.minimum || 0), 0);
  const nextPayments = debts.filter((debt) => debt.status !== 'Pagada').reduce((sum, debt) => sum + Number(debt.minimum || 0), 0);
  const criticalDebt = [...debts].sort((a, b) => priorityScore(b) - priorityScore(a))[0];
  const recommendedPayment = minimumMonthly + Math.min(Math.max(totalPending - minimumMonthly, 0), minimumMonthly * 0.5);

  const resetModal = () => {
    setForm(initialDebtForm);
    setError('');
    setShowDebtModal(false);
  };

  const handleCreateDebt = async () => {
    setLoading(true);
    setError('');

    try {
      await createDebt({
        name: form.name,
        type: form.type,
        category: form.category,
        original_amount: Number(form.originalAmount),
        pending: Number(form.pending),
        paid: Number(form.paid || 0),
        minimum: Number(form.minimum || 0),
        due_date: form.dueDate,
        interest: Number(form.interest || 0),
        priority: form.priority,
        status: form.status,
        risk: form.risk,
        recommendation: form.recommendation,
      });
      showToast({ type: 'success', title: 'Deuda creada', description: 'El dashboard fue actualizado.' });
      resetModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear la deuda.';
      setError(message);
      showToast({ type: 'error', title: 'No se pudo crear la deuda', description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold tracking-tight md:text-3xl">Deudas</h2>
          <p className="text-muted-foreground mt-1">Organiza tus deudas, prioriza pagos y evita afectar tu flujo de caja.</p>
        </div>
        <Button onClick={() => setShowDebtModal(true)} className="w-full md:w-auto">
          <Plus className="w-4 h-4 mr-2" /> Agregar deuda
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Summary title="Deuda total pendiente" value={money(totalPending)} icon={<CreditCard className="w-4 h-4 text-primary" />} />
        <Summary title="Pago minimo mensual" value={money(minimumMonthly)} icon={<TrendingDown className="w-4 h-4 text-warning" />} tone="warning" />
        <Summary title="Pagos proximos" value={money(nextPayments)} icon={<Calendar className="w-4 h-4 text-muted-foreground" />} />
        <Summary title="Deuda critica" value={criticalDebt?.name || 'N/A'} detail={criticalDebt ? money(Number(criticalDebt.pending)) : money(0)} icon={<AlertTriangle className="w-4 h-4" />} tone="destructive" />
        <Summary title="Pago recomendado" value={money(recommendedPayment)} icon={<ShieldCheck className="w-4 h-4" />} tone="success" />
      </div>

      {debts.length > 0 && (
        <Card className="border-l-4 border-l-primary bg-primary/5 shadow-md">
          <CardContent className="p-6 flex items-start gap-4">
            <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
            <div className="w-full">
              <h4 className="font-display font-semibold text-primary text-lg">Plan recomendado</h4>
              <p className="text-base text-foreground/90 mt-2 leading-relaxed">
                Cubre primero los pagos minimos ({money(minimumMonthly)}). Si hay flujo extra, dirige el abono a {criticalDebt?.name || 'la deuda de mayor prioridad'}.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h3 className="text-xl font-display font-semibold">Lista de deudas</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {debts.map((debt) => (
            <DebtCard key={debt.id} debt={debt} />
          ))}
          {debts.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-muted-foreground">
                <CreditCard className="mx-auto mb-3 h-10 w-10 opacity-25" />
                <p className="mb-4">Todavia no hay deudas registradas.</p>
                <Button onClick={() => setShowDebtModal(true)}>Crear primera deuda</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Simulador de pagos</CardTitle>
            <CardDescription>Calcula cuanto quedaria para abono extra despues de minimos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Cuanto puedes pagar este mes?</span>
              <input
                type="number"
                placeholder="1200"
                value={simulatorInput}
                onChange={(event) => setSimulatorInput(event.target.value)}
                className="form-field h-12 font-bold text-lg"
              />
            </label>
            <div className="p-4 rounded-xl border border-border/50 bg-muted/20 space-y-3">
              <Row label="Pago a minimos" value={minimumMonthly} />
              <Row label={`Abono extra${criticalDebt ? ` a ${criticalDebt.name}` : ''}`} value={Math.max(0, Number(simulatorInput || 0) - minimumMonthly)} tone="success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Impacto en flujo de caja</CardTitle>
            <CardDescription>Vista rapida de deuda pendiente contra pago recomendado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Deuda pendiente" value={totalPending} />
            <Row label="Pago recomendado" value={recommendedPayment} tone="destructive" />
            <Row label="Pendiente despues del pago recomendado" value={Math.max(0, totalPending - recommendedPayment)} />
          </CardContent>
        </Card>
      </div>

      {showDebtModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <Card className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto border-border shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div>
                <CardTitle>Nueva deuda</CardTitle>
                <CardDescription>Registra el saldo pendiente y pago minimo.</CardDescription>
              </div>
              <button onClick={resetModal} className="rounded-xl p-1 text-muted-foreground hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <Field label="Nombre">
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="form-field" />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Tipo">
                  <input value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="form-field" />
                </Field>
                <Field label="Categoria">
                  <input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="form-field" placeholder="Personal o negocio" />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Monto original">
                  <input type="number" min="0" step="0.01" value={form.originalAmount} onChange={(event) => setForm({ ...form, originalAmount: event.target.value })} className="form-field" />
                </Field>
                <Field label="Pendiente">
                  <input type="number" min="0" step="0.01" value={form.pending} onChange={(event) => setForm({ ...form, pending: event.target.value })} className="form-field" />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Pagado">
                  <input type="number" min="0" step="0.01" value={form.paid} onChange={(event) => setForm({ ...form, paid: event.target.value })} className="form-field" />
                </Field>
                <Field label="Pago minimo">
                  <input type="number" min="0" step="0.01" value={form.minimum} onChange={(event) => setForm({ ...form, minimum: event.target.value })} className="form-field" />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Vencimiento">
                  <input type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} className="form-field" />
                </Field>
                <Field label="Interes %">
                  <input type="number" min="0" step="0.01" value={form.interest} onChange={(event) => setForm({ ...form, interest: event.target.value })} className="form-field" />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Prioridad">
                  <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="form-field">
                    <option value="Critica">Critica</option>
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                  </select>
                </Field>
                <Field label="Riesgo">
                  <select value={form.risk} onChange={(event) => setForm({ ...form, risk: event.target.value })} className="form-field">
                    <option value="Alto">Alto</option>
                    <option value="Medio">Medio</option>
                    <option value="Bajo">Bajo</option>
                  </select>
                </Field>
              </div>
              <Field label="Recomendacion">
                <input value={form.recommendation} onChange={(event) => setForm({ ...form, recommendation: event.target.value })} className="form-field" placeholder="Opcional" />
              </Field>
              {error && <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={resetModal}>Cancelar</Button>
              <Button onClick={handleCreateDebt} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar deuda'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}

function priorityScore(debt: Debt) {
  const scores: Record<string, number> = { Critica: 4, Crítica: 4, Alta: 3, Media: 2, Baja: 1 };
  return scores[debt.priority || ''] || 0;
}

function progress(debt: Debt) {
  const original = Number(debt.original_amount);
  if (!original) return 0;
  return Math.min(100, Math.round((Number(debt.paid || 0) / original) * 100));
}

function DebtCard({ debt }: { debt: Debt }) {
  const debtProgress = progress(debt);

  return (
    <Card className="flex flex-col hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex justify-between items-start gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {debt.name}
              {debt.risk === 'Alto' && <AlertTriangle className="w-4 h-4 text-destructive" />}
            </CardTitle>
            <CardDescription className="mt-1">{debt.category || 'Sin categoria'} - {debt.type}</CardDescription>
          </div>
          <Badge variant={debt.priority === 'Critica' || debt.priority === 'Alta' ? 'warning' : 'secondary'}>{debt.priority || 'Media'}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 flex-1 space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Monto pendiente</p>
            <p className="text-2xl font-bold text-foreground">{money(Number(debt.pending))}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-1">Pago minimo</p>
            <p className="text-lg font-bold text-warning">{money(Number(debt.minimum || 0))}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progreso de pago</span>
            <span className="font-medium">{debtProgress}% ({money(Number(debt.paid || 0))} pagados)</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${debtProgress}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50 text-sm">
          <div>
            <p className="text-[10px] text-muted-foreground">Vence</p>
            <p className="font-medium">{debt.due_date || 'Sin fecha'}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Interes</p>
            <p className="font-medium">{Number(debt.interest || 0)}%</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Riesgo</p>
            <p className="font-medium">{debt.risk || 'Medio'}</p>
          </div>
        </div>
        {debt.recommendation && (
          <div className="p-3 rounded-lg border border-border/50 bg-muted/20 text-xs font-medium text-orange-400">
            Recomendacion: {debt.recommendation}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Summary({ title, value, detail, icon, tone }: { title: string; value: string; detail?: string; icon: React.ReactNode; tone?: 'warning' | 'destructive' | 'success' }) {
  const toneClass = tone === 'warning' ? 'text-warning' : tone === 'destructive' ? 'text-destructive' : tone === 'success' ? 'text-success' : '';
  return (
    <Card className={tone === 'destructive' ? 'bg-destructive/10 border-destructive/20' : tone === 'success' ? 'bg-success/10 border-success/20' : 'bg-card'}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm font-medium flex items-center justify-between ${toneClass || 'text-muted-foreground'}`}>
          {title} {icon}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold font-display truncate ${toneClass}`}>{value}</div>
        {detail && <div className={`font-bold text-sm mt-0.5 ${toneClass}`}>{detail}</div>}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'destructive' }) {
  const toneClass = tone === 'success' ? 'text-success' : tone === 'destructive' ? 'text-destructive' : '';
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${toneClass}`}>{money(value)}</span>
    </div>
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
