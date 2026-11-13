/**
 * ==============================================================================
 * MODUL INTEGRASI FIREBASE (Authentication, Firestore, & Storage)
 * File: js/firebase.js
 * Deskripsi: Menyediakan API terpusat untuk operasi database Firestore (Menu, Ulasan, Status Toko),
 * autentikasi login admin, penyimpanan gambar di Firebase Storage, dan offline persistence.
 * ==============================================================================
 */

// Menggunakan pola IIFE (Immediately Invoked Function Expression) untuk mengisolasi variabel agar tidak mencemari scope global
(function () {
  // Objek konfigurasi kredensial proyek Firebase Pempek Wahid
  const firebaseConfig = {
    apiKey: 'AIzaSyBQS46bKPUJV24qO2vsbprUO3BzetGBvD0',                                                         // Kunci API publik Firebase untuk otentikasi client
    authDomain: 'pempek-wahid.firebaseapp.com',                                                                // Domain untuk autentikasi Firebase
    databaseURL: 'https://pempek-wahid-default-rtdb.asia-southeast1.firebasedatabase.app',                     // URL Realtime Database (region Asia Tenggara)
    projectId: 'pempek-wahid',                                                                                 // ID unik proyek di Google Cloud / Firebase Console
    storageBucket: 'pempek-wahid.firebasestorage.app',                                                         // Bucket cloud storage untuk penyimpanan foto produk & ulasan
    messagingSenderId: '556954876004',                                                                         // ID pengirim untuk Firebase Cloud Messaging
    appId: '1:556954876004:web:d1d167fc80e99f893ec771',                                                        // Identifier unik aplikasi Web client
    measurementId: 'G-1D5N5PP7K4'                                                                              // ID pelacakan Google Analytics 4
  };

  // Variabel internal untuk menampung instance Firestore Database
  let db = null;
  // Variabel internal untuk menampung instance Firebase Authentication
  let auth = null;
  // Variabel internal untuk menampung instance Firebase Cloud Storage
  let storage = null;
  // Penanda status boolean apakah inisialisasi Firebase sudah berhasil dilakukan
  let initialized = false;

  // Fungsi untuk menginisialisasi seluruh layanan Firebase SDK
  function initFirebase() {
    // Jika sudah pernah diinisialisasi sebelumnya, langsung kembalikan instance yang tersimpan (Singleton Pattern)
    if (initialized) {
      return { db, auth, storage, ready: Boolean(auth), firestoreReady: Boolean(db) };
    }

    // Memeriksa apakah library script Firebase SDK sudah dimuat di browser
    if (typeof firebase === 'undefined' || !firebase.apps) {
      console.warn('[Firebase] SDK belum dimuat. Pastikan semua script Firebase sudah ditambahkan di halaman.');
      return { db: null, auth: null, storage: null, ready: false, firestoreReady: false };
    }

    try {
      // Inisialisasi Firebase App utama jika belum ada instance yang aktif
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log('[Firebase] App berhasil diinisialisasi.');
      }

      // Inisialisasi layanan Autentikasi (Firebase Auth)
      try {
        auth = firebase.auth();
        console.log('[Firebase] Auth siap.');
      } catch (e) {
        console.error('[Firebase] Gagal inisialisasi Auth:', e);
        auth = null;
      }

      // Inisialisasi layanan Firestore Database
      try {
        db = firebase.firestore();
        console.log('[Firebase] Firestore siap.');
        
        // Mengaktifkan fitur offline persistence (caching lokal di browser agar tetap bisa dibaca saat offline)
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

      // Inisialisasi layanan Cloud Storage untuk unggah file
      try {
        storage = firebase.storage();
        console.log('[Firebase] Storage siap.');
      } catch (e) {
        console.warn('[Firebase] Storage SDK tidak tersedia (mungkin tidak dimuat di halaman ini).');
        storage = null;
      }

      // Tandai bahwa inisialisasi telah sukses
      initialized = true;
      return { db, auth, storage, ready: Boolean(auth), firestoreReady: Boolean(db) };
    } catch (error) {
      console.error('[Firebase] Gagal menginisialisasi Firebase:', error);
      return { db: null, auth: null, storage: null, ready: false, firestoreReady: false };
    }
  }

  // ============================================================================
  // BAGIAN 1: FUNGSI-FUNGSI PENGELOLAAN ULASAN (REVIEWS)
  // ============================================================================

  // Menyimpan ulasan baru yang dikirim oleh pelanggan ke koleksi 'reviews' di Firestore
  async function saveReview(reviewData) {
    const { db, firestoreReady } = initFirebase();
    // Validasi apakah koneksi database siap
    if (!firestoreReady || !db) return { ok: false, error: 'Firestore belum siap.' };

    try {
      // Menambahkan dokumen baru ke koleksi 'reviews' beserta stempel waktu server (serverTimestamp)
      const docRef = await db.collection('reviews').add({
        ...reviewData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp() // Menghindari manipulasi jam lokal perangkat
      });
      // Mengembalikan status sukses beserta ID unik dokumen yang baru dibuat
      return { ok: true, id: docRef.id };
    } catch (error) {
      console.error('Gagal menyimpan ulasan:', error);
      return { ok: false, error: error.message };
    }
  }

  // Mengambil ulasan dari Firestore secara satu kali (one-time get) dengan opsi limit jumlah
  async function loadReviews(limitCount = null) {
    const { db, firestoreReady } = initFirebase();
    if (!firestoreReady || !db) {
      console.error('[Firestore] Tidak bisa loadReviews: Firestore belum siap.');
      return [];
    }

    try {
      // Menyiapkan query ke koleksi 'reviews'
      let query = db.collection('reviews');
      // Batasi jumlah dokumen jika limitCount ditentukan
      if (limitCount) {
        query = query.limit(limitCount);
      }
      // Eksekusi pengambilan data
      const snapshot = await query.get();
      // Mengubah snapshot dokumen Firestore menjadi array objek JavaScript biasa
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      
      // Mengurutkan data secara descending (terbaru ke terlama) berdasarkan createdAt
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

  // Mendengarkan perubahan data ulasan secara realtime menggunakan onSnapshot
  function onSnapshotReviews(callback, limitCount = null) {
    const { db, firestoreReady } = initFirebase();
    if (!firestoreReady || !db) {
      console.error('[Firestore] Tidak bisa onSnapshotReviews: Firestore belum siap.');
      if (callback) callback([]);
      return () => {}; // Kembalikan fungsi unsubscribe kosong
    }

    let query = db.collection('reviews');
    if (limitCount) {
      query = query.limit(limitCount);
    }

    // Memasang realtime listener: setiap ada ulasan baru/berubah di Firestore, callback otomatis dipanggil
    return query.onSnapshot(
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        // Urutkan data berdasarkan waktu terbaru
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

  // Mendengarkan data katalog produk menu secara realtime (digunakan pada dashboard admin)
  function onSnapshotMenu(callback) {
    const { db, firestoreReady } = initFirebase();
    if (!firestoreReady || !db) {
      console.error('[Firestore] Tidak bisa onSnapshotMenu: Firestore belum siap.');
      if (callback) callback([]);
      return () => {};
    }

    // Mendengarkan seluruh dokumen di koleksi 'products'
    return db.collection('products').onSnapshot(
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        // Urutkan produk berdasarkan nama secara alfabetis
        data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        callback(data);
      },
      (error) => {
        console.error('[Firestore] onSnapshotMenu error:', error);
        callback([]);
      }
    );
  }

  // Menghapus ulasan tertentu berdasarkan Document ID (fitur admin)
  async function deleteReview(id) {
    const { db, firestoreReady } = initFirebase();
    if (!firestoreReady || !db) return { ok: false, error: 'Firestore belum siap.' };

    try {
      // Hapus dokumen ulasan dari koleksi 'reviews'
      await db.collection('reviews').doc(id).delete();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  // Menyimpan tanggapan/balasan admin pada suatu ulasan
  async function updateReviewReply(id, reply) {
    const { db, firestoreReady } = initFirebase();
    if (!firestoreReady || !db) return { ok: false, error: 'Firestore belum siap.' };

    try {
      // Perbarui field reply dan updatedAt pada dokumen ulasan
      await db.collection('reviews').doc(id).update({
        reply,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  // ============================================================================
  // BAGIAN 2: FUNGSI-FUNGSI PENGELOLAAN KATALOG MENU PRODUK (CRUD)
  // ============================================================================

  // Mengambil daftar menu dari koleksi 'products' secara one-time get
  async function loadMenu() {
    const { db, firestoreReady } = initFirebase();
    if (!firestoreReady || !db) {
      console.error('[Firestore] Tidak bisa loadMenu: Firestore belum siap.');
      return [];
    }

    try {
      const snapshot = await db.collection('products').get();
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Urutkan produk dari A ke Z
      data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      console.log('[Firestore] Data Menu Berhasil Dimuat:', data.length, 'item');
      return data;
    } catch (error) {
      console.error('[Firestore] Gagal memuat menu — kode:', error.code, '| pesan:', error.message);
      return [];
    }
  }

  // Menyimpan produk baru (Create) atau memperbarui produk yang sudah ada (Update)
  async function saveMenu(productData, id = null) {
    const { db, firestoreReady } = initFirebase();
    if (!firestoreReady || !db) return { ok: false, error: 'Firestore belum siap.' };

    try {
      // Jika parameter id ada, lakukan pembaruan (UPDATE) pada dokumen tersebut
      if (id) {
        await db.collection('products').doc(id).update({
          ...productData,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return { ok: true, id };
      } else {
        // Jika tidak ada ID, tambahkan dokumen baru (CREATE) dengan auto-generated ID
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

  // Menghapus produk dari database berdasarkan ID produk (DELETE)
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

  // Memperbarui status stok produk (Tersedia / Habis)
  async function updateProductStock(id, isSoldOut) {
    const { db, firestoreReady } = initFirebase();
    if (!firestoreReady || !db) return { ok: false, error: 'Firestore belum siap.' };

    try {
      await db.collection('products').doc(id).update({
        isSoldOut: Boolean(isSoldOut),                               // Nilai true jika habis, false jika ada
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return { ok: true };
    } catch (error) {
      console.error('Gagal memperbarui status stok:', error);
      return { ok: false, error: error.message };
    }
  }

  // Mengunggah file foto produk ke Firebase Storage dan mengembalikan URL publiknya
  async function uploadImage(file) {
    const { storage } = initFirebase();
    if (!storage) return { ok: false, error: 'Firebase Storage SDK tidak ditemukan.' };

    try {
      const storageRef = storage.ref();
      // Menamai file unik dengan timestamp agar tidak saling menimpa
      const fileRef = storageRef.child(`products/${Date.now()}_${file.name}`);
      // Proses upload data biner file
      await fileRef.put(file);
      // Mengambil tautan unduh (download URL) HTTPS publik
      const url = await fileRef.getDownloadURL();
      return { ok: true, url };
    } catch (error) {
      console.error('Gagal mengunggah gambar produk:', error);
      return { ok: false, error: error.message };
    }
  }

  // Mengunggah foto lampiran ulasan pelanggan ke folder review_photos di Cloud Storage
  async function uploadReviewPhoto(file) {
    const { storage } = initFirebase();
    if (!storage) return { ok: false, error: 'Firebase Storage SDK tidak ditemukan.' };

    try {
      const storageRef = storage.ref();
      const fileRef = storageRef.child(`review_photos/${Date.now()}_${file.name}`);
      await fileRef.put(file);
      const url = await fileRef.getDownloadURL();
      return { ok: true, url };
    } catch (error) {
      console.error('Gagal mengunggah foto ulasan:', error);
      return { ok: false, error: error.message };
    }
  }

  // ============================================================================
  // BAGIAN 3: FUNGSI STATUS TOKO & AUDIT LOG PERUBAHAN OLEH ADMIN
  // ============================================================================

  // Mendengarkan perubahan konfigurasi status toko di settings/store_status secara realtime
  function onSnapshotStoreStatus(callback) {
    const { db, firestoreReady } = initFirebase();
    if (!firestoreReady || !db) {
      console.warn('[Firestore] Tidak bisa onSnapshotStoreStatus: Firestore belum siap.');
      if (callback) callback({});
      return () => {};
    }

    // Mengambil referensi dokumen spesifik 'settings/store_status'
    const docRef = db.collection('settings').doc('store_status');
    return docRef.onSnapshot(
      (docSnap) => {
        // Jika dokumen konfigurasi ditemukan, kirim datanya ke callback
        if (docSnap.exists) {
          callback(docSnap.data());
        } else {
          // Data bawaan awal jika dokumen di Firestore belum pernah dibuat
          const defaultData = {
            isClosed: false,
            closedReason: '',
            closedReasonType: 'none',
            operatingHoursStart: 16,
            operatingHoursEnd: 18,
            timezone: 'Asia/Jakarta',
            closedDays: ['minggu']
          };
          callback(defaultData);
        }
      },
      (error) => {
        console.error('[Firestore] onSnapshotStoreStatus error:', error);
        callback({});
      }
    );
  }

  // Mengambil status toko satu kali (one-time get)
  async function getStoreStatus() {
    const { db, firestoreReady } = initFirebase();
    if (!firestoreReady || !db) return null;

    try {
      const docSnap = await db.collection('settings').doc('store_status').get();
      if (docSnap.exists) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      console.error('[Firestore] Gagal getStoreStatus:', error);
      return null;
    }
  }

  // Memperbarui pengaturan jam buka/tutup toko oleh admin di Firestore
  async function updateStoreStatus(updateData, adminEmail = 'admin@pempekwahid.com') {
    const { db, firestoreReady } = initFirebase();
    if (!firestoreReady || !db) return { ok: false, error: 'Firestore belum siap.' };

    try {
      const docRef = db.collection('settings').doc('store_status');
      // Melengkapi payload data dengan audit info (siapa yang mengubah & kapan diubah)
      const payload = {
        ...updateData,
        timezone: 'Asia/Jakarta',
        lastUpdatedBy: adminEmail,
        lastUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      // Simpan dengan merge: true agar field lain tidak terhapus
      await docRef.set(payload, { merge: true });
      return { ok: true };
    } catch (error) {
      console.error('[Firestore] Gagal updateStoreStatus:', error);
      // Tangani pesan jika rules Firebase menolak akses (Security Rules)
      const errMsg = error.code === 'permission-denied'
        ? 'Akses ditolak (Missing or insufficient permissions). Pastikan Anda telah login sebagai Admin dan memperbarui Firestore Rules di Firebase Console.'
        : error.message;
      return { ok: false, error: errMsg };
    }
  }

  // Menyimpan riwayat perubahan status operasional ke sub-koleksi admin/status_logs/logs (Audit Trail)
  async function logStatusChange(action, reason, previousState, newState, adminEmail = 'admin@pempekwahid.com') {
    const { db, firestoreReady } = initFirebase();
    if (!firestoreReady || !db) return { ok: false, error: 'Firestore belum siap.' };

    try {
      // Simpan log aksi perubahan status toko
      await db.collection('admin').doc('status_logs').collection('logs').add({
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        adminEmail: adminEmail,
        action: action,
        reason: reason || '',
        previousState: previousState || {},
        newState: newState || {}
      });
      return { ok: true };
    } catch (error) {
      console.error('[Firestore] Gagal logStatusChange:', error);
      const errMsg = error.code === 'permission-denied'
        ? 'Akses ditolak (Missing or insufficient permissions). Perbarui Firestore Rules di Firebase Console.'
        : error.message;
      return { ok: false, error: errMsg };
    }
  }

  // Mengambil riwayat log perubahan status operasional terakhir untuk ditampilkan di panel admin
  async function loadStatusLogs(limitCount = 10) {
    const { db, firestoreReady } = initFirebase();
    if (!firestoreReady || !db) return [];

    try {
      const snapshot = await db.collection('admin')
        .doc('status_logs')
        .collection('logs')
        .orderBy('timestamp', 'desc') // Urutkan dari log terbaru
        .limit(limitCount)            // Batasi jumlah riwayat
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('[Firestore] Gagal loadStatusLogs:', error);
      return [];
    }
  }

  // ============================================================================
  // BAGIAN 4: AUTENTIKASI ADMIN (Firebase Authentication)
  // ============================================================================

  // Pemetaan (Mapping) kode error resmi Firebase Auth ke pesan Bahasa Indonesia yang ramah pengguna
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

  // Fungsi pembantu untuk menerjemahkan kode error Firebase Auth
  function terjemahkanErrorAuth(error) {
    return pesanErrorAuth[error.code] || error.message;
  }

  // Memvalidasi email dan password login admin ke layanan Firebase Auth
  async function signIn(email, password) {
    const { auth, ready } = initFirebase();
    if (!ready || !auth) {
      console.error('[Auth] Firebase Auth belum siap. Cek apakah firebase-auth-compat.js sudah dimuat.');
      return { ok: false, error: 'Firebase Auth belum siap.' };
    }

    try {
      console.log('[Auth] Mencoba login dengan:', email);
      // Melakukan autentikasi menggunakan email dan password
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      console.log('[Auth] Login berhasil:', userCredential.user.email);
      return { ok: true, user: userCredential.user };
    } catch (error) {
      console.error('[Auth] Login gagal — kode:', error.code, '| pesan:', error.message);
      return { ok: false, error: terjemahkanErrorAuth(error) };
    }
  }

  // Keluar dari sesi login admin (Logout)
  function signOut() {
    const { auth, ready } = initFirebase();
    if (!ready || !auth) return { ok: false, error: 'Firebase Auth belum siap.' };
    return auth.signOut();
  }

  // Mendeteksi perubahan sesi login (apakah sedang login atau sudah logout)
  function onAuthStateChanged(callback) {
    const { auth, ready } = initFirebase();
    if (!ready || !auth) {
      if (callback) callback(null);
      return () => {};
    }
    // Pasang listener status autentikasi
    return auth.onAuthStateChanged(callback);
  }

  // Mendengarkan perubahan ID token autentikasi (misal jika token direfresh atau dicabut)
  function onIdTokenChanged(callback) {
    const { auth, ready } = initFirebase();
    if (!ready || !auth) {
      if (callback) callback(null);
      return () => {};
    }
    return auth.onIdTokenChanged(callback);
  }

  // ============================================================================
  // EKSPOR MODUL KE SCOPE GLOBAL (window.firebaseManager)
  // ============================================================================
  // Membungkus seluruh fungsi di atas ke dalam satu objek namespace window.firebaseManager
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
    updateProductStock,
    uploadImage,
    uploadReviewPhoto,
    onSnapshotStoreStatus,
    getStoreStatus,
    updateStoreStatus,
    logStatusChange,
    loadStatusLogs,
    signIn,
    signOut,
    onAuthStateChanged,
    onIdTokenChanged
  };

  // Jalankan inisialisasi awal saat file ini pertama kali dimuat
  initFirebase();
})();