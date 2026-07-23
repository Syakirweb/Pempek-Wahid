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
    description: 'Pempek telur ikan kakap yang gurih, lembut, dan siap jadi favorit pelanggan.',
  },
];

const productGrid = document.getElementById('productGrid');
const searchInput = document.getElementById('searchInput');
const filterButtons = document.querySelectorAll('.filter-btn');
const cartCountBadge = document.getElementById('cartCountBadge');
const cartItemsList = document.getElementById('cartItemsList');
const cartTotalDisplay = document.getElementById('cartTotalDisplay');
const checkoutWhatsAppBtn = document.getElementById('checkoutWhatsAppBtn');
const customerName = document.getElementById('customerName');
const deliveryNotes = document.getElementById('deliveryNotes');
const cartOffcanvas = document.getElementById('cartOffcanvas');

const MINIMUM_ORDER = 10;

let cart = [];
let currentFilter = 'all';

function formatPrice(value) {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

function renderProducts(items) {
  if (!productGrid) return;

  productGrid.innerHTML = '';

  items.forEach((product) => {
    const col = document.createElement('div');
    col.className = 'col-sm-6 col-lg-4';

    col.innerHTML = `
      <div class="card border-0 shadow-sm rounded-4 h-100 product-card">
        <img src="${product.image}" class="card-img-top rounded-top-4 product-image" alt="${product.name}">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            <h5 class="fw-bold mb-0">${product.name}</h5>
            <span class="badge bg-danger-subtle text-danger rounded-pill">${formatPrice(product.price)}</span>
          </div>
          <p class="text-muted small mb-3">${product.description}</p>
          <div class="mt-auto d-flex gap-2">
            <button class="btn btn-outline-dark rounded-pill px-3 btn-sm detail-btn" data-id="${product.id}">Lihat Detail</button>
            <button class="btn btn-danger-custom rounded-pill px-3 btn-sm add-cart-btn" data-id="${product.id}">Tambah</button>
          </div>
        </div>
      </div>
    `;

    productGrid.appendChild(col);
  });

  attachProductActions();
}

function attachProductActions() {
  const detailButtons = document.querySelectorAll('.detail-btn');
  const addButtons = document.querySelectorAll('.add-cart-btn');

  detailButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const product = products.find((item) => item.id === Number(button.dataset.id));
      if (!product) return;

      const modalTitle = document.getElementById('modalTitle');
      const modalPrice = document.getElementById('modalPrice');
      const modalDescription = document.getElementById('modalDescription');
      const modalImage = document.getElementById('modalImage');
      const modalAddToCartBtn = document.getElementById('modalAddToCartBtn');

      modalTitle.textContent = product.name;
      modalPrice.textContent = formatPrice(product.price);
      modalDescription.textContent = product.description;
      modalImage.src = product.image;
      modalImage.alt = product.name;
      modalAddToCartBtn.dataset.id = product.id;

      const modal = new bootstrap.Modal(document.getElementById('productModal'));
      modal.show();
    });
  });

  addButtons.forEach((button) => {
    button.addEventListener('click', () => addToCart(Number(button.dataset.id)));
  });
}

function openCartDrawer() {
  if (!cartOffcanvas) return;

  const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(cartOffcanvas);
  offcanvas.show();
}

