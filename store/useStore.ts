import { create } from 'zustand';
import { supabase, hasSupabaseConfig } from '@/lib/supabase';
import { calculateNextDueDate, calculateRecurrence } from '@/lib/recurrence';

export type User = {
  id: string;
  email: string;
  full_name?: string;
};

export type Business = {
  id: string;
  user_id?: string;
  name: string;
  type: string;
};

export type Account = {
  id: string;
  user_id?: string;
  name: string;
  type: string;
  bank_name?: string;
  current_balance: number;
  is_personal: boolean;
  business_id?: string;
  status: string;
};

export type Transaction = {
  id: string;
  user_id?: string;
  type: string;
  scope: string;
  amount: number;
  category?: string;
  payment_method?: string;
  status: string;
  notes?: string;
  date: string;
  owner_type?: 'personal' | 'business';
  business_unit_id?: string;
  recurring_expense_id?: string;
  business_id?: string;
  account_id?: string;
};

export type ProtectedFund = {
  id: string;
  user_id?: string;
  name: string;
  scope: string;
  owner_type?: 'personal' | 'business';
  business_unit_id?: string;
  fund_type: string;
  amount: number;
  priority: string;
  target_date?: string;
  block_withdrawals: boolean;
  status: string;
  business_id?: string;
  account_id?: string;
  notes?: string;
};

export type SavingsGoal = {
  id: string;
  user_id?: string;
  owner_type?: 'personal' | 'business';
  business_unit_id?: string | null;
  name: string;
  goal_type: string;
  target_amount: number;
  current_amount: number;
  weekly_contribution_target?: number;
  monthly_contribution_target?: number;
  target_date?: string | null;
  priority?: string;
  account_id?: string | null;
  is_protected?: boolean;
  status?: string;
  notes?: string | null;
  legacy_fund_id?: string;
};

export type SavingsGoalContribution = {
  id: string;
  user_id?: string;
  savings_goal_id: string;
  amount: number;
  contribution_date: string;
  account_id?: string | null;
  payment_method?: string | null;
  transaction_id?: string | null;
  notes?: string | null;
};

export type RecurringExpense = {
  id: string;
  user_id?: string;
  name: string;
  scope: string;
  category: string;
  amount: number;
  frequency: string;
  start_date: string;
  next_run_date: string;
  next_due_date?: string;
  owner_type?: 'personal' | 'business';
  business_unit_id?: string;
  due_date?: string;
  is_required?: boolean;
  is_active?: boolean;
  last_paid_date?: string;
  reminder_days_before?: number;
  notifications_enabled?: boolean;
  snoozed_until?: string | null;
  monthly_amount?: number;
  annual_amount?: number;
  recurrence_type?: string;
  weekdays?: string[];
  month_days?: number[];
  annual_month?: number;
  annual_day?: number;
  interval_number?: number;
  interval_type?: string;
  payment_method?: string;
  mode: string;
  status: string;
  business_id?: string;
  account_id?: string;
  notes?: string;
};

export type RecurringExpensePayment = {
  id: string;
  user_id?: string;
  recurring_expense_id: string;
  owner_type?: 'personal' | 'business';
  business_unit_id?: string | null;
  amount: number;
  due_date: string;
  paid_date?: string | null;
  status: 'pending' | 'paid' | 'skipped' | 'overdue' | 'postponed';
  payment_method?: string | null;
  transaction_id?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Debt = {
  id: string;
  user_id?: string;
  name: string;
  type: string;
  debt_type?: string;
  category?: string;
  owner_type?: 'personal' | 'business';
  business_unit_id?: string;
  business_id?: string;
  original_amount: number;
  pending: number;
  current_balance?: number;
  paid: number;
  minimum: number;
  minimum_payment?: number;
  recommended_payment?: number;
  extra_payment?: number;
  payment_frequency?: string;
  due_date?: string;
  interest: number;
  interest_rate?: number;
  interest_rate_type?: string;
  cut_date?: string;
  credit_limit?: number;
  credit_utilization?: number;
  strategy?: string;
  priority?: string;
  status?: string;
  risk?: string;
  recommendation?: string;
  notes?: string;
};

export type CreditCard = {
  id: string;
  user_id?: string;
  owner_type?: 'personal' | 'business';
  business_unit_id?: string | null;
  debt_id?: string | null;
  name: string;
  bank?: string | null;
  card_type: string;
  credit_limit: number;
  current_balance: number;
  available_credit?: number;
  credit_utilization?: number;
  cut_date?: string | null;
  payment_due_date?: string | null;
  minimum_payment?: number;
  recommended_payment?: number;
  ideal_payment?: number;
  annual_interest_rate?: number;
  estimated_monthly_interest?: number;
  status?: string;
  account_id?: string | null;
  notes?: string | null;
  legacy_account_id?: string;
};

export type CreditCardPayment = {
  id: string;
  user_id?: string;
  credit_card_id: string;
  debt_id?: string | null;
  amount: number;
  payment_date: string;
  payment_method?: string | null;
  account_id?: string | null;
  transaction_id?: string | null;
  notes?: string | null;
};

export type Investment = {
  id: string;
  user_id?: string;
  name: string;
  amount: number;
  category?: string;
  owner_type?: 'personal' | 'business';
  business_unit_id?: string;
  business_id?: string;
  account_id?: string;
  investment_date?: string;
  expected_return?: number;
  status?: string;
  notes?: string;
};

export type MonthlyTarget = {
  id?: string;
  user_id?: string;
  operating_days_per_month: number;
  personal_budget_target: number;
  free_spending_limit?: number;
  savings_goal?: number;
  extra_debt_payment?: number;
  emergency_fund?: number;
  budget_mode?: 'conservador' | 'balanceado' | 'agresivo' | string;
  debt_payment_target: number;
  reinvestment_target: number;
  desired_profit: number;
  reserve_target: number;
  growth_target: number;
};

export type BusinessTargetWeight = {
  id?: string;
  user_id?: string;
  business_unit_id: string;
  weight_percent: number;
};

type AppState = {
  user: User | null;
  businesses: Business[];
  isLoading: boolean;
  isPreviewMode: boolean;
  lastSyncedAt: string | null;
  dataError: string | null;
  activeBusinessId: string | 'all' | 'personal';
  accounts: Account[];
  transactions: Transaction[];
  protectedFunds: ProtectedFund[];
  savingsGoals: SavingsGoal[];
  savingsGoalContributions: SavingsGoalContribution[];
  recurringExpenses: RecurringExpense[];
  recurringExpensePayments: RecurringExpensePayment[];
  debts: Debt[];
  creditCards: CreditCard[];
  creditCardPayments: CreditCardPayment[];
  investments: Investment[];
  monthlyTarget: MonthlyTarget | null;
  businessTargetWeights: BusinessTargetWeight[];
  setActiveBusinessId: (id: string | 'all' | 'personal') => void;
  setAccounts: (accounts: Account[]) => void;
  setPreviewMode: (val: boolean) => void;
  fetchInitialData: () => Promise<void>;
  signOut: () => Promise<void>;
  createBusiness: (input: { name: string; type?: string }) => Promise<Business>;
  createAccount: (input: {
    name: string;
    type: string;
    bank_name?: string;
    current_balance: number;
    is_personal: boolean;
    business_id?: string;
    status?: string;
  }) => Promise<Account>;
  updateAccount: (id: string, input: {
    name: string;
    type: string;
    bank_name?: string;
    current_balance: number;
    is_personal: boolean;
    business_id?: string;
    status?: string;
  }) => Promise<Account>;
  deleteAccount: (id: string) => Promise<void>;
  createTransaction: (input: {
    type: 'ingreso' | 'gasto';
    scope: 'personal' | 'negocio';
    amount: number;
    category: string;
    status?: string;
    notes?: string;
    business_id?: string | null;
    account_id: string;
  }) => Promise<Transaction>;
  transferFunds: (input: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    notes?: string;
  }) => Promise<void>;
  createProtectedFund: (input: {
    name: string;
    scope: 'personal' | 'negocio';
    owner_type?: 'personal' | 'business';
    business_unit_id?: string | null;
    fund_type: string;
    amount: number;
    priority: string;
    target_date?: string;
    block_withdrawals: boolean;
    business_id?: string | null;
    account_id?: string | null;
    notes?: string;
  }) => Promise<ProtectedFund>;
  updateProtectedFund: (id: string, input: {
    name: string;
    scope: 'personal' | 'negocio';
    owner_type?: 'personal' | 'business';
    business_unit_id?: string | null;
    fund_type: string;
    amount: number;
    priority: string;
    target_date?: string;
    block_withdrawals: boolean;
    status?: string;
    business_id?: string | null;
    account_id?: string | null;
    notes?: string;
  }) => Promise<ProtectedFund>;
  deleteProtectedFund: (id: string) => Promise<void>;
  createSavingsGoal: (input: Omit<SavingsGoal, 'id' | 'user_id'>) => Promise<SavingsGoal>;
  updateSavingsGoal: (id: string, input: Omit<SavingsGoal, 'id' | 'user_id'>) => Promise<SavingsGoal>;
  deleteSavingsGoal: (id: string) => Promise<void>;
  contributeToSavingsGoal: (id: string, input: { amount: number; contribution_date: string; account_id?: string | null; payment_method?: string | null; notes?: string }) => Promise<void>;
  createRecurringExpense: (input: {
    name: string;
    scope: 'personal' | 'negocio';
    category: string;
    amount: number;
    frequency: string;
    start_date: string;
    next_run_date: string;
    next_due_date?: string | null;
    owner_type?: 'personal' | 'business';
    business_unit_id?: string | null;
    due_date?: string | null;
    is_required?: boolean;
    is_active?: boolean;
    last_paid_date?: string | null;
    monthly_amount?: number;
    annual_amount?: number;
    recurrence_type?: string;
    weekdays?: string[];
    month_days?: number[];
    annual_month?: number | null;
    annual_day?: number | null;
    interval_number?: number | null;
    interval_type?: string | null;
    payment_method?: string;
    mode: string;
    business_id?: string | null;
    account_id?: string | null;
    notes?: string;
  }) => Promise<RecurringExpense>;
  updateRecurringExpense: (id: string, input: {
    name: string;
    scope: 'personal' | 'negocio';
    category: string;
    amount: number;
    frequency: string;
    start_date?: string;
    next_run_date: string;
    next_due_date?: string | null;
    owner_type?: 'personal' | 'business';
    business_unit_id?: string | null;
    due_date?: string | null;
    is_active?: boolean;
    monthly_amount?: number;
    annual_amount?: number;
    recurrence_type?: string;
    weekdays?: string[];
    month_days?: number[];
    annual_month?: number | null;
    annual_day?: number | null;
    interval_number?: number | null;
    interval_type?: string | null;
    payment_method?: string;
    mode?: string;
    business_id?: string | null;
    account_id?: string | null;
    notes?: string;
  }) => Promise<RecurringExpense>;
  markRecurringExpensePaid: (id: string, dueDate?: string) => Promise<void>;
  postponeRecurringExpensePayment: (id: string, untilDate: string, dueDate?: string) => Promise<void>;
  skipRecurringExpensePayment: (id: string, dueDate?: string) => Promise<void>;
  updateRecurringExpenseStatus: (id: string, status: string) => Promise<void>;
  deleteRecurringExpense: (id: string) => Promise<void>;
  upsertMonthlyTarget: (input: Omit<MonthlyTarget, 'id' | 'user_id'>) => Promise<MonthlyTarget>;
  upsertBusinessTargetWeights: (weights: { business_unit_id: string; weight_percent: number }[]) => Promise<BusinessTargetWeight[]>;
  createDebt: (input: {
    name: string;
    type: string;
    debt_type?: string;
    category?: string;
    owner_type?: 'personal' | 'business';
    business_unit_id?: string | null;
    business_id?: string | null;
    original_amount: number;
    pending: number;
    current_balance?: number;
    paid?: number;
    minimum?: number;
    minimum_payment?: number;
    recommended_payment?: number;
    extra_payment?: number;
    payment_frequency?: string;
    due_date?: string;
    interest?: number;
    interest_rate?: number;
    interest_rate_type?: string;
    cut_date?: string;
    credit_limit?: number;
    credit_utilization?: number;
    strategy?: string;
    priority?: string;
    status?: string;
    risk?: string;
    recommendation?: string;
    notes?: string;
  }) => Promise<Debt>;
  updateDebt: (id: string, input: {
    name: string;
    type: string;
    debt_type?: string;
    category?: string;
    owner_type?: 'personal' | 'business';
    business_unit_id?: string | null;
    business_id?: string | null;
    original_amount: number;
    pending: number;
    current_balance?: number;
    paid?: number;
    minimum?: number;
    minimum_payment?: number;
    recommended_payment?: number;
    extra_payment?: number;
    payment_frequency?: string;
    due_date?: string;
    interest?: number;
    interest_rate?: number;
    interest_rate_type?: string;
    cut_date?: string;
    credit_limit?: number;
    credit_utilization?: number;
    strategy?: string;
    priority?: string;
    status?: string;
    risk?: string;
    recommendation?: string;
    notes?: string;
  }) => Promise<Debt>;
  registerDebtPayment: (id: string, amount: number) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  createCreditCard: (input: Omit<CreditCard, 'id' | 'user_id'> & { create_linked_debt?: boolean }) => Promise<CreditCard>;
  updateCreditCard: (id: string, input: Omit<CreditCard, 'id' | 'user_id'> & { create_linked_debt?: boolean }) => Promise<CreditCard>;
  deleteCreditCard: (id: string) => Promise<void>;
  registerCreditCardPayment: (id: string, input: { amount: number; payment_date: string; payment_method?: string; account_id?: string | null; notes?: string }) => Promise<void>;
  createInvestment: (input: {
    name: string;
    amount: number;
    category?: string;
    owner_type?: 'personal' | 'business';
    business_unit_id?: string | null;
    business_id?: string | null;
    account_id?: string | null;
    investment_date?: string;
    expected_return?: number;
    status?: string;
    notes?: string;
  }) => Promise<Investment>;
  updateInvestment: (id: string, input: {
    name: string;
    amount: number;
    category?: string;
    owner_type?: 'personal' | 'business';
    business_unit_id?: string | null;
    business_id?: string | null;
    account_id?: string | null;
    investment_date?: string;
    expected_return?: number;
    status?: string;
    notes?: string;
  }) => Promise<Investment>;
  deleteInvestment: (id: string) => Promise<void>;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message);
  }
  return 'Error desconocido';
};

