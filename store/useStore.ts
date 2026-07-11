import { create } from 'zustand';
import { supabase, hasSupabaseConfig } from '@/lib/supabase';

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
  status: string;
  notes?: string;
  date: string;
  business_id?: string;
  account_id?: string;
};

export type ProtectedFund = {
  id: string;
  user_id?: string;
  name: string;
  scope: string;
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
  owner_type?: 'personal' | 'business';
  business_unit_id?: string;
  due_date?: string;
  is_required?: boolean;
  is_active?: boolean;
  last_paid_date?: string;
  payment_method?: string;
  mode: string;
  status: string;
  business_id?: string;
  account_id?: string;
  notes?: string;
};

export type Debt = {
  id: string;
  name: string;
  type: string;
  category?: string;
  original_amount: number;
  pending: number;
  paid: number;
  minimum: number;
  due_date?: string;
  interest: number;
  priority?: string;
  status?: string;
  risk?: string;
  recommendation?: string;
};

export type MonthlyTarget = {
  id?: string;
  user_id?: string;
  operating_days_per_month: number;
  personal_budget_target: number;
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
  recurringExpenses: RecurringExpense[];
  debts: Debt[];
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
    fund_type: string;
    amount: number;
    priority: string;
    target_date?: string;
    block_withdrawals: boolean;
    business_id?: string | null;
    account_id?: string | null;
    notes?: string;
  }) => Promise<ProtectedFund>;
  deleteProtectedFund: (id: string) => Promise<void>;
  createRecurringExpense: (input: {
    name: string;
    scope: 'personal' | 'negocio';
    category: string;
    amount: number;
    frequency: string;
    start_date: string;
    next_run_date: string;
    owner_type?: 'personal' | 'business';
    business_unit_id?: string | null;
    due_date?: string | null;
    is_required?: boolean;
    is_active?: boolean;
    last_paid_date?: string | null;
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
    next_run_date: string;
    owner_type?: 'personal' | 'business';
    business_unit_id?: string | null;
    due_date?: string | null;
    is_active?: boolean;
    payment_method?: string;
    mode?: string;
    business_id?: string | null;
    account_id?: string | null;
    notes?: string;
  }) => Promise<RecurringExpense>;
  markRecurringExpensePaid: (id: string) => Promise<void>;
  updateRecurringExpenseStatus: (id: string, status: string) => Promise<void>;
  deleteRecurringExpense: (id: string) => Promise<void>;
  upsertMonthlyTarget: (input: Omit<MonthlyTarget, 'id' | 'user_id'>) => Promise<MonthlyTarget>;
  upsertBusinessTargetWeights: (weights: { business_unit_id: string; weight_percent: number }[]) => Promise<BusinessTargetWeight[]>;
  createDebt: (input: {
    name: string;
    type: string;
    category?: string;
    original_amount: number;
    pending: number;
    paid?: number;
    minimum?: number;
    due_date?: string;
    interest?: number;
    priority?: string;
    status?: string;
    risk?: string;
    recommendation?: string;
  }) => Promise<Debt>;
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

