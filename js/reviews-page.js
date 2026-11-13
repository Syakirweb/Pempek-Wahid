/**
 * ==============================================================================
 * MODUL HALAMAN ULASAN LENGKAP (Reviews Page Manager)
 * File: js/reviews-page.js
 * Deskripsi: Menangani interaksi halaman ulasan publik, pemilih bintang interaktif,
 * statistik rating, filter pencarian & kategori, sorting, serta pengiriman ulasan ke Firestore.
 * ==============================================================================
 */

// Variabel global untuk menyimpan rating bintang yang sedang dipilih user (default: 5)
let selectedRating = 5;

// Flag boolean untuk mencegah double-submit saat form ulasan sedang dikirim
let isSubmitting = false;

// Cache array lokal untuk menampung seluruh daftar ulasan yang diambil dari Firestore
let reviewListCache = [];

// Fungsi sanitasi teks untuk mencegah serangan XSS (Cross-Site Scripting) pada input pengguna
function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')   // Mengubah karakter & menjadi entitas HTML
    .replace(/</g, '&lt;')    // Mengubah tanda < menjadi entitas HTML agar tag HTML tidak dieksekusi
    .replace(/>/g, '&gt;')    // Mengubah tanda > menjadi entitas HTML
    .replace(/"/g, '&quot;')  // Mengubah tanda kutip ganda menjadi entitas HTML
    .replace(/'/g, '&#39;');  // Mengubah tanda petik tunggal menjadi entitas HTML
}

// Inisialisasi komponen pemilih rating bintang interaktif
function initStarRatingPicker() {
  // Mengambil elemen kontainer bintang
  const starContainer = document.getElementById('starRatingPicker');
  // Jika elemen tidak ditemukan pada halaman, hentikan eksekusi
  if (!starContainer) return;

  // Mengambil seluruh elemen ikon bintang di dalam kontainer
  const stars = starContainer.querySelectorAll('.star-icon');
  // Mengambil input tersembunyi (hidden input) yang menyimpan nilai rating numerik
  const ratingInput = document.getElementById('reviewerRating');

  // Fungsi internal untuk memperbarui visual bintang dan label teks sesuai nilai angka
  function updateStars(rating) {
    // Simpan rating terpilih ke variabel global
    selectedRating = rating;
    // Set nilai pada input form jika ada
    if (ratingInput) ratingInput.value = rating;

    // Iterasi setiap bintang untuk mengubah ikon penuh (bi-star-fill) atau kosong (bi-star)
    stars.forEach((star) => {
      // Ambil nilai bintang dari atribut data-value (1 sampai 5)
      const starVal = Number(star.dataset.value);
      // Jika nomor bintang kurang dari atau sama dengan rating yang dipilih, nyalakan bintang
      if (starVal <= rating) {
        star.classList.remove('bi-star', 'text-muted');
        star.classList.add('bi-star-fill', 'text-warning');
        star.setAttribute('aria-checked', 'true'); // Aksesibilitas screen reader
      } else {
        // Matikan bintang (kembalikan ke bintang kosong abu-abu)
        star.classList.remove('bi-star-fill', 'text-warning');
        star.classList.add('bi-star', 'text-muted');
        star.setAttribute('aria-checked', 'false');
      }
    });

    // Menampilkan label deskriptif berdasarkan jumlah bintang terpilih
    const ratingLabel = document.getElementById('ratingTextLabel');
    if (ratingLabel) {
      // Kamus teks label untuk setiap level rating
      const labels = {
        5: '⭐⭐⭐⭐⭐ (5/5) Sempurna & Lezat!',
        4: '⭐⭐⭐⭐ (4/5) Enak Banget',
        3: '⭐⭐⭐ (3/5) Cukup Baik',
        2: '⭐⭐ (2/5) Perlu Ditingkatkan',
        1: '⭐ (1/5) Kurang Puas'
      };
      // Terapkan teks label yang sesuai
      ratingLabel.textContent = labels[rating] || `${rating}/5`;
    }
  }

  // Pasang event listener pada setiap ikon bintang
  stars.forEach((star) => {
    // Event Klik: Menetapkan rating saat bintang diklik
    star.addEventListener('click', () => {
      const val = Number(star.dataset.value);
      updateStars(val);
    });

    // Event Keyboard (Aksesibilitas): Mengizinkan pemilihan menggunakan tombol Enter atau Spasi
    star.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const val = Number(star.dataset.value);
        updateStars(val);
      }
    });

    // Event Hover (Mouse Masuk): Memberikan efek preview bintang saat kursor diarahkan ke bintang
    star.addEventListener('mouseenter', () => {
      const val = Number(star.dataset.value);
      stars.forEach((s) => {
        const sVal = Number(s.dataset.value);
        if (sVal <= val) {
          s.classList.remove('bi-star');
          s.classList.add('bi-star-fill', 'text-warning');
        } else {
          s.classList.remove('bi-star-fill', 'text-warning');
          s.classList.add('bi-star');
        }
      });
    });
  });

  // Event Mouse Keluar dari Kontainer: Kembalikan tampilan bintang ke rating yang benar-benar sudah diklik
  starContainer.addEventListener('mouseleave', () => {
    updateStars(selectedRating);
  });

  // Nilai awal saat halaman pertama kali dibuka adalah 5 bintang
  updateStars(5);
}

