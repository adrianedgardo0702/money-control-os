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
  Calendar,
  CheckCircle2,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Building,
  CreditCard,
  Pencil,
  Pause,
  Play,
  Trash2,
  X,
} from 'lucide-react';
import { TransactionModal } from './TransactionModal';
import { TransferModal } from './TransferModal';
import { buildSchedulePayload, defaultScheduleForm, RecurringScheduleFields, scheduleFormFromExpense } from './RecurringScheduleFields';
import { Account, Debt, RecurringExpense, RecurringExpensePayment, useStore, Transaction } from '@/store/useStore';
import { defaultMonthlyTarget, monthlyCost } from '@/lib/financePlanning';
import { calculateNextDueDate, generateDueDates } from '@/lib/recurrence';
import { showToast } from '@/lib/toast';

const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = formatDateKey(new Date());

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
  ...defaultScheduleForm,
  category: 'Otros',
  paymentMethod: '',
  accountId: '',
  notes: '',
  isActive: true,
};

const personalViewOptions = [
  ['summary', 'Resumen'],
  ['movements', 'Movimientos personales'],
  ['fixed', 'Gastos fijos personales'],
  ['debts', 'Deudas personales'],
  ['cards', 'Tarjetas personales'],
  ['budget', 'Presupuesto personal'],
  ['savings', 'Ahorro y metas'],
  ['withdrawals', 'Retiros desde negocios'],
] as const;

const initialDebtForm = {
  name: '',
  type: 'Personal',
  category: 'Deudas personales',
  originalAmount: '',
  pending: '',
  minimum: '',
  dueDate: today,
  interest: '',
  priority: 'Media',
  status: 'Al dia',
  risk: 'Medio',
  notes: '',
};

const initialCardForm = {
  name: '',
  bankName: '',
  balance: '',
  status: 'active',
};

