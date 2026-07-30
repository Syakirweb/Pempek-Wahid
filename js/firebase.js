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
  let auth = null;
  let storage = null;
  let initialized = false;

  function initFirebase() {
    if (initialized) {
      return { db, auth, storage, ready: Boolean(auth), firestoreReady: Boolean(db) };
    }

    if (typeof firebase === 'undefined' || !firebase.apps) {
      console.warn('[Firebase] SDK belum dimuat. Pastikan semua script Firebase sudah ditambahkan di halaman.');
      return { db: null, auth: null, storage: null, ready: false, firestoreReady: false };
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('[Firebase] App berhasil diinisialisasi.');
      }

      try {
        auth = firebase.auth();
        console.log('[Firebase] Auth siap.');
      } catch (e) {
        console.error('[Firebase] Gagal inisialisasi Auth:', e);
        auth = null;
      }

      try {
        db = firebase.firestore();
        console.log('[Firebase] Firestore siap.');
        db.enablePersistence({ synchronizeTabs: true }).catch(err => {
          if (err.code === 'failed-precondition') {
            console.warn('[Firestore] Persistence gagal: banyak tab terbuka bersamaan.');
          } else if (err.code === 'unimplemented') {
            console.warn('[Firestore] Persistence tidak didukung browser ini.');
          }
        });
      } catch (e) {
        console.error('[Firebase] Gagal inisialisasi Firestore:', e);
        db = null;
      }

      try {
        storage = firebase.storage();
        console.log('[Firebase] Storage siap.');
      } catch (e) {
        console.warn('[Firebase] Storage SDK tidak tersedia (mungkin tidak dimuat di halaman ini).');
        storage = null;
      }

      initialized = true;
      return { db, auth, storage, ready: Boolean(auth), firestoreReady: Boolean(db) };
    } catch (error) {
      console.error('[Firebase] Gagal menginisialisasi Firebase:', error);
      return { db: null, auth: null, storage: null, ready: false, firestoreReady: false };
    }
  }

  // --- REVIEW FUNCTIONS ---
  async function saveReview(reviewData) {
    const { db, firestoreReady } = initFirebase();
    if (!firestoreReady || !db) return { ok: false, error: 'Firestore belum siap.' };

    try {
      const docRef = await db.collection('reviews').add({
        ...reviewData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return { ok: true, id: docRef.id };
    } catch (error) {
      console.error('Gagal menyimpan ulasan:', error);
      return { ok: false, error: error.message };
    }
  }

  async function loadReviews() {
    const { db, firestoreReady } = initFirebase();
    if (!firestoreReady || !db) {
      console.error('[Firestore] Tidak bisa loadReviews: Firestore belum siap.');
      return [];
    }

    try {
      const snapshot = await db.collection('reviews').get();
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      // Urutkan secara lokal berdasarkan createdAt descending
      data.sort((a, b) => {
        const tA = a.createdAt?.toDate?.() || new Date(0);
        const tB = b.createdAt?.toDate?.() || new Date(0);
        return tB - tA;
      });
      console.log('[Firestore] Data Ulasan Berhasil Dimuat:', data.length, 'item');
      return data;
    } catch (error) {
      console.error('[Firestore] Gagal mengambil ulasan — kode:', error.code, '| pesan:', error.message);
      return [];
    }
  }

  // Realtime listener untuk reviews (digunakan di admin panel)
  function onSnapshotReviews(callback) {
    const { db, firestoreReady } = initFirebase();
    if (!firestoreReady || !db) {
      console.error('[Firestore] Tidak bisa onSnapshotReviews: Firestore belum siap.');
      if (callback) callback([]);
      return () => {};
    }

    return db.collection('reviews').onSnapshot(
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        data.sort((a, b) => {
          const tA = a.createdAt?.toDate?.() || new Date(0);
          const tB = b.createdAt?.toDate?.() || new Date(0);
          return tB - tA;
        });
        callback(data);
      },
      (error) => {
        console.error('[Firestore] onSnapshotReviews error:', error);
        callback([]);
      }
    );
  }

  // Realtime listener untuk menu (digunakan di admin panel)
  function onSnapshotMenu(callback) {
    const { db, firestoreReady } = initFirebase();
    if (!firestoreReady || !db) {
      console.error('[Firestore] Tidak bisa onSnapshotMenu: Firestore belum siap.');
      if (callback) callback([]);
      return () => {};
    }

    return db.collection('products').onSnapshot(
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        callback(data);
      },
      (error) => {
        console.error('[Firestore] onSnapshotMenu error:', error);
        callback([]);
      }
    );
  }

  async function deleteReview(id) {
    const { db, firestoreReady } = initFirebase();
    if (!firestoreReady || !db) return { ok: false, error: 'Firestore belum siap.' };

    try {
      await db.collection('reviews').doc(id).delete();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  async function updateReviewReply(id, reply) {
    const { db, firestoreReady } = initFirebase();
    if (!firestoreReady || !db) return { ok: false, error: 'Firestore belum siap.' };

    try {
      await db.collection('reviews').doc(id).update({
        reply,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  // --- MENU CRUD FUNCTIONS ---
  async function loadMenu() {
    const { db, firestoreReady } = initFirebase();
    if (!firestoreReady || !db) {
      console.error('[Firestore] Tidak bisa loadMenu: Firestore belum siap.');
      return [];
    }

    try {
      const snapshot = await db.collection('products').get();
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      console.log('[Firestore] Data Menu Berhasil Dimuat:', data.length, 'item');
      return data;
    } catch (error) {
      console.error('[Firestore] Gagal memuat menu — kode:', error.code, '| pesan:', error.message);
      return [];
    }
  }

  async function saveMenu(productData, id = null) {
    const { db, firestoreReady } = initFirebase();
    if (!firestoreReady || !db) return { ok: false, error: 'Firestore belum siap.' };

    try {
      if (id) {
        await db.collection('products').doc(id).update({
          ...productData,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { ok: true, id };
      } else {
        const docRef = await db.collection('products').add({
          ...productData,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { ok: true, id: docRef.id };
      }
    } catch (error) {
      console.error('Gagal menyimpan menu:', error);
      return { ok: false, error: error.message };
    }
  }

  async function deleteMenu(productId) {
    const { db, firestoreReady } = initFirebase();
    if (!firestoreReady || !db) return { ok: false, error: 'Firestore belum siap.' };

    try {
      await db.collection('products').doc(productId).delete();
      return { ok: true };
    } catch (error) {
      console.error('Gagal menghapus menu:', error);
      return { ok: false, error: error.message };
    }
  }

  async function uploadImage(file) {
    const { storage } = initFirebase();
    if (!storage) return { ok: false, error: 'Firebase Storage SDK tidak ditemukan.' };

    try {
      const storageRef = storage.ref();
      const fileRef = storageRef.child(`products/${Date.now()}_${file.name}`);
      await fileRef.put(file);
      const url = await fileRef.getDownloadURL();
      return { ok: true, url };
    } catch (error) {
      console.error('Gagal mengunggah gambar:', error);
      return { ok: false, error: error.message };
    }
  }

  // --- AUTHENTICATION ---
  // Mapping kode error Firebase ke pesan Bahasa Indonesia
  const pesanErrorAuth = {
    'auth/user-not-found': 'Email tidak terdaftar.',
    'auth/wrong-password': 'Password salah.',
    'auth/invalid-email': 'Format email tidak valid.',
    'auth/too-many-requests': 'Terlalu banyak percobaan login. Coba lagi nanti.',
    'auth/network-request-failed': 'Gagal terhubung ke jaringan. Periksa koneksi internet.',
    'auth/invalid-credential': 'Email atau password salah.',
    'auth/user-disabled': 'Akun ini telah dinonaktifkan oleh administrator.',
    'auth/operation-not-allowed': 'Metode login ini tidak diizinkan.',
    'auth/internal-error': 'Terjadi kesalahan internal Firebase. Coba lagi.',
  };

  function terjemahkanErrorAuth(error) {
    return pesanErrorAuth[error.code] || error.message;
  }

  async function signIn(email, password) {
    const { auth, ready } = initFirebase();
    if (!ready || !auth) {
      console.error('[Auth] Firebase Auth belum siap. Cek apakah firebase-auth-compat.js sudah dimuat.');
      return { ok: false, error: 'Firebase Auth belum siap.' };
    }

    try {
      console.log('[Auth] Mencoba login dengan:', email);
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      console.log('[Auth] Login berhasil:', userCredential.user.email);
      return { ok: true, user: userCredential.user };
    } catch (error) {
      console.error('[Auth] Login gagal — kode:', error.code, '| pesan:', error.message);
      return { ok: false, error: terjemahkanErrorAuth(error) };
    }
  }

  function signOut() {
    const { auth, ready } = initFirebase();
    if (!ready || !auth) return { ok: false, error: 'Firebase Auth belum siap.' };
    return auth.signOut();
  }

  function onAuthStateChanged(callback) {
    const { auth, ready } = initFirebase();
    if (!ready || !auth) {
      if (callback) callback(null);
      return () => {};
    }
    return auth.onAuthStateChanged(callback);
  }

  // Listener efisien: dipanggil saat token berubah (password changed, revoked, dll.)
  function onIdTokenChanged(callback) {
    const { auth, ready } = initFirebase();
    if (!ready || !auth) {
      if (callback) callback(null);
      return () => {};
    }
    return auth.onIdTokenChanged(callback);
  }

  window.firebaseManager = {
    initFirebase,
    saveReview,
    loadReviews,
    onSnapshotReviews,
    onSnapshotMenu,
    deleteReview,
    updateReviewReply,
    loadMenu,
    saveMenu,
    deleteMenu,
    uploadImage,
    signIn,
    signOut,
    onAuthStateChanged,
    onIdTokenChanged
  };

  initFirebase();
})();