function addToCart(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  if (product.name.toLowerCase().includes('kulit gepeng')) {
    showToast('Pempek kulit gepeng tidak tersedia untuk pemesanan online karena tidak direbus, sehingga lengket dan cepat basi.', 'danger');
    return;
  }

  const existing = cart.find((item) => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  renderCart();
  openCartDrawer();
  showToast(`${product.name} ditambahkan ke keranjang.`, 'success');
}

function changeCartQty(productId, delta) {
  const existing = cart.find((item) => item.id === productId);
  if (!existing) return;

  existing.qty += delta;

  if (existing.qty <= 0) {
    cart = cart.filter((item) => item.id !== productId);
  }

  renderCart();
}

function renderCart() {
  if (!cartItemsList) return;

  cartItemsList.innerHTML = '';

  if (cart.length === 0) {
    cartItemsList.innerHTML = '<p class="text-muted small mb-0">Keranjang masih kosong.</p>';
    cartCountBadge.textContent = '0';
    cartTotalDisplay.textContent = 'Rp 0';
    return;
  }

  cart.forEach((item) => {
    const itemRow = document.createElement('div');
    itemRow.className = 'd-flex justify-content-between align-items-center border-bottom py-2 gap-3';
    itemRow.innerHTML = `
      <div>
        <div class="fw-semibold">${item.name}</div>
        <small class="text-muted">${formatPrice(item.price)} / pcs</small>
      </div>
      <div class="d-flex align-items-center gap-2">
        <button type="button" class="btn btn-sm btn-outline-danger rounded-circle" data-cart-action="decrease" data-id="${item.id}" aria-label="Kurangi qty">-</button>
        <span class="fw-bold text-dark min-width-qty">${item.qty}</span>
        <button type="button" class="btn btn-sm btn-outline-danger rounded-circle" data-cart-action="increase" data-id="${item.id}" aria-label="Tambah qty">+</button>
      </div>
      <div class="fw-bold text-danger">${formatPrice(item.price * item.qty)}</div>
    `;
    cartItemsList.appendChild(itemRow);
  });

  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  cartCountBadge.textContent = String(totalQty);
  cartTotalDisplay.textContent = formatPrice(total);

  if (totalQty < MINIMUM_ORDER) {
    const minimumNotice = document.createElement('div');
    minimumNotice.className = 'alert alert-danger rounded-3 small mt-3 mb-0';
    minimumNotice.innerHTML = `Minimum pemesanan adalah <strong>${MINIMUM_ORDER} pcs</strong>. Saat ini anda baru memilih <strong>${totalQty} pcs</strong>.`;
    cartItemsList.appendChild(minimumNotice);
  }
}

function showToast(message, type = 'success') {
  const toastMessage = document.getElementById('toastMessage');
  const cartToast = document.getElementById('cartToast');
  const toastIcon = document.getElementById('toastIcon');
  if (!toastMessage || !cartToast || !toastIcon) return;

  cartToast.classList.remove('text-bg-success', 'text-bg-danger');
  cartToast.classList.add(type === 'danger' ? 'text-bg-danger' : 'text-bg-success');
  toastIcon.className = type === 'danger' ? 'bi bi-exclamation-triangle-fill fs-5' : 'bi bi-check-circle-fill fs-5';
  toastMessage.textContent = message;
  const toast = new bootstrap.Toast(cartToast);
  toast.show();
}

cartItemsList?.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-cart-action]');
  if (!button) return;

  const productId = Number(button.dataset.id);
  const action = button.dataset.cartAction;

  if (action === 'increase') {
    changeCartQty(productId, 1);
  }

  if (action === 'decrease') {
    changeCartQty(productId, -1);
  }
});

function filterProducts() {
  const keyword = searchInput?.value.toLowerCase().trim() || '';

  const filtered = products.filter((product) => {
    const matchSearch = product.name.toLowerCase().includes(keyword);
    const matchCategory = currentFilter === 'all' || product.category === currentFilter;
    return matchSearch && matchCategory;
  });

  renderProducts(filtered);
}

if (searchInput) {
  searchInput.addEventListener('input', filterProducts);
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.category;
    filterButtons.forEach((btn) => btn.classList.remove('active'));
    button.classList.add('active');
    filterProducts();
  });
});

document.getElementById('modalAddToCartBtn')?.addEventListener('click', () => {
  const productId = Number(document.getElementById('modalAddToCartBtn').dataset.id);
  addToCart(productId);
  bootstrap.Modal.getInstance(document.getElementById('productModal'))?.hide();
});

checkoutWhatsAppBtn?.addEventListener('click', () => {
  if (cart.length === 0) {
    showToast('Keranjang masih kosong. Tambahkan pempek sebelum checkout.', 'danger');
    openCartDrawer();
    return;
  }

  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  if (totalQty < MINIMUM_ORDER) {
    showToast(`Minimum pemesanan adalah ${MINIMUM_ORDER} pcs. Saat ini anda baru memilih ${totalQty} pcs.`, 'danger');
    openCartDrawer();
    return;
  }

  const itemList = cart.map((item) => `- ${item.name} x${item.qty}`).join('\n');
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const nama = customerName?.value || 'Pelanggan';
  const catatan = deliveryNotes?.value || '-';
  const message = encodeURIComponent(
    `Halo Pempek Wahid, saya ingin melakukan pemesanan.\n\n\n${itemList}\n\n- Nama: ${nama}\n- Alamat Lengkap: ${catatan}\n- Nomor HP: \n- Pesanan: \n- Total: ${formatPrice(total)}\n\nMohon untuk dikonfirmasi kembali terkait pesanan dan total pembayaran.\n\n*Catatan:* Seluruh pemesanan yang dilakukan secara online dikirim dalam kondisi *pempek rebus (tidak digoreng)* untuk menjaga kualitas dan ketahanan produk selama pengiriman. Pempek Kulit Gepeng tidak tersedia untuk pemesanan online karena tidak direbus, sehingga lebih mudah lengket dan cepat basi.`
  );
  window.open(`https://wa.me/6288287041072?text=${message}`, '_blank');
});

renderProducts(products);
renderCart();
