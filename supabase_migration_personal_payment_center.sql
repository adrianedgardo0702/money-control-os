-- Adds personal payment center support for recurring expenses.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

ALTER TABLE public.recurring_expenses
  ADD COLUMN IF NOT EXISTS reminder_days_before INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS snoozed_until DATE;

CREATE TABLE IF NOT EXISTS public.recurring_expense_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recurring_expense_id UUID REFERENCES public.recurring_expenses(id) ON DELETE CASCADE NOT NULL,
  owner_type TEXT DEFAULT 'personal',
  business_unit_id TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.recurring_expense_payments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS recurring_expense_payments_user_id_idx ON public.recurring_expense_payments (user_id);
CREATE INDEX IF NOT EXISTS recurring_expense_payments_expense_id_idx ON public.recurring_expense_payments (recurring_expense_id);
CREATE INDEX IF NOT EXISTS recurring_expense_payments_due_date_idx ON public.recurring_expense_payments (due_date);
CREATE INDEX IF NOT EXISTS recurring_expense_payments_status_idx ON public.recurring_expense_payments (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_expense_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_expenses TO authenticated;

DROP POLICY IF EXISTS "Users can manage their own recurring expense payments" ON public.recurring_expense_payments;
CREATE POLICY "Users can manage their own recurring expense payments"
ON public.recurring_expense_payments
FOR ALL
TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);
