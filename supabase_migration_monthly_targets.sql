-- Run this in Supabase SQL Editor for the live Noa Finanzas project.
-- It is non-destructive: it adds planning columns/tables without deleting existing data.

ALTER TABLE public.recurring_expenses
  ADD COLUMN IF NOT EXISTS owner_type TEXT DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS business_unit_id TEXT,
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_paid_date DATE;

UPDATE public.recurring_expenses
SET
  owner_type = COALESCE(owner_type, CASE WHEN scope = 'personal' THEN 'personal' ELSE 'business' END),
  business_unit_id = COALESCE(business_unit_id, CASE WHEN scope = 'personal' THEN 'personal' ELSE COALESCE(business_id::TEXT, 'shared') END),
  due_date = COALESCE(due_date, next_run_date),
  is_required = COALESCE(is_required, true),
  is_active = COALESCE(is_active, status = 'active')
WHERE business_unit_id IS NULL OR due_date IS NULL OR is_required IS NULL OR is_active IS NULL;

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

CREATE TABLE IF NOT EXISTS public.business_target_weights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_unit_id TEXT NOT NULL,
  weight_percent NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (weight_percent >= 0 AND weight_percent <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, business_unit_id)
);

CREATE INDEX IF NOT EXISTS monthly_targets_user_id_idx ON public.monthly_targets (user_id);
CREATE INDEX IF NOT EXISTS business_target_weights_user_id_idx ON public.business_target_weights (user_id);
CREATE INDEX IF NOT EXISTS business_target_weights_business_unit_id_idx ON public.business_target_weights (business_unit_id);
CREATE INDEX IF NOT EXISTS recurring_expenses_business_unit_id_idx ON public.recurring_expenses (business_unit_id);
CREATE INDEX IF NOT EXISTS recurring_expenses_is_active_idx ON public.recurring_expenses (is_active);

ALTER TABLE public.monthly_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_target_weights ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monthly_targets, public.business_target_weights TO authenticated;

DROP POLICY IF EXISTS "Users can manage their own monthly targets" ON public.monthly_targets;
CREATE POLICY "Users can manage their own monthly targets"
ON public.monthly_targets
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage their own business target weights" ON public.business_target_weights;
CREATE POLICY "Users can manage their own business target weights"
ON public.business_target_weights
FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);
