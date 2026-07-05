# Despliegue en Hostinger

Esta app es un proyecto Next.js con Supabase. Para desplegarla en Hostinger necesitas un plan con soporte para Node.js o un VPS. Un hosting estatico/cPanel basico no ejecuta `next start`.

## Antes de subir a GitHub

1. Verifica que `.env.local` no se suba al repositorio.
2. Confirma que `package-lock.json` esta incluido.
3. Ejecuta:

```bash
npm install
npm run lint
npm run build
```

## Variables de entorno

Configura estas variables en Hostinger:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Usa la anon key publica de Supabase. No uses `service_role` en esta app.

## Comandos de Hostinger

Si Hostinger permite configurar comandos:

```bash
npm ci
npm run build
npm run start
```

La configuracion de Next.js usa `output: 'standalone'`, lo que facilita ejecutar la app en un entorno Node.js.

## Base de datos

Antes de usar la app en produccion, abre Supabase y ejecuta el contenido de `supabase_schema.sql` en el SQL Editor. Luego crea o confirma un usuario desde Authentication.
