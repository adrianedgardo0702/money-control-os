'use client';

import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Activity, AlertCircle, BarChart3, Calendar, CheckCircle2, CreditCard, Download, Pencil, Pause, PiggyBank, Play, Plus, ShieldAlert, Target, Trash2, TrendingUp, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Account, Debt, Investment, ProtectedFund, RecurringExpense, Transaction, useStore } from '@/store/useStore';
import { defaultMonthlyTarget, money, monthlyCost } from '@/lib/financePlanning';
import { showToast } from '@/lib/toast';
import { buildSchedulePayload, defaultScheduleForm, RecurringScheduleFields, scheduleFormFromExpense } from './RecurringScheduleFields';

interface BusinessDetailModalProps {
  business: any;
  isOpen: boolean;
  onClose: () => void;
  onRegisterIncome: () => void;
  onRegisterExpense: () => void;
}

const fixedCategories = ['oficina', 'nomina', 'publicidad', 'inventario base', 'software', 'transporte', 'proveedores', 'empaques', 'delivery', 'servicios', 'otros'];
const reserveCategories = ['inventario', 'nomina', 'publicidad', 'proveedores', 'impuestos', 'emergencia', 'oficina', 'reposicion de producto', 'deuda proxima', 'otros'];
const frequencies = ['Semanal', 'Quincenal', 'Mensual', 'Anual', 'Personalizado'];
const paymentMethods = ['Efectivo', 'Yappy', 'Transferencia', 'ACH', 'Tarjeta de credito'];
const priorities = ['Critica', 'Alta', 'Media', 'Baja'];

const initialFixedForm = { name: '', amount: '', ...defaultScheduleForm, category: 'publicidad', paymentMethod: 'Transferencia', accountId: '', isActive: true, notes: '' };
const initialDebtForm = { name: '', type: 'Prestamo', category: 'Negocio', originalAmount: '', pending: '', paid: '0', minimum: '', dueDate: '', interest: '0', priority: 'Media', status: 'Al dia', risk: 'Medio', notes: '' };
const initialFundForm = { name: '', amount: '', category: 'inventario', targetDate: '', priority: 'Alta', accountId: '', blockWithdrawals: true, status: 'active', notes: '' };
const initialInvestmentForm = { name: '', amount: '', category: 'inventario', investmentDate: new Date().toISOString().slice(0, 10), expectedReturn: '', accountId: '', status: 'active', notes: '' };

const getChartData = (transactions: Transaction[] = []) => {
  const months = new Map<string, { key: string; name: string; ingresos: number; gastos: number }>();

  transactions.forEach((transaction) => {
    const date = safeDate(transaction.date);
    if (!date) return;
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const label = date.toLocaleDateString('es-PA', { month: 'short' });
    const current = months.get(key) || { key, name: label, ingresos: 0, gastos: 0 };
    if (transaction.type === 'ingreso') current.ingresos += Number(transaction.amount || 0);
    if (transaction.type === 'gasto') current.gastos += Number(transaction.amount || 0);
    months.set(key, current);
  });

  return Array.from(months.values()).sort((a, b) => a.key.localeCompare(b.key)).slice(-6);
};

