'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Smartphone, Banknote, Wallet, ArrowRightLeft, Plus, MapPin, X, Pencil, RefreshCcw } from 'lucide-react';
import { TransferModal } from './TransferModal';
import { showToast } from '@/lib/toast';

export type AccountType = string;

const initialAccountForm = {
  name: '',
  type: 'Banco',
  bankName: '',
  balance: '0',
  scope: 'personal',
  businessId: '',
};

export function AccountsModule() {
  const { accounts, businesses, protectedFunds, user, lastSyncedAt, dataError, createAccount, updateAccount, transferFunds, fetchInitialData } = useStore();
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountForm, setAccountForm] = useState(initialAccountForm);
  const [accountError, setAccountError] = useState('');
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const totalMoney = accounts.reduce((sum, account) => sum + Number(account.current_balance), 0);
  const totalBancos = accounts.filter((account) => account.type === 'Banco' || account.type === 'Cuenta personal').reduce((sum, account) => sum + Number(account.current_balance), 0);
  const totalYappy = accounts.filter((account) => account.type === 'Yappy').reduce((sum, account) => sum + Number(account.current_balance), 0);
  const totalEfectivo = accounts.filter((account) => account.type === 'Efectivo' || account.type === 'Caja negocio').reduce((sum, account) => sum + Number(account.current_balance), 0);
  const totalPersonal = accounts.filter((account) => account.is_personal).reduce((sum, account) => sum + Number(account.current_balance), 0);
  const totalNegocios = accounts.filter((account) => !account.is_personal).reduce((sum, account) => sum + Number(account.current_balance), 0);
  const committedMoney = protectedFunds.filter((fund) => fund.status === 'active').reduce((sum, fund) => sum + Number(fund.amount), 0);
  const freeMoney = totalMoney - committedMoney;
  const cashAccounts = accounts.filter((account) => account.type === 'Efectivo' || account.type === 'Caja negocio');
  const syncLabel = lastSyncedAt ? new Intl.DateTimeFormat('es-PA', { hour: '2-digit', minute: '2-digit' }).format(new Date(lastSyncedAt)) : 'sin actualizar';
  const sessionLabel = user?.email || (user?.id ? `usuario ${user.id.slice(0, 8)}` : 'sin sesion');

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case 'Banco':
      case 'Cuenta personal':
        return <Building2 className="w-5 h-5 text-blue-500" />;
      case 'Yappy':
        return <Smartphone className="w-5 h-5 text-purple-500" />;
      case 'Efectivo':
      case 'Caja negocio':
        return <Banknote className="w-5 h-5 text-emerald-500" />;
      default:
        return <Wallet className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAccountColor = (type: AccountType) => {
    switch (type) {
      case 'Banco':
      case 'Cuenta personal':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'Yappy':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-400';
      case 'Efectivo':
      case 'Caja negocio':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  const resetAccountModal = () => {
    setAccountForm(initialAccountForm);
    setEditingAccountId(null);
    setAccountError('');
    setIsAccountModalOpen(false);
  };

  const openCreateAccount = () => {
    setEditingAccountId(null);
    setAccountForm(initialAccountForm);
    setAccountError('');
    setIsAccountModalOpen(true);
  };

  const openEditAccount = (account: typeof accounts[number]) => {
    setEditingAccountId(account.id);
    setAccountForm({
      name: account.name,
      type: account.type,
      bankName: account.bank_name || '',
      balance: String(account.current_balance ?? 0),
      scope: account.is_personal ? 'personal' : 'negocio',
      businessId: account.business_id || '',
    });
    setAccountError('');
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = async () => {
    setIsSavingAccount(true);
    setAccountError('');

    try {
      const payload = {
        name: accountForm.name,
        type: accountForm.type,
        bank_name: accountForm.bankName,
        current_balance: Number(accountForm.balance),
        is_personal: accountForm.scope === 'personal',
        business_id: accountForm.scope === 'negocio' ? accountForm.businessId : undefined,
      };

      if (editingAccountId) {
        await updateAccount(editingAccountId, payload);
        showToast({ type: 'success', title: 'Cuenta actualizada', description: 'Los cambios quedaron guardados.' });
      } else {
        await createAccount(payload);
        showToast({ type: 'success', title: 'Cuenta creada', description: 'La cuenta ya aparece en el dashboard.' });
      }
      resetAccountModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : editingAccountId ? 'No se pudo actualizar la cuenta.' : 'No se pudo crear la cuenta.';
      setAccountError(message);
      showToast({ type: 'error', title: editingAccountId ? 'No se pudo actualizar la cuenta' : 'No se pudo crear la cuenta', description: message });
    } finally {
      setIsSavingAccount(false);
    }
  };

  const handleTransfer = async (transferData: { fromAccountId: string; toAccountId: string; amount: number; notes?: string }) => {
    await transferFunds(transferData);
    showToast({ type: 'success', title: 'Transferencia guardada', description: 'Los saldos fueron actualizados.' });
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await fetchInitialData();
      const refreshedError = useStore.getState().dataError;
      if (refreshedError) {
        showToast({ type: 'error', title: 'No se pudieron actualizar los datos', description: refreshedError });
      } else {
        showToast({ type: 'success', title: 'Datos actualizados', description: 'La PC volvio a consultar Supabase.' });
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold tracking-tight md:text-3xl">Cuentas y Bolsillos</h2>
          <p className="text-muted-foreground mt-1">Controla donde esta tu dinero realmente y gestiona transferencias.</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Sesion: {sessionLabel} - Actualizado: {syncLabel}
          </p>
          {dataError && <p className="mt-1 text-xs font-medium text-destructive">{dataError}</p>}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button variant="outline" onClick={handleRefreshData} disabled={isRefreshing} className="w-full sm:w-auto">
            <RefreshCcw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} /> Actualizar datos
          </Button>
          <Button onClick={() => setIsTransferModalOpen(true)} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto">
            <ArrowRightLeft className="w-4 h-4 mr-2" /> Transferir dinero
          </Button>
          <Button variant="outline" onClick={openCreateAccount} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Nueva cuenta
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Dinero total" value={totalMoney} icon={<Wallet className="h-4 w-4 text-muted-foreground" />} />
        <SummaryCard label="En bancos" value={totalBancos} accent="blue" icon={<Building2 className="h-4 w-4 text-blue-500" />} />
        <SummaryCard label="En Yappy" value={totalYappy} accent="purple" icon={<Smartphone className="h-4 w-4 text-purple-500" />} />
        <SummaryCard label="En efectivo" value={totalEfectivo} accent="emerald" icon={<Banknote className="h-4 w-4 text-emerald-500" />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Dinero personal" value={totalPersonal} compact />
        <SummaryCard label="Dinero negocios" value={totalNegocios} compact />
        <SummaryCard label="Comprometido" value={committedMoney} accent="orange" compact />
        <SummaryCard label="Libre seguro" value={freeMoney} accent="emerald" compact />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xl font-display font-semibold">Tus cuentas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {accounts.map((account) => (
              <Card key={account.id} className="bg-card hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${getAccountColor(account.type)}`}>
                        {getAccountIcon(account.type)}
                      </div>
                      <div>
                        <h4 className="font-semibold">{account.name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {account.bank_name || account.type} - {account.is_personal ? 'Personal' : 'Negocio'}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEditAccount(account)}
                      className="h-8 shrink-0 px-3 text-xs"
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Editar
                    </Button>
                  </div>
                  <div className="mt-6 pt-4 border-t border-border flex items-end justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Balance</p>
                      <p className="text-xl font-display font-bold mt-1">${Number(account.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {accounts.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center text-muted-foreground">
                  <Wallet className="mx-auto mb-3 h-10 w-10 opacity-25" />
                  <p className="mb-4">Todavia no hay cuentas creadas.</p>
                  <Button onClick={openCreateAccount}>Crear primera cuenta</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-display font-semibold">Efectivo fisico disponible</h3>
          <Card className="bg-emerald-500/5 border-emerald-500/20 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-10">
              <Banknote className="w-24 h-24 text-emerald-500" />
            </div>
            <CardContent className="p-6 relative z-10">
              <p className="text-sm font-medium text-emerald-700/80 dark:text-emerald-400">Efectivo total</p>
              <p className="text-4xl font-display font-bold text-emerald-700 dark:text-emerald-400 mt-1 mb-6">
                ${totalEfectivo.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>

              <div className="space-y-3">
                {cashAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-3 rounded-xl bg-white/60 dark:bg-black/20 border border-emerald-500/10">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-medium text-foreground">{account.name}</span>
                    </div>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">${Number(account.current_balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                {cashAccounts.length === 0 && (
                  <p className="text-sm text-muted-foreground">No hay cuentas de efectivo registradas.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        accounts={accounts}
        onTransfer={handleTransfer}
      />

      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <Card className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto border-border shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
              <div>
                <CardTitle>{editingAccountId ? 'Editar cuenta' : 'Nueva cuenta'}</CardTitle>
                <CardDescription>{editingAccountId ? 'Actualiza nombre, tipo, saldo, banco o negocio asociado.' : 'Registra una cuenta bancaria, Yappy o efectivo.'}</CardDescription>
              </div>
              <button onClick={resetAccountModal} className="rounded-xl p-1 text-muted-foreground hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <Field label="Nombre">
                <input value={accountForm.name} onChange={(event) => setAccountForm({ ...accountForm, name: event.target.value })} className="form-field" placeholder="Ej: Banco General personal" />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Tipo">
                  <select value={accountForm.type} onChange={(event) => setAccountForm({ ...accountForm, type: event.target.value })} className="form-field">
                    <option value="Banco">Banco</option>
                    <option value="Cuenta personal">Cuenta personal</option>
                    <option value="Yappy">Yappy</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Caja negocio">Caja negocio</option>
                  </select>
                </Field>
                <Field label={editingAccountId ? 'Saldo actual' : 'Saldo inicial'}>
                  <input type="number" min="0" step="0.01" value={accountForm.balance} onChange={(event) => setAccountForm({ ...accountForm, balance: event.target.value })} className="form-field" />
                </Field>
              </div>
              <Field label="Banco o referencia">
                <input value={accountForm.bankName} onChange={(event) => setAccountForm({ ...accountForm, bankName: event.target.value })} className="form-field" placeholder="Opcional" />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant={accountForm.scope === 'personal' ? 'default' : 'outline'} onClick={() => setAccountForm({ ...accountForm, scope: 'personal', businessId: '' })}>Personal</Button>
                <Button type="button" variant={accountForm.scope === 'negocio' ? 'default' : 'outline'} onClick={() => setAccountForm({ ...accountForm, scope: 'negocio' })}>Negocio</Button>
              </div>
              {accountForm.scope === 'negocio' && (
                <Field label="Negocio">
                  <select value={accountForm.businessId} onChange={(event) => setAccountForm({ ...accountForm, businessId: event.target.value })} className="form-field">
                    <option value="">Selecciona negocio</option>
                    {businesses.map((business) => (
                      <option key={business.id} value={business.id}>{business.name}</option>
                    ))}
                  </select>
                </Field>
              )}
              {accountError && <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{accountError}</div>}
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={resetAccountModal}>Cancelar</Button>
              <Button onClick={handleSaveAccount} disabled={isSavingAccount}>
                {isSavingAccount ? 'Guardando...' : editingAccountId ? 'Guardar cambios' : 'Guardar cuenta'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, accent, compact = false }: { label: string; value: number; icon?: React.ReactNode; accent?: 'blue' | 'purple' | 'emerald' | 'orange'; compact?: boolean }) {
  const accentClasses = {
    blue: 'bg-blue-500/5 border-blue-500/20 text-blue-700 dark:text-blue-400',
    purple: 'bg-purple-500/5 border-purple-500/20 text-purple-700 dark:text-purple-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400',
    orange: 'bg-orange-500/5 border-orange-500/20 text-orange-700 dark:text-orange-400',
  };

  return (
    <Card className={accent ? accentClasses[accent] : 'bg-card'}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between space-x-2">
          <p className={`text-sm font-medium ${accent ? '' : 'text-muted-foreground'}`}>{label}</p>
          {icon}
        </div>
        <div className="mt-2">
          <span className={`${compact ? 'text-xl' : 'text-2xl'} font-display font-bold`}>
            ${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
