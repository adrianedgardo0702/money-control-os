export type CardRiskStatus = 'Saludable' | 'Cuidado' | 'Alto uso' | 'Peligro';

export type CreditCardPlanningInput = {
  credit_limit?: number;
  current_balance?: number;
  annual_interest_rate?: number;
};

export function calculateCreditCardMetrics(input: CreditCardPlanningInput) {
  const limit = Number(input.credit_limit || 0);
  const balance = Number(input.current_balance || 0);
  const available = Math.max(0, roundMoney(limit - balance));
  const utilization = limit > 0 ? roundMoney((balance / limit) * 100) : 0;
  const status = getCardRiskStatus(utilization);
  const annualRate = Number(input.annual_interest_rate || 0);
  const monthlyInterestRate = annualRate > 0 ? annualRate / 12 / 100 : 0;
  const estimatedMonthlyInterest = roundMoney(balance * monthlyInterestRate);
  const recommendedPayment = calculateRecommendedPayment(balance, limit, utilization);
  const idealPayment = calculateIdealPayment(balance, limit, utilization);

  return {
    available_credit: available,
    credit_utilization: utilization,
    status,
    monthly_interest_rate: monthlyInterestRate,
    estimated_monthly_interest: estimatedMonthlyInterest,
    recommended_payment: recommendedPayment,
    ideal_payment: idealPayment,
  };
}

export function getCardRiskStatus(utilization: number): CardRiskStatus {
  if (utilization >= 80) return 'Peligro';
  if (utilization >= 50) return 'Alto uso';
  if (utilization >= 30) return 'Cuidado';
  return 'Saludable';
}

export function getCardPriority(status: CardRiskStatus) {
  if (status === 'Peligro') return 'Alta';
  if (status === 'Alto uso') return 'Media';
  return 'Baja';
}

export function getCardStatusClasses(status?: string) {
  if (status === 'Peligro') return 'border-red-300 bg-red-50 text-red-700';
  if (status === 'Alto uso') return 'border-orange-300 bg-orange-50 text-orange-700';
  if (status === 'Cuidado') return 'border-yellow-300 bg-yellow-50 text-yellow-700';
  return 'border-emerald-300 bg-emerald-50 text-emerald-700';
}

export function calculateRecommendedPayment(balance: number, limit: number, utilization: number) {
  if (limit <= 0 || balance <= 0) return 0;
  if (utilization >= 80) return roundMoney(Math.max(0, balance - limit * 0.7));
  if (utilization >= 50) return roundMoney(Math.max(0, balance - limit * 0.5));
  if (utilization >= 30) return roundMoney(Math.max(0, balance - limit * 0.3));
  return 0;
}

export function calculateIdealPayment(balance: number, limit: number, utilization: number) {
  if (limit <= 0 || balance <= 0 || utilization < 30) return 0;
  if (utilization >= 80) return roundMoney(Math.max(0, balance - limit * 0.5));
  return roundMoney(Math.max(0, balance - limit * 0.3));
}

function roundMoney(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100;
}
