/**
 * Ground OPS - Delivery 24 (Local Caching, Prefetching & Strict GPS)
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
  // 2. Strict GPS (مؤقت صارم لمنع التعليق)
  // =====================================================================
  if (navigator.geolocation) {
    var origGetCurrentPosition = navigator.geolocation.getCurrentPosition;
    
    navigator.geolocation.getCurrentPosition = function(success, error, options) {
      var isFinished = false;

      // 1. مؤقت قسري (Hard Timeout): لو الكود خد أكثر من 12 ثانية، نقطع العملية
      var hardTimer = setTimeout(function() {
        if (isFinished) return;
        isFinished = true;
        if (error) error({ code: 3, message: 'انتهى وقت المحاولة. يرجى التأكد من تشغيل الـ GPS والمحاولة مرة أخرى.' });
      }, 12000);

      // 2. إعدادات الـ GPS (دقة عالية، ممنوع اللوكيشن القديم)
      var robustOptions = Object.assign({}, options, {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000 
      });

      // 3. تنفيذ الطلب
      try {
        origGetCurrentPosition.call(navigator.geolocation, function(pos) {
          if (isFinished) return;
          isFinished = true;
          clearTimeout(hardTimer);
          if (success) success(pos);
        }, function(err) {
          if (isFinished) return;
          isFinished = true;
          clearTimeout(hardTimer);
          if (error) error(err);
        }, robustOptions);
      } catch (e) {
        if (isFinished) return;
        isFinished = true;
        clearTimeout(hardTimer);
        if (error) error(e);
      }
    };
  }
})();
