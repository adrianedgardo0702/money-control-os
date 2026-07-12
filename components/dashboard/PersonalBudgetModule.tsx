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
  CheckCircle2,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Building,
  Target,
  Pencil,
  Pause,
  Play,
  Trash2,
  X,
} from 'lucide-react';
import { TransactionModal } from './TransactionModal';
import { TransferModal } from './TransferModal';
import { useStore, Transaction } from '@/store/useStore';
import { monthlyCost } from '@/lib/financePlanning';
import { showToast } from '@/lib/toast';

const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = new Date().toISOString().split('T')[0];

const initialGoalForm = {
  name: '',
  amount: '',
  targetDate: '',
  accountId: '',
};

const fixedCategories = ['Comida', 'Transporte', 'Gasolina', 'Telefono', 'Internet', 'Gimnasio', 'Suscripciones', 'Salidas', 'Familia', 'Pareja', 'Deudas personales', 'Salud', 'Otros'];
const paymentMethods = ['Efectivo', 'Yappy', 'Transferencia', 'ACH', 'Tarjeta de credito'];
const initialFixedExpenseForm = {
  name: '',
  amount: '',
  frequency: 'Mensual',
  dueDate: today,
  category: 'Otros',
  paymentMethod: '',
  accountId: '',
  notes: '',
  isActive: true,
};

