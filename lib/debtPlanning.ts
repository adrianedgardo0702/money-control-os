import type { Debt } from '@/store/useStore';

export type DebtPlanInput = Partial<Debt> & {
  pending?: number;
  minimum?: number;
  interest?: number;
};

export type AmortizationRow = {
  month: number;
  startingBalance: number;
  payment: number;
  interest: number;
  principal: number;
  endingBalance: number;
};

export type DebtPayoffPlan = {
  paymentAmount: number;
  monthlyInterestRate: number;
  monthlyInterestAmount: number;
  principalPayment: number;
  monthsToPayoff: number | null;
  payoffDate: string | null;
  totalInterest: number;
  totalPaid: number;
  amortizationSchedule: AmortizationRow[];
  warningMessage?: string;
};

export type DebtScenario = {
  label: string;
  payment: number;
  monthsToPayoff: number | null;
  totalInterest: number;
  totalPaid: number;
  payoffDate: string | null;
  interestSavings: number;
};

const MAX_MONTHS = 600;

export function getDebtBalance(debt: DebtPlanInput) {
  return Number(debt.current_balance ?? debt.pending ?? 0);
}

export function getDebtMinimumPayment(debt: DebtPlanInput) {
  return Number(debt.minimum_payment ?? debt.minimum ?? 0);
}

export function getDebtInterestRate(debt: DebtPlanInput) {
  return Number(debt.interest_rate ?? debt.interest ?? 0);
}

export function getMonthlyInterestRate(debt: DebtPlanInput) {
  const rate = getDebtInterestRate(debt);
  const type = debt.interest_rate_type || 'Anual';
  if (!Number.isFinite(rate) || rate <= 0 || type === 'Sin interes') return 0;
  if (type === 'Mensual') return rate / 100;
  return rate / 12 / 100;
}

export function calculateDebtPayoffPlan(debt: DebtPlanInput, paymentAmountInput?: number): DebtPayoffPlan {
  const balance = getDebtBalance(debt);
  const paymentAmount = Number(paymentAmountInput ?? debt.recommended_payment ?? getDebtMinimumPayment(debt) ?? 0);
  const monthlyInterestRate = getMonthlyInterestRate(debt);
  const monthlyInterestAmount = roundMoney(balance * monthlyInterestRate);
  const principalPayment = roundMoney(paymentAmount - monthlyInterestAmount);

  if (!Number.isFinite(balance) || balance <= 0) {
    return emptyPlan(paymentAmount, monthlyInterestRate);
  }

  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    return {
      ...emptyPlan(paymentAmount, monthlyInterestRate),
      monthlyInterestAmount,
      principalPayment,
      warningMessage: 'Agrega un pago minimo o recomendado para calcular el plan.',
    };
  }

  if (paymentAmount <= monthlyInterestAmount && monthlyInterestRate > 0) {
    return {
      ...emptyPlan(paymentAmount, monthlyInterestRate),
      monthlyInterestAmount,
      principalPayment,
      warningMessage: 'El pago actual no cubre ni los intereses. Esta deuda no bajara con este pago.',
    };
  }

  let currentBalance = balance;
  let month = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  const amortizationSchedule: AmortizationRow[] = [];

  while (currentBalance > 0.01 && month < MAX_MONTHS) {
    month += 1;
    const interest = roundMoney(currentBalance * monthlyInterestRate);
    const payment = Math.min(paymentAmount, roundMoney(currentBalance + interest));
    const principal = roundMoney(payment - interest);
    const endingBalance = Math.max(0, roundMoney(currentBalance - principal));
    amortizationSchedule.push({
      month,
      startingBalance: roundMoney(currentBalance),
      payment,
      interest,
      principal,
      endingBalance,
    });
    totalInterest = roundMoney(totalInterest + interest);
    totalPaid = roundMoney(totalPaid + payment);
    currentBalance = endingBalance;
  }

  const monthsToPayoff = currentBalance > 0.01 ? null : month;
  return {
    paymentAmount,
    monthlyInterestRate,
    monthlyInterestAmount,
    principalPayment,
    monthsToPayoff,
    payoffDate: monthsToPayoff ? addMonthsLabel(new Date(), monthsToPayoff) : null,
    totalInterest,
    totalPaid,
    amortizationSchedule,
    warningMessage: getDebtInterestRate(debt) <= 0 ? 'Sin tasa de interes no se puede calcular un plan exacto.' : undefined,
  };
}

