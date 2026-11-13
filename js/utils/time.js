/**
 * ==============================================================================
 * MODUL UTILITAS WAKTU WIB (Waktu Indonesia Barat - Asia/Jakarta)
 * File: js/utils/time.js
 * Deskripsi: Mengambil dan memformat waktu saat ini berdasarkan zona waktu WIB.
 * Ini memastikan jam operasional toko konsisten di semua perangkat pengunjung.
 * ==============================================================================
 */

// Mendefinisikan fungsi utama untuk mendapatkan data waktu terkini di zona WIB
function getCurrentWIBTime() {
  // Menentukan identifier zona waktu standar untuk Waktu Indonesia Barat (WIB)
  const timezone = 'Asia/Jakarta';
  
  // Mengambil tanggal dan waktu saat ini dari sistem pengguna
  const now = new Date();

  // Membuat objek pemformat tanggal/waktu menggunakan API bawaan browser (Intl.DateTimeFormat)
  // en-US digunakan untuk ekstraksi angka jam dan menit dalam format 24 jam (hour12: false)
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,     // Mengunci zona waktu ke Asia/Jakarta
    hour: 'numeric',        // Mengambil digit jam (misal: "16")
    minute: 'numeric',      // Mengambil digit menit (misal: "30")
    hour12: false           // Format 24 jam (00-23), bukan 12 jam (AM/PM)
  });

  // Memecah hasil format menjadi array bagian objek (parts) berisi type dan value
  const parts = timeFormatter.formatToParts(now);
  
  // Menyiapkan variabel penampung jam dengan nilai awal 0 (tipe angka)
  let hour = 0;
  
  // Menyiapkan variabel penampung menit dengan nilai awal 0 (tipe angka)
  let minute = 0;

  // Melakukan iterasi (perulangan) pada setiap elemen bagian waktu yang dihasilkan formatToParts
  for (const part of parts) {
    // Mengecek jika bagian saat ini bertipe 'hour' (jam)
    if (part.type === 'hour') {
      // Mengubah string jam menjadi bilangan bulat berbasis 10 (desimal)
      hour = parseInt(part.value, 10);
      // Koreksi khusus: beberapa implementasi browser menghasilkan angka 24 untuk tengah malam (00:00)
      if (hour === 24) hour = 0;
    }
    // Mengecek jika bagian saat ini bertipe 'minute' (menit)
    if (part.type === 'minute') {
      // Mengubah string menit menjadi bilangan bulat berbasis 10 (desimal)
      minute = parseInt(part.value, 10);
    }
  }

  // Membuat pemformat nama hari dalam Bahasa Indonesia (id-ID) sesuai zona Asia/Jakarta
  const dayFormatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: timezone,     // Zona waktu WIB
    weekday: 'long'         // Mengambil nama hari lengkap: "Senin", "Selasa", "Minggu", dst.
  });

  // Mengambil nama hari dalam Bahasa Indonesia (misal: "Senin")
  const dayOfWeek = dayFormatter.format(now);
  
  // Mengubah nama hari menjadi huruf kecil semua (misal: "senin") agar mudah dicocokkan dengan aturan
  const dayOfWeekLower = dayOfWeek.toLowerCase();

  // Membuat pemformat tanggal lengkap dan waktu lokal Indonesia untuk keperluan display / logging
  const fullDateFormatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: timezone,     // Zona waktu WIB
    dateStyle: 'full',      // Format tanggal lengkap (misal: "Kamis, 13 November 2025")
    timeStyle: 'medium'     // Format waktu medium (misal: "16:30:45")
  });

  // Mengembalikan objek berisi seluruh data waktu yang sudah terstandarisasi zona WIB
  return {
    hour,                                    // Jam saat ini dalam angka (0-23)
    minute,                                  // Menit saat ini dalam angka (0-59)
    dayOfWeek,                               // Nama hari format asli (contoh: "Senin")
    dayOfWeekLower,                          // Nama hari huruf kecil (contoh: "senin")
    fullDate: fullDateFormatter.format(now)  // String tanggal & waktu lengkap dalam Bahasa Indonesia
  };
}

// Mengecek apakah script sedang berjalan di lingkungan browser (window tersedia)
if (typeof window !== 'undefined') {
  // Mengekspos fungsi getCurrentWIBTime ke objek global window agar dapat dipanggil dari file JS lain
  window.getCurrentWIBTime = getCurrentWIBTime;
}
