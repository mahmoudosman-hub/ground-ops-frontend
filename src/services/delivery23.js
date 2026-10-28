/**
 * Ground OPS - Delivery 23
 * Firebase Web Push Notifications for employees (iOS & Android PWA)
 */
(function () {
  'use strict';

  // تأكد إننا في صفحة الكابتن بس (مش الأدمن)
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

  // دالة مساعدة عشان نتأكد إن الكابتن مسجل دخول
  function getSession() {
    try {
      var raw = localStorage.getItem('gops.session.employee');
      if (!raw) return null;
      var v = JSON.parse(raw);
      if (v && v.token && Date.parse(v.expires_at) > Date.now()) return v;
      return null;
    } catch (e) { return null; }
  }

  async function initPushNotifications() {
    try {
      // 1. نتأكد إن المتصفح بيدعم الإشعارات
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.log('Push notifications not supported in this browser.');
        return;
      }

      // 2. نستنى الكابتن يسجل دخول الأول
      var session = getSession();
      if (!session) {
        // لو مش مسجل، نستنى شوية ونجرب تاني
        setTimeout(initPushNotifications, 3000);
        return;
      }

      // 3. نطلب الإذن من الكابتن
      var permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('User denied notifications.');
        return;
      }

      // 4. نجهز Firebase (بنجيبهم من الانترنت مباشرة عشان الكود يفضل خفيف)
      var { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js');
      var { getMessaging, getToken, onMessage } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging.js');

      var app = initializeApp(firebaseConfig);
      var messaging = getMessaging(app);

      // 5. نسجل الـ Service Worker
      var registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

      // 6. نجيب الـ Token
      var currentToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (currentToken) {
        console.log('FCM Token:', currentToken);
        
        // 7. نبعت الـ Token للسيرفر بتاعنا عشان يخزنه
        // بنستخدم fetch مباشر عشان نتجنب أي تعارض مع ملفات الـ delivery التانية
        var apiUrl = window.API_URL || window.GOPS_CONFIG?.API_URL || window.CONFIG?.API_URL;
        if (apiUrl) {
          await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'registerPushToken',
              token: session.token,
              payload: { token: currentToken },
              client: 'delivery23/1.0'
            })
          });
          console.log('Token sent to backend successfully.');
        }
      }

      // 8. لو الإشعار جه والتطبيق مفتوح قدام الكابتن (Foreground)
      onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        // هنا بنعمل تنبيه بسيط لو التطبيق مفتوح
        if (window.toast) {
          window.toast(payload.notification.title + ': ' + payload.notification.body, { bg: '#0a84ff', ms: 5000 });
        } else {
          alert(payload.notification.title + '\n' + payload.notification.body);
        }
      });

    } catch (error) {
      console.error('Error setting up push notifications:', error);
    }
  }

  // نبدأ العملية بعد ما الصفحة تحمل
  if (document.readyState === 'complete') {
    initPushNotifications();
  } else {
    window.addEventListener('load', initPushNotifications);
  }
})();
  // ===== iOS 30-Minute Location Check Handling =====
  window.addEventListener('load', function () {
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'location_check') {
      // هننضف الرابط عشان لو عمل ريفريش ميفضلش يطلب منه كل شوية
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // نستنى ثانية عشان التطبيق يحمل
      setTimeout(function () {
        if (window.Alert && window.Alert.alert) {
           // لو التطبيق فيه دالة تنبيه
        } else {
           alert('يرجى الضغط على زر "Check GPS" لتأكيد موقعك الحالي.');
        }
        
        // ممكن نعمل سكرول لزرار الـ GPS أو نعمل فلاش عليه
        var gpsBtn = document.getElementById('gops-btn-check-gps') || document.querySelector('[data-action="checkGps"]');
        if (gpsBtn) {
          gpsBtn.style.boxShadow = '0 0 15px 5px #ffeb3b';
          gpsBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 1500);
    }
  });
