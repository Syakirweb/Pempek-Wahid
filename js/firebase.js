(function () {
  const firebaseConfig = {
    apiKey: 'AIzaSyBQS46bKPUJV24qO2vsbprUO3BzetGBvD0',
    authDomain: 'pempek-wahid.firebaseapp.com',
    databaseURL: 'https://pempek-wahid-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'pempek-wahid',
    storageBucket: 'pempek-wahid.firebasestorage.app',
    messagingSenderId: '556954876004',
    appId: '1:556954876004:web:d1d167fc80e99f893ec771',
    measurementId: 'G-1D5N5PP7K4'
  };

  let db = null;
  let initialized = false;

  function initFirebase() {
    if (initialized) {
      return { db, ready: Boolean(db) };
    }

    if (typeof firebase === 'undefined' || !firebase.apps) {
      console.warn('Firebase SDK belum dimuat. Pastikan script Firebase sudah ditambahkan di halaman.');
      return { db: null, ready: false };
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }

      db = firebase.firestore();
      initialized = true;
      return { db, ready: true };
    } catch (error) {
      console.error('Gagal menginisialisasi Firebase:', error);
      return { db: null, ready: false };
    }
  }

  async function saveReview(reviewData) {
    const { db, ready } = initFirebase();

    if (!ready || !db) {
      return { ok: false, error: 'Firebase belum siap. Pastikan SDK Firebase dan Firestore sudah dimuat dengan benar.' };
    }

    try {
      const docRef = await db.collection('reviews').add({
        ...reviewData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      return { ok: true, id: docRef.id };
    } catch (error) {
      console.error('Gagal menyimpan ulasan ke Firestore:', error);

      const message = error.code === 'permission-denied'
        ? 'Akses Firestore ditolak. Periksa aturan Firestore di Firebase Console.'
        : error.message || 'Ulasan gagal dikirim. Periksa konfigurasi Firebase.';

      return { ok: false, error: message };
    }
  }

  async function loadReviews() {
    const { db, ready } = initFirebase();

    if (!ready || !db) {
      return [];
    }

    try {
      const snapshot = await db.collection('reviews').orderBy('createdAt', 'desc').get();
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Gagal mengambil ulasan dari Firestore:', error);
      return [];
    }
  }

  window.firebaseManager = {
    initFirebase,
    saveReview,
    loadReviews
  };

  initFirebase();
})();