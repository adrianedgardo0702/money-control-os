# Money Control OS

App privada de finanzas construida con Next.js y Supabase para controlar cuentas, negocios, flujo de caja, deudas, gastos recurrentes, fondos protegidos y reportes.

## Requisitos

- Node.js 20 o superior.
- Una cuenta/proyecto en Supabase.
- Las tablas creadas con el archivo `supabase_schema.sql`.

## Configuracion local

1. Instala dependencias:

```bash
npm install
```

2. Crea `.env.local` usando `.env.example` como referencia:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. En Supabase, abre SQL Editor y ejecuta el contenido de `supabase_schema.sql`.

4. Inicia la app:

```bash
npm run dev
```

La app se abre normalmente en `http://localhost:3000`.

## Scripts

- `npm run dev`: inicia la app en desarrollo.
- `npm run lint`: revisa el codigo.
- `npm run build`: compila para produccion.
- `npm run start`: ejecuta la version compilada.

## Subir a GitHub

No subas `.env.local`; el archivo esta ignorado por Git. Sube el codigo fuente, `package.json`, `package-lock.json`, `.env.example`, `supabase_schema.sql` y esta documentacion.

Comandos sugeridos desde la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Preparar app financiera para produccion"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

## Despliegue

Consulta `DEPLOYMENT.md` para los pasos de Hostinger. Este proyecto usa `output: 'standalone'` en Next.js para facilitar el despliegue en servidores Node.js.
