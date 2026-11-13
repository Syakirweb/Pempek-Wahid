/**
 * ==============================================================================
 * APLIKASI UTAMA PEMPEK WAHID (Frontend Controller)
 * File: js/app.js
 * Deskripsi: Mengelola seluruh logika antarmuka toko online:
 * 1. Manajemen data katalog produk (Firestore & Fallback lokal).
 * 2. Logika keranjang belanja (Cart State, tambah, kurang, hapus, subtotal).
 * 3. Aturan bisnis (Minimum order 10 pcs, pembatasan online Pempek Kulit Gepeng).
 * 4. Integrasi checkout pemesanan ke WhatsApp resmi.
 * 5. Fitur ulasan pelanggan & sinkronisasi realtime status operasional outlet.
 * ==============================================================================
 */

// ==============================================================================
// 1. DATA KATALOG STANDAR / FALLBACK
// Digunakan saat offline atau ketika koleksi produk di Firestore belum diisi
// ==============================================================================
const DEFAULT_PRODUCTS = [
  {
    id: 'pempek-telur',                                                                         // ID unik produk
    name: 'Pempek Telur (Kapal Selam Kecil)',                                                   // Nama menu produk
    price: 1000,                                                                                // Harga satuan (Rp 1.000)
    category: 'satuan',                                                                         // Kategori menu (satuan / paket)
    description: 'Pempek olahan ikan kakap dengan isian telur gurih, kenyal dan nikmat saat disiram cuko kental pedas manis.', // Deskripsi rasa
    image: 'images/pempek_telur.jpg',                                                           // Lokasi file gambar produk
    isSoldOut: false                                                                            // Status ketersediaan stok
  },
  {
    id: 'pempek-lenjer',
    name: 'Pempek Lenjer',
    price: 1000,
    category: 'satuan',
    description: 'Pempek lenjer lonjong klasik khas Palembang dengan cita rasa daging ikan kakap yang kaya dan gurih mantap.',
    image: 'images/pempek_lenjer_putih.jpg',
    isSoldOut: false
  },
  {
    id: 'pempek-bulat',
    name: 'Pempek Bulat (Adaan)',
    price: 1000,
    category: 'satuan',
    description: 'Pempek adaan bulat dengan aroma irisan daun bawang segar dan rempah gurih khas yang menggugah selera.',
    image: 'images/pempek_bulat.jpg',
    isSoldOut: false
  },
  {
    id: 'pempek-pistel',
    name: 'Pempek Pistel',
    price: 1000,
    category: 'satuan',
    description: 'Pempek khas berbentuk pastel dengan isian tumis pepaya muda (katis) gurih bumbu ebi yang lembut dan lezat.',
    image: 'images/pempek_pistel.jpeg',
    isSoldOut: false
  },
  {
    id: 'pempek-kulit-lenjer',
    name: 'Pempek Kulit Lenjer',
    price: 1000,
    category: 'satuan',
    description: 'Pempek olahan kulit ikan kakap bertekstur kenyal dengan gurih yang mantap, cocok dinikmati hangat.',
    image: 'images/pempek_kulit_lenjer.jpg',
    isSoldOut: false
  },
  {
    id: 'pempek-kulit-gepeng',
    name: 'Pempek Kulit Gepeng',
    price: 1000,
    category: 'satuan',
    description: 'Pempek kulit pipih gurih beraroma mantap. (Khusus santap di outlet / dine-in, tidak untuk pesanan online).',
    image: 'images/pempek_kulit_gepeng.jpg',
    isSoldOut: false
  },
  {
    id: 'paket-campur-20',
    name: 'Paket Hemat Campur (20 Pcs)',
    price: 20000,
    category: 'paket',
    description: 'Paket hemat 20 pcs aneka pempek kakap (Telur, Lenjer, Adaan, Pistel, Kulit) sudah termasuk 1 botol cuko kental.',
    image: 'images/pempek_bulat.jpg',
    isSoldOut: false
  },
  {
    id: 'paket-campur-50',
    name: 'Paket Pesta Puas (50 Pcs)',
    price: 50000,
    category: 'paket',
    description: 'Paket lengkap 50 pcs aneka pempek kakap lezat dengan porsi cuko kental melimpah, pas untuk acara & kumpul keluarga.',
    image: 'images/pempek_lenjer_putih.jpg',
    isSoldOut: false
  }
];

// Array dinamis untuk menyimpan daftar produk aktif yang dimuat dari database
let products = [];

// ==============================================================================
// 2. SELEKTOR ELEMEN DOM (HTML)
// Menghubungkan variabel JavaScript dengan elemen tampilan di index.html
// ==============================================================================
const gridProduk = document.getElementById('productGrid');                     // Kontainer tempat kartu-kartu produk ditampilkan
const inputCari = document.getElementById('searchInput');                       // Kolom pencarian nama produk
const tombolFilter = document.querySelectorAll('.filter-btn');                  // Tombol-tombol penyaring kategori (Semua, Satuan, Paket)
const badgeJumlahKeranjang = document.getElementById('cartCountBadge');         // Lingkaran merah penunjuk jumlah item di tombol navbar
const daftarItemKeranjang = document.getElementById('cartItemsList');           // Kontainer daftar item belanja di drawer offcanvas
const tampilanTotalKeranjang = document.getElementById('cartTotalDisplay');     // Label total harga belanja (Rp)
const tombolCheckoutWhatsApp = document.getElementById('checkoutWhatsAppBtn');  // Tombol utama untuk mengirim pesanan ke WhatsApp
const namaPelanggan = document.getElementById('customerName');                  // Input form nama pemesan
const catatanPengiriman = document.getElementById('deliveryNotes');             // Input form alamat/catatan pengiriman
const drawerKeranjang = document.getElementById('cartOffcanvas');               // Elemen panel samping (Offcanvas Bootstrap)