export function PersonalBudgetModule() {
  const { accounts, transactions, protectedFunds, recurringExpenses, debts, businesses, transferFunds, createProtectedFund, createRecurringExpense, updateRecurringExpense, updateRecurringExpenseStatus, markRecurringExpensePaid, deleteRecurringExpense } = useStore();
  const [period, setPeriod] = useState('this_week');
  const [mode, setMode] = useState('balanced');
  const [view, setView] = useState('summary');
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; type: 'ingreso' | 'gasto' }>({ isOpen: false, type: 'gasto' });
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalForm, setGoalForm] = useState(initialGoalForm);
  const [goalError, setGoalError] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [fixedModalOpen, setFixedModalOpen] = useState(false);
  const [fixedForm, setFixedForm] = useState(initialFixedExpenseForm);
  const [editingFixedId, setEditingFixedId] = useState<string | null>(null);
  const [fixedError, setFixedError] = useState('');
  const [savingFixed, setSavingFixed] = useState(false);
  const [workingFixedId, setWorkingFixedId] = useState<string | null>(null);

  const personalAccounts = accounts.filter((account) => account.is_personal);
  const businessAccounts = accounts.filter((account) => !account.is_personal);
  const personalTransactions = transactions.filter((transaction) => transaction.scope === 'personal');
  const monthlyExpenses = personalTransactions.filter((transaction) => transaction.type === 'gasto' && isCurrentMonth(transaction.date)).reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const personalMoney = personalAccounts.reduce((sum, account) => sum + Number(account.current_balance), 0);
  const personalFixedExpenses = recurringExpenses.filter((expense) => expense.scope === 'personal' || expense.owner_type === 'personal' || expense.business_unit_id === 'personal');
  const personalRecurring = personalFixedExpenses.filter((expense) => expense.status === 'active' || expense.is_active);
  const personalRecurringTotal = personalRecurring.reduce((sum, expense) => sum + monthlyCost(expense), 0);
  const pausedFixedExpenses = personalFixedExpenses.filter((expense) => expense.status === 'paused' || expense.is_active === false);
  const upcomingPersonalFixed = [...personalRecurring].sort((a, b) => String(a.due_date || a.next_run_date).localeCompare(String(b.due_date || b.next_run_date)))[0];
  const weeklyFixedPayments = personalRecurring.filter((expense) => isWithinDays(expense.due_date || expense.next_run_date, 7)).length;
  const highestFixedCategory = highestCategory(personalRecurring);
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
  const personalFixedLoad = personalRecurringTotal + personalDebtMinimum + recommendedSaving;
  const estimatedFreeUse = Math.max(0, personalMoney - personalFixedLoad);

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

  const openFixedModal = (expense?: typeof personalFixedExpenses[number]) => {
    if (expense) {
      setEditingFixedId(expense.id);
      setFixedForm({
        name: expense.name,
        amount: String(expense.amount || ''),
        frequency: expense.frequency || 'Mensual',
        dueDate: expense.due_date || expense.next_run_date || today,
        category: expense.category || 'Otros',
        paymentMethod: expense.payment_method || '',
        accountId: expense.account_id || '',
        notes: expense.notes || '',
        isActive: expense.status !== 'paused' && expense.is_active !== false,
      });
    } else {
      setEditingFixedId(null);
      setFixedForm(initialFixedExpenseForm);
    }
    setFixedError('');
    setFixedModalOpen(true);
  };

  const closeFixedModal = () => {
    setFixedModalOpen(false);
    setEditingFixedId(null);
    setFixedForm(initialFixedExpenseForm);
    setFixedError('');
  };

  const handleSaveFixedExpense = async () => {
    setSavingFixed(true);
    setFixedError('');
    try {
      const payload = {
        name: fixedForm.name,
        scope: 'personal' as const,
        category: fixedForm.category,
        amount: Number(fixedForm.amount),
        frequency: fixedForm.frequency,
        start_date: fixedForm.dueDate,
        next_run_date: fixedForm.dueDate,
        due_date: fixedForm.dueDate,
        owner_type: 'personal' as const,
        business_unit_id: 'personal',
        is_required: true,
        is_active: fixedForm.isActive,
        payment_method: fixedForm.paymentMethod,
        mode: 'reminder',
        business_id: null,
        account_id: fixedForm.accountId || null,
        notes: fixedForm.notes,
      };
      if (editingFixedId) {
        await updateRecurringExpense(editingFixedId, payload);
        showToast({ type: 'success', title: 'Gasto fijo actualizado' });
      } else {
        await createRecurringExpense(payload);
        showToast({ type: 'success', title: 'Gasto fijo personal creado' });
      }
      closeFixedModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el gasto fijo.';
      setFixedError(message);
      showToast({ type: 'error', title: 'No se pudo guardar', description: message });
    } finally {
      setSavingFixed(false);
    }
  };

  const handleToggleFixed = async (expenseId: string, status: string) => {
    setWorkingFixedId(expenseId);
    try {
      await updateRecurringExpenseStatus(expenseId, status === 'active' ? 'paused' : 'active');
      showToast({ type: 'success', title: 'Gasto fijo actualizado' });
    } catch (error) {
      showToast({ type: 'error', title: 'No se pudo actualizar', description: error instanceof Error ? error.message : 'Intentalo nuevamente.' });
    } finally {
      setWorkingFixedId(null);
    }
  };

  const handlePayFixed = async (expenseId: string) => {
    setWorkingFixedId(expenseId);
    try {
      await markRecurringExpensePaid(expenseId);
      showToast({ type: 'success', title: 'Gasto marcado como pagado', description: 'La proxima fecha fue actualizada.' });
    } catch (error) {
      showToast({ type: 'error', title: 'No se pudo marcar pagado', description: error instanceof Error ? error.message : 'Intentalo nuevamente.' });
    } finally {
      setWorkingFixedId(null);
    }
  };

  const handleDeleteFixed = async (expenseId: string) => {
    setWorkingFixedId(expenseId);
    try {
      await deleteRecurringExpense(expenseId);
      showToast({ type: 'success', title: 'Gasto fijo eliminado' });
    } catch (error) {
      showToast({ type: 'error', title: 'No se pudo eliminar', description: error instanceof Error ? error.message : 'Intentalo nuevamente.' });
    } finally {
      setWorkingFixedId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold tracking-tight md:text-3xl">Finanzas Personales</h2>
          <p className="text-muted-foreground mt-1">Centro de control para tu dinero personal, gastos fijos, deudas, ahorro y retiros desde negocios.</p>
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
            ['movements', 'Movimientos personales'],
            ['fixed', 'Gastos fijos personales'],
            ['debts', 'Deudas personales'],
            ['cards', 'Tarjetas personales'],
            ['budget', 'Presupuesto personal'],
            ['savings', 'Ahorro y metas'],
            ['withdrawals', 'Retiros desde negocios'],
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

      <Card className="border-l-4 border-l-primary bg-primary/5">
        <CardHeader>
          <CardTitle>Carga fija mensual relacionada al plano personal</CardTitle>
          <CardDescription>Incluye recurrentes personales, deuda personal, ahorro meta y uso libre estimado.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <DistributionRow label="Gastos fijos personales" value={personalRecurringTotal} />
          <DistributionRow label="Deudas personales" value={personalDebtMinimum} tone="warning" />
          <DistributionRow label="Ahorro meta" value={recommendedSaving} tone="primary" />
          <DistributionRow label="Retiros seguros" value={businessSafeWithdrawal} tone="success" />
          <DistributionRow label="Uso libre estimado" value={estimatedFreeUse} tone="success" />
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-display font-semibold">Gastos fijos personales</h3>
            <p className="text-sm text-muted-foreground">Administra pagos personales recurrentes sin salir de Finanzas Personales.</p>
          </div>
          <Button onClick={() => openFixedModal()} className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Nuevo gasto fijo personal
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MiniSummary label="Total mensual" value={money(personalRecurringTotal)} />
          <MiniSummary label="Proximo pago" value={upcomingPersonalFixed ? money(Number(upcomingPersonalFixed.amount || 0)) : 'Sin pagos'} detail={upcomingPersonalFixed ? `${upcomingPersonalFixed.name} · ${upcomingPersonalFixed.due_date || upcomingPersonalFixed.next_run_date}` : undefined} />
          <MiniSummary label="Esta semana" value={String(weeklyFixedPayments)} detail="pagos programados" />
          <MiniSummary label="Categoria mas alta" value={highestFixedCategory?.name || 'Sin datos'} detail={highestFixedCategory ? money(highestFixedCategory.total) : undefined} />
          <MiniSummary label="Activos" value={String(personalRecurring.length)} />
          <MiniSummary label="Pausados" value={String(pausedFixedExpenses.length)} />
        </div>

        <Card>
          <CardContent className="p-0">
            {personalFixedExpenses.length > 0 ? (
              <div className="divide-y divide-border/50">
                {personalFixedExpenses.map((expense) => {
                  const isActive = expense.status === 'active' || expense.is_active;
                  return (
                    <div key={expense.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{expense.name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isActive ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                            {isActive ? 'Activo' : 'Pausado'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {money(Number(expense.amount || 0))} · {expense.frequency} · {expense.category || 'Otros'} · Pago: {expense.due_date || expense.next_run_date}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">Metodo: {expense.payment_method || 'Sin metodo'}{expense.last_paid_date ? ` · Ultimo pago: ${expense.last_paid_date}` : ''}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <Button variant="outline" size="sm" disabled={workingFixedId === expense.id} onClick={() => openFixedModal(expense)}>
                          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                        </Button>
                        <Button variant="outline" size="sm" disabled={workingFixedId === expense.id} onClick={() => handlePayFixed(expense.id)}>
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Pagar
                        </Button>
                        <Button variant="outline" size="sm" disabled={workingFixedId === expense.id} onClick={() => handleToggleFixed(expense.id, expense.status)}>
                          {isActive ? <Pause className="mr-1.5 h-3.5 w-3.5" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
                          {isActive ? 'Pausar' : 'Activar'}
                        </Button>
                        <Button variant="outline" size="sm" disabled={workingFixedId === expense.id} onClick={() => handleDeleteFixed(expense.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <EmptyState text="No tienes gastos fijos personales registrados todavia." />
                <Button onClick={() => openFixedModal()} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" /> Crear primer gasto fijo personal
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

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
                      <span className="font-bold">{money(monthlyCost(expense))}</span>
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

      {fixedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <Card className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto border-border shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div>
                <CardTitle>{editingFixedId ? 'Editar gasto fijo personal' : 'Nuevo gasto fijo personal'}</CardTitle>
                <CardDescription>Se guardara dentro de Finanzas Personales.</CardDescription>
              </div>
              <button onClick={closeFixedModal} className="rounded-xl p-1 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <Field label="Nombre del gasto">
                <input className="form-field" value={fixedForm.name} onChange={(event) => setFixedForm({ ...fixedForm, name: event.target.value })} placeholder="Ej: telefono, gasolina, comida" />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Monto">
                  <input className="form-field" type="number" min="0" step="0.01" value={fixedForm.amount} onChange={(event) => setFixedForm({ ...fixedForm, amount: event.target.value })} />
                </Field>
                <Field label="Frecuencia">
                  <select className="form-field" value={fixedForm.frequency} onChange={(event) => setFixedForm({ ...fixedForm, frequency: event.target.value })}>
                    <option value="Semanal">Semanal</option>
                    <option value="Quincenal">Quincenal</option>
                    <option value="Mensual">Mensual</option>
                    <option value="Anual">Anual</option>
                    <option value="Personalizado">Personalizado</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Fecha de pago">
                  <input className="form-field" type="date" value={fixedForm.dueDate} onChange={(event) => setFixedForm({ ...fixedForm, dueDate: event.target.value })} />
                </Field>
                <Field label="Categoria">
                  <select className="form-field" value={fixedForm.category} onChange={(event) => setFixedForm({ ...fixedForm, category: event.target.value })}>
                    {fixedCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Metodo de pago">
                  <select className="form-field" value={fixedForm.paymentMethod} onChange={(event) => setFixedForm({ ...fixedForm, paymentMethod: event.target.value })}>
                    <option value="">Sin metodo</option>
                    {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
                  </select>
                </Field>
                <Field label="Cuenta asociada">
                  <select className="form-field" value={fixedForm.accountId} onChange={(event) => setFixedForm({ ...fixedForm, accountId: event.target.value })}>
                    <option value="">Opcional</option>
                    {personalAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                  </select>
                </Field>
              </div>
              <label className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm">
                <input type="checkbox" checked={fixedForm.isActive} onChange={(event) => setFixedForm({ ...fixedForm, isActive: event.target.checked })} />
                Activo
              </label>
              <Field label="Nota">
                <input className="form-field" value={fixedForm.notes} onChange={(event) => setFixedForm({ ...fixedForm, notes: event.target.value })} placeholder="Opcional" />
              </Field>
              {fixedError && <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{fixedError}</div>}
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={closeFixedModal}>Cancelar</Button>
              <Button onClick={handleSaveFixedExpense} disabled={savingFixed}>{savingFixed ? 'Guardando...' : 'Guardar gasto'}</Button>
            </CardFooter>
          </Card>
        </div>
      )}

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

function isWithinDays(dateValue: string | undefined, days: number) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  const now = new Date();
  const end = new Date();
  end.setDate(now.getDate() + days);
  return date >= new Date(now.toISOString().split('T')[0]) && date <= end;
}

function highestCategory(expenses: { category?: string; amount: number; frequency: string }[]) {
  const totals = new Map<string, number>();
  expenses.forEach((expense) => {
    const name = expense.category || 'Otros';
    totals.set(name, (totals.get(name) || 0) + monthlyCost(expense));
  });
  return Array.from(totals.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)[0];
}

function MiniSummary({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 truncate text-lg font-bold">{value}</p>
        {detail && <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  );
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
