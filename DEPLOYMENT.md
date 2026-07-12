# Despliegue en Hostinger

Esta app es un proyecto Next.js exportado como sitio estatico con Supabase en el navegador. En Hostinger debe publicarse el directorio `out`.

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

Configura el despliegue asi:

```bash
npm ci
npm run build
```

Directorio de salida / publish directory:

```bash
out
```

No necesitas comando de inicio para hosting estatico. Si Hostinger exige uno en modo Node, usa `npm run start`, que sirve el contenido de `out`.

## Base de datos

Antes de usar la app en produccion, abre Supabase y ejecuta el contenido de `supabase_schema.sql` en el SQL Editor. Luego crea o confirma un usuario desde Authentication.
