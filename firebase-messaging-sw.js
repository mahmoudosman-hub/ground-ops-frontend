// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDwzrZIftyjwy_mukvWha4EhqDfBOV2UlY",
  authDomain: "ground-ops-tracker.firebaseapp.com",
  projectId: "ground-ops-tracker",
  storageBucket: "ground-ops-tracker.firebasestorage.app",
  messagingSenderId: "295865086509",
  appId: "1:295865086509:web:b9d4be3e43472f557e3ea4",
  measurementId: "G-4NBGJ0NQ16"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'Ground OPS';
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/assets/icons/icon-192x192.png', 
    badge: '/assets/icons/icon-192x192.png',
    vibrate: [500, 200, 500, 200, 500, 200, 500, 200, 500], // هزة قوية (للأندرويد PWA)
    requireInteraction: true, // الإشعار يفضل على الشاشة (مهم جداً للآيفون)
    data: { url: payload.data?.url || '/?action=location_check' } 
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// لما الكابتن يدوس على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      // لو التطبيق مفتوح، يروحله. لو مقفول، يفتحه من جديد
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        // بيفتح التطبيق على طول ويطلب منه يعمل Check GPS
        return clients.openWindow(event.notification.data.url || '/?action=location_check');
      }
    })
  );
});
