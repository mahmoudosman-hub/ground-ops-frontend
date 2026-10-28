/**
 * Ground OPS - Delivery 26 (Admin Notifications UI Fixer)
 */
(function () {
  'use strict';
  if (!/admin\.html/i.test(window.location.pathname)) return;

  // 1. إضافة كود CSS لتحسين شكل الإشعارات
  var style = document.createElement('style');
  style.innerHTML = `
    /* تحديد طول القائمة وعمل سكرول لو كتير */
    .gops-notif-container, div[class*="notification"]:has(> div) {
      max-height: 400px !important;
      overflow-y: auto !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
    }
    /* تنسيق شكل كل إشعار */
    .gops-notif-item {
      padding: 10px 14px !important;
      border-bottom: 1px solid #eee !important;
      transition: background 0.2s !important;
    }
    .gops-notif-item:hover {
      background: #f9f9f9 !important;
    }
    .gops-notif-item.unread {
      background: #f0f7ff !important;
      border-left: 4px solid #0a84ff !important;
    }
  `;
  document.head.appendChild(style);

  // دالة لمسح الشارة الحمراء (اللي فوق الجرس)
  function clearBadge() {
    var badge = document.querySelector('.badge, [class*="badge"], [id*="badge"]');
    if (badge) {
      badge.style.display = 'none';
      badge.textContent = '0';
    }
    // لو فيه رقم جوه الجرس نفسه
    var bell = document.querySelector('.fa-bell, [class*="bell"], [id*="bell"]');
    if (bell) {
      var countSpan = bell.querySelector('span');
      if (countSpan) countSpan.style.display = 'none';
    }
  }

  // دالة لإغلاق القائمة
  function closePopup() {
    var popup = document.querySelector('.notifications-popup, [class*="notification-popup"], #gops-notif-popup');
    if (popup) popup.style.display = 'none';
  }

  // دالة لاعتراض زرار "قراءة الكل" وتحديث الشاشة فوراً
  document.addEventListener('click', function (e) {
    var target = e.target;
    
    // لو داس على "قراءة الكل" (Mark all read)
    if (target.textContent.includes('Mark all') || target.textContent.includes('قراءة الكل') || target.id === 'mark-all-read' || target.classList.contains('mark-all-read')) {
      // بنستنى السيرفر يرد بـ نصف ثانية، وبعدين ننضف الشاشة
      setTimeout(function () {
        var items = document.querySelectorAll('.gops-notif-item, .notification-item');
        items.forEach(function (item) { item.classList.remove('unread'); item.style.background = 'transparent'; });
        clearBadge();
        closePopup(); // نقفل القائمة عشان ميبقاش فيه لخبطة
      }, 800);
    }

    // لو داس على الشارة أو الجرس لفتح القائمة
    if (target.closest('.fa-bell') || target.closest('[class*="bell"]')) {
      setTimeout(function () {
        var popup = document.querySelector('.notifications-popup, [class*="notification-popup"]');
        if (popup) {
          popup.classList.add('gops-notif-container');
        }
      }, 200);
    }
  });

  // قفل القائمة لما تدوس في أي مكان فاضي بره
  document.addEventListener('mousedown', function (e) {
    var popup = document.querySelector('.notifications-popup, [class*="notification-popup"]');
    if (popup && popup.style.display !== 'none') {
      if (!popup.contains(e.target) && !e.target.closest('.fa-bell') && !e.target.closest('[class*="bell"]')) {
        closePopup();
      }
    }
  });

})();
