-- Schema setup for Noa Finanzas in Supabase

-- Businesses Table
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accounts Table
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    bank_name TEXT,
    current_balance NUMERIC(12, 2) DEFAULT 0,
    is_personal BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'ingreso' or 'gasto'
    scope TEXT NOT NULL, -- 'personal' or 'negocio'
    amount NUMERIC(12, 2) NOT NULL,
    category TEXT,
    status TEXT DEFAULT 'recibido',
    notes TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Protected Funds Table
CREATE TABLE IF NOT EXISTS public.protected_funds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    scope TEXT NOT NULL,
    owner_type TEXT DEFAULT 'personal',
    business_unit_id TEXT,
    fund_type TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    priority TEXT NOT NULL,
    target_date DATE,
    block_withdrawals BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recurring Expenses Table
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    scope TEXT NOT NULL,
    category TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    frequency TEXT NOT NULL,
    start_date DATE NOT NULL,
    next_run_date DATE NOT NULL,
    owner_type TEXT DEFAULT 'personal',
    business_unit_id TEXT,
    due_date DATE,
    is_required BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    last_paid_date DATE,
    payment_method TEXT,
    mode TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly Targets Table
CREATE TABLE IF NOT EXISTS public.monthly_targets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    operating_days_per_month INTEGER NOT NULL DEFAULT 26 CHECK (operating_days_per_month > 0),
    personal_budget_target NUMERIC(12, 2) NOT NULL DEFAULT 0,
    debt_payment_target NUMERIC(12, 2) NOT NULL DEFAULT 0,
    reinvestment_target NUMERIC(12, 2) NOT NULL DEFAULT 0,
    desired_profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
    reserve_target NUMERIC(12, 2) NOT NULL DEFAULT 0,
    growth_target NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business Target Weights Table
CREATE TABLE IF NOT EXISTS public.business_target_weights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    business_unit_id TEXT NOT NULL,
    weight_percent NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (weight_percent >= 0 AND weight_percent <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, business_unit_id)
);

-- Debts Table
CREATE TABLE IF NOT EXISTS public.debts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT,
    owner_type TEXT DEFAULT 'personal',
    business_unit_id TEXT,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    original_amount NUMERIC(12, 2) NOT NULL,
    pending NUMERIC(12, 2) NOT NULL,
    paid NUMERIC(12, 2) DEFAULT 0,
    minimum NUMERIC(12, 2) DEFAULT 0,
    due_date DATE,
    interest NUMERIC(5, 2) DEFAULT 0,
    priority TEXT,
    status TEXT,
    risk TEXT,
    recommendation TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Investments Table
CREATE TABLE IF NOT EXISTS public.investments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    category TEXT,
    owner_type TEXT DEFAULT 'personal',
    business_unit_id TEXT,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    investment_date DATE DEFAULT CURRENT_DATE,
    expected_return NUMERIC(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Helpful indexes for RLS and dashboard queries.
CREATE INDEX IF NOT EXISTS businesses_user_id_idx ON public.businesses (user_id);
CREATE INDEX IF NOT EXISTS accounts_user_id_idx ON public.accounts (user_id);
CREATE INDEX IF NOT EXISTS accounts_business_id_idx ON public.accounts (business_id);
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS transactions_business_id_idx ON public.transactions (business_id);
CREATE INDEX IF NOT EXISTS transactions_account_id_idx ON public.transactions (account_id);
CREATE INDEX IF NOT EXISTS transactions_date_idx ON public.transactions (date DESC);
CREATE INDEX IF NOT EXISTS protected_funds_user_id_idx ON public.protected_funds (user_id);
CREATE INDEX IF NOT EXISTS protected_funds_business_id_idx ON public.protected_funds (business_id);
CREATE INDEX IF NOT EXISTS protected_funds_business_unit_id_idx ON public.protected_funds (business_unit_id);
CREATE INDEX IF NOT EXISTS recurring_expenses_user_id_idx ON public.recurring_expenses (user_id);
CREATE INDEX IF NOT EXISTS recurring_expenses_next_run_date_idx ON public.recurring_expenses (next_run_date);
CREATE INDEX IF NOT EXISTS recurring_expenses_business_unit_id_idx ON public.recurring_expenses (business_unit_id);
CREATE INDEX IF NOT EXISTS recurring_expenses_is_active_idx ON public.recurring_expenses (is_active);
CREATE INDEX IF NOT EXISTS debts_user_id_idx ON public.debts (user_id);
CREATE INDEX IF NOT EXISTS debts_business_unit_id_idx ON public.debts (business_unit_id);
CREATE INDEX IF NOT EXISTS debts_business_id_idx ON public.debts (business_id);
CREATE INDEX IF NOT EXISTS investments_user_id_idx ON public.investments (user_id);
CREATE INDEX IF NOT EXISTS investments_business_unit_id_idx ON public.investments (business_unit_id);
CREATE INDEX IF NOT EXISTS investments_business_id_idx ON public.investments (business_id);
CREATE INDEX IF NOT EXISTS monthly_targets_user_id_idx ON public.monthly_targets (user_id);
CREATE INDEX IF NOT EXISTS business_target_weights_user_id_idx ON public.business_target_weights (user_id);
CREATE INDEX IF NOT EXISTS business_target_weights_business_unit_id_idx ON public.business_target_weights (business_unit_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protected_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_target_weights ENABLE ROW LEVEL SECURITY;

-- Data API grants for authenticated users.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON
    public.businesses,
    public.accounts,
    public.transactions,
    public.protected_funds,
    public.recurring_expenses,
    public.debts,
    public.investments,
    public.monthly_targets,
    public.business_target_weights
TO authenticated;

-- RLS policies: authenticated users can only manage their own rows.
DROP POLICY IF EXISTS "Users can manage their own businesses" ON public.businesses;
CREATE POLICY "Users can manage their own businesses"
ON public.businesses
FOR ALL
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage their own accounts" ON public.accounts;
CREATE POLICY "Users can manage their own accounts"
ON public.accounts
FOR ALL
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage their own transactions" ON public.transactions;
CREATE POLICY "Users can manage their own transactions"
ON public.transactions
FOR ALL
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage their own protected funds" ON public.protected_funds;
CREATE POLICY "Users can manage their own protected funds"
ON public.protected_funds
FOR ALL
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage their own recurring expenses" ON public.recurring_expenses;
CREATE POLICY "Users can manage their own recurring expenses"
ON public.recurring_expenses
FOR ALL
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage their own debts" ON public.debts;
CREATE POLICY "Users can manage their own debts"
ON public.debts
FOR ALL
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage their own investments" ON public.investments;
CREATE POLICY "Users can manage their own investments"
ON public.investments
FOR ALL
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage their own monthly targets" ON public.monthly_targets;
CREATE POLICY "Users can manage their own monthly targets"
ON public.monthly_targets
FOR ALL
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage their own business target weights" ON public.business_target_weights;
CREATE POLICY "Users can manage their own business target weights"
ON public.business_target_weights
FOR ALL
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);
