import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Account } from '@/store/useStore';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onTransfer: (data: { fromAccountId: string; toAccountId: string; amount: number; notes?: string }) => Promise<void> | void;
}

export function TransferModal({ isOpen, onClose, accounts, onTransfer }: TransferModalProps) {
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTransfer = async () => {
    if (!fromAccountId || !toAccountId || !amount) return;
    setLoading(true);
    setError('');

    try {
      await onTransfer({
        fromAccountId,
        toAccountId,
        amount: parseFloat(amount),
        notes,
      });

      setFromAccountId('');
      setToAccountId('');
      setAmount('');
      setNotes('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo transferir el dinero.');
    } finally {
      setLoading(false);
    }
  };

  const fromAccount = accounts.find((account) => account.id === fromAccountId);
  const toAccount = accounts.find((account) => account.id === toAccountId);
  const showRiskWarning = fromAccount && !fromAccount.is_personal && toAccount?.is_personal;

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Transferir dinero</DialogTitle>
          <DialogDescription>
            Mueve fondos entre tus cuentas. Se guardara en Supabase y se actualizaran los saldos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="fromAccount">Cuenta origen</Label>
            <select
              id="fromAccount"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
            >
              <option value="">Selecciona cuenta origen</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} (${Number(account.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="toAccount">Cuenta destino</Label>
            <select
              id="toAccount"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
            >
              <option value="">Selecciona cuenta destino</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id} disabled={account.id === fromAccountId}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount">Monto ($)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notas</Label>
            <Input
              id="notes"
              placeholder="Ej: retiro de utilidades"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {showRiskWarning && (
            <div className="bg-orange-500/10 border border-orange-500/20 text-orange-700 dark:text-orange-400 p-3 rounded-lg text-sm">
              <strong>Nota:</strong> estas moviendo dinero de un negocio a una cuenta personal.
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleTransfer} disabled={loading || !fromAccountId || !toAccountId || !amount}>
            {loading ? 'Transfiriendo...' : 'Transferir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
