'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Wallet,
  TrendingDown,
  ShieldCheck,
  PiggyBank,
  Zap,
  AlertCircle,
  Calendar,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Building,
  Target,
  X,
} from 'lucide-react';
import { TransactionModal } from './TransactionModal';
import { TransferModal } from './TransferModal';
import { useStore, Transaction } from '@/store/useStore';
import { showToast } from '@/lib/toast';

const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = new Date().toISOString().split('T')[0];

const initialGoalForm = {
  name: '',
  amount: '',
  targetDate: '',
  accountId: '',
};

export function PersonalBudgetModule() {
  const { accounts, transactions, protectedFunds, recurringExpenses, debts, businesses, transferFunds, createProtectedFund } = useStore();
  const [period, setPeriod] = useState('this_week');
  const [mode, setMode] = useState('balanced');
  const [view, setView] = useState('summary');
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; type: 'ingreso' | 'gasto' }>({ isOpen: false, type: 'gasto' });
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalForm, setGoalForm] = useState(initialGoalForm);
  const [goalError, setGoalError] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  const personalAccounts = accounts.filter((account) => account.is_personal);
  const businessAccounts = accounts.filter((account) => !account.is_personal);
  const personalTransactions = transactions.filter((transaction) => transaction.scope === 'personal');
  const monthlyExpenses = personalTransactions.filter((transaction) => transaction.type === 'gasto' && isCurrentMonth(transaction.date)).reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const personalMoney = personalAccounts.reduce((sum, account) => sum + Number(account.current_balance), 0);
  const personalRecurring = recurringExpenses.filter((expense) => expense.scope === 'personal' && expense.status === 'active');
  const personalRecurringTotal = personalRecurring.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const personalDebts = debts.filter((debt) => (debt.category || '').toLowerCase().includes('personal') || !debt.category);
  const personalDebtMinimum = personalDebts.reduce((sum, debt) => sum + Number(debt.minimum || 0), 0);
  const personalSavings = protectedFunds.filter((fund) => fund.scope === 'personal' && fund.status === 'active').reduce((sum, fund) => sum + Number(fund.amount), 0);
  const safeWeeklyLimit = Math.max(0, (personalMoney - personalRecurringTotal - personalDebtMinimum - personalSavings) / 4);
  const recommendedSaving = personalMoney > 0 ? Math.max(0, personalMoney - monthlyExpenses - personalDebtMinimum) * 0.1 : 0;
  const businessSafeWithdrawal = businesses.reduce((sum, business) => {
    const available = businessAccounts.filter((account) => account.business_id === business.id).reduce((total, account) => total + Number(account.current_balance), 0);
    const committed = protectedFunds.filter((fund) => fund.business_id === business.id && fund.status === 'active').reduce((total, fund) => total + Number(fund.amount), 0);
    return sum + Math.max(0, available - committed);
  }, 0);
  const hasPersonalData = personalAccounts.length > 0 || personalTransactions.length > 0 || personalRecurring.length > 0 || personalDebts.length > 0 || personalSavings > 0;
  const recentExpenses = personalTransactions.filter((transaction) => transaction.type === 'gasto').slice(0, 6);
  const recentIncome = personalTransactions.filter((transaction) => transaction.type === 'ingreso').slice(0, 6);

  const categoryTotals = groupPersonalExpenses(personalTransactions);
  const businessWithdrawals = businesses.map((business) => {
    const available = businessAccounts.filter((account) => account.business_id === business.id).reduce((sum, account) => sum + Number(account.current_balance), 0);
    const committed = protectedFunds.filter((fund) => fund.business_id === business.id && fund.status === 'active').reduce((sum, fund) => sum + Number(fund.amount), 0);
    const safe = Math.max(0, available - committed);
    return { ...business, available, committed, safe };
  });

  const resetGoalModal = () => {
    setGoalForm(initialGoalForm);
    setGoalError('');
    setShowGoalModal(false);
  };

  const handleTransfer = async (transferData: { fromAccountId: string; toAccountId: string; amount: number; notes?: string }) => {
    await transferFunds({ ...transferData, notes: transferData.notes || 'Retiro desde negocio a cuenta personal' });
    showToast({ type: 'success', title: 'Retiro registrado', description: 'Los saldos fueron actualizados.' });
  };

  const handleCreateGoal = async () => {
    setSavingGoal(true);
    setGoalError('');
    try {
      await createProtectedFund({
        name: goalForm.name,
        scope: 'personal',
        fund_type: 'Ahorro personal',
        amount: Number(goalForm.amount),
        priority: 'Media',
        target_date: goalForm.targetDate,
        block_withdrawals: true,
        account_id: goalForm.accountId || null,
      });
      showToast({ type: 'success', title: 'Meta de ahorro creada', description: 'Se guardo como reserva personal.' });
      resetGoalModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear la meta de ahorro.';
      setGoalError(message);
      showToast({ type: 'error', title: 'No se pudo guardar', description: message });
    } finally {
      setSavingGoal(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold tracking-tight md:text-3xl">Presupuesto Personal</h2>
          <p className="text-muted-foreground mt-1">Controla cuanto puedes gastar personalmente sin afectar negocios, deudas ni reservas.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={period} onChange={setPeriod} options={[
            ['today', 'Hoy'],
            ['this_week', 'Esta semana'],
            ['this_month', 'Este mes'],
            ['next_30', 'Proximos 30 dias'],
          ]} />
          <Select value={mode} onChange={setMode} options={[
            ['strict', 'Estricto'],
            ['balanced', 'Balanceado'],
            ['growth', 'Crecimiento'],
            ['emergency', 'Emergencia'],
          ]} />
          <Select value={view} onChange={setView} options={[
            ['summary', 'Resumen'],
            ['expenses', 'Gastos'],
            ['withdrawals', 'Retiros'],
            ['savings', 'Ahorro'],
          ]} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={() => setModalConfig({ isOpen: true, type: 'gasto' })}>
          <Plus className="w-4 h-4 mr-2" /> Registrar gasto personal
        </Button>
        <Button variant="outline" className="text-success border-success/30 hover:bg-success/10 hover:text-success" onClick={() => setModalConfig({ isOpen: true, type: 'ingreso' })}>
          <Plus className="w-4 h-4 mr-2" /> Registrar ingreso personal
        </Button>
        <Button variant="secondary" onClick={() => setIsWithdrawalModalOpen(true)}>
          <Building className="w-4 h-4 mr-2" /> Registrar retiro desde negocio
        </Button>
        <Button variant="outline" onClick={() => setShowGoalModal(true)}>
          <PiggyBank className="w-4 h-4 mr-2" /> Crear meta de ahorro
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Summary title="Dinero disponible" value={personalMoney} icon={<Wallet className="w-4 h-4 text-primary" />} />
        <Summary title="Gasto mensual" value={monthlyExpenses} icon={<TrendingDown className="w-4 h-4 text-destructive" />} tone="destructive" />
        <Summary title="Limite seguro semanal" value={safeWeeklyLimit} icon={<ShieldCheck className="w-4 h-4" />} tone="success" emphasized />
        <Summary title="Ahorro recomendado" value={recommendedSaving} icon={<PiggyBank className="w-4 h-4" />} tone="primary" emphasized />
        <Summary title="Retiro seguro negocios" value={businessSafeWithdrawal} icon={<Building className="w-4 h-4 text-primary" />} />
      </div>

      <Card className="border-l-4 border-l-blue-500 bg-blue-500/5 shadow-md">
        <CardContent className="p-6 flex items-start gap-4">
          <Zap className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-display font-semibold text-blue-400 text-lg">Decision rapida de Noa</h4>
            <p className="text-base text-foreground/90 mt-2 leading-relaxed">
              {hasPersonalData
                ? `Tu limite semanal seguro calculado con datos reales es ${money(safeWeeklyLimit)}. Ajustalo registrando ingresos, gastos, deudas y reservas personales.`
                : 'Todavia no hay presupuesto personal configurado. Crea tu primer presupuesto o registra un gasto personal para empezar.'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-xl font-display font-semibold">Mi limite personal</h3>
          <Card>
            <CardContent className="p-5 space-y-5">
              {categoryTotals.length > 0 ? (
                categoryTotals.map((category) => (
                  <div key={category.name} className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 p-3">
                    <div>
                      <p className="font-medium text-sm">{category.name}</p>
                      <p className="text-xs text-muted-foreground">Gasto personal registrado</p>
                    </div>
                    <span className="font-bold text-destructive">{money(category.spent)}</span>
                  </div>
                ))
              ) : (
                <EmptyState text="No tienes limites personales configurados todavia." icon={<Target className="h-10 w-10 opacity-30" />} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-xl font-display font-semibold">Distribucion recomendada</h3>
            <Card className="border-l-4 border-l-primary bg-primary/5">
              <CardContent className="p-5">
                {hasPersonalData ? (
                  <div className="space-y-3">
                    <DistributionRow label="Gastos recurrentes personales" value={personalRecurringTotal} />
                    <DistributionRow label="Deudas personales" value={personalDebtMinimum} tone="warning" />
                    <DistributionRow label="Ahorro recomendado" value={recommendedSaving} tone="primary" />
                    <DistributionRow label="Uso libre estimado" value={Math.max(safeWeeklyLimit, 0)} tone="success" />
                  </div>
                ) : (
                  <EmptyState text="No hay distribucion recomendada todavia. Configura tu presupuesto personal o registra tus primeros movimientos." />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-display font-semibold">Deudas personales resumidas</h3>
            <Card>
              <CardContent className="p-5">
                {personalDebts.length > 0 ? (
                  <div className="space-y-3">
                    <DistributionRow label="Deuda personal total" value={personalDebts.reduce((sum, debt) => sum + Number(debt.pending), 0)} />
                    <DistributionRow label="Pago minimo mensual" value={personalDebtMinimum} tone="warning" />
                    {personalDebts.map((debt) => (
                      <div key={debt.id} className="p-3 bg-muted/20 border border-border/50 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{debt.name}</p>
                            <p className="text-xs text-muted-foreground">Vence: {debt.due_date || 'Sin fecha'}</p>
                          </div>
                        </div>
                        <span className="font-bold text-destructive">{money(Number(debt.minimum || 0))}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState text="No hay deudas personales registradas." />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-display font-semibold">Retiros seguros desde negocios</h3>
        {businessWithdrawals.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {businessWithdrawals.map((business) => (
              <Card key={business.id} className="border-l-4 border-l-primary">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base truncate">{business.name}</CardTitle>
                  <CardDescription>Calculado con cuentas y reservas reales.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DistributionRow label="Disponible" value={business.available} />
                  <DistributionRow label="Comprometido" value={business.committed} tone="destructive" />
                  <DistributionRow label="Retiro seguro" value={business.safe} tone="success" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState text="No hay negocios con cuentas registradas para calcular retiros seguros." />
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <MovementList title="Gastos personales recientes" transactions={recentExpenses} type="gasto" />
          <MovementList title="Ingresos personales recientes" transactions={recentIncome} type="ingreso" />

          <div className="space-y-4">
            <h3 className="text-xl font-display font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-muted-foreground" /> Gastos recurrentes personales
            </h3>
            {personalRecurring.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {personalRecurring.map((expense) => (
                  <Card key={expense.id} className="bg-muted/10 border-border/50">
                    <CardContent className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{expense.name}</p>
                        <p className="text-xs text-muted-foreground">Pago: {expense.next_run_date}</p>
                      </div>
                      <span className="font-bold">{money(Number(expense.amount))}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState text="No tienes gastos recurrentes personales registrados." />
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-xl font-display font-semibold flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-primary" /> Ahorro y reserva
            </h3>
            <Card>
              <CardContent className="p-5 space-y-5">
                <DistributionRow label="Ahorro protegido actual" value={personalSavings} tone="primary" />
                <DistributionRow label="Ahorro sugerido" value={recommendedSaving} tone="primary" />
                {personalSavings === 0 && <p className="text-sm text-muted-foreground">No hay metas de ahorro registradas todavia.</p>}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-display font-semibold">Alertas personales</h3>
            {hasPersonalData ? (
              <div className="grid gap-3">
                {safeWeeklyLimit <= 0 && (
                  <Alert text="Tu limite seguro semanal esta en cero o negativo. Revisa gastos recurrentes, deudas o reservas personales." tone="destructive" />
                )}
                {personalRecurring.length > 0 && <Alert text="Tienes gastos recurrentes personales registrados. Consideralos antes de gastar libremente." tone="warning" />}
                {personalSavings > 0 && <Alert text="Tienes dinero protegido como ahorro personal. No lo uses para gastos diarios." />}
              </div>
            ) : (
              <EmptyState text="No hay alertas personales porque todavia no hay datos reales suficientes." />
            )}
          </div>
        </div>
      </div>

      <TransactionModal isOpen={modalConfig.isOpen} type={modalConfig.type} defaultScope="personal" onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} />

      <TransferModal
        isOpen={isWithdrawalModalOpen}
        onClose={() => setIsWithdrawalModalOpen(false)}
        accounts={accounts}
        onTransfer={handleTransfer}
      />

      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <Card className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto border-border shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div>
                <CardTitle>Crear meta de ahorro</CardTitle>
                <CardDescription>Se guardara como reserva personal protegida.</CardDescription>
              </div>
              <button onClick={resetGoalModal} className="rounded-xl p-1 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <Field label="Nombre"><input className="form-field" value={goalForm.name} onChange={(event) => setGoalForm({ ...goalForm, name: event.target.value })} /></Field>
              <Field label="Monto meta"><input className="form-field" type="number" min="0" step="0.01" value={goalForm.amount} onChange={(event) => setGoalForm({ ...goalForm, amount: event.target.value })} /></Field>
              <Field label="Fecha meta"><input className="form-field" type="date" value={goalForm.targetDate} onChange={(event) => setGoalForm({ ...goalForm, targetDate: event.target.value })} /></Field>
              <Field label="Cuenta relacionada">
                <select className="form-field" value={goalForm.accountId} onChange={(event) => setGoalForm({ ...goalForm, accountId: event.target.value })}>
                  <option value="">Opcional</option>
                  {personalAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </Field>
              {goalError && <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{goalError}</div>}
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={resetGoalModal}>Cancelar</Button>
              <Button onClick={handleCreateGoal} disabled={savingGoal}>{savingGoal ? 'Guardando...' : 'Guardar meta'}</Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}

function isCurrentMonth(dateValue: string) {
  const date = new Date(dateValue);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function groupPersonalExpenses(transactions: Transaction[]) {
  const totals = new Map<string, number>();
  transactions.filter((transaction) => transaction.type === 'gasto').forEach((transaction) => {
    const name = transaction.category || 'Sin categoria';
    totals.set(name, (totals.get(name) || 0) + Number(transaction.amount));
  });
  return Array.from(totals.entries()).map(([name, spent]) => ({ name, spent }));
}

function Summary({ title, value, icon, tone, emphasized }: { title: string; value: number; icon: React.ReactNode; tone?: 'success' | 'destructive' | 'primary'; emphasized?: boolean }) {
  const color = tone === 'success' ? 'text-success' : tone === 'destructive' ? 'text-destructive' : tone === 'primary' ? 'text-primary' : '';
  const card = emphasized && tone === 'success' ? 'bg-success/5 border-success/20' : emphasized && tone === 'primary' ? 'bg-primary/5 border-primary/20' : 'bg-card';
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

function DistributionRow({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'destructive' | 'warning' | 'primary' }) {
  const color = tone === 'success' ? 'text-success' : tone === 'destructive' ? 'text-destructive' : tone === 'warning' ? 'text-warning' : tone === 'primary' ? 'text-primary' : '';
  return (
    <div className="flex justify-between text-sm items-center p-2 rounded bg-background border border-border/50">
      <span className="font-medium">{label}</span>
      <span className={`font-bold ${color}`}>{money(value)}</span>
    </div>
  );
}

function MovementList({ title, transactions, type }: { title: string; transactions: Transaction[]; type: 'ingreso' | 'gasto' }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-display font-semibold flex items-center gap-2">
        {type === 'gasto' ? <ArrowDownRight className="w-5 h-5 text-destructive" /> : <ArrowUpRight className="w-5 h-5 text-success" />} {title}
      </h3>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex justify-between items-center p-4 hover:bg-muted/20 transition-colors">
                <div>
                  <p className="font-medium text-sm">{transaction.category || transaction.notes || 'Movimiento personal'}</p>
                  <p className="text-xs text-muted-foreground">{new Date(transaction.date).toLocaleDateString('es-PA')}</p>
                </div>
                <span className={`font-bold ${type === 'gasto' ? 'text-destructive' : 'text-success'}`}>{type === 'gasto' ? '-' : '+'}{money(Number(transaction.amount))}</span>
              </div>
            ))}
            {transactions.length === 0 && <div className="p-6"><EmptyState text={`No hay ${type === 'gasto' ? 'gastos' : 'ingresos'} personales registrados.`} /></div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ text, icon }: { text: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
      {icon && <div className="mx-auto mb-3 flex justify-center">{icon}</div>}
      {text}
    </div>
  );
}

function Alert({ text, tone }: { text: string; tone?: 'destructive' | 'warning' }) {
  const classes = tone === 'destructive' ? 'border-destructive/20 bg-destructive/5 text-destructive' : tone === 'warning' ? 'border-warning/20 bg-warning/5 text-warning' : 'border-border/50 bg-muted/20 text-muted-foreground';
  return (
    <div className={`p-4 rounded-xl border flex items-start gap-3 ${classes}`}>
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
      <p className="text-sm">{text}</p>
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
