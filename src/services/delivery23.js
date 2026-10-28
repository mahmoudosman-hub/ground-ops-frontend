/**
 * Ground OPS - Delivery 23
 * Firebase Web Push Notifications for employees (iOS & Android PWA)
 * + Full-Screen Force Location Check (iOS 15-min pings).
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
      if (v && v.token && Date.parse(v.expires_at) > Date.now()) return v;
      return null;
    } catch (e) { return null; }
  }

  // ===== 1. إعدادات الإشعارات =====
  async function initPushNotifications() {
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

      var session = getSession();
      if (!session) { setTimeout(initPushNotifications, 3000); return; }

      var permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      var { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js');
      var { getMessaging, getToken, onMessage } = await import('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging.js');

      var app = initializeApp(firebaseConfig);
      var messaging = getMessaging(app);

      var registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      var currentToken = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });

      if (currentToken) {
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
        }
      }

      onMessage(messaging, (payload) => {
        if (window.toast) {
          window.toast(payload.notification.title + ': ' + payload.notification.body, { bg: '#0a84ff', ms: 5000 });
        }
      });

    } catch (error) {
      console.error('Error setting up push notifications:', error);
    }
  }

  // ===== 2. شاشة إجبار الكابتن على عمل Check GPS =====
  function showForceLocationModal() {
    if (document.getElementById('gops-loc-force-modal')) return;

    // هزة خفيفة لو المتصفح بيدعم
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    var modal = document.createElement('div');
    modal.id = 'gops-loc-force-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;color:#fff;text-align:center;font-family:system-ui,sans-serif;';
    
    modal.innerHTML = 
      '<div style="font-size:50px;margin-bottom:20px;">📍</div>' +
      '<h1 style="font-size:24px;margin:0 0 10px;">تحديث الموقع مطلوب</h1>' +
      '<p style="font-size:16px;color:#ccc;margin-bottom:30px;max-width:300px;">يرجى تأكيد موقعك الحالي الآن للمتابعة. لا يمكنك استخدام التطبيق حتى يتم إرسال الموقع.</p>' +
      '<button id="gops-loc-force-btn" style="padding:15px 40px;font-size:18px;font-weight:bold;background:#0a84ff;color:#fff;border:none;border-radius:8px;cursor:pointer;width:100%;max-width:300px;">التقاط الموقع (GPS)</button>' +
      '<div id="gops-loc-force-err" style="color:#ff6b6b;margin-top:15px;font-size:14px;max-width:300px;line-height:1.4;"></div>';
    
    document.body.appendChild(modal);

    var btn = document.getElementById('gops-loc-force-btn');
    var err = document.getElementById('gops-loc-force-err');

    btn.onclick = function() {
      btn.disabled = true;
      btn.textContent = 'جاري تحديد الموقع...';
      err.textContent = '';

      navigator.geolocation.getCurrentPosition(
        function(pos) {
          var sess = getSession();
          if (!sess) {
            err.textContent = 'انتهت الجلسة. يرجى إعادة تسجيل الدخول.';
            btn.disabled = false; btn.textContent = 'التقاط الموقع (GPS)';
            return;
          }

          var apiUrl = window.API_URL || window.GOPS_CONFIG?.API_URL || window.CONFIG?.API_URL;
          
          // إرسال اللوكيشن للسيرفر مباشرة
          fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'submitLocation',
              token: sess.token,
              payload: {
                points: [{
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy_meters: pos.coords.accuracy,
                  timestamp: new Date(pos.timestamp).toISOString(),
                  is_mock_location: false,
                  location_source: 'gps',
                  tracking_source: 'FOREGROUND_WEB'
                }]
              },
              client: 'delivery23/1.0'
            })
          })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (data.success) {
              btn.textContent = '✅ تم تسجيل الموقع';
              btn.style.background = '#1e8e3e';
              setTimeout(function() {
                modal.remove();
                window.history.replaceState({}, document.title, window.location.pathname);
              }, 1500);
            } else {
              err.textContent = data.message || 'فشل في إرسال الموقع. حاول مرة أخرى.';
              btn.disabled = false; btn.textContent = 'التقاط الموقع (GPS)';
            }
          })
          .catch(function(e) {
            err.textContent = 'خطأ في الاتصال بالسيرفر. تأكد من الإنترنت.';
            btn.disabled = false; btn.textContent = 'التقاط الموقع (GPS)';
          });
        },
        function(error) {
          err.textContent = 'تعذر الحصول على الموقع. يرجى التأكد من تشغيل الـ GPS والسماح بالوصول.';
          btn.disabled = false; btn.textContent = 'التقاط الموقع (GPS)';
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 } // إعدادات صارمة للـ GPS
      );
    };
  }

  // ===== 3. قراءة الرابط والتشغيل =====
  function checkLocationAction() {
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'location_check') {
      // نظف الرابط عشان لو عمل ريفريش الشاشة متظهرش تاني
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(showForceLocationModal, 1000);
    }
  }

  if (document.readyState === 'complete') {
    initPushNotifications();
    checkLocationAction();
  } else {
    window.addEventListener('load', function() {
      initPushNotifications();
      checkLocationAction();
    });
  }
})();
