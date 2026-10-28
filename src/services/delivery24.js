/**
 * Ground OPS - Delivery 24 (Local Caching & Prefetching for Speed)
 */
(function () {
  'use strict';
  if (window.__gopsD24CacheInstalled) return;
  window.__gopsD24CacheInstalled = true;

  var origFetch = window.fetch;
  
  // الحاجات اللي هنحفظها في الموبايل (الوقت بالمللي ثانية)
  var CACHE_TTL = {
    'getSettings': 60 * 60 * 1000,       // إعدادات النظام (ساعة)
    'getBranches': 60 * 60 * 1000,       // الفروع (ساعة)
    'getShifts': 60 * 60 * 1000,         // الورديات (ساعة)
    'getTodaySchedule': 2 * 60 * 1000,   // شيفت اليوم (دقيقتين)
    'getMyRequests': 5 * 60 * 1000,      // طلبات الكابتن (5 دقايق)
    'getMySchedule': 5 * 60 * 1000       // جدول الكابتن (5 دقايق)
  };

  window.fetch = function (input, init) {
    try {
      var isOurCall = (typeof input === 'string' && /exec/i.test(input)) || (input && input.url && /exec/i.test(input.url));
      
      if (isOurCall && init && init.method === 'POST' && typeof init.body === 'string') {
        var parsed = JSON.parse(init.body);
        var action = parsed.action;
        var cacheKey = 'gops.cache.' + action;

        // 1. لو ده طلب بيغير بيانات (زي حضور أو انصراف)، نمسح الكاش عشان يتحدث فوراً
        var mutations = ['checkIn', 'checkOut', 'startBreak', 'endBreak', 'submitLocation', 
                         'createRequest', 'submitRequest', 'cancelRequest', 'respondToRequest'];
        if (mutations.indexOf(action) >= 0) {
          localStorage.removeItem('gops.cache.getTodaySchedule');
          localStorage.removeItem('gops.cache.getMyRequests');
          localStorage.removeItem('gops.cache.getMySchedule');
          return origFetch(input, init);
        }

        // 2. لو ده طلب من الحاجات اللي بنخزنها
        if (CACHE_TTL[action]) {
          var cachedStr = localStorage.getItem(cacheKey);
          if (cachedStr) {
            var cached = JSON.parse(cachedStr);
            if (Date.now() - cached.time < CACHE_TTL[action]) {
              // نرجع الرد المحفوظ فوراً
              return Promise.resolve({
                ok: true,
                json: function() { return Promise.resolve(cached.data); }
              });
            }
          }

          // 3. لو مفيش كاش، بنجيب من السيرفر ونحفظه
          return origFetch(input, init).then(function (res) {
            var clonedRes = res.clone();
            clonedRes.json().then(function (data) {
              if (data && data.success === true) {
                localStorage.setItem(cacheKey, JSON.stringify({
                  time: Date.now(),
                  data: data
                }));
              }
            }).catch(function() {});
            return res;
          });
        }
      }
    } catch (e) {
      console.warn('Cache error:', e);
    }
    
    return origFetch(input, init);
  };

  // ===== Background Prefetching (التحميل المسبق في الخلفية) =====
  function prefetchData() {
    try {
      var sessRaw = localStorage.getItem('gops.session.employee');
      if (!sessRaw) return;
      var sess = JSON.parse(sessRaw);
      if (!sess || !sess.token) return;

      var apiUrl = window.API_URL || window.GOPS_CONFIG?.API_URL || window.CONFIG?.API_URL;
      if (!apiUrl) return;

      var headers = { 'Content-Type': 'text/plain;charset=utf-8' };
      
      // جلب الجدول في الخلفية لو مش موجود
      if (!localStorage.getItem('gops.cache.getMySchedule')) {
        fetch(apiUrl, { method: 'POST', headers: headers, body: JSON.stringify({ action: 'getMySchedule', token: sess.token, payload: {}, client: 'prefetch' }) }).catch(function(){});
      }
      
      // جلب الريكويست في الخلفية لو مش موجود
      if (!localStorage.getItem('gops.cache.getMyRequests')) {
        fetch(apiUrl, { method: 'POST', headers: headers, body: JSON.stringify({ action: 'getMyRequests', token: sess.token, payload: {}, client: 'prefetch' }) }).catch(function(){});
      }

      // تحديث شيفت اليوم في الخلفية
      fetch(apiUrl, { method: 'POST', headers: headers, body: JSON.stringify({ action: 'getTodaySchedule', token: sess.token, payload: {}, client: 'prefetch' }) }).catch(function(){});

    } catch (e) {}
  }

  if (document.readyState === 'complete') {
    setTimeout(prefetchData, 3000);
  } else {
    window.addEventListener('load', function () { setTimeout(prefetchData, 3000); });
  }
  setInterval(prefetchData, 4 * 60 * 1000); // كل 4 دقايق

})();
// ===== FIX: GPS Smoothing (Averaging multiple points) =====
(function() {
  if (!navigator.geolocation) return;
  
  var origGetCurrentPosition = navigator.geolocation.getCurrentPosition;
  
  navigator.geolocation.getCurrentPosition = function(success, error, options) {
    var robustOptions = Object.assign({}, options, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000
    });

    var readings = [];
    var watchId = null;
    
    // بنجمع قراءات لمدة 4 ثواني
    watchId = navigator.geolocation.watchPosition(
      function(pos) {
        // بنرفض أي قراءة دقتها وحشة (أكبر من 50 متر) عشان منضللهاش
        if (pos.coords.accuracy <= 50) {
          readings.push(pos);
        }
      },
      function(err) {
        // لو حصل إيرور في الـ watch، بنطنش ونستنى
      },
      robustOptions
    );

    // بعد 4 ثواني، بنوقف السحب ونحسب المتوسط
    setTimeout(function() {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);

      if (readings.length === 0) {
        // لو ملقاش قراءات كويسة خالص، بنرجع للطريقة القديمة
        origGetCurrentPosition.call(navigator.geolocation, success, error, robustOptions);
        return;
      }

      // بنرتب القراءات من الأدق للأقل دقة، وناخد أفضل 3 قراءات
      readings.sort(function(a, b) { return a.coords.accuracy - b.coords.accuracy; });
      var best = readings.slice(0, 3);
      
      var sumLat = 0, sumLng = 0, sumAcc = 0;
      for (var i = 0; i < best.length; i++) {
        sumLat += best[i].coords.latitude;
        sumLng += best[i].coords.longitude;
        sumAcc += best[i].coords.accuracy;
      }
      
      // بنبعت المتوسط
      success({
        coords: {
          latitude: sumLat / best.length,
          longitude: sumLng / best.length,
          accuracy: sumAcc / best.length,
          altitude: best[0].coords.altitude,
          heading: best[0].coords.heading,
          speed: best[0].coords.speed
        },
        timestamp: Date.now()
      });
    }, 4000); // 4 ثواني كافية جداً
  };
})();
