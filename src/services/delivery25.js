/**
 * Ground OPS - Delivery 25 (Live Map)
 */
(function () {
  'use strict';
  if (!/admin\.html/i.test(window.location.pathname)) return;

  var mapInterval = null;
  var mapInstance = null;
  var markersLayer = null;

  // دالة مساعدة لجلب البيانات
  function apiCall(action, payload) {
    var token = localStorage.getItem('gops.session.admin');
    if (token) { try { token = JSON.parse(token).token; } catch(e){} }
    var apiUrl = window.API_URL || window.GOPS_CONFIG?.API_URL || window.CONFIG?.API_URL;
    return fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, token: token, payload: payload || {}, client: 'admin-map/1.0' })
    }).then(function(r){ return r.json(); }).then(function(res){
      if(!res.success) throw new Error(res.message);
      return res.data;
    });
  }

  // تحميل مكتبة Leaflet لو مش موجودة
  function loadLeaflet(cb) {
    if (typeof L !== 'undefined') return cb();
    var css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = './vendor/leaflet/leaflet.css';
    document.head.appendChild(css);
    
    var js = document.createElement('script');
    js.src = './vendor/leaflet/leaflet.js';
    js.onload = cb;
    document.head.appendChild(js);
  }

  function openLiveMap() {
    var old = document.getElementById('gops-map-root');
    if (old) old.remove();

    var root = document.createElement('div');
    root.id = 'gops-map-root';
    root.style.cssText = 'position:fixed;inset:0;background:#f7f7f8;z-index:99990;display:flex;flex-direction:column;font-family:system-ui,sans-serif;';
    root.innerHTML = 
      '<div style="padding:12px 20px;background:#fff;border-bottom:1px solid #ddd;display:flex;justify-content:space-between;align-items:center;">' +
        '<h2 style="margin:0;font-size:18px;">🗺️ Live Map</h2>' +
        '<button id="gops-map-close" style="padding:8px 16px;border:0;border-radius:6px;background:#111;color:#fff;cursor:pointer;">Close</button>' +
      '</div>' +
      '<div id="gops-map-container" style="flex:1;background:#e5e5e5;"></div>';
    document.body.appendChild(root);

    document.getElementById('gops-map-close').onclick = function() {
      root.remove();
      if (mapInterval) clearInterval(mapInterval);
      if (mapInstance) { mapInstance.remove(); mapInstance = null; }
    };

    loadLeaflet(function() {
      if (mapInstance) mapInstance.remove();
      
      // إنشاء الخريطة (مركزها القاهرة مبدئياً)
      mapInstance = L.map('gops-map-container').setView([30.0444, 31.2357], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(mapInstance);

      markersLayer = L.layerGroup().addTo(mapInstance);

      function refreshMap() {
        apiCall('getLiveMapData').then(function(data) {
          if (!mapInstance) return;
          markersLayer.clearLayers();
          
          if (!data.employees || !data.employees.length) {
             return; 
          }

          var bounds = L.latLngBounds();
          var branchCirclesDrawn = {};

          data.employees.forEach(function(emp) {
            // 1. رسم نطاق الفرع (مرة واحدة بس لكل فرع)
            if (!branchCirclesDrawn[emp.branch_name] && emp.branch_lat && emp.branch_lng) {
              L.circle([emp.branch_lat, emp.branch_lng], {
                color: '#0a84ff', fillColor: '#0a84ff', fillOpacity: 0.1, radius: emp.branch_radius
              }).addTo(markersLayer);
              branchCirclesDrawn[emp.branch_name] = true;
            }

            // 2. رسم الكابتن
            if (emp.last_lat && emp.last_lng) {
              var color = '#1e8e3e'; // أخضر (جوه)
              if (emp.is_stale) color = '#888'; // رمادي (قديم/مقفول)
              else if (emp.on_break) color = '#f0ad4e'; // برتقالي (بريك)
              else if (!emp.inside) color = '#d33'; // أحمر (بره)

              var marker = L.circleMarker([emp.last_lat, emp.last_lng], {
                radius: 8, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1
              }).addTo(markersLayer);
              
              var timeStr = emp.last_location_at ? new Date(emp.last_location_at).toLocaleTimeString() : 'غير معروف';
              marker.bindPopup('<b>' + emp.employee_name + '</b><br>' +
                               'Branch: ' + emp.branch_name + '<br>' +
                               'Status: ' + (emp.is_stale ? 'No Data' : (emp.on_break ? 'On Break' : (emp.inside ? 'Inside' : 'OUTSIDE'))) + '<br>' +
                               'Last seen: ' + timeStr);
                               
              bounds.extend([emp.last_lat, emp.last_lng]);
            }
          });

          if (bounds.isValid()) {
            mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
          }
        }).catch(function(err) {
          console.error('Map refresh failed', err);
        });
      }

      refreshMap();
      mapInterval = setInterval(refreshMap, 30000); // تحديث كل 30 ثانية
    });
  }

  // إضافة الزرار في القائمة الجانبية
  function injectMenuButton() {
    if (document.getElementById('gops-live-map-btn')) return;
    var nav = document.querySelector('.sidebar, nav.sidebar, aside.sidebar, #sidebar');
    if (!nav) return;
    
    var a = document.createElement('a');
    a.id = 'gops-live-map-btn';
    a.href = '#';
    a.textContent = '🗺️ Live Map';
    a.style.cssText = 'display:block;padding:10px 14px;color:inherit;text-decoration:none;cursor:pointer;font-weight:bold;margin-top:10px;border-top:1px solid #eee;';
    a.onclick = function(ev) { ev.preventDefault(); openLiveMap(); };
    nav.appendChild(a);
  }

  // التشغيل
  if (document.readyState === 'complete') {
    setTimeout(injectMenuButton, 2000);
  } else {
    window.addEventListener('load', function(){ setTimeout(injectMenuButton, 2000); });
  }
  
  // Fallback لو القائمة اتأخرت في التحميل
  setInterval(injectMenuButton, 5000);
})();
