// Classic service worker using Firebase compat scripts from CDN
// Using compat ensures no bundler is required in the service worker context.

/* eslint-disable no-undef */
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js"
);

const firebaseConfig = {
  apiKey: "AIzaSyCp1E8GGpUNoBxbWl7nXPJuiMtK6ftz5F8",
  authDomain: "mizan-7079f.firebaseapp.com",
  projectId: "mizan-7079f",
  storageBucket: "mizan-7079f.firebasestorage.app",
  messagingSenderId: "463538626527",
  appId: "1:463538626527:web:3493f40632314cf00f2e6a",
  measurementId: "G-47M72V9EPE",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  const notificationTitle = payload?.notification?.title || "New Notification";
  const notificationOptions = {
    body: payload?.notification?.body,
    icon: "/mizan-logo-192x192.png",
    data: payload?.data,
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
