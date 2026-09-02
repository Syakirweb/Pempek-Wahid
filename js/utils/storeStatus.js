/**
 * StoreStatusManager
 * Menangani semua logika status toko otomatis berbasis WIB
 */
class StoreStatusManager {
  constructor(config = {}) {
    this.timezone = 'Asia/Jakarta';
    this.updateIntervalMs = 60000; // Update setiap 1 menit
    this.checkInterval = null;
  }

  getCurrentWIBTime() {
    if (typeof window.getCurrentWIBTime === 'function') {
      return window.getCurrentWIBTime();
    }
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: this.timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    }).formatToParts(now);

    let hour = 0;
    let minute = 0;
    for (const p of parts) {
      if (p.type === 'hour') {
        hour = parseInt(p.value, 10);
        if (hour === 24) hour = 0;
      }
      if (p.type === 'minute') minute = parseInt(p.value, 10);
    }

    const dayOfWeek = new Intl.DateTimeFormat('id-ID', {
      timeZone: this.timezone,
      weekday: 'long'
    }).format(now);

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

  determineStatus(firestoreData = {}) {
    const current = this.getCurrentWIBTime();
    const {
      isClosed = false,
      closedReason = '',
      closedReasonType = 'none',
      operatingHoursStart = 16,
      operatingHoursEnd = 18,
      closedDays = ['minggu']
    } = firestoreData;

    const pad = (n) => String(n).padStart(2, '0');

    // Priority 1: Admin paksa tutup
    if (isClosed === true) {
      return {
        statusCode: 'FORCE_CLOSED',
        isOpen: false,
        bannerColor: 'danger',
        bannerText: `🔴 Outlet Tutup Hari Ini${closedReason ? ` — ${closedReason}` : ''}`,
        canCheckout: false,
        warningText: null,
        reasonType: closedReasonType || 'none'
      };
    }

    // Priority 2: Hari tutup otomatis
    if (Array.isArray(closedDays) && closedDays.includes(current.dayOfWeekLower)) {
      return {
        statusCode: 'AUTO_CLOSED',
        isOpen: false,
        bannerColor: 'danger',
        bannerText: `🔴 Outlet Tutup ${current.dayOfWeek}. Buka Kembali Besok Sore.`,
        canCheckout: false,
        warningText: null,
        reasonType: 'holiday'
      };
    }

    // Priority 3: Jam operasional
    const hour = current.hour;

    // Pagi/Siang: Pre-order allowed (00:00 - 15:59)
    if (hour >= 0 && hour < operatingHoursStart) {
      return {
        statusCode: 'PRE_ORDER',
        isOpen: false,
        bannerColor: 'info',
        bannerText: `🕒 Outlet Buka Sore Ini (${pad(operatingHoursStart)}:00 - ${pad(operatingHoursEnd)}:00 WIB). Pre-order sudah bisa!`,
        canCheckout: true,
        warningText: `⏰ Pesanan akan diproses sore mulai ${pad(operatingHoursStart)}:00 WIB`,
        reasonType: 'none'
      };
    }

    // Jam operasi aktif (16:00 - 17:59)
    if (hour >= operatingHoursStart && hour < operatingHoursEnd) {
      return {
        statusCode: 'OPEN_NOW',
        isOpen: true,
        bannerColor: 'success',
        bannerText: `🟢 Outlet Buka Sekarang! (${pad(operatingHoursStart)}:00 - ${pad(operatingHoursEnd)}:00 WIB)`,
        canCheckout: true,
        warningText: null,
        reasonType: 'none'
      };
    }

    // Malam/Tutup (18:00+)
    return {
      statusCode: 'CLOSED_EVENING',
      isOpen: false,
      bannerColor: 'danger',
      bannerText: `🔴 Jam Operasi Selesai (Buka ${pad(operatingHoursStart)}:00 - ${pad(operatingHoursEnd)}:00 WIB). Buka Kembali Besok Sore.`,
      canCheckout: false,
      warningText: null,
      reasonType: 'closed_for_day'
    };
  }

  updateUI(statusObj) {
    const banner = document.getElementById('store-status-banner');
    const bannerMsg = document.getElementById('banner-message');
    const bannerWarning = document.getElementById('banner-warning');

    if (banner && bannerMsg) {
      banner.className = `store-banner alert alert-${statusObj.bannerColor}`;
      bannerMsg.textContent = statusObj.bannerText;

      if (statusObj.warningText) {
        if (bannerWarning) {
          bannerWarning.textContent = statusObj.warningText;
          bannerWarning.classList.remove('d-none');
        }
      } else {
        if (bannerWarning) {
          bannerWarning.classList.add('d-none');
        }
      }
    }

    const checkoutBtn = document.getElementById('checkoutWhatsAppBtn') || document.getElementById('btn-checkout');
    const waAdminBtn = document.getElementById('btn-whatsapp-admin');

    if (checkoutBtn) {
      if (statusObj.canCheckout) {
        checkoutBtn.disabled = false;
        checkoutBtn.classList.remove('opacity-50');
        if (waAdminBtn) waAdminBtn.classList.add('d-none');
      } else {
        checkoutBtn.disabled = true;
        checkoutBtn.classList.add('opacity-50');
        if (waAdminBtn) waAdminBtn.classList.remove('d-none');
      }
    }

    const alertBox = document.getElementById('checkout-alert');
    const alertText = document.getElementById('checkout-alert-text');
    if (alertBox && statusObj.warningText) {
      if (alertText) alertText.textContent = statusObj.warningText;
      alertBox.classList.remove('d-none');
    } else if (alertBox) {
      alertBox.classList.add('d-none');
    }
  }

  startMonitoring() {
    if (this.checkInterval) clearInterval(this.checkInterval);
    this.checkInterval = setInterval(() => {
      const firestoreData = window.currentStoreStatus || {};
      const status = this.determineStatus(firestoreData);
      this.updateUI(status);
    }, this.updateIntervalMs);
  }

  stopMonitoring() {
    if (this.checkInterval) clearInterval(this.checkInterval);
  }
}

if (typeof window !== 'undefined') {
  window.StoreStatusManager = StoreStatusManager;
}
