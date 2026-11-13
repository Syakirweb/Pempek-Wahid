/**
 * ==============================================================================
 * MANAJER STATUS OPERASIONAL TOKO (StoreStatusManager)
 * File: js/utils/storeStatus.js
 * Deskripsi: Mengelola seluruh logika pembukaan outlet, pre-order, jam operasional,
 * hari libur, serta pembaruan elemen antarmuka (UI Banner & tombol Checkout) secara otomatis.
 * ==============================================================================
 */

// Mendefinisikan class StoreStatusManager untuk enkapsulasi logika status toko
class StoreStatusManager {
  // Konstruktor dijalankan saat membuat instance baru: new StoreStatusManager()
  constructor(config = {}) {
    // Menetapkan default zona waktu WIB (Asia/Jakarta)
    this.timezone = 'Asia/Jakarta';
    
    // Menetapkan interval pembaruan status setiap 60.000 ms (1 menit)
    this.updateIntervalMs = 60000;
    
    // Variabel penampung timer interval (awalnya null sebelum startMonitoring dipanggil)
    this.checkInterval = null;
  }

  // Metode untuk mendapatkan waktu WIB saat ini (dengan fallback jika time.js belum siap)
  getCurrentWIBTime() {
    // Jika fungsi pembantu window.getCurrentWIBTime sudah tersedia dari file time.js, gunakan langsung
    if (typeof window.getCurrentWIBTime === 'function') {
      return window.getCurrentWIBTime();
    }
    
    // Fallback mandiri jika time.js tidak dimuat: buat objek Date baru
    const now = new Date();
    
    // Format tanggal dan jam ke zona Asia/Jakarta
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: this.timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    }).formatToParts(now);

    // Inisialisasi variabel jam dan menit
    let hour = 0;
    let minute = 0;
    
    // Ekstraksi nilai jam dan menit dari formatToParts
    for (const p of parts) {
      if (p.type === 'hour') {
        hour = parseInt(p.value, 10);
        // Konversi angka 24 tengah malam menjadi 0
        if (hour === 24) hour = 0;
      }
      if (p.type === 'minute') minute = parseInt(p.value, 10);
    }

    // Mendapatkan nama hari dalam Bahasa Indonesia (Senin - Minggu)
    const dayOfWeek = new Intl.DateTimeFormat('id-ID', {
      timeZone: this.timezone,
      weekday: 'long'
    }).format(now);

    // Mengembalikan objek waktu yang terstruktur
    return {
      hour,
      minute,
      dayOfWeek,
      dayOfWeekLower: dayOfWeek.toLowerCase(),
      fullDate: new Intl.DateTimeFormat('id-ID', {
        timeZone: this.timezone,
        dateStyle: 'full',
        timeStyle: 'medium'
      }).format(now)
    };
  }

  // Menentukan status operasional outlet berdasarkan waktu sekarang dan data dari Firestore
  determineStatus(firestoreData = {}) {
    // Ambil data waktu WIB terkini
    const current = this.getCurrentWIBTime();
    
    // Destrukturisasi data konfigurasi dari Firestore dengan nilai bawaan (default value)
    const {
      isClosed = false,                      // Status tutup paksa manual oleh admin
      closedReason = '',                     // Alasan admin menutup toko (contoh: "Stok Habis")
      closedReasonType = 'none',             // Kategori alasan: 'sold_out', 'event', 'holiday', dll.
      operatingHoursStart = 16,              // Jam mulai operasional (default: jam 16.00 / 4 sore)
      operatingHoursEnd = 18,                // Jam selesai operasional (default: jam 18.00 / 6 sore)
      closedDays = ['minggu', 'jumat']       // Daftar hari libur rutin mingguan
    } = firestoreData;

    // Fungsi kecil pembantu untuk memformat angka satu digit menjadi 2 digit (misal: 4 -> "04")
    const pad = (n) => String(n).padStart(2, '0');

    // =========================================================================
    // PRIORITAS 1: Penutupan Manual oleh Admin (Force Closed)
    // Jika admin mengaktifkan toggle tutup paksa, status ini mengalahkan aturan lain
    // =========================================================================
    if (isClosed === true) {
      return {
        statusCode: 'FORCE_CLOSED',                                                         // Kode status sistem
        isOpen: false,                                                                     // Apakah toko buka fisik
        bannerColor: 'danger',                                                             // Warna banner Bootstrap (merah)
        bannerText: `🔴 Outlet Tutup Hari Ini${closedReason ? ` — ${closedReason}` : ''}`,   // Teks banner
        canCheckout: false,                                                                // Larang tombol checkout WhatsApp
        warningText: null,                                                                 // Tidak ada teks peringatan tambahan
        reasonType: closedReasonType || 'none'                                             // Jenis alasan penutupan
      };
    }

    // =========================================================================
    // PRIORITAS 2: Hari Libur Rutin Outlet (Auto Closed on Day Off)
    // Cek apakah hari ini termasuk dalam array hari tutup (misal: Jumat atau Minggu)
    // =========================================================================
    if (Array.isArray(closedDays) && closedDays.includes(current.dayOfWeekLower)) {
      return {
        statusCode: 'AUTO_CLOSED',                                                          // Kode status libur rutin
        isOpen: false,                                                                     // Toko tutup
        bannerColor: 'danger',                                                             // Warna banner merah
        bannerText: `🔴 Outlet Tutup ${current.dayOfWeek}. Buka Kembali Besok Sore.`,      // Pesan hari libur
        canCheckout: false,                                                                // Tombol checkout dinonaktifkan
        warningText: null,                                                                 // Tidak ada peringatan ekstra
        reasonType: 'holiday'                                                              // Kategori hari libur
      };
    }

    // =========================================================================
    // PRIORITAS 3: Berdasarkan Jam Operasional (Operating Hours)
    // =========================================================================
    const hour = current.hour;

    // FASE A: Pagi/Siang hari sebelum toko buka fisik (00:00 s/d sebelum jam buka)
    // Pengunjung BOLEH Pre-order (canCheckout: true) untuk diproses saat toko buka
    if (hour >= 0 && hour < operatingHoursStart) {
      return {
        statusCode: 'PRE_ORDER',                                                                              // Kode Pre-order
        isOpen: false,                                                                                        // Belum buka fisik
        bannerColor: 'info',                                                                                  // Warna banner biru muda
        bannerText: `🕒 Outlet Buka Sore Ini (${pad(operatingHoursStart)}:00 - ${pad(operatingHoursEnd)}:00 WIB). Pre-order sudah bisa!`,
        canCheckout: true,                                                                                    // Diizinkan checkout pre-order
        warningText: `⏰ Pesanan akan diproses sore mulai ${pad(operatingHoursStart)}:00 WIB`,                // Notifikasi jadwal proses
        reasonType: 'none'
      };
    }

    // FASE B: Jam Operasional Aktif (contoh: 16:00 sampai sebelum 18:00 WIB)
    // Outlet buka secara langsung dan pesanan langsung dikerjakan
    if (hour >= operatingHoursStart && hour < operatingHoursEnd) {
      return {
        statusCode: 'OPEN_NOW',                                                                               // Kode buka sekarang
        isOpen: true,                                                                                         // Toko buka penuh
        bannerColor: 'success',                                                                               // Warna banner hijau
        bannerText: `🟢 Outlet Buka Sekarang! (${pad(operatingHoursStart)}:00 - ${pad(operatingHoursEnd)}:00 WIB)`, // Pesan buka
        canCheckout: true,                                                                                    // Diizinkan checkout
        warningText: null,                                                                                    // Tidak ada peringatan
        reasonType: 'none'
      };
    }

    // FASE C: Jam Operasi Telah Selesai (18:00 ke atas sampai 23:59 WIB)
    // Toko sudah tutup untuk hari ini dan pemesanan dihentikan
    return {
      statusCode: 'CLOSED_EVENING',                                                                           // Kode tutup malam
      isOpen: false,                                                                                          // Toko tutup
      bannerColor: 'danger',                                                                                  // Warna banner merah
      bannerText: `🔴 Jam Operasi Selesai (Buka ${pad(operatingHoursStart)}:00 - ${pad(operatingHoursEnd)}:00 WIB). Buka Kembali Besok Sore.`,
      canCheckout: false,                                                                                     // Checkout dimatikan
      warningText: null,
      reasonType: 'closed_for_day'
    };
  }

  // Memperbarui elemen antarmuka (DOM UI) di halaman berdasarkan objek status yang dihasilkan
  updateUI(statusObj) {
    // Mengambil elemen banner status dan teksnya di bagian atas halaman
    const banner = document.getElementById('store-status-banner');
    const bannerMsg = document.getElementById('banner-message');
    const bannerWarning = document.getElementById('banner-warning');

    // Jika banner status ditemukan di halaman web
    if (banner && bannerMsg) {
      // Mengubah kelas CSS banner (alert-success hijau, alert-info biru, atau alert-danger merah)
      banner.className = `store-banner alert alert-${statusObj.bannerColor}`;
      // Mengisi teks utama banner
      bannerMsg.textContent = statusObj.bannerText;

      // Jika ada teks peringatan tambahan (misalnya peringatan pre-order)
      if (statusObj.warningText) {
        if (bannerWarning) {
          bannerWarning.textContent = statusObj.warningText;
          bannerWarning.classList.remove('d-none'); // Tampilkan teks peringatan
        }
      } else {
        if (bannerWarning) {
          bannerWarning.classList.add('d-none');    // Sembunyikan jika tidak ada peringatan
        }
      }
    }

    // Mengambil tombol checkout WhatsApp pelanggan
    const checkoutBtn = document.getElementById('checkoutWhatsAppBtn') || document.getElementById('btn-checkout');
    // Mengambil tombol alternatif hubungi admin via WhatsApp jika toko tutup
    const waAdminBtn = document.getElementById('btn-whatsapp-admin');

    // Memperbarui status aktif/nonaktif tombol checkout
    if (checkoutBtn) {
      if (statusObj.canCheckout) {
        checkoutBtn.disabled = false;                    // Mengaktifkan tombol jika boleh memesan
        checkoutBtn.classList.remove('opacity-50');      // Mengembalikan tampilan terang
        if (waAdminBtn) waAdminBtn.classList.add('d-none'); // Sembunyikan tombol kontak darurat
      } else {
        checkoutBtn.disabled = true;                     // Menonaktifkan tombol jika toko tutup
        checkoutBtn.classList.add('opacity-50');         // Memberikan efek redup (disabled visual)
        if (waAdminBtn) waAdminBtn.classList.remove('d-none'); // Munculkan tombol kontak darurat
      }
    }

    // Mengambil box peringatan di dalam offcanvas keranjang
    const alertBox = document.getElementById('checkout-alert');
    const alertText = document.getElementById('checkout-alert-text');
    // Jika ada teks peringatan dan elemen tersedia, tampilkan box peringatan
    if (alertBox && statusObj.warningText) {
      if (alertText) alertText.textContent = statusObj.warningText;
      alertBox.classList.remove('d-none');
    } else if (alertBox) {
      alertBox.classList.add('d-none');
    }

    // Jika ada fungsi sinkronisasi tombol produk di file app.js, panggil fungsi tersebut
    if (typeof window.updateProductButtonsStoreStatus === 'function') {
      window.updateProductButtonsStoreStatus(statusObj);
    }
  }

  // Menjalankan pemantauan waktu secara terus-menerus setiap 1 menit (heartbeat)
  startMonitoring() {
    // Hentikan interval lama jika sebelumnya sudah aktif agar tidak terjadi duplikasi interval
    if (this.checkInterval) clearInterval(this.checkInterval);
    
    // Buat interval baru yang berulang setiap this.updateIntervalMs (60 detik)
    this.checkInterval = setInterval(() => {
      // Ambil data status toko dari cache Firestore yang tersimpan di window
      const firestoreData = window.currentStoreStatus || {};
      // Hitung ulang status operasional berdasarkan waktu menit terkini
      const status = this.determineStatus(firestoreData);
      // Perbarui antarmuka pengguna
      this.updateUI(status);
    }, this.updateIntervalMs);
  }

  // Menghentikan timer pemantauan (misalnya saat berpindah halaman)
  stopMonitoring() {
    if (this.checkInterval) clearInterval(this.checkInterval);
  }
}

// Mengekspos class StoreStatusManager ke scope global browser agar bisa dipakai di mana saja
if (typeof window !== 'undefined') {
  window.StoreStatusManager = StoreStatusManager;
}
