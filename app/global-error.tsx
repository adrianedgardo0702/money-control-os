'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'Arial, sans-serif' }}>
          <section style={{ maxWidth: 420, width: '100%', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24, textAlign: 'center' }}>
            <p style={{ margin: 0, color: '#4f46e5', fontWeight: 700 }}>Noa Finanzas</p>
            <h1 style={{ margin: '12px 0 8px', fontSize: 24 }}>No se pudo cargar la app</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>Actualiza la pagina o intenta nuevamente.</p>
            <button
              onClick={reset}
              style={{ marginTop: 20, width: '100%', border: 0, borderRadius: 10, background: '#4f46e5', color: '#fff', padding: '12px 16px', fontWeight: 700 }}
            >
              Reintentar
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
