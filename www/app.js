'use strict';

/* ======================================================================
   RandoMBTiles — squelette
   - fonds raster en ligne (XYZ) + MBTiles hors-ligne (plugin natif Mbtiles)
   - import/export GPX, KML, KMZ
   - position GPS et enregistrement de trace
   ====================================================================== */

const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const P = isNative ? window.Capacitor.Plugins : {};
const Mbtiles = P.Mbtiles;

const $ = (id) => document.getElementById(id);
const statusEl = $('status');
const setStatus = (msg) => { statusEl.textContent = msg; };

/* ---------------------------------------------------------------- fonds en ligne */

const ONLINE = {
  'OpenStreetMap': {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19, attribution: '© OpenStreetMap'
  },
  'OpenTopoMap': {
    url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
    maxZoom: 17, attribution: '© OpenTopoMap'
  },
  'IGN Plan v2': {
    url: 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
         '&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&FORMAT=image/png' +
         '&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
    maxZoom: 18, attribution: '© IGN'
  }
};

function loadCustom() {
  try { return JSON.parse(localStorage.getItem('customXYZ') || '[]'); } catch { return []; }
}
function saveCustom(list) {
  try { localStorage.setItem('customXYZ', JSON.stringify(list)); } catch { /* quota */ }
}

/* ---------------------------------------------------------------- cache des tuiles en ligne (IndexedDB) */
// Permet d'utiliser les fonds en ligne hors-ligne : chaque tuile affichée est mise en cache
// automatiquement, et un panneau dédié permet de télécharger une zone à l'avance.
// Limite connue : certains serveurs de tuiles (notamment OpenStreetMap) n'autorisent pas la
// lecture programmatique (CORS) — la tuile s'affiche alors normalement mais n'est pas mise en
// cache. IGN et OpenTopoMap sont à tester ; le contournement de cette limite n'est pas possible
// côté application.

const TILE_DB_NAME = 'randos-tiles', TILE_STORE = 'tiles';
let _tileDbPromise = null;