const requireSupabase = () => {
  if (!hasSupabaseConfig || !supabase) {
    throw new Error('Supabase no está configurado.');
  }
  return supabase;
};

const requireSignedUser = (user: User | null) => {
  if (!user || user.id === 'preview') {
    throw new Error('Debes iniciar sesión para guardar datos reales en Supabase.');
  }
  return user;
};

const parseMoney = (value: number) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('El monto debe ser mayor que cero.');
  }
  return amount;
};

const parseDateKey = (value: string) => {
  const [year, month, day] = value.split('T')[0].split('-').map(Number);
  if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
    return new Date(year, month - 1, day);
  }
  return new Date(value);
};

const addOneDay = (dateKey: string) => {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + 1);
  return date;
};

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const hasRecurringSchedule = (expense: RecurringExpense) => {
  const frequency = String(expense.frequency || '').toLowerCase();
  if (['weekly', 'semanal'].includes(frequency)) return Boolean(expense.weekdays?.length || expense.start_date);
  if (['biweekly', 'quincenal'].includes(frequency)) return Boolean(expense.month_days?.length || expense.start_date || expense.next_due_date || expense.due_date || expense.next_run_date);
  if (['monthly', 'mensual'].includes(frequency)) return Boolean(expense.month_days?.length || expense.start_date || expense.next_due_date || expense.due_date || expense.next_run_date);
  if (['annual', 'anual'].includes(frequency)) return Boolean((expense.annual_month && expense.annual_day) || expense.start_date);
  if (['custom', 'personalizado'].includes(frequency)) return Boolean(expense.interval_number && expense.interval_type && (expense.start_date || expense.next_due_date || expense.due_date || expense.next_run_date));
  return Boolean(expense.start_date || expense.next_due_date || expense.due_date || expense.next_run_date);
};

const calculateExpenseDueDate = (expense: RecurringExpense, fromDate = new Date()) => {
  if (expense.snoozed_until) return expense.snoozed_until;
  const storedDate = expense.next_due_date || expense.due_date || expense.next_run_date;
  if (!hasRecurringSchedule(expense)) {
    if (storedDate) return storedDate;
    throw new Error(`El gasto fijo "${expense.name}" no tiene programacion completa.`);
  }
  return calculateNextDueDate({
    amount: Number(expense.amount || 0),
    frequency: expense.frequency,
    startDate: expense.start_date || storedDate,
    recurrenceType: expense.recurrence_type,
    weekdays: expense.weekdays,
    monthDays: expense.month_days,
    annualMonth: expense.annual_month,
    annualDay: expense.annual_day,
    intervalNumber: expense.interval_number,
    intervalType: expense.interval_type,
  }, fromDate);
};

const legacyRecurringExpenseColumns = [
  'user_id',
  'name',
  'scope',
  'category',
  'amount',
  'frequency',
  'start_date',
  'next_run_date',
  'mode',
  'status',
  'business_id',
  'account_id',
  'notes',
];

const toLegacyRecurringExpensePayload = (payload: Record<string, unknown>) =>
  Object.fromEntries(legacyRecurringExpenseColumns.filter((key) => key in payload).map((key) => [key, payload[key]]));

const isMissingSchemaColumnError = (error: unknown) => {
  const message = getErrorMessage(error);
  return (
    (message.includes('Could not find the') && message.includes('column') && message.includes('schema cache')) ||
    (message.includes('Could not find the table') && message.includes('schema cache'))
  );
};

const legacyDebtColumns = [
  'user_id',
  'name',
  'type',
  'category',
  'original_amount',
  'pending',
  'paid',
  'minimum',
  'due_date',
  'interest',
  'priority',
  'status',
  'risk',
  'recommendation',
  'notes',
  'business_id',
];

const toLegacyDebtPayload = (payload: Record<string, unknown>) =>
  Object.fromEntries(legacyDebtColumns.filter((key) => key in payload).map((key) => [key, payload[key]]));

const creditCardColumns = [
  'user_id',
  'owner_type',
  'business_unit_id',
  'debt_id',
  'name',
  'bank',
  'card_type',
  'credit_limit',
  'current_balance',
  'available_credit',
  'credit_utilization',
  'cut_date',
  'payment_due_date',
  'minimum_payment',
  'recommended_payment',
  'ideal_payment',
  'annual_interest_rate',
  'estimated_monthly_interest',
  'status',
  'account_id',
  'notes',
];

const toCreditCardPayload = (payload: Record<string, unknown>) =>
  Object.fromEntries(creditCardColumns.filter((key) => key in payload).map((key) => [key, payload[key]]));

const legacyMonthlyTargetColumns = [
  'user_id',
  'operating_days_per_month',
  'personal_budget_target',
  'debt_payment_target',
  'reinvestment_target',
  'desired_profit',
  'reserve_target',
  'growth_target',
  'updated_at',
];

