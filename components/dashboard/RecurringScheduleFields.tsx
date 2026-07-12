'use client';

import { calculateRecurrence, getRecurrenceDescription, monthOptions, weekdayOptions } from '@/lib/recurrence';

export type RecurringScheduleForm = {
  frequency: string;
  dueDate: string;
  weekdays: string[];
  recurrenceType: string;
  monthDays: number[];
  annualMonth: string;
  annualDay: string;
  intervalNumber: string;
  intervalType: string;
};

type Props = {
  form: RecurringScheduleForm;
  amount: string;
  name: string;
  onChange: (patch: Partial<RecurringScheduleForm>) => void;
  money: (value: number) => string;
};

export const defaultScheduleForm: RecurringScheduleForm = {
  frequency: 'Mensual',
  dueDate: new Date().toISOString().slice(0, 10),
  weekdays: ['monday'],
  recurrenceType: 'fixed_month_days',
  monthDays: [15],
  annualMonth: String(new Date().getMonth() + 1),
  annualDay: String(new Date().getDate()),
  intervalNumber: '1',
  intervalType: 'days',
};

export function scheduleFormFromExpense(expense: Partial<RecurringScheduleForm> & {
  frequency?: string;
  due_date?: string;
  next_run_date?: string;
  next_due_date?: string;
  recurrence_type?: string;
  weekdays?: string[];
  month_days?: number[];
  annual_month?: number;
  annual_day?: number;
  interval_number?: number;
  interval_type?: string;
}): RecurringScheduleForm {
  const date = expense.next_due_date || expense.due_date || expense.next_run_date || defaultScheduleForm.dueDate;
  return {
    frequency: expense.frequency || 'Mensual',
    dueDate: date,
    weekdays: expense.weekdays && expense.weekdays.length > 0 ? expense.weekdays : ['monday'],
    recurrenceType: expense.recurrence_type || 'fixed_month_days',
    monthDays: expense.month_days && expense.month_days.length > 0 ? expense.month_days : [15],
    annualMonth: String(expense.annual_month || new Date(date).getMonth() + 1),
    annualDay: String(expense.annual_day || new Date(date).getDate()),
    intervalNumber: String(expense.interval_number || 1),
    intervalType: expense.interval_type || 'days',
  };
}

export function buildSchedulePayload(form: RecurringScheduleForm, amount: number) {
  const recurrence = calculateRecurrence({
    amount,
    frequency: form.frequency,
    startDate: form.dueDate,
    recurrenceType: form.recurrenceType,
    weekdays: form.weekdays,
    monthDays: form.monthDays,
    annualMonth: form.annualMonth,
    annualDay: form.annualDay,
    intervalNumber: form.intervalNumber,
    intervalType: form.intervalType,
  });

  return {
    start_date: form.dueDate,
    next_run_date: recurrence.nextDueDate,
    next_due_date: recurrence.nextDueDate,
    due_date: recurrence.nextDueDate,
    recurrence_type: recurrence.recurrenceType,
    weekdays: recurrence.frequency === 'weekly' ? form.weekdays : [],
    month_days: ['biweekly', 'monthly'].includes(recurrence.frequency) && form.recurrenceType !== 'every_14_days' ? form.monthDays : [],
    annual_month: recurrence.frequency === 'annual' ? Number(form.annualMonth || 1) : null,
    annual_day: recurrence.frequency === 'annual' ? Number(form.annualDay || 1) : null,
    interval_number: recurrence.frequency === 'custom' || form.recurrenceType === 'every_14_days' ? Number(form.intervalNumber || (form.recurrenceType === 'every_14_days' ? 14 : 1)) : null,
    interval_type: recurrence.frequency === 'custom' ? form.intervalType : form.recurrenceType === 'every_14_days' ? 'days' : null,
    monthly_amount: recurrence.monthlyAmount,
    annual_amount: recurrence.annualAmount,
  };
}

