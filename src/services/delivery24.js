/**
 * Ground OPS - Delivery 24 (Local Caching, Prefetching & Last-Known Location Fallback)
 */
(function () {
  'use strict';
  if (window.__gopsD24CacheInstalled) return;
  window.__gopsD24CacheInstalled = true;

  var origFetch = window.fetch;
  
  var CACHE_TTL = {
    'getSettings': 60 * 60 * 1000, 'getBranches': 60 * 60 * 1000, 'getShifts': 60 * 60 * 1000,
    'getTodaySchedule': 2 * 60 * 1000, 'getMyRequests': 5 * 60 * 1000, 'getMySchedule': 5 * 60 * 1000
  };

  window.fetch = function (input, init) {
    try {
      var isOurCall = (typeof input === 'string' && /exec/i.test(input)) || (input && input.url && /exec/i.test(input.url));
      if (isOurCall && init && init.method === 'POST' && typeof init.body === 'string') {
        var parsed = JSON.parse(init.body);
        var action = parsed.action;
        var cacheKey = 'gops.cache.' + action;

        var mutations = ['checkIn', 'checkOut', 'startBreak', 'endBreak', 'submitLocation', 'createRequest', 'submitRequest', 'cancelRequest', 'respondToRequest'];
        if (mutations.indexOf(action) >= 0) {
          localStorage.removeItem('gops.cache.getTodaySchedule');
          localStorage.removeItem('gops.cache.getMyRequests');
          localStorage.removeItem('gops.cache.getMySchedule');
          return origFetch(input, init);
        }

        if (CACHE_TTL[action]) {
          var cachedStr = localStorage.getItem(cacheKey);
          if (cachedStr) {
            var cached = JSON.parse(cachedStr);
            if (Date.now() - cached.time < CACHE_TTL[action]) {
              return Promise.resolve({ ok: true, json: function() { return Promise.resolve(cached.data); } });
            }
          }
          return origFetch(input, init).then(function (res) {
            var clonedRes = res.clone();
            clonedRes.json().then(function (data) {
              if (data && data.success === true) {
                localStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), data: data }));
              }
            }).catch(function() {});
            return res;
          });
        }
      }
    } catch (e) { console.warn('Cache error:', e); }
    return origFetch(input, init);
  };

  function prefetchData() {
    try {
      var sessRaw = localStorage.getItem('gops.session.employee');
      if (!sessRaw) return;
      var sess = JSON.parse(sessRaw);
      if (!sess || !sess.token) return;
      var apiUrl = window.API_URL || window.GOPS_CONFIG?.API_URL || window.CONFIG?.API_URL;
      if (!apiUrl) return;
      var headers = { 'Content-Type': 'text/plain;charset=utf-8' };
      if (!localStorage.getItem('gops.cache.getMySchedule')) fetch(apiUrl, { method: 'POST', headers: headers, body: JSON.stringify({ action: 'getMySchedule', token: sess.token, payload: {}, client: 'prefetch' }) }).catch(function(){});
      if (!localStorage.getItem('gops.cache.getMyRequests')) fetch(apiUrl, { method: 'POST', headers: headers, body: JSON.stringify({ action: 'getMyRequests', token: sess.token, payload: {}, client: 'prefetch' }) }).catch(function(){});
      fetch(apiUrl, { method: 'POST', headers: headers, body: JSON.stringify({ action: 'getTodaySchedule', token: sess.token, payload: {}, client: 'prefetch' }) }).catch(function(){});
    } catch (e) {}
  }

  if (document.readyState === 'complete') { setTimeout(prefetchData, 3000); } 
  else { window.addEventListener('load', function () { setTimeout(prefetchData, 3000); }); }
  setInterval(prefetchData, 4 * 60 * 1000);


  // =====================================================================
  // 2. Smart GPS + Last-Known Location Fallback
  // =====================================================================
  if (navigator.geolocation) {
    var origGetCurrentPosition = navigator.geolocation.getCurrentPosition;
    
    navigator.geolocation.getCurrentPosition = function(success, error, options) {
      var isFinished = false;
      var hardTimer;

      // دالة مساعدة عشان تجيب آخر لوكيشن من السيرفر لو الـ GPS فشل
      function fetchLastKnownLocation(errReason) {
        try {
          var sessRaw = localStorage.getItem('gops.session.employee');
          var sess = sessRaw ? JSON.parse(sessRaw) : null;
          var apiUrl = window.API_URL || window.GOPS_CONFIG?.API_URL || window.CONFIG?.API_URL;
          
          if (sess && sess.token && apiUrl) {
            // بنسأل السيرفر على حالة الكابتن عشان نجيب آخر لوكيشن
            fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({ action: 'getTodaySchedule', token: sess.token, payload: {}, client: 'fallback' })
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
               // لو لقينا لوكيشن قديم في الرد
               if (data && data.success && data.data && data.data.tracking && data.data.tracking.last_location_at) {
                  var trk = data.data.tracking;
                  // بنجيب الإحداثيات من الـ LiveState
                  // (هنا بنفترض إن الـ tracking بيرجع lat/lng، لو مش بيرجعهم هنستخدم المسافة)
                  success({
                    coords: {
                      latitude: trk.lastLatitude || 0,
                      longitude: trk.lastLongitude || 0,
                      accuracy: trk.lastAccuracy || 50
                    },
                    timestamp: Date.parse(trk.last_location_at)
                  });
                  return;
               }
               // لو مفيش، نرجع الإيرور الأصلي
               if (error) error(errReason);
            })
            .catch(function() { if (error) error(errReason); });
          } else {
            if (error) error(errReason);
          }
        } catch (e) {
          if (error) error(errReason);
        }
      }

      // 1. مؤقت قسري: لو الكود خد أكتر من 12 ثانية
      hardTimer = setTimeout(function() {
        if (isFinished) return;
        isFinished = true;
        fetchLastKnownLocation({ code: 3, message: 'GPS Timeout - Fallback triggered.' });
      }, 12000);

      function finishSuccess(pos) {
        if (isFinished) return;
        isFinished = true;
        clearTimeout(hardTimer);
        if (success) success(pos);
      }

      function finishError(err) {
        if (isFinished) return;
        isFinished = true;
        clearTimeout(hardTimer);
        fetchLastKnownLocation(err);
      }

      // 2. المحاولة العادية للـ GPS
      var robustOptions = Object.assign({}, options, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      });

      try {
        origGetCurrentPosition.call(navigator.geolocation, finishSuccess, finishError, robustOptions);
      } catch (e) {
        finishError(e);
      }
    };
  }
})();