const toLegacyMonthlyTargetPayload = (payload: Record<string, unknown>) =>
  Object.fromEntries(legacyMonthlyTargetColumns.filter((key) => key in payload).map((key) => [key, payload[key]]));

const savingsGoalColumns = [
  'user_id',
  'owner_type',
  'business_unit_id',
  'name',
  'goal_type',
  'target_amount',
  'current_amount',
  'weekly_contribution_target',
  'monthly_contribution_target',
  'target_date',
  'priority',
  'account_id',
  'is_protected',
  'status',
  'notes',
];

const toSavingsGoalPayload = (payload: Record<string, unknown>) =>
  Object.fromEntries(savingsGoalColumns.filter((key) => key in payload).map((key) => [key, payload[key]]));

export const useStore = create<AppState>((set, get) => ({
  user: null,
  businesses: [],
  isLoading: true,
  isPreviewMode: false,
  lastSyncedAt: null,
  dataError: null,
  activeBusinessId: 'all',
  setActiveBusinessId: (id) => set({ activeBusinessId: id }),
  accounts: [],
  transactions: [],
  protectedFunds: [],
  savingsGoals: [],
  savingsGoalContributions: [],
  recurringExpenses: [],
  recurringExpensePayments: [],
  debts: [],
  creditCards: [],
  creditCardPayments: [],
  investments: [],
  monthlyTarget: null,
  businessTargetWeights: [],
  setPreviewMode: (val) => set({ isPreviewMode: val, isLoading: false, user: val ? { id: 'preview', email: 'preview@example.com' } : null }),
  setAccounts: (accounts) => set({ accounts }),
  fetchInitialData: async () => {
    if (!hasSupabaseConfig || !supabase) {
      set({ isLoading: false, dataError: 'Supabase no esta configurado.' });
      return;
    }

    try {
      set({ dataError: null });
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        set({ user: { id: session.user.id, email: session.user.email || '' } });
        
        const results = await Promise.all([
          supabase.from('businesses').select('*').eq('user_id', session.user.id).order('created_at', { ascending: true }),
          supabase.from('accounts').select('*').eq('user_id', session.user.id).order('created_at', { ascending: true }),
          supabase.from('transactions').select('*').eq('user_id', session.user.id).order('date', { ascending: false }),
          supabase.from('protected_funds').select('*').eq('user_id', session.user.id).order('created_at', { ascending: true }),
          supabase.from('recurring_expenses').select('*').eq('user_id', session.user.id).order('next_run_date', { ascending: true }),
          supabase.from('debts').select('*').eq('user_id', session.user.id).order('created_at', { ascending: true }),
          supabase.from('investments').select('*').eq('user_id', session.user.id).order('created_at', { ascending: true })
        ]);

        const firstError = results.find((result, index) => index !== 6 && result.error)?.error;
        if (firstError) throw firstError;

        const [
          { data: businesses },
          { data: accounts },
          { data: transactions },
          { data: protectedFunds },
          { data: recurringExpenses },
          { data: debts },
          { data: investments, error: investmentsError }
        ] = results;
        if (investmentsError) console.warn('Investments unavailable:', getErrorMessage(investmentsError));

        const [monthlyTargetResult, businessWeightsResult] = await Promise.all([
          supabase.from('monthly_targets').select('*').eq('user_id', session.user.id).maybeSingle(),
          supabase.from('business_target_weights').select('*').eq('user_id', session.user.id).order('created_at', { ascending: true })
        ]);
        const paymentsResult = await supabase
          .from('recurring_expense_payments')
          .select('*')
          .eq('user_id', session.user.id)
          .order('due_date', { ascending: false });
        const savingsResult = await supabase
          .from('savings_goals')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: true });
        const savingsContributionsResult = await supabase
          .from('savings_goal_contributions')
          .select('*')
          .eq('user_id', session.user.id)
          .order('contribution_date', { ascending: false });
        const cardsResult = await supabase
          .from('credit_cards')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: true });
        const cardPaymentsResult = await supabase
          .from('credit_card_payments')
          .select('*')
          .eq('user_id', session.user.id)
          .order('payment_date', { ascending: false });

        const optionalTargetError = monthlyTargetResult.error && monthlyTargetResult.error.code !== 'PGRST116';
        const optionalWeightsError = businessWeightsResult.error;
        const optionalPaymentsError = paymentsResult.error;
        const optionalSavingsError = savingsResult.error;
        const optionalSavingsContributionsError = savingsContributionsResult.error;
        const optionalCardsError = cardsResult.error;
        const optionalCardPaymentsError = cardPaymentsResult.error;
        if (optionalTargetError) console.warn('Monthly targets unavailable:', getErrorMessage(monthlyTargetResult.error));
        if (optionalWeightsError) console.warn('Business target weights unavailable:', getErrorMessage(optionalWeightsError));
        if (optionalPaymentsError) console.warn('Recurring expense payments unavailable:', getErrorMessage(optionalPaymentsError));
        if (optionalSavingsError) console.warn('Savings goals unavailable:', getErrorMessage(optionalSavingsError));
        if (optionalSavingsContributionsError) console.warn('Savings goal contributions unavailable:', getErrorMessage(optionalSavingsContributionsError));
        if (optionalCardsError) console.warn('Credit cards unavailable:', getErrorMessage(optionalCardsError));
        if (optionalCardPaymentsError) console.warn('Credit card payments unavailable:', getErrorMessage(optionalCardPaymentsError));

        set({
          businesses: businesses || [],
          accounts: accounts || [],
          transactions: transactions || [],
          protectedFunds: protectedFunds || [],
          savingsGoals: optionalSavingsError ? [] : ((savingsResult.data || []) as SavingsGoal[]),
          savingsGoalContributions: optionalSavingsContributionsError ? [] : ((savingsContributionsResult.data || []) as SavingsGoalContribution[]),
          recurringExpenses: recurringExpenses || [],
          recurringExpensePayments: optionalPaymentsError ? [] : ((paymentsResult.data || []) as RecurringExpensePayment[]),
          debts: debts || [],
          creditCards: optionalCardsError ? [] : ((cardsResult.data || []) as CreditCard[]),
          creditCardPayments: optionalCardPaymentsError ? [] : ((cardPaymentsResult.data || []) as CreditCardPayment[]),
          investments: investmentsError ? [] : (investments || []),
          monthlyTarget: optionalTargetError ? null : (monthlyTargetResult.data as MonthlyTarget | null),
          businessTargetWeights: optionalWeightsError ? [] : ((businessWeightsResult.data || []) as BusinessTargetWeight[]),
          lastSyncedAt: new Date().toISOString(),
          dataError: null
        });
      } else {
        set({
          user: null,
          businesses: [],
          accounts: [],
          transactions: [],
          protectedFunds: [],
          savingsGoals: [],
          savingsGoalContributions: [],
          recurringExpenses: [],
          recurringExpensePayments: [],
          debts: [],
          creditCards: [],
          creditCardPayments: [],
          investments: [],
          monthlyTarget: null,
          businessTargetWeights: [],
          lastSyncedAt: new Date().toISOString(),
          dataError: null
        });
      }
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('Error fetching initial data:', message);
      set({ dataError: message, lastSyncedAt: new Date().toISOString() });
    } finally {
      set({ isLoading: false });
    }
  },
  signOut: async () => {
    if (supabase) {
      await supabase.auth.signOut();
      set({ user: null, businesses: [], accounts: [], transactions: [], protectedFunds: [], savingsGoals: [], savingsGoalContributions: [], recurringExpenses: [], recurringExpensePayments: [], debts: [], creditCards: [], creditCardPayments: [], investments: [], monthlyTarget: null, businessTargetWeights: [], lastSyncedAt: null, dataError: null });
    }
  },
  createBusiness: async (input) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const name = input.name.trim();
    if (!name) throw new Error('El nombre del negocio es obligatorio.');

    const { data, error } = await client
      .from('businesses')
      .insert({ user_id: user.id, name, type: input.type?.trim() || 'Negocio' })
      .select('*')
      .single();

    if (error) throw new Error(getErrorMessage(error));
    const business = data as Business;
    set({ businesses: [...get().businesses, business] });
    await get().fetchInitialData();
    return business;
  },
  createAccount: async (input) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const name = input.name.trim();
    if (!name) throw new Error('El nombre de la cuenta es obligatorio.');
    if (!input.type) throw new Error('Selecciona el tipo de cuenta.');
    if (!input.is_personal && !input.business_id) throw new Error('Selecciona el negocio de esta cuenta.');

    const currentBalance = Number(input.current_balance);
    if (!Number.isFinite(currentBalance)) throw new Error('El saldo inicial no es válido.');

    const { data, error } = await client
      .from('accounts')
      .insert({
        user_id: user.id,
        name,
        type: input.type,
        bank_name: input.bank_name?.trim() || null,
        current_balance: currentBalance,
        is_personal: input.is_personal,
        business_id: input.is_personal ? null : input.business_id || null,
        status: input.status || 'active'
      })
      .select('*')
      .single();

    if (error) throw new Error(getErrorMessage(error));
    const account = data as Account;
    set({ accounts: [...get().accounts, account] });
    await get().fetchInitialData();
    return account;
  },
  updateAccount: async (id, input) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const name = input.name.trim();
    if (!name) throw new Error('El nombre de la cuenta es obligatorio.');
    if (!input.type) throw new Error('Selecciona el tipo de cuenta.');
    if (!input.is_personal && !input.business_id) throw new Error('Selecciona el negocio de esta cuenta.');

    const currentBalance = Number(input.current_balance);
    if (!Number.isFinite(currentBalance)) throw new Error('El saldo no es válido.');

    const { data, error } = await client
      .from('accounts')
      .update({
        name,
        type: input.type,
        bank_name: input.bank_name?.trim() || null,
        current_balance: currentBalance,
        is_personal: input.is_personal,
        business_id: input.is_personal ? null : input.business_id || null,
        status: input.status || 'active'
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) throw new Error(getErrorMessage(error));
    const account = data as Account;
    set({ accounts: get().accounts.map((item) => item.id === id ? account : item) });
    await get().fetchInitialData();
    return account;
  },
  deleteAccount: async (id) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const { error } = await client.from('accounts').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(getErrorMessage(error));
    set({ accounts: get().accounts.filter((account) => account.id !== id) });
    await get().fetchInitialData();
  },
  createTransaction: async (input) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const amount = parseMoney(input.amount);
    if (!input.category.trim()) throw new Error('Selecciona una categoría.');
    if (!input.account_id) throw new Error('Selecciona la cuenta del movimiento.');
    if (input.scope === 'negocio' && !input.business_id) throw new Error('Selecciona el negocio del movimiento.');

    const account = get().accounts.find((item) => item.id === input.account_id);
    if (!account) throw new Error('La cuenta seleccionada no existe.');

    const { data, error } = await client
      .from('transactions')
      .insert({
        user_id: user.id,
        type: input.type,
        scope: input.scope,
        business_id: input.scope === 'negocio' ? input.business_id : null,
        account_id: input.account_id,
        amount,
        category: input.category.trim(),
        status: input.status || (input.type === 'ingreso' ? 'recibido' : 'pagado'),
        notes: input.notes?.trim() || null
      })
      .select('*')
      .single();

    if (error) throw new Error(getErrorMessage(error));

    const nextBalance = input.type === 'ingreso'
      ? Number(account.current_balance) + amount
      : Number(account.current_balance) - amount;

    const { error: balanceError } = await client
      .from('accounts')
      .update({ current_balance: nextBalance })
      .eq('id', account.id)
      .eq('user_id', user.id);

    if (balanceError) throw new Error(getErrorMessage(balanceError));

    const transaction = data as Transaction;
    set({
      transactions: [transaction, ...get().transactions],
      accounts: get().accounts.map((item) => item.id === account.id ? { ...item, current_balance: nextBalance } : item)
    });
    await get().fetchInitialData();
    return transaction;
  },
  transferFunds: async (input) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const amount = parseMoney(input.amount);
    if (!input.fromAccountId || !input.toAccountId) throw new Error('Selecciona cuenta origen y destino.');
    if (input.fromAccountId === input.toAccountId) throw new Error('La cuenta origen y destino deben ser distintas.');

    const fromAccount = get().accounts.find((account) => account.id === input.fromAccountId);
    const toAccount = get().accounts.find((account) => account.id === input.toAccountId);
    if (!fromAccount || !toAccount) throw new Error('No se encontraron las cuentas seleccionadas.');
    if (Number(fromAccount.current_balance) < amount) throw new Error('La cuenta origen no tiene saldo suficiente.');

    const fromBalance = Number(fromAccount.current_balance) - amount;
    const toBalance = Number(toAccount.current_balance) + amount;
    const nowNote = input.notes?.trim() || `Transferencia de ${fromAccount.name} a ${toAccount.name}`;

    const { error: fromError } = await client
      .from('accounts')
      .update({ current_balance: fromBalance })
      .eq('id', fromAccount.id)
      .eq('user_id', user.id);
    if (fromError) throw new Error(getErrorMessage(fromError));

    const { error: toError } = await client
      .from('accounts')
      .update({ current_balance: toBalance })
      .eq('id', toAccount.id)
      .eq('user_id', user.id);
    if (toError) throw new Error(getErrorMessage(toError));

    const { error: txError } = await client.from('transactions').insert([
      {
        user_id: user.id,
        type: 'gasto',
        scope: fromAccount.is_personal ? 'personal' : 'negocio',
        business_id: fromAccount.is_personal ? null : fromAccount.business_id || null,
        account_id: fromAccount.id,
        amount,
        category: 'transferencia',
        status: 'transferido',
        notes: nowNote
      },
      {
        user_id: user.id,
        type: 'ingreso',
        scope: toAccount.is_personal ? 'personal' : 'negocio',
        business_id: toAccount.is_personal ? null : toAccount.business_id || null,
        account_id: toAccount.id,
        amount,
        category: 'transferencia',
        status: 'transferido',
        notes: nowNote
      }
    ]);
    if (txError) throw new Error(getErrorMessage(txError));

    set({
      accounts: get().accounts.map((account) => {
        if (account.id === fromAccount.id) return { ...account, current_balance: fromBalance };
        if (account.id === toAccount.id) return { ...account, current_balance: toBalance };
        return account;
      })
    });
    await get().fetchInitialData();
  },
  createProtectedFund: async (input) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const name = input.name.trim();
    const amount = parseMoney(input.amount);
    if (!name) throw new Error('El nombre de la reserva es obligatorio.');
    if (!input.fund_type) throw new Error('Selecciona el tipo de reserva.');
    if (!input.priority) throw new Error('Selecciona la prioridad.');
    if (input.scope === 'negocio' && !input.business_id) throw new Error('Selecciona el negocio de esta reserva.');

    const { data, error } = await client
      .from('protected_funds')
      .insert({
        user_id: user.id,
        name,
        scope: input.scope,
        owner_type: input.owner_type || (input.scope === 'personal' ? 'personal' : 'business'),
        business_unit_id: input.business_unit_id || (input.scope === 'personal' ? 'personal' : input.business_id || null),
        fund_type: input.fund_type,
        amount,
        priority: input.priority,
        target_date: input.target_date || null,
        block_withdrawals: input.block_withdrawals,
        status: 'active',
        business_id: input.scope === 'negocio' ? input.business_id : null,
        account_id: input.account_id || null,
        notes: input.notes?.trim() || null
      })
      .select('*')
      .single();

    if (error) {
      const { data: legacyData, error: legacyError } = await client
        .from('protected_funds')
        .insert({
          user_id: user.id,
          name,
          scope: input.scope,
          fund_type: input.fund_type,
          amount,
          priority: input.priority,
          target_date: input.target_date || null,
          block_withdrawals: input.block_withdrawals,
          status: 'active',
          business_id: input.scope === 'negocio' ? input.business_id : null,
          account_id: input.account_id || null,
          notes: input.notes?.trim() || null
        })
        .select('*')
        .single();
      if (legacyError) throw new Error(getErrorMessage(legacyError));
      const fund = legacyData as ProtectedFund;
      set({ protectedFunds: [...get().protectedFunds, fund] });
      await get().fetchInitialData();
      return fund;
    }
    const fund = data as ProtectedFund;
    set({ protectedFunds: [...get().protectedFunds, fund] });
    await get().fetchInitialData();
    return fund;
  },
  updateProtectedFund: async (id, input) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const name = input.name.trim();
    const amount = Number(input.amount);
    if (!name) throw new Error('El nombre de la reserva es obligatorio.');
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('El monto debe ser mayor que cero.');
    if (!input.fund_type) throw new Error('Selecciona el tipo de reserva.');
    if (input.scope === 'negocio' && !input.business_id) throw new Error('Selecciona el negocio de esta reserva.');

    const payload = {
      name,
      scope: input.scope,
      owner_type: input.owner_type || (input.scope === 'personal' ? 'personal' : 'business'),
      business_unit_id: input.business_unit_id || (input.scope === 'personal' ? 'personal' : input.business_id || null),
      fund_type: input.fund_type,
      amount,
      priority: input.priority,
      target_date: input.target_date || null,
      block_withdrawals: input.block_withdrawals,
      status: input.status || 'active',
      business_id: input.scope === 'negocio' ? input.business_id : null,
      account_id: input.account_id || null,
      notes: input.notes?.trim() || null
    };

    const { data, error } = await client
      .from('protected_funds')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) {
      const legacyPayload = {
        name: payload.name,
        scope: payload.scope,
        fund_type: payload.fund_type,
        amount: payload.amount,
        priority: payload.priority,
        target_date: payload.target_date,
        block_withdrawals: payload.block_withdrawals,
        status: payload.status,
        business_id: payload.business_id,
        account_id: payload.account_id,
        notes: payload.notes
      };
      const { data: legacyData, error: legacyError } = await client
        .from('protected_funds')
        .update(legacyPayload)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*')
        .single();
      if (legacyError) throw new Error(getErrorMessage(legacyError));
      const fund = legacyData as ProtectedFund;
      set({ protectedFunds: get().protectedFunds.map((item) => item.id === id ? fund : item) });
      await get().fetchInitialData();
      return fund;
    }

    const fund = data as ProtectedFund;
    set({ protectedFunds: get().protectedFunds.map((item) => item.id === id ? fund : item) });
    await get().fetchInitialData();
    return fund;
  },
  deleteProtectedFund: async (id) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const { error } = await client.from('protected_funds').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(getErrorMessage(error));
    set({ protectedFunds: get().protectedFunds.filter((fund) => fund.id !== id) });
    await get().fetchInitialData();
  },
  createSavingsGoal: async (input) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const name = input.name.trim();
    const targetAmount = parseMoney(input.target_amount);
    const currentAmount = Math.max(0, Number(input.current_amount || 0));
    if (!name) throw new Error('El nombre de la meta es obligatorio.');
    if (!input.goal_type) throw new Error('Selecciona el tipo de meta.');

    const payload = toSavingsGoalPayload({
      ...input,
      user_id: user.id,
      owner_type: 'personal',
      business_unit_id: input.business_unit_id || 'personal',
      target_amount: targetAmount,
      current_amount: currentAmount,
      weekly_contribution_target: Number(input.weekly_contribution_target || 0),
      monthly_contribution_target: Number(input.monthly_contribution_target || 0),
      target_date: input.target_date || null,
      account_id: input.account_id || null,
      is_protected: Boolean(input.is_protected),
      status: input.status || 'Activa',
      notes: input.notes?.trim() || null,
    });

    const { data, error } = await client.from('savings_goals').insert(payload).select('*').single();
    if (error) {
      if (!isMissingSchemaColumnError(error)) throw new Error(getErrorMessage(error));
      const fund = await get().createProtectedFund({
        name,
        scope: 'personal',
        owner_type: 'personal',
        business_unit_id: 'personal',
        fund_type: input.goal_type,
        amount: currentAmount || targetAmount,
        priority: input.priority || 'Media',
        target_date: input.target_date || undefined,
        block_withdrawals: Boolean(input.is_protected),
        account_id: input.account_id || null,
        notes: input.notes || '',
      });
      return {
        id: fund.id,
        legacy_fund_id: fund.id,
        name: fund.name,
        goal_type: fund.fund_type,
        target_amount: Number(input.target_amount || fund.amount || 0),
        current_amount: Number(input.current_amount || fund.amount || 0),
        target_date: fund.target_date,
        priority: fund.priority,
        account_id: fund.account_id,
        is_protected: fund.block_withdrawals,
        status: fund.status === 'active' ? 'Activa' : fund.status,
        notes: fund.notes,
      } as SavingsGoal;
    }

    const goal = data as SavingsGoal;
    set({ savingsGoals: [...get().savingsGoals, goal] });
    await get().fetchInitialData();
    return goal;
  },
  updateSavingsGoal: async (id, input) => {
    if (input.legacy_fund_id) {
      const fund = await get().updateProtectedFund(input.legacy_fund_id, {
        name: input.name,
        scope: 'personal',
        owner_type: 'personal',
        business_unit_id: 'personal',
        fund_type: input.goal_type,
        amount: Number(input.current_amount || input.target_amount || 0),
        priority: input.priority || 'Media',
        target_date: input.target_date || undefined,
        block_withdrawals: Boolean(input.is_protected),
        status: input.status === 'Activa' ? 'active' : input.status,
        account_id: input.account_id || null,
        notes: input.notes || '',
      });
      return { ...input, id: fund.id, legacy_fund_id: fund.id } as SavingsGoal;
    }

    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const payload = toSavingsGoalPayload({
      ...input,
      owner_type: 'personal',
      business_unit_id: input.business_unit_id || 'personal',
      target_amount: Number(input.target_amount || 0),
      current_amount: Number(input.current_amount || 0),
      weekly_contribution_target: Number(input.weekly_contribution_target || 0),
      monthly_contribution_target: Number(input.monthly_contribution_target || 0),
      target_date: input.target_date || null,
      account_id: input.account_id || null,
      is_protected: Boolean(input.is_protected),
      status: input.status || 'Activa',
      notes: input.notes?.trim() || null,
    });

    const { data, error } = await client.from('savings_goals').update(payload).eq('id', id).eq('user_id', user.id).select('*').single();
    if (error) throw new Error(getErrorMessage(error));
    const goal = data as SavingsGoal;
    set({ savingsGoals: get().savingsGoals.map((item) => item.id === id ? goal : item) });
    await get().fetchInitialData();
    return goal;
  },
  deleteSavingsGoal: async (id) => {
    const legacy = get().savingsGoals.find((goal) => goal.id === id)?.legacy_fund_id;
    if (legacy) {
      await get().deleteProtectedFund(legacy);
      return;
    }
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const { error } = await client.from('savings_goals').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(getErrorMessage(error));
    set({ savingsGoals: get().savingsGoals.filter((goal) => goal.id !== id) });
    await get().fetchInitialData();
  },
  contributeToSavingsGoal: async (id, input) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const goal = get().savingsGoals.find((item) => item.id === id);
    if (!goal) throw new Error('No se encontro la meta.');
    const amount = parseMoney(input.amount);
    const nextAmount = Math.min(Number(goal.target_amount || 0), Number(goal.current_amount || 0) + amount);
    let transactionId: string | null = null;

    if (input.account_id) {
      const account = get().accounts.find((item) => item.id === input.account_id);
      if (!account) throw new Error('La cuenta origen no existe.');
      if (Number(account.current_balance || 0) < amount) throw new Error('La cuenta origen no tiene saldo suficiente.');
      const { data: transactionData, error: transactionError } = await client.from('transactions').insert({
        user_id: user.id,
        type: 'gasto',
        scope: 'personal',
        amount,
        category: 'Ahorro personal',
        payment_method: input.payment_method || null,
        account_id: input.account_id,
        status: 'ahorro',
        notes: input.notes?.trim() || `Aporte a ${goal.name}`,
        date: input.contribution_date,
        owner_type: 'personal',
      }).select('id').single();
      if (transactionError) console.warn('Savings contribution transaction unavailable:', getErrorMessage(transactionError));
      transactionId = (transactionData as { id?: string } | null)?.id || null;

      const { error: accountError } = await client
        .from('accounts')
        .update({ current_balance: Number(account.current_balance || 0) - amount })
        .eq('id', account.id)
        .eq('user_id', user.id);
      if (accountError) throw new Error(getErrorMessage(accountError));
    }

    if (!goal.legacy_fund_id) {
      const { error: contributionError } = await client.from('savings_goal_contributions').insert({
        user_id: user.id,
        savings_goal_id: id,
        amount,
        contribution_date: input.contribution_date,
        account_id: input.account_id || null,
        payment_method: input.payment_method || null,
        transaction_id: transactionId,
        notes: input.notes?.trim() || null,
      });
      if (contributionError && !isMissingSchemaColumnError(contributionError)) throw new Error(getErrorMessage(contributionError));
    }

    await get().updateSavingsGoal(id, {
      ...goal,
      current_amount: nextAmount,
      status: nextAmount >= Number(goal.target_amount || 0) ? 'Completada' : goal.status || 'Activa',
    });
  },
  createRecurringExpense: async (input) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const name = input.name.trim();
    const amount = parseMoney(input.amount);
    if (!name) throw new Error('El nombre del gasto recurrente es obligatorio.');
    if (!input.category.trim()) throw new Error('La categoría es obligatoria.');
    if (!input.start_date || !input.next_run_date) throw new Error('Selecciona las fechas del recurrente.');
    if (input.scope === 'negocio' && !input.business_id) throw new Error('Selecciona el negocio del recurrente.');

    const schedule = calculateRecurrence({
      amount,
      frequency: input.frequency,
      startDate: input.start_date,
      recurrenceType: input.recurrence_type,
      weekdays: input.weekdays,
      monthDays: input.month_days,
      annualMonth: input.annual_month || undefined,
      annualDay: input.annual_day || undefined,
      intervalNumber: input.interval_number || undefined,
      intervalType: input.interval_type || undefined,
    });

    const payload = {
      user_id: user.id,
      name,
      scope: input.scope,
      category: input.category.trim(),
      amount,
      frequency: input.frequency,
      start_date: input.start_date,
      next_run_date: schedule.nextDueDate,
      next_due_date: schedule.nextDueDate,
      owner_type: input.owner_type || (input.scope === 'personal' ? 'personal' : 'business'),
      business_unit_id: input.business_unit_id || (input.scope === 'personal' ? 'personal' : input.business_id || 'shared'),
      due_date: schedule.nextDueDate,
      is_required: input.is_required ?? true,
      is_active: input.is_active ?? true,
      last_paid_date: input.last_paid_date || null,
      monthly_amount: input.monthly_amount ?? schedule.monthlyAmount,
      annual_amount: input.annual_amount ?? schedule.annualAmount,
      recurrence_type: input.recurrence_type || schedule.recurrenceType,
      weekdays: input.weekdays || [],
      month_days: input.month_days || [],
      annual_month: input.annual_month || null,
      annual_day: input.annual_day || null,
      interval_number: input.interval_number || null,
      interval_type: input.interval_type || null,
      payment_method: input.payment_method?.trim() || null,
      mode: input.mode,
      status: input.is_active === false ? 'paused' : 'active',
      business_id: input.scope === 'negocio' ? input.business_id : null,
      account_id: input.account_id || null,
      notes: input.notes?.trim() || null
    };

    const { data, error } = await client
      .from('recurring_expenses')
      .insert(payload)
      .select('*')
      .single();

    let savedData = data;
    if (error) {
      if (!isMissingSchemaColumnError(error)) throw new Error(`Supabase recurring_expenses insert: ${getErrorMessage(error)}`);
      const { data: legacyData, error: legacyError } = await client
        .from('recurring_expenses')
        .insert(toLegacyRecurringExpensePayload(payload))
        .select('*')
        .single();
      if (legacyError) throw new Error(`Supabase recurring_expenses insert: ${getErrorMessage(legacyError)}`);
      savedData = legacyData;
    }

    const expense = { ...payload, ...(savedData as object) } as RecurringExpense;
    set({ recurringExpenses: [...get().recurringExpenses, expense] });
    await get().fetchInitialData();
    return expense;
  },
  updateRecurringExpense: async (id, input) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const name = input.name.trim();
    const amount = Number(input.amount);
    if (!name) throw new Error('El nombre del gasto fijo es obligatorio.');
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('El monto debe ser mayor que cero.');
    if (!input.category.trim()) throw new Error('La categoria es obligatoria.');
    if (!input.next_run_date) throw new Error('Selecciona la fecha de pago.');

    const schedule = calculateRecurrence({
      amount,
      frequency: input.frequency,
      startDate: input.start_date || input.next_run_date,
      recurrenceType: input.recurrence_type,
      weekdays: input.weekdays,
      monthDays: input.month_days,
      annualMonth: input.annual_month || undefined,
      annualDay: input.annual_day || undefined,
      intervalNumber: input.interval_number || undefined,
      intervalType: input.interval_type || undefined,
    });

    const payload = {
      name,
      scope: input.scope,
      category: input.category.trim(),
      amount,
      frequency: input.frequency,
      start_date: input.start_date || input.next_run_date,
      next_run_date: schedule.nextDueDate,
      next_due_date: schedule.nextDueDate,
      owner_type: input.owner_type || (input.scope === 'personal' ? 'personal' : 'business'),
      business_unit_id: input.business_unit_id || (input.scope === 'personal' ? 'personal' : input.business_id || 'shared'),
      due_date: schedule.nextDueDate,
      is_active: input.is_active ?? true,
      monthly_amount: input.monthly_amount ?? schedule.monthlyAmount,
      annual_amount: input.annual_amount ?? schedule.annualAmount,
      recurrence_type: input.recurrence_type || schedule.recurrenceType,
      weekdays: input.weekdays || [],
      month_days: input.month_days || [],
      annual_month: input.annual_month || null,
      annual_day: input.annual_day || null,
      interval_number: input.interval_number || null,
      interval_type: input.interval_type || null,
      payment_method: input.payment_method?.trim() || null,
      mode: input.mode || 'reminder',
      status: input.is_active === false ? 'paused' : 'active',
      business_id: input.scope === 'negocio' ? input.business_id : null,
      account_id: input.account_id || null,
      notes: input.notes?.trim() || null
    };

    const { data, error } = await client
      .from('recurring_expenses')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    let savedData = data;
    if (error) {
      if (!isMissingSchemaColumnError(error)) throw new Error(`Supabase recurring_expenses update: ${getErrorMessage(error)}`);
      const { data: legacyData, error: legacyError } = await client
        .from('recurring_expenses')
        .update(toLegacyRecurringExpensePayload(payload))
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*')
        .single();
      if (legacyError) throw new Error(`Supabase recurring_expenses update: ${getErrorMessage(legacyError)}`);
      savedData = legacyData;
    }

    const expense = { ...payload, ...(savedData as object) } as RecurringExpense;
    set({ recurringExpenses: get().recurringExpenses.map((item) => item.id === id ? expense : item) });
    await get().fetchInitialData();
    return expense;
  },
  markRecurringExpensePaid: async (id, dueDateOverride) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const expense = get().recurringExpenses.find((item) => item.id === id);
    if (!expense) throw new Error('No se encontro el gasto fijo.');
    const paidDate = formatDateKey(new Date());
    const dueDate = dueDateOverride || calculateExpenseDueDate(expense);
    const fromDate = addOneDay(dueDate);
    const nextDate = calculateNextDueDate({
      amount: Number(expense.amount || 0),
      frequency: expense.frequency,
      startDate: expense.start_date || expense.due_date || expense.next_run_date,
      recurrenceType: expense.recurrence_type,
      weekdays: expense.weekdays,
      monthDays: expense.month_days,
      annualMonth: expense.annual_month,
      annualDay: expense.annual_day,
      intervalNumber: expense.interval_number,
      intervalType: expense.interval_type,
    }, fromDate);

    const transactionPayload = {
      user_id: user.id,
      business_id: expense.owner_type === 'business' || expense.scope === 'negocio' ? expense.business_id || null : null,
      account_id: expense.account_id || null,
      type: 'gasto',
      scope: expense.scope === 'negocio' ? 'negocio' : 'personal',
      amount: Number(expense.amount || 0),
      category: expense.category || 'Gasto fijo',
      payment_method: expense.payment_method || null,
      status: 'pagado',
      notes: `Pago de gasto fijo: ${expense.name}`,
      date: paidDate,
      owner_type: expense.owner_type || (expense.scope === 'negocio' ? 'business' : 'personal'),
      business_unit_id: expense.business_unit_id || (expense.scope === 'negocio' ? expense.business_id || null : 'personal'),
      recurring_expense_id: expense.id
    };

    const { data: transactionData, error: transactionError } = await client.from('transactions').insert(transactionPayload).select('id').single();
    let transactionId = transactionData?.id || null;
    if (transactionError) {
      throw new Error(`Supabase transactions insert: ${getErrorMessage(transactionError)}`);
    }

    if (expense.account_id) {
      const account = get().accounts.find((item) => item.id === expense.account_id);
      if (account) {
        const nextBalance = Number(account.current_balance || 0) - Number(expense.amount || 0);
        const { error: accountError } = await client.from('accounts').update({ current_balance: nextBalance }).eq('id', account.id).eq('user_id', user.id);
        if (accountError) throw new Error(getErrorMessage(accountError));
      }
    }

    const payload = {
      last_paid_date: paidDate,
      next_run_date: nextDate,
      next_due_date: nextDate,
      due_date: nextDate,
      snoozed_until: null,
      status: 'active',
      is_active: true
    };

    const paymentPayload = {
      user_id: user.id,
      recurring_expense_id: expense.id,
      owner_type: expense.owner_type || (expense.scope === 'negocio' ? 'business' : 'personal'),
      business_unit_id: expense.business_unit_id || (expense.scope === 'negocio' ? expense.business_id || null : 'personal'),
      amount: Number(expense.amount || 0),
      due_date: dueDate,
      paid_date: paidDate,
      status: 'paid',
      payment_method: expense.payment_method || null,
      transaction_id: transactionId,
      notes: `Pago de gasto fijo: ${expense.name}`
    };
    const { error: paymentError } = await client.from('recurring_expense_payments').insert(paymentPayload);
    if (paymentError) throw new Error(`Supabase recurring_expense_payments insert: ${getErrorMessage(paymentError)}`);

    const { error } = await client.from('recurring_expenses').update(payload).eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(`Supabase recurring_expenses update: ${getErrorMessage(error)}`);
    set({
      recurringExpenses: get().recurringExpenses.map((item) => item.id === id ? { ...item, ...payload } : item)
    });
    await get().fetchInitialData();
  },
  postponeRecurringExpensePayment: async (id, untilDate, dueDateOverride) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const expense = get().recurringExpenses.find((item) => item.id === id);
    if (!expense) throw new Error('No se encontro el gasto fijo.');
    const dueDate = dueDateOverride || calculateExpenseDueDate(expense);
    const payload = {
      next_run_date: untilDate,
      next_due_date: untilDate,
      due_date: untilDate,
      snoozed_until: untilDate,
      status: 'active',
      is_active: true
    };

    const paymentPayload = {
      user_id: user.id,
      recurring_expense_id: expense.id,
      owner_type: 'personal',
      business_unit_id: 'personal',
      amount: Number(expense.amount || 0),
      due_date: dueDate,
      paid_date: null,
      status: 'postponed',
      payment_method: expense.payment_method || null,
      transaction_id: null,
      notes: `Pago pospuesto hasta ${untilDate}: ${expense.name}`
    };
    const { error: paymentError } = await client.from('recurring_expense_payments').insert(paymentPayload);
    if (paymentError) throw new Error(`Supabase recurring_expense_payments insert: ${getErrorMessage(paymentError)}`);

    const { error } = await client.from('recurring_expenses').update(payload).eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(`Supabase recurring_expenses update: ${getErrorMessage(error)}`);
    set({ recurringExpenses: get().recurringExpenses.map((item) => item.id === id ? { ...item, ...payload } : item) });
    await get().fetchInitialData();
  },
  skipRecurringExpensePayment: async (id, dueDateOverride) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const expense = get().recurringExpenses.find((item) => item.id === id);
    if (!expense) throw new Error('No se encontro el gasto fijo.');
    const dueDate = dueDateOverride || calculateExpenseDueDate(expense);
    const fromDate = addOneDay(dueDate);
    const nextDate = calculateNextDueDate({
      amount: Number(expense.amount || 0),
      frequency: expense.frequency,
      startDate: expense.start_date || expense.due_date || expense.next_run_date,
      recurrenceType: expense.recurrence_type,
      weekdays: expense.weekdays,
      monthDays: expense.month_days,
      annualMonth: expense.annual_month,
      annualDay: expense.annual_day,
      intervalNumber: expense.interval_number,
      intervalType: expense.interval_type,
    }, fromDate);

    const paymentPayload = {
      user_id: user.id,
      recurring_expense_id: expense.id,
      owner_type: 'personal',
      business_unit_id: 'personal',
      amount: Number(expense.amount || 0),
      due_date: dueDate,
      paid_date: null,
      status: 'skipped',
      payment_method: expense.payment_method || null,
      transaction_id: null,
      notes: `Pago omitido: ${expense.name}`
    };
    const { error: paymentError } = await client.from('recurring_expense_payments').insert(paymentPayload);
    if (paymentError) throw new Error(`Supabase recurring_expense_payments insert: ${getErrorMessage(paymentError)}`);

    const payload = { next_run_date: nextDate, next_due_date: nextDate, due_date: nextDate, snoozed_until: null, status: 'active', is_active: true };
    const { error } = await client.from('recurring_expenses').update(payload).eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(`Supabase recurring_expenses update: ${getErrorMessage(error)}`);
    set({ recurringExpenses: get().recurringExpenses.map((item) => item.id === id ? { ...item, ...payload } : item) });
    await get().fetchInitialData();
  },
  updateRecurringExpenseStatus: async (id, status) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const payload = { status, is_active: status === 'active' };
    const { error } = await client
      .from('recurring_expenses')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) {
      const { error: legacyError } = await client
        .from('recurring_expenses')
        .update({ status })
        .eq('id', id)
        .eq('user_id', user.id);
      if (legacyError) throw new Error(getErrorMessage(legacyError));
    }
    set({
      recurringExpenses: get().recurringExpenses.map((expense) => expense.id === id ? { ...expense, status, is_active: status === 'active' } : expense)
    });
    await get().fetchInitialData();
  },
  deleteRecurringExpense: async (id) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const { error } = await client.from('recurring_expenses').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(getErrorMessage(error));
    set({ recurringExpenses: get().recurringExpenses.filter((expense) => expense.id !== id) });
    await get().fetchInitialData();
  },
  upsertMonthlyTarget: async (input) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const payload = {
      user_id: user.id,
      operating_days_per_month: Math.max(1, Number(input.operating_days_per_month || 26)),
      personal_budget_target: Number(input.free_spending_limit ?? input.personal_budget_target ?? 0),
      free_spending_limit: Number(input.free_spending_limit ?? input.personal_budget_target ?? 0),
      savings_goal: Number(input.savings_goal || 0),
      extra_debt_payment: Number(input.extra_debt_payment || 0),
      emergency_fund: Number(input.emergency_fund || 0),
      budget_mode: input.budget_mode || 'balanceado',
      debt_payment_target: Number(input.extra_debt_payment ?? input.debt_payment_target ?? 0),
      reinvestment_target: Number(input.reinvestment_target || 0),
      desired_profit: Number(input.desired_profit || 0),
      reserve_target: Number(input.emergency_fund ?? input.reserve_target ?? 0),
      growth_target: Number(input.growth_target || 0),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await client
      .from('monthly_targets')
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error) {
      if (!isMissingSchemaColumnError(error)) throw new Error(getErrorMessage(error));
      const { data: legacyData, error: legacyError } = await client
        .from('monthly_targets')
        .upsert(toLegacyMonthlyTargetPayload(payload), { onConflict: 'user_id' })
        .select('*')
        .single();
      if (legacyError) throw new Error(getErrorMessage(legacyError));
      const legacyTarget = { ...payload, ...(legacyData as object) } as MonthlyTarget;
      set({ monthlyTarget: legacyTarget });
      await get().fetchInitialData();
      return legacyTarget;
    }
    const target = data as MonthlyTarget;
    set({ monthlyTarget: target });
    await get().fetchInitialData();
    return target;
  },
  upsertBusinessTargetWeights: async (weights) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const payload = weights
      .filter((weight) => weight.business_unit_id)
      .map((weight) => ({
        user_id: user.id,
        business_unit_id: weight.business_unit_id,
        weight_percent: Number(weight.weight_percent || 0),
        updated_at: new Date().toISOString()
      }));

    if (payload.length === 0) {
      set({ businessTargetWeights: [] });
      return [];
    }

    const { data, error } = await client
      .from('business_target_weights')
      .upsert(payload, { onConflict: 'user_id,business_unit_id' })
      .select('*');

    if (error) throw new Error(getErrorMessage(error));
    const nextWeights = (data || []) as BusinessTargetWeight[];
    set({ businessTargetWeights: nextWeights });
    await get().fetchInitialData();
    return nextWeights;
  },
  createDebt: async (input) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const name = input.name.trim();
    const originalAmount = parseMoney(input.original_amount);
    const pending = parseMoney(input.pending);
    if (!name) throw new Error('El nombre de la deuda es obligatorio.');
    if (!input.type.trim()) throw new Error('El tipo de deuda es obligatorio.');

    const payload = {
      user_id: user.id,
      name,
      type: input.type.trim(),
      debt_type: input.debt_type || input.type.trim(),
      category: input.category?.trim() || null,
      owner_type: input.owner_type || (input.business_id ? 'business' : 'personal'),
      business_unit_id: input.business_unit_id || input.business_id || (input.owner_type === 'personal' ? 'personal' : null),
      business_id: input.business_id || null,
      original_amount: originalAmount,
      pending,
      current_balance: input.current_balance ?? pending,
      paid: Number(input.paid || 0),
      minimum: Number(input.minimum ?? input.minimum_payment ?? 0),
      minimum_payment: Number(input.minimum_payment ?? input.minimum ?? 0),
      recommended_payment: Number(input.recommended_payment || 0),
      extra_payment: Number(input.extra_payment || 0),
      payment_frequency: input.payment_frequency || 'Mensual',
      due_date: input.due_date || null,
      interest: Number(input.interest ?? input.interest_rate ?? 0),
      interest_rate: Number(input.interest_rate ?? input.interest ?? 0),
      interest_rate_type: input.interest_rate_type || 'Anual',
      cut_date: input.cut_date || null,
      credit_limit: Number(input.credit_limit || 0),
      credit_utilization: Number(input.credit_utilization || 0),
      strategy: input.strategy || 'Metodo avalancha',
      priority: input.priority || 'Media',
      status: input.status || 'Al dia',
      risk: input.risk || 'Medio',
      recommendation: input.recommendation?.trim() || input.notes?.trim() || null,
      notes: input.notes?.trim() || null
    };

    const { data, error } = await client
      .from('debts')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      if (!isMissingSchemaColumnError(error)) throw new Error(getErrorMessage(error));
      const { data: legacyData, error: legacyError } = await client
        .from('debts')
        .insert(toLegacyDebtPayload(payload))
        .select('*')
        .single();
      if (legacyError) throw new Error(getErrorMessage(legacyError));
      const debt = { ...payload, ...(legacyData as object) } as Debt;
      set({ debts: [...get().debts, debt] });
      await get().fetchInitialData();
      return debt;
    }
    const debt = { ...payload, ...(data as object) } as Debt;
    set({ debts: [...get().debts, debt] });
    await get().fetchInitialData();
    return debt;
  },
  updateDebt: async (id, input) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const name = input.name.trim();
    const originalAmount = parseMoney(input.original_amount);
    const pending = Number(input.pending);
    if (!name) throw new Error('El nombre de la deuda es obligatorio.');
    if (!input.type.trim()) throw new Error('El tipo de deuda es obligatorio.');
    if (!Number.isFinite(pending) || pending < 0) throw new Error('El saldo pendiente no es valido.');

    const payload = {
      name,
      type: input.type.trim(),
      debt_type: input.debt_type || input.type.trim(),
      category: input.category?.trim() || null,
      owner_type: input.owner_type || (input.business_id ? 'business' : 'personal'),
      business_unit_id: input.business_unit_id || input.business_id || (input.owner_type === 'personal' ? 'personal' : null),
      business_id: input.business_id || null,
      original_amount: originalAmount,
      pending,
      current_balance: input.current_balance ?? pending,
      paid: Number(input.paid || 0),
      minimum: Number(input.minimum ?? input.minimum_payment ?? 0),
      minimum_payment: Number(input.minimum_payment ?? input.minimum ?? 0),
      recommended_payment: Number(input.recommended_payment || 0),
      extra_payment: Number(input.extra_payment || 0),
      payment_frequency: input.payment_frequency || 'Mensual',
      due_date: input.due_date || null,
      interest: Number(input.interest ?? input.interest_rate ?? 0),
      interest_rate: Number(input.interest_rate ?? input.interest ?? 0),
      interest_rate_type: input.interest_rate_type || 'Anual',
      cut_date: input.cut_date || null,
      credit_limit: Number(input.credit_limit || 0),
      credit_utilization: Number(input.credit_utilization || 0),
      strategy: input.strategy || 'Metodo avalancha',
      priority: input.priority || 'Media',
      status: input.status || (pending <= 0 ? 'Pagada' : 'Al dia'),
      risk: input.risk || 'Medio',
      recommendation: input.recommendation?.trim() || input.notes?.trim() || null,
      notes: input.notes?.trim() || null
    };

    const { data, error } = await client
      .from('debts')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) {
      if (!isMissingSchemaColumnError(error)) throw new Error(getErrorMessage(error));
      const legacyPayload = toLegacyDebtPayload(payload);
      const { data: legacyData, error: legacyError } = await client
        .from('debts')
        .update(legacyPayload)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*')
        .single();
      if (legacyError) throw new Error(getErrorMessage(legacyError));
      const debt = { ...payload, ...(legacyData as object) } as Debt;
      set({ debts: get().debts.map((item) => item.id === id ? debt : item) });
      await get().fetchInitialData();
      return debt;
    }

    const debt = { ...payload, ...(data as object) } as Debt;
    set({ debts: get().debts.map((item) => item.id === id ? debt : item) });
    await get().fetchInitialData();
    return debt;
  },
  registerDebtPayment: async (id, amountValue) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const debt = get().debts.find((item) => item.id === id);
    if (!debt) throw new Error('No se encontro la deuda.');
    const amount = parseMoney(amountValue);
    if (amount <= 0) throw new Error('El monto del abono debe ser mayor a cero.');
    const nextPaid = Number(debt.paid || 0) + amount;
    const currentBalance = Number(debt.current_balance ?? debt.pending ?? 0);
    const nextPending = Math.max(0, currentBalance - amount);

    const { error: paymentError } = await client
      .from('debt_payments')
      .insert({
        user_id: user.id,
        debt_id: id,
        owner_type: debt.owner_type || 'personal',
        business_unit_id: debt.business_unit_id || null,
        amount,
        payment_date: new Date().toISOString().slice(0, 10),
        status: 'paid',
        notes: 'Abono registrado desde Finanzas Personales'
      });
    if (paymentError && !isMissingSchemaColumnError(paymentError)) {
      console.warn('Debt payments history unavailable:', getErrorMessage(paymentError));
    }

    await get().updateDebt(id, {
      ...debt,
      original_amount: Number(debt.original_amount || 0),
      pending: nextPending,
      current_balance: nextPending,
      paid: nextPaid,
      minimum: Number(debt.minimum || 0),
      minimum_payment: Number(debt.minimum_payment ?? debt.minimum ?? 0),
      recommended_payment: Number(debt.recommended_payment || 0),
      extra_payment: Number(debt.extra_payment || 0),
      payment_frequency: debt.payment_frequency || 'Mensual',
      interest: Number(debt.interest || 0),
      interest_rate: Number(debt.interest_rate ?? debt.interest ?? 0),
      interest_rate_type: debt.interest_rate_type || 'Anual',
      status: nextPending <= 0 ? 'Pagada' : debt.status || 'Al dia'
    });
  },
  deleteDebt: async (id) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const { error } = await client.from('debts').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(getErrorMessage(error));
    set({ debts: get().debts.filter((debt) => debt.id !== id) });
    await get().fetchInitialData();
  },
  createCreditCard: async (input) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const name = input.name.trim();
    if (!name) throw new Error('El nombre de la tarjeta es obligatorio.');

    let debtId = input.debt_id || null;
    if (input.create_linked_debt && input.card_type === 'Credito' && Number(input.current_balance || 0) > 0) {
      const debt = await get().createDebt({
        name,
        type: 'Tarjeta de credito',
        debt_type: 'credit_card',
        category: input.bank || 'Tarjeta de credito',
        owner_type: 'personal',
        business_unit_id: 'personal',
        business_id: null,
        original_amount: Number(input.credit_limit || input.current_balance || 0),
        pending: Number(input.current_balance || 0),
        current_balance: Number(input.current_balance || 0),
        minimum: Number(input.minimum_payment || 0),
        minimum_payment: Number(input.minimum_payment || 0),
        recommended_payment: Number(input.recommended_payment || 0),
        due_date: input.payment_due_date || undefined,
        interest: Number(input.annual_interest_rate || 0),
        interest_rate: Number(input.annual_interest_rate || 0),
        interest_rate_type: 'Anual',
        credit_limit: Number(input.credit_limit || 0),
        credit_utilization: Number(input.credit_utilization || 0),
        priority: input.status === 'Peligro' ? 'Alta' : input.status === 'Alto uso' ? 'Media' : 'Baja',
        status: 'Al dia',
        risk: input.status === 'Peligro' ? 'Alto' : input.status === 'Alto uso' ? 'Medio' : 'Bajo',
        notes: input.notes || '',
      });
      debtId = debt.id;
    }

    const payload = toCreditCardPayload({
      ...input,
      user_id: user.id,
      debt_id: debtId,
      owner_type: 'personal',
      business_unit_id: input.business_unit_id || 'personal',
      bank: input.bank?.trim() || null,
      account_id: input.account_id || null,
      notes: input.notes?.trim() || null,
    });

    const { data, error } = await client.from('credit_cards').insert(payload).select('*').single();
    if (error) {
      if (!isMissingSchemaColumnError(error)) throw new Error(getErrorMessage(error));
      const account = await get().createAccount({
        name,
        type: input.card_type === 'Credito' ? 'Tarjeta de credito personal' : 'Tarjeta personal',
        bank_name: input.bank || '',
        current_balance: input.card_type === 'Credito' ? -Math.abs(Number(input.current_balance || 0)) : Number(input.current_balance || 0),
        is_personal: true,
        status: input.status || 'active',
      });
      return {
        id: account.id,
        legacy_account_id: account.id,
        name: account.name,
        bank: account.bank_name,
        card_type: input.card_type,
        credit_limit: Number(input.credit_limit || 0),
        current_balance: Number(input.current_balance || account.current_balance || 0),
        status: input.status,
      } as CreditCard;
    }

    const card = data as CreditCard;
    set({ creditCards: [...get().creditCards, card] });
    await get().fetchInitialData();
    return card;
  },
  updateCreditCard: async (id, input) => {
    if (input.legacy_account_id) {
      const account = await get().updateAccount(input.legacy_account_id, {
        name: input.name,
        type: input.card_type === 'Credito' ? 'Tarjeta de credito personal' : 'Tarjeta personal',
        bank_name: input.bank || '',
        current_balance: input.card_type === 'Credito' ? -Math.abs(Number(input.current_balance || 0)) : Number(input.current_balance || 0),
        is_personal: true,
        status: input.status || 'active',
      });
      return { ...input, id: account.id, legacy_account_id: account.id } as CreditCard;
    }

    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const payload = toCreditCardPayload({
      ...input,
      owner_type: 'personal',
      business_unit_id: input.business_unit_id || 'personal',
      bank: input.bank?.trim() || null,
      account_id: input.account_id || null,
      notes: input.notes?.trim() || null,
    });
    const { data, error } = await client
      .from('credit_cards')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();
    if (error) throw new Error(getErrorMessage(error));

    if (input.debt_id) {
      const linkedDebt = get().debts.find((debt) => debt.id === input.debt_id);
      if (linkedDebt) {
        await get().updateDebt(input.debt_id, {
          ...linkedDebt,
          owner_type: 'personal',
          business_unit_id: 'personal',
          business_id: null,
          original_amount: Number(input.credit_limit || linkedDebt.original_amount || 0),
          pending: Number(input.current_balance || 0),
          current_balance: Number(input.current_balance || 0),
          minimum: Number(input.minimum_payment || 0),
          minimum_payment: Number(input.minimum_payment || 0),
          recommended_payment: Number(input.recommended_payment || 0),
          due_date: input.payment_due_date || undefined,
          interest: Number(input.annual_interest_rate || 0),
          interest_rate: Number(input.annual_interest_rate || 0),
        });
      }
    }

    const card = data as CreditCard;
    set({ creditCards: get().creditCards.map((item) => item.id === id ? card : item) });
    await get().fetchInitialData();
    return card;
  },
  deleteCreditCard: async (id) => {
    const legacy = get().creditCards.find((card) => card.id === id)?.legacy_account_id;
    if (legacy) {
      await get().deleteAccount(legacy);
      return;
    }
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const { error } = await client.from('credit_cards').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(getErrorMessage(error));
    set({ creditCards: get().creditCards.filter((card) => card.id !== id) });
    await get().fetchInitialData();
  },
  registerCreditCardPayment: async (id, input) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const card = get().creditCards.find((item) => item.id === id);
    if (!card) throw new Error('No se encontro la tarjeta.');
    const amount = parseMoney(input.amount);
    const nextBalance = Math.max(0, Number(card.current_balance || 0) - amount);

    const transactionPayload = {
      user_id: user.id,
      type: 'gasto',
      scope: 'personal',
      amount,
      category: 'Abono a tarjeta',
      payment_method: input.payment_method || null,
      account_id: input.account_id || null,
      status: 'pagado',
      notes: input.notes?.trim() || `Abono a ${card.name}`,
      date: input.payment_date,
      owner_type: 'personal',
    };
    const { data: transactionData, error: transactionError } = await client.from('transactions').insert(transactionPayload).select('id').single();
    if (transactionError) console.warn('Credit card payment transaction unavailable:', getErrorMessage(transactionError));
    const transactionId = (transactionData as { id?: string } | null)?.id || null;

    const { error: paymentError } = await client.from('credit_card_payments').insert({
      user_id: user.id,
      credit_card_id: id,
      debt_id: card.debt_id || null,
      amount,
      payment_date: input.payment_date,
      payment_method: input.payment_method || null,
      account_id: input.account_id || null,
      transaction_id: transactionId,
      notes: input.notes?.trim() || null,
    });
    if (paymentError && !isMissingSchemaColumnError(paymentError)) throw new Error(getErrorMessage(paymentError));

    await get().updateCreditCard(id, { ...card, current_balance: nextBalance });
  },
  createInvestment: async (input) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const name = input.name.trim();
    const amount = parseMoney(input.amount);
    if (!name) throw new Error('El nombre de la inversion es obligatorio.');

    const payload = {
      user_id: user.id,
      name,
      amount,
      category: input.category?.trim() || null,
      owner_type: input.owner_type || (input.business_id ? 'business' : 'personal'),
      business_unit_id: input.business_unit_id || input.business_id || (input.owner_type === 'personal' ? 'personal' : null),
      business_id: input.business_id || null,
      account_id: input.account_id || null,
      investment_date: input.investment_date || new Date().toISOString().slice(0, 10),
      expected_return: Number(input.expected_return || 0),
      status: input.status || 'active',
      notes: input.notes?.trim() || null
    };

    const { data, error } = await client.from('investments').insert(payload).select('*').single();
    if (error) throw new Error(getErrorMessage(error));
    const investment = data as Investment;
    set({ investments: [...get().investments, investment] });
    await get().fetchInitialData();
    return investment;
  },
  updateInvestment: async (id, input) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const name = input.name.trim();
    const amount = Number(input.amount);
    if (!name) throw new Error('El nombre de la inversion es obligatorio.');
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('El monto debe ser mayor que cero.');

    const payload = {
      name,
      amount,
      category: input.category?.trim() || null,
      owner_type: input.owner_type || (input.business_id ? 'business' : 'personal'),
      business_unit_id: input.business_unit_id || input.business_id || (input.owner_type === 'personal' ? 'personal' : null),
      business_id: input.business_id || null,
      account_id: input.account_id || null,
      investment_date: input.investment_date || new Date().toISOString().slice(0, 10),
      expected_return: Number(input.expected_return || 0),
      status: input.status || 'active',
      notes: input.notes?.trim() || null
    };

    const { data, error } = await client.from('investments').update(payload).eq('id', id).eq('user_id', user.id).select('*').single();
    if (error) throw new Error(getErrorMessage(error));
    const investment = data as Investment;
    set({ investments: get().investments.map((item) => item.id === id ? investment : item) });
    await get().fetchInitialData();
    return investment;
  },
  deleteInvestment: async (id) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const { error } = await client.from('investments').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw new Error(getErrorMessage(error));
    set({ investments: get().investments.filter((investment) => investment.id !== id) });
    await get().fetchInitialData();
  }
}));
