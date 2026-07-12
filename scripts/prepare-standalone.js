const fs = require('fs');
const path = require('path');

const root = process.cwd();
const standaloneDir = path.join(root, '.next', 'standalone');
const sourceStaticDir = path.join(root, '.next', 'static');
const targetStaticDir = path.join(standaloneDir, '.next', 'static');
const sourcePublicDir = path.join(root, 'public');
const targetPublicDir = path.join(standaloneDir, 'public');

function copyDirectory(source, target) {
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, { recursive: true });
}

if (!fs.existsSync(standaloneDir)) {
  throw new Error('No se encontro .next/standalone. Ejecuta next build antes de preparar produccion.');
}

copyDirectory(sourceStaticDir, targetStaticDir);
copyDirectory(sourcePublicDir, targetPublicDir);

console.log('Standalone listo para produccion.');
