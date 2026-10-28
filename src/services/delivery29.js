/**
 * Ground OPS - Delivery 29 (Final Fix)
 */
(function () {
  'use strict';
  if (!/admin\.html/i.test(window.location.pathname)) return;

  // 1. تصغير زرار السيلفي وجعله كاميرا فقط
  function fixFab() {
    var fab = document.getElementById('gops-sc-fab');
    if (!fab) return;

    // مسح أي كلام جواه
    if (fab.innerHTML.trim() !== '📸') {
      fab.innerHTML = '📸';
    }

    // إجبار التصميم يبقى دايرة صغيرة
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

  // نشغلها كل ثانية عشان نضمن إنها مسيطرة على الكود القديم
  setInterval(fixFab, 1000);

  // 2. قفل قائمة الإشعارات فوراً عند الضغط على "قراءة الكل"
  document.addEventListener('click', function (e) {
    var text = (e.target.innerText || "").toLowerCase();
    
    if (text.includes('mark all') || text.includes('قراءة الكل') || text.includes('mark as read')) {
      
      setTimeout(function () {
        // إخفاء أي قائمة إشعارات مفتوحة
        var dropdowns = document.querySelectorAll('[class*="dropdown"], [class*="notification"]');
        dropdowns.forEach(function (d) {
          if (d.style.display !== 'none') d.style.display = 'none';
        });

        // إزالة أي شاشة سوداء (Backdrop) سببها الكود القديم
        var backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(function (b) { b.remove(); });

        // التأكد إن الشاشة رجعت طبيعية ومفيش سواد
        document.body.style.backgroundColor = '';
        document.body.style.overflow = 'auto';
        
      }, 400); // نصف ثانية
    }
  });

})();
