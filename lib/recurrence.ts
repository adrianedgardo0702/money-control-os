export type IntervalType = 'days' | 'weeks' | 'months';

export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'annual' | 'custom';

export type RecurrenceScheduleInput = {
  name?: string;
  amount: number;
  frequency: string;
  startDate?: string;
  recurrenceType?: string;
  weekdays?: string[];
  monthDays?: number[];
  annualMonth?: number | string;
  annualDay?: number | string;
  intervalNumber?: number | string;
  intervalType?: IntervalType | string;
};

export type RecurrenceResult = {
  frequency: RecurrenceFrequency;
  nextDueDate: string;
  monthlyAmount: number;
  annualAmount: number;
  annualPayments: number;
  recurrenceType: string;
};

export const weekdayOptions = [
  { value: 'monday', label: 'Lunes' },
  { value: 'tuesday', label: 'Martes' },
  { value: 'wednesday', label: 'Miercoles' },
  { value: 'thursday', label: 'Jueves' },
  { value: 'friday', label: 'Viernes' },
  { value: 'saturday', label: 'Sabado' },
  { value: 'sunday', label: 'Domingo' },
];

export const monthOptions = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const weekdayIndex: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function normalizeFrequency(value?: string): RecurrenceFrequency {
  const normalized = String(value || '').trim().toLowerCase();
  if (['weekly', 'semanal'].includes(normalized)) return 'weekly';
  if (['biweekly', 'quincenal'].includes(normalized)) return 'biweekly';
  if (['monthly', 'mensual'].includes(normalized)) return 'monthly';
  if (['annual', 'anual'].includes(normalized)) return 'annual';
  if (['custom', 'personalizado'].includes(normalized)) return 'custom';
  return 'monthly';
}

export function calculateRecurrence(input: RecurrenceScheduleInput, fromDate = new Date()): RecurrenceResult {
  const amount = Number(input.amount || 0);
  const frequency = normalizeFrequency(input.frequency);
  const recurrenceType = input.recurrenceType || defaultRecurrenceType(frequency);
  const nextDueDate = calculateNextDueDate(input, fromDate);
  const annualPayments = calculateAnnualPayments({ ...input, frequency, recurrenceType });
  const annualAmount = roundMoney(amount * annualPayments);
  const monthlyAmount = roundMoney(annualAmount / 12);

  return {
    frequency,
    nextDueDate,
    monthlyAmount,
    annualAmount,
    annualPayments,
    recurrenceType,
  };
}

export function calculateNextDueDate(input: RecurrenceScheduleInput, fromDate = new Date()) {
  const frequency = normalizeFrequency(input.frequency);
  const base = startOfDay(fromDate);
  const startDate = input.startDate ? startOfDay(new Date(input.startDate)) : base;

  if (frequency === 'weekly') {
    const selected = (input.weekdays && input.weekdays.length > 0 ? input.weekdays : [weekdayName(base.getDay())])
      .map((day) => weekdayIndex[day])
      .filter((day) => Number.isInteger(day));
    const offsets = selected.map((day) => {
      const diff = day - base.getDay();
      return diff >= 0 ? diff : diff + 7;
    });
    const next = addDays(base, Math.min(...offsets));
    return toDateString(next);
  }

  if (frequency === 'biweekly') {
    if (input.recurrenceType === 'every_14_days') {
      let next = startDate;
      while (next < base) next = addDays(next, 14);
      return toDateString(next);
    }
    const days = sanitizeMonthDays(input.monthDays && input.monthDays.length > 0 ? input.monthDays : [15, 30]);
    return toDateString(nextMonthDay(base, days));
  }

  if (frequency === 'monthly') {
    const days = sanitizeMonthDays(input.monthDays && input.monthDays.length > 0 ? input.monthDays : [dayOrLast(input.annualDay || input.monthDays?.[0] || base.getDate())]);
    return toDateString(nextMonthDay(base, days));
  }

  if (frequency === 'annual') {
    const month = clamp(Number(input.annualMonth || startDate.getMonth() + 1), 1, 12);
    const day = clamp(Number(input.annualDay || startDate.getDate()), 1, 31);
    let next = dateWithSafeDay(base.getFullYear(), month - 1, day);
    if (next < base) next = dateWithSafeDay(base.getFullYear() + 1, month - 1, day);
    return toDateString(next);
  }

  const interval = Math.max(1, Number(input.intervalNumber || 1));
  const type = input.intervalType || 'days';
  let next = startDate;
  while (next < base) next = addInterval(next, interval, type);
  return toDateString(next);
}

