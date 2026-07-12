const fs = require('fs');
const http = require('http');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const root = path.join(projectRoot, 'out');
const rawPort = process.env.PORT || '3000';
const port = Number.isNaN(Number(rawPort)) ? rawPort : Number(rawPort);

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
};

function resolveFile(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/, '');
  const direct = path.join(root, cleanPath);
  const html = path.join(root, `${cleanPath}.html`);
  const nested = path.join(root, cleanPath, 'index.html');

  for (const candidate of [direct, html, nested]) {
    if (!candidate.startsWith(root)) continue;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }

  return path.join(root, 'index.html');
}

http.createServer((request, response) => {
  if (!fs.existsSync(root)) {
    response.statusCode = 500;
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.end('No se encontro la carpeta out. Ejecuta npm run build antes de iniciar la app.');
    return;
  }

  const file = resolveFile(request.url || '/');
  const ext = path.extname(file);
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', types[ext] || 'application/octet-stream');
  fs.createReadStream(file)
    .on('error', () => {
      response.statusCode = 404;
      response.end('Not found');
    })
    .pipe(response);
}).listen(port, () => {
  console.log(`Noa Finanzas lista en el puerto ${rawPort}`);
});
