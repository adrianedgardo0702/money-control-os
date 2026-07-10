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
    payment_method?: string;
    mode: string;
    business_id?: string | null;
    account_id?: string | null;
    notes?: string;
  }) => Promise<RecurringExpense>;
  updateRecurringExpenseStatus: (id: string, status: string) => Promise<void>;
  deleteRecurringExpense: (id: string) => Promise<void>;
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

        set({
          businesses: businesses || [],
          accounts: accounts || [],
          transactions: transactions || [],
          protectedFunds: protectedFunds || [],
          recurringExpenses: recurringExpenses || [],
          debts: debts || [],
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
      set({ user: null, businesses: [], accounts: [], transactions: [], protectedFunds: [], recurringExpenses: [], debts: [], lastSyncedAt: null, dataError: null });
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

    const { data, error } = await client
      .from('recurring_expenses')
      .insert({
        user_id: user.id,
        name,
        scope: input.scope,
        category: input.category.trim(),
        amount,
        frequency: input.frequency,
        start_date: input.start_date,
        next_run_date: input.next_run_date,
        payment_method: input.payment_method?.trim() || null,
        mode: input.mode,
        status: 'active',
        business_id: input.scope === 'negocio' ? input.business_id : null,
        account_id: input.account_id || null,
        notes: input.notes?.trim() || null
      })
      .select('*')
      .single();

    if (error) throw new Error(getErrorMessage(error));
    const expense = data as RecurringExpense;
    set({ recurringExpenses: [...get().recurringExpenses, expense] });
    await get().fetchInitialData();
    return expense;
  },
  updateRecurringExpenseStatus: async (id, status) => {
    const client = requireSupabase();
    const user = requireSignedUser(get().user);
    const { error } = await client
      .from('recurring_expenses')
      .update({ status })
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw new Error(getErrorMessage(error));
    set({
      recurringExpenses: get().recurringExpenses.map((expense) => expense.id === id ? { ...expense, status } : expense)
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
