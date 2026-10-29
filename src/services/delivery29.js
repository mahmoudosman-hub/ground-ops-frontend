/**
 * Ground OPS - Delivery 29 (Final Fix - Hide Old Lang Button)
 */
(function () {
  'use strict';
  if (!/admin\.html/i.test(window.location.pathname)) return;

  // 1. تصغير زرار السيلفي وجعله كاميرا فقط
  function fixFab() {
    var fab = document.getElementById('gops-sc-fab');
    if (!fab) return;
    if (fab.innerHTML.trim() !== '📸') fab.innerHTML = '📸';
    fab.style.setProperty('width', '55px', 'important');
    fab.style.setProperty('height', '55px', 'important');
    fab.style.setProperty('border-radius', '50%', 'important');
    fab.style.setProperty('padding', '0', 'important');
    fab.style.setProperty('display', 'flex', 'important');
    fab.style.setProperty('align-items', 'center', 'important');
    fab.style.setProperty('justify-content', 'center', 'important');
    fab.style.setProperty('font-size', '26px', 'important');
    fab.style.setProperty('bottom', '20px', 'important');
    fab.style.setProperty('right', '20px', 'important');
  }

  // 2. إخفاء الزرار القديم بتاع اللغة (اللي جاي من delivery3b)
  function hideOldLang() {
    var oldBtn = document.getElementById('gops-lang-btn');
    if (oldBtn) {
      oldBtn.style.display = 'none';
    }
  }

  // نشغل التنظيف كل ثانية عشان نضمن إننا مسيطرين
  setInterval(function() {
    fixFab();
    hideOldLang();
  }, 1000);

  // 3. قفل الإشعارات لوحده
  document.addEventListener('click', function (e) {
    var text = (e.target.innerText || "").toLowerCase();
    if (text.includes('mark all') || text.includes('قراءة الكل')) {
      setTimeout(function () {
        var dropdowns = document.querySelectorAll('[class*="dropdown"], [class*="notification"]');
        dropdowns.forEach(function (d) { d.style.display = 'none'; });
        var backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(function (b) { b.remove(); });
        document.body.style.backgroundColor = '';
        document.body.style.overflow = 'auto';
      }, 500);
    }
  });

})();