export function RecurringScheduleFields({ form, amount, name, onChange, money }: Props) {
  const numericAmount = Number(amount || 0);
  const recurrence = calculateRecurrence({
    name,
    amount: numericAmount,
    frequency: form.frequency,
    startDate: form.dueDate,
    recurrenceType: form.recurrenceType,
    weekdays: form.weekdays,
    monthDays: form.monthDays,
    annualMonth: form.annualMonth,
    annualDay: form.annualDay,
    intervalNumber: form.intervalNumber,
    intervalType: form.intervalType,
  });

  const toggleWeekday = (value: string) => {
    const next = form.weekdays.includes(value)
      ? form.weekdays.filter((day) => day !== value)
      : [...form.weekdays, value];
    onChange({ weekdays: next.length > 0 ? next : [value] });
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/10 p-4">
      <div>
        <h4 className="font-semibold">Programacion del pago</h4>
        <p className="text-xs text-muted-foreground">El monto representa cuanto pagas cada vez. Noa calcula el equivalente mensual y anual.</p>
      </div>

      {form.frequency === 'Semanal' && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Que dia se paga?</p>
          <div className="flex flex-wrap gap-2">
            {weekdayOptions.map((day) => (
              <button
                type="button"
                key={day.value}
                onClick={() => toggleWeekday(day.value)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${form.weekdays.includes(day.value) ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted'}`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {form.frequency === 'Quincenal' && (
        <div className="space-y-3">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-muted-foreground">Tipo de quincena</span>
            <select className="form-field" value={form.recurrenceType} onChange={(event) => onChange({ recurrenceType: event.target.value })}>
              <option value="fixed_month_days">Dias fijos del mes</option>
              <option value="every_14_days">Cada 14 dias desde fecha inicial</option>
            </select>
          </label>
          {form.recurrenceType === 'fixed_month_days' ? (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Dias del mes</span>
              <select className="form-field" value={form.monthDays.join(',')} onChange={(event) => onChange({ monthDays: event.target.value.split(',').map(Number) })}>
                <option value="15,30">Dia 15 y 30</option>
                <option value="15,32">Dia 15 y ultimo dia del mes</option>
                <option value="1,15">Dia 1 y 15</option>
              </select>
            </label>
          ) : (
            <DateField label="Fecha inicial" value={form.dueDate} onChange={(value) => onChange({ dueDate: value, intervalNumber: '14', intervalType: 'days' })} />
          )}
        </div>
      )}

      {form.frequency === 'Mensual' && (
        <label className="block space-y-2">
          <span className="text-sm font-medium text-muted-foreground">Dia del mes</span>
          <select className="form-field" value={String(form.monthDays[0] || 1)} onChange={(event) => onChange({ monthDays: [Number(event.target.value)] })}>
            {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => <option key={day} value={day}>Dia {day}</option>)}
            <option value="32">Ultimo dia del mes</option>
          </select>
        </label>
      )}

      {form.frequency === 'Anual' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-muted-foreground">Mes</span>
            <select className="form-field" value={form.annualMonth} onChange={(event) => onChange({ annualMonth: event.target.value })}>
              {monthOptions.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-muted-foreground">Dia</span>
            <select className="form-field" value={form.annualDay} onChange={(event) => onChange({ annualDay: event.target.value })}>
              {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => <option key={day} value={day}>Dia {day}</option>)}
            </select>
          </label>
        </div>
      )}

      {form.frequency === 'Personalizado' && (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-muted-foreground">Cada</span>
            <input className="form-field" type="number" min="1" value={form.intervalNumber} onChange={(event) => onChange({ intervalNumber: event.target.value })} />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-muted-foreground">Tipo</span>
            <select className="form-field" value={form.intervalType} onChange={(event) => onChange({ intervalType: event.target.value })}>
              <option value="days">Dias</option>
              <option value="weeks">Semanas</option>
              <option value="months">Meses</option>
            </select>
          </label>
          <DateField label="Fecha inicial" value={form.dueDate} onChange={(value) => onChange({ dueDate: value })} />
        </div>
      )}

      {form.frequency !== 'Quincenal' && form.frequency !== 'Personalizado' && (
        <DateField label="Fecha base" value={form.dueDate} onChange={(value) => onChange({ dueDate: value })} />
      )}

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
        <p className="font-semibold">{name || 'Gasto fijo'}</p>
        <p className="mt-1 text-muted-foreground">Monto por pago: {money(numericAmount)}</p>
        <p className="text-muted-foreground">Frecuencia: {form.frequency}</p>
        <p className="text-muted-foreground">{getRecurrenceDescription({ amount: numericAmount, frequency: form.frequency, startDate: form.dueDate, recurrenceType: form.recurrenceType, weekdays: form.weekdays, monthDays: form.monthDays, annualMonth: form.annualMonth, annualDay: form.annualDay, intervalNumber: form.intervalNumber, intervalType: form.intervalType })}</p>
        <p className="text-muted-foreground">Proximo pago: {recurrence.nextDueDate}</p>
        <p className="font-semibold">Equivalente mensual: {money(recurrence.monthlyAmount)}</p>
        <p className="font-semibold">Equivalente anual: {money(recurrence.annualAmount)}</p>
      </div>
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <input className="form-field" type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
