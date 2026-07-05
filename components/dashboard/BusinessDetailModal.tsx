'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, TrendingUp, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction } from '@/store/useStore';

interface BusinessDetailModalProps {
  business: any;
  isOpen: boolean;
  onClose: () => void;
  onRegisterIncome: () => void;
  onRegisterExpense: () => void;
}

const getChartData = (transactions: Transaction[] = []) => {
  const months = new Map<string, { name: string; ingresos: number; gastos: number }>();

  transactions.forEach((transaction) => {
    const date = transaction.date ? new Date(transaction.date) : new Date();
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const label = date.toLocaleDateString('es-PA', { month: 'short' });
    const current = months.get(key) || { name: label, ingresos: 0, gastos: 0 };

    if (transaction.type === 'ingreso') {
      current.ingresos += Number(transaction.amount);
    } else {
      current.gastos += Number(transaction.amount);
    }
    months.set(key, current);
  });

  return Array.from(months.values()).slice(-4);
};

export function BusinessDetailModal({ business, isOpen, onClose, onRegisterIncome, onRegisterExpense }: BusinessDetailModalProps) {
  if (!isOpen || !business) return null;

  const chartData = getChartData(business.transactions);
  const recentTransactions = (business.transactions || []).slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <Card className="w-full max-w-4xl shadow-2xl border-border animate-in fade-in zoom-in-95 duration-200 my-8">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4 sticky top-0 bg-card z-10 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-3">
              <CardTitle className="text-2xl font-display">{business.name}</CardTitle>
              <Badge variant={business.statusVariant}>{business.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{business.type}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onRegisterIncome} className="hidden sm:flex text-success hover:bg-success/10 hover:text-success border-success/30">
              + Ingreso
            </Button>
            <Button variant="outline" size="sm" onClick={onRegisterExpense} className="hidden sm:flex text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30">
              - Gasto
            </Button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Ingresos" value={`$${business.income.toLocaleString()}`} tone="success" />
            <Stat label="Gastos" value={`$${business.expense.toLocaleString()}`} tone="destructive" />
            <Stat label="Ganancia neta" value={`$${business.profit.toLocaleString()}`} />
            <Stat label="Margen estimado" value={`${business.margin}%`} />
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Ingresos vs gastos</h3>
              <div className="h-[250px] w-full p-4 rounded-xl border border-border/50 bg-card">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="currentColor" className="text-muted-foreground" />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} stroke="currentColor" className="text-muted-foreground" />
                      <Tooltip
                        cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
                        contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 500 }}
                      />
                      <Bar dataKey="ingresos" name="Ingresos" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="gastos" name="Gastos" fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Sin movimientos para graficar.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Como usar el dinero
              </h3>
              <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Este negocio tiene <span className="font-bold text-foreground">${business.available.toLocaleString()}</span> disponibles.
                  Recomendamos separar <span className="font-medium text-primary">${business.reinvest.toLocaleString()}</span> para reinversion y
                  maximo <span className="font-medium text-success">${business.withdrawal.toLocaleString()}</span> como retiro seguro.
                </p>
                <div className="space-y-3 pt-2">
                  <Row label="Reinversion" value={business.reinvest} className="text-primary" />
                  <Row label="Retiro seguro" value={business.withdrawal} className="text-success" />
                  <Row label="Reserva / proximos gastos" value={business.available - business.reinvest - business.withdrawal} />
                </div>
              </div>

              <div className="p-4 rounded-xl border-l-4 border-l-orange-500 bg-orange-500/5 flex gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                <p className="text-sm text-orange-400 font-medium">{business.recommendation}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Ultimos movimientos</h3>
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <div className="grid grid-cols-5 bg-muted/50 p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-2">Concepto</div>
                <div>Categoria</div>
                <div>Fecha</div>
                <div className="text-right">Monto</div>
              </div>
              <div className="divide-y divide-border/50">
                {recentTransactions.map((transaction: Transaction) => (
                  <div key={transaction.id} className="grid grid-cols-5 p-3 text-sm items-center hover:bg-muted/20 transition-colors">
                    <div className="col-span-2 font-medium">{transaction.notes || (transaction.type === 'ingreso' ? 'Ingreso' : 'Gasto')}</div>
                    <div className="text-muted-foreground capitalize">{transaction.category || 'Sin categoria'}</div>
                    <div className="text-muted-foreground">{new Date(transaction.date).toLocaleDateString('es-PA')}</div>
                    <div className={`text-right font-medium ${transaction.type === 'ingreso' ? 'text-success' : 'text-destructive'}`}>
                      {transaction.type === 'ingreso' ? '+' : '-'}${Number(transaction.amount).toFixed(2)}
                    </div>
                  </div>
                ))}
                {recentTransactions.length === 0 && (
                  <div className="p-6 text-center text-sm text-muted-foreground">Sin movimientos registrados.</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'destructive' }) {
  const toneClass = tone === 'success' ? 'text-success' : tone === 'destructive' ? 'text-destructive' : '';
  return (
    <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className={`text-xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, className = '' }: { label: string; value: number; className?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${className}`}>${value.toLocaleString()}</span>
    </div>
  );
}
