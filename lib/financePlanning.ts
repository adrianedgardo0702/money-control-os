import type { Business, BusinessTargetWeight, Debt, MonthlyTarget, ProtectedFund, RecurringExpense, Transaction } from '@/store/useStore';

export const PERSONAL_UNIT_ID = 'personal';
export const SHARED_UNIT_ID = 'shared';

export const fixedExpenseCategories = [
  'Alquiler / oficina',
  'Nomina',
  'Publicidad',
  'Inventario base',
  'Servicios',
  'Software / suscripciones',
  'Transporte',
  'Deudas / pagos minimos',
  'Impuestos / reservas',
  'Gastos personales fijos',
  'Otros',
];

export const defaultMonthlyTarget: Omit<MonthlyTarget, 'id' | 'user_id'> = {
  operating_days_per_month: 26,
  personal_budget_target: 0,
  debt_payment_target: 0,
  reinvestment_target: 0,
  desired_profit: 0,
  reserve_target: 0,
  growth_target: 0,
};

export const money = (value: number) => `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function monthlyCost(expense: Pick<RecurringExpense, 'amount' | 'frequency'>) {
  const amount = Number(expense.amount || 0);
  switch (expense.frequency) {
    case 'Diario': return amount * 30;
    case 'Semanal': return amount * 4.33;
    case 'Quincenal': return amount * 2;
    case 'Anual': return amount / 12;
    case 'Mensual':
    default:
      return amount;
  }
}

export function isExpenseActive(expense: RecurringExpense) {
  return expense.is_active ?? expense.status === 'active';
}

export function getBusinessUnitId(expense: RecurringExpense) {
  return expense.business_unit_id || (expense.scope === 'personal' ? PERSONAL_UNIT_ID : expense.business_id || SHARED_UNIT_ID);
}

export function getBusinessUnitName(unitId: string, businesses: Business[]) {
  if (unitId === PERSONAL_UNIT_ID) return 'Finanzas personales';
  if (unitId === SHARED_UNIT_ID) return 'General ViciousLabs S.A.';
  return businesses.find((business) => business.id === unitId)?.name || 'Sin empresa';
}

export function buildFixedExpenseSummary(expenses: RecurringExpense[], businesses: Business[]) {
  const active = expenses.filter(isExpenseActive);
  const byBusiness = new Map<string, { id: string; name: string; total: number; expenses: RecurringExpense[] }>();
  const byCategory = new Map<string, { name: string; total: number; expenses: RecurringExpense[] }>();

  active.forEach((expense) => {
    const monthly = monthlyCost(expense);
    const unitId = getBusinessUnitId(expense);
    const category = expense.category || 'Otros';
    const businessGroup = byBusiness.get(unitId) || { id: unitId, name: getBusinessUnitName(unitId, businesses), total: 0, expenses: [] };
    businessGroup.total += monthly;
    businessGroup.expenses.push(expense);
    byBusiness.set(unitId, businessGroup);

    const categoryGroup = byCategory.get(category) || { name: category, total: 0, expenses: [] };
    categoryGroup.total += monthly;
    categoryGroup.expenses.push(expense);
    byCategory.set(category, categoryGroup);
  });

  const businessRows = Array.from(byBusiness.values()).sort((a, b) => b.total - a.total);
  const categoryRows = Array.from(byCategory.values()).sort((a, b) => b.total - a.total);
  const totalMonthly = active.reduce((sum, expense) => sum + monthlyCost(expense), 0);

  return {
    active,
    totalMonthly,
    personalMonthly: active.filter((expense) => getBusinessUnitId(expense) === PERSONAL_UNIT_ID).reduce((sum, expense) => sum + monthlyCost(expense), 0),
    businessMonthly: active.filter((expense) => getBusinessUnitId(expense) !== PERSONAL_UNIT_ID).reduce((sum, expense) => sum + monthlyCost(expense), 0),
    upcomingThisMonth: active.filter(isDueThisMonth).length,
    businessRows,
    categoryRows,
    highestBusiness: businessRows[0],
    highestCategory: categoryRows[0],
  };
}

export function buildTargetPlan(input: {
  target: MonthlyTarget | null;
  weights: BusinessTargetWeight[];
  businesses: Business[];
  recurringExpenses: RecurringExpense[];
  debts: Debt[];
  transactions: Transaction[];
  protectedFunds: ProtectedFund[];
}) {
  const fixed = buildFixedExpenseSummary(input.recurringExpenses, input.businesses);
  const target = input.target || defaultMonthlyTarget;
  const debtMinimums = input.debts.filter((debt) => debt.status !== 'Pagada').reduce((sum, debt) => sum + Number(debt.minimum || 0), 0);
  const debtPayment = Number(target.debt_payment_target || 0) || debtMinimums;
  const personalBudget = Number(target.personal_budget_target || 0);
  const reinvestment = Number(target.reinvestment_target || 0);
  const desiredProfit = Number(target.desired_profit || 0);
  const reserve = Number(target.reserve_target || 0);
  const growth = Number(target.growth_target || 0);
  const operatingDays = Math.max(1, Number(target.operating_days_per_month || 26));
  const breakEvenMonthly = fixed.totalMonthly + debtPayment + personalBudget + reinvestment;
  const idealMonthly = breakEvenMonthly + desiredProfit;
  const aggressiveMonthly = idealMonthly + reserve + growth;
  const realMonthlyRevenue = currentMonthIncome(input.transactions);
  const missingToIdeal = Math.max(0, idealMonthly - realMonthlyRevenue);
  const savedWeights = input.weights.filter((weight) => Number(weight.weight_percent) > 0);
  const targetByBusiness = savedWeights.map((weight) => {
    const monthly = idealMonthly * (Number(weight.weight_percent) / 100);
    return {
      id: weight.business_unit_id,
      name: getBusinessUnitName(weight.business_unit_id, input.businesses),
      weight: Number(weight.weight_percent),
      monthly,
      daily: monthly / operatingDays,
    };
  }).sort((a, b) => b.monthly - a.monthly);
  const fixedByBusiness = fixed.businessRows.map((row) => ({ name: row.name, total: row.total }));
  const fixedByCategory = fixed.categoryRows.map((row) => ({ name: row.name, total: row.total }));
  const monthlyProtected = input.protectedFunds.filter((fund) => fund.status === 'active').reduce((sum, fund) => sum + Number(fund.amount || 0), 0);

  return {
    fixed,
    debtPayment,
    debtMinimums,
    personalBudget,
    reinvestment,
    desiredProfit,
    reserve,
    growth,
    operatingDays,
    breakEvenMonthly,
    idealMonthly,
    aggressiveMonthly,
    breakEvenDaily: breakEvenMonthly / operatingDays,
    idealDaily: idealMonthly / operatingDays,
    breakEvenWeekly: breakEvenMonthly / 4.33,
    idealWeekly: idealMonthly / 4.33,
    realMonthlyRevenue,
    missingToIdeal,
    progressToIdeal: idealMonthly > 0 ? Math.min(100, Math.round((realMonthlyRevenue / idealMonthly) * 100)) : 0,
    targetByBusiness,
    fixedByBusiness,
    fixedByCategory,
    monthlyProtected,
  };
}

export function currentMonthIncome(transactions: Transaction[]) {
  return transactions
    .filter((transaction) => transaction.type === 'ingreso' && isCurrentMonth(transaction.date))
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
}

export function dailyRevenueSeries(transactions: Transaction[]) {
  const now = new Date();
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  let running = 0;
  return Array.from({ length: days }).map((_, index) => {
    const day = index + 1;
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const total = transactions
      .filter((transaction) => transaction.type === 'ingreso' && new Date(transaction.date).toISOString().slice(0, 10) === dateKey)
      .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
    running += total;
    return { day: String(day), ingresos: total, acumulado: running };
  });
}

function isCurrentMonth(dateValue: string) {
  const date = new Date(dateValue);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function isDueThisMonth(expense: RecurringExpense) {
  const date = new Date(expense.due_date || expense.next_run_date);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}
