'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { hasSupabaseConfig } from '@/lib/supabase';
import { 
  LayoutDashboard, 
  Briefcase, 
  Wallet,
  Landmark, 
  TrendingUp, 
  CreditCard, 
  MessageSquare,
  FileText,
  LogOut,
  Repeat,
  PlusCircle,
  MinusCircle,
  ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Overview } from '@/components/dashboard/Overview';
import { SetupScreen } from '@/components/dashboard/SetupScreen';
import { AccountsModule } from '@/components/dashboard/AccountsModule';
import { BusinessesModule } from '@/components/dashboard/BusinessesModule';
import { CashflowModule } from '@/components/dashboard/CashflowModule';
import { DebtsModule } from '@/components/dashboard/DebtsModule';
import { PersonalBudgetModule } from '@/components/dashboard/PersonalBudgetModule';
import { FinancialChatModule } from "@/components/dashboard/FinancialChatModule";
import { RecurringExpensesModule } from "@/components/dashboard/RecurringExpensesModule";
import { ProtectedFundsModule } from "@/components/dashboard/ProtectedFundsModule";
import { ReportsModule } from "@/components/dashboard/ReportsModule";
import { ToastViewport } from '@/components/ui/toast';

import { TransactionModal } from '@/components/dashboard/TransactionModal';

export default function App() {
  const { user, isLoading, isPreviewMode, fetchInitialData, signOut } = useStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, type: 'ingreso' | 'gasto'}>({ isOpen: false, type: 'ingreso' });

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  if (!hasSupabaseConfig && !isPreviewMode) {
    return <SetupScreen />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <SetupScreen isLogin />;
  }

  const navItems = [
    { id: 'overview', label: 'Dashboard General', icon: LayoutDashboard },
    { id: 'accounts', label: 'Cuentas y Bolsillos', icon: Landmark },
    { id: 'businesses', label: 'Mis Negocios', icon: Briefcase },
    { id: 'cashflow', label: 'Flujo de Caja', icon: TrendingUp },
    { id: 'protected', label: 'Dinero No Tocar', icon: ShieldAlert },
    { id: 'debts', label: 'Deudas', icon: CreditCard },
    { id: 'recurring', label: 'Gastos Recurrentes', icon: Repeat },
    { id: 'personal', label: 'Presupuesto Personal', icon: Wallet },
    { id: 'chat', label: 'Chat Financiero', icon: MessageSquare },
    { id: 'reports', label: 'Reportes PDF', icon: FileText },
  ];
  const activeItem = navItems.find((item) => item.id === activeTab) || navItems[0];

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground md:h-screen md:flex-row md:overflow-hidden">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-display font-bold tracking-tight">Money Control OS</h1>
            <p className="truncate text-xs font-medium text-muted-foreground">{activeItem.label}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              onClick={() => setModalConfig({ isOpen: true, type: 'ingreso' })}
              className="h-9 w-9 shrink-0 bg-success/10 p-0 text-success hover:bg-success/20"
              variant="ghost"
              aria-label="Ingreso rápido"
              title="Ingreso rápido"
            >
              <PlusCircle className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => setModalConfig({ isOpen: true, type: 'gasto' })}
              className="h-9 w-9 shrink-0 bg-destructive/10 p-0 text-destructive hover:bg-destructive/20"
              variant="ghost"
              aria-label="Gasto rápido"
              title="Gasto rápido"
            >
              <MinusCircle className="h-5 w-5" />
            </Button>
            <Button
              onClick={signOut}
              className="h-9 w-9 shrink-0 p-0 text-muted-foreground"
              variant="ghost"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card md:flex md:flex-col">
        <div className="p-6">
          <h1 className="text-xl font-display font-bold tracking-tight">Money Control OS</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  activeTab === item.id 
                    ? "bg-accent text-accent-foreground font-semibold" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-4">
          <div className="flex flex-col space-y-2">
            <Button 
              onClick={() => setModalConfig({ isOpen: true, type: 'ingreso' })}
              className="w-full justify-start text-sm bg-success/10 text-success hover:bg-success/20" 
              variant="ghost"
            >
              <PlusCircle className="w-4 h-4 mr-2" /> Ingreso Rápido
            </Button>
            <Button 
              onClick={() => setModalConfig({ isOpen: true, type: 'gasto' })}
              className="w-full justify-start text-sm bg-destructive/10 text-destructive hover:bg-destructive/20" 
              variant="ghost"
            >
              <MinusCircle className="w-4 h-4 mr-2" /> Gasto Rápido
            </Button>
          </div>
          <button 
            onClick={signOut}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1 bg-background px-4 pb-28 pt-4 md:overflow-y-auto md:p-8">
        {activeTab === 'overview' && <Overview />}
        {activeTab === 'accounts' && <AccountsModule />}
        {activeTab === 'businesses' && <BusinessesModule onNavigate={setActiveTab} />}
        {activeTab === 'cashflow' && <CashflowModule />}
        {activeTab === 'protected' && <ProtectedFundsModule />}
        {activeTab === 'debts' && <DebtsModule />}
        {activeTab === 'personal' && <PersonalBudgetModule />}
        {activeTab === 'chat' && <FinancialChatModule />}
        {activeTab === 'recurring' && <RecurringExpensesModule />}
        {activeTab === 'reports' && <ReportsModule />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden">
        <div className="flex gap-1 overflow-x-auto px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex min-w-[4.75rem] flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium transition-colors",
                  activeTab === item.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="max-w-full truncate">{item.label.replace('Dashboard ', '').replace('Presupuesto ', '')}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <TransactionModal 
        isOpen={modalConfig.isOpen} 
        type={modalConfig.type} 
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} 
      />
      <ToastViewport />
    </div>
  );
}