export function BusinessDetailModal({ business, isOpen, onClose, onRegisterIncome, onRegisterExpense }: BusinessDetailModalProps) {
  const {
    accounts,
    transactions,
    recurringExpenses,
    debts,
    investments,
    protectedFunds,
    monthlyTarget,
    businessTargetWeights,
    createRecurringExpense,
    updateRecurringExpense,
    markRecurringExpensePaid,
    updateRecurringExpenseStatus,
    deleteRecurringExpense,
    createDebt,
    updateDebt,
    registerDebtPayment,
    deleteDebt,
    createInvestment,
    updateInvestment,
    deleteInvestment,
    createProtectedFund,
    updateProtectedFund,
    deleteProtectedFund,
    upsertMonthlyTarget,
    upsertBusinessTargetWeights,
  } = useStore();

  const [tab, setTab] = useState('summary');
  const [modal, setModal] = useState<{ kind: 'fixed' | 'debt' | 'investment' | 'fund' | 'debtPayment' | null; id?: string | null }>({ kind: null });
  const [fixedForm, setFixedForm] = useState(initialFixedForm);
  const [debtForm, setDebtForm] = useState(initialDebtForm);
  const [investmentForm, setInvestmentForm] = useState(initialInvestmentForm);
  const [fundForm, setFundForm] = useState(initialFundForm);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [targetForm, setTargetForm] = useState({ monthlyRevenue: '', dailyGoal: '', desiredProfit: '', reinvestment: '', operatingDays: '26', weight: '0', expectedMargin: '0' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const businessId = business?.id || '';

  const businessAccounts = useMemo(() => accounts.filter((account) => account.business_id === businessId), [accounts, businessId]);
  const businessTransactions = useMemo(() => transactions.filter((transaction) => transaction.scope === 'negocio' && transaction.business_id === businessId), [transactions, businessId]);
  const businessFixedExpenses = useMemo(() => recurringExpenses.filter((expense) => belongsToBusiness(expense, businessId)), [recurringExpenses, businessId]);
  const businessFunds = useMemo(() => protectedFunds.filter((fund) => belongsToBusiness(fund, businessId) && fund.status !== 'deleted'), [protectedFunds, businessId]);
  const businessDebts = useMemo(() => debts.filter((debt) => belongsToBusiness(debt, businessId) || legacyDebtMatch(debt, business?.name)), [debts, businessId, business?.name]);
  const businessInvestments = useMemo(() => investments.filter((investment) => belongsToBusiness(investment, businessId)), [investments, businessId]);

  const activeFixed = businessFixedExpenses.filter(isActiveExpense);
  const activeFunds = businessFunds.filter((fund) => fund.status === 'active');
  const openDebts = businessDebts.filter((debt) => debt.status !== 'Pagada');
  const fixedTotal = activeFixed.reduce((sum, expense) => sum + monthlyCost(expense), 0);
  const protectedTotal = activeFunds.reduce((sum, fund) => sum + Number(fund.amount || 0), 0);
  const debtTotal = openDebts.reduce((sum, debt) => sum + Number(debt.pending || 0), 0);
  const debtMinimums = openDebts.reduce((sum, debt) => sum + Number(debt.minimum || 0), 0);
  const investmentTotal = businessInvestments.reduce((sum, investment) => sum + Number(investment.amount || 0), 0);
  const income = businessTransactions.filter((transaction) => transaction.type === 'ingreso').reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const variableExpenses = businessTransactions.filter((transaction) => transaction.type === 'gasto').reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const available = businessAccounts.reduce((sum, account) => sum + Number(account.current_balance || 0), 0);
  const committed = fixedTotal + protectedTotal + debtMinimums;
  const profit = income - variableExpenses - fixedTotal;
  const margin = income > 0 ? Math.round((profit / income) * 100) : 0;
  const safeWithdrawal = Math.max(0, available - committed);
  const reinvestment = Math.max(0, profit * 0.3);
  const chartData = getChartData(businessTransactions);
  const highestCategory = getHighestFixedCategory(activeFixed);
  const upcomingFixed = activeFixed.filter((expense) => isWithinDays(expense.next_due_date || expense.due_date || expense.next_run_date, 30));
  const nextFixed = [...activeFixed].sort((a, b) => String(a.next_due_date || a.due_date || a.next_run_date).localeCompare(String(b.next_due_date || b.due_date || b.next_run_date)))[0];
  const targetWeight = businessTargetWeights.find((weight) => weight.business_unit_id === businessId);
  const monthlyRevenueTarget = Number(targetForm.monthlyRevenue || 0);
  const operatingDays = Math.max(1, Number(targetForm.operatingDays || 26));
  const dailyGoal = monthlyRevenueTarget > 0 ? monthlyRevenueTarget / operatingDays : Number(targetForm.dailyGoal || 0);
  const targetProgress = monthlyRevenueTarget > 0 ? Math.min(100, Math.round((income / monthlyRevenueTarget) * 100)) : 0;
  const missingToTarget = Math.max(0, monthlyRevenueTarget - income);

  const hydrateTargetForm = () => {
    const target = monthlyTarget || defaultMonthlyTarget;
    const weight = businessTargetWeights.find((item) => item.business_unit_id === businessId);
    const weightedMonthly = Number(target.growth_target || 0) > 0 && weight ? Number(target.growth_target) * (Number(weight.weight_percent) / 100) : 0;
    setTargetForm({
      monthlyRevenue: String(weightedMonthly || ''),
      dailyGoal: weightedMonthly ? String(Math.round(weightedMonthly / Math.max(1, Number(target.operating_days_per_month || 26)))) : '',
      desiredProfit: String(target.desired_profit || ''),
      reinvestment: String(target.reinvestment_target || ''),
      operatingDays: String(target.operating_days_per_month || 26),
      weight: String(weight?.weight_percent || 0),
      expectedMargin: margin ? String(margin) : '0',
    });
  };

  if (!isOpen || !business) return null;

  const openFixedModal = (expense?: RecurringExpense) => {
    setError('');
    if (expense) {
      setFixedForm({
        name: expense.name || '',
        amount: String(expense.amount || ''),
        ...scheduleFormFromExpense(expense),
        category: expense.category || 'publicidad',
        paymentMethod: expense.payment_method || 'Transferencia',
        accountId: expense.account_id || '',
        isActive: isActiveExpense(expense),
        notes: expense.notes || '',
      });
      setModal({ kind: 'fixed', id: expense.id });
      return;
    }
    setFixedForm(initialFixedForm);
    setModal({ kind: 'fixed' });
  };

  const openDebtModal = (debt?: Debt) => {
    setError('');
    if (debt) {
      setDebtForm({
        name: debt.name || '',
        type: debt.type || 'Prestamo',
        category: debt.category || 'Negocio',
        originalAmount: String(debt.original_amount || ''),
        pending: String(debt.pending || ''),
        paid: String(debt.paid || 0),
        minimum: String(debt.minimum || ''),
        dueDate: debt.due_date || '',
        interest: String(debt.interest || 0),
        priority: debt.priority || 'Media',
        status: debt.status || 'Al dia',
        risk: debt.risk || 'Medio',
        notes: debt.notes || debt.recommendation || '',
      });
      setModal({ kind: 'debt', id: debt.id });
      return;
    }
    setDebtForm({ ...initialDebtForm, category: business.name });
    setModal({ kind: 'debt' });
  };

  const openFundModal = (fund?: ProtectedFund) => {
    setError('');
    if (fund) {
      setFundForm({
        name: fund.name || '',
        amount: String(fund.amount || ''),
        category: fund.fund_type || 'inventario',
        targetDate: fund.target_date || '',
        priority: fund.priority || 'Alta',
        accountId: fund.account_id || '',
        blockWithdrawals: fund.block_withdrawals,
        status: fund.status || 'active',
        notes: fund.notes || '',
      });
      setModal({ kind: 'fund', id: fund.id });
      return;
    }
    setFundForm(initialFundForm);
    setModal({ kind: 'fund' });
  };

  const openInvestmentModal = (investment?: Investment) => {
    setError('');
    if (investment) {
      setInvestmentForm({
        name: investment.name || '',
        amount: String(investment.amount || ''),
        category: investment.category || 'inventario',
        investmentDate: investment.investment_date || new Date().toISOString().slice(0, 10),
        expectedReturn: String(investment.expected_return || ''),
        accountId: investment.account_id || '',
        status: investment.status || 'active',
        notes: investment.notes || '',
      });
      setModal({ kind: 'investment', id: investment.id });
      return;
    }
    setInvestmentForm(initialInvestmentForm);
    setModal({ kind: 'investment' });
  };

  const closeModal = () => {
    setModal({ kind: null });
    setError('');
    setPaymentAmount('');
  };

  const saveFixedExpense = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...buildSchedulePayload(fixedForm, Number(fixedForm.amount)),
        name: fixedForm.name,
        scope: 'negocio' as const,
        category: fixedForm.category,
        amount: Number(fixedForm.amount),
        frequency: fixedForm.frequency,
        owner_type: 'business' as const,
        business_unit_id: businessId,
        is_required: true,
        is_active: fixedForm.isActive,
        payment_method: fixedForm.paymentMethod,
        mode: 'reminder',
        business_id: businessId,
        account_id: fixedForm.accountId || null,
        notes: fixedForm.notes,
      };
      if (modal.id) await updateRecurringExpense(modal.id, payload);
      else await createRecurringExpense(payload);
      showToast({ type: 'success', title: modal.id ? 'Gasto fijo actualizado' : 'Gasto fijo creado', description: `${business.name} fue actualizado.` });
      closeModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar el gasto fijo.';
      setError(message);
      showToast({ type: 'error', title: 'No se pudo guardar', description: message });
    } finally {
      setSaving(false);
    }
  };

  const saveDebt = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: debtForm.name,
        type: debtForm.type,
        category: debtForm.category || business.name,
        owner_type: 'business' as const,
        business_unit_id: businessId,
        business_id: businessId,
        original_amount: Number(debtForm.originalAmount),
        pending: Number(debtForm.pending),
        paid: Number(debtForm.paid || 0),
        minimum: Number(debtForm.minimum || 0),
        due_date: debtForm.dueDate,
        interest: Number(debtForm.interest || 0),
        priority: debtForm.priority,
        status: debtForm.status,
        risk: debtForm.risk,
        recommendation: debtForm.notes,
        notes: debtForm.notes,
      };
      if (modal.id) await updateDebt(modal.id, payload);
      else await createDebt(payload);
      showToast({ type: 'success', title: modal.id ? 'Deuda actualizada' : 'Deuda creada', description: `${business.name} fue actualizado.` });
      closeModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar la deuda.';
      setError(message);
      showToast({ type: 'error', title: 'No se pudo guardar', description: message });
    } finally {
      setSaving(false);
    }
  };

  const saveFund = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: fundForm.name,
        scope: 'negocio' as const,
        owner_type: 'business' as const,
        business_unit_id: businessId,
        fund_type: fundForm.category,
        amount: Number(fundForm.amount),
        priority: fundForm.priority,
        target_date: fundForm.targetDate,
        block_withdrawals: fundForm.blockWithdrawals,
        status: fundForm.status,
        business_id: businessId,
        account_id: fundForm.accountId || null,
        notes: fundForm.notes,
      };
      if (modal.id) await updateProtectedFund(modal.id, payload);
      else await createProtectedFund(payload);
      showToast({ type: 'success', title: modal.id ? 'Reserva actualizada' : 'Reserva creada', description: `${business.name} fue actualizado.` });
      closeModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar la reserva.';
      setError(message);
      showToast({ type: 'error', title: 'No se pudo guardar', description: message });
    } finally {
      setSaving(false);
    }
  };

  const saveInvestment = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: investmentForm.name,
        amount: Number(investmentForm.amount),
        category: investmentForm.category,
        owner_type: 'business' as const,
        business_unit_id: businessId,
        business_id: businessId,
        account_id: investmentForm.accountId || null,
        investment_date: investmentForm.investmentDate,
        expected_return: Number(investmentForm.expectedReturn || 0),
        status: investmentForm.status,
        notes: investmentForm.notes,
      };
      if (modal.id) await updateInvestment(modal.id, payload);
      else await createInvestment(payload);
      showToast({ type: 'success', title: modal.id ? 'Inversion actualizada' : 'Inversion creada', description: `${business.name} fue actualizado.` });
      closeModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar la inversion.';
      setError(message);
      showToast({ type: 'error', title: 'No se pudo guardar', description: message });
    } finally {
      setSaving(false);
    }
  };

  const saveDebtPayment = async () => {
    if (!modal.id) return;
    setSaving(true);
    setError('');
    try {
      await registerDebtPayment(modal.id, Number(paymentAmount));
      showToast({ type: 'success', title: 'Abono registrado', description: 'La deuda fue actualizada.' });
      closeModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo registrar el abono.';
      setError(message);
      showToast({ type: 'error', title: 'No se pudo registrar', description: message });
    } finally {
      setSaving(false);
    }
  };

  const saveTargets = async () => {
    setSaving(true);
    try {
      const base = monthlyTarget || defaultMonthlyTarget;
      const monthlyRevenue = Number(targetForm.monthlyRevenue || 0);
      const nextTarget = await upsertMonthlyTarget({
        ...base,
        operating_days_per_month: Math.max(1, Number(targetForm.operatingDays || 26)),
        desired_profit: Number(targetForm.desiredProfit || base.desired_profit || 0),
        reinvestment_target: Number(targetForm.reinvestment || base.reinvestment_target || 0),
        growth_target: Math.max(Number(base.growth_target || 0), monthlyRevenue),
      });
      const otherWeights = businessTargetWeights.filter((weight) => weight.business_unit_id !== businessId).map((weight) => ({ business_unit_id: weight.business_unit_id, weight_percent: Number(weight.weight_percent || 0) }));
      await upsertBusinessTargetWeights([...otherWeights, { business_unit_id: businessId, weight_percent: Number(targetForm.weight || 0) }]);
      setTargetForm({ ...targetForm, operatingDays: String(nextTarget.operating_days_per_month) });
      showToast({ type: 'success', title: 'Metas actualizadas', description: `${business.name} ya tiene metas configuradas.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron guardar las metas.';
      showToast({ type: 'error', title: 'No se pudieron guardar', description: message });
    } finally {
      setSaving(false);
    }
  };

  const noaMessage = businessTransactions.length + businessFixedExpenses.length + businessDebts.length + businessFunds.length === 0
    ? 'Agrega ingresos, gastos fijos o deudas para calcular la salud real del negocio.'
    : `${business.name} tiene ${money(available)} disponibles, pero ${money(committed)} estan comprometidos en gastos fijos, deudas y reservas. Puedes retirar maximo ${money(safeWithdrawal)} sin afectar el flujo.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-3 backdrop-blur-sm sm:p-6">
      <Card className="my-6 w-full max-w-6xl border-border shadow-2xl">
        <CardHeader className="sticky top-0 z-10 flex flex-row items-center justify-between border-b border-border bg-card pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <CardTitle className="text-2xl font-display">{business.name}</CardTitle>
              <Badge variant={business.statusVariant}>{business.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{business.type}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onRegisterIncome} className="hidden border-success/30 text-success hover:bg-success/10 hover:text-success sm:flex">+ Ingreso</Button>
            <Button variant="outline" size="sm" onClick={onRegisterExpense} className="hidden border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive sm:flex">- Gasto</Button>
            <button onClick={onClose} className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted"><X className="h-5 w-5" /></button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-5">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              ['summary', 'Resumen'],
              ['movements', 'Ingresos y gastos'],
              ['fixed', 'Gastos fijos'],
              ['debts', 'Deudas'],
              ['investments', 'Inversiones'],
              ['protected', 'Dinero no tocar'],
              ['targets', 'Metas'],
              ['report', 'Reporte'],
            ].map(([id, label]) => <Button key={id} variant={tab === id ? 'default' : 'outline'} size="sm" onClick={() => { if (id === 'targets') hydrateTargetForm(); setTab(id); }}>{label}</Button>)}
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <MetricCard label="Ingresos" value={income} tone="success" />
            <MetricCard label="Gastos variables" value={variableExpenses} tone="destructive" />
            <MetricCard label="Gastos fijos" value={fixedTotal} tone="warning" />
            <MetricCard label="Ganancia neta" value={profit} tone={profit >= 0 ? 'success' : 'destructive'} />
          </div>

          {tab === 'summary' && (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-4">
                <ContextCard icon={<CreditCard className="h-4 w-4" />} title="Deudas proximas" value={money(debtMinimums)} detail={`${openDebts.length} abiertas`} />
                <ContextCard icon={<ShieldAlert className="h-4 w-4" />} title="Dinero no tocar" value={money(protectedTotal)} detail={`${activeFunds.length} reservas`} />
                <ContextCard icon={<PiggyBank className="h-4 w-4" />} title="Dinero libre" value={money(safeWithdrawal)} detail="Despues de compromisos" />
                <ContextCard icon={<Target className="h-4 w-4" />} title="Meta del mes" value={money(monthlyRevenueTarget)} detail={`${targetProgress}% completado`} />
              </div>
              <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                <Card className="border-border bg-card">
                  <CardHeader>
                    <CardTitle>Ingresos vs gastos</CardTitle>
                    <CardDescription>Movimientos asociados automaticamente a {business.name}.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BusinessChart data={chartData} />
                  </CardContent>
                </Card>
                <Card className="border-l-4 border-l-primary bg-primary/5">
                  <CardContent className="space-y-3 p-5">
                    <h3 className="flex items-center gap-2 font-display font-semibold"><Activity className="h-5 w-5 text-primary" /> Lectura de Noa</h3>
                    <p className="text-sm leading-6 text-muted-foreground">{noaMessage}</p>
                    <Row label="Retiro seguro" value={safeWithdrawal} tone="success" />
                    <Row label="Reinversion recomendada" value={reinvestment} />
                    <Row label="Margen estimado" text={`${margin}%`} />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {tab === 'movements' && (
            <SectionShell title="Ingresos y gastos" description="Registra movimientos desde este perfil y quedan ligados al negocio actual." actions={<><Button size="sm" onClick={onRegisterIncome}>+ Ingreso</Button><Button size="sm" variant="outline" onClick={onRegisterExpense}>- Gasto</Button></>}>
              <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <BusinessChart data={chartData} />
                <MovementList transactions={businessTransactions} />
              </div>
            </SectionShell>
          )}

          {tab === 'fixed' && (
            <SectionShell title="Gastos fijos del negocio" description="Control mensual de obligaciones recurrentes." actions={<Button size="sm" onClick={() => openFixedModal()}><Plus className="mr-2 h-4 w-4" /> Nuevo gasto fijo</Button>}>
              <div className="grid gap-3 md:grid-cols-4">
                <MiniSummary label="Total mensual" value={fixedTotal} />
                <MiniSummary label="Proximo pago" text={nextFixed ? `${nextFixed.name}: ${nextFixed.next_due_date || nextFixed.due_date || nextFixed.next_run_date}` : 'Sin pagos'} />
                <MiniSummary label="Pagos 30 dias" text={`${upcomingFixed.length}`} />
                <MiniSummary label="Categoria mas alta" text={highestCategory?.name || 'Sin datos'} />
              </div>
              <FixedExpenseList rows={businessFixedExpenses} onEdit={openFixedModal} onPaid={markRecurringExpensePaid} onToggle={(expense) => updateRecurringExpenseStatus(expense.id, isActiveExpense(expense) ? 'paused' : 'active')} onDelete={deleteRecurringExpense} />
            </SectionShell>
          )}

          {tab === 'debts' && (
            <SectionShell title="Deudas del negocio" description="Crea, edita, abona y cierra deudas del negocio actual." actions={<Button size="sm" onClick={() => openDebtModal()}><Plus className="mr-2 h-4 w-4" /> Nueva deuda</Button>}>
              <div className="grid gap-3 md:grid-cols-4">
                <MiniSummary label="Saldo pendiente" value={debtTotal} />
                <MiniSummary label="Pago minimo" value={debtMinimums} />
                <MiniSummary label="Deudas abiertas" text={`${openDebts.length}`} />
                <MiniSummary label="Prioridad alta" text={openDebts.find((debt) => debt.priority === 'Critica' || debt.priority === 'Alta')?.name || 'Sin datos'} />
              </div>
              <DebtList rows={businessDebts} onEdit={openDebtModal} onPay={(debt) => { setPaymentAmount(''); setModal({ kind: 'debtPayment', id: debt.id }); }} onMarkPaid={(debt) => updateDebt(debt.id, { ...debt, pending: 0, paid: Number(debt.original_amount || 0), original_amount: Number(debt.original_amount || 0), minimum: Number(debt.minimum || 0), interest: Number(debt.interest || 0), status: 'Pagada', owner_type: 'business', business_unit_id: businessId, business_id: businessId })} onDelete={deleteDebt} />
            </SectionShell>
          )}

          {tab === 'investments' && (
            <SectionShell title="Inversiones del negocio" description="Registra compras, capital, inventario o mejoras asociadas al negocio actual." actions={<Button size="sm" onClick={() => openInvestmentModal()}><Plus className="mr-2 h-4 w-4" /> Nueva inversion</Button>}>
              <div className="grid gap-3 md:grid-cols-3">
                <MiniSummary label="Total invertido" value={investmentTotal} />
                <MiniSummary label="Inversiones activas" text={`${businessInvestments.filter((investment) => investment.status !== 'closed').length}`} />
                <MiniSummary label="Retorno esperado" value={businessInvestments.reduce((sum, investment) => sum + Number(investment.expected_return || 0), 0)} />
              </div>
              <InvestmentList rows={businessInvestments} onEdit={openInvestmentModal} onDelete={deleteInvestment} />
            </SectionShell>
          )}

          {tab === 'protected' && (
            <SectionShell title="Dinero no tocar del negocio" description="Reservas internas para proteger inventario, nomina, impuestos y pagos." actions={<Button size="sm" onClick={() => openFundModal()}><Plus className="mr-2 h-4 w-4" /> Nueva reserva</Button>}>
              <div className="grid gap-3 md:grid-cols-3">
                <MiniSummary label="Reservado activo" value={protectedTotal} />
                <MiniSummary label="Reservas activas" text={`${activeFunds.length}`} />
                <MiniSummary label="Libre despues de reservas" value={Math.max(0, available - protectedTotal)} />
              </div>
              <FundList rows={businessFunds} onEdit={openFundModal} onDelete={deleteProtectedFund} />
            </SectionShell>
          )}

          {tab === 'targets' && (
            <SectionShell title="Metas del negocio" description="Configura meta mensual, dias operativos, utilidad y aporte a la meta general." actions={<Button size="sm" onClick={saveTargets} disabled={saving}>{saving ? 'Guardando...' : 'Guardar metas'}</Button>}>
              <div className="grid gap-4 md:grid-cols-4">
                <TargetField label="Meta mensual" value={targetForm.monthlyRevenue} onChange={(value) => setTargetForm({ ...targetForm, monthlyRevenue: value })} />
                <TargetField label="Dias operativos" value={targetForm.operatingDays} onChange={(value) => setTargetForm({ ...targetForm, operatingDays: value })} />
                <TargetField label="Utilidad objetivo" value={targetForm.desiredProfit} onChange={(value) => setTargetForm({ ...targetForm, desiredProfit: value })} />
                <TargetField label="Reinversion objetivo" value={targetForm.reinvestment} onChange={(value) => setTargetForm({ ...targetForm, reinvestment: value })} />
                <TargetField label="% aporte meta general" value={targetForm.weight} onChange={(value) => setTargetForm({ ...targetForm, weight: value })} />
                <TargetField label="Margen esperado %" value={targetForm.expectedMargin} onChange={(value) => setTargetForm({ ...targetForm, expectedMargin: value })} />
                <MiniSummary label="Meta diaria ideal" value={dailyGoal} />
                <MiniSummary label="Falta facturar" value={missingToTarget} />
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="mb-2 flex justify-between text-sm"><span>Progreso de facturacion</span><strong>{targetProgress}%</strong></div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-success" style={{ width: `${targetProgress}%` }} /></div>
                <p className="mt-2 text-xs text-muted-foreground">Peso actual en meta general: {targetWeight?.weight_percent || 0}%.</p>
              </div>
            </SectionShell>
          )}

          {tab === 'report' && (
            <SectionShell title="Reporte del negocio" description="Vista especifica de ingresos, gastos, reservas, deudas, metas y recomendaciones." actions={<Button size="sm" variant="outline" onClick={() => window.print()}><Download className="mr-2 h-4 w-4" /> Exportar reporte del negocio</Button>}>
              <div className="grid gap-3 md:grid-cols-3">
                <MiniSummary label="Ingresos" value={income} />
                <MiniSummary label="Gastos variables" value={variableExpenses} />
                <MiniSummary label="Gastos fijos" value={fixedTotal} />
                <MiniSummary label="Inversiones" value={investmentTotal} />
                <MiniSummary label="Deudas" value={debtTotal} />
                <MiniSummary label="Dinero no tocar" value={protectedTotal} />
                <MiniSummary label="Utilidad estimada" value={profit} />
                <MiniSummary label="Margen" text={`${margin}%`} />
                <MiniSummary label="Meta mensual" value={monthlyRevenueTarget} />
                <MiniSummary label="Progreso" text={`${targetProgress}%`} />
              </div>
              <div className="rounded-xl border-l-4 border-l-primary bg-primary/5 p-4 text-sm text-muted-foreground">{noaMessage}</div>
            </SectionShell>
          )}
        </CardContent>
      </Card>

      {modal.kind === 'fixed' && (
        <FormModal title={modal.id ? 'Editar gasto fijo' : 'Nuevo gasto fijo'} description={`Se guardara automaticamente en ${business.name}.`} onClose={closeModal} onSave={saveFixedExpense} saving={saving} error={error}>
          <Field label="Nombre"><input className="form-field" value={fixedForm.name} onChange={(event) => setFixedForm({ ...fixedForm, name: event.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Monto"><input className="form-field" type="number" min="0" step="0.01" value={fixedForm.amount} onChange={(event) => setFixedForm({ ...fixedForm, amount: event.target.value })} /></Field>
            <Field label="Frecuencia"><Select value={fixedForm.frequency} options={frequencies} onChange={(value) => setFixedForm({ ...fixedForm, frequency: value })} /></Field>
          </div>
          <RecurringScheduleFields
            form={fixedForm}
            amount={fixedForm.amount}
            name={fixedForm.name}
            money={money}
            onChange={(patch) => setFixedForm({ ...fixedForm, ...patch })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Categoria"><Select value={fixedForm.category} options={fixedCategories} onChange={(value) => setFixedForm({ ...fixedForm, category: value })} /></Field>
            <Field label="Metodo de pago"><Select value={fixedForm.paymentMethod} options={paymentMethods} onChange={(value) => setFixedForm({ ...fixedForm, paymentMethod: value })} /></Field>
            <Field label="Cuenta asociada"><AccountSelect accounts={businessAccounts} value={fixedForm.accountId} onChange={(value) => setFixedForm({ ...fixedForm, accountId: value })} /></Field>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm"><input type="checkbox" checked={fixedForm.isActive} onChange={(event) => setFixedForm({ ...fixedForm, isActive: event.target.checked })} /> Activo</label>
          <Field label="Nota"><input className="form-field" value={fixedForm.notes} onChange={(event) => setFixedForm({ ...fixedForm, notes: event.target.value })} placeholder="Opcional" /></Field>
        </FormModal>
      )}

      {modal.kind === 'debt' && (
        <FormModal title={modal.id ? 'Editar deuda' : 'Nueva deuda'} description={`Se guardara automaticamente en ${business.name}.`} onClose={closeModal} onSave={saveDebt} saving={saving} error={error}>
          <Field label="Nombre"><input className="form-field" value={debtForm.name} onChange={(event) => setDebtForm({ ...debtForm, name: event.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tipo"><input className="form-field" value={debtForm.type} onChange={(event) => setDebtForm({ ...debtForm, type: event.target.value })} /></Field>
            <Field label="Categoria"><input className="form-field" value={debtForm.category} onChange={(event) => setDebtForm({ ...debtForm, category: event.target.value })} /></Field>
            <Field label="Monto original"><input className="form-field" type="number" min="0" step="0.01" value={debtForm.originalAmount} onChange={(event) => setDebtForm({ ...debtForm, originalAmount: event.target.value })} /></Field>
            <Field label="Saldo actual"><input className="form-field" type="number" min="0" step="0.01" value={debtForm.pending} onChange={(event) => setDebtForm({ ...debtForm, pending: event.target.value })} /></Field>
            <Field label="Pago minimo"><input className="form-field" type="number" min="0" step="0.01" value={debtForm.minimum} onChange={(event) => setDebtForm({ ...debtForm, minimum: event.target.value })} /></Field>
            <Field label="Fecha de pago"><input className="form-field" type="date" value={debtForm.dueDate} onChange={(event) => setDebtForm({ ...debtForm, dueDate: event.target.value })} /></Field>
            <Field label="Interes %"><input className="form-field" type="number" min="0" step="0.01" value={debtForm.interest} onChange={(event) => setDebtForm({ ...debtForm, interest: event.target.value })} /></Field>
            <Field label="Prioridad"><Select value={debtForm.priority} options={priorities} onChange={(value) => setDebtForm({ ...debtForm, priority: value })} /></Field>
            <Field label="Estado"><Select value={debtForm.status} options={['Al dia', 'Atrasada', 'Pagada']} onChange={(value) => setDebtForm({ ...debtForm, status: value })} /></Field>
            <Field label="Riesgo"><Select value={debtForm.risk} options={['Alto', 'Medio', 'Bajo']} onChange={(value) => setDebtForm({ ...debtForm, risk: value })} /></Field>
          </div>
          <Field label="Notas"><input className="form-field" value={debtForm.notes} onChange={(event) => setDebtForm({ ...debtForm, notes: event.target.value })} /></Field>
        </FormModal>
      )}

      {modal.kind === 'investment' && (
        <FormModal title={modal.id ? 'Editar inversion' : 'Nueva inversion'} description={`Se guardara automaticamente en ${business.name}.`} onClose={closeModal} onSave={saveInvestment} saving={saving} error={error}>
          <Field label="Nombre"><input className="form-field" value={investmentForm.name} onChange={(event) => setInvestmentForm({ ...investmentForm, name: event.target.value })} placeholder="Ej: Inventario inicial, publicidad, equipo" /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Monto"><input className="form-field" type="number" min="0" step="0.01" value={investmentForm.amount} onChange={(event) => setInvestmentForm({ ...investmentForm, amount: event.target.value })} /></Field>
            <Field label="Categoria"><Select value={investmentForm.category} options={['inventario', 'marketing', 'equipo', 'software', 'producto', 'capital', 'otros']} onChange={(value) => setInvestmentForm({ ...investmentForm, category: value })} /></Field>
            <Field label="Fecha"><input className="form-field" type="date" value={investmentForm.investmentDate} onChange={(event) => setInvestmentForm({ ...investmentForm, investmentDate: event.target.value })} /></Field>
            <Field label="Retorno esperado"><input className="form-field" type="number" min="0" step="0.01" value={investmentForm.expectedReturn} onChange={(event) => setInvestmentForm({ ...investmentForm, expectedReturn: event.target.value })} /></Field>
            <Field label="Estado"><Select value={investmentForm.status} options={['active', 'planned', 'closed']} onChange={(value) => setInvestmentForm({ ...investmentForm, status: value })} /></Field>
            <Field label="Cuenta asociada"><AccountSelect accounts={businessAccounts} value={investmentForm.accountId} onChange={(value) => setInvestmentForm({ ...investmentForm, accountId: value })} /></Field>
          </div>
          <Field label="Nota"><input className="form-field" value={investmentForm.notes} onChange={(event) => setInvestmentForm({ ...investmentForm, notes: event.target.value })} placeholder="Opcional" /></Field>
        </FormModal>
      )}

      {modal.kind === 'fund' && (
        <FormModal title={modal.id ? 'Editar reserva' : 'Nueva reserva'} description={`Se guardara automaticamente en ${business.name}.`} onClose={closeModal} onSave={saveFund} saving={saving} error={error}>
          <Field label="Nombre"><input className="form-field" value={fundForm.name} onChange={(event) => setFundForm({ ...fundForm, name: event.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Monto"><input className="form-field" type="number" min="0" step="0.01" value={fundForm.amount} onChange={(event) => setFundForm({ ...fundForm, amount: event.target.value })} /></Field>
            <Field label="Categoria"><Select value={fundForm.category} options={reserveCategories} onChange={(value) => setFundForm({ ...fundForm, category: value })} /></Field>
            <Field label="Fecha objetivo"><input className="form-field" type="date" value={fundForm.targetDate} onChange={(event) => setFundForm({ ...fundForm, targetDate: event.target.value })} /></Field>
            <Field label="Prioridad"><Select value={fundForm.priority} options={priorities} onChange={(value) => setFundForm({ ...fundForm, priority: value })} /></Field>
            <Field label="Estado"><Select value={fundForm.status} options={['active', 'paused']} onChange={(value) => setFundForm({ ...fundForm, status: value })} /></Field>
            <Field label="Cuenta asociada"><AccountSelect accounts={businessAccounts} value={fundForm.accountId} onChange={(value) => setFundForm({ ...fundForm, accountId: value })} /></Field>
          </div>
          <label className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm"><input type="checkbox" checked={fundForm.blockWithdrawals} onChange={(event) => setFundForm({ ...fundForm, blockWithdrawals: event.target.checked })} /> Bloquear retiro de este dinero</label>
          <Field label="Nota"><input className="form-field" value={fundForm.notes} onChange={(event) => setFundForm({ ...fundForm, notes: event.target.value })} /></Field>
        </FormModal>
      )}

      {modal.kind === 'debtPayment' && (
        <FormModal title="Registrar abono" description="El saldo pendiente se actualizara inmediatamente." onClose={closeModal} onSave={saveDebtPayment} saving={saving} error={error}>
          <Field label="Monto del abono"><input className="form-field" type="number" min="0" step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} /></Field>
        </FormModal>
      )}
    </div>
  );
}

function belongsToBusiness(item: { business_id?: string | null; business_unit_id?: string | null }, businessId: string) {
  return item.business_id === businessId || item.business_unit_id === businessId;
}

function legacyDebtMatch(debt: Debt, businessName?: string) {
  if (!businessName) return false;
  return `${debt.category || ''} ${debt.recommendation || ''} ${debt.notes || ''}`.toLowerCase().includes(String(businessName).toLowerCase());
}

function isActiveExpense(expense: RecurringExpense) {
  return expense.is_active ?? expense.status === 'active';
}

function safeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isWithinDays(value?: string | null, days = 30) {
  const date = safeDate(value);
  if (!date) return false;
  const now = new Date();
  const limit = new Date();
  limit.setDate(now.getDate() + days);
  return date >= now && date <= limit;
}

function getHighestFixedCategory(expenses: RecurringExpense[]) {
  const rows = new Map<string, { name: string; total: number }>();
  expenses.forEach((expense) => {
    const name = expense.category || 'otros';
    const row = rows.get(name) || { name, total: 0 };
    row.total += monthlyCost(expense);
    rows.set(name, row);
  });
  return Array.from(rows.values()).sort((a, b) => b.total - a.total)[0];
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'destructive' | 'warning' }) {
  const color = tone === 'success' ? 'text-success' : tone === 'destructive' ? 'text-destructive' : tone === 'warning' ? 'text-orange-500' : '';
  return <div className="rounded-xl border border-border bg-muted/30 p-4"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className={`mt-1 text-xl font-bold ${color}`}>{money(value)}</p></div>;
}

function ContextCard({ icon, title, value, detail }: { icon: React.ReactNode; title: string; value: string; detail: string }) {
  return <div className="rounded-xl border border-border bg-muted/20 p-4"><div className="flex items-center justify-between text-sm text-muted-foreground"><span>{title}</span>{icon}</div><p className="mt-2 text-xl font-bold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}

function MiniSummary({ label, value, text }: { label: string; value?: number; text?: string }) {
  return <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 truncate text-lg font-bold">{text || money(value || 0)}</p></div>;
}

function SectionShell({ title, description, actions, children }: { title: string; description: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return <div className="space-y-4"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h3 className="text-xl font-display font-semibold">{title}</h3><p className="text-sm text-muted-foreground">{description}</p></div><div className="flex flex-wrap gap-2">{actions}</div></div>{children}</div>;
}

function BusinessChart({ data }: { data: { name: string; ingresos: number; gastos: number }[] }) {
  if (data.length === 0) return <EmptyState text="No hay movimientos para graficar todavia." />;
  return (
    <div className="h-72 rounded-xl border border-border/50 bg-card p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
          <Tooltip formatter={(value) => money(Number(value))} />
          <Bar dataKey="ingresos" name="Ingresos" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="gastos" name="Gastos" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MovementList({ transactions }: { transactions: Transaction[] }) {
  const rows = transactions.slice(0, 12);
  if (rows.length === 0) return <EmptyState text="No hay movimientos registrados para este negocio." />;
  return <div className="overflow-hidden rounded-xl border border-border">{rows.map((transaction) => <div key={transaction.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-border p-3 text-sm last:border-b-0"><div><p className="font-medium">{transaction.notes || (transaction.type === 'ingreso' ? 'Ingreso' : 'Gasto')}</p><p className="text-xs text-muted-foreground">{transaction.category || 'Sin categoria'} - {safeDate(transaction.date)?.toLocaleDateString('es-PA') || 'Sin fecha'}</p></div><p className={`font-bold ${transaction.type === 'ingreso' ? 'text-success' : 'text-destructive'}`}>{transaction.type === 'ingreso' ? '+' : '-'}{money(Number(transaction.amount || 0))}</p></div>)}</div>;
}

function FixedExpenseList({ rows, onEdit, onPaid, onToggle, onDelete }: { rows: RecurringExpense[]; onEdit: (expense: RecurringExpense) => void; onPaid: (id: string) => Promise<void>; onToggle: (expense: RecurringExpense) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  if (rows.length === 0) return <EmptyState text="Este negocio aun no tiene gastos fijos registrados." />;
  return <div className="space-y-2">{rows.map((expense) => <ActionRow key={expense.id} title={expense.name} detail={`${expense.category || 'Sin categoria'} - ${expense.frequency} - Pago: ${expense.next_due_date || expense.due_date || expense.next_run_date || 'sin fecha'}`} value={money(monthlyCost(expense))} status={isActiveExpense(expense) ? 'Activo' : 'Pausado'} actions={<><IconButton label="Editar" onClick={() => onEdit(expense)} icon={<Pencil className="h-4 w-4" />} /><IconButton label="Pagar" onClick={() => onPaid(expense.id)} icon={<CheckCircle2 className="h-4 w-4" />} /><IconButton label={isActiveExpense(expense) ? 'Pausar' : 'Activar'} onClick={() => onToggle(expense)} icon={isActiveExpense(expense) ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} /><IconButton label="Eliminar" onClick={() => onDelete(expense.id)} icon={<Trash2 className="h-4 w-4" />} danger /></>} />)}</div>;
}

function DebtList({ rows, onEdit, onPay, onMarkPaid, onDelete }: { rows: Debt[]; onEdit: (debt: Debt) => void; onPay: (debt: Debt) => void; onMarkPaid: (debt: Debt) => Promise<Debt>; onDelete: (id: string) => Promise<void> }) {
  if (rows.length === 0) return <EmptyState text="No hay deudas asociadas a este negocio todavia." />;
  return <div className="space-y-2">{rows.map((debt) => <ActionRow key={debt.id} title={debt.name} detail={`${debt.type} - ${debt.priority || 'Media'} - Vence: ${debt.due_date || 'sin fecha'}`} value={money(Number(debt.pending || 0))} status={debt.status || 'Al dia'} actions={<><IconButton label="Editar" onClick={() => onEdit(debt)} icon={<Pencil className="h-4 w-4" />} /><IconButton label="Abonar" onClick={() => onPay(debt)} icon={<CreditCard className="h-4 w-4" />} /><IconButton label="Pagada" onClick={() => onMarkPaid(debt)} icon={<CheckCircle2 className="h-4 w-4" />} /><IconButton label="Eliminar" onClick={() => onDelete(debt.id)} icon={<Trash2 className="h-4 w-4" />} danger /></>} />)}</div>;
}

function InvestmentList({ rows, onEdit, onDelete }: { rows: Investment[]; onEdit: (investment: Investment) => void; onDelete: (id: string) => Promise<void> }) {
  if (rows.length === 0) return <EmptyState text="No hay inversiones registradas para este negocio." />;
  return <div className="space-y-2">{rows.map((investment) => <ActionRow key={investment.id} title={investment.name} detail={`${investment.category || 'Sin categoria'} - ${investment.investment_date || 'sin fecha'} - Retorno esperado: ${money(Number(investment.expected_return || 0))}`} value={money(Number(investment.amount || 0))} status={investment.status || 'active'} actions={<><IconButton label="Editar" onClick={() => onEdit(investment)} icon={<Pencil className="h-4 w-4" />} /><IconButton label="Eliminar" onClick={() => onDelete(investment.id)} icon={<Trash2 className="h-4 w-4" />} danger /></>} />)}</div>;
}

function FundList({ rows, onEdit, onDelete }: { rows: ProtectedFund[]; onEdit: (fund: ProtectedFund) => void; onDelete: (id: string) => Promise<void> }) {
  if (rows.length === 0) return <EmptyState text="No hay reservas protegidas para este negocio." />;
  return <div className="space-y-2">{rows.map((fund) => <ActionRow key={fund.id} title={fund.name} detail={`${fund.fund_type} - ${fund.priority} - ${fund.status}`} value={money(Number(fund.amount || 0))} status={fund.block_withdrawals ? 'Bloqueado' : 'Flexible'} actions={<><IconButton label="Editar" onClick={() => onEdit(fund)} icon={<Pencil className="h-4 w-4" />} /><IconButton label="Eliminar" onClick={() => onDelete(fund.id)} icon={<Trash2 className="h-4 w-4" />} danger /></>} />)}</div>;
}

function ActionRow({ title, detail, value, status, actions }: { title: string; detail: string; value: string; status: string; actions: React.ReactNode }) {
  return <div className="grid gap-3 rounded-xl border border-border bg-card p-3 md:grid-cols-[1fr_auto] md:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{title}</p><Badge variant="secondary">{status}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div><div className="flex flex-wrap items-center gap-2 md:justify-end"><p className="mr-2 font-bold">{value}</p>{actions}</div></div>;
}

function IconButton({ label, icon, onClick, danger }: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return <Button type="button" variant="outline" size="sm" onClick={onClick} className={danger ? 'text-destructive hover:text-destructive' : ''}>{icon}<span className="sr-only">{label}</span></Button>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">{text}</div>;
}

function Row({ label, value, text, tone }: { label: string; value?: number; text?: string; tone?: 'success' }) {
  return <div className="flex justify-between text-sm"><span className="text-muted-foreground">{label}</span><span className={`font-medium ${tone === 'success' ? 'text-success' : ''}`}>{text || money(value || 0)}</span></div>;
}

function FormModal({ title, description, children, onClose, onSave, saving, error }: { title: string; description: string; children: React.ReactNode; onClose: () => void; onSave: () => void; saving: boolean; error?: string }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <Card className="max-h-[calc(100dvh-1.5rem)] w-full max-w-xl overflow-y-auto border-border shadow-2xl">
        <CardHeader className="flex flex-row items-start justify-between border-b border-border">
          <div><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></div>
          <button onClick={onClose} className="rounded-xl p-1 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">{children}{error ? <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}</CardContent>
        <CardFooter className="flex justify-end gap-2 border-t pt-4"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={onSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button></CardFooter>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm font-medium text-muted-foreground">{label}</span>{children}</label>;
}

function Select({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return <select className="form-field" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
}

function AccountSelect({ accounts, value, onChange }: { accounts: Account[]; value: string; onChange: (value: string) => void }) {
  return <select className="form-field" value={value} onChange={(event) => onChange(event.target.value)}><option value="">Opcional</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select>;
}

function TargetField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <Field label={label}><input className="form-field" type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} /></Field>;
}
