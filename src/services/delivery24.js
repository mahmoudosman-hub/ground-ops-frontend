/**
 * Ground OPS - Delivery 24 (Local Caching for Speed)
 * Intercepts API calls and caches static data in the device's localStorage.
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
            // لو الكاش لسه صالح
            if (Date.now() - cached.time < CACHE_TTL[action]) {
              // بنرجع الرد المحفوظ فوراً (من غير ما نروح للسيرفر)
              return Promise.resolve({
                ok: true,
                json: function() { return Promise.resolve(cached.data); }
              });
            }
          }

          // 3. لو مفيش كاش أو انتهت صلاحيته، بنجيب من السيرفر ونحفظه
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
    
    // أي طلب تاني (زي تسجيل الدخول أو الإشعارات) يروح للسيرفر عادي
    return origFetch(input, init);
  };
})();
// ===== FIX: Ensure High-Accuracy Real GPS (No Network/Stale Location) =====
(function() {
  if (navigator.geolocation) {
    var origGetCurrentPosition = navigator.geolocation.getCurrentPosition;
    
    navigator.geolocation.getCurrentPosition = function(success, error, options) {
      // إعدادات قوية: نرفض أي لوكيشن قديم، ونطلب دقة عالية جداً
      var robustOptions = Object.assign({}, options, {
        enableHighAccuracy: true, // نجبره يستخدم GPS
        maximumAge: 0,            // ممنوع ياخد لوكيشن محفوظ (حتى لو من ثانية)
        timeout: 15000            // لو ملقاش إشارة في 15 ثانية، يرجع إيرور بدل ما يلف للأبد
      });

      // بننادي الدالة الأصلية بالإعدادات القوية دي
      origGetCurrentPosition.call(navigator.geolocation, success, function(err) {
        // لو حصل إيرور (زي إنه ملقاش إشارة)، بنقوله رسالة واضحة
        if (err.code === 3) { // Timeout
          alert('إشارة الـ GPS ضعيفة أو بطيئة. يرجى التأكد من فتح الـ Location والمحاولة مرة أخرى.');
        }
        if (error) error(err);
      }, robustOptions);
    };
  }
})();
