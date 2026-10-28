/**
 * Ground OPS - Delivery 23 v2
 * Adds a manual button for notifications to bypass browser auto-block.
 */
(function () {
  'use strict';
  if (/admin\.html/i.test(window.location.pathname)) return;

  var firebaseConfig = {
    apiKey: "AIzaSyDwzrZIftyjwy_mukvWha4EhqDfBOV2UlY",
    authDomain: "ground-ops-tracker.firebaseapp.com",
    projectId: "ground-ops-tracker",
    storageBucket: "ground-ops-tracker.firebasestorage.app",
    messagingSenderId: "295865086509",
    appId: "1:295865086509:web:b9d4be3e43472f557e3ea4"
  };
  var VAPID_KEY = "BLYivja7AsoY3Qktg5NkIoLOU1bcbVTWHLxxh_QzyGqv0gyHcjuP7TGtJtM9kt1dqzOJcbiPQWm-TSDaaAhWvKw";

  function getSession() {
    try {
      var raw = localStorage.getItem('gops.session.employee');
      if (!raw) return null;
      var v = JSON.parse(raw);
      return (v && v.token) ? v : null;
    } catch (e) { return null; }
  }

  async function requestNotificationPermission() {
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        alert('جهازك أو المتصفح لا يدعم الإشعارات.');
        return;
      }

      var permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('تم رفض الإشعارات. يرجى تفعيلها من إعدادات المتصفح/الموبايل.');
        return;
      }

      var { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js');
      var { getMessaging, getToken } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging.js');

      var app = initializeApp(firebaseConfig);
      var messaging = getMessaging(app);

      var registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      var currentToken = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });

      if (currentToken) {
        var sess = getSession();
        var apiUrl = window.API_URL || window.GOPS_CONFIG?.API_URL || window.CONFIG?.API_URL;
        if (apiUrl && sess) {
          await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'registerPushToken',
              token: sess.token,
              payload: { token: currentToken },
              client: 'delivery23/2.0'
            })
          });
          alert('✅ تم تفعيل الإشعارات بنجاح! سيتلقى التطبيق إشعارات السيلفي والتحديثات.');
          var btn = document.getElementById('gops-enable-notif-btn');
          if (btn) btn.remove();
        }
      }
    } catch (err) {
      console.error('Push Error:', err);
      alert('حدث خطأ أثناء تفعيل الإشعارات: ' + err.message);
    }
  }

  function checkAndShowButton() {
    if (!getSession()) return; // مسجلش دخول
    if (!('Notification' in window)) return;
    
    // لو الإشعارات مفعلة خلاص، مفيش داعي للزرار
    if (Notification.permission === 'granted') {
      var existing = document.getElementById('gops-enable-notif-btn');
      if (existing) existing.remove();
      return;
    }

    // لو فيه زرار موجود، ميعملش واحد تاني
    if (document.getElementById('gops-enable-notif-btn')) return;

    // إنشاء الزرار
    var btn = document.createElement('button');
    btn.id = 'gops-enable-notif-btn';
    btn.innerHTML = '🔔 تفعيل الإشعارات (مطلوب)';
    btn.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:99999;padding:12px 24px;background:#e67e22;color:#fff;font-weight:bold;font-size:16px;border:none;border-radius:25px;box-shadow:0 4px 15px rgba(230,126,34,0.4);cursor:pointer;';
    btn.onclick = requestNotificationPermission;
    document.body.appendChild(btn);
  }

  // نستنى التطبيق يحمل ويسجل الدخول، وبعدين نطلع الزرار
  setInterval(checkAndShowButton, 3000);

})();
