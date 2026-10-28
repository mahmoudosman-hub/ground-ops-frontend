/**
 * Ultimate GPS Safety Net
 */
(function () {
  'use strict';
  
  // 1. إجبار التطبيق الأصلي على الرد (عشان لو الجافا علقت)
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.GopsLocation) {
    var bridge = window.Capacitor.Plugins.GopsLocation;
    if (bridge.getCurrentPosition && !bridge.__timeoutPatched) {
      var orig = bridge.getCurrentPosition;
      bridge.getCurrentPosition = function(opts) {
        var p = orig.call(bridge, opts);
        var timeout = new Promise(function(_, reject) {
          setTimeout(function() { reject(new Error('Native GPS Timeout')); }, 12000);
        });
        return Promise.race([p, timeout]);
      };
      bridge.__timeoutPatched = true;
    }
  }

  // 2. مسح علامة التحميل من الزرار لو علقت
  setInterval(function() {
    var btns = document.querySelectorAll('button');
    btns.forEach(function(b) {
      if (b.innerText && b.innerText.includes('Getting location') && b.disabled) {
        if (!b.dataset.stuckTime) b.dataset.stuckTime = Date.now();
        if (Date.now() - b.dataset.stuckTime > 13000) {
          b.innerText = 'Check GPS';
          b.disabled = false;
          delete b.dataset.stuckTime;
          alert('تعذر جلب الموقع. يرجى التأكد من تشغيل الـ GPS والمحاولة في مكان مفتوح.');
        }
      } else {
        delete b.dataset.stuckTime;
      }
    });
  }, 1000);
})();