// Menghitung dan memperbarui ringkasan statistik ulasan (Total ulasan, rata-rata rating, dan ulasan terbalas)
function updateReviewStats(ulasan) {
  // Mengambil elemen-elemen tampilan statistik di halaman
  const totalEl = document.getElementById('statTotalReviews');
  const avgEl = document.getElementById('statAvgRating');
  const starsEl = document.getElementById('statAvgStars');
  const repliedEl = document.getElementById('statRepliedCount');

  // Menampilkan total jumlah ulasan yang ada
  if (totalEl) totalEl.textContent = ulasan.length;

  // Jika ada ulasan yang tersimpan
  if (ulasan.length > 0) {
    // Menghitung jumlah akumulasi seluruh rating dengan metode reduce
    const sum = ulasan.reduce((acc, item) => acc + (Number(item.rating) || 5), 0);
    // Menghitung nilai rata-rata dibulatkan menjadi 1 angka di belakang koma
    const avg = (sum / ulasan.length).toFixed(1);
    // Tampilkan nilai rata-rata
    if (avgEl) avgEl.textContent = avg;
    // Tampilkan ikon bintang visual sesuai pembulatan nilai rata-rata
    if (starsEl) {
      const numStars = Math.round(Number(avg));
      starsEl.innerHTML = '⭐'.repeat(numStars);
    }
  } else {
    // Jika belum ada ulasan sama sekali, tampilkan nilai default 0.0
    if (avgEl) avgEl.textContent = '0.0';
    if (starsEl) starsEl.innerHTML = '⭐⭐⭐⭐⭐';
  }

  // Menghitung berapa banyak ulasan yang sudah mendapatkan balasan dari admin
  if (repliedEl) {
    const count = ulasan.filter((item) => item.reply).length;
    repliedEl.textContent = count;
  }
}

