// Array utama yang berisi data semua produk yang ditampilkan di katalog.
const products = [
  {
    id: 1,
    name: 'Pempek Bulat',
    category: 'satuan',
    price: 1000,
    image: 'images/pempek_bulat.jpg',
    description: 'Pempek bulat lembut yang dibuat dari daging ikan kakap segar, cocok untuk camilan harian.',
  },
  {
    id: 2,
    name: 'Pempek Kulit Gepeng',
    category: 'satuan',
    price: 1000,
    image: 'images/pempek_kulit_gepeng.jpg',
    description: 'Pempek kulit gepeng khas ikan kakap, tekstur kenyal dengan cita rasa gurih yang pas.',
  },
  {
    id: 3,
    name: 'Pempek Kulit Lenjer',
    category: 'satuan',
    price: 1000,
    image: 'images/pempek_kulit_lenjer.jpg',
    description: 'Pempek kulit lenjer berbahan ikan kakap pilihan, rasanya gurih dan tetap lembut.',
  },
  {
    id: 4,
    name: 'Pempek Lenjer Putih',
    category: 'satuan',
    price: 1000,
    image: 'images/pempek_lenjer_putih.jpg',
    description: 'Pempek lenjer putih dengan daging ikan kakap murni, cocok untuk sajian keluarga.',
  },
  {
    id: 5,
    name: 'Pempek Telur',
    category: 'satuan',
    price: 1000,
    image: 'images/pempek_telur.jpg',
    description: 'Pempek Telur Ikan Kakap yang gurih, lembut, dan siap jadi favorit pelanggan.',
  },
];

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
const formUlasan = document.getElementById('addReviewForm');
const inputReviewerName = document.getElementById('reviewerName');
const inputReviewerRating = document.getElementById('reviewerRating');
const inputReviewerComment = document.getElementById('reviewerComment');
const reviewsContainer = document.getElementById('reviewsContainer');

// Kunci penyimpanan review sederhana di browser.
const REVIEW_STORAGE_KEY = 'pempek-wahid-reviews';

// Aturan bisnis: pesanan online minimal harus 10 pcs.
const PEMESANAN_MINIMAL = 10;

// Menyimpan item yang sudah dipilih pelanggan sebelum checkout.
let keranjang = [];

// Menyimpan filter menu yang saat ini aktif, misalnya semua atau satu kategori.
let filterSaatIni = 'all';

// Mengubah angka biasa menjadi format rupiah yang bisa ditampilkan di halaman.
function formatHarga(nilai) {
  return `Rp ${nilai.toLocaleString('id-ID')}`;
}

