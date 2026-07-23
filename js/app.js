const products = [
  {
    id: 1,
    name: 'Pempek Bulat',
    category: 'satuan',
    price: 1000,
    image: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=800&q=80',
    description: 'Pempek bulat lembut yang dibuat dari daging ikan kakap segar, cocok untuk camilan harian.',
  },
  {
    id: 2,
    name: 'Pempek Kulit Gepeng',
    category: 'satuan',
    price: 1000,
    image: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=800&q=80',
    description: 'Pempek kulit gepeng khas ikan kakap, tekstur kenyal dengan cita rasa gurih yang pas.',
  },
  {
    id: 3,
    name: 'Pempek Kulit Lenjer',
    category: 'satuan',
    price: 1000,
    image: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=800&q=80',
    description: 'Pempek kulit lenjer berbahan ikan kakap pilihan, rasanya gurih dan tetap lembut.',
  },
  {
    id: 4,
    name: 'Pempek Lenjer Putih',
    category: 'satuan',
    price: 1000,
    image: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=800&q=80',
    description: 'Pempek lenjer putih dengan daging ikan kakap murni, cocok untuk sajian keluarga.',
  },
  {
    id: 5,
    name: 'Pempek Telur',
    category: 'satuan',
    price: 1000,
    image: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=800&q=80',
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
const cukoOption = document.getElementById('cukoOption');
const customerName = document.getElementById('customerName');
const deliveryNotes = document.getElementById('deliveryNotes');

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

function addToCart(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  const existing = cart.find((item) => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  renderCart();
  showToast(`${product.name} ditambahkan ke keranjang.`);
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
    itemRow.className = 'd-flex justify-content-between align-items-center border-bottom py-2';
    itemRow.innerHTML = `
      <div>
        <div class="fw-semibold">${item.name}</div>
        <small class="text-muted">${item.qty} pcs • ${formatPrice(item.price)}</small>
      </div>
      <div class="fw-bold text-danger">${formatPrice(item.price * item.qty)}</div>
    `;
    cartItemsList.appendChild(itemRow);
  });

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  cartCountBadge.textContent = String(cart.reduce((sum, item) => sum + item.qty, 0));
  cartTotalDisplay.textContent = formatPrice(total);
}

function showToast(message) {
  const toastMessage = document.getElementById('toastMessage');
  const cartToast = document.getElementById('cartToast');
  if (!toastMessage || !cartToast) return;

  toastMessage.textContent = message;
  const toast = new bootstrap.Toast(cartToast);
  toast.show();
}

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
  const itemList = cart.map((item) => `${item.name} x${item.qty}`).join(', ');
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cuko = cukoOption?.value || 'Pedas Sedang (Standar)';
  const nama = customerName?.value || 'Pelanggan';
  const catatan = deliveryNotes?.value || '-';
  const message = encodeURIComponent(
    `Halo Pempek Wahid, saya ingin pesan:\n- ${itemList || 'Belum ada item'}\n- Cuko: ${cuko}\n- Nama: ${nama}\n- Catatan: ${catatan}\n- Total: ${formatPrice(total)}`
  );
  window.open(`https://wa.me/6281234567890?text=${message}`, '_blank');
});

renderProducts(products);
renderCart();
