// Copie Leaflet et JSZip depuis node_modules vers www/vendor (pas de bundler).
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'www', 'vendor');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'leaflet'), { recursive: true });

const leafletDist = path.join(root, 'node_modules', 'leaflet', 'dist');
for (const f of ['leaflet.js', 'leaflet.css']) {
  fs.copyFileSync(path.join(leafletDist, f), path.join(out, 'leaflet', f));
}
fs.cpSync(path.join(leafletDist, 'images'), path.join(out, 'leaflet', 'images'), { recursive: true });
fs.copyFileSync(
  path.join(root, 'node_modules', 'jszip', 'dist', 'jszip.min.js'),
  path.join(out, 'jszip.min.js')
);
console.log('[vendor] Leaflet + JSZip copiés dans www/vendor');
