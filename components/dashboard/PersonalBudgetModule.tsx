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
  AlertCircle,
  CheckCircle2,
  ChevronDown,
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
import { Account, CreditCard as StoredCreditCard, Debt, RecurringExpense, RecurringExpensePayment, SavingsGoal, useStore, Transaction } from '@/store/useStore';
import { defaultMonthlyTarget, monthlyCost } from '@/lib/financePlanning';
import { buildDebtRecommendation, calculateDebtPayoffPlan, compareDebtPaymentScenarios, getCreditUtilization, getDebtInterestRate, getDebtMinimumPayment, getDebtRisk, getUtilizationStatus } from '@/lib/debtPlanning';
import { calculateCreditCardMetrics, getCardPriority, getCardStatusClasses } from '@/lib/creditCards';
import { calculateNextDueDate, generateDueDates } from '@/lib/recurrence';
import { showToast } from '@/lib/toast';

const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = formatDateKey(new Date());

const initialGoalForm = {
  name: '',
  goalType: 'Fondo de emergencia',
  targetAmount: '',
  currentAmount: '',
  weeklyContribution: '',
  monthlyContribution: '',
  targetDate: '',
  priority: 'Media',
  accountId: '',
  isProtected: true,
  status: 'Activa',
  notes: '',
};

const initialGoalContributionForm = {
  amount: '',
  contributionDate: today,
  accountId: '',
  paymentMethod: '',
  notes: '',
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
  type: 'Tarjeta de credito',
  category: 'Deudas personales',
  originalAmount: '',
  pending: '',
  interestRate: '',
  interestRateType: 'Anual',
  minimum: '',
  recommendedPayment: '',
  extraPayment: '',
  paymentFrequency: 'Mensual',
  dueDate: today,
  cutDate: '',
  creditLimit: '',
  strategy: 'Metodo avalancha',
  priority: 'Media',
  status: 'Al dia',
  risk: 'Medio',
  notes: '',
};

const initialCardForm = {
  name: '',
  bankName: '',
  cardType: 'Credito',
  creditLimit: '',
  balance: '',
  cutDate: '',
  paymentDueDate: '',
  minimumPayment: '',
  recommendedPayment: '',
  idealPayment: '',
  annualInterestRate: '',
  accountId: '',
  createLinkedDebt: true,
  status: 'active',
  notes: '',
};

const initialCardPaymentForm = {
  amount: '',
  paymentDate: today,
  paymentMethod: '',
  accountId: '',
  notes: '',
};

const initialBudgetForm = {
  freeSpendingLimit: '',
  savingsGoal: '',
  extraDebtPayment: '',
  emergencyFund: '',
  budgetMode: 'balanceado',
};

