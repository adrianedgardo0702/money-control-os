import type {Metadata} from 'next';
import './globals.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Noa Finanzas',
  description: 'App privada para controlar negocios, cuentas, gastos, deudas y reportes financieros.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="es">
      <body className="font-sans antialiased bg-background text-foreground" suppressHydrationWarning>{children}</body>
    </html>
  );
}