// ==============================================================================
// 3. KONSTANTA ATURAN BISNIS & STATE APLIKASI
// ==============================================================================
// Batas minimum jumlah pempek yang wajib dipesan dalam sekali order online
const PEMESANAN_MINIMAL = 10;

// Gambar cadangan yang akan ditampilkan jika gambar produk gagal dimuat/rusak (404)
const FALLBACK_IMAGE = 'images/default-pempek.svg';

// Array state untuk menyimpan daftar produk yang dimasukkan ke dalam keranjang
let keranjang = [];

// Menyimpan kategori filter yang sedang aktif (default: 'all')
let filterSaatIni = 'all';

// Flag untuk mencegah spam klik berkali-kali saat mengirim ulasan
let reviewSubmitCooldown = false;

// Menyimpan waktu (timestamp) pengiriman ulasan terakhir
let lastReviewSubmitTime = 0;

// Jeda waktu tunggu anti-spam ulasan (5000 ms = 5 detik)
const REVIEW_COOLDOWN_MS = 5000;

// ==============================================================================
// 4. FUNGSI UTILITAS UMUM (Formatting & Sanitasi XSS)
// ==============================================================================

// Mengubah format angka numerik murni menjadi format mata uang Rupiah Indonesia
function formatHarga(nilai) {
  // Contoh: 1000 -> "Rp 1.000"
  return `Rp ${Number(nilai).toLocaleString('id-ID')}`;
}