// Me-render kartu-kartu ulasan ke dalam kontainer HTML
function renderReviews(ulasan) {
  // Mengambil kontainer pembungkus ulasan
  const container = document.getElementById('allReviewsContainer');
  if (!container) return;

  // Jika tidak ada ulasan yang cocok dengan pencarian / filter
  if (!ulasan || ulasan.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="card border-0 rounded-4 p-5 shadow-sm">
          <i class="bi bi-chat-left-quote fs-1 text-muted mb-3 d-block" aria-hidden="true"></i>
          <h3 class="h5 fw-bold">Belum Ada Ulasan yang Cocok</h3>
          <p class="text-muted small">Coba ubah kata kunci pencarian atau filter yang Anda pilih.</p>
        </div>
      </div>
    `;
    return;
  }

  // Melakukan pemetaan (map) data ulasan menjadi elemen HTML card
  container.innerHTML = ulasan.map((item) => {
    // Memformat tanggal ulasan ke format lokal Indonesia jika properti timestamp Firestore tersedia
    const formattedDate = item.createdAt?.toDate
      ? new Date(item.createdAt.toDate()).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : 'Baru saja';

    // Mengembalikan template string HTML untuk satu kartu ulasan
    return `
      <div class="col-12 col-md-6 mb-3">
        <div class="card border-0 rounded-4 h-100 review-card shadow-sm">
          <div class="card-body p-4 d-flex flex-column">
            <!-- Header Kartu: Inisial Avatar, Nama Pengulas & Badge Rating -->
            <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
              <div class="d-flex align-items-center gap-2">
                <div class="avatar-circle bg-danger-subtle text-danger fw-bold rounded-circle d-flex align-items-center justify-content-center" style="width:40px; height:40px;">
                  ${(item.name || 'P').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 class="h6 fw-bold mb-0">${escapeHtml(item.name || 'Pelanggan')}</h3>
                  <span class="text-muted font-xs">${formattedDate}</span>
                </div>
              </div>
              <span class="badge bg-warning text-dark rounded-pill px-3 py-1 fw-bold">
                ⭐ ${item.rating || 5}/5
              </span>
            </div>

            <!-- Visualisasi Bintang Bintang Hitam/Kuning -->
            <div class="text-warning mb-2 small" aria-label="${item.rating || 5} dari 5 bintang">
              ${'★'.repeat(Number(item.rating || 5))}${'☆'.repeat(5 - Number(item.rating || 5))}
            </div>

            <!-- Teks Isi Ulasan/Komentar Pengguna -->
            <p class="text-muted mb-2 flex-grow-1">${escapeHtml(item.comment || '')}</p>

            <!-- Foto Lampiran Ulasan (Jika Ada Foto yang Diunggah) -->
            ${
              item.photoUrl
                ? `<div class="mb-3">
                    <img src="${escapeHtml(item.photoUrl)}" alt="Foto ulasan dari ${escapeHtml(item.name || 'Pelanggan')}" class="review-photo-thumb" width="300" height="180" loading="lazy">
                   </div>`
                : ''
            }

            <!-- Kotak Tanggapan/Balasan Resmi dari Pempek Wahid -->
            ${
              item.reply
                ? `<div class="border rounded-3 p-3 bg-light-custom mt-auto">
                    <div class="d-flex align-items-center gap-1 fw-bold small text-danger mb-1">
                      <i class="bi bi-reply-fill" aria-hidden="true"></i> Balasan Pempek Wahid
                    </div>
                    <p class="mb-0 small text-muted">${escapeHtml(item.reply)}</p>
                  </div>`
                : ''
            }
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Menerapkan filter pencarian teks, rating bintang, status balasan, dan pengurutan (sorting)
function applyPublicFilters() {
  // Mengambil input teks pencarian dari kolom input
  const keyword = (document.getElementById('searchReviewInput')?.value || '').toLowerCase().trim();
  // Mengambil opsi filter rating yang dipilih user (misal: 'all', '5', '4', dst.)
  const ratingFilter = document.getElementById('filterRatingSelect')?.value || 'all';
  // Mengambil opsi filter balasan ('all', 'replied', 'unreplied')
  const replyFilter = document.getElementById('filterReplySelect')?.value || 'all';
  // Mengambil opsi urutan tampilan ('newest', 'oldest', 'rating_high', 'rating_low')
  const sortOption = document.getElementById('sortReviewSelect')?.value || 'newest';

  // Menyaring data dari cache array berdasarkan seluruh kriteria aktif
  let filtered = reviewListCache.filter((item) => {
    // Mengecek kecocokan kata kunci pada nama pengulas atau isi komentar
    const matchesSearch = (item.name || '').toLowerCase().includes(keyword) || (item.comment || '').toLowerCase().includes(keyword);
    // Mengecek kecocokan nilai rating
    const matchesRating = ratingFilter === 'all' || String(item.rating || 5) === String(ratingFilter);
    // Mengecek kecocokan status balasan
    const matchesReply = replyFilter === 'all'
      || (replyFilter === 'replied' && Boolean(item.reply))
      || (replyFilter === 'unreplied' && !item.reply);

    // Data lolos filter jika memenuhi ketiga kriteria sekaligus
    return matchesSearch && matchesRating && matchesReply;
  });

  // Melakukan pengurutan (sorting) data hasil filter
  filtered.sort((a, b) => {
    // Ekstraksi waktu pembuatan ulasan dalam milidetik
    const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
    const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
    // Ekstraksi nilai rating dalam angka
    const rateA = Number(a.rating) || 5;
    const rateB = Number(b.rating) || 5;

    // Logika sorting sesuai pilihan pengguna
    if (sortOption === 'newest') return timeB - timeA;      // Terkini (waktu terbaru di atas)
    if (sortOption === 'oldest') return timeA - timeB;      // Terlama
    if (sortOption === 'rating_high') return rateB - rateA; // Rating tertinggi dahulu
    if (sortOption === 'rating_low') return rateA - rateB;  // Rating terendah dahulu
    return timeB - timeA;                                   // Default: waktu terbaru
  });

  // Gambar ulang ulasan yang telah terfilter ke halaman
  renderReviews(filtered);
}

// Mendengarkan data ulasan secara realtime dari Firebase Firestore
function listenAllReviews() {
  const container = document.getElementById('allReviewsContainer');
  if (!container) return;

  // Menampilkan indikator loading saat koneksi ke Firestore berlangsung
  container.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border text-danger me-2" role="status"></div>
      <span class="text-muted fw-semibold">Memuat seluruh ulasan Firestore secara realtime...</span>
    </div>
  `;

  // Jika fungsi realtime listener onSnapshotReviews tersedia di firebase.js
  if (window.firebaseManager?.onSnapshotReviews) {
    // Pasang listener realtime agar ulasan baru langsung otomatis muncul tanpa reload halaman
    window.firebaseManager.onSnapshotReviews((ulasan) => {
      reviewListCache = ulasan;     // Simpan ke cache lokal
      updateReviewStats(ulasan);    // Perbarui statistik
      applyPublicFilters();         // Terapkan filter & render ulasan
    });
  } else {
    // Fallback pemanggilan satu kali jika realtime snapshot tidak aktif
    window.firebaseManager?.loadReviews?.().then((ulasan) => {
      reviewListCache = ulasan;
      updateReviewStats(ulasan);
      applyPublicFilters();
    });
  }
}

// Menghubungkan form pengiriman ulasan dengan event submit dan penyimpanan ke database
function pasangFormUlasan() {
  const form = document.getElementById('addReviewForm') || document.getElementById('form-ulasan');
  if (!form) return;

  // Menambahkan pendengar submit form
  form.addEventListener('submit', async (e) => {
    // Mencegah reload halaman secara default (SPA behavior)
    e.preventDefault();

    // Jika sedang dalam proses submit sebelumnya, hentikan agar tidak duplikat
    if (isSubmitting) return;

    // Pemeriksaan Anti-Spam Honeypot: field ini disembunyikan dari manusia, jika bot mengisinya maka tolak
    const honeypot = document.getElementById('hp_website_url');
    if (honeypot && honeypot.value.trim() !== '') {
      console.warn('[ReviewPage] Honeypot terisi. Pengiriman dibatalkan.');
      return;
    }

    // Mengambil nilai input nama, komentar, dan rating terpilih
    const nama = document.getElementById('reviewerName')?.value?.trim();
    const komentar = document.getElementById('reviewerComment')?.value?.trim();
    const rating = selectedRating;

    // Validasi field wajib
    if (!nama || !komentar) {
      tampilkanToast('Harap isi nama dan komentar ulasan Anda.', 'danger');
      return;
    }

    // Aktifkan flag pengiriman dan ubah status tombol menjadi loading
    isSubmitting = true;
    const btnSubmit = form.querySelector('button[type="submit"]');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Mengirim Ulasan...';
    }

    try {
      // Susun objek payload yang akan dikirim ke koleksi Firestore
      const reviewPayload = {
        name: nama,
        rating: Number(rating),
        comment: komentar
      };

      // Panggil fungsi saveReview dari modul firebaseManager
      const result = await window.firebaseManager?.saveReview?.(reviewPayload);

      // Jika berhasil disimpan ke Firestore
      if (result?.ok) {
        form.reset();               // Bersihkan inputan form
        initStarRatingPicker();     // Kembalikan picker bintang ke kondisi awal (5 bintang)
        tampilkanToast('Terima kasih! Ulasan Anda telah terkirim dan dipublikasikan.', 'success');
      } else {
        // Tampilkan pesan error jika Firebase menolak
        tampilkanToast(result?.error || 'Gagal menyimpan ulasan. Coba lagi.', 'danger');
      }
    } catch (err) {
      // Tangani kesalahan jaringan / sistem
      console.error('[ReviewsPage] Gagal kirim ulasan:', err);
      tampilkanToast('Terjadi kesalahan koneksi saat mengirim ulasan.', 'danger');
    } finally {
      // Kembalikan status tombol dan flag submitting ke semula di blok finally
      isSubmitting = false;
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="bi bi-send-fill me-2" aria-hidden="true"></i>Kirim Ulasan Sekarang';
      }
    }
  });
}

// Menampilkan pesan pop-up Toast notifikasi Bootstrap
function tampilkanToast(pesan, tipe = 'success') {
  const toastEl = document.getElementById('reviewToast');
  const msgEl = document.getElementById('toastMsg');
  const iconEl = document.getElementById('toastIcon');

  if (!toastEl || !msgEl) return;

  // Ganti kelas warna toast sesuai tipe (sukses warna hijau, bahaya/gagal warna merah)
  toastEl.classList.remove('text-bg-success', 'text-bg-danger');
  toastEl.classList.add(tipe === 'danger' ? 'text-bg-danger' : 'text-bg-success');

  // Ganti ikon toast
  if (iconEl) {
    iconEl.className = tipe === 'danger' ? 'bi bi-exclamation-triangle-fill fs-5' : 'bi bi-check-circle-fill fs-5';
  }

  // Tulis pesan teks notifikasi
  msgEl.textContent = pesan;

  // Tampilkan toast menggunakan Bootstrap Toast API
  const bsToast = new bootstrap.Toast(toastEl);
  bsToast.show();
}

// Fungsi utama yang menginisialisasi semua fungsi saat halaman ulasan dibuka
function initReviewsPage() {
  initStarRatingPicker(); // Pasang pemilih bintang
  listenAllReviews();     // Mulai dengarkan ulasan realtime
  pasangFormUlasan();     // Pasang form pengiriman ulasan

  // Pasang event listener interaktif pada elemen pencarian dan kontrol filter
  document.getElementById('searchReviewInput')?.addEventListener('input', applyPublicFilters);
  document.getElementById('filterRatingSelect')?.addEventListener('change', applyPublicFilters);
  document.getElementById('filterReplySelect')?.addEventListener('change', applyPublicFilters);
  document.getElementById('sortReviewSelect')?.addEventListener('change', applyPublicFilters);
}

// Memastikan kode dijalankan setelah seluruh DOM HTML selesai dimuat
if (document.readyState === 'complete') {
  initReviewsPage();
} else {
  window.addEventListener('load', initReviewsPage);
}

