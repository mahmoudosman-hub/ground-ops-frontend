/**
 * Ground OPS - Delivery 34 (Robust Notifications Handler)
 */
(function () {
  'use strict';
  if (!/admin\.html/i.test(window.location.pathname)) return;

  function getToken() {
    try {
      var raw = localStorage.getItem('gops.session.admin') || sessionStorage.getItem('gops.session.admin');
      if (!raw) return null;
      return JSON.parse(raw).token;
    } catch(e) { return null; }
  }

  document.addEventListener('click', function(e) {
    var btn = e.target.closest('button, a, div[role="button"]');
    if (!btn) return;

    var text = (btn.innerText || "").toLowerCase().trim();

    // 1. لو داس على "Mark all as read" أو "قراءة الكل"
    if (text.includes('mark all') || text.includes('قراءة الكل')) {
      e.preventDefault();
      e.stopPropagation(); // بنوقف أي كود تاني عشان ميعملش تعليق

      var token = getToken();
      var apiUrl = window.API_URL || window.GOPS_CONFIG?.API_URL || window.CONFIG?.API_URL;
      
      if (token && apiUrl) {
        btn.innerText = '...';
        
        fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'markNotificationsRead',
            token: token,
            payload: { all: true },
            client: 'delivery34'
          })
        }).then(r => r.json()).then(res => {
          if (res.success) {
            // إخفاء الشارة الحمراء
            var badges = document.querySelectorAll('.badge, [class*="badge"], [id*="badge"], .fa-bell span');
            badges.forEach(b => { b.style.display = 'none'; b.innerText = '0'; });
            
            // قفل القائمة
            var dropdowns = document.querySelectorAll('[class*="dropdown"], [class*="notification"]');
            dropdowns.forEach(d => { 
                d.style.display = 'none'; 
                d.classList.remove('open', 'show');
            });
            
            // مسح أي خلفية سوداء
            var backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(b => b.remove());
            
            // إرجاع الشاشة طبيعية
            document.body.style.overflow = 'auto';
            document.body.style.backgroundColor = '';
          }
        }).catch(err => {
           console.log("Error marking as read", err);
        });
      }
    }

    // 2. لو داس على "Close" أو "إغلاق"
    if (text === 'close' || text === 'إغلاق' || text === '×' || text === 'x') {
      e.preventDefault();
      var dropdowns = document.querySelectorAll('[class*="dropdown"], [class*="notification"]');
      dropdowns.forEach(d => { 
          d.style.display = 'none';
          d.classList.remove('open', 'show');
      });
      var backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(b => b.remove());
      document.body.style.overflow = 'auto';
    }
  }, true); // Capture phase عشان نمسك الزرار قبل الكود الأصلي

})();