// Fungsi pencegahan celah keamanan XSS (Cross-Site Scripting)
function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')   // Mengamankan karakter &
    .replace(/</g, '&lt;')    // Mengamankan kurung siku buka HTML <
    .replace(/>/g, '&gt;')    // Mengamankan kurung siku tutup HTML >
    .replace(/"/g, '&quot;')  // Mengamankan tanda petik dua
    .replace(/'/g, '&#39;');  // Mengamankan tanda petik satu
}

// ==============================================================================
// 5. FITUR ULASAN PELANGGAN (Reviews Section)
// ==============================================================================

// Merender daftar ulasan dalam bentuk elemen kartu HTML ke kontainer ulasan
function renderUlasanHtml(ulasan, container) {
  // Jika belum ada data ulasan sama sekali
  if (!ulasan || ulasan.length === 0) {
    container.innerHTML = '<div class="col-12"><div class="alert alert-light rounded-4 border text-muted">Belum ada ulasan. Jadilah yang pertama menulis review untuk Pempek Wahid.</div></div>';
    return;
  }

  // Melakukan iterasi array ulasan dan membentuk template HTML
  container.innerHTML = ulasan.map((item) => `
    <div class="col-12">
      <div class="card border-0 rounded-4 h-100 shadow-sm">
        <div class="card-body">
          <!-- Header Ulasan: Nama Pengulas & Bintang -->
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            <div>
              <h3 class="h6 fw-bold mb-1">${escapeHtml(item.name || 'Pelanggan')}</h3>
              <div class="text-warning small">${'⭐'.repeat(Number(item.rating || 5))}</div>
            </div>
            <span class="badge bg-danger-subtle text-danger rounded-pill">${item.rating || 5}/5</span>
          </div>
          <!-- Isi Komentar -->
          <p class="text-muted small mb-2">${escapeHtml(item.comment || '')}</p>
          <!-- Foto Lampiran Ulasan (jika ada) -->
          ${item.photoUrl
            ? `<img src="${escapeHtml(item.photoUrl)}" alt="Foto ulasan dari ${escapeHtml(item.name || 'Pelanggan')}" class="review-photo-thumb mb-2" width="300" height="180" loading="lazy">`
            : ''}
          <!-- Balasan Resmi Toko (jika admin sudah merespons) -->
          ${item.reply
            ? `<div class="border rounded-3 p-3 bg-light-custom">
                <div class="fw-semibold small text-danger mb-1"><i class="bi bi-reply-fill me-1" aria-hidden="true"></i>Balasan Pempek Wahid</div>
                <p class="mb-0 small text-muted">${escapeHtml(item.reply)}</p>
              </div>`
            : ''}
        </div>
      </div>
    </div>
  `).join('');
}

// Memuat data ulasan dari Firebase Firestore untuk ditampilkan pada beranda
function muatUlasan() {
  const container = document.getElementById('reviewsContainer');
  if (!container) return;

  // Menampilkan spinner loading sementara
  container.innerHTML = '<div class="col-12 text-center text-muted small py-3"><div class="spinner-border spinner-border-sm text-danger me-2" role="status"></div>Memuat ulasan terbaru...</div>';

  // Jika fungsi realtime snapshot ulasan tersedia, gunakan untuk update otomatis
  if (window.firebaseManager?.onSnapshotReviews) {
    // Ambil maksimal 4 ulasan terbaru untuk ditampilkan di beranda
    window.firebaseManager.onSnapshotReviews((ulasan) => {
      renderUlasanHtml(ulasan, container);
    }, 4);
  } else {
    // Fallback pengambilan satu kali
    window.firebaseManager?.loadReviews?.(4).then((ulasan) => {
      renderUlasanHtml(ulasan, container);
    }).catch((error) => {
      console.error('[App] Gagal memuat ulasan:', error);
      container.innerHTML = '<div class="col-12"><div class="alert alert-warning rounded-4 border">Gagal memuat ulasan. Coba refresh halaman.</div></div>';
    });
  }
}

// Menangani pengiriman form ulasan baru oleh pelanggan
async function kirimUlasan(event) {
  // Mencegah browser me-reload halaman
  event.preventDefault();

  const now = Date.now();
  // Validasi jeda waktu anti-spam (5 detik)
  if (reviewSubmitCooldown && now - lastReviewSubmitTime < REVIEW_COOLDOWN_MS) {
    tampilkanToast('Tunggu sebentar sebelum mengirim ulasan lagi.', 'danger');
    return;
  }

  // Pemeriksaan honeypot: jika input tersembunyi terisi, artinya pengirim adalah robot spammer
  const honeypot = document.getElementById('hp_website_url');
  if (honeypot && honeypot.value.trim() !== '') {
    console.warn('[Review] Spam terdeteksi melalui honeypot. Pengiriman dibatalkan.');
    return;
  }

  // Mengambil elemen form dan nilai input
  const form = document.getElementById('addReviewForm');
  const nama = document.getElementById('reviewerName')?.value?.trim();
  const rating = document.getElementById('reviewerRating')?.value;
  const komentar = document.getElementById('reviewerComment')?.value?.trim();

  // Validasi kelengkapan form
  if (!form || !nama || !komentar) return;

  // Aktifkan cooldown dan catat waktu kirim
  reviewSubmitCooldown = true;
  lastReviewSubmitTime = now;

  // Ubah tombol submit menjadi status loading
  const tombol = form.querySelector('button[type="submit"]');
  if (tombol) {
    tombol.disabled = true;
    tombol.innerHTML = '<span class="me-2"><i class="bi bi-cloud-arrow-up-fill" aria-hidden="true"></i></span>Menyimpan...';
  }

  try {
    // Siapkan objek ulasan
    const reviewPayload = {
      name: nama,
      rating: Number(rating || 5),
      comment: komentar
    };

    // Kirim data ulasan ke Firestore
    const hasil = await window.firebaseManager?.saveReview?.(reviewPayload);

    if (hasil?.ok) {
      form.reset(); // Kosongkan kembali form
      tampilkanToast('Ulasan berhasil dikirim dan tersimpan di Firestore.', 'success');
      await muatUlasan(); // Refresh ulasan di layar
    } else {
      tampilkanToast(hasil?.error || 'Ulasan gagal dikirim. Periksa konfigurasi Firebase.', 'danger');
    }
  } catch (error) {
    console.error('[App] Gagal mengirim ulasan:', error);
    tampilkanToast('Terjadi kesalahan saat mengirim ulasan.', 'danger');
  } finally {
    // Kembalikan tombol ke keadaan aktif semula
    if (tombol) {
      tombol.disabled = false;
      tombol.innerHTML = '<i class="bi bi-send-fill me-1" aria-hidden="true"></i> Kirim Ulasan';
    }
    // Lepaskan cooldown setelah durasi selesai
    setTimeout(() => {
      reviewSubmitCooldown = false;
    }, REVIEW_COOLDOWN_MS);
  }
}

// ==============================================================================
// 6. INTEGRASI STATUS OPERASIONAL TOKO & KONTROL TOMBOL
// ==============================================================================

// Mengambil objek status buka/tutup toko saat ini dari StoreStatusManager
function getStoreStatus() {
  if (storeStatusManager) {
    return storeStatusManager.determineStatus(window.currentStoreStatus || {});
  }
  return { canCheckout: true };
}

// Memperbarui kondisi tombol "Tambah" di semua card katalog & modal sesuai status toko & stok
window.updateProductButtonsStoreStatus = function (statusObj) {
  // Apakah pelanggan diizinkan checkout saat ini
  const canCheckout = statusObj ? Boolean(statusObj.canCheckout) : true;

  // Ambil semua tombol "Tambah" pada kartu katalog produk
  const addButtons = document.querySelectorAll('.add-cart-btn');
  addButtons.forEach((btn) => {
    const id = btn.dataset.id;
    // Cari data produk terkait di array
    const produk = products.find((item) => String(item.id) === String(id));
    const isSoldOut = produk ? Boolean(produk.isSoldOut) : false;

    // Kondisi 1: Stok Habis
    if (isSoldOut) {
      btn.disabled = true;
      btn.title = 'Stok habis';
      btn.innerHTML = '<i class="bi bi-x-circle me-1" aria-hidden="true"></i>Stok Habis';
    // Kondisi 2: Toko Sedang Tutup
    } else if (!canCheckout) {
      btn.disabled = true;
      btn.title = 'Outlet sedang tutup';
      btn.innerHTML = '<i class="bi bi-dash-circle me-1" aria-hidden="true"></i>Toko Tutup';
    // Kondisi 3: Toko Buka dan Stok Ada
    } else {
      btn.disabled = false;
      btn.title = '';
      btn.innerHTML = 'Tambah';
    }
  });

  // Perbarui juga tombol "Tambah ke Keranjang" yang ada di dalam Modal Detail Produk
  const modalAddToCartBtn = document.getElementById('modalAddToCartBtn');
  if (modalAddToCartBtn && modalAddToCartBtn.dataset.id) {
    const id = modalAddToCartBtn.dataset.id;
    const produk = products.find((item) => String(item.id) === String(id));
    const isSoldOut = produk ? Boolean(produk.isSoldOut) : false;

    if (isSoldOut) {
      modalAddToCartBtn.disabled = true;
      modalAddToCartBtn.innerHTML = '<i class="bi bi-x-circle me-1" aria-hidden="true"></i> Stok Habis';
    } else if (!canCheckout) {
      modalAddToCartBtn.disabled = true;
      modalAddToCartBtn.innerHTML = '<i class="bi bi-dash-circle me-1" aria-hidden="true"></i> Toko Tutup';
    } else {
      modalAddToCartBtn.disabled = false;
      modalAddToCartBtn.innerHTML = '<i class="bi bi-cart-plus me-1" aria-hidden="true"></i> Tambah Ke Keranjang';
    }
  }
};

// ==============================================================================
// 7. RENDERING KATALOG PRODUK KE GRID
// ==============================================================================

// Menampilkan daftar item produk ke elemen grid katalog HTML
function tampilkanProduk(itemProduk) {
  if (!gridProduk) return;

  // Bersihkan isi grid lama sebelum menampilkan produk baru
  gridProduk.innerHTML = '';

  // Jika tidak ada produk yang ditemukan (katalog kosong)
  if (!itemProduk || itemProduk.length === 0) {
    gridProduk.innerHTML = `
      <div class="col-12">
        <div class="text-center py-5 text-muted">
          <i class="bi bi-inbox fs-1 d-block mb-3" aria-hidden="true"></i>
          <h3 class="h5 fw-semibold">Belum ada menu tersedia</h3>
          <p class="small">Menu akan muncul di sini setelah admin menambahkannya melalui panel admin.</p>
        </div>
      </div>
    `;
    return;
  }

  // Dapatkan status operasional toko
  const currentStatus = getStoreStatus();
  const canCheckout = currentStatus.canCheckout;

  // Iterasi setiap item produk untuk dibuatkan elemen Card Bootstrap
  itemProduk.forEach((produk) => {
    // Membuat elemen kolom pembungkus kartu (responsif: 2 kolom di tablet, 3 kolom di desktop)
    const kolom = document.createElement('div');
    kolom.className = 'col-sm-6 col-lg-4';

    const isSoldOut = Boolean(produk.isSoldOut);
    const isButtonDisabled = isSoldOut || !canCheckout;

    // Menentukan teks dan ikon tombol tambah berdasarkan ketersediaan
    let buttonContent = 'Tambah';
    let buttonTitle = '';
    if (isSoldOut) {
      buttonContent = '<i class="bi bi-x-circle me-1" aria-hidden="true"></i>Stok Habis';
      buttonTitle = 'Stok habis';
    } else if (!canCheckout) {
      buttonContent = '<i class="bi bi-dash-circle me-1" aria-hidden="true"></i>Toko Tutup';
      buttonTitle = 'Outlet sedang tutup';
    }

    // Mengisi markup HTML untuk kartu produk
    kolom.innerHTML = `
      <div class="card border-0 rounded-4 h-100 product-card${isSoldOut ? ' sold-out' : ''}">
        <div class="position-relative">
          <!-- Foto Produk dengan Lazy Loading dan Penanganan Error Gambar -->
          <img src="${escapeHtml(produk.image || '')}" class="card-img-top rounded-top-4 product-image" alt="${escapeHtml(produk.name)}" width="300" height="220" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'">
          <!-- Badge Merah jika Stok Habis -->
          ${isSoldOut ? '<span class="badge-sold-out"><i class="bi bi-x-circle-fill me-1" aria-hidden="true"></i>Stok Habis</span>' : ''}
        </div>
        <div class="card-body d-flex flex-column">
          <!-- Nama Produk & Badge Harga Satuan -->
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            <h3 class="h5 fw-bold mb-0">${escapeHtml(produk.name)}</h3>
            <span class="badge bg-danger-subtle text-danger rounded-pill">${formatHarga(produk.price)}</span>
          </div>
          <!-- Ringkasan Deskripsi Menu -->
          <p class="text-muted small mb-3">${escapeHtml(produk.description || '')}</p>
          <!-- Tombol Aksi: Lihat Detail & Tambah ke Keranjang -->
          <div class="mt-auto d-flex gap-2">
            <button class="btn btn-outline-dark rounded-pill px-3 btn-sm detail-btn" data-id="${escapeHtml(String(produk.id))}" aria-label="Lihat detail ${escapeHtml(produk.name)}">Lihat Detail</button>
            <button class="btn btn-danger-custom rounded-pill px-3 btn-sm add-cart-btn" data-id="${escapeHtml(String(produk.id))}"${isButtonDisabled ? ` disabled title="${buttonTitle}"` : ''} aria-label="Tambah ${escapeHtml(produk.name)} ke keranjang">
              ${buttonContent}
            </button>
          </div>
        </div>
      </div>
    `;

    // Tempelkan kolom kartu ke grid kontainer
    gridProduk.appendChild(kolom);
  });

  // Pasang event listener interaktif pada tombol detail dan tombol tambah yang baru dibuat
  pasangAksiProduk();
}

// ==============================================================================
// 8. EVENT LISTENER KARTU PRODUK (Modal Detail & Tambah Keranjang)
// ==============================================================================

function pasangAksiProduk() {
  const tombolDetail = document.querySelectorAll('.detail-btn');
  const tombolTambah = document.querySelectorAll('.add-cart-btn');

  // Pasang aksi klik untuk setiap tombol "Lihat Detail"
  tombolDetail.forEach((button) => {
    button.addEventListener('click', () => {
      // Temukan data produk yang cocok berdasarkan atribut data-id
      const produk = products.find((item) => String(item.id) === String(button.dataset.id));
      if (!produk) return;

      // Ambil elemen modal detail
      const judulModal = document.getElementById('modalTitle');
      const hargaModal = document.getElementById('modalPrice');
      const deskripsiModal = document.getElementById('modalDescription');
      const gambarModal = document.getElementById('modalImage');
      const tombolTambahModal = document.getElementById('modalAddToCartBtn');

      // Masukkan informasi produk ke dalam elemen modal
      judulModal.textContent = produk.name;
      hargaModal.textContent = formatHarga(produk.price);
      deskripsiModal.textContent = produk.description || '';
      gambarModal.src = produk.image || FALLBACK_IMAGE;
      gambarModal.alt = produk.name;
      gambarModal.onerror = function () { this.onerror = null; this.src = FALLBACK_IMAGE; };
      tombolTambahModal.dataset.id = String(produk.id);

      // Cek status operasional untuk tombol di dalam modal
      const currentStatus = getStoreStatus();
      if (produk.isSoldOut) {
        tombolTambahModal.disabled = true;
        tombolTambahModal.innerHTML = '<i class="bi bi-x-circle me-1" aria-hidden="true"></i> Stok Habis';
      } else if (!currentStatus.canCheckout) {
        tombolTambahModal.disabled = true;
        tombolTambahModal.innerHTML = '<i class="bi bi-dash-circle me-1" aria-hidden="true"></i> Toko Tutup';
      } else {
        tombolTambahModal.disabled = false;
        tombolTambahModal.innerHTML = '<i class="bi bi-cart-plus me-1" aria-hidden="true"></i> Tambah Ke Keranjang';
      }

      // Tampilkan Modal Bootstrap
      const modal = new bootstrap.Modal(document.getElementById('productModal'));
      modal.show();
    });
  });

  // Pasang aksi klik untuk tombol langsung "Tambah" pada kartu
  tombolTambah.forEach((button) => {
    button.addEventListener('click', () => tambahKeKeranjang(String(button.dataset.id)));
  });
}

// Membuka panel drawer keranjang (Offcanvas) dari sisi kanan layar
function bukaDrawerKeranjang() {
  if (!drawerKeranjang) return;

  // Dapatkan atau inisialisasi instance Offcanvas Bootstrap
  const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(drawerKeranjang);
  offcanvas.show(); // Buka panel
}

// ==============================================================================
// 9. LOGIKA MANAJEMEN KERANJANG (Cart Management)
// ==============================================================================

// Menambahkan produk ke dalam keranjang belanja
function tambahKeKeranjang(idProduk) {
  // Validasi 1: Cek apakah toko mengizinkan checkout
  const currentStatus = getStoreStatus();
  if (!currentStatus.canCheckout) {
    tampilkanToast('Maaf, outlet sedang tutup. Pemesanan tidak dapat dilakukan saat ini.', 'danger');
    return;
  }

  // Temukan item produk
  const produk = products.find((item) => String(item.id) === String(idProduk));
  if (!produk) return;

  // Validasi 2: Cek ketersediaan stok
  if (produk.isSoldOut) {
    tampilkanToast(`${produk.name} sedang tidak tersedia (stok habis).`, 'danger');
    return;
  }

  // Validasi 3: Aturan Khusus Bisnis - Pempek Kulit Gepeng tidak boleh dipesan online
  if (produk.name.toLowerCase().includes('kulit gepeng')) {
    tampilkanToast('Pempek kulit gepeng tidak tersedia untuk pemesanan online karena tidak direbus, sehingga lengket dan cepat basi.', 'danger');
    return;
  }

  // Cek apakah item sudah ada di keranjang sebelumnya
  const itemYangAda = keranjang.find((item) => String(item.id) === String(idProduk));
  const itemBaru = !itemYangAda;

  // Jika sudah ada, cukup tambahkan kuantitasnya (qty + 1)
  if (itemYangAda) {
    itemYangAda.qty += 1;
  } else {
    // Jika belum ada, tambahkan objek baru ke array keranjang
    keranjang.push({ ...produk, qty: 1 });
  }

  // Perbarui tampilan antarmuka keranjang
  tampilkanKeranjang();

  // Jika produk baru pertama kali ditambahkan, otomatis buka drawer keranjang
  if (itemBaru) {
    bukaDrawerKeranjang();
  }

  // Tampilkan notifikasi toast sukses
  tampilkanToast(`${produk.name} ditambahkan ke keranjang.`, 'success');
}

// Menambah atau mengurangi jumlah kuantitas produk di keranjang (+ / -)
function ubahJumlahKeranjang(idProduk, selisih) {
  const itemYangAda = keranjang.find((item) => String(item.id) === String(idProduk));
  if (!itemYangAda) return;

  // Tambah atau kurangi qty sesuai nilai selisih (1 atau -1)
  itemYangAda.qty += selisih;

  // Jika jumlah menjadi 0 atau minus, hapus item tersebut dari keranjang
  if (itemYangAda.qty <= 0) {
    keranjang = keranjang.filter((item) => String(item.id) !== String(idProduk));
  }

  // Gambar ulang keranjang
  tampilkanKeranjang();
}

// Merender daftar item di dalam drawer offcanvas keranjang
function tampilkanKeranjang() {
  if (!daftarItemKeranjang) return;

  // Bersihkan elemen keranjang sebelumnya
  daftarItemKeranjang.innerHTML = '';

  // Kondisi jika keranjang belanja kosong
  if (keranjang.length === 0) {
    daftarItemKeranjang.innerHTML = '<p class="text-muted small mb-0">Keranjang masih kosong.</p>';
    badgeJumlahKeranjang.textContent = '0';
    tampilanTotalKeranjang.textContent = 'Rp 0';
    return;
  }

  // Render setiap baris item yang ada di keranjang
  keranjang.forEach((item) => {
    const barisItem = document.createElement('div');
    barisItem.className = 'd-flex justify-content-between align-items-center border-bottom py-2 gap-3';
    barisItem.innerHTML = `
      <!-- Nama & Harga Satuan -->
      <div>
        <div class="fw-semibold">${escapeHtml(item.name)}</div>
        <small class="text-muted">${formatHarga(item.price)} / pcs</small>
      </div>
      <!-- Tombol Kontrol Kuantitas (- / +) -->
      <div class="d-flex align-items-center gap-2">
        <button type="button" class="btn btn-sm btn-outline-danger rounded-circle" data-cart-action="decrease" data-id="${escapeHtml(String(item.id))}" aria-label="Kurangi qty ${escapeHtml(item.name)}">-</button>
        <span class="fw-bold text-dark min-width-qty">${item.qty}</span>
        <button type="button" class="btn btn-sm btn-outline-danger rounded-circle" data-cart-action="increase" data-id="${escapeHtml(String(item.id))}" aria-label="Tambah qty ${escapeHtml(item.name)}">+</button>
      </div>
      <!-- Subtotal Harga untuk item ini -->
      <div class="fw-bold text-danger-custom">${formatHarga(item.price * item.qty)}</div>
    `;
    daftarItemKeranjang.appendChild(barisItem);
  });

  // Hitung total kuantitas pempek (akumulasi qty)
  const totalQty = keranjang.reduce((sum, item) => sum + item.qty, 0);
  // Hitung total harga belanja keseluruhan (qty * harga)
  const total = keranjang.reduce((sum, item) => sum + item.price * item.qty, 0);
  
  // Tampilkan angka kuantitas pada badge merah navbar
  badgeJumlahKeranjang.textContent = String(totalQty);
  // Tampilkan total tagihan harga
  tampilanTotalKeranjang.textContent = formatHarga(total);

  // Validasi Aturan Minimum Order: Tampilkan peringatan merah jika kuantitas kurang dari 10 pcs
  if (totalQty < PEMESANAN_MINIMAL) {
    const pemberitahuanMinimal = document.createElement('div');
    pemberitahuanMinimal.className = 'alert alert-danger rounded-3 small mt-3 mb-0';
    pemberitahuanMinimal.innerHTML = `Minimum pemesanan adalah <strong>${PEMESANAN_MINIMAL} pcs</strong>. Saat ini anda baru memilih <strong>${totalQty} pcs</strong>.`;
    daftarItemKeranjang.appendChild(pemberitahuanMinimal);
  }
}

// Menampilkan pesan notifikasi pop-up Toast
function tampilkanToast(pesan, tipe = 'success') {
  const pesanToast = document.getElementById('toastMessage');
  const toastKeranjang = document.getElementById('cartToast');
  const ikonToast = document.getElementById('toastIcon');
  if (!pesanToast || !toastKeranjang || !ikonToast) return;

  // Atur warna latar belakang toast (hijau untuk sukses, merah untuk error/peringatan)
  toastKeranjang.classList.remove('text-bg-success', 'text-bg-danger');
  toastKeranjang.classList.add(tipe === 'danger' ? 'text-bg-danger' : 'text-bg-success');
  
  // Ganti ikon toast
  ikonToast.className = tipe === 'danger' ? 'bi bi-exclamation-triangle-fill fs-5' : 'bi bi-check-circle-fill fs-5';
  
  // Tulis pesan teks
  pesanToast.textContent = pesan;
  
  // Tampilkan menggunakan API Bootstrap Toast
  const toast = new bootstrap.Toast(toastKeranjang);
  toast.show();
}

// Event Delegation: Menangkap klik tombol tambah (+) dan kurang (-) di daftar keranjang
daftarItemKeranjang?.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-cart-action]');
  if (!button) return;

  const idProduk = String(button.dataset.id);
  const aksi = button.dataset.cartAction;

  if (aksi === 'increase') {
    ubahJumlahKeranjang(idProduk, 1);
  }

  if (aksi === 'decrease') {
    ubahJumlahKeranjang(idProduk, -1);
  }
});

