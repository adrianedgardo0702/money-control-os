'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';

export function SetupScreen({ isLogin = false }: { isLogin?: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const { fetchInitialData } = useStore();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setError('');

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          if (error.message.includes('rate limit')) {
            setError('Limite de correos excedido en Supabase. Espera un momento o revisa la configuracion de Authentication.');
          } else {
            setError(error.message);
          }
        } else if (data.session) {
          await fetchInitialData();
        } else {
          setError('Revisa tu correo para confirmar la cuenta. Si ya lo confirmaste, inicia sesion.');
          setMode('login');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(error.message);
        } else {
          await fetchInitialData();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrio un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  if (!isLogin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-display">Configura Supabase</CardTitle>
            <CardDescription>
              Faltan las variables de entorno necesarias para conectar la app con tu base de datos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>En desarrollo, agregalas en un archivo .env.local. En Hostinger, configuralas desde las variables de entorno del proyecto.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li className="font-mono text-xs text-foreground">NEXT_PUBLIC_SUPABASE_URL</li>
              <li className="font-mono text-xs text-foreground">NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-display">
            {mode === 'login' ? 'Iniciar Sesion' : 'Registrarse'}
          </CardTitle>
          <CardDescription>
            {mode === 'login'
              ? 'Accede a Noa Finanzas.'
              : 'Crea una cuenta para comenzar.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contrasena</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? (mode === 'login' ? 'Entrando...' : 'Registrando...')
                : (mode === 'login' ? 'Entrar' : 'Crear Cuenta')}
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {mode === 'login'
                  ? 'No tienes cuenta? Registrate'
                  : 'Ya tienes cuenta? Inicia sesion'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