const nextDateByFrequency = (dateValue: string, frequency: string) => {
  const date = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().split('T')[0];
  switch (frequency) {
    case 'Semanal':
      date.setDate(date.getDate() + 7);
      break;
    case 'Quincenal':
      date.setDate(date.getDate() + 15);
      break;
    case 'Anual':
      date.setFullYear(date.getFullYear() + 1);
      break;
    case 'Diario':
      date.setDate(date.getDate() + 1);
      break;
    case 'Mensual':
    default:
      date.setMonth(date.getMonth() + 1);
      break;
  }
  return date.toISOString().split('T')[0];
};

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
  recurringExpenses: [],
  debts: [],
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
          supabase.from('debts').select('*').eq('user_id', session.user.id).order('created_at', { ascending: true })
        ]);

        const firstError = results.find((result) => result.error)?.error;
        if (firstError) throw firstError;

        const [
          { data: businesses },
          { data: accounts },
          { data: transactions },
          { data: protectedFunds },
          { data: recurringExpenses },
          { data: debts }
        ] = results;

        const [monthlyTargetResult, businessWeightsResult] = await Promise.all([
          supabase.from('monthly_targets').select('*').eq('user_id', session.user.id).maybeSingle(),
          supabase.from('business_target_weights').select('*').eq('user_id', session.user.id).order('created_at', { ascending: true })
        ]);

        const optionalTargetError = monthlyTargetResult.error && monthlyTargetResult.error.code !== 'PGRST116';
        const optionalWeightsError = businessWeightsResult.error;
        if (optionalTargetError) console.warn('Monthly targets unavailable:', getErrorMessage(monthlyTargetResult.error));
        if (optionalWeightsError) console.warn('Business target weights unavailable:', getErrorMessage(optionalWeightsError));

        set({
          businesses: businesses || [],
          accounts: accounts || [],
          transactions: transactions || [],
          protectedFunds: protectedFunds || [],
          recurringExpenses: recurringExpenses || [],
          debts: debts || [],
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
          recurringExpenses: [],
          debts: [],
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
      set({ user: null, businesses: [], accounts: [], transactions: [], protectedFunds: [], recurringExpenses: [], debts: [], monthlyTarget: null, businessTargetWeights: [], lastSyncedAt: null, dataError: null });
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

    if (error) throw new Error(getErrorMessage(error));
    const fund = data as ProtectedFund;
    set({ protectedFunds: [...get().protectedFunds, fund] });
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
  createRecurringExpense: async (input) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const name = input.name.trim();
    const amount = parseMoney(input.amount);
    if (!name) throw new Error('El nombre del gasto recurrente es obligatorio.');
    if (!input.category.trim()) throw new Error('La categoría es obligatoria.');
    if (!input.start_date || !input.next_run_date) throw new Error('Selecciona las fechas del recurrente.');
    if (input.scope === 'negocio' && !input.business_id) throw new Error('Selecciona el negocio del recurrente.');

    const payload = {
      user_id: user.id,
      name,
      scope: input.scope,
      category: input.category.trim(),
      amount,
      frequency: input.frequency,
      start_date: input.start_date,
      next_run_date: input.next_run_date,
      owner_type: input.owner_type || (input.scope === 'personal' ? 'personal' : 'business'),
      business_unit_id: input.business_unit_id || (input.scope === 'personal' ? 'personal' : input.business_id || 'shared'),
      due_date: input.due_date || input.next_run_date,
      is_required: input.is_required ?? true,
      is_active: input.is_active ?? true,
      last_paid_date: input.last_paid_date || null,
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

    if (error) {
      const legacyPayload = {
        user_id: payload.user_id,
        name: payload.name,
        scope: payload.scope,
        category: payload.category,
        amount: payload.amount,
        frequency: payload.frequency,
        start_date: payload.start_date,
        next_run_date: payload.next_run_date,
        payment_method: payload.payment_method,
        mode: payload.mode,
        status: payload.status,
        business_id: payload.business_id,
        account_id: payload.account_id,
        notes: payload.notes
      };
      const { data: legacyData, error: legacyError } = await client
        .from('recurring_expenses')
        .insert(legacyPayload)
        .select('*')
        .single();
      if (legacyError) throw new Error(getErrorMessage(legacyError));
      const expense = legacyData as RecurringExpense;
      set({ recurringExpenses: [...get().recurringExpenses, expense] });
      await get().fetchInitialData();
      return expense;
    }
    const expense = data as RecurringExpense;
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

    const payload = {
      name,
      scope: input.scope,
      category: input.category.trim(),
      amount,
      frequency: input.frequency,
      next_run_date: input.next_run_date,
      owner_type: input.owner_type || (input.scope === 'personal' ? 'personal' : 'business'),
      business_unit_id: input.business_unit_id || (input.scope === 'personal' ? 'personal' : input.business_id || 'shared'),
      due_date: input.due_date || input.next_run_date,
      is_active: input.is_active ?? true,
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

    if (error) {
      const legacyPayload = {
        name: payload.name,
        scope: payload.scope,
        category: payload.category,
        amount: payload.amount,
        frequency: payload.frequency,
        next_run_date: payload.next_run_date,
        payment_method: payload.payment_method,
        mode: payload.mode,
        status: payload.status,
        business_id: payload.business_id,
        account_id: payload.account_id,
        notes: payload.notes
      };
      const { data: legacyData, error: legacyError } = await client
        .from('recurring_expenses')
        .update(legacyPayload)
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*')
        .single();
      if (legacyError) throw new Error(getErrorMessage(legacyError));
      const expense = legacyData as RecurringExpense;
      set({ recurringExpenses: get().recurringExpenses.map((item) => item.id === id ? expense : item) });
      await get().fetchInitialData();
      return expense;
    }

    const expense = data as RecurringExpense;
    set({ recurringExpenses: get().recurringExpenses.map((item) => item.id === id ? expense : item) });
    await get().fetchInitialData();
    return expense;
  },
  markRecurringExpensePaid: async (id) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const expense = get().recurringExpenses.find((item) => item.id === id);
    if (!expense) throw new Error('No se encontro el gasto fijo.');
    const paidDate = new Date().toISOString().split('T')[0];
    const nextDate = nextDateByFrequency(expense.due_date || expense.next_run_date, expense.frequency);
    const payload = {
      last_paid_date: paidDate,
      next_run_date: nextDate,
      due_date: nextDate,
      status: 'active',
      is_active: true
    };
    const { error } = await client.from('recurring_expenses').update(payload).eq('id', id).eq('user_id', user.id);
    if (error) {
      const { error: legacyError } = await client.from('recurring_expenses').update({ next_run_date: nextDate, status: 'active' }).eq('id', id).eq('user_id', user.id);
      if (legacyError) throw new Error(getErrorMessage(legacyError));
    }
    set({
      recurringExpenses: get().recurringExpenses.map((item) => item.id === id ? { ...item, ...payload } : item)
    });
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
      personal_budget_target: Number(input.personal_budget_target || 0),
      debt_payment_target: Number(input.debt_payment_target || 0),
      reinvestment_target: Number(input.reinvestment_target || 0),
      desired_profit: Number(input.desired_profit || 0),
      reserve_target: Number(input.reserve_target || 0),
      growth_target: Number(input.growth_target || 0),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await client
      .from('monthly_targets')
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error) throw new Error(getErrorMessage(error));
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

    const { data, error } = await client
      .from('debts')
      .insert({
        user_id: user.id,
        name,
        type: input.type.trim(),
        category: input.category?.trim() || null,
        original_amount: originalAmount,
        pending,
        paid: Number(input.paid || 0),
        minimum: Number(input.minimum || 0),
        due_date: input.due_date || null,
        interest: Number(input.interest || 0),
        priority: input.priority || 'Media',
        status: input.status || 'Al dia',
        risk: input.risk || 'Medio',
        recommendation: input.recommendation?.trim() || null
      })
      .select('*')
      .single();

    if (error) throw new Error(getErrorMessage(error));
    const debt = data as Debt;
    set({ debts: [...get().debts, debt] });
    await get().fetchInitialData();
    return debt;
  }
}));
