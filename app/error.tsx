'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-primary">Noa Finanzas</p>
        <h1 className="mt-3 text-2xl font-display font-bold">No se pudo cargar esta vista</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ya estamos protegiendo la app para que un dato incompleto no bloquee toda la pantalla.
        </p>
        {error?.message ? <p className="mt-4 rounded-lg bg-muted p-3 text-left text-xs text-muted-foreground">{error.message}</p> : null}
        <Button className="mt-5 w-full" onClick={reset}>Reintentar</Button>
      </section>
    </main>
  );
}