export function PersonalBudgetModule() {
  const {
    accounts,
    transactions,
    protectedFunds,
    savingsGoals,
    savingsGoalContributions,
    recurringExpenses,
    recurringExpensePayments,
    debts,
    creditCards,
    creditCardPayments,
    businesses,
    monthlyTarget,
    transferFunds,
    createProtectedFund,
    createSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    contributeToSavingsGoal,
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
    createCreditCard,
    updateCreditCard,
    deleteCreditCard,
    registerCreditCardPayment,
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
  const [contributingGoalId, setContributingGoalId] = useState<string | null>(null);
  const [goalContributionForm, setGoalContributionForm] = useState(initialGoalContributionForm);
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
  const [debtStrategy, setDebtStrategy] = useState<'Avalancha' | 'Bola de nieve' | 'Personalizado'>('Avalancha');
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [cardForm, setCardForm] = useState(initialCardForm);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardError, setCardError] = useState('');
  const [savingCard, setSavingCard] = useState(false);
  const [workingCardId, setWorkingCardId] = useState<string | null>(null);
  const [payingCardId, setPayingCardId] = useState<string | null>(null);
  const [cardPaymentForm, setCardPaymentForm] = useState(initialCardPaymentForm);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [budgetForm, setBudgetForm] = useState(initialBudgetForm);
  const [budgetError, setBudgetError] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);
  const [postponeTarget, setPostponeTarget] = useState<{ expenseId: string; dueDate: string; name: string } | null>(null);
  const [customPostponeDate, setCustomPostponeDate] = useState('');

  const personalAccounts = accounts.filter((account) => account.is_personal);
  const legacyCardAccounts = personalAccounts.filter((account) => account.type.toLowerCase().includes('tarjeta'));
  const personalCards = [
    ...creditCards.filter((card) => card.owner_type === 'personal' || card.business_unit_id === 'personal' || !card.owner_type),
    ...legacyCardAccounts
      .filter((account) => !creditCards.some((card) => card.account_id === account.id || card.legacy_account_id === account.id))
      .map((account) => ({
        id: account.id,
        legacy_account_id: account.id,
        name: account.name,
        bank: account.bank_name || '',
        card_type: account.type.toLowerCase().includes('credito') ? 'Credito' : 'Debito',
        credit_limit: account.type.toLowerCase().includes('credito') ? Math.abs(Number(account.current_balance || 0)) : 0,
        current_balance: Math.abs(Number(account.current_balance || 0)),
        available_credit: 0,
        credit_utilization: account.type.toLowerCase().includes('credito') ? 100 : 0,
        minimum_payment: 0,
        recommended_payment: 0,
        ideal_payment: 0,
        annual_interest_rate: 0,
        estimated_monthly_interest: 0,
        status: account.status || 'active',
        account_id: account.id,
      } as StoredCreditCard)),
  ];
  const creditPersonalCards = personalCards.filter((card) => card.card_type === 'Credito');
  const cardKpis = buildCardKpis(creditPersonalCards);
  const cardPaymentGroups = groupCardPayments(creditPersonalCards);
  const businessAccounts = accounts.filter((account) => !account.is_personal);
  const personalTransactions = transactions.filter((transaction) => transaction.scope === 'personal');
  const monthlyExpenses = personalTransactions.filter((transaction) => transaction.type === 'gasto' && isCurrentMonth(transaction.date)).reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const monthlyVariableExpenses = personalTransactions
    .filter((transaction) => transaction.type === 'gasto' && isCurrentMonth(transaction.date) && isPersonalVariableExpense(transaction))
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  const weeklyVariableExpenses = personalTransactions
    .filter((transaction) => transaction.type === 'gasto' && isCurrentWeek(transaction.date) && isPersonalVariableExpense(transaction))
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
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
  const personalDebtMinimum = personalDebts.reduce((sum, debt) => sum + getDebtMinimumPayment(debt), 0);
  const openPersonalDebts = personalDebts.filter((debt) => debt.status !== 'Pagada' && Number(debt.current_balance ?? debt.pending ?? 0) > 0);
  const personalDebtBalance = openPersonalDebts.reduce((sum, debt) => sum + Number(debt.current_balance ?? debt.pending ?? 0), 0);
  const personalDebtRecommended = openPersonalDebts.reduce((sum, debt) => sum + Number(debt.recommended_payment || debt.minimum_payment || debt.minimum || 0), 0);
  const averageDebtInterest = openPersonalDebts.length > 0 ? openPersonalDebts.reduce((sum, debt) => sum + getDebtInterestRate(debt), 0) / openPersonalDebts.length : 0;
  const highestInterestDebt = [...openPersonalDebts].sort((a, b) => getDebtInterestRate(b) - getDebtInterestRate(a))[0];
  const smallestDebt = [...openPersonalDebts].sort((a, b) => Number(a.current_balance ?? a.pending ?? 0) - Number(b.current_balance ?? b.pending ?? 0))[0];
  const urgentDebt = [...openPersonalDebts].sort((a, b) => String(a.due_date || '9999-12-31').localeCompare(String(b.due_date || '9999-12-31')))[0];
  const debtPlanTarget = debtStrategy === 'Bola de nieve' ? smallestDebt : highestInterestDebt;
  const debtStrategyMessage = openPersonalDebts.length === 0
    ? 'Sin deudas abiertas para ordenar.'
    : debtStrategy === 'Bola de nieve'
      ? `Paga el minimo en todas tus deudas y dirige el extra a ${debtPlanTarget?.name || 'la deuda mas pequena'} porque es la mas pequena.`
      : `Paga el minimo en todas tus deudas y dirige el extra a ${debtPlanTarget?.name || 'la deuda con mayor interes'} porque tiene la tasa mas alta.`;
  const generalDebtPayoff = openPersonalDebts
    .map((debt) => calculateDebtPayoffPlan(debt, Number(debt.recommended_payment || debt.minimum_payment || debt.minimum || 0)))
    .filter((plan) => plan.monthsToPayoff)
    .sort((a, b) => Number(b.monthsToPayoff || 0) - Number(a.monthsToPayoff || 0))[0];
  const savedFreeSpendingLimit = Number(monthlyTarget?.free_spending_limit ?? monthlyTarget?.personal_budget_target ?? 0);
  const savedSavingsGoal = Number(monthlyTarget?.savings_goal ?? 0);
  const savedExtraDebtPayment = Number(monthlyTarget?.extra_debt_payment ?? monthlyTarget?.debt_payment_target ?? 0);
  const savedEmergencyFund = Number(monthlyTarget?.emergency_fund ?? monthlyTarget?.reserve_target ?? 0);
  const savedBudgetMode = monthlyTarget?.budget_mode || 'balanceado';
  const legacySavingsGoals = protectedFunds
    .filter((fund) => fund.scope === 'personal' || fund.owner_type === 'personal' || fund.business_unit_id === 'personal')
    .filter((fund) => !savingsGoals.some((goal) => goal.legacy_fund_id === fund.id))
    .map((fund) => ({
      id: fund.id,
      legacy_fund_id: fund.id,
      name: fund.name,
      goal_type: fund.fund_type || 'Reserva personal',
      target_amount: Number(fund.amount || 0),
      current_amount: Number(fund.amount || 0),
      weekly_contribution_target: 0,
      monthly_contribution_target: 0,
      target_date: fund.target_date || null,
      priority: fund.priority || 'Media',
      account_id: fund.account_id || null,
      is_protected: Boolean(fund.block_withdrawals),
      status: fund.status === 'active' ? 'Activa' : fund.status || 'Activa',
      notes: fund.notes || null,
    } as SavingsGoal));
  const personalGoals = [
    ...savingsGoals.filter((goal) => goal.owner_type === 'personal' || goal.business_unit_id === 'personal' || !goal.owner_type),
    ...legacySavingsGoals,
  ];
  const activeSavingsGoals = personalGoals.filter((goal) => goal.status !== 'Pausada' && goal.status !== 'Completada');
  const personalSavings = personalGoals.filter((goal) => goal.is_protected && goal.status !== 'Pausada').reduce((sum, goal) => sum + Number(goal.current_amount || 0), 0);
  const personalIncomeMonth = personalTransactions.filter((transaction) => transaction.type === 'ingreso' && isCurrentMonth(transaction.date)).reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const recommendedSaving = savedFreeSpendingLimit > 0
    ? personalIncomeMonth > 0
      ? Math.max(0, personalIncomeMonth - personalRecurringTotal - personalDebtMinimum - savedFreeSpendingLimit)
      : savedFreeSpendingLimit * 0.1
    : 0;
  const safeWeeklyLimit = Math.max(0, (personalMoney - personalRecurringTotal - personalDebtMinimum - personalSavings) / 4);
  const businessSafeWithdrawal = businesses.reduce((sum, business) => {
    const available = businessAccounts.filter((account) => account.business_id === business.id).reduce((total, account) => total + Number(account.current_balance), 0);
    const committed = protectedFunds.filter((fund) => fund.business_id === business.id && fund.status === 'active').reduce((total, fund) => total + Number(fund.amount), 0);
    return sum + Math.max(0, available - committed);
  }, 0);
  const hasPersonalData = personalAccounts.length > 0 || personalTransactions.length > 0 || personalRecurring.length > 0 || personalDebts.length > 0 || personalSavings > 0;
  const recentExpenses = personalTransactions.filter((transaction) => transaction.type === 'gasto').slice(0, 6);
  const recentIncome = personalTransactions.filter((transaction) => transaction.type === 'ingreso').slice(0, 6);
  const personalFixedLoad = personalRecurringTotal + personalDebtMinimum + personalSavings;
  const estimatedFreeUse = Math.max(0, personalMoney - personalFixedLoad);
  const budgetConfigured = savedFreeSpendingLimit > 0;
  const budgetWeeklyLimit = savedFreeSpendingLimit / 4.333;
  const budgetDailyLimit = savedFreeSpendingLimit / 30;
  const budgetAvailableMonth = savedFreeSpendingLimit - monthlyVariableExpenses;
  const budgetUsedPercent = savedFreeSpendingLimit > 0 ? (monthlyVariableExpenses / savedFreeSpendingLimit) * 100 : 0;
  const budgetWeeklyAvailable = budgetWeeklyLimit - weeklyVariableExpenses;
  const personalCardsMinimum = creditPersonalCards.reduce((sum, card) => sum + Number(card.minimum_payment || 0), 0);
  const budgetNoaDecision = buildBudgetDecision({
    configured: budgetConfigured,
    availableMonth: budgetAvailableMonth,
    weeklyAvailable: budgetWeeklyAvailable,
    usedPercent: budgetUsedPercent,
  });
  const savingsTotalTarget = personalGoals.reduce((sum, goal) => sum + Number(goal.target_amount || 0), 0);
  const savingsCurrentTotal = personalGoals.reduce((sum, goal) => sum + Number(goal.current_amount || 0), 0);
  const savingsMissingTotal = Math.max(0, savingsTotalTarget - savingsCurrentTotal);
  const savingsProgress = savingsTotalTarget > 0 ? Math.min(100, (savingsCurrentTotal / savingsTotalTarget) * 100) : 0;
  const urgentSavingsGoal = [...activeSavingsGoals].sort((a, b) => {
    if (a.priority === 'Alta' && b.priority !== 'Alta') return -1;
    if (b.priority === 'Alta' && a.priority !== 'Alta') return 1;
    return String(a.target_date || '9999-12-31').localeCompare(String(b.target_date || '9999-12-31'));
  })[0];
  const monthlySavingsTarget = savedSavingsGoal || activeSavingsGoals.reduce((sum, goal) => sum + Number(goal.monthly_contribution_target || 0), 0);

  const businessWithdrawals = businesses.map((business) => {
    const available = businessAccounts.filter((account) => account.business_id === business.id).reduce((sum, account) => sum + Number(account.current_balance), 0);
    const committed = protectedFunds.filter((fund) => fund.business_id === business.id && fund.status === 'active').reduce((sum, fund) => sum + Number(fund.amount), 0);
    const safe = Math.max(0, available - committed);
    return { ...business, available, committed, safe };
  });
  const debtFormPlanInput = {
    name: debtForm.name,
    pending: Number(debtForm.pending || 0),
    current_balance: Number(debtForm.pending || 0),
    minimum: Number(debtForm.minimum || 0),
    minimum_payment: Number(debtForm.minimum || 0),
    recommended_payment: Number(debtForm.recommendedPayment || debtForm.minimum || 0),
    interest: Number(debtForm.interestRate || 0),
    interest_rate: Number(debtForm.interestRate || 0),
    interest_rate_type: debtForm.interestRateType,
    credit_limit: Number(debtForm.creditLimit || 0),
    status: debtForm.status,
    priority: debtForm.priority,
  };
  const debtFormPlan = calculateDebtPayoffPlan(debtFormPlanInput, Number(debtForm.recommendedPayment || debtForm.minimum || 0));
  const debtFormScenarios = compareDebtPaymentScenarios(debtFormPlanInput, Number(debtForm.recommendedPayment || debtForm.minimum || 0));
  const cardFormMetrics = calculateCreditCardMetrics({
    credit_limit: Number(cardForm.creditLimit || 0),
    current_balance: Number(cardForm.balance || 0),
    annual_interest_rate: Number(cardForm.annualInterestRate || 0),
  });
  const isCreditCardForm = cardForm.cardType === 'Credito';

  const resetGoalModal = () => {
    setGoalForm(initialGoalForm);
    setEditingGoalId(null);
    setGoalError('');
    setShowGoalModal(false);
  };

  const openGoalModal = (goal?: SavingsGoal) => {
    if (goal) {
      setEditingGoalId(goal.id);
      setGoalForm({
        name: goal.name,
        goalType: goal.goal_type || 'Fondo de emergencia',
        targetAmount: String(goal.target_amount || ''),
        currentAmount: String(goal.current_amount || ''),
        weeklyContribution: String(goal.weekly_contribution_target || ''),
        monthlyContribution: String(goal.monthly_contribution_target || ''),
        targetDate: goal.target_date || '',
        priority: goal.priority || 'Media',
        accountId: goal.account_id || '',
        isProtected: goal.is_protected !== false,
        status: goal.status || 'Activa',
        notes: goal.notes || '',
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
        owner_type: 'personal' as const,
        business_unit_id: 'personal',
        goal_type: goalForm.goalType,
        target_amount: Number(goalForm.targetAmount || 0),
        current_amount: Number(goalForm.currentAmount || 0),
        weekly_contribution_target: Number(goalForm.weeklyContribution || 0),
        monthly_contribution_target: Number(goalForm.monthlyContribution || 0),
        target_date: goalForm.targetDate,
        priority: goalForm.priority,
        account_id: goalForm.accountId || null,
        is_protected: goalForm.isProtected,
        status: goalForm.status,
        notes: goalForm.notes,
      };
      if (editingGoalId) {
        const currentGoal = personalGoals.find((goal) => goal.id === editingGoalId);
        await updateSavingsGoal(editingGoalId, { ...payload, legacy_fund_id: currentGoal?.legacy_fund_id });
        showToast({ type: 'success', title: 'Meta de ahorro actualizada' });
      } else {
        await createSavingsGoal(payload);
        showToast({ type: 'success', title: 'Meta de ahorro creada' });
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

  const handleDeleteGoal = async (goalId: string) => {
    setWorkingGoalId(goalId);
    try {
      await deleteSavingsGoal(goalId);
      showToast({ type: 'success', title: 'Meta de ahorro eliminada' });
    } catch (error) {
      showToast({ type: 'error', title: 'No se pudo eliminar', description: error instanceof Error ? error.message : 'Intentalo nuevamente.' });
    } finally {
      setWorkingGoalId(null);
    }
  };

  const openGoalContributionModal = (goal: SavingsGoal) => {
    setContributingGoalId(goal.id);
    setGoalContributionForm({
      amount: String(goal.weekly_contribution_target || goal.monthly_contribution_target || ''),
      contributionDate: today,
      accountId: goal.account_id || '',
      paymentMethod: '',
      notes: '',
    });
  };

  const handleGoalContribution = async () => {
    if (!contributingGoalId) return;
    setWorkingGoalId(contributingGoalId);
    try {
      await contributeToSavingsGoal(contributingGoalId, {
        amount: Number(goalContributionForm.amount || 0),
        contribution_date: goalContributionForm.contributionDate,
        account_id: goalContributionForm.accountId || null,
        payment_method: goalContributionForm.paymentMethod,
        notes: goalContributionForm.notes,
      });
      showToast({ type: 'success', title: 'Aporte registrado' });
      setContributingGoalId(null);
      setGoalContributionForm(initialGoalContributionForm);
    } catch (error) {
      showToast({ type: 'error', title: 'No se pudo aportar', description: error instanceof Error ? error.message : 'Intentalo nuevamente.' });
    } finally {
      setWorkingGoalId(null);
    }
  };

  const handleGoalStatus = async (goal: SavingsGoal, status: string) => {
    setWorkingGoalId(goal.id);
    try {
      await updateSavingsGoal(goal.id, { ...goal, status });
      showToast({ type: 'success', title: 'Meta actualizada' });
    } catch (error) {
      showToast({ type: 'error', title: 'No se pudo actualizar', description: error instanceof Error ? error.message : 'Intentalo nuevamente.' });
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
        type: debt.debt_type || debt.type || 'Tarjeta de credito',
        category: debt.category || 'Deudas personales',
        originalAmount: String(debt.original_amount || ''),
        pending: String(debt.current_balance ?? debt.pending ?? ''),
        interestRate: String(debt.interest_rate ?? debt.interest ?? ''),
        interestRateType: debt.interest_rate_type || 'Anual',
        minimum: String(debt.minimum_payment ?? debt.minimum ?? ''),
        recommendedPayment: String(debt.recommended_payment || ''),
        extraPayment: String(debt.extra_payment || ''),
        paymentFrequency: debt.payment_frequency || 'Mensual',
        dueDate: debt.due_date || today,
        cutDate: debt.cut_date || '',
        creditLimit: String(debt.credit_limit || ''),
        strategy: debt.strategy || 'Metodo avalancha',
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
        type: debtForm.type || 'Tarjeta de credito',
        debt_type: debtForm.type || 'Tarjeta de credito',
        category: debtForm.category || 'Deudas personales',
        owner_type: 'personal' as const,
        business_unit_id: 'personal',
        business_id: null,
        original_amount: Number(debtForm.originalAmount || debtForm.pending || 0),
        pending: Number(debtForm.pending || debtForm.originalAmount || 0),
        current_balance: Number(debtForm.pending || debtForm.originalAmount || 0),
        paid: Math.max(0, Number(debtForm.originalAmount || 0) - Number(debtForm.pending || debtForm.originalAmount || 0)),
        minimum: Number(debtForm.minimum || 0),
        minimum_payment: Number(debtForm.minimum || 0),
        recommended_payment: Number(debtForm.recommendedPayment || 0) || (Number(debtForm.minimum || 0) + Number(debtForm.extraPayment || 0)),
        extra_payment: Number(debtForm.extraPayment || 0),
        payment_frequency: debtForm.paymentFrequency,
        due_date: debtForm.dueDate,
        interest: Number(debtForm.interestRate || 0),
        interest_rate: Number(debtForm.interestRate || 0),
        interest_rate_type: debtForm.interestRateType,
        cut_date: debtForm.cutDate || undefined,
        credit_limit: Number(debtForm.creditLimit || 0),
        credit_utilization: debtForm.type === 'Tarjeta de credito' && Number(debtForm.creditLimit || 0) > 0
          ? (Number(debtForm.pending || 0) / Number(debtForm.creditLimit || 1)) * 100
          : 0,
        strategy: debtForm.strategy,
        priority: debtForm.priority,
        status: debtForm.status,
        risk: getDebtRisk({
          pending: Number(debtForm.pending || debtForm.originalAmount || 0),
          minimum: Number(debtForm.minimum || 0),
          interest: Number(debtForm.interestRate || 0),
          interest_rate_type: debtForm.interestRateType,
          priority: debtForm.priority,
          status: debtForm.status,
        }),
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

  const openCardModal = (card?: StoredCreditCard) => {
    if (card) {
      setEditingCardId(card.id);
      setCardForm({
        name: card.name,
        bankName: card.bank || '',
        cardType: card.card_type || 'Credito',
        creditLimit: String(card.credit_limit || ''),
        balance: String(card.current_balance || ''),
        cutDate: card.cut_date || '',
        paymentDueDate: card.payment_due_date || '',
        minimumPayment: String(card.minimum_payment || ''),
        recommendedPayment: String(card.recommended_payment || ''),
        idealPayment: String(card.ideal_payment || ''),
        annualInterestRate: String(card.annual_interest_rate || ''),
        accountId: card.account_id || '',
        createLinkedDebt: Boolean(card.debt_id),
        status: card.status || 'active',
        notes: card.notes || '',
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
      const balance = Number(cardForm.balance || 0);
      const limit = Number(cardForm.creditLimit || 0);
      if (!cardForm.name.trim()) throw new Error('El nombre de la tarjeta es obligatorio.');
      if (isCreditCardForm) {
        if (limit <= 0) throw new Error('El limite de credito es obligatorio.');
        if (!cardForm.paymentDueDate) throw new Error('La fecha de pago es obligatoria.');
        if (balance > limit) throw new Error('El saldo usado no puede ser mayor al limite de credito.');
      }
      const metrics = isCreditCardForm
        ? cardFormMetrics
        : {
          available_credit: Number(cardForm.balance || 0),
          credit_utilization: 0,
          status: cardForm.status,
          estimated_monthly_interest: 0,
          recommended_payment: 0,
          ideal_payment: 0,
        };
      const payload = {
        name: cardForm.name,
        bank: cardForm.bankName,
        card_type: cardForm.cardType,
        credit_limit: isCreditCardForm ? limit : 0,
        current_balance: balance,
        available_credit: metrics.available_credit,
        credit_utilization: metrics.credit_utilization,
        cut_date: isCreditCardForm ? cardForm.cutDate || null : null,
        payment_due_date: isCreditCardForm ? cardForm.paymentDueDate || null : null,
        minimum_payment: isCreditCardForm ? Number(cardForm.minimumPayment || 0) : 0,
        recommended_payment: isCreditCardForm ? Number(cardForm.recommendedPayment || metrics.recommended_payment || 0) : 0,
        ideal_payment: isCreditCardForm ? Number(cardForm.idealPayment || metrics.ideal_payment || 0) : 0,
        annual_interest_rate: isCreditCardForm ? Number(cardForm.annualInterestRate || 0) : 0,
        estimated_monthly_interest: metrics.estimated_monthly_interest,
        status: isCreditCardForm ? metrics.status : cardForm.status,
        account_id: cardForm.accountId || null,
        notes: cardForm.notes,
        owner_type: 'personal' as const,
        business_unit_id: 'personal',
        create_linked_debt: isCreditCardForm && cardForm.createLinkedDebt,
        legacy_account_id: personalCards.find((card) => card.id === editingCardId)?.legacy_account_id,
      };
      if (editingCardId) {
        await updateCreditCard(editingCardId, payload);
        showToast({ type: 'success', title: 'Tarjeta personal actualizada' });
      } else {
        await createCreditCard(payload);
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

  const handleDeleteCard = async (cardId: string) => {
    setWorkingCardId(cardId);
    try {
      await deleteCreditCard(cardId);
      showToast({ type: 'success', title: 'Tarjeta eliminada' });
    } catch (error) {
      showToast({ type: 'error', title: 'No se pudo eliminar', description: error instanceof Error ? error.message : 'Intentalo nuevamente.' });
    } finally {
      setWorkingCardId(null);
    }
  };

  const openCardPaymentModal = (card: StoredCreditCard) => {
    setPayingCardId(card.id);
    setCardPaymentForm({
      amount: String(card.recommended_payment || card.minimum_payment || ''),
      paymentDate: today,
      paymentMethod: '',
      accountId: card.account_id || '',
      notes: '',
    });
  };

  const handleCardPayment = async () => {
    if (!payingCardId) return;
    setWorkingCardId(payingCardId);
    try {
      await registerCreditCardPayment(payingCardId, {
        amount: Number(cardPaymentForm.amount || 0),
        payment_date: cardPaymentForm.paymentDate,
        payment_method: cardPaymentForm.paymentMethod,
        account_id: cardPaymentForm.accountId || null,
        notes: cardPaymentForm.notes,
      });
      showToast({ type: 'success', title: 'Abono a tarjeta registrado' });
      setPayingCardId(null);
      setCardPaymentForm(initialCardPaymentForm);
    } catch (error) {
      showToast({ type: 'error', title: 'No se pudo abonar', description: error instanceof Error ? error.message : 'Intentalo nuevamente.' });
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
        personal_budget_target: parseBudgetNumber(budgetForm.freeSpendingLimit, Number(base.free_spending_limit ?? base.personal_budget_target ?? 0)),
        free_spending_limit: parseBudgetNumber(budgetForm.freeSpendingLimit, Number(base.free_spending_limit ?? base.personal_budget_target ?? 0)),
        savings_goal: parseBudgetNumber(budgetForm.savingsGoal, Number(base.savings_goal || 0)),
        extra_debt_payment: parseBudgetNumber(budgetForm.extraDebtPayment, Number(base.extra_debt_payment ?? base.debt_payment_target ?? 0)),
        emergency_fund: parseBudgetNumber(budgetForm.emergencyFund, Number(base.emergency_fund ?? base.reserve_target ?? 0)),
        budget_mode: budgetForm.budgetMode || base.budget_mode || 'balanceado',
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
      await upsertMonthlyTarget({
        ...base,
        personal_budget_target: 0,
        free_spending_limit: 0,
        savings_goal: 0,
        extra_debt_payment: 0,
        emergency_fund: 0,
        budget_mode: 'balanceado',
      });
      setBudgetForm(initialBudgetForm);
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
          <MiniSummary label="Proximo pago" value={upcomingPersonalFixed ? money(Number(upcomingPersonalFixed.amount || 0)) : 'Sin pagos'} detail={upcomingPersonalFixed ? `${upcomingPersonalFixed.name} - ${upcomingPersonalFixed.next_due_date || upcomingPersonalFixed.due_date || upcomingPersonalFixed.next_run_date}` : undefined} />
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
                          {money(Number(expense.amount || 0))} - {expense.frequency} - {expense.category || 'Otros'} - Pago: {expense.next_due_date || expense.due_date || expense.next_run_date}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">Metodo: {expense.payment_method || 'Sin metodo'}{expense.last_paid_date ? ` - Ultimo pago: ${expense.last_paid_date}` : ''}</p>
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
        <section className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-display font-semibold">Deudas personales</h3>
              <p className="text-sm text-muted-foreground">Planifica pagos, compara escenarios y controla tus deudas desde Finanzas Personales.</p>
            </div>
            <Button onClick={() => openDebtModal()}><Plus className="mr-2 h-4 w-4" /> Nueva deuda personal</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <MiniSummary label="Saldo total pendiente" value={money(personalDebtBalance)} />
            <MiniSummary label="Pago minimo mensual" value={money(personalDebtMinimum)} />
            <MiniSummary label="Pago recomendado" value={money(personalDebtRecommended)} />
            <MiniSummary label="Tasa promedio" value={`${averageDebtInterest.toFixed(1)}%`} />
            <MiniSummary label="Proxima fecha" value={urgentDebt?.due_date || 'Sin fecha'} detail={urgentDebt?.name} />
            <MiniSummary label="Deudas abiertas" value={String(openPersonalDebts.length)} detail={`${personalDebts.length - openPersonalDebts.length} cerradas`} />
          </div>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Plan general para salir de deudas</h4>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{debtStrategyMessage}</p>
                {generalDebtPayoff?.monthsToPayoff && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Con los pagos actuales, la deuda mas larga termina en {generalDebtPayoff.monthsToPayoff} meses.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {(['Avalancha', 'Bola de nieve', 'Personalizado'] as const).map((strategy) => (
                  <Button key={strategy} variant={debtStrategy === strategy ? 'default' : 'outline'} size="sm" onClick={() => setDebtStrategy(strategy)}>
                    {strategy}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              {personalDebts.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {personalDebts.map((debt) => {
                    const balance = Number(debt.current_balance ?? debt.pending ?? 0);
                    const minimum = getDebtMinimumPayment(debt);
                    const recommended = Number(debt.recommended_payment || minimum || 0);
                    const plan = calculateDebtPayoffPlan(debt, recommended);
                    const scenarios = compareDebtPaymentScenarios(debt, recommended);
                    const utilization = getCreditUtilization(debt);
                    const utilizationStatus = getUtilizationStatus(utilization);
                    const isExpanded = expandedDebtId === debt.id;
                    return (
                      <div key={debt.id} className="p-4">
                        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold">{debt.name}</p>
                              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{debt.status || 'Al dia'}</span>
                              <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">Riesgo {getDebtRisk(debt)}</span>
                              {debtPlanTarget?.id === debt.id && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Prioridad del plan</span>}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {debt.debt_type || debt.type} - Saldo: {money(balance)} - Minimo: {money(minimum)} - Recomendado: {money(recommended)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Interes: {getDebtInterestRate(debt)}% {debt.interest_rate_type || 'Anual'} - Vence: {debt.due_date || 'Sin fecha'}
                              {debt.credit_limit ? ` - Uso tarjeta: ${utilization.toFixed(1)}% (${utilizationStatus})` : ''}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            <Button variant="outline" size="sm" onClick={() => setExpandedDebtId(isExpanded ? null : debt.id)}>
                              <ChevronDown className={`mr-1.5 h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} /> Plan
                            </Button>
                            <Button variant="outline" size="sm" disabled={workingDebtId === debt.id} onClick={() => openDebtModal(debt)}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar</Button>
                            <Button variant="outline" size="sm" disabled={workingDebtId === debt.id || balance <= 0} onClick={() => { setDebtPaymentAmount(String(recommended || minimum || '')); setPayingDebtId(debt.id); }}>Abonar</Button>
                            <Button variant="outline" size="sm" disabled={workingDebtId === debt.id || balance <= 0} onClick={() => handleMarkDebtPaid(debt)}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Pagada</Button>
                            <Button variant="outline" size="sm" disabled={workingDebtId === debt.id} onClick={() => handleDeleteDebt(debt.id)} className="text-destructive hover:text-destructive"><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar</Button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 grid gap-4 rounded-xl border border-border bg-muted/20 p-4 xl:grid-cols-[0.9fr_1.1fr]">
                            <div className="space-y-3">
                              <div className="rounded-lg border bg-background p-3">
                                <p className="text-xs font-medium text-muted-foreground">Recomendacion de Noa</p>
                                <p className="mt-1 text-sm">{buildDebtRecommendation(debt)}</p>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <MiniSummary label="Meses estimados" value={plan.monthsToPayoff ? String(plan.monthsToPayoff) : 'Sin calcular'} />
                                <MiniSummary label="Interes total estimado" value={money(plan.totalInterest)} />
                                <MiniSummary label="Pago a capital mes 1" value={money(Math.max(0, plan.principalPayment))} />
                                <MiniSummary label="Fecha estimada final" value={plan.payoffDate || 'Sin calcular'} />
                              </div>
                              {plan.warningMessage && <div className="rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-orange-700">{plan.warningMessage}</div>}
                            </div>
                            <div className="space-y-3">
                              <div className="grid gap-2 sm:grid-cols-2">
                                {scenarios.map((scenario) => (
                                  <div key={scenario.label} className="rounded-lg border bg-background p-3">
                                    <p className="text-xs font-medium text-muted-foreground">{scenario.label}</p>
                                    <p className="mt-1 font-semibold">{money(scenario.payment)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {scenario.monthsToPayoff ? `${scenario.monthsToPayoff} meses` : 'Sin fecha'} - Ahorro: {money(scenario.interestSavings)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                              <div className="overflow-hidden rounded-lg border bg-background">
                                <div className="grid grid-cols-4 gap-2 border-b px-3 py-2 text-xs font-medium text-muted-foreground">
                                  <span>Mes</span><span>Pago</span><span>Interes</span><span>Saldo</span>
                                </div>
                                {plan.amortizationSchedule.slice(0, 6).map((row) => (
                                  <div key={row.month} className="grid grid-cols-4 gap-2 px-3 py-2 text-xs">
                                    <span>{row.month}</span><span>{money(row.payment)}</span><span>{money(row.interest)}</span><span>{money(row.endingBalance)}</span>
                                  </div>
                                ))}
                                {plan.amortizationSchedule.length === 0 && <div className="px-3 py-4 text-sm text-muted-foreground">Agrega tasa y pago para generar la tabla.</div>}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
        <section className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-display font-semibold">Tarjetas personales</h3>
              <p className="text-sm text-muted-foreground">Controla tarjetas de credito, debito y prepago dentro de Finanzas Personales.</p>
            </div>
            <Button onClick={() => openCardModal()}><Plus className="mr-2 h-4 w-4" /> Nueva tarjeta personal</Button>
          </div>

          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-8">
            <MiniSummary label="Usado en credito" value={money(cardKpis.used)} />
            <MiniSummary label="Limite total" value={money(cardKpis.limit)} />
            <MiniSummary label="Disponible" value={money(cardKpis.available)} />
            <MiniSummary label="Utilizacion prom." value={`${cardKpis.averageUtilization.toFixed(1)}%`} />
            <MiniSummary label="Proximo pago" value={cardKpis.nextPayment?.payment_due_date || 'Sin fecha'} detail={cardKpis.nextPayment?.name} />
            <MiniSummary label="Pago minimo total" value={money(cardKpis.minimum)} />
            <MiniSummary label="Pago recomendado" value={money(cardKpis.recommended)} detail={`${creditCardPayments.length} pagos guardados`} />
            <MiniSummary label="En peligro" value={String(cardKpis.danger)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Proximos pagos de tarjetas</CardTitle>
              <CardDescription>Pagos agrupados por urgencia segun fecha de pago.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {cardPaymentGroups.length > 0 ? cardPaymentGroups.map((group) => (
                <div key={group.id} className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">{group.label}</p>
                  {group.items.map((card) => (
                    <div key={`${group.id}-${card.id}`} className="grid gap-3 rounded-xl border border-border p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                      <div>
                        <p className="font-semibold">{card.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {card.bank || 'Sin banco'} - Minimo: {money(Number(card.minimum_payment || 0))} - Recomendado: {money(Number(card.recommended_payment || 0))} - Pago: {card.payment_due_date}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => openCardPaymentModal(card)} disabled={workingCardId === card.id}>Abonar / Pagar</Button>
                    </div>
                  ))}
                </div>
              )) : (
                <EmptyState text="No hay pagos de tarjetas programados." />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {personalCards.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {personalCards.map((card) => {
                    const metrics = calculateCreditCardMetrics({ credit_limit: card.credit_limit, current_balance: card.current_balance, annual_interest_rate: card.annual_interest_rate });
                    const isCredit = card.card_type === 'Credito';
                    const status = isCredit ? metrics.status : card.status || 'Activa';
                    const statusClasses = isCredit ? getCardStatusClasses(status) : 'border-blue-300 bg-blue-50 text-blue-700';
                    const isExpanded = expandedCardId === card.id;
                    return (
                      <div key={card.id} className="p-4">
                        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="rounded-xl bg-primary/10 p-2 text-primary"><CreditCard className="h-5 w-5" /></div>
                              <div>
                                <p className="font-semibold">{card.name}</p>
                                <p className="text-sm text-muted-foreground">{card.bank || 'Sin banco'} - {card.card_type}</p>
                              </div>
                              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusClasses}`}>{status}</span>
                            </div>
                            {isCredit ? (
                              <div className="space-y-2">
                                <div className="grid gap-2 text-sm sm:grid-cols-4">
                                  <span>Limite: <b>{money(Number(card.credit_limit || 0))}</b></span>
                                  <span>Usado: <b>{money(Number(card.current_balance || 0))}</b></span>
                                  <span>Disponible: <b>{money(metrics.available_credit)}</b></span>
                                  <span>Uso: <b>{metrics.credit_utilization.toFixed(1)}%</b></span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-muted">
                                  <div className={`h-full ${status === 'Peligro' ? 'bg-red-500' : status === 'Alto uso' ? 'bg-orange-500' : status === 'Cuidado' ? 'bg-yellow-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, metrics.credit_utilization)}%` }} />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Corte: {card.cut_date || 'Sin fecha'} - Pago: {card.payment_due_date || 'Sin fecha'} - Minimo: {money(Number(card.minimum_payment || 0))} - Recomendado: {money(Number(card.recommended_payment || metrics.recommended_payment || 0))}
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">Saldo actual: {money(Number(card.current_balance || 0))} - Cuenta asociada: {card.account_id || 'Sin cuenta'}</p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            {isCredit && <Button variant="outline" size="sm" disabled={workingCardId === card.id} onClick={() => openCardPaymentModal(card)}>Abonar</Button>}
                            {isCredit && <Button variant="outline" size="sm" onClick={() => setExpandedCardId(isExpanded ? null : card.id)}>Ver plan</Button>}
                            {isCredit && <Button variant="outline" size="sm" disabled={workingCardId === card.id} onClick={() => openCardPaymentModal(card)}>Marcar pago</Button>}
                            <Button variant="outline" size="sm" disabled={workingCardId === card.id} onClick={() => openCardModal(card)}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar</Button>
                            <Button variant="outline" size="sm" disabled={workingCardId === card.id} onClick={() => handleDeleteCard(card.id)} className="text-destructive hover:text-destructive"><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar</Button>
                          </div>
                        </div>
                        {isExpanded && isCredit && (
                          <div className="mt-4 grid gap-3 rounded-xl border border-border bg-muted/20 p-4 md:grid-cols-4">
                            <MiniSummary label="Bajar a 50%" value={money(Math.max(0, Number(card.current_balance || 0) - Number(card.credit_limit || 0) * 0.5))} />
                            <MiniSummary label="Bajar a 30%" value={money(metrics.ideal_payment)} />
                            <MiniSummary label="Interes mensual est." value={money(metrics.estimated_monthly_interest)} />
                            <MiniSummary label="Deuda vinculada" value={card.debt_id ? 'Si' : 'No'} />
                            {metrics.credit_utilization >= 80 && <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 md:col-span-4">Esta tarjeta esta en zona de peligro. Prioriza bajar el saldo.</div>}
                            {!card.annual_interest_rate && <div className="rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-orange-700 md:col-span-4">Sin tasa de interes no se puede calcular el costo real de esta tarjeta.</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
        <section className="space-y-5">
          <div>
            <h3 className="text-xl font-display font-semibold">Presupuesto / Limite personal</h3>
            <p className="text-sm text-muted-foreground">Define cuanto puedes gastar personalmente sin afectar tus gastos fijos, deudas ni ahorro.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Configuracion del presupuesto</CardTitle>
              <CardDescription>Este monto es solo para gasto libre variable. No registra gastos fijos, deudas ni tarjetas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <Field label="Gasto libre mensual permitido">
                  <input className="form-field" type="number" min="0" step="0.01" value={budgetForm.freeSpendingLimit || String(savedFreeSpendingLimit || '')} onChange={(event) => setBudgetForm({ ...budgetForm, freeSpendingLimit: event.target.value })} placeholder="0.00" />
                </Field>
                <Field label="Ahorro mensual objetivo">
                  <input className="form-field" type="number" min="0" step="0.01" value={budgetForm.savingsGoal || String(savedSavingsGoal || '')} onChange={(event) => setBudgetForm({ ...budgetForm, savingsGoal: event.target.value })} placeholder="0.00" />
                </Field>
                <Field label="Pago extra mensual a deudas">
                  <input className="form-field" type="number" min="0" step="0.01" value={budgetForm.extraDebtPayment || String(savedExtraDebtPayment || '')} onChange={(event) => setBudgetForm({ ...budgetForm, extraDebtPayment: event.target.value })} placeholder="Opcional" />
                </Field>
                <Field label="Fondo de emergencia mensual">
                  <input className="form-field" type="number" min="0" step="0.01" value={budgetForm.emergencyFund || String(savedEmergencyFund || '')} onChange={(event) => setBudgetForm({ ...budgetForm, emergencyFund: event.target.value })} placeholder="Opcional" />
                </Field>
                <Field label="Modo de calculo">
                  <select className="form-field" value={budgetForm.budgetMode || savedBudgetMode} onChange={(event) => setBudgetForm({ ...budgetForm, budgetMode: event.target.value })}>
                    <option value="conservador">Conservador</option>
                    <option value="balanceado">Balanceado</option>
                    <option value="agresivo">Agresivo</option>
                  </select>
                </Field>
              </div>
              {budgetError && <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{budgetError}</div>}
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSaveBudget} disabled={savingBudget}>{savingBudget ? 'Guardando...' : 'Guardar limite personal'}</Button>
                <Button variant="outline" className="text-destructive hover:text-destructive" onClick={handleClearBudget} disabled={savingBudget}>Limpiar presupuesto</Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
            <MiniSummary label="Gasto libre mensual" value={budgetConfigured ? money(savedFreeSpendingLimit) : 'Sin configurar'} />
            <MiniSummary label="Gastado este mes" value={money(monthlyVariableExpenses)} />
            <MiniSummary label="Disponible este mes" value={budgetConfigured ? money(Math.max(0, budgetAvailableMonth)) : 'Sin configurar'} />
            <MiniSummary label="Limite semanal" value={budgetConfigured ? money(budgetWeeklyLimit) : 'Sin configurar'} />
            <MiniSummary label="Limite diario" value={budgetConfigured ? money(budgetDailyLimit) : 'Sin configurar'} />
            <MiniSummary label="Gastos fijos" value={money(personalRecurringTotal)} />
            <MiniSummary label="Deudas personales" value={money(personalDebtMinimum)} />
            <MiniSummary label="Ahorro objetivo" value={money(savedSavingsGoal)} />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>Lectura del presupuesto</CardTitle>
                <CardDescription>Lee datos reales desde movimientos, gastos fijos, deudas, tarjetas y ahorro.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!budgetConfigured ? (
                  <EmptyState text="Todavia no has configurado tu gasto libre mensual. Define cuanto puedes gastar personalmente para calcular tu limite semanal." />
                ) : (
                  <>
                    <DistributionRow label="Gastos variables del mes" value={monthlyVariableExpenses} tone="destructive" />
                    <DistributionRow label="Gastos fijos personales" value={personalRecurringTotal} />
                    <DistributionRow label="Deudas personales" value={personalDebtMinimum} tone="warning" />
                    <DistributionRow label="Tarjetas personales" value={personalCardsMinimum} tone="warning" />
                    <DistributionRow label="Ahorro objetivo" value={savedSavingsGoal} tone="primary" />
                    <DistributionRow label="Pago extra a deudas" value={savedExtraDebtPayment} tone="warning" />
                    <DistributionRow label="Fondo de emergencia" value={savedEmergencyFund} tone="primary" />
                    <DistributionRow label="Limite seguro semanal" value={budgetWeeklyLimit} tone="success" />
                    <DistributionRow label="Limite diario" value={budgetDailyLimit} tone="success" />
                  </>
                )}
              </CardContent>
            </Card>

            <Card className={budgetAvailableMonth < 0 ? 'border-destructive/30 bg-destructive/5' : budgetUsedPercent >= 80 ? 'border-orange-300 bg-orange-50' : 'border-success/20 bg-success/5'}>
              <CardHeader>
                <CardTitle>Decision rapida de Noa</CardTitle>
                <CardDescription>Recomendacion basada en tu gasto libre real.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed">{budgetNoaDecision}</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-muted-foreground">
                    <span>Usado</span>
                    <span>{budgetConfigured ? `${Math.min(999, budgetUsedPercent).toFixed(1)}%` : 'Sin presupuesto'}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-background border border-border">
                    <div className={`h-full ${budgetAvailableMonth < 0 ? 'bg-destructive' : budgetUsedPercent >= 80 ? 'bg-orange-500' : 'bg-success'}`} style={{ width: `${budgetConfigured ? Math.min(100, budgetUsedPercent) : 0}%` }} />
                  </div>
                  <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <span>Disponible mes: <b>{budgetConfigured ? money(budgetAvailableMonth) : 'Sin configurar'}</b></span>
                    <span>Disponible semana: <b>{budgetConfigured ? money(budgetWeeklyAvailable) : 'Sin configurar'}</b></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {view === 'savings' && (
        <section className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-display font-semibold">Ahorro / Dinero protegido personal</h3>
              <p className="text-sm text-muted-foreground">Separa dinero personal para metas, emergencias y reservas que no debes tocar.</p>
            </div>
            <Button onClick={() => openGoalModal()}><PiggyBank className="mr-2 h-4 w-4" /> Crear meta de ahorro</Button>
          </div>

          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <MiniSummary label="Ahorro protegido actual" value={money(personalSavings)} />
            <MiniSummary label="Meta total de ahorro" value={money(savingsTotalTarget)} />
            <MiniSummary label="Falta por ahorrar" value={money(savingsMissingTotal)} />
            <MiniSummary label="Aporte mensual sugerido" value={savedFreeSpendingLimit > 0 ? money(recommendedSaving) : 'Sin presupuesto'} detail={savedFreeSpendingLimit > 0 ? undefined : 'Configura presupuesto'} />
            <MiniSummary label="Meta mas urgente" value={urgentSavingsGoal?.name || 'Sin metas'} detail={urgentSavingsGoal?.target_date || urgentSavingsGoal?.priority} />
            <MiniSummary label="Avance general" value={`${savingsProgress.toFixed(1)}%`} />
          </div>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <p className="font-semibold">Lectura de ahorro</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {savedFreeSpendingLimit > 0
                  ? `Tu ahorro sugerido se calcula desde tu presupuesto personal. Este mes la referencia sugerida es ${money(recommendedSaving)}.`
                  : 'Configura tu presupuesto personal para calcular un ahorro sugerido. No hay datos suficientes para sugerir ahorro.'}
              </p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-background border border-border">
                <div className="h-full bg-primary" style={{ width: `${Math.min(100, savingsProgress)}%` }} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {personalGoals.length > 0 ? (
                <div className="grid gap-4 p-4 xl:grid-cols-2">
                  {personalGoals.map((goal) => {
                    const stats = buildSavingsGoalStats(goal);
                    const statusClasses = goal.status === 'Completada' ? 'bg-success/10 text-success' : stats.status === 'atrasada' ? 'bg-destructive/10 text-destructive' : goal.status === 'Pausada' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary';
                    return (
                      <div key={goal.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold">{goal.name}</p>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses}`}>{goal.status || stats.statusLabel}</span>
                              {goal.is_protected && <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">No tocar</span>}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{goal.goal_type} - Prioridad {goal.priority || 'Media'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{money(Number(goal.current_amount || 0))}</p>
                            <p className="text-xs text-muted-foreground">de {money(Number(goal.target_amount || 0))}</p>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <div className="flex justify-between text-xs font-medium text-muted-foreground">
                            <span>{stats.progress.toFixed(1)}% avanzado</span>
                            <span>Falta {money(stats.missing)}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div className="h-full bg-primary" style={{ width: `${Math.min(100, stats.progress)}%` }} />
                          </div>
                        </div>
                        <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                          <span>Fecha objetivo: <b>{goal.target_date || 'Sin fecha'}</b></span>
                          <span>Tiempo: <b>{stats.timeLabel}</b></span>
                          <span>Aporte semanal necesario: <b>{money(stats.weeklyNeeded)}</b></span>
                          <span>Aporte mensual necesario: <b>{money(stats.monthlyNeeded)}</b></span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" disabled={workingGoalId === goal.id || goal.status === 'Completada'} onClick={() => openGoalContributionModal(goal)}>Aportar</Button>
                          <Button variant="outline" size="sm" disabled={workingGoalId === goal.id} onClick={() => openGoalModal(goal)}><Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar</Button>
                          <Button variant="outline" size="sm" disabled={workingGoalId === goal.id} onClick={() => handleGoalStatus(goal, goal.status === 'Pausada' ? 'Activa' : 'Pausada')}>{goal.status === 'Pausada' ? 'Activar' : 'Pausar'}</Button>
                          <Button variant="outline" size="sm" disabled={workingGoalId === goal.id} onClick={() => handleGoalStatus(goal, 'Completada')}>Completar</Button>
                          <Button variant="outline" size="sm" disabled={workingGoalId === goal.id} onClick={() => handleDeleteGoal(goal.id)} className="text-destructive hover:text-destructive"><Trash2 className="mr-1.5 h-3.5 w-3.5" /> Eliminar</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4 p-8 text-center">
                  <EmptyState text="No tienes metas de ahorro registradas todavia." />
                  <p className="text-sm text-muted-foreground">Usa esta seccion para separar dinero que no debes tocar: emergencia, salud, deudas, viajes o reservas personales.</p>
                  <Button onClick={() => openGoalModal()}><PiggyBank className="mr-2 h-4 w-4" /> Crear primera meta de ahorro</Button>
                </div>
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
                <Field label="Tipo de deuda">
                  <select className="form-field" value={debtForm.type} onChange={(event) => setDebtForm({ ...debtForm, type: event.target.value })}>
                    <option>Tarjeta de credito</option>
                    <option>Prestamo personal</option>
                    <option>Deuda familiar</option>
                    <option>Deuda informal</option>
                    <option>Banco</option>
                    <option>Proveedor</option>
                    <option>Otro</option>
                  </select>
                </Field>
                <Field label="Banco / categoria"><input className="form-field" value={debtForm.category} onChange={(event) => setDebtForm({ ...debtForm, category: event.target.value })} placeholder="Ej: BAC, familiar, salud" /></Field>
                <Field label="Monto original"><input className="form-field" type="number" min="0" step="0.01" value={debtForm.originalAmount} onChange={(event) => setDebtForm({ ...debtForm, originalAmount: event.target.value })} /></Field>
                <Field label="Saldo actual"><input className="form-field" type="number" min="0" step="0.01" value={debtForm.pending} onChange={(event) => setDebtForm({ ...debtForm, pending: event.target.value })} /></Field>
                <Field label="Tasa de interes"><input className="form-field" type="number" min="0" step="0.01" value={debtForm.interestRate} onChange={(event) => setDebtForm({ ...debtForm, interestRate: event.target.value })} placeholder="0.00" /></Field>
                <Field label="Tipo de tasa">
                  <select className="form-field" value={debtForm.interestRateType} onChange={(event) => setDebtForm({ ...debtForm, interestRateType: event.target.value })}>
                    <option>Anual</option>
                    <option>Mensual</option>
                    <option>Sin interes</option>
                  </select>
                </Field>
                <Field label="Pago minimo"><input className="form-field" type="number" min="0" step="0.01" value={debtForm.minimum} onChange={(event) => setDebtForm({ ...debtForm, minimum: event.target.value })} /></Field>
                <Field label="Pago recomendado"><input className="form-field" type="number" min="0" step="0.01" value={debtForm.recommendedPayment} onChange={(event) => setDebtForm({ ...debtForm, recommendedPayment: event.target.value })} placeholder={debtForm.minimum || '0.00'} /></Field>
                <Field label="Pago extra mensual"><input className="form-field" type="number" min="0" step="0.01" value={debtForm.extraPayment} onChange={(event) => setDebtForm({ ...debtForm, extraPayment: event.target.value })} /></Field>
                <Field label="Frecuencia de pago">
                  <select className="form-field" value={debtForm.paymentFrequency} onChange={(event) => setDebtForm({ ...debtForm, paymentFrequency: event.target.value })}>
                    <option>Semanal</option>
                    <option>Quincenal</option>
                    <option>Mensual</option>
                    <option>Personalizado</option>
                  </select>
                </Field>
                <Field label="Fecha de corte"><input className="form-field" type="date" value={debtForm.cutDate} onChange={(event) => setDebtForm({ ...debtForm, cutDate: event.target.value })} /></Field>
                <Field label="Fecha limite de pago"><input className="form-field" type="date" value={debtForm.dueDate} onChange={(event) => setDebtForm({ ...debtForm, dueDate: event.target.value })} /></Field>
                <Field label="Limite de credito"><input className="form-field" type="number" min="0" step="0.01" value={debtForm.creditLimit} onChange={(event) => setDebtForm({ ...debtForm, creditLimit: event.target.value })} /></Field>
                <Field label="Estrategia">
                  <select className="form-field" value={debtForm.strategy} onChange={(event) => setDebtForm({ ...debtForm, strategy: event.target.value })}>
                    <option>Metodo avalancha</option>
                    <option>Metodo bola de nieve</option>
                    <option>Pago minimo</option>
                    <option>Personalizado</option>
                  </select>
                </Field>
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
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="font-semibold">Vista previa del plan</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <MiniSummary label="Tiempo estimado" value={debtFormPlan.monthsToPayoff ? `${debtFormPlan.monthsToPayoff} meses` : 'Sin calcular'} />
                  <MiniSummary label="Interes total" value={money(debtFormPlan.totalInterest)} />
                  <MiniSummary label="Fecha final" value={debtFormPlan.payoffDate || 'Sin calcular'} />
                </div>
                {debtFormPlan.warningMessage && <div className="mt-3 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-orange-700">{debtFormPlan.warningMessage}</div>}
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {debtFormScenarios.slice(0, 4).map((scenario) => (
                    <div key={scenario.label} className="rounded-lg border bg-background p-3 text-sm">
                      <p className="font-medium">{scenario.label}: {money(scenario.payment)}</p>
                      <p className="text-xs text-muted-foreground">{scenario.monthsToPayoff ? `${scenario.monthsToPayoff} meses` : 'Sin fecha'} - ahorro {money(scenario.interestSavings)}</p>
                    </div>
                  ))}
                </div>
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
          <Card className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto border-border shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div>
                <CardTitle>{editingCardId ? 'Editar tarjeta personal' : 'Nueva tarjeta personal'}</CardTitle>
                <CardDescription>Credito se maneja como deuda rotativa; debito y prepago se manejan como medio de pago.</CardDescription>
              </div>
              <button onClick={closeCardModal} className="rounded-xl p-1 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nombre"><input className="form-field" value={cardForm.name} onChange={(event) => setCardForm({ ...cardForm, name: event.target.value })} placeholder="Ej: Visa Banco General" /></Field>
                <Field label="Banco / entidad"><input className="form-field" value={cardForm.bankName} onChange={(event) => setCardForm({ ...cardForm, bankName: event.target.value })} placeholder="Banco General" /></Field>
                <Field label="Tipo de tarjeta">
                  <select className="form-field" value={cardForm.cardType} onChange={(event) => setCardForm({ ...cardForm, cardType: event.target.value })}>
                    <option>Credito</option>
                    <option>Debito</option>
                    <option>Prepago</option>
                    <option>Otra</option>
                  </select>
                </Field>
                {!isCreditCardForm && (
                  <Field label="Estado">
                    <select className="form-field" value={cardForm.status} onChange={(event) => setCardForm({ ...cardForm, status: event.target.value })}>
                      <option value="active">Activa</option>
                      <option value="paused">Pausada</option>
                    </select>
                  </Field>
                )}
              </div>

              {isCreditCardForm ? (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Limite de credito"><input className="form-field" type="number" min="0" step="0.01" value={cardForm.creditLimit} onChange={(event) => setCardForm({ ...cardForm, creditLimit: event.target.value })} /></Field>
                    <Field label="Saldo usado actual"><input className="form-field" type="number" min="0" step="0.01" value={cardForm.balance} onChange={(event) => setCardForm({ ...cardForm, balance: event.target.value })} /></Field>
                    <Field label="Fecha de corte"><input className="form-field" type="date" value={cardForm.cutDate} onChange={(event) => setCardForm({ ...cardForm, cutDate: event.target.value })} /></Field>
                    <Field label="Fecha de pago"><input className="form-field" type="date" value={cardForm.paymentDueDate} onChange={(event) => setCardForm({ ...cardForm, paymentDueDate: event.target.value })} /></Field>
                    <Field label="Pago minimo"><input className="form-field" type="number" min="0" step="0.01" value={cardForm.minimumPayment} onChange={(event) => setCardForm({ ...cardForm, minimumPayment: event.target.value })} /></Field>
                    <Field label="Pago recomendado"><input className="form-field" type="number" min="0" step="0.01" value={cardForm.recommendedPayment || String(cardFormMetrics.recommended_payment || '')} onChange={(event) => setCardForm({ ...cardForm, recommendedPayment: event.target.value })} /></Field>
                    <Field label="Tasa de interes anual"><input className="form-field" type="number" min="0" step="0.01" value={cardForm.annualInterestRate} onChange={(event) => setCardForm({ ...cardForm, annualInterestRate: event.target.value })} placeholder="24" /></Field>
                    <Field label="Cuenta desde donde pagas">
                      <select className="form-field" value={cardForm.accountId} onChange={(event) => setCardForm({ ...cardForm, accountId: event.target.value })}>
                        <option value="">Opcional</option>
                        {personalAccounts.filter((account) => !account.type.toLowerCase().includes('tarjeta')).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                      </select>
                    </Field>
                  </div>
                  <label className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm">
                    <input type="checkbox" checked={cardForm.createLinkedDebt} onChange={(event) => setCardForm({ ...cardForm, createLinkedDebt: event.target.checked })} />
                    Crear tambien como deuda personal vinculada
                  </label>
                  <div className={`rounded-xl border p-4 ${getCardStatusClasses(cardFormMetrics.status)}`}>
                    <p className="font-semibold">Vista previa</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <MiniSummary label="Disponible" value={money(cardFormMetrics.available_credit)} />
                      <MiniSummary label="Utilizacion" value={`${cardFormMetrics.credit_utilization.toFixed(1)}%`} />
                      <MiniSummary label="Estado" value={cardFormMetrics.status} />
                      <MiniSummary label="Bajar a 50%" value={money(Math.max(0, Number(cardForm.balance || 0) - Number(cardForm.creditLimit || 0) * 0.5))} />
                      <MiniSummary label="Pago ideal 30%" value={money(cardFormMetrics.ideal_payment)} />
                      <MiniSummary label="Interes mensual" value={money(cardFormMetrics.estimated_monthly_interest)} />
                    </div>
                    {cardFormMetrics.credit_utilization >= 80 && <div className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">Esta tarjeta esta en zona de peligro. Prioriza bajar el saldo.</div>}
                    {!cardForm.annualInterestRate && <div className="mt-3 rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-orange-700">Sin tasa de interes no se puede calcular el costo real de esta tarjeta.</div>}
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Saldo actual"><input className="form-field" type="number" min="0" step="0.01" value={cardForm.balance} onChange={(event) => setCardForm({ ...cardForm, balance: event.target.value })} /></Field>
                  <Field label="Cuenta asociada">
                    <select className="form-field" value={cardForm.accountId} onChange={(event) => setCardForm({ ...cardForm, accountId: event.target.value })}>
                      <option value="">Opcional</option>
                      {personalAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                    </select>
                  </Field>
                </div>
              )}

              <Field label="Nota"><input className="form-field" value={cardForm.notes} onChange={(event) => setCardForm({ ...cardForm, notes: event.target.value })} placeholder="Opcional" /></Field>
              {cardError && <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{cardError}</div>}
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={closeCardModal}>Cancelar</Button>
              <Button onClick={handleSaveCard} disabled={savingCard}>{savingCard ? 'Guardando...' : 'Guardar tarjeta'}</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {payingCardId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <Card className="w-full max-w-md border-border shadow-2xl">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle>Abonar tarjeta</CardTitle>
              <CardDescription>Registra el pago y reduce el saldo usado de la tarjeta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <Field label="Monto del pago"><input className="form-field" type="number" min="0" step="0.01" value={cardPaymentForm.amount} onChange={(event) => setCardPaymentForm({ ...cardPaymentForm, amount: event.target.value })} /></Field>
              <Field label="Fecha"><input className="form-field" type="date" value={cardPaymentForm.paymentDate} onChange={(event) => setCardPaymentForm({ ...cardPaymentForm, paymentDate: event.target.value })} /></Field>
              <Field label="Metodo de pago">
                <select className="form-field" value={cardPaymentForm.paymentMethod} onChange={(event) => setCardPaymentForm({ ...cardPaymentForm, paymentMethod: event.target.value })}>
                  <option value="">Sin metodo</option>
                  {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
                </select>
              </Field>
              <Field label="Cuenta origen">
                <select className="form-field" value={cardPaymentForm.accountId} onChange={(event) => setCardPaymentForm({ ...cardPaymentForm, accountId: event.target.value })}>
                  <option value="">Opcional</option>
                  {personalAccounts.filter((account) => !account.type.toLowerCase().includes('tarjeta')).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </Field>
              <Field label="Nota"><input className="form-field" value={cardPaymentForm.notes} onChange={(event) => setCardPaymentForm({ ...cardPaymentForm, notes: event.target.value })} placeholder="Opcional" /></Field>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => { setPayingCardId(null); setCardPaymentForm(initialCardPaymentForm); }}>Cancelar</Button>
              <Button onClick={handleCardPayment} disabled={workingCardId === payingCardId}>{workingCardId === payingCardId ? 'Guardando...' : 'Guardar pago'}</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {contributingGoalId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <Card className="w-full max-w-md border-border shadow-2xl">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle>Aportar a meta</CardTitle>
              <CardDescription>Registra un aporte y actualiza el avance de la meta.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <Field label="Monto del aporte"><input className="form-field" type="number" min="0" step="0.01" value={goalContributionForm.amount} onChange={(event) => setGoalContributionForm({ ...goalContributionForm, amount: event.target.value })} /></Field>
              <Field label="Fecha"><input className="form-field" type="date" value={goalContributionForm.contributionDate} onChange={(event) => setGoalContributionForm({ ...goalContributionForm, contributionDate: event.target.value })} /></Field>
              <Field label="Cuenta origen">
                <select className="form-field" value={goalContributionForm.accountId} onChange={(event) => setGoalContributionForm({ ...goalContributionForm, accountId: event.target.value })}>
                  <option value="">Opcional</option>
                  {personalAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                </select>
              </Field>
              <Field label="Metodo">
                <select className="form-field" value={goalContributionForm.paymentMethod} onChange={(event) => setGoalContributionForm({ ...goalContributionForm, paymentMethod: event.target.value })}>
                  <option value="">Sin metodo</option>
                  {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
                </select>
              </Field>
              <Field label="Nota"><input className="form-field" value={goalContributionForm.notes} onChange={(event) => setGoalContributionForm({ ...goalContributionForm, notes: event.target.value })} placeholder="Opcional" /></Field>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => { setContributingGoalId(null); setGoalContributionForm(initialGoalContributionForm); }}>Cancelar</Button>
              <Button onClick={handleGoalContribution} disabled={workingGoalId === contributingGoalId}>{workingGoalId === contributingGoalId ? 'Guardando...' : 'Guardar aporte'}</Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <Card className="max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto border-border shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div>
                <CardTitle>{editingGoalId ? 'Editar meta de ahorro' : 'Crear meta de ahorro'}</CardTitle>
                <CardDescription>Define una meta personal y decide si ese dinero queda protegido como no tocar.</CardDescription>
              </div>
              <button onClick={resetGoalModal} className="rounded-xl p-1 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <Field label="Nombre de la meta"><input className="form-field" value={goalForm.name} onChange={(event) => setGoalForm({ ...goalForm, name: event.target.value })} placeholder="Ej: Fondo de emergencia" /></Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Tipo de meta">
                  <select className="form-field" value={goalForm.goalType} onChange={(event) => setGoalForm({ ...goalForm, goalType: event.target.value })}>
                    {['Fondo de emergencia', 'Salud', 'Viaje', 'Compra importante', 'Pago de deuda', 'Inversion personal', 'Reserva personal', 'Impuestos / reserva', 'Otro'].map((type) => <option key={type}>{type}</option>)}
                  </select>
                </Field>
                <Field label="Prioridad">
                  <select className="form-field" value={goalForm.priority} onChange={(event) => setGoalForm({ ...goalForm, priority: event.target.value })}>
                    <option>Alta</option><option>Media</option><option>Baja</option>
                  </select>
                </Field>
                <Field label="Monto objetivo"><input className="form-field" type="number" min="0" step="0.01" value={goalForm.targetAmount} onChange={(event) => setGoalForm({ ...goalForm, targetAmount: event.target.value })} /></Field>
                <Field label="Monto actual"><input className="form-field" type="number" min="0" step="0.01" value={goalForm.currentAmount} onChange={(event) => setGoalForm({ ...goalForm, currentAmount: event.target.value })} /></Field>
                <Field label="Aporte semanal deseado"><input className="form-field" type="number" min="0" step="0.01" value={goalForm.weeklyContribution} onChange={(event) => setGoalForm({ ...goalForm, weeklyContribution: event.target.value })} /></Field>
                <Field label="Aporte mensual deseado"><input className="form-field" type="number" min="0" step="0.01" value={goalForm.monthlyContribution} onChange={(event) => setGoalForm({ ...goalForm, monthlyContribution: event.target.value })} /></Field>
                <Field label="Fecha objetivo"><input className="form-field" type="date" value={goalForm.targetDate} onChange={(event) => setGoalForm({ ...goalForm, targetDate: event.target.value })} /></Field>
                <Field label="Estado">
                  <select className="form-field" value={goalForm.status} onChange={(event) => setGoalForm({ ...goalForm, status: event.target.value })}>
                    <option>Activa</option><option>Pausada</option><option>Completada</option>
                  </select>
                </Field>
                <Field label="Cuenta o bolsillo asociado">
                  <select className="form-field" value={goalForm.accountId} onChange={(event) => setGoalForm({ ...goalForm, accountId: event.target.value })}>
                    <option value="">Opcional</option>
                    {personalAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                  </select>
                </Field>
              </div>
              <label className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm">
                <input type="checkbox" checked={goalForm.isProtected} onChange={(event) => setGoalForm({ ...goalForm, isProtected: event.target.checked })} />
                Marcar como dinero no tocar
              </label>
              <Field label="Nota"><input className="form-field" value={goalForm.notes} onChange={(event) => setGoalForm({ ...goalForm, notes: event.target.value })} placeholder="Opcional" /></Field>
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

function isCurrentWeek(dateValue: string) {
  const date = parseLocalDate(dateValue);
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - now.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return date >= start && date < end;
}

function isPersonalVariableExpense(transaction: Transaction) {
  const text = `${transaction.category || ''} ${transaction.notes || ''} ${transaction.status || ''}`.toLowerCase();
  if (transaction.recurring_expense_id) return false;
  const blocked = ['gasto fijo', 'recurrente', 'deuda', 'abono', 'tarjeta', 'ahorro', 'reserva', 'dinero no tocar', 'meta', 'fondo de emergencia'];
  return !blocked.some((word) => text.includes(word));
}

function parseBudgetNumber(value: string, fallback = 0) {
  if (value === '') return fallback;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildBudgetDecision(input: { configured: boolean; availableMonth: number; weeklyAvailable: number; usedPercent: number }) {
  if (!input.configured) return 'Configura tu gasto libre mensual para que pueda decirte cuanto puedes gastar esta semana.';
  if (input.availableMonth < 0) return `Te pasaste por ${money(Math.abs(input.availableMonth))}. No retires mas dinero de los negocios hasta compensarlo.`;
  if (input.usedPercent >= 80) return `Cuidado. Ya usaste el ${input.usedPercent.toFixed(1)}% de tu presupuesto personal del mes.`;
  return `Vas bien. Te quedan ${money(input.availableMonth)} para gastar este mes y ${money(Math.max(0, input.weeklyAvailable))} para esta semana.`;
}

function buildSavingsGoalStats(goal: SavingsGoal) {
  const target = Number(goal.target_amount || 0);
  const current = Number(goal.current_amount || 0);
  const missing = Math.max(0, target - current);
  const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  if (missing <= 0 || goal.status === 'Completada') {
    return { progress: 100, missing: 0, weeksLeft: 0, monthsLeft: 0, weeklyNeeded: 0, monthlyNeeded: 0, status: 'completada', statusLabel: 'Completada', timeLabel: 'Completada' };
  }
  if (!goal.target_date) {
    return { progress, missing, weeksLeft: 0, monthsLeft: 0, weeklyNeeded: Number(goal.weekly_contribution_target || 0), monthlyNeeded: Number(goal.monthly_contribution_target || 0), status: 'sin fecha', statusLabel: 'Sin fecha', timeLabel: 'Sin fecha' };
  }
  const daysLeft = diffDays(goal.target_date, today);
  const weeksLeft = Math.max(0, Math.ceil(daysLeft / 7));
  const monthsLeft = Math.max(0, Math.ceil(daysLeft / 30));
  const weeklyNeeded = weeksLeft > 0 ? missing / weeksLeft : missing;
  const monthlyNeeded = monthsLeft > 0 ? missing / monthsLeft : missing;
  const plannedMonthly = Number(goal.monthly_contribution_target || 0);
  const status = daysLeft < 0 ? 'atrasada' : plannedMonthly > 0 && plannedMonthly < monthlyNeeded ? 'atrasada' : 'en camino';
  return {
    progress,
    missing,
    weeksLeft,
    monthsLeft,
    weeklyNeeded,
    monthlyNeeded,
    status,
    statusLabel: status === 'atrasada' ? 'Atrasada' : 'En camino',
    timeLabel: daysLeft < 0 ? `Vencio hace ${Math.abs(daysLeft)} dias` : `${weeksLeft} semanas / ${monthsLeft} meses`,
  };
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

function buildCardKpis(cards: StoredCreditCard[]) {
  const used = cards.reduce((sum, card) => sum + Number(card.current_balance || 0), 0);
  const limit = cards.reduce((sum, card) => sum + Number(card.credit_limit || 0), 0);
  const available = Math.max(0, limit - used);
  const minimum = cards.reduce((sum, card) => sum + Number(card.minimum_payment || 0), 0);
  const recommended = cards.reduce((sum, card) => {
    const metrics = calculateCreditCardMetrics({ credit_limit: card.credit_limit, current_balance: card.current_balance, annual_interest_rate: card.annual_interest_rate });
    return sum + Number(card.recommended_payment || metrics.recommended_payment || 0);
  }, 0);
  const nextPayment = [...cards]
    .filter((card) => card.payment_due_date)
    .sort((a, b) => String(a.payment_due_date).localeCompare(String(b.payment_due_date)))[0];
  return {
    used,
    limit,
    available,
    averageUtilization: limit > 0 ? (used / limit) * 100 : 0,
    nextPayment,
    minimum,
    recommended,
    danger: cards.filter((card) => calculateCreditCardMetrics({ credit_limit: card.credit_limit, current_balance: card.current_balance }).status === 'Peligro').length,
  };
}

function groupCardPayments(cards: StoredCreditCard[]) {
  const todayDate = parseLocalDate(today);
  const groups = [
    ['overdue', 'Vencidos'],
    ['today', 'Vencen hoy'],
    ['week', 'Esta semana'],
    ['next15', 'Proximos 15 dias'],
  ] as const;
  const items = cards
    .filter((card) => card.card_type === 'Credito' && card.payment_due_date && Number(card.current_balance || 0) > 0)
    .map((card) => ({ card, diff: diffDays(card.payment_due_date || today, formatDateKey(todayDate)) }));

  return groups
    .map(([id, label]) => ({
      id,
      label,
      items: items
        .filter(({ diff }) => {
          if (id === 'overdue') return diff < 0;
          if (id === 'today') return diff === 0;
          if (id === 'week') return diff > 0 && diff <= 7;
          return diff > 7 && diff <= 15;
        })
        .map(({ card }) => card),
    }))
    .filter((group) => group.items.length > 0);
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
          {money(item.amount)} - {item.expense.category || 'Otros'} - {item.expense.payment_method || 'Sin metodo'} - {item.dueDate}
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
