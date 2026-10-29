/**
 * Ground OPS - Delivery 31 (Admin Custom Notifications UI)
 */
(function () {
  'use strict';
  if (!/admin\.html/i.test(window.location.pathname)) return;

  // إضافة زرار في القائمة الجانبية
  function injectSidebarButton() {
    var nav = document.querySelector('.sidebar, nav.sidebar, aside.sidebar, #sidebar');
    if (!nav || document.getElementById('gops-admin-notif-btn')) return;

    var a = document.createElement('a');
    a.id = 'gops-admin-notif-btn';
    a.href = '#';
    a.textContent = '📢 إرسال إشعار';
    a.style.cssText = 'display:block;padding:10px 14px;color:inherit;text-decoration:none;cursor:pointer;font-weight:bold;margin-top:10px;border-top:1px solid #eee;';
    a.onclick = function(ev) { ev.preventDefault(); openNotifModal(); };
    nav.appendChild(a);
  }

  function openNotifModal() {
    var old = document.getElementById('gops-notif-modal');
    if (old) old.remove();

    var token = localStorage.getItem('gops.session.admin');
    if (token) { try { token = JSON.parse(token).token; } catch(e){} }
    var apiUrl = window.API_URL || window.GOPS_CONFIG?.API_URL || window.CONFIG?.API_URL;

    // جلب الموظفين
    fetch(apiUrl, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getEmployees', token: token, payload: { page_size: 500 }, client: 'admin-notif' })
    }).then(function(r) { return r.json(); }).then(function(res) {
      if (!res.success) throw new Error(res.message);
      var emps = res.data.items || [];
      var empOpts = emps.map(function(e) { return '<option value="' + e.employee_id + '">' + e.employee_name + ' (' + e.employee_id + ')</option>'; }).join('');

      var modal = document.createElement('div');
      modal.id = 'gops-notif-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;';
      modal.innerHTML = 
        '<div style="background:#fff;border-radius:12px;max-width:500px;width:100%;padding:20px;font:15px/1.5 system-ui,sans-serif;color:#111;">' +
          '<h2 style="margin:0 0 15px;">📢 إرسال إشعار مخصص</h2>' +
          '<label style="display:block;margin-bottom:10px;font-weight:600;">اختر الكابتن:</label>' +
          '<select id="gops-notif-emp" style="width:100%;padding:10px;margin-bottom:15px;border:1px solid #ccc;border-radius:8px;">' + empOpts + '</select>' +
          '<label style="display:block;margin-bottom:10px;font-weight:600;">نوع الإشعار (Template):</label>' +
          '<select id="gops-notif-type" style="width:100%;padding:10px;margin-bottom:15px;border:1px solid #ccc;border-radius:8px;">' +
            '<option value="update">تحديث التطبيق (رابط)</option>' +
            '<option value="missed_selfie">فاتك سيلفي تشيك</option>' +
            '<option value="long_break">بريك طويل</option>' +
            '<option value="custom">رسالة مخصصة</option>' +
          '</select>' +
          '<label style="display:block;margin-bottom:10px;font-weight:600;">عنوان الرسالة:</label>' +
          '<input type="text" id="gops-notif-title" style="width:100%;padding:10px;margin-bottom:15px;border:1px solid #ccc;border-radius:8px;" placeholder="اكتب العنوان هنا...">' +
          '<label style="display:block;margin-bottom:10px;font-weight:600;">نص الرسالة:</label>' +
          '<textarea id="gops-notif-body" rows="3" style="width:100%;padding:10px;margin-bottom:15px;border:1px solid #ccc;border-radius:8px;" placeholder="اكتب نص الرسالة هنا..."></textarea>' +
          '<label style="display:block;margin-bottom:10px;font-weight:600;">رابط (اختياري - للتحديث):</label>' +
          '<input type="text" id="gops-notif-url" style="width:100%;padding:10px;margin-bottom:15px;border:1px solid #ccc;border-radius:8px;" placeholder="https://...">' +
          '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
            '<button id="gops-notif-cancel" style="padding:10px 20px;border:1px solid #ccc;border-radius:8px;background:#fff;cursor:pointer;">إلغاء</button>' +
            '<button id="gops-notif-send" style="padding:10px 20px;border:0;border-radius:8px;background:#0a84ff;color:#fff;font-weight:bold;cursor:pointer;">إرسال الإشعار</button>' +
          '</div>' +
          '<div id="gops-notif-err" style="color:#c00;margin-top:10px;text-align:center;"></div>' +
        '</div>';
      document.body.appendChild(modal);

      var typeSel = document.getElementById('gops-notif-type');
      var titleIn = document.getElementById('gops-notif-title');
      var bodyIn = document.getElementById('gops-notif-body');
      var urlIn = document.getElementById('gops-notif-url');

      // تعبئة تلقائية للحقول بناءً على النوع
      typeSel.onchange = function() {
        var v = typeSel.value;
        if (v === 'update') { titleIn.value = 'تحديث جديد للتطبيق'; bodyIn.value = 'يرجى تحديث التطبيق الآن للحصول على آخر الميزات.'; urlIn.value = 'https://mahmoudosman-hub.github.io/ground-ops-frontend/index.html'; }
        else if (v === 'missed_selfie') { titleIn.value = '📸 لقد فاتك سيلفي تشيك'; bodyIn.value = 'يرجى فتح التطبيق والتقاط صورة سيلفي الآن.'; urlIn.value = ''; }
        else if (v === 'long_break') { titleIn.value = '☕ بريك طويل'; bodyIn.value = 'لقد تجاوزت مدة البريك المسموح بها. يرجى العودة للعمل.'; urlIn.value = ''; }
        else { titleIn.value = ''; bodyIn.value = ''; urlIn.value = ''; }
      };
      typeSel.dispatchEvent(new Event('change'));

      document.getElementById('gops-notif-cancel').onclick = function() { modal.remove(); };
      document.getElementById('gops-notif-send').onclick = function() {
        var empId = document.getElementById('gops-notif-emp').value;
        var title = titleIn.value;
        var body = bodyIn.value;
        var url = urlIn.value;
        var err = document.getElementById('gops-notif-err');
        err.textContent = '';

        if (!empId || !title || !body) { err.textContent = 'يرجى تعبئة كل الحقول المطلوبة.'; return; }

        document.getElementById('gops-notif-send').disabled = true;
        document.getElementById('gops-notif-send').textContent = 'جاري الإرسال...';

        fetch(apiUrl, {
          method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'sendAdminNotification', token: token, payload: { employee_id: empId, title: title, body: body, url: url }, client: 'admin-notif' })
        }).then(function(r) { return r.json(); }).then(function(res) {
          if (res.success) {
            err.style.color = '#1e8e3e'; err.textContent = '✅ تم الإرسال بنجاح!'; 
            setTimeout(function() { modal.remove(); }, 1500);
          } else {
            err.style.color = '#c00'; err.textContent = res.message; 
            document.getElementById('gops-notif-send').disabled = false;
            document.getElementById('gops-notif-send').textContent = 'إرسال الإشعار';
          }
        }).catch(function() {
          err.style.color = '#c00'; err.textContent = 'خطأ في الاتصال.'; 
          document.getElementById('gops-notif-send').disabled = false;
          document.getElementById('gops-notif-send').textContent = 'إرسال الإشعار';
        });
      };
    }).catch(function(e) {
      alert('فشل جلب الموظفين: ' + e.message);
    });
  }

  setInterval(injectSidebarButton, 3000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectSidebarButton);
  else injectSidebarButton();

})();
