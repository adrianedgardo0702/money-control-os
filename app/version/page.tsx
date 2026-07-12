import { buildInfo } from '@/lib/buildInfo';

export default function VersionPage() {
  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <section className="mx-auto max-w-xl rounded-xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm font-semibold text-primary">Noa Finanzas</p>
        <h1 className="mt-2 text-2xl font-display font-bold">Version instalada</h1>
        <dl className="mt-5 space-y-3 text-sm">
          <div>
            <dt className="font-semibold text-muted-foreground">Version</dt>
            <dd className="mt-1 font-mono">{buildInfo.version}</dd>
          </div>
          <div>
            <dt className="font-semibold text-muted-foreground">Detalle</dt>
            <dd className="mt-1">{buildInfo.label}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
