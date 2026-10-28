/**
 * Ground OPS - Delivery 29 (Small Camera Icon + Close Notifications Cleanly)
 */
(function () {
  'use strict';
  if (!/admin\.html/i.test(window.location.pathname)) return;

  // 1. تصغير أيقونة السيلفي وتخليها كاميرا بس
  var style = document.createElement('style');
  style.innerHTML = `
    #gops-sc-fab {
      width: 55px !important;
      height: 55px !important;
      border-radius: 50% !important;
      padding: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-size: 26px !important;
      bottom: 20px !important;
      right: 20px !important;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3) !important;
    }
  `;
  document.head.appendChild(style);

  // دالة بتخلي الزرار يبقى كاميرا بس (من غير كلام)
  setInterval(function() {
    var fab = document.getElementById('gops-sc-fab');
    if (fab && fab.textContent !== '📸') {
      fab.textContent = '📸';
    }
  }, 1000);

  // 2. قفل الإشعارات لوحده لما تدوس Mark all as read
  document.addEventListener('click', function (e) {
    var text = (e.target.innerText || "").toLowerCase();
    
    if (text.includes('mark all') || text.includes('قراءة الكل') || text.includes('mark as read')) {
      
      // بنستنى ثانية عشان السيرفر يقرا، وبعدين نقفل
      setTimeout(function () {
        // إخفاء أي قائمة إشعارات مفتوحة
        var dropdowns = document.querySelectorAll('[class*="dropdown"], [class*="notification"], .popover');
        dropdowns.forEach(function (d) {
          if (d.style.display !== 'none') {
             d.style.display = 'none';
          }
        });

        // إزالة أي خلفية سوداء (Overlay) معلقة
        var backdrops = document.querySelectorAll('.modal-backdrop, [style*="rgba(0,0,0"], [style*="background: rgba"]');
        backdrops.forEach(function (b) {
          if (!b.closest('#gops-sc-admin-root')) { // سيب سيلفي تشيك في حالها
             b.style.display = 'none';
             b.remove();
          }
        });
        
        // إزالة أي لون أسود من الـ body
        document.body.style.backgroundColor = '';
        document.body.style.overflow = '';

      }, 500);
    }
  });

})();