// ==============================================================================
// 10. FILTER & PENCARIAN PRODUK
// ==============================================================================

// Menyaring produk berdasarkan kata kunci pencarian dan kategori tab yang dipilih
function filterProduk() {
  const kataKunci = inputCari?.value.toLowerCase().trim() || '';

  const hasilFilter = products.filter((produk) => {
    const cocokPencarian = produk.name.toLowerCase().includes(kataKunci);
    const cocokKategori = filterSaatIni === 'all' || produk.category === filterSaatIni;
    return cocokPencarian && cocokKategori;
  });

  tampilkanProduk(hasilFilter);
}

// Event input pada kolom pencarian
if (inputCari) {
  inputCari.addEventListener('input', filterProduk);
}

// Event klik pada tombol-tombol kategori filter (Semua, Satuan, Paket)
tombolFilter.forEach((button) => {
  button.addEventListener('click', () => {
    filterSaatIni = button.dataset.category;
    // Ubah status tombol aktif
    tombolFilter.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
    // Jalankan filter
    filterProduk();
  });
});

// ==============================================================================
// 11. OPSI METODE PENGIRIMAN (Ambil Sendiri / Kirim via Kurir)
// ==============================================================================

// Menandai kartu opsi pengiriman yang dipilih oleh pembeli secara visual
document.addEventListener('change', (e) => {
  if (e.target.name === 'deliveryMethod') {
    document.querySelectorAll('.delivery-option-card').forEach((card) => {
      card.classList.remove('delivery-option-cardHasChecked');
    });
    const checkedInput = document.querySelector('input[name="deliveryMethod"]:checked');
    if (checkedInput) {
      checkedInput.closest('.delivery-option-card')?.classList.add('delivery-option-cardHasChecked');
    }
  }
});

