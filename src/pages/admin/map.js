/** Optional map (Leaflet, free tiles: CARTO streets + Esri satellite). Every page works without it: callers must handle `null`. */
import { t } from '../../core/i18n.js';

let loading = null;
export function loadLeaflet() {
  if (globalThis.L) return Promise.resolve(globalThis.L);
  if (globalThis.GOPS_CONFIG && globalThis.GOPS_CONFIG.DISABLE_MAP) return Promise.resolve(null); // option for installs that must not contact map servers
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const d = globalThis.document, done = (v) => resolve(v);
    const css = d.createElement('link'); css.rel = 'stylesheet'; css.href = './vendor/leaflet/leaflet.css'; d.head.appendChild(css);
    const s = d.createElement('script'); s.src = './vendor/leaflet/leaflet.js'; s.onload = () => done(globalThis.L || null); s.onerror = () => done(null); d.head.appendChild(s);
    setTimeout(() => done(globalThis.L || null), 8000);
  });
  return loading;
}

// d62: بلاطات الشوارع بقت من CARTO (شبكة توزيع عالمية أثبت بكتير من tile.openstreetmap.org
// اللي بيقع/يبطأ على شبكات كتير في مصر فالخريطة تظهر رمادية «ساعات شغالة وساعات لأ»).
// القمر الصناعي من Esri — مجاني — وبيتحول له تلقائيًا لو بلاطات الشوارع فشلت.
const STREET_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const SAT_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export async function createMap(container, { lat = 30.0456, lng = 31.2129, zoom = 14 } = {}) {
  const L = await loadLeaflet(); if (!L) return null;
  try {
    const map = L.map(container, { zoomControl: true });
    const street = L.tileLayer(STREET_URL, { maxZoom: 19, subdomains: 'abcd', attribution: '&copy; OpenStreetMap contributors &copy; CARTO' }).addTo(map);
    const sat = L.tileLayer(SAT_URL, { maxZoom: 19, attribution: '&copy; Esri' });
    map.setView([lat, lng], zoom);

    // d62: زر تبديل شوارع/قمر صناعي — لو الشوارع مش راضية تفتح من شبكتك ادوس الزر
    let usingSat = false, btn = null;
    const ctrl = L.control({ position: 'topright' });
    ctrl.onAdd = function () {
      const box = L.DomUtil.create('div', 'gops-map-toggle leaflet-bar');
      btn = L.DomUtil.create('button', '', box);
      btn.type = 'button'; btn.innerHTML = '🛰️'; btn.title = t('Satellite view');
      L.DomEvent.disableClickPropagation(box);
      btn.addEventListener('click', () => setBase(!usingSat));
      return box;
    };
    ctrl.addTo(map);

    function setBase(satMode) {
      if (satMode === usingSat) return;
      if (satMode) { map.removeLayer(street); sat.addTo(map); }
      else { map.removeLayer(sat); street.addTo(map); }
      usingSat = satMode;
      if (btn) { btn.innerHTML = usingSat ? '🗺️' : '🛰️'; btn.title = usingSat ? t('Street view') : t('Satellite view'); }
    }

    // d62: إصلاح «الخريطة بتظهر فاضية» — لو الكونتينر كان لسه مأخذش مقاسه النهائي
    // لحظة التشغيل (الصفحة بترسم بسرعة أو بعد استرجاع الكاش) Leaflet بيحسب مقاس صفر.
    // الحل: إجبار إعادة حساب المقاس 3 مرات بعد الرسم + مع أي resize للنافذة.
    [60, 350, 1000].forEach((ms) => setTimeout(() => { try { map.invalidateSize(); } catch (e) {} }, ms));
    const onRz = () => { try { map.invalidateSize(); } catch (e) {} };
    globalThis.addEventListener('resize', onRz);

    // d62: لو بلاطات الشوارع فشلت كتير على طول → نحوّل للقمر الصناعي من غير ما المستخدم يتحرك
    let errs = 0, fell = false;
    street.on('tileerror', () => { errs++; if (!fell && !usingSat && errs >= 8) { fell = true; setBase(true); } });

    return { L, map, layer: L.layerGroup().addTo(map), setBase, isSatellite: () => usingSat };
  } catch (e) { return null; }
}
export const STATE_COLOR = { INSIDE: '#1b8a3a', OUTSIDE: '#c62828', UNKNOWN: '#6b7280', OFF_GRID: '#111827', default: '#1565c0', FRESH: '#1b8a3a', STALE: '#e6890a', LOST: '#c62828' };
const textTip = (text) => { const el = globalThis.document.createElement('span'); el.textContent = text; return el; }; // Leaflet treats strings as HTML: pass a text node instead
export function drawBranches(m, branches) { branches.forEach((b) => { if (b.latitude == null) return; m.L.circle([b.latitude, b.longitude], { radius: b.radius, color: '#1565c0', weight: 2, fillOpacity: 0.08 }).bindTooltip(textTip(`${b.name} (${b.radius} m)`)).addTo(m.layer); }); }
export function drawPoint(m, { lat, lng, state, label }) { m.L.circleMarker([lat, lng], { radius: 8, color: '#fff', weight: 2, fillColor: STATE_COLOR[state] || STATE_COLOR.default, fillOpacity: 1 }).bindTooltip(textTip(label), { permanent: false }).addTo(m.layer); }
export function fit(m, points) { if (points.length) m.map.fitBounds(points, { padding: [30, 30], maxZoom: 16 }); }

/** d62: مسار حركة اليوم — خط بيوصل النقط + نقط صغيرة بالساعة + علامة كبيرة للبداية ولآخر موقع.
 * points: [{ lat, lng, state, label, ts }] مرتبة زمنيًا. بترجع عدد النقط المرسومة. */
export function drawTrack(m, points) {
  const pts = (points || []).map((p) => ({ ...p, lat: Number(p.lat), lng: Number(p.lng) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (!pts.length) return 0;
  if (pts.length > 1) m.L.polyline(pts.map((p) => [p.lat, p.lng]), { color: '#1565c0', weight: 3, opacity: 0.55 }).addTo(m.layer);
  pts.forEach((p, i) => {
    const first = i === 0, last = i === pts.length - 1;
    if (first || last) {
      m.L.circleMarker([p.lat, p.lng], { radius: 9, color: '#fff', weight: 2.5, fillColor: first ? '#1565c0' : (STATE_COLOR[p.state] || STATE_COLOR.default), fillOpacity: 1 })
        .bindTooltip(textTip((first ? '▶ ' : '● ') + p.label), { direction: 'top', offset: [0, -8] }).addTo(m.layer);
    } else {
      m.L.circleMarker([p.lat, p.lng], { radius: 3.5, color: '#fff', weight: 1, fillColor: STATE_COLOR[p.state] || STATE_COLOR.default, fillOpacity: 0.92 })
        .bindTooltip(textTip(p.label), { direction: 'top' }).addTo(m.layer);
    }
  });
  return pts.length;
}
