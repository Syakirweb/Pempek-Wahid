// Menu katalog standar Pempek Wahid (termasuk menu baru: Pempek Pistel)
const DEFAULT_PRODUCTS = [
  {
    id: 'pempek-telur',
    name: 'Pempek Telur (Kapal Selam Kecil)',
    price: 1000,
    category: 'satuan',
    description: 'Pempek olahan ikan kakap dengan isian telur gurih, kenyal dan nikmat saat disiram cuko kental pedas manis.',
    image: 'images/pempek_telur.jpg',
    isSoldOut: false
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

let products = [];

// Mengambil elemen-elemen HTML yang dibutuhkan agar bisa diubah atau diisi secara dinamis.
const gridProduk = document.getElementById('productGrid');
const inputCari = document.getElementById('searchInput');
const tombolFilter = document.querySelectorAll('.filter-btn');
const badgeJumlahKeranjang = document.getElementById('cartCountBadge');
const daftarItemKeranjang = document.getElementById('cartItemsList');
const tampilanTotalKeranjang = document.getElementById('cartTotalDisplay');
const tombolCheckoutWhatsApp = document.getElementById('checkoutWhatsAppBtn');
const namaPelanggan = document.getElementById('customerName');
const catatanPengiriman = document.getElementById('deliveryNotes');
const drawerKeranjang = document.getElementById('cartOffcanvas');

// Aturan bisnis: pesanan online minimal harus 10 pcs.
const PEMESANAN_MINIMAL = 10;

// Path fallback gambar jika gambar produk gagal dimuat.
const FALLBACK_IMAGE = 'images/default-pempek.svg';

// Menyimpan item yang sudah dipilih pelanggan sebelum checkout.
let keranjang = [];

// Menyimpan filter menu yang saat ini aktif, misalnya semua atau satu kategori.
let filterSaatIni = 'all';
let reviewSubmitCooldown = false;
let lastReviewSubmitTime = 0;
const REVIEW_COOLDOWN_MS = 5000;

// Mengubah angka biasa menjadi format rupiah yang bisa ditampilkan di halaman.
function formatHarga(nilai) {
  return `Rp ${Number(nilai).toLocaleString('id-ID')}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderUlasanHtml(ulasan, container) {
  if (!ulasan || ulasan.length === 0) {
    container.innerHTML = '<div class="col-12"><div class="alert alert-light rounded-4 border text-muted">Belum ada ulasan. Jadilah yang pertama menulis review untuk Pempek Wahid.</div></div>';
    return;
  }

  container.innerHTML = ulasan.map((item) => `
    <div class="col-12">
      <div class="card border-0 rounded-4 h-100 shadow-sm">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            <div>
              <h3 class="h6 fw-bold mb-1">${escapeHtml(item.name || 'Pelanggan')}</h3>
              <div class="text-warning small">${'⭐'.repeat(Number(item.rating || 5))}</div>
            </div>
            <span class="badge bg-danger-subtle text-danger rounded-pill">${item.rating || 5}/5</span>
          </div>
          <p class="text-muted small mb-2">${escapeHtml(item.comment || '')}</p>
          ${item.photoUrl
            ? `<img src="${escapeHtml(item.photoUrl)}" alt="Foto ulasan dari ${escapeHtml(item.name || 'Pelanggan')}" class="review-photo-thumb mb-2" width="300" height="180" loading="lazy">`
            : ''}
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

function muatUlasan() {
  const container = document.getElementById('reviewsContainer');
  if (!container) return;

  container.innerHTML = '<div class="col-12 text-center text-muted small py-3"><div class="spinner-border spinner-border-sm text-danger me-2" role="status"></div>Memuat ulasan terbaru...</div>';

  if (window.firebaseManager?.onSnapshotReviews) {
    window.firebaseManager.onSnapshotReviews((ulasan) => {
      renderUlasanHtml(ulasan, container);
    }, 4);
  } else {
    window.firebaseManager?.loadReviews?.(4).then((ulasan) => {
      renderUlasanHtml(ulasan, container);
    }).catch((error) => {
      console.error('[App] Gagal memuat ulasan:', error);
      container.innerHTML = '<div class="col-12"><div class="alert alert-warning rounded-4 border">Gagal memuat ulasan. Coba refresh halaman.</div></div>';
    });
  }
}

async function kirimUlasan(event) {
  event.preventDefault();

  const now = Date.now();
  if (reviewSubmitCooldown && now - lastReviewSubmitTime < REVIEW_COOLDOWN_MS) {
    tampilkanToast('Tunggu sebentar sebelum mengirim ulasan lagi.', 'danger');
    return;
  }

  // Anti-spam honeypot check
  const honeypot = document.getElementById('hp_website_url');
  if (honeypot && honeypot.value.trim() !== '') {
    console.warn('[Review] Spam terdeteksi melalui honeypot. Pengiriman dibatalkan.');
    return;
  }

  const form = document.getElementById('addReviewForm');
  const nama = document.getElementById('reviewerName')?.value?.trim();
  const rating = document.getElementById('reviewerRating')?.value;
  const komentar = document.getElementById('reviewerComment')?.value?.trim();

  if (!form || !nama || !komentar) return;

  reviewSubmitCooldown = true;
  lastReviewSubmitTime = now;

  const tombol = form.querySelector('button[type="submit"]');
  if (tombol) {
    tombol.disabled = true;
    tombol.innerHTML = '<span class="me-2"><i class="bi bi-cloud-arrow-up-fill" aria-hidden="true"></i></span>Menyimpan...';
  }

  try {
    const reviewPayload = {
      name: nama,
      rating: Number(rating || 5),
      comment: komentar
    };

    const hasil = await window.firebaseManager?.saveReview?.(reviewPayload);

    if (hasil?.ok) {
      form.reset();
      tampilkanToast('Ulasan berhasil dikirim dan tersimpan di Firestore.', 'success');
      await muatUlasan();
    } else {
      tampilkanToast(hasil?.error || 'Ulasan gagal dikirim. Periksa konfigurasi Firebase.', 'danger');
    }
  } catch (error) {
    console.error('[App] Gagal mengirim ulasan:', error);
    tampilkanToast('Terjadi kesalahan saat mengirim ulasan.', 'danger');
  } finally {
    if (tombol) {
      tombol.disabled = false;
      tombol.innerHTML = '<i class="bi bi-send-fill me-1" aria-hidden="true"></i> Kirim Ulasan';
    }
    setTimeout(() => {
      reviewSubmitCooldown = false;
    }, REVIEW_COOLDOWN_MS);
  }
}

// Menampilkan daftar produk ke dalam grid katalog.
function tampilkanProduk(itemProduk) {
  if (!gridProduk) return;

  // Bersihkan isi grid sebelum menampilkan produk baru.
  gridProduk.innerHTML = '';

  // Tampilkan pesan jika produk kosong (belum ada di Firestore)
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

  // Loop setiap produk lalu buat card HTML untuk tampilannya.
  itemProduk.forEach((produk) => {
    const kolom = document.createElement('div');
    kolom.className = 'col-sm-6 col-lg-4';

    const isSoldOut = Boolean(produk.isSoldOut);

    kolom.innerHTML = `
      <div class="card border-0 rounded-4 h-100 product-card${isSoldOut ? ' sold-out' : ''}">
        <div class="position-relative">
          <img src="${escapeHtml(produk.image || '')}" class="card-img-top rounded-top-4 product-image" alt="${escapeHtml(produk.name)}" width="300" height="220" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'">
          ${isSoldOut ? '<span class="badge-sold-out"><i class="bi bi-x-circle-fill me-1" aria-hidden="true"></i>Stok Habis</span>' : ''}
        </div>
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            <h3 class="h5 fw-bold mb-0">${escapeHtml(produk.name)}</h3>
            <span class="badge bg-danger-subtle text-danger rounded-pill">${formatHarga(produk.price)}</span>
          </div>
          <p class="text-muted small mb-3">${escapeHtml(produk.description || '')}</p>
          <div class="mt-auto d-flex gap-2">
            <button class="btn btn-outline-dark rounded-pill px-3 btn-sm detail-btn" data-id="${escapeHtml(String(produk.id))}" aria-label="Lihat detail ${escapeHtml(produk.name)}">Lihat Detail</button>
            <button class="btn btn-danger-custom rounded-pill px-3 btn-sm add-cart-btn" data-id="${escapeHtml(String(produk.id))}"${isSoldOut ? ' disabled title="Stok habis"' : ''} aria-label="Tambah ${escapeHtml(produk.name)} ke keranjang">
              ${isSoldOut ? '<i class="bi bi-x-circle me-1" aria-hidden="true"></i>Stok Habis' : 'Tambah'}
            </button>
          </div>
        </div>
      </div>
    `;

    gridProduk.appendChild(kolom);
  });

  // Setelah card dibuat, pasang event listener untuk tombol detail dan tambah.
  pasangAksiProduk();
}

// Menyambungkan tombol di card produk dengan fungsi yang tepat.
function pasangAksiProduk() {
  const tombolDetail = document.querySelectorAll('.detail-btn');
  const tombolTambah = document.querySelectorAll('.add-cart-btn');

  tombolDetail.forEach((button) => {
    button.addEventListener('click', () => {
      const produk = products.find((item) => String(item.id) === String(button.dataset.id));
      if (!produk) return;

      const judulModal = document.getElementById('modalTitle');
      const hargaModal = document.getElementById('modalPrice');
      const deskripsiModal = document.getElementById('modalDescription');
      const gambarModal = document.getElementById('modalImage');
      const tombolTambahModal = document.getElementById('modalAddToCartBtn');

      judulModal.textContent = produk.name;
      hargaModal.textContent = formatHarga(produk.price);
      deskripsiModal.textContent = produk.description || '';
      gambarModal.src = produk.image || FALLBACK_IMAGE;
      gambarModal.alt = produk.name;
      gambarModal.onerror = function () { this.onerror = null; this.src = FALLBACK_IMAGE; };
      tombolTambahModal.dataset.id = String(produk.id);

      if (produk.isSoldOut) {
        tombolTambahModal.disabled = true;
        tombolTambahModal.innerHTML = '<i class="bi bi-x-circle me-1" aria-hidden="true"></i> Stok Habis';
      } else {
        tombolTambahModal.disabled = false;
        tombolTambahModal.innerHTML = '<i class="bi bi-cart-plus me-1" aria-hidden="true"></i> Tambah Ke Keranjang';
      }

      const modal = new bootstrap.Modal(document.getElementById('productModal'));
      modal.show();
    });
  });

  tombolTambah.forEach((button) => {
    button.addEventListener('click', () => tambahKeKeranjang(String(button.dataset.id)));
  });
}

// Membuka panel keranjang dari sisi kanan layar.
function bukaDrawerKeranjang() {
  if (!drawerKeranjang) return;

  const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(drawerKeranjang);
  offcanvas.show();
}

// Menambahkan produk ke keranjang dan menghitung qty jika produk sudah ada.
function tambahKeKeranjang(idProduk) {
  const produk = products.find((item) => String(item.id) === String(idProduk));
  if (!produk) return;

  if (produk.isSoldOut) {
    tampilkanToast(`${produk.name} sedang tidak tersedia (stok habis).`, 'danger');
    return;
  }

  if (produk.name.toLowerCase().includes('kulit gepeng')) {
    tampilkanToast('Pempek kulit gepeng tidak tersedia untuk pemesanan online karena tidak direbus, sehingga lengket dan cepat basi.', 'danger');
    return;
  }

  const itemYangAda = keranjang.find((item) => String(item.id) === String(idProduk));
  const itemBaru = !itemYangAda;

  if (itemYangAda) {
    itemYangAda.qty += 1;
  } else {
    keranjang.push({ ...produk, qty: 1 });
  }

  tampilkanKeranjang();

  if (itemBaru) {
    bukaDrawerKeranjang();
  }

  tampilkanToast(`${produk.name} ditambahkan ke keranjang.`, 'success');
}

// Mengubah jumlah item di keranjang berdasarkan tombol plus atau minus.
function ubahJumlahKeranjang(idProduk, selisih) {
  const itemYangAda = keranjang.find((item) => String(item.id) === String(idProduk));
  if (!itemYangAda) return;

  itemYangAda.qty += selisih;

  if (itemYangAda.qty <= 0) {
    keranjang = keranjang.filter((item) => String(item.id) !== String(idProduk));
  }

  tampilkanKeranjang();
}

// Menampilkan isi keranjang di panel samping, termasuk total harga dan qty.
function tampilkanKeranjang() {
  if (!daftarItemKeranjang) return;

  daftarItemKeranjang.innerHTML = '';

  if (keranjang.length === 0) {
    daftarItemKeranjang.innerHTML = '<p class="text-muted small mb-0">Keranjang masih kosong.</p>';
    badgeJumlahKeranjang.textContent = '0';
    tampilanTotalKeranjang.textContent = 'Rp 0';
    return;
  }

  keranjang.forEach((item) => {
    const barisItem = document.createElement('div');
    barisItem.className = 'd-flex justify-content-between align-items-center border-bottom py-2 gap-3';
    barisItem.innerHTML = `
      <div>
        <div class="fw-semibold">${escapeHtml(item.name)}</div>
        <small class="text-muted">${formatHarga(item.price)} / pcs</small>
      </div>
      <div class="d-flex align-items-center gap-2">
        <button type="button" class="btn btn-sm btn-outline-danger rounded-circle" data-cart-action="decrease" data-id="${escapeHtml(String(item.id))}" aria-label="Kurangi qty ${escapeHtml(item.name)}">-</button>
        <span class="fw-bold text-dark min-width-qty">${item.qty}</span>
        <button type="button" class="btn btn-sm btn-outline-danger rounded-circle" data-cart-action="increase" data-id="${escapeHtml(String(item.id))}" aria-label="Tambah qty ${escapeHtml(item.name)}">+</button>
      </div>
      <div class="fw-bold text-danger-custom">${formatHarga(item.price * item.qty)}</div>
    `;
    daftarItemKeranjang.appendChild(barisItem);
  });

  const totalQty = keranjang.reduce((sum, item) => sum + item.qty, 0);
  const total = keranjang.reduce((sum, item) => sum + item.price * item.qty, 0);
  badgeJumlahKeranjang.textContent = String(totalQty);
  tampilanTotalKeranjang.textContent = formatHarga(total);

  if (totalQty < PEMESANAN_MINIMAL) {
    const pemberitahuanMinimal = document.createElement('div');
    pemberitahuanMinimal.className = 'alert alert-danger rounded-3 small mt-3 mb-0';
    pemberitahuanMinimal.innerHTML = `Minimum pemesanan adalah <strong>${PEMESANAN_MINIMAL} pcs</strong>. Saat ini anda baru memilih <strong>${totalQty} pcs</strong>.`;
    daftarItemKeranjang.appendChild(pemberitahuanMinimal);
  }
}

// Mengatur tampilan toast agar menampilkan pesan sukses atau peringatan.
function tampilkanToast(pesan, tipe = 'success') {
  const pesanToast = document.getElementById('toastMessage');
  const toastKeranjang = document.getElementById('cartToast');
  const ikonToast = document.getElementById('toastIcon');
  if (!pesanToast || !toastKeranjang || !ikonToast) return;

  toastKeranjang.classList.remove('text-bg-success', 'text-bg-danger');
  toastKeranjang.classList.add(tipe === 'danger' ? 'text-bg-danger' : 'text-bg-success');
  ikonToast.className = tipe === 'danger' ? 'bi bi-exclamation-triangle-fill fs-5' : 'bi bi-check-circle-fill fs-5';
  pesanToast.textContent = pesan;
  const toast = new bootstrap.Toast(toastKeranjang);
  toast.show();
}

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

// Mencari produk berdasarkan input pencarian dan filter kategori aktif.
function filterProduk() {
  const kataKunci = inputCari?.value.toLowerCase().trim() || '';

  const hasilFilter = products.filter((produk) => {
    const cocokPencarian = produk.name.toLowerCase().includes(kataKunci);
    const cocokKategori = filterSaatIni === 'all' || produk.category === filterSaatIni;
    return cocokPencarian && cocokKategori;
  });

  tampilkanProduk(hasilFilter);
}

if (inputCari) {
  inputCari.addEventListener('input', filterProduk);
}

tombolFilter.forEach((button) => {
  button.addEventListener('click', () => {
    filterSaatIni = button.dataset.category;
    tombolFilter.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
    filterProduk();
  });
});

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

document.addEventListener('DOMContentLoaded', () => {
  const checkedInput = document.querySelector('input[name="deliveryMethod"]:checked');
  if (checkedInput) {
    checkedInput.closest('.delivery-option-card')?.classList.add('delivery-option-cardHasChecked');
  }
});

document.getElementById('modalAddToCartBtn')?.addEventListener('click', () => {
  const idProduk = String(document.getElementById('modalAddToCartBtn').dataset.id);
  tambahKeKeranjang(idProduk);
  bootstrap.Modal.getInstance(document.getElementById('productModal'))?.hide();
});

document.getElementById('addReviewForm')?.addEventListener('submit', kirimUlasan);

document.getElementById('shareWebsiteBtn')?.addEventListener('click', async () => {
  const shareData = {
    title: 'Pempek Wahid - Ikan Kakap Asli Rp 1.000',
    text: 'Coba Pempek Wahid! Pempek ikan kakap asli Palembang yang murah, lemak, dan besak. Cuko kental khas Palembang!',
    url: window.location.href
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(window.location.href);
      tampilkanToast('Tautan berhasil disalin ke clipboard!', 'success');
    }
  } catch (error) {
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

tombolCheckoutWhatsApp?.addEventListener('click', () => {
  if (keranjang.length === 0) {
    tampilkanToast('Keranjang masih kosong. Tambahkan pempek sebelum checkout.', 'danger');
    bukaDrawerKeranjang();
    return;
  }

  const totalQty = keranjang.reduce((sum, item) => sum + item.qty, 0);
  if (totalQty < PEMESANAN_MINIMAL) {
    tampilkanToast(`Minimum pemesanan adalah ${PEMESANAN_MINIMAL} pcs. Saat ini anda baru memilih ${totalQty} pcs.`, 'danger');
    bukaDrawerKeranjang();
    return;
  }

  const metodePengiriman = document.querySelector('input[name="deliveryMethod"]:checked')?.value || 'ambil_sendiri';
  const labelMetode = metodePengiriman === 'ambil_sendiri'
    ? '🏪 Ambil Sendiri ke Outlet'
    : '🚗 Kirim via Kurir/Ojol (Ongkir Ditanggung Pembeli)';

  const daftarPesanan = keranjang.map((item) => `- ${item.name} x${item.qty}`).join('\n');
  const total = keranjang.reduce((sum, item) => sum + item.price * item.qty, 0);
  const nama = namaPelanggan?.value || 'Pelanggan';
  const catatan = catatanPengiriman?.value || '-';

  const pesan = encodeURIComponent(
    `Halo Pempek Wahid, saya ingin melakukan pemesanan.\n\n\n${daftarPesanan}\n\n- Nama: ${nama}\n- Metode Pengiriman: ${labelMetode}\n- Alamat Lengkap: ${catatan}\n- Nomor HP: \n- Pesanan: \n- Total: ${formatHarga(total)}\n\nMohon untuk dikonfirmasi kembali terkait pesanan dan total pembayaran.\n\n*Catatan:* Untuk pemesanan di area sekitar Palembang, pempek disiapkan dalam kondisi *rebus (tidak digoreng)* untuk menjaga kualitas selama pengantaran. Pempek Kulit Gepeng tidak tersedia untuk pemesanan online karena tidak direbus, sehingga lebih mudah lengket dan cepat basi.`
  );
  window.open(`https://wa.me/6288287041072?text=${pesan}`, '_blank', 'noopener,noreferrer');
});

let storeStatusManager = null;

function initStoreStatus() {
  if (typeof window.StoreStatusManager === 'function') {
    storeStatusManager = new window.StoreStatusManager();
    const initialStatus = storeStatusManager.determineStatus(window.currentStoreStatus || {});
    storeStatusManager.updateUI(initialStatus);
    storeStatusManager.startMonitoring();

    if (window.firebaseManager?.onSnapshotStoreStatus) {
      window.firebaseManager.onSnapshotStoreStatus((statusData) => {
        window.currentStoreStatus = statusData || {};
        const statusObj = storeStatusManager.determineStatus(window.currentStoreStatus);
        storeStatusManager.updateUI(statusObj);
      });
    }
  }
}

async function initApp() {
  console.log('[App] Inisialisasi aplikasi...');
  initStoreStatus();

  if (gridProduk) {
    gridProduk.innerHTML = '<div class="col-12 text-center text-muted py-5"><div class="spinner-border text-danger me-2" role="status"></div><br>Memuat katalog menu Pempek Wahid...</div>';
  }

  try {
    const firestoreProducts = await window.firebaseManager?.loadMenu?.();
    if (firestoreProducts && firestoreProducts.length > 0) {
      products = firestoreProducts;
      console.log('[App] Produk dimuat dari Firestore:', products.length, 'item');
    } else {
      console.log('[App] Menggunakan katalog default (termasuk Pempek Pistel)');
      products = [...DEFAULT_PRODUCTS];
    }
  } catch (e) {
    console.warn('[App] Firebase offline / error, memuat katalog standar:', e);
    products = [...DEFAULT_PRODUCTS];
  }

  tampilkanProduk(products);
  tampilkanKeranjang();
  muatUlasan();
}

if (document.readyState === 'complete') {
  initApp();
} else {
  window.addEventListener('load', initApp);
}