// Inisialisasi tampilan opsi radio pengiriman saat dokumen siap
document.addEventListener('DOMContentLoaded', () => {
  const checkedInput = document.querySelector('input[name="deliveryMethod"]:checked');
  if (checkedInput) {
    checkedInput.closest('.delivery-option-card')?.classList.add('delivery-option-cardHasChecked');
  }
});

// Event klik tombol "Tambah ke Keranjang" dari dalam Modal Detail
document.getElementById('modalAddToCartBtn')?.addEventListener('click', () => {
  const idProduk = String(document.getElementById('modalAddToCartBtn').dataset.id);
  tambahKeKeranjang(idProduk);
  // Tutup Modal setelah item berhasil ditambahkan
  bootstrap.Modal.getInstance(document.getElementById('productModal'))?.hide();
});

// Pasang pendengar submit form ulasan
document.getElementById('addReviewForm')?.addEventListener('submit', kirimUlasan);

// ==============================================================================
// 12. FITUR BERBAGI WEBSITE (Web Share API & Salin Clipboard)
// ==============================================================================

document.getElementById('shareWebsiteBtn')?.addEventListener('click', async () => {
  const shareData = {
    title: 'Pempek Wahid - Ikan Kakap Asli Rp 1.000',
    text: 'Coba Pempek Wahid! Pempek ikan kakap asli Palembang yang murah, lemak, dan besak. Cuko kental khas Palembang!',
    url: window.location.href
  };

  try {
    // Jika browser mendukung native Web Share API (umumnya di HP / smartphone)
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      // Fallback untuk browser desktop: salin URL ke clipboard
      await navigator.clipboard.writeText(window.location.href);
      tampilkanToast('Tautan berhasil disalin ke clipboard!', 'success');
    }
  } catch (error) {
    // Jangan tampilkan pesan error jika user sengaja membatalkan dialog share (AbortError)
    if (error.name !== 'AbortError') {
      try {
        await navigator.clipboard.writeText(window.location.href);
        tampilkanToast('Tautan berhasil disalin ke clipboard!', 'success');
      } catch {
        tampilkanToast('Gagal menyalin tautan. Salin manual dari address bar.', 'danger');
      }
    }
  }
});

