let selectedRating = 5;
let isSubmitting = false;
let reviewListCache = [];

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function initStarRatingPicker() {
  const starContainer = document.getElementById('starRatingPicker');
  if (!starContainer) return;

  const stars = starContainer.querySelectorAll('.star-icon');
  const ratingInput = document.getElementById('reviewerRating');

  function updateStars(rating) {
    selectedRating = rating;
    if (ratingInput) ratingInput.value = rating;

    stars.forEach((star) => {
      const starVal = Number(star.dataset.value);
      if (starVal <= rating) {
        star.classList.remove('bi-star', 'text-muted');
        star.classList.add('bi-star-fill', 'text-warning');
      } else {
        star.classList.remove('bi-star-fill', 'text-warning');
        star.classList.add('bi-star', 'text-muted');
      }
    });

    const ratingLabel = document.getElementById('ratingTextLabel');
    if (ratingLabel) {
      const labels = {
        5: '⭐⭐⭐⭐⭐ (5/5) Sempurna & Lezat!',
        4: '⭐⭐⭐⭐ (4/5) Enak Banget',
        3: '⭐⭐⭐ (3/5) Cukup Baik',
        2: '⭐⭐ (2/5) Perlu Ditingkatkan',
        1: '⭐ (1/5) Kurang Puas'
      };
      ratingLabel.textContent = labels[rating] || `${rating}/5`;
    }
  }

  stars.forEach((star) => {
    star.addEventListener('click', () => {
      const val = Number(star.dataset.value);
      updateStars(val);
    });

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

  starContainer.addEventListener('mouseleave', () => {
    updateStars(selectedRating);
  });

  updateStars(5);
}

function updateReviewStats(ulasan) {
  const totalEl = document.getElementById('statTotalReviews');
  const avgEl = document.getElementById('statAvgRating');
  const starsEl = document.getElementById('statAvgStars');
  const repliedEl = document.getElementById('statRepliedCount');

  if (totalEl) totalEl.textContent = ulasan.length;

  if (ulasan.length > 0) {
    const sum = ulasan.reduce((acc, item) => acc + (Number(item.rating) || 5), 0);
    const avg = (sum / ulasan.length).toFixed(1);
    if (avgEl) avgEl.textContent = avg;
    if (starsEl) {
      const numStars = Math.round(Number(avg));
      starsEl.innerHTML = '⭐'.repeat(numStars);
    }
  } else {
    if (avgEl) avgEl.textContent = '0.0';
    if (starsEl) starsEl.innerHTML = '⭐⭐⭐⭐⭐';
  }

  if (repliedEl) {
    const count = ulasan.filter((item) => item.reply).length;
    repliedEl.textContent = count;
  }
}

function renderReviews(ulasan) {
  const container = document.getElementById('allReviewsContainer');
  if (!container) return;

  if (!ulasan || ulasan.length === 0) {
    container.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="card border-0 shadow-sm rounded-4 p-5">
          <i class="bi bi-chat-left-quote fs-1 text-muted mb-3 d-block"></i>
          <h5 class="fw-bold">Belum Ada Ulasan yang Cocok</h5>
          <p class="text-muted small">Coba ubah kata kunci pencarian atau filter yang Anda pilih.</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = ulasan.map((item) => {
    const formattedDate = item.createdAt?.toDate
      ? new Date(item.createdAt.toDate()).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      : 'Baru saja';

    return `
      <div class="col-12 col-md-6 mb-3">
        <div class="card border-0 shadow-sm rounded-4 h-100 review-card">
          <div class="card-body p-4 d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
              <div class="d-flex align-items-center gap-2">
                <div class="avatar-circle bg-danger-subtle text-danger fw-bold rounded-circle d-flex align-items-center justify-content-center" style="width:40px; height:40px;">
                  ${(item.name || 'P').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h6 class="fw-bold mb-0">${escapeHtml(item.name || 'Pelanggan')}</h6>
                  <span class="text-muted font-xs">${formattedDate}</span>
                </div>
              </div>
              <span class="badge bg-warning text-dark rounded-pill px-3 py-1 fw-bold">
                ⭐ ${item.rating || 5}/5
              </span>
            </div>

            <div class="text-warning mb-2 small">
              ${'★'.repeat(Number(item.rating || 5))}${'☆'.repeat(5 - Number(item.rating || 5))}
            </div>

            <p class="text-muted mb-2 flex-grow-1">${escapeHtml(item.comment || '')}</p>

            ${
              item.photoUrl
                ? `<div class="mb-3">
                    <img src="${escapeHtml(item.photoUrl)}" alt="Foto ulasan pelanggan" class="review-photo-thumb" loading="lazy">
                   </div>`
                : ''
            }

            ${
              item.reply
                ? `<div class="border rounded-3 p-3 bg-light-custom mt-auto">
                    <div class="d-flex align-items-center gap-1 fw-bold small text-danger mb-1">
                      <i class="bi bi-reply-fill"></i> Balasan Pempek Wahid
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

// v1.1: Multi-filter & Sorting Logic untuk Publik
function applyPublicFilters() {
  const keyword = (document.getElementById('searchReviewInput')?.value || '').toLowerCase().trim();
  const ratingFilter = document.getElementById('filterRatingSelect')?.value || 'all';
  const replyFilter = document.getElementById('filterReplySelect')?.value || 'all';
  const sortOption = document.getElementById('sortReviewSelect')?.value || 'newest';

  let filtered = reviewListCache.filter((item) => {
    // Search keyword check
    const matchesSearch = (item.name || '').toLowerCase().includes(keyword) || (item.comment || '').toLowerCase().includes(keyword);

    // Rating filter check
    const matchesRating = ratingFilter === 'all' || String(item.rating || 5) === String(ratingFilter);

    // Reply status filter check
    const matchesReply = replyFilter === 'all'
      || (replyFilter === 'replied' && Boolean(item.reply))
      || (replyFilter === 'unreplied' && !item.reply);

    return matchesSearch && matchesRating && matchesReply;
  });

  // Sorting
  filtered.sort((a, b) => {
    const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
    const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
    const rateA = Number(a.rating) || 5;
    const rateB = Number(b.rating) || 5;

    if (sortOption === 'newest') return timeB - timeA;
    if (sortOption === 'oldest') return timeA - timeB;
    if (sortOption === 'rating_high') return rateB - rateA;
    if (sortOption === 'rating_low') return rateA - rateB;
    return timeB - timeA;
  });

  renderReviews(filtered);
}

function listenAllReviews() {
  const container = document.getElementById('allReviewsContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="col-12 text-center py-5">
      <div class="spinner-border text-danger me-2" role="status"></div>
      <span class="text-muted fw-semibold">Memuat seluruh ulasan Firestore secara realtime...</span>
    </div>
  `;

  if (window.firebaseManager?.onSnapshotReviews) {
    // Memanggil realtime listener Firestore TANPA limit untuk menampilkan semua ulasan
    window.firebaseManager.onSnapshotReviews((ulasan) => {
      reviewListCache = ulasan;
      updateReviewStats(ulasan);
      applyPublicFilters();
    });
  } else {
    window.firebaseManager?.loadReviews?.().then((ulasan) => {
      reviewListCache = ulasan;
      updateReviewStats(ulasan);
      applyPublicFilters();
    });
  }
}

function pasangFormUlasan() {
  const form = document.getElementById('addReviewForm') || document.getElementById('form-ulasan');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    // v1.1: Anti-Spam Honeypot Check
    const honeypot = document.getElementById('hp_website_url');
    if (honeypot && honeypot.value.trim() !== '') {
      console.warn('[ReviewPage] Honeypot terisi. Pengiriman dibatalkan.');
      return;
    }

    const nama = document.getElementById('reviewerName')?.value?.trim();
    const komentar = document.getElementById('reviewerComment')?.value?.trim();
    const rating = selectedRating;

    if (!nama || !komentar) {
      tampilkanToast('Harap isi nama dan komentar ulasan Anda.', 'danger');
      return;
    }

    isSubmitting = true;
    const btnSubmit = form.querySelector('button[type="submit"]');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Mengirim Ulasan...';
    }

    try {
      const reviewPayload = {
        name: nama,
        rating: Number(rating),
        comment: komentar
      };

      // Memanggil fungsi saveReview
      const result = await window.firebaseManager?.saveReview?.(reviewPayload);

      if (result?.ok) {
        form.reset();
        initStarRatingPicker();
        tampilkanToast('Terima kasih! Ulasan Anda telah terkirim dan dipublikasikan.', 'success');
      } else {
        tampilkanToast(result?.error || 'Gagal menyimpan ulasan. Coba lagi.', 'danger');
      }
    } catch (err) {
      console.error('[ReviewsPage] Gagal kirim ulasan:', err);
      tampilkanToast('Terjadi kesalahan koneksi saat mengirim ulasan.', 'danger');
    } finally {
      isSubmitting = false;
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="bi bi-send-fill me-2"></i>Kirim Ulasan Sekarang';
      }
    }
  });
}

function tampilkanToast(pesan, tipe = 'success') {
  const toastEl = document.getElementById('reviewToast');
  const msgEl = document.getElementById('toastMsg');
  const iconEl = document.getElementById('toastIcon');

  if (!toastEl || !msgEl) return;

  toastEl.classList.remove('text-bg-success', 'text-bg-danger');
  toastEl.classList.add(tipe === 'danger' ? 'text-bg-danger' : 'text-bg-success');

  if (iconEl) {
    iconEl.className = tipe === 'danger' ? 'bi bi-exclamation-triangle-fill fs-5' : 'bi bi-check-circle-fill fs-5';
  }

  msgEl.textContent = pesan;

  const bsToast = new bootstrap.Toast(toastEl);
  bsToast.show();
}

function initReviewsPage() {
  initStarRatingPicker();
  listenAllReviews();
  pasangFormUlasan();

  // Attach filter & sort event listeners
  document.getElementById('searchReviewInput')?.addEventListener('input', applyPublicFilters);
  document.getElementById('filterRatingSelect')?.addEventListener('change', applyPublicFilters);
  document.getElementById('filterReplySelect')?.addEventListener('change', applyPublicFilters);
  document.getElementById('sortReviewSelect')?.addEventListener('change', applyPublicFilters);
}

if (document.readyState === 'complete') {
  initReviewsPage();
} else {
  window.addEventListener('load', initReviewsPage);
}