// Menampilkan daftar produk ke dalam grid katalog.
function tampilkanProduk(itemProduk) {
  if (!gridProduk) return;

  // Bersihkan isi grid sebelum menampilkan produk baru.
  gridProduk.innerHTML = '';

  // Loop setiap produk lalu buat card HTML untuk tampilannya.
  itemProduk.forEach((produk) => {
    const kolom = document.createElement('div');
    kolom.className = 'col-sm-6 col-lg-4';

    kolom.innerHTML = `
      <div class="card border-0 shadow-sm rounded-4 h-100 product-card">
        <img src="${produk.image}" class="card-img-top rounded-top-4 product-image" alt="${produk.name}">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            <h5 class="fw-bold mb-0">${produk.name}</h5>
            <span class="badge bg-danger-subtle text-danger rounded-pill">${formatHarga(produk.price)}</span>
          </div>
          <p class="text-muted small mb-3">${produk.description}</p>
          <div class="mt-auto d-flex gap-2">
            <button class="btn btn-outline-dark rounded-pill px-3 btn-sm detail-btn" data-id="${produk.id}">Lihat Detail</button>
            <button class="btn btn-danger-custom rounded-pill px-3 btn-sm add-cart-btn" data-id="${produk.id}">Tambah</button>
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
      const produk = products.find((item) => item.id === Number(button.dataset.id));
      if (!produk) return;

      const judulModal = document.getElementById('modalTitle');
      const hargaModal = document.getElementById('modalPrice');
      const deskripsiModal = document.getElementById('modalDescription');
      const gambarModal = document.getElementById('modalImage');
      const tombolTambahModal = document.getElementById('modalAddToCartBtn');

      judulModal.textContent = produk.name;
      hargaModal.textContent = formatHarga(produk.price);
      deskripsiModal.textContent = produk.description;
      gambarModal.src = produk.image;
      gambarModal.alt = produk.name;
      tombolTambahModal.dataset.id = produk.id;

      const modal = new bootstrap.Modal(document.getElementById('productModal'));
      modal.show();
    });
  });

  tombolTambah.forEach((button) => {
    button.addEventListener('click', () => tambahKeKeranjang(Number(button.dataset.id)));
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
  const produk = products.find((item) => item.id === idProduk);
  if (!produk) return;

  if (produk.name.toLowerCase().includes('kulit gepeng')) {
    tampilkanToast('Pempek kulit gepeng tidak tersedia untuk pemesanan online karena tidak direbus, sehingga lengket dan cepat basi.', 'danger');
    return;
  }

  // Cek apakah produk itu sudah ada di keranjang atau merupakan item baru.
  const itemYangAda = keranjang.find((item) => item.id === idProduk);
  const itemBaru = !itemYangAda;

  if (itemYangAda) {
    itemYangAda.qty += 1;
  } else {
    keranjang.push({ ...produk, qty: 1 });
  }

  // Tampilkan update keranjang secara real time.
  tampilkanKeranjang();

  // Hanya buka drawer jika produk baru pertama kali ditambahkan.
  if (itemBaru) {
    bukaDrawerKeranjang();
  }

  tampilkanToast(`${produk.name} ditambahkan ke keranjang.`, 'success');
}

// Mengubah jumlah item di keranjang berdasarkan tombol plus atau minus.
function ubahJumlahKeranjang(idProduk, selisih) {
  const itemYangAda = keranjang.find((item) => item.id === idProduk);
  if (!itemYangAda) return;

  itemYangAda.qty += selisih;

  if (itemYangAda.qty <= 0) {
    keranjang = keranjang.filter((item) => item.id !== idProduk);
  }

  tampilkanKeranjang();
}

// Menampilkan isi keranjang di panel samping, termasuk total harga dan qty.
function tampilkanKeranjang() {
  if (!daftarItemKeranjang) return;

  // Kosongkan dahulu agar isi terbaru bisa ditulis ulang.
  daftarItemKeranjang.innerHTML = '';

  if (keranjang.length === 0) {
    daftarItemKeranjang.innerHTML = '<p class="text-muted small mb-0">Keranjang masih kosong.</p>';
    badgeJumlahKeranjang.textContent = '0';
    tampilanTotalKeranjang.textContent = 'Rp 0';
    return;
  }

  // Buat satu baris untuk tiap item keranjang.
  keranjang.forEach((item) => {
    const barisItem = document.createElement('div');
    barisItem.className = 'd-flex justify-content-between align-items-center border-bottom py-2 gap-3';
    barisItem.innerHTML = `
      <div>
        <div class="fw-semibold">${item.name}</div>
        <small class="text-muted">${formatHarga(item.price)} / pcs</small>
      </div>
      <div class="d-flex align-items-center gap-2">
        <button type="button" class="btn btn-sm btn-outline-danger rounded-circle" data-cart-action="decrease" data-id="${item.id}" aria-label="Kurangi qty">-</button>
        <span class="fw-bold text-dark min-width-qty">${item.qty}</span>
        <button type="button" class="btn btn-sm btn-outline-danger rounded-circle" data-cart-action="increase" data-id="${item.id}" aria-label="Tambah qty">+</button>
      </div>
      <div class="fw-bold text-danger">${formatHarga(item.price * item.qty)}</div>
    `;
    daftarItemKeranjang.appendChild(barisItem);
  });

  // Hitung total qty dan total harga dari seluruh item di keranjang.
  const totalQty = keranjang.reduce((sum, item) => sum + item.qty, 0);
  const total = keranjang.reduce((sum, item) => sum + item.price * item.qty, 0);
  badgeJumlahKeranjang.textContent = String(totalQty);
  tampilanTotalKeranjang.textContent = formatHarga(total);

  // Jika qty masih di bawah minimum, tampilkan notifikasi agar pelanggan tahu.
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

function simpanReview(review) {
  const reviews = JSON.parse(localStorage.getItem(REVIEW_STORAGE_KEY) || '[]');
  reviews.unshift(review);
  localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(reviews.slice(0, 20)));
}

function ambilSemuaReview() {
  return JSON.parse(localStorage.getItem(REVIEW_STORAGE_KEY) || '[]');
}

function tampilkanReview() {
  if (!reviewsContainer) return;

  const reviews = ambilSemuaReview();
  if (!reviews.length) {
    reviewsContainer.innerHTML = '<div class="col-12"><div class="card border-0 shadow-sm rounded-4 p-4 bg-white text-center"><p class="mb-0 text-muted">Belum ada ulasan. Jadilah yang pertama memberi penilaian!</p></div></div>';
    return;
  }

  reviewsContainer.innerHTML = reviews.map((review) => `
    <div class="col-md-6">
      <div class="card border-0 shadow-sm rounded-4 p-4 bg-white h-100">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h6 class="fw-bold mb-1">${review.name}</h6>
            <small class="text-muted">${new Date(review.date).toLocaleDateString('id-ID')}</small>
          </div>
          <span class="badge bg-warning text-dark rounded-pill">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>
        </div>
        <p class="text-muted small mb-0">${review.comment}</p>
      </div>
    </div>
  `).join('');
}

daftarItemKeranjang?.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-cart-action]');
  if (!button) return;

  const idProduk = Number(button.dataset.id);
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

// Saat pengguna mengetik di pencarian, langsung filter daftar produk.
if (inputCari) {
  inputCari.addEventListener('input', filterProduk);
}

// Saat tombol kategori diklik, ubah filter dan tampilkan produk yang cocok.
tombolFilter.forEach((button) => {
  button.addEventListener('click', () => {
    filterSaatIni = button.dataset.category;
    tombolFilter.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
    filterProduk();
  });
});

// Saat tombol tambah dari modal ditekan, ambil id produk lalu masukkan ke keranjang.
document.getElementById('modalAddToCartBtn')?.addEventListener('click', () => {
  const idProduk = Number(document.getElementById('modalAddToCartBtn').dataset.id);
  tambahKeKeranjang(idProduk);
  bootstrap.Modal.getInstance(document.getElementById('productModal'))?.hide();
});

// Saat tombol checkout di klik, cek syarat minimum order lalu kirim pesanan ke WhatsApp.
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

  const daftarPesanan = keranjang.map((item) => `- ${item.name} x${item.qty}`).join('\n');
  const total = keranjang.reduce((sum, item) => sum + item.price * item.qty, 0);
  const nama = namaPelanggan?.value || 'Pelanggan';
  const catatan = catatanPengiriman?.value || '-';
  const pesan = encodeURIComponent(
    `Halo Pempek Wahid, saya ingin melakukan pemesanan.\n\n\n${daftarPesanan}\n\n- Nama: ${nama}\n- Alamat Lengkap: ${catatan}\n- Nomor HP: \n- Pesanan: \n- Total: ${formatHarga(total)}\n\nMohon untuk dikonfirmasi kembali terkait pesanan dan total pembayaran.\n\n*Catatan:* Seluruh pemesanan yang dilakukan secara online dikirim dalam kondisi *pempek rebus (tidak digoreng)* untuk menjaga kualitas dan ketahanan produk selama pengiriman. Pempek Kulit Gepeng tidak tersedia untuk pemesanan online karena tidak direbus, sehingga lebih mudah lengket dan cepat basi.`
  );
  window.open(`https://wa.me/6288287041072?text=${pesan}`, '_blank');
});

formUlasan?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!inputReviewerName || !inputReviewerRating || !inputReviewerComment) return;

  const review = {
    name: inputReviewerName.value.trim() || 'Anonim',
    rating: Number(inputReviewerRating.value) || 5,
    comment: inputReviewerComment.value.trim(),
    date: new Date().toISOString(),
  };

  if (!review.comment) {
    tampilkanToast('Mohon isi komentar ulasan terlebih dahulu.', 'danger');
    return;
  }

  simpanReview(review);
  tampilkanReview();
  formUlasan.reset();
  tampilkanToast('Ulasan berhasil disimpan.', 'success');
});

tampilkanProduk(products);
tampilkanKeranjang();
tampilkanReview();