function tileDb() {
  if (_tileDbPromise) return _tileDbPromise;
  _tileDbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(TILE_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(TILE_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _tileDbPromise;
}

async function tileCacheGet(key) {
  try {
    const db = await tileDb();
    return await new Promise((resolve) => {
      const req = db.transaction(TILE_STORE, 'readonly').objectStore(TILE_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function tileCachePut(key, blob) {
  const db = await tileDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TILE_STORE, 'readwrite');
    tx.objectStore(TILE_STORE).put(blob, key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function tileCacheStats(prefix) {
  try {
    const db = await tileDb();
    return await new Promise((resolve) => {
      const range = IDBKeyRange.bound(prefix + '|', prefix + '|\uffff');
      const req = db.transaction(TILE_STORE, 'readonly').objectStore(TILE_STORE).openCursor(range);
      let count = 0, bytes = 0;
      req.onsuccess = () => {
        const cur = req.result;
        if (cur) { count++; bytes += (cur.value && cur.value.size) || 0; cur.continue(); }
        else resolve({ count, bytes });
      };
      req.onerror = () => resolve({ count: 0, bytes: 0 });
    });
  } catch { return { count: 0, bytes: 0 }; }
}

async function tileCacheClear(prefix) {
  const db = await tileDb();
  return new Promise((resolve) => {
    const range = IDBKeyRange.bound(prefix + '|', prefix + '|\uffff');
    const req = db.transaction(TILE_STORE, 'readwrite').objectStore(TILE_STORE).openCursor(range);
    req.onsuccess = () => {
      const cur = req.result;
      if (cur) { cur.delete(); cur.continue(); } else resolve();
    };
    req.onerror = () => resolve();
  });
}

async function tileCacheClearAll() {
  const db = await tileDb();
  return new Promise((resolve) => {
    const tx = db.transaction(TILE_STORE, 'readwrite');
    tx.objectStore(TILE_STORE).clear();
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
}

const buildTileUrl = (template, z, x, y) => template.replace(/\{z\}/g, z).replace(/\{x\}/g, x).replace(/\{y\}/g, y);

/** Fond en ligne mis en cache : lit d'abord IndexedDB, sinon télécharge, affiche et met en cache. */
const CachedTileLayer = L.TileLayer.extend({
  createTile(coords, done) {
    const img = document.createElement('img');
    img.alt = '';
    const url = buildTileUrl(this._url, coords.z, coords.x, coords.y);
    const key = this._cacheKey + '|' + coords.z + '/' + coords.x + '/' + coords.y;
    tileCacheGet(key).then((blob) => {
      if (blob) { img.onload = img.onerror = () => done(null, img); img.src = URL.createObjectURL(blob); return; }
      fetch(url).then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.blob();
      }).then((blob) => {
        img.onload = img.onerror = () => done(null, img);
        img.src = URL.createObjectURL(blob);
        tileCachePut(key, blob).catch(() => {}); // best-effort ; une erreur de quota ne doit pas bloquer l'affichage
      }).catch(() => {
        // Hors-ligne, ou serveur refusant la lecture programmatique (CORS) : repli sur un chargement
        // classique, affiché mais non mis en cache.
        img.onload = img.onerror = () => done(null, img);
        img.src = url;
      });
    });
    return img;
  }
});

/* ---------------------------------------------------------------- photos de waypoints (IndexedDB) */
// Base séparée du cache de tuiles : cycle de vie différent (les photos suivent les waypoints,
// jamais vidées globalement sauf via "Effacer tout").

const PHOTO_DB_NAME = 'randos-photos', PHOTO_STORE = 'photos';
let _photoDbPromise = null;

function photoDb() {
  if (_photoDbPromise) return _photoDbPromise;
  _photoDbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(PHOTO_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(PHOTO_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _photoDbPromise;
}

async function photoPut(id, blob) {
  const db = await photoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE, 'readwrite');
    tx.objectStore(PHOTO_STORE).put(blob, id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function photoGet(id) {
  try {
    const db = await photoDb();
    return await new Promise((resolve) => {
      const req = db.transaction(PHOTO_STORE, 'readonly').objectStore(PHOTO_STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

function photoDelete(id) {
  return photoDb().then((db) => new Promise((resolve) => {
    const tx = db.transaction(PHOTO_STORE, 'readwrite');
    tx.objectStore(PHOTO_STORE).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  })).catch(() => {});
}

/** Redimensionne et compresse une photo avant stockage (les photos brutes peuvent faire plusieurs Mo). */
async function resizeImageFile(file, maxDim = 1600, quality = 0.8) {
  let source, w, h;
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' }); // respecte la rotation EXIF
    w = source.width; h = source.height;
  } catch {
    source = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image illisible'));
      img.src = URL.createObjectURL(file);
    });
    w = source.naturalWidth; h = source.naturalHeight;
  }
  if (w > maxDim || h > maxDim) {
    const scale = maxDim / Math.max(w, h);
    w = Math.round(w * scale); h = Math.round(h * scale);
  }
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(source, 0, 0, w, h);
  if (source.close) source.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Conversion image impossible')), 'image/jpeg', quality);
  });
}

/* ---------------------------------------------------------------- carte */

const map = L.map('map', { zoomControl: true, maxZoom: 22 }).setView([46.6, 2.5], 6);
L.control.scale({ metric: true, imperial: false }).addTo(map);

let baseLayer = null;

/** Couche MBTiles : chaque tuile est demandée au plugin natif (SQLite) puis affichée en data: URI. */
const MbtilesLayer = L.GridLayer.extend({
  initialize(name, mime, options) {
    this._name = name;
    this._mime = mime;
    L.GridLayer.prototype.initialize.call(this, options);
  },
  createTile(coords, done) {
    const img = document.createElement('img');
    img.alt = '';
    Mbtiles.getTile({ name: this._name, z: coords.z, x: coords.x, y: coords.y })
      .then((r) => {
        if (r && r.data) {
          img.onload = img.onerror = () => done(null, img);
          img.src = 'data:' + this._mime + ';base64,' + r.data;
        } else {
          done(null, img); // tuile absente : case vide
        }
      })
      .catch((e) => done(e, img));
    return img;
  }
});

const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };

async function useMbtiles(name) {
  if (!isNative || !Mbtiles) { setStatus('MBTiles : disponible uniquement dans l\'APK'); return; }
  setStatus('Ouverture de ' + name + '…');
  try {
    const { metadata: m } = await Mbtiles.open({ name });
    const fmt = (m.format || 'png').toLowerCase();
    if (fmt === 'pbf') { setStatus('MBTiles vectoriel (pbf) non supporté : raster uniquement'); return; }
    const minZ = parseInt(m.minzoom ?? '0', 10);
    const maxZ = parseInt(m.maxzoom ?? '18', 10);
    const layer = new MbtilesLayer(name, MIME[fmt] || 'image/png', {
      minZoom: minZ, maxNativeZoom: maxZ, maxZoom: maxZ + 3, tileSize: 256,
      attribution: m.attribution || m.name || ''
    });
    replaceBase(layer);
    if (m.bounds) {
      const [w, s, e, n] = m.bounds.split(',').map(Number);
      if ([w, s, e, n].every(Number.isFinite)) map.fitBounds([[s, w], [n, e]]);
    }
    setStatus('MBTiles : ' + (m.name || name) + ' (z' + minZ + '–' + maxZ + ')');
  } catch (e) {
    setStatus('Erreur MBTiles : ' + (e.message || e));
  }
}

function replaceBase(layer) {
  if (baseLayer) map.removeLayer(baseLayer);
  baseLayer = layer.addTo(map);
  baseLayer.bringToBack();
}

function useOnline(def, cacheKey) {
  const layer = new CachedTileLayer(def.url, { maxZoom: def.maxZoom, attribution: def.attribution });
  layer._cacheKey = cacheKey;
  replaceBase(layer);
  setStatus('Fond en ligne');
}

/* ---------------------------------------------------------------- sélecteur de fonds */

const sel = $('basemap');

async function refreshBasemaps(selectValue) {
  sel.innerHTML = '';
  const gOnline = document.createElement('optgroup');
  gOnline.label = 'En ligne';
  Object.keys(ONLINE).forEach((k) => gOnline.append(new Option(k, 'online:' + k)));
  loadCustom().forEach((c, i) => gOnline.append(new Option(c.name, 'custom:' + i)));
  sel.append(gOnline);

  if (isNative && Mbtiles) {
    try {
      const { files } = await Mbtiles.list();
      if (files.length) {
        const g = document.createElement('optgroup');
        g.label = 'Hors-ligne (MBTiles)';
        files.forEach((f) => g.append(new Option(f.name + ' (' + Math.round(f.size / 1048576) + ' Mo)', 'mbt:' + f.name)));
        sel.append(g);
      }
    } catch { /* ignoré */ }
  }
  if (selectValue) sel.value = selectValue;
}

sel.addEventListener('change', () => applyBasemap(sel.value));

function applyBasemap(v) {
  const [kind, ...rest] = v.split(':');
  const key = rest.join(':');
  if (kind === 'online') useOnline(ONLINE[key], v);
  else if (kind === 'custom') useOnline({ url: loadCustom()[Number(key)].url, maxZoom: 19, attribution: '' }, v);
  else if (kind === 'mbt') useMbtiles(key);
}

$('btn-xyz').addEventListener('click', () => {
  const url = prompt('URL du fond XYZ (avec {z}, {x}, {y}) :', 'https://exemple.org/tiles/{z}/{x}/{y}.png');
  if (!url) return;
  if (!/\{z\}/.test(url) || !/\{x\}/.test(url) || !/\{y\}/.test(url)) { alert('L\'URL doit contenir {z}, {x} et {y}.'); return; }
  const name = prompt('Nom du fond :', 'Fond perso') || 'Fond perso';
  const list = loadCustom();
  list.push({ name, url });
  saveCustom(list);
  refreshBasemaps('custom:' + (list.length - 1)).then(() => applyBasemap(sel.value));
});

$('btn-mbt').addEventListener('click', async () => {
  if (!isNative || !Mbtiles) { alert('L\'import MBTiles nécessite l\'application Android (APK).'); return; }
  try {
    setStatus('Copie du fichier MBTiles… (peut durer pour un gros fichier)');
    const r = await Mbtiles.pick();
    await refreshBasemaps('mbt:' + r.name);
    applyBasemap(sel.value);
  } catch (e) {
    setStatus(e.message || 'Import annulé');
  }
});

/* ---------------------------------------------------------------- données (GeoJSON en mémoire) */

let features = [];
const overlay = L.featureGroup().addTo(map);
const featureLayers = new Map(); // id -> couche Leaflet (pour agir sur une trace précise)

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const newId = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'f' + Date.now() + Math.random().toString(16).slice(2));
const isTraceFeature = (f) => f.geometry && (f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString');
const isListableFeature = (f) => isTraceFeature(f) || (f.geometry && f.geometry.type === 'Point');

const pad2 = (n) => String(n).padStart(2, '0');
// Heure locale de l'appareil, lisible : ex. "2026-09-29 14:32"
function localStamp(d = new Date()) {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}
// Heure locale, compacte, pour les noms de fichiers : ex. "20260929-1432"
function localStampCompact(d = new Date()) {
  return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + '-' + pad2(d.getHours()) + pad2(d.getMinutes());
}

/* ---------------------------------------------------------------- sauvegarde automatique */
// À chaque trace enregistrée, un fichier GPX réel est écrit en silence dans le stockage privé
// de l'app (indépendant de localStorage) : protège contre une corruption du stockage web, un
// "vider le cache" accidentel, ou simplement l'oubli d'exporter. Ne protège PAS contre une
// désinstallation ou un "effacer les données" de l'app — "Exporter les sauvegardes" (bouton du
// panneau Traces) permet d'en sortir une copie indépendante, sur Drive ou par mail par exemple.

const BACKUP_DIR = 'backups';

async function autoBackupTrace(feature) {
  if (!isNative || !P.Filesystem) return; // pas de sauvegarde silencieuse hors de l'APK
  try {
    const base = ((feature.properties && feature.properties.name) || 'trace').replace(/[^A-Za-z0-9._ -]/g, '_').trim() || 'trace';
    const path = BACKUP_DIR + '/' + base + '-' + Date.now() + '.gpx';
    await P.Filesystem.writeFile({ path, data: toGPX([feature]), directory: 'DATA', encoding: 'utf8', recursive: true });
    pruneBackups();
  } catch (e) {
    console.error('Sauvegarde automatique impossible :', e); // best-effort : ne doit jamais interrompre l'enregistrement
  }
}

async function pruneBackups(maxFiles = 200) {
  try {
    const { files } = await P.Filesystem.readdir({ path: BACKUP_DIR, directory: 'DATA' });
    const names = files.map((f) => (typeof f === 'string' ? f : f.name)).sort(); // l'horodatage dans le nom trie chronologiquement
    if (names.length <= maxFiles) return;
    for (const name of names.slice(0, names.length - maxFiles)) {
      await P.Filesystem.deleteFile({ path: BACKUP_DIR + '/' + name, directory: 'DATA' }).catch(() => {});
    }
  } catch { /* dossier pas encore créé, ou erreur de lecture : ignoré */ }
}

async function exportBackups() {
  if (!isNative || !P.Filesystem) { setStatus('Sauvegardes disponibles uniquement dans l\'APK'); return; }
  try {
    const { files } = await P.Filesystem.readdir({ path: BACKUP_DIR, directory: 'DATA' });
    if (!files.length) { setStatus('Aucune sauvegarde automatique pour le moment'); return; }
    const zip = new JSZip();
    for (const f of files) {
      const name = typeof f === 'string' ? f : f.name;
      const { data } = await P.Filesystem.readFile({ path: BACKUP_DIR + '/' + name, directory: 'DATA', encoding: 'utf8' });
      zip.file(name, data);
    }
    const b64 = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });
    await saveFile('sauvegardes-randos-' + localStampCompact() + '.zip', b64, 'application/zip', true);
    setStatus(files.length + ' sauvegarde(s) exportée(s)');
  } catch (e) {
    setStatus('Export des sauvegardes : ' + (e.message || e));
  }
}

function persist() {
  try {
    localStorage.setItem('features', JSON.stringify(features));
  } catch {
    setStatus('⚠️ Échec de la sauvegarde locale (stockage plein ?) — exportez vos traces dès que possible');
  }
}
function restore() {
  try { features = JSON.parse(localStorage.getItem('features') || '[]'); } catch { features = []; }
  let migrated = false;
  for (const f of features) if (!f.id) { f.id = newId(); migrated = true; }
  if (migrated) persist();
}

const photoDivIcon = L.divIcon({
  className: 'wpt-photo-icon',
  html: '📷',
  iconSize: [28, 28],
  iconAnchor: [14, 26]
});

/** Construit et attache la popup (nom/description/photo) d'une couche Leaflet. Réutilisé par
 *  drawFeature (création) et renameFeature (mise à jour), pour ne jamais perdre la description
 *  ou la photo lors d'un simple renommage. */
function bindFeaturePopup(layer, props) {
  const p = props || {};
  layer.off('popupopen'); // évite d'empiler les écouteurs si la popup est reconstruite (renommage)
  if (!p.name && !p.desc && !p.photoId) return;
  const html = '<b>' + esc(p.name || '') + '</b>' + (p.desc ? '<br>' + esc(p.desc) : '') +
    (p.photoId ? '<br><div class="popup-photo" data-loaded="0">Chargement de la photo…</div>' : '');
  layer.bindPopup(html, { maxWidth: 220 });
  if (p.photoId) {
    layer.on('popupopen', async () => {
      const popup = layer.getPopup();
      const el = popup.getElement() && popup.getElement().querySelector('.popup-photo');
      if (!el || el.dataset.loaded === '1') return;
      const blob = await photoGet(p.photoId);
      el.dataset.loaded = '1';
      if (blob) { el.innerHTML = '<img src="' + URL.createObjectURL(blob) + '" alt="">'; popup.update(); }
      else el.textContent = 'Photo introuvable';
    });
  }
}

function drawFeature(f) {
  const layer = L.geoJSON(f, {
    style: () => ({ color: '#d9480f', weight: 4, opacity: 0.9, fillOpacity: 0.15 }),
    pointToLayer: (ft, latlng) => (ft.properties && ft.properties.photoId)
      ? L.marker(latlng, { icon: photoDivIcon })
      : L.circleMarker(latlng, { radius: 7, color: '#fff', weight: 2, fillColor: '#1c7ed6', fillOpacity: 1 }),
    onEachFeature: (ft, l) => bindFeaturePopup(l, ft.properties)
  });
  featureLayers.set(f.id, layer);
  overlay.addLayer(layer);
}

function drawFeatures(list) { list.forEach(drawFeature); }

function addFeatures(list, fit = true) {
  for (const f of list) if (!f.id) f.id = newId();
  features.push(...list);
  drawFeatures(list);
  persist();
  if (fit && overlay.getBounds().isValid()) map.fitBounds(overlay.getBounds(), { padding: [30, 30] });
  refreshTracesPanel();
}

$('btn-clear').addEventListener('click', () => {
  if (!features.length || !confirm('Effacer tous les tracés et waypoints ?')) return;
  const photoIds = features.filter((f) => f.properties && f.properties.photoId).map((f) => f.properties.photoId);
  features = [];
  overlay.clearLayers();
  featureLayers.clear();
  persist();
  setStatus('Tracés effacés');
  refreshTracesPanel();
  photoIds.forEach((id) => photoDelete(id));
});

/* ---------------------------------------------------------------- liste des traces */

const tracesPanel = $('traces-panel');
const tracesListEl = $('traces-list');
const tracesEmptyEl = $('traces-empty');

function traceStats(f) {
  const geom = f.geometry;
  const lines = geom.type === 'LineString' ? [geom.coordinates] : geom.coordinates;
  const timesProp = f.properties && f.properties.times;
  const timeLines = timesProp ? (geom.type === 'LineString' ? [timesProp] : timesProp) : null;

  let distanceM = 0, gain = 0, loss = 0, hasEle = false;
  let minTime = null, maxTime = null;

  lines.forEach((line, li) => {
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c.length > 2 && Number.isFinite(c[2])) hasEle = true;
      if (i > 0) {
        distanceM += map.distance([line[i - 1][1], line[i - 1][0]], [c[1], c[0]]);
        if (c.length > 2 && line[i - 1].length > 2) {
          const d = c[2] - line[i - 1][2];
          if (d > 0) gain += d; else loss += -d; // dénivelé brut (non lissé), donnée GPS parfois bruitée
        }
      }
    }
    const times = timeLines && timeLines[li];
    if (times) {
      for (const t of times) {
        if (!t) continue;
        const ms = typeof t === 'number' ? t : new Date(t).getTime();
        if (!Number.isFinite(ms)) continue;
        if (minTime === null || ms < minTime) minTime = ms;
        if (maxTime === null || ms > maxTime) maxTime = ms;
      }
    }
  });

  const distanceKm = distanceM / 1000;
  const durationMs = (minTime !== null && maxTime !== null && maxTime > minTime) ? (maxTime - minTime) : null;
  const speedKmh = durationMs ? distanceKm / (durationMs / 3600000) : null;
  return {
    distanceKm,
    gain: hasEle ? Math.round(gain) : null,
    loss: hasEle ? Math.round(loss) : null,
    durationMs,
    speedKmh
  };
}

function formatDuration(ms) {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return h > 0 ? h + ' h ' + String(m).padStart(2, '0') : m + ' min';
}

function statsLine(f) {
  const s = traceStats(f);
  const parts = [s.distanceKm.toFixed(2) + ' km'];
  if (s.gain !== null) parts.push('+' + s.gain + ' m / −' + s.loss + ' m');
  parts.push(s.durationMs !== null ? formatDuration(s.durationMs) : 'durée n/d');
  if (s.speedKmh !== null) parts.push(s.speedKmh.toFixed(1) + ' km/h');
  return parts.join(' · ');
}

function metaLineFor(f) {
  if (f.geometry.type === 'Point') {
    const c = f.geometry.coordinates;
    let s = c[1].toFixed(5) + ', ' + c[0].toFixed(5);
    if (c.length > 2) s += ' · ' + Math.round(c[2]) + ' m';
    return s;
  }
  return statsLine(f);
}

function refreshTracesPanel() {
  if (tracesPanel.classList.contains('hidden')) return; // pas besoin de reconstruire si le panneau est fermé
  const items = features.filter(isListableFeature);
  tracesListEl.innerHTML = '';
  tracesEmptyEl.classList.toggle('hidden', items.length > 0);
  for (const f of items) {
    const li = document.createElement('li');
    const isPoint = f.geometry.type === 'Point';
    const icon = isPoint ? (f.properties && f.properties.photoId ? '📷 ' : '📍 ') : '';
    li.innerHTML =
      '<span class="t-info"><span class="t-name">' + icon + esc(f.properties && f.properties.name || '(sans nom)') + '</span>' +
      '<span class="t-meta">' + metaLineFor(f) + '</span></span>' +
      '<button class="t-zoom" title="Centrer sur la carte">🔍</button>' +
      '<button class="t-ren" title="Renommer">✎</button>' +
      '<button class="t-exp" title="Exporter">⬇</button>' +
      '<button class="t-del" title="Supprimer">🗑</button>';
    li.querySelector('.t-zoom').addEventListener('click', () => zoomToFeature(f));
    li.querySelector('.t-ren').addEventListener('click', () => renameFeature(f));
    li.querySelector('.t-exp').addEventListener('click', () => exportOne(f));
    li.querySelector('.t-del').addEventListener('click', () => deleteFeature(f));
    tracesListEl.appendChild(li);
  }
}

function zoomToFeature(f) {
  if (f.geometry.type === 'Point') {
    const [lon, lat] = f.geometry.coordinates;
    map.setView([lat, lon], Math.max(map.getZoom(), 16));
    const layer = featureLayers.get(f.id);
    if (layer) layer.eachLayer((l) => { if (l.getPopup && l.getPopup()) l.openPopup(); });
    return;
  }
  const layer = featureLayers.get(f.id);
  if (layer && layer.getBounds && layer.getBounds().isValid()) {
    map.fitBounds(layer.getBounds(), { padding: [30, 30] });
  }
}

function renameFeature(f) {
  const current = (f.properties && f.properties.name) || '';
  const label = f.geometry.type === 'Point' ? 'du waypoint' : 'de la trace';
  const name = prompt('Nouveau nom ' + label + ' :', current);
  if (name === null) return; // annulé
  f.properties = f.properties || {};
  f.properties.name = name.trim() || '(sans nom)';
  persist();
  const layer = featureLayers.get(f.id);
  if (layer) layer.eachLayer((l) => bindFeaturePopup(l, f.properties)); // conserve description/photo
  refreshTracesPanel();
}

async function exportOne(f) {
  const fmt = (prompt('Format d\'export : gpx, kml ou kmz', 'gpx') || '').trim().toLowerCase();
  if (!['gpx', 'kml', 'kmz'].includes(fmt)) return;
  const fallback = f.geometry.type === 'Point' ? 'waypoint' : 'trace';
  const base = ((f.properties && f.properties.name) || fallback).replace(/[^A-Za-z0-9._ -]/g, '_').trim() || fallback;
  try {
    if (fmt === 'gpx') await saveFile(base + '.gpx', toGPX([f]), 'application/gpx+xml', false);
    else if (fmt === 'kml') await saveFile(base + '.kml', toKML([f]), 'application/vnd.google-earth.kml+xml', false);
    else {
      const zip = new JSZip();
      if (f.properties && f.properties.photoId) {
        const blob = await photoGet(f.properties.photoId);
        if (blob) zip.file('photos/' + f.properties.photoId + '.jpg', blob);
      }
      zip.file('doc.kml', toKML([f], { embedPhotos: true }));
      const b64 = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });
      await saveFile(base + '.kmz', b64, 'application/vnd.google-earth.kmz', true);
    }
    setStatus('Export ' + fmt.toUpperCase() + ' prêt : ' + base);
  } catch (e) {
    setStatus('Export : ' + (e.message || e));
  }
}

function deleteFeature(f) {
  const name = (f.properties && f.properties.name) || '(sans nom)';
  const label = f.geometry.type === 'Point' ? 'le waypoint' : 'la trace';
  if (!confirm('Supprimer ' + label + ' « ' + name + ' » ? Cette action est irréversible.')) return;
  const layer = featureLayers.get(f.id);
  if (layer) { overlay.removeLayer(layer); featureLayers.delete(f.id); }
  features = features.filter((x) => x.id !== f.id);
  persist();
  refreshTracesPanel();
  setStatus(label === 'le waypoint' ? 'Waypoint supprimé' : 'Trace supprimée');
  if (f.properties && f.properties.photoId) photoDelete(f.properties.photoId);
}

$('btn-traces').addEventListener('click', () => {
  tracesPanel.classList.remove('hidden');
  refreshTracesPanel();
});
$('traces-close').addEventListener('click', () => tracesPanel.classList.add('hidden'));
$('btn-export-backups').addEventListener('click', exportBackups);

/* ---------------------------------------------------------------- parsing GPX / KML / KMZ */

const xml = (text) => new DOMParser().parseFromString(text, 'application/xml');

function childText(el, tag) {
  for (const c of el.children) if (c.localName === tag) return c.textContent.trim();
  return '';
}

function parseGPX(text) {
  const d = xml(text);
  const out = [];
  for (const w of d.getElementsByTagName('wpt')) {
    const ele = childText(w, 'ele');
    out.push({
      type: 'Feature',
      properties: { name: childText(w, 'name'), desc: childText(w, 'desc') },
      geometry: {
        type: 'Point',
        coordinates: [+w.getAttribute('lon'), +w.getAttribute('lat')].concat(ele ? [+ele] : [])
      }
    });
  }
  const pt = (p, tag) => {
    const ele = childText(p, 'ele');
    return [+p.getAttribute('lon'), +p.getAttribute('lat')].concat(ele ? [+ele] : []);
  };
  for (const t of d.getElementsByTagName('trk')) {
    const rawSegs = [...t.getElementsByTagName('trkseg')].map((s) => {
      const trkpts = [...s.getElementsByTagName('trkpt')];
      return { coords: trkpts.map((p) => pt(p)), times: trkpts.map((p) => childText(p, 'time') || null) };
    }).filter((s) => s.coords.length > 1);
    if (!rawSegs.length) continue;
    const segs = rawSegs.map((s) => s.coords);
    const timeSegs = rawSegs.map((s) => s.times);
    const hasTimes = timeSegs.some((seg) => seg.some(Boolean));
    const props = { name: childText(t, 'name') };
    if (hasTimes) props.times = segs.length === 1 ? timeSegs[0] : timeSegs;
    out.push({
      type: 'Feature',
      properties: props,
      geometry: segs.length === 1
        ? { type: 'LineString', coordinates: segs[0] }
        : { type: 'MultiLineString', coordinates: segs }
    });
  }
  for (const r of d.getElementsByTagName('rte')) {
    const coords = [...r.getElementsByTagName('rtept')].map((p) => pt(p));
    if (coords.length > 1) {
      out.push({ type: 'Feature', properties: { name: childText(r, 'name') }, geometry: { type: 'LineString', coordinates: coords } });
    }
  }
  return out;
}

const kmlCoords = (el) =>
  el.textContent.trim().split(/\s+/).filter(Boolean).map((s) => s.split(',').map(Number)).filter((c) => c.length >= 2 && c.every(Number.isFinite));

function parseKML(text) {
  const d = xml(text);
  const out = [];
  for (const pm of d.getElementsByTagName('Placemark')) {
    const props = { name: childText(pm, 'name'), desc: childText(pm, 'description') };
    const push = (geometry) => out.push({ type: 'Feature', properties: props, geometry });

    for (const p of pm.getElementsByTagName('Point')) {
      const c = kmlCoords(p.getElementsByTagName('coordinates')[0]);
      if (c.length) push({ type: 'Point', coordinates: c[0] });
    }
    for (const l of pm.getElementsByTagName('LineString')) {
      const c = kmlCoords(l.getElementsByTagName('coordinates')[0]);
      if (c.length > 1) push({ type: 'LineString', coordinates: c });
    }
    for (const pg of pm.getElementsByTagName('Polygon')) {
      const rings = [];
      for (const tag of ['outerBoundaryIs', 'innerBoundaryIs']) {
        for (const b of pg.getElementsByTagName(tag)) {
          const c = kmlCoords(b.getElementsByTagName('coordinates')[0]);
          if (c.length > 2) rings.push(c);
        }
      }
      if (rings.length) push({ type: 'Polygon', coordinates: rings });
    }
  }
  return out;
}

async function parseKMZ(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const names = Object.keys(zip.files).filter((n) => n.toLowerCase().endsWith('.kml'));
  if (!names.length) throw new Error('KMZ sans fichier .kml');
  const main = names.find((n) => n.toLowerCase() === 'doc.kml') || names[0];
  return parseKML(await zip.files[main].async('string'));
}

/* ---------------------------------------------------------------- import */

$('btn-import').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', async (e) => {
  for (const f of e.target.files) {
    try {
      const ext = f.name.split('.').pop().toLowerCase();
      let list;
      if (ext === 'gpx') list = parseGPX(await f.text());
      else if (ext === 'kml') list = parseKML(await f.text());
      else if (ext === 'kmz') list = await parseKMZ(await f.arrayBuffer());
      else throw new Error('Format non pris en charge : .' + ext);
      addFeatures(list);
      setStatus(f.name + ' : ' + list.length + ' élément(s) importé(s)');
    } catch (err) {
      setStatus('Import ' + f.name + ' : ' + (err.message || err));
    }
  }
  e.target.value = '';
});

/* ---------------------------------------------------------------- export */

const lonLat = (c) => c[0] + ',' + c[1] + (c.length > 2 ? ',' + c[2] : '');

function toGPX(list) {
  let s = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="RandoMBTiles" xmlns="http://www.topografix.com/GPX/1/1">\n';
  const timeTag = (t) => {
    if (!t) return '';
    const iso = typeof t === 'number' ? new Date(t).toISOString() : t;
    return '<time>' + iso + '</time>';
  };
  const trkpts = (line, times) => line.map((c, i) =>
    '<trkpt lat="' + c[1] + '" lon="' + c[0] + '">' + (c.length > 2 ? '<ele>' + c[2] + '</ele>' : '') + timeTag(times && times[i]) + '</trkpt>'
  ).join('');
  for (const f of list) {
    const g = f.geometry, name = esc((f.properties && f.properties.name) || '');
    const times = f.properties && f.properties.times;
    if (g.type === 'Point') {
      s += '<wpt lat="' + g.coordinates[1] + '" lon="' + g.coordinates[0] + '">' +
        (g.coordinates.length > 2 ? '<ele>' + g.coordinates[2] + '</ele>' : '') + '<name>' + name + '</name></wpt>\n';
    } else if (g.type === 'LineString') {
      s += '<trk><name>' + name + '</name><trkseg>' + trkpts(g.coordinates, times) + '</trkseg></trk>\n';
    } else if (g.type === 'MultiLineString') {
      s += '<trk><name>' + name + '</name>' + g.coordinates.map((l, i) => '<trkseg>' + trkpts(l, times && times[i]) + '</trkseg>').join('') + '</trk>\n';
    }
  }
  return s + '</gpx>\n';
}

function toKML(list, opts = {}) {
  let s = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>RandoMBTiles</name>\n';
  for (const f of list) {
    const g = f.geometry, p = f.properties || {};
    let geom = '';
    if (g.type === 'Point') geom = '<Point><coordinates>' + lonLat(g.coordinates) + '</coordinates></Point>';
    else if (g.type === 'LineString') geom = '<LineString><tessellate>1</tessellate><coordinates>' + g.coordinates.map(lonLat).join(' ') + '</coordinates></LineString>';
    else if (g.type === 'MultiLineString') geom = '<MultiGeometry>' + g.coordinates.map((l) => '<LineString><coordinates>' + l.map(lonLat).join(' ') + '</coordinates></LineString>').join('') + '</MultiGeometry>';
    else if (g.type === 'Polygon') {
      const ring = (r) => '<LinearRing><coordinates>' + r.map(lonLat).join(' ') + '</coordinates></LinearRing>';
      geom = '<Polygon><outerBoundaryIs>' + ring(g.coordinates[0]) + '</outerBoundaryIs>' +
        g.coordinates.slice(1).map((r) => '<innerBoundaryIs>' + ring(r) + '</innerBoundaryIs>').join('') + '</Polygon>';
    }
    let desc = p.desc ? esc(p.desc) : '';
    if (p.photoId) {
      desc += opts.embedPhotos
        ? '<br/><img src="photos/' + p.photoId + '.jpg" width="320"/>'
        : (desc ? '<br/>' : '') + '(photo disponible dans l\'export KMZ)';
    }
    if (geom) s += '<Placemark><name>' + esc(p.name || '') + '</name>' + (desc ? '<description><![CDATA[' + desc + ']]></description>' : '') + geom + '</Placemark>\n';
  }
  return s + '</Document></kml>\n';
}

async function saveFile(filename, data, mime, isBase64) {
  if (isNative && P.Filesystem && P.Share) {
    // Écriture dans le cache de l'app puis feuille de partage (Enregistrer dans Fichiers/Drive/…)
    const opts = { path: filename, data, directory: 'CACHE' };
    if (!isBase64) opts.encoding = 'utf8';
    const { uri } = await P.Filesystem.writeFile(opts);
    await P.Share.share({ title: filename, url: uri });
  } else {
    const blob = isBase64
      ? new Blob([Uint8Array.from(atob(data), (c) => c.charCodeAt(0))], { type: mime })
      : new Blob([data], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
}

$('export').addEventListener('change', async (e) => {
  const fmt = e.target.value;
  e.target.value = '';
  if (!fmt) return;
  if (!features.length) { setStatus('Rien à exporter'); return; }
  const stamp = localStampCompact();
  try {
    if (fmt === 'gpx') await saveFile('rando-' + stamp + '.gpx', toGPX(features), 'application/gpx+xml', false);
    else if (fmt === 'kml') await saveFile('rando-' + stamp + '.kml', toKML(features), 'application/vnd.google-earth.kml+xml', false);
    else if (fmt === 'kmz') {
      const zip = new JSZip();
      const photoFeatures = features.filter((f) => f.properties && f.properties.photoId);
      for (const f of photoFeatures) {
        const blob = await photoGet(f.properties.photoId);
        if (blob) zip.file('photos/' + f.properties.photoId + '.jpg', blob);
      }
      zip.file('doc.kml', toKML(features, { embedPhotos: true }));
      const b64 = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });
      await saveFile('rando-' + stamp + '.kmz', b64, 'application/vnd.google-earth.kmz', true);
    }
    setStatus('Export ' + fmt.toUpperCase() + ' prêt');
  } catch (err) {
    setStatus('Export : ' + (err.message || err));
  }
});

/* ---------------------------------------------------------------- GPS + enregistrement de trace */

// Plugin communautaire (service de premier plan Android) : suivi possible écran éteint.
let BG = null;
if (isNative) {
  try { BG = P.BackgroundGeolocation || window.Capacitor.registerPlugin('BackgroundGeolocation'); } catch { BG = null; }
}

let watchId = null, watchKind = null;      // watchKind : 'fg' | 'bg' | 'web'
let gpsOn = false;                          // bouton GPS actif
let posMarker = null, accCircle = null;
let recording = false, recPts = [], recTimes = [], recLine = null;
const REC_BACKUP = 'recBackup';

async function startWatch(background) {
  if (isNative && background && BG) {
    // Mode arrière-plan : service de premier plan + notification permanente
    watchId = await BG.addWatcher(
      {
        backgroundTitle: 'randos',
        backgroundMessage: 'Enregistrement de la trace en cours',
        requestPermissions: true,
        stale: false,
        distanceFilter: 5
      },
      (loc, err) => {
        if (err) {
          if (err.code === 'NOT_AUTHORIZED') {
            if (confirm('La localisation est nécessaire. Ouvrir les réglages de l\'application ?')) BG.openSettings();
          } else setStatus('GPS : ' + (err.message || err.code));
          return;
        }
        onPosition({ coords: {
          latitude: loc.latitude, longitude: loc.longitude,
          accuracy: loc.accuracy, altitude: loc.altitude
        }, timestamp: loc.time || Date.now() });
      }
    );
    watchKind = 'bg';
  } else if (isNative && P.Geolocation) {
    const perm = await P.Geolocation.requestPermissions();
    if (perm.location === 'denied') throw new Error('Permission de localisation refusée');
    watchId = await P.Geolocation.watchPosition({ enableHighAccuracy: true }, (pos, err) => {
      if (pos) onPosition(pos);
      else if (err) setStatus('GPS : ' + (err.message || err));
    });
    watchKind = 'fg';
  } else if (navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(onPosition, (e) => setStatus('GPS : ' + e.message), { enableHighAccuracy: true });
    watchKind = 'web';
  } else {
    throw new Error('Géolocalisation indisponible');
  }
}

async function stopWatch() {
  if (watchId === null) return;
  try {
    if (watchKind === 'bg') await BG.removeWatcher({ id: watchId });
    else if (watchKind === 'fg') await P.Geolocation.clearWatch({ id: watchId });
    else navigator.geolocation.clearWatch(watchId);
  } catch { /* ignoré */ }
  watchId = null;
  watchKind = null;
}

function clearPosition() {
  if (posMarker) { map.removeLayer(posMarker); posMarker = null; }
  if (accCircle) { map.removeLayer(accCircle); accCircle = null; }
}

function backupRec() {
  try { localStorage.setItem(REC_BACKUP, JSON.stringify({ pts: recPts, times: recTimes })); } catch { /* quota */ }
}

async function askNotificationPermission() {
  // Android 13+ : sans cette permission, la notification du suivi n'est pas affichée
  try { if (isNative && P.LocalNotifications) await P.LocalNotifications.requestPermissions(); } catch { /* ignoré */ }
}

function onPosition(pos) {
  const c = pos.coords;
  const ll = [c.latitude, c.longitude];
  if (!posMarker) {
    posMarker = L.circleMarker(ll, { radius: 8, color: '#fff', weight: 3, fillColor: '#e03131', fillOpacity: 1 }).addTo(map);
    accCircle = L.circle(ll, { radius: c.accuracy || 0, weight: 1, color: '#e03131', fillOpacity: 0.08 }).addTo(map);
    map.setView(ll, Math.max(map.getZoom(), 15));
  } else {
    posMarker.setLatLng(ll);
    accCircle.setLatLng(ll).setRadius(c.accuracy || 0);
  }
  if (recording) {
    const last = recPts[recPts.length - 1];
    if (!last || map.distance([last[1], last[0]], ll) >= 5) { // filtre : un point tous les 5 m minimum
      recPts.push([c.longitude, c.latitude].concat(Number.isFinite(c.altitude) ? [Math.round(c.altitude)] : []));
      recTimes.push(pos.timestamp || Date.now());
      recLine.setLatLngs(recPts.map((p) => [p[1], p[0]]));
      if (recPts.length % 10 === 0) backupRec(); // sauvegarde régulière (protège d'un arrêt brutal de l'app)
      setStatus('REC : ' + recPts.length + ' points');
    }
  }
}

$('btn-gps').addEventListener('click', async () => {
  if (!gpsOn) {
    try {
      await startWatch(false);
      gpsOn = true;
      $('btn-gps').classList.add('on');
      setStatus('GPS activé');
    } catch (e) { setStatus('GPS : ' + (e.message || e)); }
  } else if (recording) {
    setStatus('Arrêtez d\'abord l\'enregistrement (REC)');
  } else {
    await stopWatch();
    gpsOn = false;
    $('btn-gps').classList.remove('on');
    clearPosition();
    setStatus('GPS arrêté');
  }
});

$('btn-rec').addEventListener('click', async () => {
  if (!recording) {
    await askNotificationPermission();
    await stopWatch(); // le suivi d'arrière-plan remplace le suivi simple
    try {
      await startWatch(true);
    } catch (e) {
      setStatus('GPS : ' + (e.message || e));
      if (gpsOn) { try { await startWatch(false); } catch { /* ignoré */ } }
      return;
    }
    recording = true;
    recPts = [];
    recTimes = [];
    recLine = L.polyline([], { color: '#c0392b', weight: 4 }).addTo(map);
    $('btn-rec').classList.add('on');
    setStatus('Enregistrement en cours (fonctionne écran éteint)…');
  } else {
    // Confirmation pour éviter un arrêt accidentel (contact dans une poche, écran allumé)
    if (!confirm('Arrêter l\'enregistrement de la trace (' + recPts.length + ' points) ?')) return;
    recording = false;
    $('btn-rec').classList.remove('on');
    map.removeLayer(recLine);
    await stopWatch();
    if (gpsOn) { try { await startWatch(false); } catch { /* ignoré */ } }
    else clearPosition();
    if (recPts.length > 1) {
      const name = 'Trace ' + localStamp();
      const feature = { type: 'Feature', properties: { name, times: recTimes.slice() }, geometry: { type: 'LineString', coordinates: recPts } };
      addFeatures([feature], false);
      setStatus('Trace enregistrée : ' + recPts.length + ' points');
      autoBackupTrace(feature); // sauvegarde silencieuse en fichier, en plus du stockage local
    } else setStatus('Trace trop courte, ignorée');
    recPts = [];
    recTimes = [];
    try { localStorage.removeItem(REC_BACKUP); } catch { /* ignoré */ }
  }
});

// Verrou de la barre d'outils : protège d'un appui accidentel (téléphone en poche, écran allumé)
$('btn-lock').addEventListener('click', () => {
  const locked = $('bar').classList.toggle('locked');
  $('btn-lock').classList.toggle('on', locked);
  $('btn-lock').textContent = locked ? '🔒' : '🔓';
  setStatus(locked ? 'Boutons verrouillés' : 'Boutons déverrouillés');
});

/* ---------------------------------------------------------------- ajout manuel d'un waypoint */

let placingWpt = false;

function onMapClickForWaypoint(e) {
  stopPlacingWaypoint();
  openWptPanel(e.latlng.lat, e.latlng.lng);
}

function startPlacingWaypoint() {
  placingWpt = true;
  $('btn-wpt').classList.add('on');
  $('map').classList.add('placing');
  setStatus('Touchez la carte à l\'endroit du waypoint (touchez +WPT pour annuler)');
  map.once('click', onMapClickForWaypoint);
}

function stopPlacingWaypoint() {
  placingWpt = false;
  $('btn-wpt').classList.remove('on');
  $('map').classList.remove('placing');
  map.off('click', onMapClickForWaypoint);
}

// Panneau de saisie du waypoint (remplace prompt()/confirm() : ces dialogues bloquants
// consomment le "geste utilisateur" requis pour ouvrir ensuite l'appareil photo, qui reste
// alors sans effet. Le bouton photo ci-dessous déclenche un clic direct, toujours fiable.
let pendingWpt = null; // { lat, lon, ele, photoFile }

function openWptPanel(lat, lon, ele) {
  pendingWpt = { lat, lon, ele, photoFile: null };
  $('wpt-name').value = 'Repère';
  $('wpt-desc').value = '';
  $('wpt-photo-preview').classList.add('hidden');
  $('wpt-photo-img').src = '';
  $('wpt-panel').classList.remove('hidden');
  $('wpt-name').focus();
}

function closeWptPanel() {
  $('wpt-panel').classList.add('hidden');
  pendingWpt = null;
}

$('wpt-close').addEventListener('click', () => { closeWptPanel(); setStatus('Waypoint annulé'); });
$('wpt-cancel').addEventListener('click', () => { closeWptPanel(); setStatus('Waypoint annulé'); });

$('wpt-photo-btn').addEventListener('click', () => {
  $('photo-file').click(); // clic direct sur un vrai bouton : geste utilisateur valide
});

$('photo-file').addEventListener('change', () => {
  const file = $('photo-file').files && $('photo-file').files[0];
  $('photo-file').value = '';
  if (!file || !pendingWpt) return;
  pendingWpt.photoFile = file;
  $('wpt-photo-img').src = URL.createObjectURL(file);
  $('wpt-photo-preview').classList.remove('hidden');
});

$('wpt-photo-remove').addEventListener('click', () => {
  if (pendingWpt) pendingWpt.photoFile = null;
  $('wpt-photo-preview').classList.add('hidden');
});

$('wpt-save').addEventListener('click', async () => {
  if (!pendingWpt) return;
  const name = ($('wpt-name').value || '').trim() || 'Repère';
  const desc = ($('wpt-desc').value || '').trim();
  const { lat, lon, ele, photoFile } = pendingWpt;
  const coords = [lon, lat];
  if (Number.isFinite(ele)) coords.push(Math.round(ele));
  const feature = { type: 'Feature', properties: { name, desc }, geometry: { type: 'Point', coordinates: coords } };
  closeWptPanel();
  if (photoFile) {
    try {
      setStatus('Traitement de la photo…');
      const blob = await resizeImageFile(photoFile);
      const photoId = newId();
      await photoPut(photoId, blob);
      feature.properties.photoId = photoId;
    } catch (e) {
      setStatus('Photo non ajoutée : ' + (e.message || e));
    }
  }
  addFeatures([feature], false);
  setStatus('Waypoint ajouté : ' + name);
});

$('btn-wpt').addEventListener('click', () => {
  if (placingWpt) { stopPlacingWaypoint(); setStatus('Ajout de waypoint annulé'); return; }
  if (gpsOn && posMarker) {
    if (confirm('Ajouter le waypoint à votre position GPS actuelle ?\n(Annuler pour le placer en touchant la carte)')) {
      const ll = posMarker.getLatLng();
      openWptPanel(ll.lat, ll.lng);
      return;
    }
  }
  startPlacingWaypoint();
});

/* ---------------------------------------------------------------- boussole (cap magnétique) */

const compassEl = $('compass');
const compassNeedle = $('compass-needle');
const compassHeadingEl = $('compass-heading');
const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
const cardinalFor = (deg) => CARDINALS[Math.round(((deg % 360) + 360) % 360 / 45) % 8];

function onDeviceOrientation(e) {
  let heading;
  if (typeof e.webkitCompassHeading === 'number') heading = e.webkitCompassHeading; // iOS Safari
  else if (typeof e.alpha === 'number') heading = 360 - e.alpha; // Android : alpha=0 -> nord
  else return;
  heading = ((heading % 360) + 360) % 360;
  compassNeedle.setAttribute('transform', 'rotate(' + (360 - heading) + ' 50 50)');
  compassHeadingEl.textContent = Math.round(heading) + '° ' + cardinalFor(heading);
}

async function initCompass() {
  try {
    // iOS Safari exige une autorisation explicite ; Android n'a pas cette méthode (ignoré sans effet)
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      const r = await DeviceOrientationEvent.requestPermission();
      if (r !== 'granted') { setStatus('Boussole : permission refusée'); return; }
    }
  } catch { /* ignoré */ }

  if ('ondeviceorientationabsolute' in window) window.addEventListener('deviceorientationabsolute', onDeviceOrientation, true);
  else if ('ondeviceorientation' in window) window.addEventListener('deviceorientation', onDeviceOrientation, true);
  else { setStatus('Boussole indisponible sur cet appareil'); return; }

  compassEl.classList.remove('hidden');
}

/* ---------------------------------------------------------------- préparation du hors-ligne */

const offlinePanel = $('offline-panel');
let offlineCancel = false, offlineRunning = false;

function tileXYFor(lat, lon, z) {
  const n = Math.pow(2, z);
  const x = Math.floor((lon + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}
function tileCountAt(bounds, z) {
  const nw = tileXYFor(bounds.getNorth(), bounds.getWest(), z);
  const se = tileXYFor(bounds.getSouth(), bounds.getEast(), z);
  return Math.max(0, se.x - nw.x + 1) * Math.max(0, se.y - nw.y + 1);
}
function tilesAt(bounds, z) {
  const nw = tileXYFor(bounds.getNorth(), bounds.getWest(), z);
  const se = tileXYFor(bounds.getSouth(), bounds.getEast(), z);
  const list = [];
  for (let x = nw.x; x <= se.x; x++) for (let y = nw.y; y <= se.y; y++) list.push({ z, x, y });
  return list;
}

function offlineZoomRange() {
  const zmin = parseInt($('offline-zmin').value, 10), zmax = parseInt($('offline-zmax').value, 10);
  return (Number.isFinite(zmin) && Number.isFinite(zmax) && zmax >= zmin) ? { zmin, zmax } : null;
}

function refreshOfflineEstimate() {
  const el = $('offline-estimate');
  if (!(baseLayer instanceof CachedTileLayer)) {
    el.textContent = 'Ce fond est déjà hors-ligne (MBTiles) : rien à télécharger.';
    $('offline-start').disabled = true;
    return;
  }
  const range = offlineZoomRange();
  const bounds = map.getBounds();
  let total = 0;
  if (range) for (let z = range.zmin; z <= range.zmax; z++) total += tileCountAt(bounds, z);
  $('offline-start').disabled = !range || total === 0 || total > 20000;
  el.textContent = !range ? 'Plage de zoom invalide'
    : total > 20000 ? total + ' tuiles : trop pour la zone/plage choisies (limite 20 000). Zoomez ou réduisez l\'écart.'
    : total + ' tuile(s) à télécharger pour la zone actuellement visible' + (total > 3000 ? ' — cela peut être long' : '');
}

async function refreshOfflineCacheInfo() {
  if (!(baseLayer instanceof CachedTileLayer)) { $('offline-cache-info').textContent = ''; return; }
  const s = await tileCacheStats(baseLayer._cacheKey);
  $('offline-cache-info').textContent = 'Cache de ce fond : ' + s.count + ' tuile(s), ≈ ' + (s.bytes / 1048576).toFixed(1) + ' Mo';
}

function openOfflinePanel() {
  offlinePanel.classList.remove('hidden');
  $('offline-source').textContent = 'Fond actuel : ' + sel.options[sel.selectedIndex].text;
  const curZ = Math.round(map.getZoom());
  const layerMax = (baseLayer && baseLayer.options && baseLayer.options.maxZoom) || 18;
  $('offline-zmin').max = layerMax; $('offline-zmax').max = layerMax;
  $('offline-zmin').value = Math.min(curZ, layerMax);
  $('offline-zmax').value = Math.min(curZ + 2, layerMax);
  refreshOfflineEstimate();
  refreshOfflineCacheInfo();
}

$('btn-offline').addEventListener('click', openOfflinePanel);
$('offline-close').addEventListener('click', () => offlinePanel.classList.add('hidden'));
$('offline-zmin').addEventListener('change', refreshOfflineEstimate);
$('offline-zmax').addEventListener('change', refreshOfflineEstimate);
map.on('moveend zoomend', () => { if (!offlinePanel.classList.contains('hidden')) refreshOfflineEstimate(); });

$('offline-start').addEventListener('click', async () => {
  if (offlineRunning || !(baseLayer instanceof CachedTileLayer)) return;
  const range = offlineZoomRange();
  if (!range) return;
  const bounds = map.getBounds();
  let total = 0;
  for (let z = range.zmin; z <= range.zmax; z++) total += tileCountAt(bounds, z);
  if (!total || total > 20000) return;
  if (total > 3000 && !confirm(total + ' tuiles à télécharger : cela peut prendre du temps et consommer des données mobiles. Continuer ?')) return;

  let tiles = [];
  for (let z = range.zmin; z <= range.zmax; z++) tiles = tiles.concat(tilesAt(bounds, z));

  offlineRunning = true;
  offlineCancel = false;
  $('offline-start').classList.add('hidden');
  $('offline-cancel').classList.remove('hidden');
  $('offline-progress-wrap').classList.remove('hidden');
  $('offline-progress-fill').style.width = '0%';

  const cacheKey = baseLayer._cacheKey, template = baseLayer._url;
  const totalTiles = tiles.length;
  let done = 0, failed = 0, idx = 0;

  async function worker() {
    while (idx < tiles.length) {
      if (offlineCancel) return;
      const t = tiles[idx++];
      const key = cacheKey + '|' + t.z + '/' + t.x + '/' + t.y;
      try {
        if (!(await tileCacheGet(key))) {
          const r = await fetch(buildTileUrl(template, t.z, t.x, t.y));
          if (!r.ok) throw new Error('HTTP ' + r.status);
          await tileCachePut(key, await r.blob());
        }
      } catch { failed++; }
      done++;
      if (done % 5 === 0 || done === totalTiles) {
        $('offline-progress-fill').style.width = Math.round(done / totalTiles * 100) + '%';
        $('offline-progress-text').textContent = done + ' / ' + totalTiles + ' tuiles' + (failed ? ' (' + failed + ' échec(s))' : '');
      }
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]); // 4 téléchargements en parallèle

  offlineRunning = false;
  $('offline-start').classList.remove('hidden');
  $('offline-cancel').classList.add('hidden');
  setStatus(offlineCancel
    ? 'Téléchargement annulé (' + done + '/' + totalTiles + ')'
    : 'Zone téléchargée : ' + done + ' tuiles' + (failed ? ' (' + failed + ' échec(s), probablement hors CORS)' : ''));
  refreshOfflineCacheInfo();
});

$('offline-cancel').addEventListener('click', () => { offlineCancel = true; });

$('offline-clear-source').addEventListener('click', async () => {
  if (!(baseLayer instanceof CachedTileLayer)) return;
  if (!confirm('Vider le cache hors-ligne de ce fond ?')) return;
  await tileCacheClear(baseLayer._cacheKey);
  refreshOfflineCacheInfo();
  setStatus('Cache vidé pour ce fond');
});

$('offline-clear-all').addEventListener('click', async () => {
  if (!confirm('Vider tout le cache de tuiles hors-ligne (tous les fonds en ligne confondus) ?')) return;
  await tileCacheClearAll();
  refreshOfflineCacheInfo();
  setStatus('Cache de tuiles entièrement vidé');
});

/* ---------------------------------------------------------------- démarrage */

(async function init() {
  restore();
  if (features.length) {
    drawFeatures(features);
    if (overlay.getBounds().isValid()) map.fitBounds(overlay.getBounds(), { padding: [30, 30] });
  }
  // Trace interrompue (app fermée par Android pendant un enregistrement) : proposer la récupération
  try {
    const b = JSON.parse(localStorage.getItem(REC_BACKUP) || 'null');
    const pts = Array.isArray(b) ? b : (b && b.pts); // compatibilité avec l'ancien format (tableau simple)
    const times = (b && !Array.isArray(b) && b.times) || [];
    if (pts && pts.length > 1 && confirm('Un enregistrement a été interrompu (' + pts.length + ' points). Récupérer la trace ?')) {
      const name = 'Trace récupérée ' + localStamp();
      addFeatures([{ type: 'Feature', properties: { name, times }, geometry: { type: 'LineString', coordinates: pts } }]);
    }
    localStorage.removeItem(REC_BACKUP);
  } catch { /* ignoré */ }
  await refreshBasemaps('online:OpenStreetMap');
  applyBasemap(sel.value);
  initCompass(); // best-effort, sans bloquer le démarrage si le capteur est absent ou refuse la permission

  // Service worker : version web uniquement (dans l'APK, les fichiers sont embarqués)
  if ('serviceWorker' in navigator && !isNative && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* ignoré */ });
  }
})();