export function generateDueDates(input: RecurrenceScheduleInput, fromDate = new Date(), daysAhead = 30) {
  const dates: string[] = [];
  const start = startOfDay(fromDate);
  const end = addDays(start, daysAhead);
  let cursor = start;

  for (let index = 0; index < 80; index += 1) {
    const next = calculateNextDueDate(input, cursor);
    const nextDate = startOfDay(new Date(next));
    if (nextDate > end) break;
    if (!dates.includes(next)) dates.push(next);
    cursor = addDays(nextDate, 1);
  }

  return dates;
}

export function getRecurrenceDescription(input: RecurrenceScheduleInput) {
  const frequency = normalizeFrequency(input.frequency);
  if (frequency === 'weekly') {
    const labels = (input.weekdays && input.weekdays.length > 0 ? input.weekdays : ['monday']).map(labelForWeekday);
    return `Este gasto se repetira todos los ${joinLabels(labels)}.`;
  }
  if (frequency === 'biweekly') {
    if (input.recurrenceType === 'every_14_days') return `Este gasto se repetira cada 14 dias desde ${input.startDate || 'la fecha inicial'}.`;
    const days = sanitizeMonthDays(input.monthDays && input.monthDays.length > 0 ? input.monthDays : [15, 30]);
    return `Este gasto se repetira los dias ${joinLabels(days.map(String))} de cada mes.`;
  }
  if (frequency === 'monthly') {
    const day = input.monthDays?.[0] === 32 ? 'ultimo dia' : `dia ${input.monthDays?.[0] || 1}`;
    return `Este gasto se repetira todos los meses el ${day}.`;
  }
  if (frequency === 'annual') {
    const month = monthOptions[clamp(Number(input.annualMonth || 1), 1, 12) - 1];
    return `Este gasto se repetira cada ${input.annualDay || 1} de ${month}.`;
  }
  return `Este gasto se repetira cada ${input.intervalNumber || 1} ${input.intervalType || 'days'} desde ${input.startDate || 'la fecha inicial'}.`;
}

export function labelForWeekday(value: string) {
  return weekdayOptions.find((day) => day.value === value)?.label || value;
}

function calculateAnnualPayments(input: RecurrenceScheduleInput & { frequency: RecurrenceFrequency; recurrenceType: string }) {
  if (input.frequency === 'weekly') return 52 * Math.max(1, input.weekdays?.length || 1);
  if (input.frequency === 'biweekly') return input.recurrenceType === 'every_14_days' ? 26 : 24;
  if (input.frequency === 'monthly') return 12 * Math.max(1, input.monthDays?.length || 1);
  if (input.frequency === 'annual') return 1;

  const interval = Math.max(1, Number(input.intervalNumber || 1));
  if (input.intervalType === 'weeks') return 52 / interval;
  if (input.intervalType === 'months') return 12 / interval;
  return 365 / interval;
}

function defaultRecurrenceType(frequency: RecurrenceFrequency) {
  if (frequency === 'weekly') return 'weekday';
  if (frequency === 'biweekly') return 'fixed_month_days';
  if (frequency === 'monthly') return 'month_day';
  if (frequency === 'annual') return 'annual_date';
  return 'custom_interval';
}

function nextMonthDay(base: Date, days: number[]) {
  const sorted = sanitizeMonthDays(days);
  for (let offset = 0; offset < 15; offset += 1) {
    const year = base.getFullYear();
    const month = base.getMonth() + offset;
    for (const day of sorted) {
      const candidate = dateWithSafeDay(year, month, day);
      if (candidate >= base) return candidate;
    }
  }
  return dateWithSafeDay(base.getFullYear(), base.getMonth() + 1, sorted[0]);
}

function sanitizeMonthDays(days: number[]) {
  return days.map((day) => clamp(Number(day), 1, 32)).sort((a, b) => a - b);
}

function dateWithSafeDay(year: number, month: number, day: number) {
  const last = new Date(year, month + 1, 0).getDate();
  return startOfDay(new Date(year, month, day === 32 ? last : Math.min(day, last)));
}

function addInterval(date: Date, amount: number, type: string) {
  const next = new Date(date);
  if (type === 'weeks') next.setDate(next.getDate() + amount * 7);
  else if (type === 'months') next.setMonth(next.getMonth() + amount);
  else next.setDate(next.getDate() + amount);
  return startOfDay(next);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function weekdayName(index: number) {
  return Object.entries(weekdayIndex).find(([, value]) => value === index)?.[0] || 'monday';
}

function joinLabels(labels: string[]) {
  if (labels.length <= 1) return labels[0] || '';
  return `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`;
}

function dayOrLast(value: number | string) {
  return Number(value) === 32 ? 32 : clamp(Number(value), 1, 31);
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function roundMoney(value: number) {
  return Math.round(Number(value || 0) * 100) / 100;
}