// ==============================================================================
// 13. PROSES CHECKOUT PESANAN KE WHATSAPP (Order Handler)
// ==============================================================================

tombolCheckoutWhatsApp?.addEventListener('click', () => {
  // Validasi 1: Pastikan keranjang tidak kosong
  if (keranjang.length === 0) {
    tampilkanToast('Keranjang masih kosong. Tambahkan pempek sebelum checkout.', 'danger');
    bukaDrawerKeranjang();
    return;
  }

  // Validasi 2: Pastikan memenuhi minimum pemesanan (10 pcs)
  const totalQty = keranjang.reduce((sum, item) => sum + item.qty, 0);
  if (totalQty < PEMESANAN_MINIMAL) {
    tampilkanToast(`Minimum pemesanan adalah ${PEMESANAN_MINIMAL} pcs. Saat ini anda baru memilih ${totalQty} pcs.`, 'danger');
    bukaDrawerKeranjang();
    return;
  }

  // Mengambil metode pengiriman yang dipilih
  const metodePengiriman = document.querySelector('input[name="deliveryMethod"]:checked')?.value || 'ambil_sendiri';
  const labelMetode = metodePengiriman === 'ambil_sendiri'
    ? '🏪 Ambil Sendiri ke Outlet'
    : '🚗 Kirim via Kurir/Ojol (Ongkir Ditanggung Pembeli)';

  // Menyusun daftar pesanan teks (contoh: "- Pempek Telur x5\n- Pempek Lenjer x5")
  const daftarPesanan = keranjang.map((item) => `- ${item.name} x${item.qty}`).join('\n');
  const total = keranjang.reduce((sum, item) => sum + item.price * item.qty, 0);
  const nama = namaPelanggan?.value || 'Pelanggan';
  const catatan = catatanPengiriman?.value || '-';

  // Menyusun format template pesan WhatsApp yang rapi dan terstruktur
  const pesan = encodeURIComponent(
    `Halo Pempek Wahid, saya ingin melakukan pemesanan.\n\n\n${daftarPesanan}\n\n- Nama: ${nama}\n- Metode Pengiriman: ${labelMetode}\n- Alamat Lengkap: ${catatan}\n- Nomor HP: \n- Pesanan: \n- Total: ${formatHarga(total)}\n\nMohon untuk dikonfirmasi kembali terkait pesanan dan total pembayaran.\n\n*Catatan:* Seluruh pemesanan online (baik Ambil di Toko maupun via Kurir) disajikan dalam kondisi *rebus*. Opsi *goreng* hanya tersedia untuk antrean/pembelian langsung di toko (offline). Pempek Kulit Gepeng tidak tersedia untuk pesanan online.`
  );
  
  // Membuka tautan WhatsApp API resmi Pempek Wahid di tab baru
  window.open(`https://wa.me/6288287041072?text=${pesan}`, '_blank', 'noopener,noreferrer');
});

