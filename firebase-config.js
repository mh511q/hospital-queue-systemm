// firebase-config.js
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBJtLnQs-6PoBLpIGmVdOzPkECv0hXIiNQ",
  authDomain: "baqaa-hospital.firebaseapp.com",
  databaseURL: "https://baqaa-hospital-default-rtdb.firebaseio.com",
  projectId: "baqaa-hospital",
  storageBucket: "baqaa-hospital.firebasestorage.app",
  messagingSenderId: "1069887196926",
  appId: "1:1069887196926:web:aa03cfe1fe134a31599faf",
  measurementId: "G-9WDL06CC3G"
};

// تهيئة Firebase (باستخدام صيغة الإصدار 8)
firebase.initializeApp(firebaseConfig);
const database = firebase.database(); // الحصول على مرجع لقاعدة البيانات