export function PersonalBudgetModule() {
  const {
    accounts,
    transactions,
    protectedFunds,
    recurringExpenses,
    recurringExpensePayments,
    debts,
    businesses,
    monthlyTarget,
    transferFunds,
    createProtectedFund,
    updateProtectedFund,
    deleteProtectedFund,
    createRecurringExpense,
    updateRecurringExpense,
    updateRecurringExpenseStatus,
    markRecurringExpensePaid,
    postponeRecurringExpensePayment,
    skipRecurringExpensePayment,
    deleteRecurringExpense,
    createDebt,
    updateDebt,
    registerDebtPayment,
    deleteDebt,
    createAccount,
    updateAccount,
    deleteAccount,
    upsertMonthlyTarget,
  } = useStore();
  const [period, setPeriod] = useState('this_week');
  const [mode, setMode] = useState('balanced');
  const [view, setView] = useState('summary');
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; type: 'ingreso' | 'gasto' }>({ isOpen: false, type: 'gasto' });
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalForm, setGoalForm] = useState(initialGoalForm);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalError, setGoalError] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [workingGoalId, setWorkingGoalId] = useState<string | null>(null);
  const [fixedModalOpen, setFixedModalOpen] = useState(false);
  const [fixedForm, setFixedForm] = useState(initialFixedExpenseForm);
  const [editingFixedId, setEditingFixedId] = useState<string | null>(null);
  const [fixedError, setFixedError] = useState('');
  const [savingFixed, setSavingFixed] = useState(false);
  const [workingFixedId, setWorkingFixedId] = useState<string | null>(null);
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [debtForm, setDebtForm] = useState(initialDebtForm);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [debtError, setDebtError] = useState('');
  const [savingDebt, setSavingDebt] = useState(false);
  const [payingDebtId, setPayingDebtId] = useState<string | null>(null);
  const [debtPaymentAmount, setDebtPaymentAmount] = useState('');
  const [workingDebtId, setWorkingDebtId] = useState<string | null>(null);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [cardForm, setCardForm] = useState(initialCardForm);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardError, setCardError] = useState('');
  const [savingCard, setSavingCard] = useState(false);
  const [workingCardId, setWorkingCardId] = useState<string | null>(null);
  const [budgetDraft, setBudgetDraft] = useState('');
  const [budgetError, setBudgetError] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);
  const [postponeTarget, setPostponeTarget] = useState<{ expenseId: string; dueDate: string; name: string } | null>(null);
  const [customPostponeDate, setCustomPostponeDate] = useState('');

  const personalAccounts = accounts.filter((account) => account.is_personal);
  const personalCards = personalAccounts.filter((account) => account.type.toLowerCase().includes('tarjeta'));
  const businessAccounts = accounts.filter((account) => !account.is_personal);
  const personalTransactions = transactions.filter((transaction) => transaction.scope === 'personal');
  const monthlyExpenses = personalTransactions.filter((transaction) => transaction.type === 'gasto' && isCurrentMonth(transaction.date)).reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const personalMoney = personalAccounts.reduce((sum, account) => sum + Number(account.current_balance), 0);
  const personalFixedExpenses = recurringExpenses.filter((expense) => expense.scope === 'personal' || expense.owner_type === 'personal' || expense.business_unit_id === 'personal');
  const personalRecurring = personalFixedExpenses.filter((expense) => expense.status === 'active' || expense.is_active);
  const personalPaymentOccurrences = buildPersonalPaymentOccurrences(personalFixedExpenses, recurringExpensePayments);
  const paymentStats = buildPaymentStats(personalPaymentOccurrences, recurringExpensePayments);
  const paymentGroups = groupPaymentOccurrences(personalPaymentOccurrences);
  const paymentAlerts = buildPaymentAlerts(paymentStats, personalPaymentOccurrences);
  const personalRecurringTotal = personalRecurring.reduce((sum, expense) => sum + monthlyCost(expense), 0);
  const pausedFixedExpenses = personalFixedExpenses.filter((expense) => expense.status === 'paused' || expense.is_active === false);
  const upcomingPersonalFixed = [...personalRecurring].sort((a, b) => String(a.next_due_date || a.due_date || a.next_run_date).localeCompare(String(b.next_due_date || b.due_date || b.next_run_date)))[0];
  const weeklyFixedPayments = personalRecurring.filter((expense) => isWithinDays(expense.next_due_date || expense.due_date || expense.next_run_date, 7)).length;
  const highestFixedCategory = highestCategory(personalRecurring);
  const personalDebts = debts.filter((debt) => debt.owner_type === 'personal' || debt.business_unit_id === 'personal' || (debt.category || '').toLowerCase().includes('personal') || !debt.business_id);
  const personalDebtMinimum = personalDebts.reduce((sum, debt) => sum + Number(debt.minimum || 0), 0);
  const personalSavings = protectedFunds.filter((fund) => fund.scope === 'personal' && fund.status === 'active').reduce((sum, fund) => sum + Number(fund.amount), 0);
  const personalGoals = protectedFunds.filter((fund) => fund.scope === 'personal' || fund.owner_type === 'personal' || fund.business_unit_id === 'personal');
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

  const businessWithdrawals = businesses.map((business) => {
    const available = businessAccounts.filter((account) => account.business_id === business.id).reduce((sum, account) => sum + Number(account.current_balance), 0);
    const committed = protectedFunds.filter((fund) => fund.business_id === business.id && fund.status === 'active').reduce((sum, fund) => sum + Number(fund.amount), 0);
    const safe = Math.max(0, available - committed);
    return { ...business, available, committed, safe };
  });

  const resetGoalModal = () => {
    setGoalForm(initialGoalForm);
    setEditingGoalId(null);
    setGoalError('');
    setShowGoalModal(false);
  };

  const openGoalModal = (fund?: typeof personalGoals[number]) => {
    if (fund) {
      setEditingGoalId(fund.id);
      setGoalForm({
        name: fund.name,
        amount: String(fund.amount || ''),
        targetDate: fund.target_date || '',
        accountId: fund.account_id || '',
      });
    } else {
      setEditingGoalId(null);
      setGoalForm(initialGoalForm);
    }
    setGoalError('');
    setShowGoalModal(true);
  };

  const handleTransfer = async (transferData: { fromAccountId: string; toAccountId: string; amount: number; notes?: string }) => {
    await transferFunds({ ...transferData, notes: transferData.notes || 'Retiro desde negocio a cuenta personal' });
    showToast({ type: 'success', title: 'Retiro registrado', description: 'Los saldos fueron actualizados.' });
  };

  const handleSaveGoal = async () => {
    setSavingGoal(true);
    setGoalError('');
    try {
      const payload = {
        name: goalForm.name,
        scope: 'personal' as const,
        owner_type: 'personal' as const,
        business_unit_id: 'personal',
        fund_type: 'Ahorro personal',
        amount: Number(goalForm.amount),
        priority: 'Media',
        target_date: goalForm.targetDate,
        block_withdrawals: true,
        account_id: goalForm.accountId || null,
      };
      if (editingGoalId) {
        await updateProtectedFund(editingGoalId, payload);
        showToast({ type: 'success', title: 'Meta de ahorro actualizada' });
      } else {
        await createProtectedFund(payload);
        showToast({ type: 'success', title: 'Meta de ahorro creada', description: 'Se guardo como reserva personal.' });
      }
      resetGoalModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear la meta de ahorro.';
      setGoalError(message);
      showToast({ type: 'error', title: 'No se pudo guardar', description: message });
    } finally {
      setSavingGoal(false);
    }
  };

  const handleDeleteGoal = async (fundId: string) => {
    setWorkingGoalId(fundId);
    try {
      await deleteProtectedFund(fundId);
      showToast({ type: 'success', title: 'Meta de ahorro eliminada' });
    } catch (error) {
      showToast({ type: 'error', title: 'No se pudo eliminar', description: error instanceof Error ? error.message : 'Intentalo nuevamente.' });
    } finally {
      setWorkingGoalId(null);
    }
  };

  const openFixedModal = (expense?: typeof personalFixedExpenses[number]) => {
    if (expense) {
      setEditingFixedId(expense.id);
      setFixedForm({
        name: expense.name,
        amount: String(expense.amount || ''),
        ...scheduleFormFromExpense(expense),
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
        ...buildSchedulePayload(fixedForm, Number(fixedForm.amount)),
        name: fixedForm.name,
        scope: 'personal' as const,
        category: fixedForm.category,
        amount: Number(fixedForm.amount),
        frequency: fixedForm.frequency,
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
      console.error('Supabase fixed expense save failed:', error);
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

  const handlePayFixed = async (expenseId: string, dueDate?: string) => {
    setWorkingFixedId(expenseId);
    try {
      await markRecurringExpensePaid(expenseId, dueDate);
      showToast({ type: 'success', title: 'Pago registrado correctamente.', description: 'La proxima fecha fue actualizada.' });
    } catch (error) {
      console.error('Supabase fixed expense payment failed:', error);
      showToast({ type: 'error', title: 'No se pudo marcar pagado', description: error instanceof Error ? error.message : 'Intentalo nuevamente.' });
    } finally {
      setWorkingFixedId(null);
    }
  };

  const handlePostponeFixed = async (days?: number, customDate?: string) => {
    if (!postponeTarget) return;
    const targetDate = customDate || addDaysString(today, days || 1);
    setWorkingFixedId(postponeTarget.expenseId);
    try {
      await postponeRecurringExpensePayment(postponeTarget.expenseId, targetDate, postponeTarget.dueDate);
      showToast({ type: 'success', title: 'Pago pospuesto.' });
      setPostponeTarget(null);
      setCustomPostponeDate('');
    } catch (error) {
      console.error('Supabase fixed expense postpone failed:', error);
      showToast({ type: 'error', title: 'No se pudo posponer', description: error instanceof Error ? error.message : 'Intentalo nuevamente.' });
    } finally {
      setWorkingFixedId(null);
    }
  };

  const handleSkipFixed = async (expenseId: string, dueDate: string) => {
    if (!window.confirm('Seguro que quieres omitir este pago? No se registrara gasto.')) return;
    setWorkingFixedId(expenseId);
    try {
      await skipRecurringExpensePayment(expenseId, dueDate);
      showToast({ type: 'success', title: 'Pago omitido.' });
    } catch (error) {
      console.error('Supabase fixed expense skip failed:', error);
      showToast({ type: 'error', title: 'No se pudo omitir', description: error instanceof Error ? error.message : 'Intentalo nuevamente.' });
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

  const openDebtModal = (debt?: Debt) => {
    if (debt) {
      setEditingDebtId(debt.id);
      setDebtForm({
        name: debt.name,
        type: debt.type || 'Personal',
        category: debt.category || 'Deudas personales',
        originalAmount: String(debt.original_amount || ''),
        pending: String(debt.pending || ''),
        minimum: String(debt.minimum || ''),
        dueDate: debt.due_date || today,
        interest: String(debt.interest || ''),
        priority: debt.priority || 'Media',
        status: debt.status || 'Al dia',
        risk: debt.risk || 'Medio',
        notes: debt.notes || debt.recommendation || '',
      });
    } else {
      setEditingDebtId(null);
      setDebtForm(initialDebtForm);
    }
    setDebtError('');
    setDebtModalOpen(true);
  };

  const closeDebtModal = () => {
    setDebtModalOpen(false);
    setEditingDebtId(null);
    setDebtForm(initialDebtForm);
    setDebtError('');
  };

  const handleSaveDebt = async () => {
    setSavingDebt(true);
    setDebtError('');
    try {
      const payload = {
        name: debtForm.name,
        type: debtForm.type || 'Personal',
        category: debtForm.category || 'Deudas personales',
        owner_type: 'personal' as const,
        business_unit_id: 'personal',
        business_id: null,
        original_amount: Number(debtForm.originalAmount || debtForm.pending || 0),
        pending: Number(debtForm.pending || debtForm.originalAmount || 0),
        paid: Math.max(0, Number(debtForm.originalAmount || 0) - Number(debtForm.pending || debtForm.originalAmount || 0)),
        minimum: Number(debtForm.minimum || 0),
        due_date: debtForm.dueDate,
        interest: Number(debtForm.interest || 0),
        priority: debtForm.priority,
        status: debtForm.status,
        risk: debtForm.risk,
        recommendation: debtForm.notes,
        notes: debtForm.notes,
      };
      if (editingDebtId) {
        await updateDebt(editingDebtId, payload);
        showToast({ type: 'success', title: 'Deuda personal actualizada' });
      } else {
        await createDebt(payload);
        showToast({ type: 'success', title: 'Deuda personal creada' });
      }
      closeDebtModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar la deuda.';
      setDebtError(message);
      showToast({ type: 'error', title: 'No se pudo guardar', description: message });
    } finally {
      setSavingDebt(false);
    }
  };

  const handleDebtPayment = async () => {
    if (!payingDebtId) return;
    setWorkingDebtId(payingDebtId);
    try {
      await registerDebtPayment(payingDebtId, Number(debtPaymentAmount || 0));
      showToast({ type: 'success', title: 'Abono registrado' });
      setPayingDebtId(null);
      setDebtPaymentAmount('');
    } catch (error) {
      showToast({ type: 'error', title: 'No se pudo abonar', description: error instanceof Error ? error.message : 'Intentalo nuevamente.' });
    } finally {
      setWorkingDebtId(null);
    }
  };

  const handleMarkDebtPaid = async (debt: Debt) => {
    setWorkingDebtId(debt.id);
    try {
      await updateDebt(debt.id, {
        ...debt,
        owner_type: 'personal',
        business_unit_id: 'personal',
        business_id: null,
        original_amount: Number(debt.original_amount || 0),
        pending: 0,
        paid: Number(debt.original_amount || 0),
        minimum: Number(debt.minimum || 0),
        interest: Number(debt.interest || 0),
        status: 'Pagada',
      });
      showToast({ type: 'success', title: 'Deuda marcada como pagada' });
    } catch (error) {
      showToast({ type: 'error', title: 'No se pudo actualizar', description: error instanceof Error ? error.message : 'Intentalo nuevamente.' });
    } finally {
      setWorkingDebtId(null);
    }
  };

  const handleDeleteDebt = async (debtId: string) => {
    setWorkingDebtId(debtId);
    try {
      await deleteDebt(debtId);
      showToast({ type: 'success', title: 'Deuda eliminada' });
    } catch (error) {
      showToast({ type: 'error', title: 'No se pudo eliminar', description: error instanceof Error ? error.message : 'Intentalo nuevamente.' });
    } finally {
      setWorkingDebtId(null);
    }
  };

  const openCardModal = (account?: Account) => {
    if (account) {
      setEditingCardId(account.id);
      setCardForm({
        name: account.name,
        bankName: account.bank_name || '',
        balance: String(account.current_balance || ''),
        status: account.status || 'active',
      });
    } else {
      setEditingCardId(null);
      setCardForm(initialCardForm);
    }
    setCardError('');
    setCardModalOpen(true);
  };

  const closeCardModal = () => {
    setCardModalOpen(false);
    setEditingCardId(null);
    setCardForm(initialCardForm);
    setCardError('');
  };

  const handleSaveCard = async () => {
    setSavingCard(true);
    setCardError('');
    try {
      const payload = {
        name: cardForm.name,
        type: 'Tarjeta personal',
        bank_name: cardForm.bankName,
        current_balance: Number(cardForm.balance || 0),
        is_personal: true,
        business_id: undefined,
        status: cardForm.status,
      };
      if (editingCardId) {
        await updateAccount(editingCardId, payload);
        showToast({ type: 'success', title: 'Tarjeta personal actualizada' });
      } else {
        await createAccount(payload);
        showToast({ type: 'success', title: 'Tarjeta personal creada' });
      }
      closeCardModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar la tarjeta.';
      setCardError(message);
      showToast({ type: 'error', title: 'No se pudo guardar', description: message });
    } finally {
      setSavingCard(false);
    }
  };

  const handleDeleteCard = async (accountId: string) => {
    setWorkingCardId(accountId);
    try {
      await deleteAccount(accountId);
      showToast({ type: 'success', title: 'Tarjeta eliminada' });
    } catch (error) {
      showToast({ type: 'error', title: 'No se pudo eliminar', description: error instanceof Error ? error.message : 'Intentalo nuevamente.' });
    } finally {
      setWorkingCardId(null);
    }
  };

  const handleSaveBudget = async () => {
    setSavingBudget(true);
    setBudgetError('');
    try {
      const base = monthlyTarget || defaultMonthlyTarget;
      await upsertMonthlyTarget({
        ...base,
        personal_budget_target: Number((budgetDraft || String(base.personal_budget_target || 0)).replace(',', '.')),
      });
      showToast({ type: 'success', title: 'Presupuesto personal actualizado' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el presupuesto.';
      setBudgetError(message);
      showToast({ type: 'error', title: 'No se pudo guardar', description: message });
    } finally {
      setSavingBudget(false);
    }
  };

  const handleClearBudget = async () => {
    setSavingBudget(true);
    setBudgetError('');
    try {
      const base = monthlyTarget || defaultMonthlyTarget;
      await upsertMonthlyTarget({ ...base, personal_budget_target: 0 });
      setBudgetDraft('');
      showToast({ type: 'success', title: 'Presupuesto personal eliminado' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el presupuesto.';
      setBudgetError(message);
      showToast({ type: 'error', title: 'No se pudo eliminar', description: message });
    } finally {
      setSavingBudget(false);
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
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {personalViewOptions.map(([id, label]) => (
          <Button key={id} variant={view === id ? 'default' : 'outline'} size="sm" onClick={() => setView(id)} className="shrink-0">
            {label}
          </Button>
        ))}
      </div>

      {view === 'movements' && (
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={() => setModalConfig({ isOpen: true, type: 'gasto' })}>
          <Plus className="w-4 h-4 mr-2" /> Registrar gasto personal
        </Button>
        <Button variant="outline" className="text-success border-success/30 hover:bg-success/10 hover:text-success" onClick={() => setModalConfig({ isOpen: true, type: 'ingreso' })}>
          <Plus className="w-4 h-4 mr-2" /> Registrar ingreso personal
        </Button>
      </div>
      )}

      {view === 'summary' && (
      <>
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
      </>
      )}

      {view === 'fixed' && (
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
          <MiniSummary label="Proximo pago" value={upcomingPersonalFixed ? money(Number(upcomingPersonalFixed.amount || 0)) : 'Sin pagos'} detail={upcomingPersonalFixed ? `${upcomingPersonalFixed.name} · ${upcomingPersonalFixed.next_due_date || upcomingPersonalFixed.due_date || upcomingPersonalFixed.next_run_date}` : undefined} />
          <MiniSummary label="Esta semana" value={String(weeklyFixedPayments)} detail="pagos programados" />
          <MiniSummary label="Categoria mas alta" value={highestFixedCategory?.name || 'Sin datos'} detail={highestFixedCategory ? money(highestFixedCategory.total) : undefined} />
          <MiniSummary label="Activos" value={String(personalRecurring.length)} />
          <MiniSummary label="Pausados" value={String(pausedFixedExpenses.length)} />
        </div>

        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle>Centro de Pagos Personales</CardTitle>
            <CardDescription>Pagos vencidos, de hoy y proximos calculados desde tus gastos fijos personales.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <PaymentKpi label="Vencidos" count={paymentStats.overdue.count} amount={paymentStats.overdue.amount} tone="danger" />
              <PaymentKpi label="Vencen hoy" count={paymentStats.today.count} amount={paymentStats.today.amount} tone="warning" />
              <PaymentKpi label="Proximos 7 dias" count={paymentStats.next7.count} amount={paymentStats.next7.amount} tone="info" />
              <PaymentKpi label="Separar esta semana" amount={paymentStats.week.amount} tone="primary" />
              <PaymentKpi label="Separar este mes" amount={paymentStats.month.amount} tone="info" />
              <PaymentKpi label="Pagados este mes" amount={paymentStats.paidThisMonth.amount} tone="success" />
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Alertas de pago</h4>
              {paymentAlerts.length > 0 ? (
                <div className="grid gap-2">
                  {paymentAlerts.map((alert) => <PaymentAlert key={alert} text={alert} />)}
                </div>
              ) : (
                <EmptyState text="No tienes alertas de pago personales por ahora." />
              )}
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Pagos personales proximos</h4>
              {personalPaymentOccurrences.length > 0 ? (
                paymentGroups.map((group) => (
                  <div key={group.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-semibold text-muted-foreground">{group.label}</h5>
                      <span className="text-xs font-medium text-muted-foreground">{money(group.items.reduce((sum, item) => sum + item.amount, 0))}</span>
                    </div>
                    <div className="space-y-2">
                      {group.items.map((item) => (
                        <PaymentRow
                          key={item.id}
                          item={item}
                          working={workingFixedId === item.expense.id}
                          onPay={() => handlePayFixed(item.expense.id, item.dueDate)}
                          onPostpone={() => setPostponeTarget({ expenseId: item.expense.id, dueDate: item.dueDate, name: item.expense.name })}
                          onEdit={() => openFixedModal(item.expense)}
                          onSkip={() => handleSkipFixed(item.expense.id, item.dueDate)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState text="No hay pagos personales pendientes. Crea un gasto fijo personal para activar el centro de pagos." />
              )}
            </div>
          </CardContent>
        </Card>

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
                          {money(Number(expense.amount || 0))} · {expense.frequency} · {expense.category || 'Otros'} · Pago: {expense.next_due_date || expense.due_date || expense.next_run_date}
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
      )}

      {view === 'summary' && (
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
      )}

      {view === 'movements' && (
        <div className="grid gap-8 lg:grid-cols-2">
          <MovementList title="Gastos personales recientes" transactions={recentExpenses} type="gasto" />
          <MovementList title="Ingresos personales recientes" transactions={recentIncome} type="ingreso" />
        </div>
      )}

      {view === 'debts' && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-display font-semibold">Deudas personales</h3>
              <p className="text-sm text-muted-foreground">Crea, edita, abona, marca como pagada o elimina deudas personales.</p>
            </div>
            <Button onClick={() => openDebtModal()}><Plus className="mr-2 h-4 w-4" /> Nueva deuda personal</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <MiniSummary label="Saldo pendiente" value={money(personalDebts.reduce((sum, debt) => sum + Number(debt.pending || 0), 0))} />
            <MiniSummary label="Pago minimo mensual" value={money(personalDebtMinimum)} />
            <MiniSummary label="Deudas abiertas" value={String(personalDebts.filter((debt) => debt.status !== 'Pagada').length)} />
          </div>
          <Card>
            <CardContent className="p-0">
              {personalDebts.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {personalDebts.map((debt) => (
                    <div key={debt.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{debt.name}</p>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{debt.status || 'Al dia'}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Pendiente: {money(Number(debt.pending || 0))} · Minimo: {money(Number(debt.minimum || 0))} · Vence: {debt.due_date || 'Sin fecha'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <Button variant="outline" size="sm" disabled={workingDebtId === debt.id} onClick={() => openDebtModal(debt)}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar</Button>
                        <Button variant="outline" size="sm" disabled={workingDebtId === debt.id} onClick={() => { setDebtPaymentAmount(''); setPayingDebtId(debt.id); }}>Abonar</Button>
                        <Button variant="outline" size="sm" disabled={workingDebtId === debt.id} onClick={() => handleMarkDebtPaid(debt)}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Pagada</Button>
                        <Button variant="outline" size="sm" disabled={workingDebtId === debt.id} onClick={() => handleDeleteDebt(debt.id)} className="text-destructive hover:text-destructive"><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <EmptyState text="No tienes deudas personales registradas todavia." />
                  <Button onClick={() => openDebtModal()} className="mt-4"><Plus className="mr-2 h-4 w-4" /> Crear primera deuda personal</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {view === 'cards' && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-display font-semibold">Tarjetas personales</h3>
              <p className="text-sm text-muted-foreground">Tarjetas asociadas a Finanzas Personales, no a negocios.</p>
            </div>
            <Button onClick={() => openCardModal()}><Plus className="mr-2 h-4 w-4" /> Nueva tarjeta personal</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {personalCards.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {personalCards.map((card) => (
                    <div key={card.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-primary/10 p-2 text-primary"><CreditCard className="h-5 w-5" /></div>
                        <div>
                          <p className="font-semibold">{card.name}</p>
                          <p className="text-sm text-muted-foreground">{card.bank_name || 'Sin banco'} · Saldo: {money(Number(card.current_balance || 0))}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <Button variant="outline" size="sm" disabled={workingCardId === card.id} onClick={() => openCardModal(card)}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar</Button>
                        <Button variant="outline" size="sm" disabled={workingCardId === card.id} onClick={() => handleDeleteCard(card.id)} className="text-destructive hover:text-destructive"><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <EmptyState text="No tienes tarjetas personales registradas todavia." />
                  <Button onClick={() => openCardModal()} className="mt-4"><Plus className="mr-2 h-4 w-4" /> Crear primera tarjeta personal</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {view === 'budget' && (
        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Presupuesto personal</CardTitle>
              <CardDescription>Guarda tu objetivo mensual personal para que Noa calcule limites y metas con datos reales.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <DistributionRow label="Presupuesto guardado" value={Number(monthlyTarget?.personal_budget_target || 0)} />
              <Field label="Monto mensual objetivo">
                <input className="form-field" type="number" min="0" step="0.01" value={budgetDraft || String(monthlyTarget?.personal_budget_target || '')} onChange={(event) => setBudgetDraft(event.target.value)} placeholder="0.00" />
              </Field>
              {budgetError && <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{budgetError}</div>}
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSaveBudget} disabled={savingBudget}>{savingBudget ? 'Guardando...' : 'Guardar presupuesto personal'}</Button>
                <Button variant="outline" className="text-destructive hover:text-destructive" onClick={handleClearBudget} disabled={savingBudget}>Eliminar presupuesto</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Lectura del presupuesto</CardTitle>
              <CardDescription>Calculado desde movimientos, gastos fijos, deudas y ahorro personal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <DistributionRow label="Gastos del mes" value={monthlyExpenses} tone="destructive" />
              <DistributionRow label="Gastos fijos personales" value={personalRecurringTotal} />
              <DistributionRow label="Deudas personales" value={personalDebtMinimum} tone="warning" />
              <DistributionRow label="Limite seguro semanal" value={safeWeeklyLimit} tone="success" />
            </CardContent>
          </Card>
        </section>
      )}

      {view === 'savings' && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-display font-semibold">Ahorro y metas</h3>
              <p className="text-sm text-muted-foreground">Metas personales guardadas como dinero protegido.</p>
            </div>
            <Button onClick={() => openGoalModal()}><PiggyBank className="mr-2 h-4 w-4" /> Crear meta de ahorro</Button>
          </div>
          <Card>
            <CardContent className="p-5 space-y-5">
              <DistributionRow label="Ahorro protegido actual" value={personalSavings} tone="primary" />
              <DistributionRow label="Ahorro sugerido" value={recommendedSaving} tone="primary" />
              {personalGoals.length > 0 ? (
                <div className="divide-y divide-border/50 rounded-xl border border-border">
                  {personalGoals.map((goal) => (
                    <div key={goal.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                      <div>
                        <p className="font-semibold">{goal.name}</p>
                        <p className="text-sm text-muted-foreground">{money(Number(goal.amount || 0))} · Fecha meta: {goal.target_date || 'Sin fecha'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <Button variant="outline" size="sm" disabled={workingGoalId === goal.id} onClick={() => openGoalModal(goal)}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar</Button>
                        <Button variant="outline" size="sm" disabled={workingGoalId === goal.id} onClick={() => handleDeleteGoal(goal.id)} className="text-destructive hover:text-destructive"><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text="No hay metas de ahorro registradas todavia." />
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {view === 'withdrawals' && (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-display font-semibold">Retiros seguros desde negocios</h3>
              <p className="text-sm text-muted-foreground">Mueve dinero desde una cuenta de negocio hacia una cuenta personal.</p>
            </div>
            <Button onClick={() => setIsWithdrawalModalOpen(true)}><Building className="mr-2 h-4 w-4" /> Registrar retiro desde negocio</Button>
          </div>
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
        </section>
      )}

      <TransactionModal isOpen={modalConfig.isOpen} type={modalConfig.type} defaultScope="personal" onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} />

      <TransferModal
        isOpen={isWithdrawalModalOpen}
        onClose={() => setIsWithdrawalModalOpen(false)}
        accounts={accounts}
        onTransfer={handleTransfer}
      />

      {postponeTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <Card className="w-full max-w-md border-border shadow-2xl">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle>Posponer pago</CardTitle>
              <CardDescription>{postponeTarget.name} vence el {postponeTarget.dueDate}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" onClick={() => handlePostponeFixed(1)}>1 dia</Button>
                <Button variant="outline" onClick={() => handlePostponeFixed(3)}>3 dias</Button>
                <Button variant="outline" onClick={() => handlePostponeFixed(7)}>7 dias</Button>
              </div>
              <Field label="Fecha personalizada">
                <input className="form-field" type="date" value={customPostponeDate} onChange={(event) => setCustomPostponeDate(event.target.value)} />
              </Field>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => { setPostponeTarget(null); setCustomPostponeDate(''); }}>Cancelar</Button>
              <Button onClick={() => customPostponeDate && handlePostponeFixed(undefined, customPostponeDate)} disabled={!customPostponeDate}>Guardar</Button>
            </CardFooter>
          </Card>
        </div>
      )}

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
              <RecurringScheduleFields
                form={fixedForm}
                amount={fixedForm.amount}
                name={fixedForm.name}
                money={money}
                onChange={(patch) => setFixedForm({ ...fixedForm, ...patch })}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Categoria">
                  <select className="form-field" value={fixedForm.category} onChange={(event) => setFixedForm({ ...fixedForm, category: event.target.value })}>
                    {fixedCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </Field>
                <Field label="Metodo de pago">
                  <select className="form-field" value={fixedForm.paymentMethod} onChange={(event) => setFixedForm({ ...fixedForm, paymentMethod: event.target.value })}>
                    <option value="">Sin metodo</option>
                    {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

      {debtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <Card className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto border-border shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div>
                <CardTitle>{editingDebtId ? 'Editar deuda personal' : 'Nueva deuda personal'}</CardTitle>
                <CardDescription>Se guardara como owner_type personal.</CardDescription>
              </div>
              <button onClick={closeDebtModal} className="rounded-xl p-1 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <Field label="Nombre"><input className="form-field" value={debtForm.name} onChange={(event) => setDebtForm({ ...debtForm, name: event.target.value })} placeholder="Ej: tarjeta, prestamo, familiar" /></Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Monto original"><input className="form-field" type="number" min="0" step="0.01" value={debtForm.originalAmount} onChange={(event) => setDebtForm({ ...debtForm, originalAmount: event.target.value })} /></Field>
                <Field label="Saldo actual"><input className="form-field" type="number" min="0" step="0.01" value={debtForm.pending} onChange={(event) => setDebtForm({ ...debtForm, pending: event.target.value })} /></Field>
                <Field label="Pago minimo"><input className="form-field" type="number" min="0" step="0.01" value={debtForm.minimum} onChange={(event) => setDebtForm({ ...debtForm, minimum: event.target.value })} /></Field>
                <Field label="Fecha de pago"><input className="form-field" type="date" value={debtForm.dueDate} onChange={(event) => setDebtForm({ ...debtForm, dueDate: event.target.value })} /></Field>
                <Field label="Prioridad">
                  <select className="form-field" value={debtForm.priority} onChange={(event) => setDebtForm({ ...debtForm, priority: event.target.value })}>
                    <option>Alta</option>
                    <option>Media</option>
                    <option>Baja</option>
                  </select>
                </Field>
                <Field label="Estado">
                  <select className="form-field" value={debtForm.status} onChange={(event) => setDebtForm({ ...debtForm, status: event.target.value })}>
                    <option>Al dia</option>
                    <option>Atrasada</option>
                    <option>Pagada</option>
                  </select>
                </Field>
              </div>
              <Field label="Nota"><input className="form-field" value={debtForm.notes} onChange={(event) => setDebtForm({ ...debtForm, notes: event.target.value })} placeholder="Opcional" /></Field>
              {debtError && <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{debtError}</div>}
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={closeDebtModal}>Cancelar</Button>
              <Button onClick={handleSaveDebt} disabled={savingDebt}>{savingDebt ? 'Guardando...' : 'Guardar deuda'}</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {payingDebtId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <Card className="w-full max-w-md border-border shadow-2xl">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle>Registrar abono</CardTitle>
              <CardDescription>Actualiza el saldo pendiente de la deuda personal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <Field label="Monto del abono"><input className="form-field" type="number" min="0" step="0.01" value={debtPaymentAmount} onChange={(event) => setDebtPaymentAmount(event.target.value)} /></Field>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => { setPayingDebtId(null); setDebtPaymentAmount(''); }}>Cancelar</Button>
              <Button onClick={handleDebtPayment} disabled={workingDebtId === payingDebtId}>{workingDebtId === payingDebtId ? 'Guardando...' : 'Guardar abono'}</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {cardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <Card className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto border-border shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div>
                <CardTitle>{editingCardId ? 'Editar tarjeta personal' : 'Nueva tarjeta personal'}</CardTitle>
                <CardDescription>Se guarda como cuenta personal tipo tarjeta.</CardDescription>
              </div>
              <button onClick={closeCardModal} className="rounded-xl p-1 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <Field label="Nombre"><input className="form-field" value={cardForm.name} onChange={(event) => setCardForm({ ...cardForm, name: event.target.value })} placeholder="Ej: Visa personal" /></Field>
              <Field label="Banco / entidad"><input className="form-field" value={cardForm.bankName} onChange={(event) => setCardForm({ ...cardForm, bankName: event.target.value })} placeholder="Opcional" /></Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Saldo actual"><input className="form-field" type="number" step="0.01" value={cardForm.balance} onChange={(event) => setCardForm({ ...cardForm, balance: event.target.value })} /></Field>
                <Field label="Estado">
                  <select className="form-field" value={cardForm.status} onChange={(event) => setCardForm({ ...cardForm, status: event.target.value })}>
                    <option value="active">Activa</option>
                    <option value="paused">Pausada</option>
                  </select>
                </Field>
              </div>
              {cardError && <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{cardError}</div>}
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={closeCardModal}>Cancelar</Button>
              <Button onClick={handleSaveCard} disabled={savingCard}>{savingCard ? 'Guardando...' : 'Guardar tarjeta'}</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <Card className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto border-border shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div>
                <CardTitle>{editingGoalId ? 'Editar meta de ahorro' : 'Crear meta de ahorro'}</CardTitle>
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
              <Button onClick={handleSaveGoal} disabled={savingGoal}>{savingGoal ? 'Guardando...' : 'Guardar meta'}</Button>
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

function isWithinDays(dateValue: string | undefined, days: number) {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  const now = new Date();
  const end = new Date();
  end.setDate(now.getDate() + days);
  return date >= parseLocalDate(formatDateKey(now)) && date <= end;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function diffDays(dateValue: string, baseValue: string) {
  const diff = parseLocalDate(dateValue).getTime() - parseLocalDate(baseValue).getTime();
  return Math.round(diff / 86400000);
}

function relativeDueText(daysDiff: number) {
  if (daysDiff < 0) return `Vencido hace ${Math.abs(daysDiff)} dias`;
  if (daysDiff === 0) return 'Vence hoy';
  if (daysDiff === 1) return 'Vence manana';
  return `Vence en ${daysDiff} dias`;
}

function groupForDiff(daysDiff: number): PaymentOccurrence['group'] {
  if (daysDiff < 0) return 'overdue';
  if (daysDiff === 0) return 'today';
  if (daysDiff === 1) return 'tomorrow';
  if (daysDiff <= 7) return 'week';
  if (daysDiff <= 15) return 'next15';
  return 'later';
}

function addDaysString(dateValue: string, days: number) {
  const date = parseLocalDate(dateValue);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

type PaymentOccurrence = {
  id: string;
  expense: RecurringExpense;
  dueDate: string;
  amount: number;
  status: 'pendiente' | 'pagado' | 'vencido' | 'pausado' | 'omitido';
  relative: string;
  group: 'overdue' | 'today' | 'tomorrow' | 'week' | 'next15' | 'later';
  daysDiff: number;
};

function buildPersonalPaymentOccurrences(expenses: RecurringExpense[], payments: RecurringExpensePayment[]) {
  const items: PaymentOccurrence[] = [];
  const todayDate = parseLocalDate(today);

  expenses.forEach((expense) => {
    const isPaused = expense.status === 'paused' || expense.is_active === false;
    const baseDue = resolvePersonalPaymentDueDate(expense, todayDate);
    if (!baseDue) return;

    const generated = isPaused ? [baseDue] : [
      baseDue,
      ...generateDueDates({
        amount: Number(expense.amount || 0),
        frequency: expense.frequency,
        startDate: expense.start_date || baseDue,
        recurrenceType: expense.recurrence_type,
        weekdays: expense.weekdays,
        monthDays: expense.month_days,
        annualMonth: expense.annual_month,
        annualDay: expense.annual_day,
        intervalNumber: expense.interval_number,
        intervalType: expense.interval_type,
      }, todayDate, 30),
    ];

    Array.from(new Set(generated)).forEach((dueDate) => {
      const payment = payments.find((item) => item.recurring_expense_id === expense.id && item.due_date === dueDate && ['paid', 'skipped', 'postponed'].includes(item.status));
      const daysDiff = diffDays(dueDate, today);
      const status = isPaused ? 'pausado' : payment?.status === 'paid' ? 'pagado' : payment?.status === 'skipped' ? 'omitido' : daysDiff < 0 ? 'vencido' : 'pendiente';
      if (status === 'pagado' || status === 'omitido' || payment?.status === 'postponed') return;
      items.push({
        id: `${expense.id}-${dueDate}`,
        expense,
        dueDate,
        amount: Number(expense.amount || 0),
        status,
        relative: relativeDueText(daysDiff),
        group: groupForDiff(daysDiff),
        daysDiff,
      });
    });
  });

  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

function resolvePersonalPaymentDueDate(expense: RecurringExpense, fromDate: Date) {
  if (expense.snoozed_until) return expense.snoozed_until;
  const storedDate = expense.next_due_date || expense.due_date || expense.next_run_date;
  if (!hasPersonalSchedule(expense)) return storedDate || null;
  return calculateNextDueDate({
    amount: Number(expense.amount || 0),
    frequency: expense.frequency,
    startDate: expense.start_date || storedDate || undefined,
    recurrenceType: expense.recurrence_type,
    weekdays: expense.weekdays,
    monthDays: expense.month_days,
    annualMonth: expense.annual_month,
    annualDay: expense.annual_day,
    intervalNumber: expense.interval_number,
    intervalType: expense.interval_type,
  }, fromDate);
}

function hasPersonalSchedule(expense: RecurringExpense) {
  const frequency = String(expense.frequency || '').toLowerCase();
  const storedDate = expense.start_date || expense.next_due_date || expense.due_date || expense.next_run_date;
  if (['weekly', 'semanal'].includes(frequency)) return Boolean(expense.weekdays?.length || storedDate);
  if (['biweekly', 'quincenal'].includes(frequency)) return Boolean(expense.month_days?.length || storedDate);
  if (['monthly', 'mensual'].includes(frequency)) return Boolean(expense.month_days?.length || storedDate);
  if (['annual', 'anual'].includes(frequency)) return Boolean((expense.annual_month && expense.annual_day) || storedDate);
  if (['custom', 'personalizado'].includes(frequency)) return Boolean(expense.interval_number && expense.interval_type && storedDate);
  return Boolean(storedDate);
}

function buildPaymentStats(items: PaymentOccurrence[], payments: RecurringExpensePayment[]) {
  const currentMonth = today.slice(0, 7);
  const paidThisMonth = payments.filter((payment) => payment.status === 'paid' && (payment.paid_date || '').startsWith(currentMonth));
  return {
    overdue: summarizePayments(items.filter((item) => item.status === 'vencido')),
    today: summarizePayments(items.filter((item) => item.daysDiff === 0 && item.status !== 'pausado')),
    next7: summarizePayments(items.filter((item) => item.daysDiff >= 0 && item.daysDiff <= 7 && item.status !== 'pausado')),
    week: summarizePayments(items.filter((item) => item.daysDiff >= 0 && item.daysDiff <= 7 && item.status !== 'pausado')),
    month: summarizePayments(items.filter((item) => item.dueDate.startsWith(currentMonth) && item.status !== 'pausado')),
    paidThisMonth: { count: paidThisMonth.length, amount: paidThisMonth.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) },
  };
}

function summarizePayments(items: PaymentOccurrence[]) {
  return { count: items.length, amount: items.reduce((sum, item) => sum + item.amount, 0) };
}

function groupPaymentOccurrences(items: PaymentOccurrence[]) {
  const groups = [
    ['overdue', 'Vencidos'],
    ['today', 'Hoy'],
    ['tomorrow', 'Manana'],
    ['week', 'Esta semana'],
    ['next15', 'Proximos 15 dias'],
    ['later', 'Mas adelante'],
  ] as const;
  return groups
    .map(([id, label]) => ({ id, label, items: items.filter((item) => item.group === id) }))
    .filter((group) => group.items.length > 0);
}

function buildPaymentAlerts(stats: ReturnType<typeof buildPaymentStats>, items: PaymentOccurrence[]) {
  const alerts: string[] = [];
  const todayItems = items.filter((item) => item.daysDiff === 0);
  todayItems.slice(0, 2).forEach((item) => alerts.push(`Hoy debes pagar ${item.expense.name} por ${money(item.amount)}.`));
  const soon = items.find((item) => item.daysDiff > 0 && item.daysDiff <= 7);
  if (soon) alerts.push(`${soon.expense.name} vence en ${soon.daysDiff} dias.`);
  if (stats.week.count > 0) alerts.push(`Tienes ${stats.week.count} pagos esta semana por ${money(stats.week.amount)}.`);
  if (stats.overdue.count > 0) alerts.push(`Tienes ${stats.overdue.count} pagos vencidos por ${money(stats.overdue.amount)}.`);
  if (stats.week.amount > 0) alerts.push(`Separa ${money(stats.week.amount)} esta semana para cubrir tus pagos personales.`);
  return alerts;
}

function PaymentKpi({ label, count, amount, tone }: { label: string; count?: number; amount: number; tone: 'danger' | 'warning' | 'info' | 'primary' | 'success' }) {
  const classes = {
    danger: 'border-destructive/25 bg-destructive/5 text-destructive',
    warning: 'border-orange-300 bg-orange-50 text-orange-700',
    info: 'border-blue-300 bg-blue-50 text-blue-700',
    primary: 'border-primary/25 bg-primary/5 text-primary',
    success: 'border-success/25 bg-success/5 text-success',
  }[tone];
  return (
    <div className={`rounded-xl border p-3 ${classes}`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="mt-1 text-lg font-bold">{money(amount)}</p>
      {typeof count === 'number' && <p className="text-xs opacity-80">{count} pagos</p>}
    </div>
  );
}

function PaymentAlert({ text }: { text: string }) {
  return <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">{text}</div>;
}

function PaymentRow({ item, working, onPay, onPostpone, onEdit, onSkip }: { item: PaymentOccurrence; working: boolean; onPay: () => void; onPostpone: () => void; onEdit: () => void; onSkip: () => void }) {
  const tone = item.status === 'vencido' ? 'border-destructive/30 bg-destructive/5' : item.daysDiff === 0 ? 'border-orange-300 bg-orange-50/70' : item.status === 'pausado' ? 'border-border bg-muted/20' : 'border-border bg-card';
  return (
    <div className={`grid gap-3 rounded-xl border p-4 lg:grid-cols-[1fr_auto] lg:items-center ${tone}`}>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{item.expense.name}</p>
          <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">{item.status}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {money(item.amount)} · {item.expense.category || 'Otros'} · {item.expense.payment_method || 'Sin metodo'} · {item.dueDate}
        </p>
        <p className="text-xs font-medium text-muted-foreground">{item.relative}</p>
      </div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        <Button variant="outline" size="sm" disabled={working || item.status === 'pausado'} onClick={onPay}>Pagar</Button>
        <Button variant="outline" size="sm" disabled={working || item.status === 'pausado'} onClick={onPostpone}>Posponer</Button>
        <Button variant="outline" size="sm" disabled={working} onClick={onEdit}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar</Button>
        <Button variant="outline" size="sm" disabled={working || item.status === 'pausado'} onClick={onSkip}>Omitir este ciclo</Button>
      </div>
    </div>
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
