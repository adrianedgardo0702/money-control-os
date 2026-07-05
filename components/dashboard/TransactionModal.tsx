'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, AlertTriangle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { showToast } from '@/lib/toast';

interface TransactionModalProps {
  type: 'ingreso' | 'gasto';
  isOpen: boolean;
  onClose: () => void;
  defaultScope?: 'personal' | 'negocio';
}

const initialFormData = {
  scope: 'negocio',
  businessId: '',
  amount: '',
  category: '',
  accountId: '',
  status: 'recibido',
  notes: '',
};

const getInitialFormData = (defaultScope?: 'personal' | 'negocio') => ({
  ...initialFormData,
  scope: defaultScope || initialFormData.scope,
  businessId: defaultScope === 'personal' ? '' : initialFormData.businessId,
});

const getInitialStep = (defaultScope?: 'personal' | 'negocio') => {
  if (defaultScope === 'personal') return 3;
  if (defaultScope === 'negocio') return 2;
  return 1;
};

export function TransactionModal({ type, isOpen, onClose, defaultScope }: TransactionModalProps) {
  const [step, setStep] = useState(() => getInitialStep(defaultScope));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState(() => getInitialFormData(defaultScope));
  const { businesses, accounts, protectedFunds, createTransaction } = useStore();

  const handleClose = () => {
    setStep(getInitialStep(defaultScope));
    setError('');
    setFormData(getInitialFormData(defaultScope));
    onClose();
  };

  const availableAccounts = accounts.filter((account) => {
    if (formData.scope === 'personal') return account.is_personal;
    if (!formData.businessId) return !account.is_personal;
    return account.business_id === formData.businessId;
  });
  const reservedMoney = protectedFunds.filter((fund) => fund.status === 'active').reduce((sum, fund) => sum + Number(fund.amount), 0);
  const totalMoney = accounts.reduce((sum, account) => sum + Number(account.current_balance), 0);
  const safeFreeMoney = totalMoney - reservedMoney;

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      await createTransaction({
        type,
        scope: formData.scope as 'personal' | 'negocio',
        business_id: formData.scope === 'negocio' ? formData.businessId : null,
        account_id: formData.accountId,
        amount: Number(formData.amount),
        category: formData.category,
        status: formData.status || (type === 'ingreso' ? 'recibido' : 'pagado'),
        notes: formData.notes,
      });

      showToast({
        type: 'success',
        title: type === 'ingreso' ? 'Ingreso guardado' : 'Gasto guardado',
        description: 'El dashboard fue actualizado.',
      });
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar el movimiento.';
      setError(message);
      showToast({ type: 'error', title: 'No se pudo guardar', description: message });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <Card className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto border-border shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200 sm:max-h-[calc(100dvh-2rem)] sm:zoom-in-95">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
          <CardTitle className="text-xl font-display">
            {type === 'ingreso' ? 'Registro rapido de ingreso' : 'Registro rapido de gasto'}
          </CardTitle>
          <button onClick={handleClose} className="p-1 rounded-xl hover:bg-muted text-muted-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {step === 1 && (
              <div className="space-y-4 animate-in slide-in-from-right-4">
                <h3 className="text-lg font-medium">A donde pertenece este movimiento?</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                  <button
                    onClick={() => { setError(''); setFormData({ ...formData, scope: 'negocio' }); setStep(2); }}
                    className="p-4 rounded-xl border border-border bg-card hover:border-primary transition-all flex flex-col items-center justify-center gap-2 h-24"
                  >
                    <span className="font-medium">Negocio</span>
                  </button>
                  <button
                    onClick={() => { setError(''); setFormData({ ...formData, scope: 'personal', businessId: '' }); setStep(3); }}
                    className="p-4 rounded-xl border border-border bg-card hover:border-primary transition-all flex flex-col items-center justify-center gap-2 h-24"
                  >
                    <span className="font-medium">Personal</span>
                  </button>
                </div>
              </div>
            )}

            {step === 2 && formData.scope === 'negocio' && (
              <div className="space-y-4 animate-in slide-in-from-right-4">
                <h3 className="text-lg font-medium">A que negocio pertenece?</h3>
                <div className="grid gap-3">
                  {businesses.map((business) => (
                    <button
                      key={business.id}
                      onClick={() => { setError(''); setFormData({ ...formData, businessId: business.id }); setStep(3); }}
                      className="p-4 rounded-lg border border-border bg-card hover:bg-muted text-left transition-colors font-medium text-sm"
                    >
                      {business.name}
                    </button>
                  ))}
                  {businesses.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                      Primero crea un negocio para registrar movimientos de negocio.
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-in slide-in-from-right-4">
                <h3 className="text-lg font-medium">Cuanto {type === 'ingreso' ? 'entro' : 'salio'}?</h3>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-medium text-muted-foreground">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="h-14 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-2xl font-display font-bold transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary sm:h-16 sm:text-3xl"
                    autoFocus
                  />
                </div>
                {error && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}
                {type === 'gasto' && safeFreeMoney > 0 && Number(formData.amount) > safeFreeMoney && (
                  <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p><strong>Cuidado:</strong> este gasto puede afectar dinero reservado. Revisa tus fondos protegidos antes de confirmar.</p>
                  </div>
                )}
                <div className="flex gap-3 justify-end pt-4">
                  <Button variant="ghost" onClick={() => setStep(formData.scope === 'negocio' ? 2 : 1)}>Atras</Button>
                  <Button onClick={() => setStep(4)} disabled={!formData.amount || Number(formData.amount) <= 0}>Siguiente</Button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4 animate-in slide-in-from-right-4">
                <h3 className="text-lg font-medium">Detalles finales</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground font-medium">Categoria</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Selecciona...</option>
                      {type === 'ingreso' ? (
                        <>
                          <option value="venta">Venta</option>
                          <option value="abono">Abono</option>
                          <option value="reembolso">Reembolso</option>
                          <option value="otro_ingreso">Otro ingreso</option>
                        </>
                      ) : (
                        <>
                          <option value="inventario">Inventario</option>
                          <option value="publicidad">Publicidad</option>
                          <option value="delivery">Delivery</option>
                          <option value="empaque">Empaque</option>
                          <option value="gasto_fijo">Gasto fijo</option>
                          <option value="otro_gasto">Otro gasto</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground font-medium">
                      {type === 'ingreso' ? 'A que cuenta entro el dinero?' : 'De que cuenta salio el dinero?'}
                    </label>
                    <select
                      value={formData.accountId}
                      onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Selecciona cuenta...</option>
                      {availableAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} (${Number(account.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                        </option>
                      ))}
                    </select>
                    {availableAccounts.length === 0 && (
                      <p className="text-xs text-destructive">Crea una cuenta para este ambito antes de guardar movimientos.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground font-medium">Notas</label>
                    <input
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Detalle opcional"
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3 justify-end pt-4 border-t border-border mt-4">
                    <Button variant="ghost" onClick={() => setStep(3)}>Atras</Button>
                    <Button
                      onClick={handleSave}
                      disabled={loading || !formData.category || !formData.accountId}
                      className={type === 'ingreso' ? 'bg-success hover:bg-success/90 text-success-foreground' : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'}
                    >
                      {loading ? 'Guardando...' : `Guardar ${type === 'ingreso' ? 'ingreso' : 'gasto'}`}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
