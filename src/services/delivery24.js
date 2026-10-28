/**
 * Ground OPS - Delivery 24 (Local Caching, Prefetching & Smart GPS)
 */
(function () {
  'use strict';
  if (window.__gopsD24CacheInstalled) return;
  window.__gopsD24CacheInstalled = true;

  // =====================================================================
  // 1. Local Caching & Background Prefetching
  // =====================================================================
  var origFetch = window.fetch;
  
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

  // التحميل المسبق في الخلفية
  function prefetchData() {
    try {
      var sessRaw = localStorage.getItem('gops.session.employee');
      if (!sessRaw) return;
      var sess = JSON.parse(sessRaw);
      if (!sess || !sess.token) return;

      var apiUrl = window.API_URL || window.GOPS_CONFIG?.API_URL || window.CONFIG?.API_URL;
      if (!apiUrl) return;

      var headers = { 'Content-Type': 'text/plain;charset=utf-8' };
      
      if (!localStorage.getItem('gops.cache.getMySchedule')) {
        fetch(apiUrl, { method: 'POST', headers: headers, body: JSON.stringify({ action: 'getMySchedule', token: sess.token, payload: {}, client: 'prefetch' }) }).catch(function(){});
      }
      
      if (!localStorage.getItem('gops.cache.getMyRequests')) {
        fetch(apiUrl, { method: 'POST', headers: headers, body: JSON.stringify({ action: 'getMyRequests', token: sess.token, payload: {}, client: 'prefetch' }) }).catch(function(){});
      }

      fetch(apiUrl, { method: 'POST', headers: headers, body: JSON.stringify({ action: 'getTodaySchedule', token: sess.token, payload: {}, client: 'prefetch' }) }).catch(function(){});

    } catch (e) {}
  }

  if (document.readyState === 'complete') {
    setTimeout(prefetchData, 3000);
  } else {
    window.addEventListener('load', function () { setTimeout(prefetchData, 3000); });
  }
  setInterval(prefetchData, 4 * 60 * 1000);


  // =====================================================================
  // 2. Smart GPS Smoothing (تسريع الـ Check GPS مع دقة عالية)
  // =====================================================================
  if (navigator.geolocation) {
    var origGetCurrentPosition = navigator.geolocation.getCurrentPosition;
    
    navigator.geolocation.getCurrentPosition = function(success, error, options) {
      var maxWait = 5000; // أقصى وقت للانتظار 5 ثواني
      var targetAccuracy = 30; // لو الدقة 30 متر أو أقل، يبقى ممتاز ونكمل فوراً
      
      var bestPos = null;
      var watchId = null;
      var finished = false;
      
      function finish() {
        if (finished) return;
        finished = true;
        
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        
        if (bestPos) {
          success(bestPos);
        } else {
          // لو ملقاش أي إشارة خالص، بنرجع للطريقة القديمة كحل أخير
          origGetCurrentPosition.call(navigator.geolocation, success, error, options);
        }
      }
      
      var timer = setTimeout(finish, maxWait);
      
      watchId = navigator.geolocation.watchPosition(
        function(pos) {
          if (!bestPos || pos.coords.accuracy < bestPos.coords.accuracy) {
            bestPos = pos;
          }
          
          if (pos.coords.accuracy <= targetAccuracy) {
            clearTimeout(timer);
            finish();
          }
        },
        function(err) {
          // بنطنش الإيرور ونستنى لحد ما الوقت يخلص
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: maxWait
        }
      );
    };
  }

})();