export function compareDebtPaymentScenarios(debt: DebtPlanInput, customPayment?: number): DebtScenario[] {
  const minimum = getDebtMinimumPayment(debt);
  const basePlan = calculateDebtPayoffPlan(debt, minimum);
  const scenarios = [
    ['Pago minimo', minimum],
    ['Minimo + $50', minimum + 50],
    ['Minimo + $100', minimum + 100],
    ['Pago personalizado', Number(customPayment || debt.recommended_payment || minimum)],
  ] as const;

  return scenarios.map(([label, payment]) => {
    const plan = calculateDebtPayoffPlan(debt, payment);
    return {
      label,
      payment,
      monthsToPayoff: plan.monthsToPayoff,
      totalInterest: plan.totalInterest,
      totalPaid: plan.totalPaid,
      payoffDate: plan.payoffDate,
      interestSavings: Math.max(0, roundMoney(basePlan.totalInterest - plan.totalInterest)),
    };
  });
}

export function getDebtRisk(debt: DebtPlanInput) {
  const balance = getDebtBalance(debt);
  const minimum = getDebtMinimumPayment(debt);
  const interest = getDebtInterestRate(debt);
  const monthlyRate = getMonthlyInterestRate(debt);
  const monthlyInterest = balance * monthlyRate;
  if (debt.status === 'Atrasada' || (minimum > 0 && monthlyInterest >= minimum)) return 'Critico';
  if (interest >= 30 || debt.priority === 'Alta') return 'Alto';
  if (interest >= 15 || minimum / Math.max(balance, 1) < 0.04) return 'Medio';
  return 'Bajo';
}

export function getCreditUtilization(debt: DebtPlanInput) {
  const limit = Number(debt.credit_limit || 0);
  if (!limit) return 0;
  return roundMoney((getDebtBalance(debt) / limit) * 100);
}

export function getUtilizationStatus(value: number) {
  if (value > 80) return 'Peligro';
  if (value > 50) return 'Alto uso';
  if (value >= 30) return 'Cuidado';
  return 'Saludable';
}

export function buildDebtRecommendation(debt: DebtPlanInput) {
  const minimum = getDebtMinimumPayment(debt);
  const plus50 = calculateDebtPayoffPlan(debt, minimum + 50);
  const minimumPlan = calculateDebtPayoffPlan(debt, minimum);
  const risk = getDebtRisk(debt);
  const name = debt.name || 'esta deuda';

  if (getDebtInterestRate(debt) >= 24) {
    return `Esta deuda tiene una tasa alta. Prioriza pagar al menos ${money(minimum + 50)} al mes para reducir intereses y liquidarla en ${plus50.monthsToPayoff || 'menos'} meses.`;
  }
  if (minimumPlan.monthsToPayoff && plus50.monthsToPayoff && plus50.monthsToPayoff < minimumPlan.monthsToPayoff) {
    return `Pagando $50 extra al mes puedes terminar ${minimumPlan.monthsToPayoff - plus50.monthsToPayoff} meses antes y ahorrar ${money(plus50.totalInterest ? minimumPlan.totalInterest - plus50.totalInterest : 0)} en intereses.`;
  }
  if (risk === 'Bajo' && getDebtBalance(debt) < 500) {
    return `${name} tiene saldo bajo. Podrias eliminarla rapido usando metodo bola de nieve.`;
  }
  return `Mantente pagando al menos ${money(minimum)} al mes y revisa si puedes agregar un extra para acelerar la salida de deuda.`;
}

function emptyPlan(paymentAmount: number, monthlyInterestRate: number): DebtPayoffPlan {
  return {
    paymentAmount,
    monthlyInterestRate,
    monthlyInterestAmount: 0,
    principalPayment: 0,
    monthsToPayoff: null,
    payoffDate: null,
    totalInterest: 0,
    totalPaid: 0,
    amortizationSchedule: [],
  };
}

function addMonthsLabel(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next.toLocaleDateString('es-PA', { month: 'long', year: 'numeric' });
}

function roundMoney(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function money(value: number) {
  return `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
