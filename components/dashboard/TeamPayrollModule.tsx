'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowDownRight, Users, Clock, Wallet, Plus } from 'lucide-react';
import { TransactionModal } from './TransactionModal';
import { useState } from 'react';
import { useStore } from '@/store/useStore';

const money = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function TeamPayrollModule() {
  const { transactions } = useStore();
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; type: 'ingreso' | 'gasto' }>({ isOpen: false, type: 'gasto' });
  const payrollTransactions = transactions.filter((transaction) => transaction.category === 'nomina' || transaction.category === 'nómina');
  const payrollTotal = payrollTransactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold tracking-tight md:text-3xl">Equipo y Nomina</h2>
          <p className="text-muted-foreground mt-1">Vista basada solo en gastos de nomina registrados como movimientos reales.</p>
        </div>
        <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={() => setModalConfig({ isOpen: true, type: 'gasto' })}>
          <Plus className="w-4 h-4 mr-2" /> Registrar pago de nomina
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Summary title="Nomina registrada" value={payrollTotal} icon={<ArrowDownRight className="w-4 h-4 text-destructive" />} />
        <Summary title="Pagos pendientes" value={0} icon={<Clock className="w-4 h-4 text-warning" />} />
        <Summary title="Equipo activo" value={0} icon={<Users className="w-4 h-4 text-primary" />} count />
        <Summary title="Impacto en flujo" value={payrollTotal} icon={<Wallet className="w-4 h-4 text-primary" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pagos de nomina</CardTitle>
          <CardDescription>Movimientos reales con categoria nomina.</CardDescription>
        </CardHeader>
        <CardContent>
          {payrollTransactions.length > 0 ? (
            <div className="space-y-3">
              {payrollTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 p-3">
                  <div>
                    <p className="font-medium text-sm">{transaction.notes || 'Pago de nomina'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(transaction.date).toLocaleDateString('es-PA')}</p>
                  </div>
                  <span className="font-bold text-destructive">{money(Number(transaction.amount))}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
              No hay pagos de nomina registrados.
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionModal isOpen={modalConfig.isOpen} type={modalConfig.type} onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} />
    </div>
  );
}

function Summary({ title, value, icon, count }: { title: string; value: number; icon: React.ReactNode; count?: boolean }) {
  return (
    <Card className="bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          {title} {icon}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-display">{count ? value : money(value)}</div>
      </CardContent>
    </Card>
  );
}
