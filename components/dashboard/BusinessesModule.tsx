'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, X } from 'lucide-react';
import { BusinessDetailModal } from './BusinessDetailModal';
import { TransactionModal } from './TransactionModal';
import { showToast } from '@/lib/toast';

interface BusinessesModuleProps {
  onNavigate?: (tab: string) => void;
}

const initialBusinessForm = {
  name: '',
  type: 'Negocio',
};

export function BusinessesModule({ onNavigate }: BusinessesModuleProps = {}) {
  void onNavigate;
  const { businesses, transactions, accounts, createBusiness } = useStore();
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; type: 'ingreso' | 'gasto'; businessId?: string }>({ isOpen: false, type: 'ingreso' });
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [businessForm, setBusinessForm] = useState(initialBusinessForm);
  const [businessError, setBusinessError] = useState('');
  const [isSavingBusiness, setIsSavingBusiness] = useState(false);

  const getBusinessStats = (businessId: string) => {
    const businessTxs = transactions.filter((transaction) => transaction.business_id === businessId && transaction.scope === 'negocio');
    const income = businessTxs.filter((transaction) => transaction.type === 'ingreso').reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const expense = businessTxs.filter((transaction) => transaction.type === 'gasto').reduce((sum, transaction) => sum + Number(transaction.amount), 0);
    const profit = income - expense;
    const margin = income > 0 ? Math.round((profit / income) * 100) : 0;
    const available = accounts.filter((account) => account.business_id === businessId).reduce((sum, account) => sum + Number(account.current_balance), 0);
    const reinvest = profit > 0 ? profit * 0.3 : 0;
    const withdrawal = profit > 0 ? profit * 0.1 : 0;
    const status = profit > 2000 ? 'Saludable' : profit > 0 ? 'Estable' : 'En observacion';
    const statusVariant = profit > 2000 ? 'success' : profit > 0 ? 'info' : 'warning';
    const recommendation = profit > 0 ? 'Negocio con flujo. Conviene reinvertir con control.' : 'Revisar gastos e ingresos.';
    const lastTx = businessTxs[0];
    const lastMove = lastTx ? `${lastTx.type === 'ingreso' ? 'Ingreso' : 'Gasto'} de $${Number(lastTx.amount).toLocaleString()}` : 'Sin movimientos';

    return { income, expense, profit, margin, available, reinvest, withdrawal, status, statusVariant, recommendation, lastMove, transactions: businessTxs };
  };

  const businessStats = businesses.map((business) => ({
    ...business,
    ...getBusinessStats(business.id),
  }));

  const selectedBusiness = businessStats.find((business) => business.id === selectedBusinessId) || null;
  const sortedByIncome = [...businessStats].sort((a, b) => b.income - a.income);
  const sortedByMargin = [...businessStats].sort((a, b) => b.margin - a.margin);
  const sortedByExpense = [...businessStats].sort((a, b) => b.expense - a.expense);

  const resetBusinessModal = () => {
    setBusinessForm(initialBusinessForm);
    setBusinessError('');
    setShowBusinessModal(false);
  };

  const handleCreateBusiness = async () => {
    setIsSavingBusiness(true);
    setBusinessError('');

    try {
      await createBusiness({ name: businessForm.name, type: businessForm.type });
      showToast({ type: 'success', title: 'Negocio creado', description: 'Ya puedes asociarle cuentas y movimientos.' });
      resetBusinessModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear el negocio.';
      setBusinessError(message);
      showToast({ type: 'error', title: 'No se pudo crear el negocio', description: message });
    } finally {
      setIsSavingBusiness(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold tracking-tight md:text-3xl">Mis negocios</h2>
          <p className="text-muted-foreground mt-1">Control de flujo de caja, margenes y salud de cada negocio.</p>
        </div>
        <Button onClick={() => setShowBusinessModal(true)} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> Nuevo negocio
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <h3 className="text-xl font-display font-semibold">Negocios activos</h3>
          <div className="grid gap-6 md:grid-cols-2">
            {businessStats.map((business) => (
              <Card key={business.id} className="flex flex-col hover:border-primary/50 transition-colors">
                <CardHeader className="pb-4 border-b border-border/50">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <CardTitle className="text-lg">{business.name}</CardTitle>
                      <CardDescription className="mt-1">{business.type}</CardDescription>
                    </div>
                    <Badge variant={business.statusVariant as 'success' | 'info' | 'warning'}>{business.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 flex-1">
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                    <Metric label="Ingresos" value={business.income} className="text-success" />
                    <Metric label="Gastos" value={business.expense} className="text-destructive" />
                    <Metric label="Ganancia neta" value={business.profit} />
                    <div>
                      <p className="text-muted-foreground text-xs">Margen est.</p>
                      <p className="font-medium">{business.margin}%</p>
                    </div>

                    <div className="col-span-2 pt-2 border-t border-border/50">
                      <Row label="Disponible" value={business.available} />
                      <Row label="Reinvertir sugerido" value={business.reinvest} className="text-primary" />
                      <Row label="Retiro seguro" value={business.withdrawal} className="text-success" />
                    </div>

                    <div className="col-span-2 pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Ultimo mov: {business.lastMove}</p>
                      <p className="text-xs font-medium text-orange-400">{business.recommendation}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 flex gap-2">
                  <Button variant="secondary" className="flex-1 text-xs h-8" onClick={() => setSelectedBusinessId(business.id)}>
                    <Eye className="w-3 h-3 mr-2" /> Ver detalle
                  </Button>
                  <Button variant="outline" className="flex-1 text-xs h-8 text-success hover:text-success hover:bg-success/10" onClick={() => setModalConfig({ isOpen: true, type: 'ingreso', businessId: business.id })}>
                    + Ingreso
                  </Button>
                  <Button variant="outline" className="flex-1 text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setModalConfig({ isOpen: true, type: 'gasto', businessId: business.id })}>
                    - Gasto
                  </Button>
                </CardFooter>
              </Card>
            ))}
            {businessStats.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center text-muted-foreground">
                  <p className="mb-4">Todavia no hay negocios creados.</p>
                  <Button onClick={() => setShowBusinessModal(true)}>Crear primer negocio</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="lg:w-80 space-y-6">
          <h3 className="text-xl font-display font-semibold">Ranking financiero</h3>
          <Card>
            <CardContent className="p-5 space-y-5">
              <RankingItem label="Mas ingresos" name={sortedByIncome[0]?.name || 'N/A'} value={`$${(sortedByIncome[0]?.income || 0).toLocaleString()}`} tone="success" />
              <RankingItem label="Mejor margen" name={sortedByMargin[0]?.name || 'N/A'} value={`${sortedByMargin[0]?.margin || 0}%`} tone="primary" />
              <RankingItem label="Mas gastos" name={sortedByExpense[0]?.name || 'N/A'} value={`$${(sortedByExpense[0]?.expense || 0).toLocaleString()}`} tone="destructive" />
            </CardContent>
          </Card>
        </div>
      </div>

      <BusinessDetailModal
        business={selectedBusiness}
        isOpen={Boolean(selectedBusiness)}
        onClose={() => setSelectedBusinessId(null)}
        onRegisterIncome={() => selectedBusiness && setModalConfig({ isOpen: true, type: 'ingreso', businessId: selectedBusiness.id })}
        onRegisterExpense={() => selectedBusiness && setModalConfig({ isOpen: true, type: 'gasto', businessId: selectedBusiness.id })}
      />

      <TransactionModal
        key={`${modalConfig.type}-${modalConfig.businessId || 'manual'}-${modalConfig.isOpen ? 'open' : 'closed'}`}
        isOpen={modalConfig.isOpen}
        type={modalConfig.type}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        defaultScope={modalConfig.businessId ? 'negocio' : undefined}
        defaultBusinessId={modalConfig.businessId}
      />

      {showBusinessModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <Card className="w-full max-w-lg border-border shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div>
                <CardTitle>Nuevo negocio</CardTitle>
                <CardDescription>Crea una unidad para asociar cuentas, ingresos y gastos.</CardDescription>
              </div>
              <button onClick={resetBusinessModal} className="rounded-xl p-1 text-muted-foreground hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <Field label="Nombre">
                <input value={businessForm.name} onChange={(event) => setBusinessForm({ ...businessForm, name: event.target.value })} className="form-field" placeholder="Ej: Vicious Supplements" />
              </Field>
              <Field label="Tipo">
                <input value={businessForm.type} onChange={(event) => setBusinessForm({ ...businessForm, type: event.target.value })} className="form-field" placeholder="Ej: Ecommerce" />
              </Field>
              {businessError && <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{businessError}</div>}
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={resetBusinessModal}>Cancelar</Button>
              <Button onClick={handleCreateBusiness} disabled={isSavingBusiness}>
                {isSavingBusiness ? 'Guardando...' : 'Guardar negocio'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, className = '' }: { label: string; value: number; className?: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={`font-medium ${className}`}>${value.toLocaleString()}</p>
    </div>
  );
}

function Row({ label, value, className = '' }: { label: string; value: number; className?: string }) {
  return (
    <div className="flex justify-between text-xs mb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${className}`}>${value.toLocaleString()}</span>
    </div>
  );
}

function RankingItem({ label, name, value, tone }: { label: string; name: string; value: string; tone: 'success' | 'primary' | 'destructive' }) {
  const toneClass = tone === 'success' ? 'text-success' : tone === 'primary' ? 'text-primary' : 'text-destructive';
  return (
    <div>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium truncate">{name}</span>
        <span className={`text-sm ${toneClass}`}>{value}</span>
      </div>
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