// ==============================================================================
// 14. INISIALISASI STATUS OPERASIONAL OUTLET
// ==============================================================================

let storeStatusManager = null;

function initStoreStatus() {
  if (typeof window.StoreStatusManager === 'function') {
    // Buat instance baru StoreStatusManager
    storeStatusManager = new window.StoreStatusManager();
    // Hitung status awal dan perbarui tampilan UI
    const initialStatus = storeStatusManager.determineStatus(window.currentStoreStatus || {});
    storeStatusManager.updateUI(initialStatus);
    // Jalankan timer pemantauan waktu otomatis setiap 1 menit
    storeStatusManager.startMonitoring();

    // Dengarkan perubahan konfigurasi toko dari Firestore secara realtime
    if (window.firebaseManager?.onSnapshotStoreStatus) {
      window.firebaseManager.onSnapshotStoreStatus((statusData) => {
        window.currentStoreStatus = statusData || {};
        const statusObj = storeStatusManager.determineStatus(window.currentStoreStatus);
        storeStatusManager.updateUI(statusObj);
      });
    }
  }
}

// ==============================================================================
// 15. BOOTSTRAP INISIALISASI APLIKASI (initApp)
// ==============================================================================

async function initApp() {
  console.log('[App] Inisialisasi aplikasi...');
  
  // 1. Inisialisasi status buka/tutup toko
  initStoreStatus();

  // 2. Tampilkan indikator loading pada grid katalog
  if (gridProduk) {
    gridProduk.innerHTML = '<div class="col-12 text-center text-muted py-5"><div class="spinner-border text-danger me-2" role="status"></div><br>Memuat katalog menu Pempek Wahid...</div>';
  }

  // 3. Muat data katalog menu dari Firestore
  try {
    const firestoreProducts = await window.firebaseManager?.loadMenu?.();
    if (firestoreProducts && firestoreProducts.length > 0) {
      products = firestoreProducts;
      console.log('[App] Produk dimuat dari Firestore:', products.length, 'item');
    } else {
      // Gunakan katalog default jika data Firestore belum ada
      console.log('[App] Menggunakan katalog default (termasuk Pempek Pistel)');
      products = [...DEFAULT_PRODUCTS];
    }
  } catch (e) {
    console.warn('[App] Firebase offline / error, memuat katalog standar:', e);
    products = [...DEFAULT_PRODUCTS];
  }

  // 4. Render seluruh komponen UI ke halaman
  tampilkanProduk(products);
  tampilkanKeranjang();
  muatUlasan();
}

// Menjalankan initApp ketika halaman web selesai dimuat seutuhnya
if (document.readyState === 'complete') {
  initApp();
} else {
  window.addEventListener('load', initApp);
}

