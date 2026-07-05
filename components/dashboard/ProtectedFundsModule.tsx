'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ShieldAlert, Lock, Unlock, AlertTriangle, TrendingDown, Trash2, PiggyBank, X } from 'lucide-react';
import { showToast } from '@/lib/toast';

export type FundType = 'Deudas' | 'Nomina' | 'Inventario' | 'Alquiler' | 'Publicidad' | 'Impuestos' | 'Ahorro personal' | 'Reserva de emergencia' | 'Reposicion de producto' | 'Gastos fijos' | 'Otro';
export type Priority = 'Critica' | 'Alta' | 'Media' | 'Baja';

const fundTypes: FundType[] = ['Deudas', 'Nomina', 'Inventario', 'Alquiler', 'Publicidad', 'Impuestos', 'Ahorro personal', 'Reserva de emergencia', 'Reposicion de producto', 'Gastos fijos', 'Otro'];
const priorities: Priority[] = ['Critica', 'Alta', 'Media', 'Baja'];

const initialFundForm = {
  name: '',
  scope: 'negocio',
  businessId: '',
  accountId: '',
  fundType: 'Gastos fijos',
  amount: '',
  priority: 'Alta',
  targetDate: '',
  blockWithdrawals: true,
  notes: '',
};

export function ProtectedFundsModule() {
  const { protectedFunds, accounts, businesses, createProtectedFund, deleteProtectedFund } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(initialFundForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const activeFunds = protectedFunds.filter((fund) => fund.status === 'active');
  const totalProtected = activeFunds.reduce((sum, fund) => sum + Number(fund.amount), 0);
  const totalBlocked = activeFunds.filter((fund) => fund.block_withdrawals).reduce((sum, fund) => sum + Number(fund.amount), 0);
  const totalCash = accounts.reduce((sum, account) => sum + Number(account.current_balance), 0);
  const safeFreeCash = totalCash - totalProtected;

  const resetModal = () => {
    setForm(initialFundForm);
    setError('');
    setShowAddModal(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critica':
      case 'Crítica':
        return 'bg-red-500/10 text-red-500 hover:bg-red-500/20';
      case 'Alta':
        return 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20';
      case 'Media':
        return 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20';
      case 'Baja':
        return 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      await createProtectedFund({
        name: form.name,
        scope: form.scope as 'personal' | 'negocio',
        fund_type: form.fundType,
        amount: Number(form.amount),
        priority: form.priority,
        target_date: form.targetDate,
        block_withdrawals: form.blockWithdrawals,
        business_id: form.scope === 'negocio' ? form.businessId : null,
        account_id: form.accountId || null,
        notes: form.notes,
      });
      showToast({ type: 'success', title: 'Reserva creada', description: 'El dashboard fue actualizado.' });
      resetModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar la reserva.';
      setError(message);
      showToast({ type: 'error', title: 'No se pudo guardar la reserva', description: message });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteProtectedFund(id);
      showToast({ type: 'success', title: 'Reserva eliminada', description: 'El dashboard fue actualizado.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar la reserva.';
      showToast({ type: 'error', title: 'No se pudo eliminar', description: message });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto h-full max-w-7xl space-y-5 overflow-y-auto pb-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-destructive md:text-3xl">Dinero No Tocar</h2>
          <p className="text-muted-foreground mt-1">Protege reservas para pagos, nomina e inventario.</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} variant="destructive" className="w-full gap-2 rounded-xl sm:w-auto">
          <Plus className="w-4 h-4" /> Nueva reserva
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-muted-foreground mb-2">
              <TrendingDown className="w-4 h-4" />
              <h3 className="font-medium text-sm">Dinero total</h3>
            </div>
            <p className="text-2xl font-display font-bold md:text-3xl">${totalCash.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground mt-1">Saldo en todas tus cuentas</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-destructive/30 bg-destructive/5 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-destructive mb-2">
              <ShieldAlert className="w-4 h-4" />
              <h3 className="font-medium text-sm">Dinero No Tocar</h3>
            </div>
            <p className="text-2xl font-display font-bold text-destructive md:text-3xl">${totalProtected.toFixed(2)}</p>
            <p className="text-sm text-destructive/80 mt-1">Bloqueado: ${totalBlocked.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-success/30 bg-success/5 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-success mb-2">
              <PiggyBank className="w-4 h-4" />
              <h3 className="font-medium text-sm">Dinero libre seguro</h3>
            </div>
            <p className="text-2xl font-display font-bold text-success md:text-3xl">${safeFreeCash.toFixed(2)}</p>
            <p className="text-sm text-success/80 mt-1">Disponible para usar sin riesgo</p>
          </CardContent>
        </Card>
      </div>

      {activeFunds.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-start gap-3 text-destructive">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium">Proteccion de flujo de caja</h4>
            <ul className="text-sm mt-1 space-y-1 list-disc list-inside opacity-90">
              <li>Tu dinero libre real es <strong>${safeFreeCash.toFixed(2)}</strong>.</li>
              {activeFunds.filter((fund) => fund.priority === 'Critica' || fund.priority === 'Crítica').map((fund) => (
                <li key={fund.id}>No toques <strong>${Number(fund.amount).toFixed(2)}</strong> reservados para <strong>{fund.name}</strong>.</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <Card className="rounded-2xl border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Reservas protegidas</CardTitle>
          <CardDescription>Dinero comprometido que no debe ser utilizado para otros fines.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeFunds.map((fund) => (
              <div key={fund.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/5 transition-colors gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${fund.block_withdrawals ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                    {fund.block_withdrawals ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-medium flex items-center gap-2">
                      {fund.name}
                      <Badge variant="secondary" className={getPriorityColor(fund.priority)}>{fund.priority}</Badge>
                    </h4>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <span>{fund.fund_type}</span>
                      <span>-</span>
                      <span className="capitalize">{fund.scope}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6">
                  <div className="text-right">
                    <p className="font-bold text-lg text-destructive">${Number(fund.amount).toFixed(2)}</p>
                  </div>
                  <Button variant="ghost" size="icon" disabled={deletingId === fund.id} onClick={() => handleDelete(fund.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {activeFunds.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No tienes reservas de dinero protegido.</p>
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
                <CardTitle>Nueva reserva protegida</CardTitle>
                <CardDescription>Aparta dinero para obligaciones futuras.</CardDescription>
              </div>
              <button onClick={resetModal} className="rounded-xl p-1 text-muted-foreground hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <Field label="Nombre">
                <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="form-field" placeholder="Ej: Nomina quincenal" />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Tipo">
                  <select value={form.fundType} onChange={(event) => setForm({ ...form, fundType: event.target.value })} className="form-field">
                    {fundTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </Field>
                <Field label="Monto">
                  <input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="form-field" placeholder="0.00" />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Prioridad">
                  <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="form-field">
                    {priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
                  </select>
                </Field>
                <Field label="Fecha meta">
                  <input type="date" value={form.targetDate} onChange={(event) => setForm({ ...form, targetDate: event.target.value })} className="form-field" />
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
              <label className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm">
                <input type="checkbox" checked={form.blockWithdrawals} onChange={(event) => setForm({ ...form, blockWithdrawals: event.target.checked })} />
                Bloquear retiro de este dinero
              </label>
              <Field label="Notas">
                <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="form-field" placeholder="Opcional" />
              </Field>
              {error && <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={resetModal} className="rounded-xl">Cancelar</Button>
              <Button variant="destructive" onClick={handleSave} disabled={loading} className="rounded-xl">
                {loading ? 'Guardando...' : 'Guardar reserva'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
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
