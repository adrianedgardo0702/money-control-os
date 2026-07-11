'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Noa Finanzas UI error:', error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-primary">Noa Finanzas</p>
          <h1 className="mt-3 text-2xl font-display font-bold">No se pudo cargar la vista</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Hubo un dato o modulo que no cargo bien. Actualiza la app y vuelve a intentarlo.
          </p>
          <p className="mt-4 rounded-lg bg-muted p-3 text-left text-xs text-muted-foreground">
            {this.state.error.message || 'Error interno de interfaz'}
          </p>
          <Button className="mt-5 w-full" onClick={() => this.setState({ error: null })}>Reintentar</Button>
        </section>
      </main>
    );
  }
}
