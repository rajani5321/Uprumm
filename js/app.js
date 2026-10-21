/**
 * UPRUMM APPAREL — COMPLETE E-COMMERCE ENGINE (v2.0.0)
 * 
 * Features:
 * 1. Customer Accounts (Register, Login, Saved Addresses, Order History)
 * 2. Product Management (Upload Photos, Custom Logo Artwork, Pricing, Sizes, Stock)
 * 3. Cash on Delivery (COD) / Pay on Delivery Checkout Engine
 * 4. Order Management (Live Status Timeline Stepper, GST Tax Invoices)
 * 5. Admin Studio Dashboard (KPIs, Products CRUD, Orders, Customers, Stock Matrix, Settings)
 * 6. Shipping Integration (Indian Pincode auto-lookup, Free Shipping Meter, Delhivery/BlueDart AWB)
 * 7. Mobile-First Experience (Bottom Navigation, Responsive Drawers, Touch Optimizations)
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. DEFAULT SEED DATA & CONSTANTS
  // ==========================================================================

  const DEFAULT_PRODUCTS = [];

  const PINCODE_MAP = {
    "400001": { city: "Mumbai", state: "Maharashtra", zone: "West", days: 2 },
    "400050": { city: "Mumbai (Bandra)", state: "Maharashtra", zone: "West", days: 2 },
    "110001": { city: "New Delhi", state: "Delhi", zone: "North", days: 3 },
    "560001": { city: "Bengaluru", state: "Karnataka", zone: "South", days: 3 },
    "700001": { city: "Kolkata", state: "West Bengal", zone: "East", days: 4 },
    "600001": { city: "Chennai", state: "Tamil Nadu", zone: "South", days: 3 },
    "500001": { city: "Hyderabad", state: "Telangana", zone: "South", days: 3 },
    "380001": { city: "Ahmedabad", state: "Gujarat", zone: "West", days: 3 },
    "302001": { city: "Jaipur", state: "Rajasthan", zone: "North", days: 3 },
    "411001": { city: "Pune", state: "Maharashtra", zone: "West", days: 2 }
  };

  const DEFAULT_USERS = [];

  const DEFAULT_ORDERS = [];

  const DEFAULT_SETTINGS = {
    paymentMethod: "Cash on Delivery (COD)",
    freeShippingThreshold: 1499,
    standardShippingFee: 99,
    expressShippingFee: 149
  };

  // ==========================================================================
  // 2. STATE STORE & PERSISTENCE
  // ==========================================================================

  function getApiUrl(path) {
    // 1. If explicit Render or custom backend URL is configured
    const customBackend = window.UPRUMM_BACKEND_URL || localStorage.getItem('uprumm_backend_url');
    if (customBackend) {
      return `${customBackend.replace(/\/+$/, '')}${path}`;
    }

    // 2. When running on Render or any live web domain hosting the app, use same-origin relative path
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost && window.location.protocol !== 'file:') {
      return path;
    }

    // 3. When opened via file:// or non-standard local port, connect to local server
    if (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '3000')) {
      return `http://localhost:3000${path}`;
    }
    return path;
  }

  const SAMPLE_PRODUCT_IDS = ['101', '102', '103', '104', '105', '1792240982930', 101, 102, 103, 104, 105, 1792240982930];
  let deletedProductIds = new Set([
    ...SAMPLE_PRODUCT_IDS,
    ...JSON.parse(localStorage.getItem("uprumm_deleted_products") || "[]")
  ]);

  // Clean out any legacy sample products and demo records from localStorage immediately
  try {
    const rawProds = JSON.parse(localStorage.getItem("uprumm_products") || "[]");
    if (Array.isArray(rawProds)) {
      const filtered = rawProds.filter(p => p && !deletedProductIds.has(p.id) && !deletedProductIds.has(String(p.id)) && !deletedProductIds.has(Number(p.id)));
      localStorage.setItem("uprumm_products", JSON.stringify(filtered));
    }
    const rawOrders = JSON.parse(localStorage.getItem("uprumm_orders") || "[]");
    if (Array.isArray(rawOrders)) {
      const filteredOrders = rawOrders.filter(o => o && o.id !== "UPR-2026-8821" && o.id !== "UPR-2026-9042");
      localStorage.setItem("uprumm_orders", JSON.stringify(filteredOrders));
    }
    const rawUsers = JSON.parse(localStorage.getItem("uprumm_users") || "[]");
    if (Array.isArray(rawUsers)) {
      const filteredUsers = rawUsers.filter(u => u && u.id !== "usr_priya" && u.role !== "admin" && u.id !== "admin_master" && (u.email || '').toLowerCase() !== "tudurajanikanta@gmail.com");
      localStorage.setItem("uprumm_users", JSON.stringify(filteredUsers));
    }
    const rawCustom = JSON.parse(localStorage.getItem("uprumm_custom_products") || "[]");
    if (Array.isArray(rawCustom)) {
      const filteredCustom = rawCustom.filter(p => p && !deletedProductIds.has(p.id) && !deletedProductIds.has(String(p.id)) && !deletedProductIds.has(Number(p.id)));
      localStorage.setItem("uprumm_custom_products", JSON.stringify(filteredCustom));
    }
    const rawCartStored = JSON.parse(localStorage.getItem("uprumm_cart") || "[]");
    if (Array.isArray(rawCartStored)) {
      const filteredCart = rawCartStored.filter(item => item && !deletedProductIds.has(item.id) && !deletedProductIds.has(String(item.id)) && !deletedProductIds.has(Number(item.id)));
      localStorage.setItem("uprumm_cart", JSON.stringify(filteredCart));
    }
  } catch (e) { }

  let rawStored = localStorage.getItem("uprumm_products");
  let products = [];
  if (rawStored !== null) {
    try {
      const parsed = JSON.parse(rawStored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        products = parsed.filter(p => p && !deletedProductIds.has(p.id) && !deletedProductIds.has(Number(p.id)) && !deletedProductIds.has(String(p.id)));
      }
    } catch (e) {
      products = [];
    }
  }

  // 100% Dynamic: Only user-added products are kept (No fallback to demo products)

  // Restore and merge custom products created by the user
  try {
    const savedCustom = JSON.parse(localStorage.getItem("uprumm_custom_products") || "[]");
    if (Array.isArray(savedCustom)) {
      savedCustom.forEach(cp => {
        if (cp && cp.id && !deletedProductIds.has(cp.id) && !deletedProductIds.has(Number(cp.id)) && !deletedProductIds.has(String(cp.id))) {
          if (!products.some(p => String(p.id) === String(cp.id))) {
            products.push(cp);
          }
        }
      });
    }
  } catch (e) { }

  let cart = [];
  try {
    const rawCart = JSON.parse(localStorage.getItem("uprumm_cart") || "[]");
    if (Array.isArray(rawCart)) {
      cart = rawCart.filter(item => item && item.id);
      cart.forEach(item => {
        if (!item.key) item.key = `${item.id}-${item.size || 'M'}`;
      });
    }
  } catch (e) {
    cart = [];
  }
  let rawUsersStored = JSON.parse(localStorage.getItem("uprumm_users") || "[]");
  let users = Array.isArray(rawUsersStored)
    ? rawUsersStored.filter(u => u && u.role !== 'admin' && u.id !== 'admin_master' && (u.email || '').toLowerCase() !== 'tudurajanikanta@gmail.com')
    : [];
  let currentUser = JSON.parse(localStorage.getItem("uprumm_currentUser") || "null");
  let isAdminLoggedIn = JSON.parse(localStorage.getItem("uprumm_isAdminLoggedIn") || "false");
  let orders = JSON.parse(localStorage.getItem("uprumm_orders") || "[]");
  if (!Array.isArray(orders)) orders = [];
  let settings = JSON.parse(localStorage.getItem("uprumm_settings") || "null") || DEFAULT_SETTINGS;

  function persistStore() {
    try {
      localStorage.setItem("uprumm_products", JSON.stringify(products));
      localStorage.setItem("uprumm_cart", JSON.stringify(cart));
      localStorage.setItem("uprumm_users", JSON.stringify(users));
      localStorage.setItem("uprumm_currentUser", JSON.stringify(currentUser));
      localStorage.setItem("uprumm_isAdminLoggedIn", JSON.stringify(isAdminLoggedIn));
      localStorage.setItem("uprumm_orders", JSON.stringify(orders));
      localStorage.setItem("uprumm_settings", JSON.stringify(settings));
    } catch (err) {
      console.warn("Storage quota / serialization notice:", err);
      try {
        // If quota exceeded due to large data URLs, store sanitized versions so products are NEVER lost
        const sanitizedProds = (products || []).map(p => {
          if (!p) return p;
          const copy = { ...p };
          if (copy.image && copy.image.startsWith('data:image') && copy.image.length > 50000) {
            copy.image = 'assets/images/img.jpeg';
          }
          if (copy.logoOverlay && copy.logoOverlay.startsWith('data:image') && copy.logoOverlay.length > 50000) {
            copy.logoOverlay = null;
          }
          return copy;
        });
        localStorage.setItem("uprumm_products", JSON.stringify(sanitizedProds));
      } catch (prodErr) {
        console.warn("Could not save sanitized products:", prodErr);
      }
      try {
        localStorage.setItem("uprumm_cart", JSON.stringify(cart));
        localStorage.setItem("uprumm_currentUser", JSON.stringify(currentUser));
      } catch (innerErr) {
        console.warn("Could not save cart:", innerErr);
      }
    }
  }

  // Cross-Tab Real-Time Sync Channel
  const catalogSyncChannel = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('uprumm_catalog_sync') : null;

  function broadcastCatalogSync(action = 'update', item = null) {
    if (catalogSyncChannel) {
      try {
        catalogSyncChannel.postMessage({ type: 'CATALOG_SYNC', action, item, timestamp: Date.now() });
      } catch (e) { }
    }
    try {
      localStorage.setItem('uprumm_sync_signal', JSON.stringify({ action, timestamp: Date.now() }));
    } catch (e) { }
  }

  if (catalogSyncChannel) {
    catalogSyncChannel.onmessage = function (ev) {
      if (ev.data && ev.data.type === 'CATALOG_SYNC') {
        const { action, item } = ev.data;
        if (action === 'add' && item && item.id) {
          if (!products.some(p => String(p.id) === String(item.id))) {
            products.unshift(item);
            persistStore();
            renderCatalog();
            if (typeof renderAdminProductsTable === 'function') renderAdminProductsTable();
            if (typeof renderAdminStockTable === 'function') renderAdminStockTable();
            if (typeof renderAdminOverview === 'function') renderAdminOverview();
          }
        } else if (action === 'delete' && item && item.id) {
          deletedProductIds.add(item.id);
          deletedProductIds.add(Number(item.id));
          deletedProductIds.add(String(item.id));
          products = products.filter(p => String(p.id) !== String(item.id) && Number(p.id) !== Number(item.id));
          persistStore();
          renderCatalog();
          if (typeof renderAdminProductsTable === 'function') renderAdminProductsTable();
          if (typeof renderAdminStockTable === 'function') renderAdminStockTable();
          if (typeof renderAdminOverview === 'function') renderAdminOverview();
        } else {
          reloadCatalogFromStorage();
        }
      }
    };
  }

  window.addEventListener('storage', function (e) {
    if (e.key === 'uprumm_sync_signal' || e.key === 'uprumm_products' || e.key === 'uprumm_deleted_products') {
      reloadCatalogFromStorage();
    }
  });

  function reloadCatalogFromStorage() {
    try {
      const storedDeleted = new Set([...SAMPLE_PRODUCT_IDS, ...JSON.parse(localStorage.getItem("uprumm_deleted_products") || "[]")]);
      deletedProductIds = storedDeleted;
      const storedProds = JSON.parse(localStorage.getItem("uprumm_products") || "[]");
      const savedCustom = getCustomProducts();

      const mergedMap = new Map();
      if (Array.isArray(storedProds)) {
        storedProds.forEach(p => {
          if (p && p.id && !deletedProductIds.has(p.id) && !deletedProductIds.has(Number(p.id)) && !deletedProductIds.has(String(p.id))) {
            mergedMap.set(String(p.id), p);
          }
        });
      }
      savedCustom.forEach(cp => {
        if (cp && cp.id && !deletedProductIds.has(cp.id) && !deletedProductIds.has(Number(cp.id)) && !deletedProductIds.has(String(cp.id))) {
          if (!mergedMap.has(String(cp.id))) mergedMap.set(String(cp.id), cp);
        }
      });

      // CRITICAL: Preserve any fresh in-memory products (newly published or edited) so storage sync NEVER wipes them!
      const now = Date.now();
      (products || []).forEach(lp => {
        if (!lp || !lp.id) return;
        const idStr = String(lp.id);
        if (deletedProductIds.has(lp.id) || deletedProductIds.has(idStr) || deletedProductIds.has(Number(lp.id))) return;
        if (lp._pendingSave || inFlightProductWrites.has(idStr)) {
          mergedMap.set(idStr, lp);
        }
      });

      const merged = Array.from(mergedMap.values());
      products = merged.filter(p => p && !deletedProductIds.has(p.id) && !deletedProductIds.has(Number(p.id)) && !deletedProductIds.has(String(p.id)));
      renderCatalog();
      if (typeof renderAdminProductsTable === 'function') renderAdminProductsTable();
      if (typeof renderAdminStockTable === 'function') renderAdminStockTable();
      if (typeof renderAdminOverview === 'function') renderAdminOverview();
    } catch (err) {
      console.warn("Storage sync error:", err);
    }
  }

  // ==========================================================================
  // MULTI-DEVICE AUTOMATIC REAL-TIME SYNC ENGINE
  // ==========================================================================
  let lastSyncVersions = {
    products: 0,
    settings: 0,
    orders: 0
  };
  let isSyncingProducts = false;
  let isSyncingSettings = false;
  let isSyncingOrders = false;
  let syncPollTimer = null;

  // In-flight write protection shield: tracks pending product creations and edits
  // to guarantee that premature background syncs NEVER overwrite freshly published items before MongoDB finishes.
  const inFlightProductWrites = new Map();

  async function syncProductsFromServer(silent = true) {
    if (isSyncingProducts) return;

    // SHIELD 1: If any local product write is currently in-flight to the server,
    // abort sync immediately. Never overwrite the user's optimistic catalog with premature DB state.
    if (inFlightProductWrites.size > 0) {
      console.log('[Sync Shield] Active product write in-flight. Skipping server sync.');
      return;
    }

    isSyncingProducts = true;
    try {
      // Sync permanently deleted IDs from server so deleted items can NEVER resurrect
      try {
        const delRes = await fetch(getApiUrl(`/api/management/deleted-ids?_t=${Date.now()}`), {
          cache: 'no-store',
          headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
        });
        if (delRes.ok) {
          const delData = await delRes.json();
          if (Array.isArray(delData.deletedIds)) {
            delData.deletedIds.forEach(id => {
              deletedProductIds.add(id);
              deletedProductIds.add(String(id));
              deletedProductIds.add(Number(id));
            });
            try {
              localStorage.setItem("uprumm_deleted_products", JSON.stringify([...deletedProductIds]));
            } catch (e) { }
          }
        }
      } catch (delErr) {
        console.warn("Deleted IDs sync notice:", delErr);
      }

      const res = await fetch(getApiUrl(`/api/management/products?_t=${Date.now()}`), {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const dbProds = await res.json();
      if (Array.isArray(dbProds)) {
        // Double-check shield in case a write started while fetch was pending
        if (inFlightProductWrites.size > 0) {
          console.log('[Sync Shield] Write started during fetch. Aborting catalog overwrite.');
          return;
        }

        // 1. Valid server products (excluding deleted ones)
        const validServerProds = dbProds.filter(p => p && !deletedProductIds.has(p.id) && !deletedProductIds.has(Number(p.id)) && !deletedProductIds.has(String(p.id)));

        // 2. Saved custom products
        const savedCustomProds = getCustomProducts();

        // 3. Build merged map starting with server products
        const mergedMap = new Map();
        validServerProds.forEach(p => mergedMap.set(String(p.id), p));

        // 4. CRITICAL SHIELD: Preserve ANY local product in memory that was created, edited, or pending save!
        // Never allow a background sync to drop newly added drops just because the DB write or replication hasn't completed yet.
        (products || []).forEach(localP => {
          if (!localP || !localP.id) return;
          const idStr = String(localP.id);
          const isDeleted = deletedProductIds.has(localP.id) || deletedProductIds.has(idStr) || deletedProductIds.has(Number(localP.id));
          if (isDeleted) return;

          if (!mergedMap.has(idStr)) {
            // Only preserve and sync to server if it is an active in-flight write or pending save
            if (localP._pendingSave || inFlightProductWrites.has(idStr)) {
              mergedMap.set(idStr, localP);
              fetch(getApiUrl('/api/management/products'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(localP)
              }).catch(() => { });
            }
          } else {
            // Server has it: preserve any fresher in-memory artwork if server payload hasn't synced it yet
            const serverItem = mergedMap.get(idStr);
            if (localP.logoOverlay && !serverItem.logoOverlay) {
              serverItem.logoOverlay = localP.logoOverlay;
            }
          }
        });

        savedCustomProds.forEach(p => {
          if (p && p.id && !mergedMap.has(String(p.id)) && !deletedProductIds.has(p.id) && !deletedProductIds.has(Number(p.id)) && !deletedProductIds.has(String(p.id))) {
            mergedMap.set(String(p.id), p);
          }
        });

        const finalProds = Array.from(mergedMap.values()).filter(p => p && !deletedProductIds.has(p.id) && !deletedProductIds.has(Number(p.id)) && !deletedProductIds.has(String(p.id)));

        const prevSignature = (products || []).map(p => `${p.id}_${p.price}_${JSON.stringify(p.stock || {})}_${p.logoOverlay || ''}_${p.badge || ''}_${p.image || ''}`).join('|');
        const newSignature = finalProds.map(p => `${p.id}_${p.price}_${JSON.stringify(p.stock || {})}_${p.logoOverlay || ''}_${p.badge || ''}_${p.image || ''}`).join('|');

        products = finalProds;
        persistStore();

        if (prevSignature !== newSignature) {
          renderCatalog();
          if (typeof renderAdminProductsTable === 'function') renderAdminProductsTable();
          if (typeof renderAdminStockTable === 'function') renderAdminStockTable();
          if (typeof renderAdminOverview === 'function') renderAdminOverview();

          if (modalProduct && typeof renderDetailModal === 'function') {
            const updatedModalProd = products.find(p => String(p.id) === String(modalProduct.id));
            if (updatedModalProd) {
              modalProduct = updatedModalProd;
              renderDetailModal(modalProduct);
            }
          }
          if (!silent) {
            showToast("Store catalog updated live across devices");
          }
        }
      }
    } catch (err) {
      console.warn("Multi-device product sync notice:", err);
    } finally {
      isSyncingProducts = false;
    }
  }

  async function syncSettingsFromServer() {
    if (isSyncingSettings) return;
    isSyncingSettings = true;
    try {
      const res = await fetch(getApiUrl(`/api/settings?_t=${Date.now()}`), {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) return;
      const dbSettings = await res.json();
      if (dbSettings && typeof dbSettings === 'object') {
        settings = { ...settings, ...dbSettings };
        persistStore();
        const annThresh = document.querySelector("#announcement-threshold");
        if (annThresh && settings.freeShippingThreshold) {
          annThresh.textContent = money(settings.freeShippingThreshold);
        }
        if (typeof renderCart === 'function') renderCart();
      }
    } catch (err) {
    } finally {
      isSyncingSettings = false;
    }
  }

  async function syncOrdersFromServer() {
    if (isSyncingOrders) return;
    isSyncingOrders = true;
    try {
      const res = await fetch(getApiUrl(`/api/orders?_t=${Date.now()}`), {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) return;
      const dbOrders = await res.json();
      if (Array.isArray(dbOrders)) {
        orders = dbOrders;
        persistStore();
        if (typeof renderAdminOrdersTable === 'function') renderAdminOrdersTable();
        if (typeof renderAdminOverview === 'function') renderAdminOverview();
      }
    } catch (err) {
    } finally {
      isSyncingOrders = false;
    }
  }

  async function checkMultiDeviceSync() {
    try {
      const res = await fetch(getApiUrl(`/api/sync/status?_t=${Date.now()}`), {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) return;
      const status = await res.json();
      if (!status) return;

      const prodVer = Number(status.productsVersion) || 0;
      const setVer = Number(status.settingsVersion) || 0;
      const ordVer = Number(status.ordersVersion) || 0;

      if (lastSyncVersions.products === 0) {
        lastSyncVersions.products = prodVer;
        lastSyncVersions.settings = setVer;
        lastSyncVersions.orders = ordVer;
        syncProductsFromServer(true);
        syncSettingsFromServer();
        syncOrdersFromServer();
        return;
      }

      if (prodVer !== lastSyncVersions.products) {
        lastSyncVersions.products = prodVer;
        syncProductsFromServer(false);
      }

      if (setVer !== lastSyncVersions.settings) {
        lastSyncVersions.settings = setVer;
        syncSettingsFromServer();
      }

      if (ordVer !== lastSyncVersions.orders) {
        lastSyncVersions.orders = ordVer;
        syncOrdersFromServer();
      }
    } catch (err) {
    }
  }

  function startMultiDeviceSyncEngine() {
    // Initial fetch to ensure up-to-date catalog on boot
    syncProductsFromServer(true);
    syncSettingsFromServer();
    syncOrdersFromServer();

    // Event-driven sync: No continuous background setInterval polling.
    // Updates occur when admin adds/edits/deletes items or when the user returns to the tab.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && inFlightProductWrites.size === 0) {
        checkMultiDeviceSync();
      }
    });

    window.addEventListener('focus', () => {
      if (inFlightProductWrites.size === 0) {
        checkMultiDeviceSync();
      }
    });

    window.addEventListener('online', () => {
      if (inFlightProductWrites.size === 0) {
        checkMultiDeviceSync();
      }
    });
  }

  // Ensure initial data saved
  persistStore();

  // Sync server store configuration
  fetch(getApiUrl('/api/config'))
    .then(r => r.json())
    .then(cfg => {
      if (cfg) {
        if (cfg.freeShippingThreshold) settings.freeShippingThreshold = cfg.freeShippingThreshold;
        if (cfg.standardShippingFee) settings.standardShippingFee = cfg.standardShippingFee;
        if (cfg.expressShippingFee) settings.expressShippingFee = cfg.expressShippingFee;
        persistStore();
      }
    })
    .catch(() => { });

  // Sync registered customers from MongoDB Atlas / server
  fetch(getApiUrl('/api/users'))
    .then(r => r.json())
    .then(dbUsers => {
      if (Array.isArray(dbUsers)) {
        users = dbUsers.filter(u => u && u.role !== 'admin' && u.id !== 'admin_master');
        persistStore();
        if (typeof renderAdminCustomersTable === 'function') renderAdminCustomersTable();
      }
    })
    .catch(() => { });

  // Active UI filters & transient states
  let activeFilter = "all";
  let activeSort = "featured";
  let showAll = true;
  let modalProduct = null;
  let selectedSize = "M";
  let activeCheckoutStep = 1;
  let pendingCheckoutOrder = null;
  let currentUploadedPhoto = null;
  let currentUploadedLogo = null;
  let toastTimer = null;

  // Currency Formatter
  const money = n => "₹" + Number(n).toLocaleString("en-IN");

  // ==========================================================================
  // 3. TOAST & NOTIFICATIONS
  // ==========================================================================

  const toastEl = document.querySelector("#toast");

  function showToast(message, actionLabel = null, actionCallback = null) {
    if (!toastEl) return;
    if (actionLabel && typeof actionCallback === 'function') {
      toastEl.innerHTML = `<span>${message}</span> <button type="button" class="toast-action-btn" id="toast-action-btn">${actionLabel}</button>`;
      const btn = toastEl.querySelector("#toast-action-btn");
      if (btn) {
        btn.onclick = (e) => {
          e.stopPropagation();
          actionCallback();
          toastEl.classList.remove("show");
        };
      }
    } else {
      toastEl.textContent = message;
    }
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("show");
    }, actionLabel ? 5000 : 3200);
  }

  // ==========================================================================
  // 4. CATALOG RENDERING & SHOPPING
  // ==========================================================================

  const productGrid = document.querySelector("#product-grid");
  const sortSelect = document.querySelector("#sort-products");
  const showAllBtn = document.querySelector("#show-all");

  function renderCatalog() {
    if (!productGrid) return;

    let list = products.filter(p => {
      if (!p) return false;
      const cat = (p.category || 'graphic').toLowerCase();
      const currentFilter = (activeFilter || 'all').toLowerCase();
      if (currentFilter === "all") return true;
      if (currentFilter === "custom") {
        return cat === "custom" || p.isCustom || Boolean(p.customLogo || p.logoOverlay);
      }
      return cat === currentFilter;
    });

    if (activeSort === "low") {
      list.sort((a, b) => a.price - b.price);
    } else if (activeSort === "high") {
      list.sort((a, b) => b.price - a.price);
    } else if (activeSort === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    const displayList = showAll ? list : list.slice(0, 4);

    if (!products.length) {
      productGrid.innerHTML = `
        <div class="storefront-empty-state" style="grid-column: 1 / -1; text-align: center; padding: 70px 24px; background: #fafaf9; border: 1.5px dashed #d6d3d1; border-radius: 12px; margin: 20px 0;">
          <span style="font-size: 42px; display: block; margin-bottom: 12px;">✨</span>
          <h3 style="font-size: 20px; font-weight: 700; color: var(--ink); margin-bottom: 8px;">Studio Drops Launching Soon</h3>
          <p style="color: var(--muted); font-size: 14px; max-width: 480px; margin: 0 auto 20px auto; line-height: 1.6;">
            Fresh oversized tees and graphic artworks are being prepped in the studio. When you add a new design in the Admin Studio, it will appear here immediately!
          </p>
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button type="button" class="button button-dark" data-action="open-cust-studio-account">Design in Customer Account <span>🎨 →</span></button>
            <a href="#admin" class="button button-outline" style="text-decoration:none;">Admin: Add New Drop <span>↗</span></a>
          </div>
        </div>
      `;
      if (showAllBtn) showAllBtn.style.display = "none";
      return;
    }

    if (!displayList.length) {
      if (activeFilter === "custom") {
        productGrid.innerHTML = `
          <div class="storefront-empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 24px; background: #fafaf9; border: 1.5px dashed #d6d3d1; border-radius: 12px; margin: 20px 0;">
            <span style="font-size: 42px; display: block; margin-bottom: 12px;">🎨</span>
            <h3 style="font-size: 20px; font-weight: 700; color: var(--ink); margin-bottom: 8px;">Design Your Custom T-Shirt</h3>
            <p style="color: var(--muted); font-size: 14px; max-width: 480px; margin: 0 auto 20px auto; line-height: 1.6;">
              Custom print studio is exclusive to your Customer Account! Sign in to upload your logo and customize your 240 GSM heavy cotton tee.
            </p>
            <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
              <button type="button" class="button button-dark" data-action="open-cust-studio-account">Open Studio in Customer Account <span>🎨 →</span></button>
            </div>
          </div>
        `;
      } else {
        productGrid.innerHTML = `
          <div class="cart-empty" style="grid-column: 1 / -1; padding: 60px 20px;">
            <span class="empty-icon">👕</span>
            <h3>No T-Shirts Found</h3>
            <p>No products match the selected "${activeFilter}" category filter.</p>
          </div>
        `;
      }
      if (showAllBtn) showAllBtn.style.display = "none";
      return;
    }

    productGrid.innerHTML = displayList.map(p => {
      const totalStock = Object.values(p.stock || {}).reduce((a, b) => a + b, 0);
      const isOutOfStock = totalStock <= 0;
      const logo = p.logoOverlay || p.customLogo;

      return `
        <article class="product-card" data-product-id="${p.id}">
          <div class="product-image" data-action="open-detail" data-id="${p.id}" tabindex="0" role="button" aria-label="View ${p.name}">
            <img src="${p.image}" alt="${p.name}" loading="lazy">
            ${logo ? `<div class="logo-overlay" style="display:flex; position:absolute; top:36%; left:50%; transform:translate(-50%, -50%); width:34%; pointer-events:none; z-index:4; align-items:center; justify-content:center;"><img src="${logo}" alt="${p.name} Artwork" style="width:100% !important; height:auto !important; max-height:100% !important; object-fit:contain !important; display:block !important; filter:drop-shadow(0 2px 6px rgba(0,0,0,0.45));"></div>` : ''}
            <span class="product-badge">${p.badge || (isOutOfStock ? "SOLD OUT" : "PRINT CLUB")}</span>
            <button class="quick-add" data-action="quick-add" data-id="${p.id}" ${isOutOfStock ? 'disabled' : ''}>
              ${isOutOfStock ? 'SOLD OUT' : 'QUICK ADD +'}
            </button>
          </div>
          <div class="product-info">
            <div class="product-name-row">
              <span class="product-name" data-action="open-detail" data-id="${p.id}">${p.name}</span>
              <span class="product-price">${money(p.price)}</span>
            </div>
            <p class="product-subtitle">${p.subtitle}</p>
            <div class="swatches" aria-label="Available colors">
              ${(p.colors || [p.color || "#e8e5dd"]).map((c, i) => `
                <button class="swatch ${i === 0 ? 'selected' : ''}" style="background:${c}" aria-label="Color option ${i + 1}"></button>
              `).join('')}
            </div>
          </div>
        </article>
      `;
    }).join("");

    if (showAllBtn) {
      showAllBtn.style.display = (activeFilter === "all" && !showAll && list.length > 4) ? "inline-flex" : "none";
    }
  }

  // ==========================================================================
  // 5. SHOPPING BAG & CART LOGIC
  // ==========================================================================

  const cartDrawer = document.querySelector("#cart-drawer");
  const overlay = document.querySelector("#overlay");
  const cartItemsEl = document.querySelector("#cart-items");
  const cartEmptyEl = document.querySelector("#cart-empty");
  const cartFooterEl = document.querySelector("#cart-footer");
  const cartSubtotalEl = document.querySelector("#cart-subtotal");
  const freeShippingMeter = document.querySelector("#free-shipping-meter");
  const meterFill = document.querySelector("#meter-fill");
  const meterText = document.querySelector("#meter-text");
  const headerCartCount = document.querySelector("#header-cart-count");
  const drawerCartCount = document.querySelector("#drawer-cart-count");
  const mobCartCount = document.querySelector("#mob-cart-count");

  function openCart() {
    if (!cartDrawer) return;
    renderCart();
    cartDrawer.classList.add("open");
    if (overlay) overlay.classList.add("open");
    cartDrawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeCart() {
    if (!cartDrawer) return;
    cartDrawer.classList.remove("open");
    if (overlay) overlay.classList.remove("open");
    cartDrawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function addToCart(productId, size = "M") {
    const p = products.find(x => String(x.id) === String(productId) || x.id === Number(productId));
    if (!p) return;

    // Check inventory stock
    const availableStock = (p.stock && p.stock[size] !== undefined) ? p.stock[size] : 10;
    const key = `${p.id}-${size}`;
    const existing = cart.find(x => x.key === key);

    if (existing && existing.qty >= availableStock) {
      showToast(`Only ${availableStock} units available in size ${size}`);
      return;
    }

    if (existing) {
      existing.qty++;
    } else {
      cart.push({
        key,
        id: p.id,
        size,
        qty: 1,
        name: p.name,
        price: p.price,
        image: p.image,
        logoOverlay: p.logoOverlay || p.customLogo
      });
    }

    persistStore();
    renderCart();
    showToast(`Added ${p.name} (Size ${size}) to bag`);
  }

  function updateCartItemQty(key, delta, index = -1) {
    let item = null;
    if (typeof index === "number" && index >= 0 && index < cart.length) {
      item = cart[index];
    }
    if (!item && key) {
      item = cart.find(x =>
        (x.key && x.key === key) ||
        `${x.id}-${x.size}` === key ||
        String(x.id) === String(key)
      );
    }
    if (!item) return;

    const p = products.find(x => String(x.id) === String(item.id));
    const availableStock = (p && p.stock && p.stock[item.size] !== undefined) ? p.stock[item.size] : 99;

    const newQty = (Number(item.qty) || 1) + delta;
    if (newQty > availableStock) {
      showToast(`Max stock reached (${availableStock} units)`);
      return;
    }

    if (newQty <= 0) {
      cart = cart.filter(x => x !== item);
      showToast("Item removed from bag");
    } else {
      item.qty = newQty;
    }

    persistStore();
    renderCart();
  }

  function removeCartItem(key, index = -1) {
    let item = null;
    if (typeof index === "number" && index >= 0 && index < cart.length) {
      item = cart[index];
    }
    if (!item && key) {
      item = cart.find(x =>
        (x.key && x.key === key) ||
        `${x.id}-${x.size}` === key ||
        String(x.id) === String(key)
      );
    }
    if (item) {
      cart = cart.filter(x => x !== item);
    } else if (key) {
      cart = cart.filter(x => x.key !== key && `${x.id}-${x.size}` !== key);
    }
    persistStore();
    renderCart();
    showToast("Item removed from bag");
  }

  function calculateCartTotals() {
    let subtotal = 0;
    let itemCount = 0;

    if (Array.isArray(cart)) {
      cart.forEach(item => {
        if (!item) return;
        const p = products.find(x => String(x.id) === String(item.id));
        const price = p ? Number(p.price) : (Number(item.price) || 999);
        const qty = Number(item.qty) || 1;
        subtotal += price * qty;
        itemCount += qty;
      });
    }

    const isFreeShipping = subtotal >= (settings?.freeShippingThreshold || 1499);
    const shippingFee = (subtotal === 0 || isFreeShipping) ? 0 : (settings?.standardShippingFee || 99);

    return { subtotal, itemCount, isFreeShipping, shippingFee };
  }

  function renderCart() {
    const { subtotal, itemCount, isFreeShipping, shippingFee } = calculateCartTotals();

    // Update count badges
    if (headerCartCount) headerCartCount.textContent = itemCount;
    if (drawerCartCount) drawerCartCount.textContent = itemCount;
    if (mobCartCount) mobCartCount.textContent = itemCount;

    // Free shipping progress bar
    if (freeShippingMeter && meterFill && meterText) {
      const threshold = settings?.freeShippingThreshold || 1499;
      const pct = Math.min(100, Math.round((subtotal / threshold) * 100));
      meterFill.style.width = pct + "%";

      if (subtotal === 0) {
        meterText.textContent = `Free shipping on orders above ${money(threshold)}`;
      } else if (isFreeShipping) {
        meterText.innerHTML = `🎉 <strong>You've unlocked FREE Delivery!</strong>`;
      } else {
        const remaining = threshold - subtotal;
        meterText.innerHTML = `Add <strong>${money(remaining)}</strong> more for <strong>FREE Delivery</strong>`;
      }
    }

    // Render Items
    if (!cartItemsEl) return;

    if (itemCount === 0 || !Array.isArray(cart) || cart.length === 0) {
      cartItemsEl.innerHTML = "";
      if (cartEmptyEl) cartEmptyEl.style.display = "block";
      if (cartFooterEl) cartFooterEl.style.display = "none";
      return;
    }

    if (cartEmptyEl) cartEmptyEl.style.display = "none";
    if (cartFooterEl) cartFooterEl.style.display = "block";

    cartItemsEl.innerHTML = cart.map((item, idx) => {
      if (!item) return "";
      const p = products.find(x => String(x.id) === String(item.id)) || {
        id: item.id,
        name: item.name || "Custom Streetwear Tee",
        price: item.price || 999,
        image: item.image || "assets/images/black-tee-front.jpg"
      };
      const itemKey = item.key || `${item.id}-${item.size || 'M'}`;
      const itemPrice = Number(p.price) || 999;
      const itemQty = Number(item.qty) || 1;
      const cartLogo = p.logoOverlay || p.customLogo;

      return `
        <div class="cart-line" data-index="${idx}">
          <div style="position:relative; width:54px; height:64px; border-radius:4px; overflow:hidden; background:#e7e4dd; flex-shrink:0; display:flex; align-items:center; justify-content:center;">
            <img src="${p.image}" alt="${p.name}" style="width:100%; height:100%; object-fit:cover;">
            ${cartLogo ? `<div style="position:absolute; top:36%; left:50%; transform:translate(-50%, -50%); width:38%; pointer-events:none; z-index:2; display:flex; align-items:center; justify-content:center;"><img src="${cartLogo}" style="width:100% !important; height:auto !important; max-height:100% !important; object-fit:contain !important; filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5)); display:block;"></div>` : ''}
          </div>
          <div>
            <h4>${p.name}</h4>
            <p>Size: <strong>${item.size || 'M'}</strong> · ${money(itemPrice)}</p>
            <div class="qty-controls">
              <button type="button" class="qty-btn" data-action="qty-dec" data-key="${itemKey}" data-index="${idx}" aria-label="Decrease quantity">−</button>
              <span class="qty-num">${itemQty}</span>
              <button type="button" class="qty-btn" data-action="qty-inc" data-key="${itemKey}" data-index="${idx}" aria-label="Increase quantity">+</button>
            </div>
          </div>
          <div>
            <div class="line-price">${money(itemPrice * itemQty)}</div>
            <button type="button" class="remove-item" data-action="remove-item" data-key="${itemKey}" data-index="${idx}" aria-label="Remove item" title="Remove">×</button>
          </div>
        </div>
      `;
    }).join("");

    if (cartSubtotalEl) cartSubtotalEl.textContent = money(subtotal);
    const cartShippingFeeEl = document.querySelector("#cart-shipping-fee");
    if (cartShippingFeeEl) {
      cartShippingFeeEl.textContent = isFreeShipping ? "FREE" : money(shippingFee);
    }
  }

  // Direct click listener on cart items container
  if (cartItemsEl) {
    cartItemsEl.addEventListener("click", function (e) {
      const qtyInc = e.target.closest('[data-action="qty-inc"]');
      if (qtyInc) {
        e.stopPropagation();
        const idx = qtyInc.dataset.index !== undefined ? parseInt(qtyInc.dataset.index, 10) : -1;
        updateCartItemQty(qtyInc.dataset.key, 1, idx);
        return;
      }

      const qtyDec = e.target.closest('[data-action="qty-dec"]');
      if (qtyDec) {
        e.stopPropagation();
        const idx = qtyDec.dataset.index !== undefined ? parseInt(qtyDec.dataset.index, 10) : -1;
        updateCartItemQty(qtyDec.dataset.key, -1, idx);
        return;
      }

      const removeBtn = e.target.closest('[data-action="remove-item"]');
      if (removeBtn) {
        e.stopPropagation();
        const idx = removeBtn.dataset.index !== undefined ? parseInt(removeBtn.dataset.index, 10) : -1;
        removeCartItem(removeBtn.dataset.key, idx);
        return;
      }
    });
  }

  // ==========================================================================
  // 6. PRODUCT DETAILS MODAL
  // ==========================================================================

  const productModal = document.querySelector("#product-modal");
  const modalContent = document.querySelector("#modal-content");

  function openProductDetail(productId) {
    modalProduct = products.find(p => String(p.id) === String(productId) || p.id === Number(productId));
    if (!modalProduct || !productModal || !modalContent) return;

    selectedSize = "M";
    const totalStock = Object.values(modalProduct.stock || {}).reduce((a, b) => a + b, 0);
    const logo = modalProduct.logoOverlay || modalProduct.customLogo;

    modalContent.innerHTML = `
      <div class="modal-product-layout">
        <div style="position:relative; width:100%; height:100%;">
          <img src="${modalProduct.image}" alt="${modalProduct.name}">
          ${logo ? `<div class="logo-overlay" style="display:flex; position:absolute; top:36%; left:50%; transform:translate(-50%, -50%); width:34%; pointer-events:none; z-index:4; align-items:center; justify-content:center;"><img src="${logo}" alt="${modalProduct.name} Artwork" style="width:100% !important; height:auto !important; max-height:100% !important; object-fit:contain !important; display:block !important; filter:drop-shadow(0 2px 6px rgba(0,0,0,0.45));"></div>` : ''}
        </div>
        <div class="modal-product-copy">
          <p class="eyebrow">${modalProduct.badge || "ORIGINAL DROP"}</p>
          <h2>${modalProduct.name}</h2>
          <div class="modal-price">
            ${money(modalProduct.price)}
            ${modalProduct.comparePrice ? `<small style="font-size:14px; text-decoration:line-through; color:var(--muted); margin-left:8px;">${money(modalProduct.comparePrice)}</small>` : ''}
          </div>
          <p>${modalProduct.description}</p>
          <p><strong>Fit:</strong> ${modalProduct.subtitle}</p>

          <span class="size-label">
            <span>SELECT SIZE</span>
            <small style="color:var(--muted); cursor:pointer;">View Size Chart</small>
          </span>

          <div class="size-options">
            ${["S", "M", "L", "XL", "XXL"].map(s => {
      const stockForSize = (modalProduct.stock && modalProduct.stock[s] !== undefined) ? modalProduct.stock[s] : 10;
      const isOut = stockForSize <= 0;
      return `
                <button class="size-option ${s === selectedSize ? 'selected' : ''} ${isOut ? 'out-of-stock' : ''}" 
                  data-size="${s}" ${isOut ? 'disabled title="Out of stock"' : ''}>
                  ${s}
                </button>
              `;
    }).join('')}
          </div>

          <div class="stock-indicator" id="modal-stock-indicator">
            In Stock · Dispatches in 24 hours
          </div>

          <button class="button button-dark modal-add" id="btn-modal-add-to-bag">
            Add to Bag <span>↗</span>
          </button>
        </div>
      </div>
    `;

    updateModalStockIndicator();
    productModal.showModal();
  }

  function updateModalStockIndicator() {
    const indicator = document.querySelector("#modal-stock-indicator");
    if (!indicator || !modalProduct) return;

    const count = (modalProduct.stock && modalProduct.stock[selectedSize] !== undefined) ? modalProduct.stock[selectedSize] : 10;
    if (count <= 0) {
      indicator.textContent = `Size ${selectedSize} is currently SOLD OUT.`;
      indicator.className = "stock-indicator low";
    } else if (count <= 4) {
      indicator.textContent = `Hurry! Only ${count} units left in size ${selectedSize}.`;
      indicator.className = "stock-indicator low";
    } else {
      indicator.textContent = `Size ${selectedSize} is In Stock · Dispatches in 24 hours`;
      indicator.className = "stock-indicator";
    }
  }

  function closeProductDetail() {
    if (productModal && productModal.open) {
      productModal.close();
    }
  }

  // ==========================================================================
  // 7. CHECKOUT & CASH ON DELIVERY (COD) ORDER PLACEMENT
  // ==========================================================================

  const checkoutModal = document.querySelector("#checkout-modal");
  const checkoutForm = document.querySelector("#checkout-form");
  const orderSuccessModal = document.querySelector("#order-success-modal");

  function openCheckout() {
    if (cart.length === 0) {
      showToast("Your shopping bag is empty");
      return;
    }

    closeCart();
    activeCheckoutStep = 1;
    setCheckoutStep(1);

    // Auto-fill logged in user info
    if (currentUser) {
      const coUserStatus = document.querySelector("#checkout-user-status");
      if (coUserStatus) coUserStatus.textContent = `Signed in as ${currentUser.name}`;

      const coName = document.querySelector("#co-name");
      const coPhone = document.querySelector("#co-phone");
      const coEmail = document.querySelector("#co-email");
      const coAddress = document.querySelector("#co-address");
      const coCity = document.querySelector("#co-city");
      const coState = document.querySelector("#co-state");
      const coPincode = document.querySelector("#co-pincode");

      if (coName) coName.value = currentUser.name || "";
      if (coPhone) coPhone.value = currentUser.phone || "";
      if (coEmail) coEmail.value = currentUser.email || "";
      if (coAddress) coAddress.value = currentUser.address || "";
      if (coCity) coCity.value = currentUser.city || "";
      if (coState) coState.value = currentUser.state || "";
      if (coPincode) coPincode.value = currentUser.pincode || "";
    }

    updateCheckoutSummary();
    if (checkoutModal) checkoutModal.showModal();
  }

  function closeCheckout() {
    if (checkoutModal && checkoutModal.open) checkoutModal.close();
  }

  function setCheckoutStep(step) {
    activeCheckoutStep = step;
    document.querySelectorAll(".step-indicator").forEach((el, idx) => {
      el.classList.toggle("active", idx + 1 === step);
    });
    document.querySelectorAll(".checkout-step-panel").forEach((el, idx) => {
      el.classList.toggle("active", idx + 1 === step);
    });

    if (step === 2 || step === 3) {
      const city = document.querySelector("#co-city")?.value || "";
      const state = document.querySelector("#co-state")?.value || "";
      const pin = document.querySelector("#co-pincode")?.value || "";
      const previewEl = document.querySelector("#co-preview-dest");
      if (previewEl) previewEl.textContent = `${city}, ${state} (${pin})`;
    }

    updateCheckoutSummary();
  }

  function updateCheckoutSummary() {
    const { subtotal, itemCount, isFreeShipping } = calculateCartTotals();
    const shippingMethod = document.querySelector('input[name="shipping-method"]:checked')?.value || "standard";

    let shippingCharge = 0;
    if (shippingMethod === "express") {
      shippingCharge = settings.expressShippingFee;
    } else {
      shippingCharge = isFreeShipping ? 0 : settings.standardShippingFee;
    }

    const grandTotal = subtotal + shippingCharge;

    const coItemCount = document.querySelector("#co-item-count");
    const coItemsTotal = document.querySelector("#co-items-total");
    const coShippingTotal = document.querySelector("#co-shipping-total");
    const coGrandTotal = document.querySelector("#co-grand-total");
    const btnPayAmount = document.querySelector("#btn-pay-amount");

    if (coItemCount) coItemCount.textContent = itemCount;
    if (coItemsTotal) coItemsTotal.textContent = money(subtotal);
    if (coShippingTotal) coShippingTotal.textContent = (shippingCharge === 0) ? "FREE" : money(shippingCharge);
    if (coGrandTotal) coGrandTotal.textContent = money(grandTotal);
    if (btnPayAmount) btnPayAmount.textContent = money(grandTotal);

    const standardPriceLabel = document.querySelector("#soc-standard-price");
    if (standardPriceLabel) standardPriceLabel.textContent = isFreeShipping ? "FREE" : money(settings.standardShippingFee);

    const expressPriceLabel = document.querySelector("#soc-express-price");
    if (expressPriceLabel) expressPriceLabel.textContent = money(settings.expressShippingFee);
  }

  // Handle Checkout submission -> Direct Cash on Delivery (COD) Order
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const name = document.querySelector("#co-name")?.value.trim();
      const phone = document.querySelector("#co-phone")?.value.trim();
      const email = document.querySelector("#co-email")?.value.trim();
      const address = document.querySelector("#co-address")?.value.trim();
      const city = document.querySelector("#co-city")?.value.trim();
      const state = document.querySelector("#co-state")?.value.trim();
      const pincode = document.querySelector("#co-pincode")?.value.trim();

      const shippingMethod = document.querySelector('input[name="shipping-method"]:checked')?.value || "standard";

      const { subtotal } = calculateCartTotals();
      const shippingCharge = (shippingMethod === "express") ? settings.expressShippingFee : (subtotal >= settings.freeShippingThreshold ? 0 : settings.standardShippingFee);
      const grandTotal = subtotal + shippingCharge;

      // Build customer object
      const customer = { name, phone, email, address, city, state, pincode };

      // Prepare order items snapshot
      const orderItems = cart.map(item => {
        const p = products.find(x => String(x.id) === String(item.id) || x.id === item.id);
        if (!p) return null;
        return {
          id: p.id,
          name: p.name,
          size: item.size || "M",
          price: p.price,
          qty: item.qty || 1,
          image: p.image
        };
      }).filter(Boolean);

      const orderRef = "UPR-2026-" + Math.floor(1000 + Math.random() * 9000);
      const awbCode = (shippingMethod === "express" ? "BLU-" : "DEL-") + Math.floor(10000000 + Math.random() * 90000000) + "IN";

      pendingCheckoutOrder = {
        id: orderRef,
        date: new Date().toISOString().replace("T", " ").substring(0, 16),
        customer,
        items: orderItems,
        itemsTotal: subtotal,
        shippingFee: shippingCharge,
        codFee: 0,
        grandTotal,
        paymentMethod: "Cash on Delivery (COD)",
        paymentId: "pay_cod_" + Date.now(),
        paymentStatus: "PENDING (Pay on Delivery)",
        fulfillmentStatus: "placed",
        courier: shippingMethod === "express" ? "BlueDart Priority Air" : "Delhivery Surface",
        awb: awbCode,
        estimatedDelivery: shippingMethod === "express" ? "1-2 Business Days" : "3-5 Business Days"
      };

      finalizeOrder("pay_cod_" + Date.now());
    });
  }

  function finalizeOrder(paymentId) {
    if (!pendingCheckoutOrder) return;

    pendingCheckoutOrder.paymentId = paymentId || ("pay_cod_" + Date.now());
    pendingCheckoutOrder.paymentStatus = "PENDING (Pay on Delivery)";
    pendingCheckoutOrder.fulfillmentStatus = "confirmed";

    // Deduct inventory stock for ordered items
    pendingCheckoutOrder.items.forEach(item => {
      const prod = products.find(p => String(p.id) === String(item.id) || p.id === item.id);
      if (prod && prod.stock && prod.stock[item.size] !== undefined) {
        prod.stock[item.size] = Math.max(0, prod.stock[item.size] - item.qty);
        // Sync decremented stock to MongoDB Atlas / server
        fetch(getApiUrl(`/api/products/${prod.id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stock: prod.stock })
        }).catch(err => console.warn('Order stock decrement notice:', err));
      }
    });

    // Save order
    orders.unshift(pendingCheckoutOrder);

    // Clear cart
    cart = [];
    persistStore();

    // Persist order to MongoDB Atlas / server
    fetch(getApiUrl('/api/orders'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pendingCheckoutOrder)
    }).catch(err => console.warn('Order sync notice:', err));

    // Close checkout
    closeCheckout();
    renderCart();
    renderCatalog();
    renderAdminOverview();
    broadcastCatalogSync('new_order', pendingCheckoutOrder);

    // Show Order Success Screen
    showOrderSuccess(pendingCheckoutOrder);
  }

  function showOrderSuccess(order) {
    const osmOrderId = document.querySelector("#osm-order-id");
    const osmPaymentStatus = document.querySelector("#osm-payment-status");
    const osmEstDate = document.querySelector("#osm-est-date");
    const osmCourier = document.querySelector("#osm-courier-partner");
    const osmAwb = document.querySelector("#osm-awb-code");

    if (osmOrderId) osmOrderId.textContent = order.id;
    if (osmPaymentStatus) {
      osmPaymentStatus.textContent = "Cash on Delivery (Pay on Delivery)";
      osmPaymentStatus.className = "badge-tag green";
    }
    if (osmEstDate) osmEstDate.textContent = order.estimatedDelivery;
    if (osmCourier) osmCourier.textContent = order.courier;
    if (osmAwb) osmAwb.textContent = order.awb;

    if (orderSuccessModal) orderSuccessModal.showModal();
  }

  // ==========================================================================
  // 8. ORDER TRACKING & STATUS STEPPER
  // ==========================================================================

  const orderTrackingModal = document.querySelector("#order-tracking-modal");
  const trackingSearchInput = document.querySelector("#tracking-search-input");
  const trackingResultPanel = document.querySelector("#tracking-result-panel");

  function openOrderTracking(orderId) {
    if (!orderTrackingModal) return;

    if (orderSuccessModal && orderSuccessModal.open) orderSuccessModal.close();

    let targetId = orderId;
    if (!targetId) {
      if (isAdminLoggedIn) {
        targetId = orders[0] ? orders[0].id : "";
      } else if (currentUser) {
        const userOrders = orders.filter(o => o.customer && o.customer.email && o.customer.email.toLowerCase() === (currentUser?.email || "").toLowerCase());
        targetId = userOrders[0] ? userOrders[0].id : (orders[0] ? orders[0].id : "");
      } else {
        targetId = "";
      }
    }

    if (trackingSearchInput) trackingSearchInput.value = targetId;

    if (targetId) {
      renderOrderTracking(targetId);
    } else if (trackingResultPanel) {
      trackingResultPanel.innerHTML = `
        <div class="cart-empty" style="padding: 40px 10px;">
          <span class="empty-icon">📦</span>
          <h3>Track Your Shipment</h3>
          <p>Enter your Order Reference ID (e.g., UPR-2026-8821) above to track live shipping milestones.</p>
        </div>
      `;
    }
    orderTrackingModal.showModal();
  }

  function closeOrderTracking() {
    if (orderTrackingModal && orderTrackingModal.open) orderTrackingModal.close();
  }

  function renderOrderTracking(orderId) {
    if (!trackingResultPanel) return;

    const cleanId = (orderId || "").trim().toUpperCase();
    const order = orders.find(o => o.id.toUpperCase() === cleanId);

    if (!order) {
      trackingResultPanel.innerHTML = `
        <div class="cart-empty" style="padding: 40px 10px;">
          <span class="empty-icon">🔍</span>
          <h3>Order Not Found</h3>
          <p>No shipment records found for "${cleanId}". Please verify your Order Reference ID.</p>
        </div>
      `;
      return;
    }

    const statuses = ["placed", "confirmed", "printing", "shipped", "delivered"];
    const currentIdx = statuses.indexOf(order.fulfillmentStatus);

    trackingResultPanel.innerHTML = `
      <div class="tracking-order-summary">
        <div>
          <h3>Order #${order.id}</h3>
          <p>Placed on ${order.date}</p>
        </div>
        <div class="tr-badge-group">
          <span class="badge-tag green">${order.fulfillmentStatus.toUpperCase()}</span>
          <span class="badge-tag">${order.courier} · AWB: ${order.awb}</span>
        </div>
      </div>

      <!-- 5-Step Order Status Stepper -->
      <div class="tracking-stepper">
        <div class="step-point ${currentIdx >= 0 ? 'done' : ''} ${currentIdx === 0 ? 'active' : ''}">
          <div class="point-circle">${currentIdx > 0 ? '✓' : '1'}</div>
          <div class="point-info">
            <strong>Order Placed</strong>
            <small>${order.date}</small>
          </div>
        </div>
        <div class="step-line ${currentIdx >= 1 ? 'done' : ''} ${currentIdx === 0 ? 'active' : ''}"></div>

        <div class="step-point ${currentIdx >= 1 ? 'done' : ''} ${currentIdx === 1 ? 'active' : ''}">
          <div class="point-circle">${currentIdx > 1 ? '✓' : '2'}</div>
          <div class="point-info">
            <strong>Confirmed</strong>
            <small>${order.paymentStatus}</small>
          </div>
        </div>
        <div class="step-line ${currentIdx >= 2 ? 'done' : ''} ${currentIdx === 1 ? 'active' : ''}"></div>

        <div class="step-point ${currentIdx >= 2 ? 'done' : ''} ${currentIdx === 2 ? 'active' : ''}">
          <div class="point-circle">${currentIdx > 2 ? '✓' : '👕'}</div>
          <div class="point-info">
            <strong>Printing Studio</strong>
            <small>Screen Print</small>
          </div>
        </div>
        <div class="step-line ${currentIdx >= 3 ? 'done' : ''} ${currentIdx === 2 ? 'active' : ''}"></div>

        <div class="step-point ${currentIdx >= 3 ? 'done' : ''} ${currentIdx === 3 ? 'active' : ''}">
          <div class="point-circle">${currentIdx > 3 ? '✓' : '🚚'}</div>
          <div class="point-info">
            <strong>Dispatched</strong>
            <small>${order.awb}</small>
          </div>
        </div>
        <div class="step-line ${currentIdx >= 4 ? 'done' : ''} ${currentIdx === 3 ? 'active' : ''}"></div>

        <div class="step-point ${currentIdx >= 4 ? 'done' : ''} ${currentIdx === 4 ? 'active' : ''}">
          <div class="point-circle">${currentIdx === 4 ? '✓' : '📦'}</div>
          <div class="point-info">
            <strong>Delivered</strong>
            <small>${order.estimatedDelivery}</small>
          </div>
        </div>
      </div>

      <!-- Shipment Meta -->
      <div class="shipment-meta-grid">
        <div class="sm-card">
          <span class="sm-label">DELIVERY DESTINATION</span>
          <p>${order.customer?.address || 'N/A'}, ${order.customer?.city || ''}, ${order.customer?.state || ''} - ${order.customer?.pincode || ''}</p>
        </div>
        <div class="sm-card">
          <span class="sm-label">RECIPIENT CONTACT</span>
          <p>${order.customer?.name || 'Customer'} · +91 ${order.customer?.phone || 'N/A'}</p>
        </div>
        <div class="sm-card">
          <span class="sm-label">PAYMENT BREAKDOWN</span>
          <p>Total ${money(order.grandTotal)} (${order.paymentMethod})</p>
        </div>
        <div class="sm-card">
          <span class="sm-label">ESTIMATED ARRIVAL</span>
          <p class="highlight-text">${order.estimatedDelivery}</p>
        </div>
      </div>

      <!-- Ordered Items -->
      <div class="tr-items-box">
        <h4>Items in this Shipment</h4>
        <div class="tr-items-list">
          ${order.items.map(it => `
            <div class="tr-item-row">
              <div style="display:flex; align-items:center; gap:12px;">
                <img src="${it.image}" alt="" style="width:36px; height:44px; object-fit:cover; border-radius:2px;">
                <div>
                  <strong>${it.name}</strong>
                  <span style="font-size:11px; color:var(--muted); display:block;">Size: ${it.size} · Qty: ${it.qty}</span>
                </div>
              </div>
              <strong>${money(it.price * it.qty)}</strong>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="tr-footer-actions">
        <button class="button button-outline" data-action="view-invoice" data-order-id="${order.id}">
          Download GST Tax Invoice <span>📄</span>
        </button>
      </div>
    `;
  }

  // ==========================================================================
  // 9. GST TAX INVOICE GENERATOR & MODAL
  // ==========================================================================

  const invoiceModal = document.querySelector("#invoice-modal");

  function openTaxInvoice(orderId) {
    const order = orders.find(o => o.id === orderId) || orders[0];
    if (!order || !invoiceModal) return;

    const invNum = document.querySelector("#inv-num");
    const invOrderRef = document.querySelector("#inv-order-ref");
    const invDate = document.querySelector("#inv-date");
    const invPayId = document.querySelector("#inv-pay-id");

    const invCustName = document.querySelector("#inv-customer-name");
    const invCustAddr = document.querySelector("#inv-customer-address");
    const invCustCity = document.querySelector("#inv-customer-city");
    const invCustContact = document.querySelector("#inv-customer-contact");

    const invCourier = document.querySelector("#inv-courier");
    const invAwb = document.querySelector("#inv-awb");
    const invTableBody = document.querySelector("#inv-table-body");

    const invSubtotal = document.querySelector("#inv-subtotal");
    const invShipping = document.querySelector("#inv-shipping");
    const invCgst = document.querySelector("#inv-cgst");
    const invSgst = document.querySelector("#inv-sgst");
    const invGrandTotal = document.querySelector("#inv-grand-total");

    if (invNum) invNum.textContent = "INV-" + order.id.replace("UPR-", "");
    if (invOrderRef) invOrderRef.textContent = order.id;
    if (invDate) invDate.textContent = order.date.split(" ")[0];
    if (invPayId) invPayId.textContent = order.paymentId || "COD-OFFLINE";

    if (invCustName) invCustName.textContent = order.customer?.name || "Customer";
    if (invCustAddr) invCustAddr.textContent = order.customer?.address || "Address on File";
    if (invCustCity) invCustCity.textContent = `${order.customer?.city || 'Mumbai'}, ${order.customer?.state || 'MH'} - ${order.customer?.pincode || '400001'}`;
    if (invCustContact) invCustContact.textContent = `Phone: +91 ${order.customer?.phone || 'N/A'} | Email: ${order.customer?.email || 'N/A'}`;

    if (invCourier) invCourier.textContent = order.courier;
    if (invAwb) invAwb.textContent = order.awb;

    if (invTableBody) {
      invTableBody.innerHTML = order.items.map((it, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${it.name} (Graphic Cotton Tee)</td>
          <td>610910</td>
          <td>${it.size}</td>
          <td>${it.qty}</td>
          <td>${money(it.price)}</td>
          <td>${money(it.price * it.qty)}</td>
        </tr>
      `).join('');
    }

    // 5% GST breakdown calculation (2.5% CGST + 2.5% SGST included)
    const baseValue = Math.round((order.itemsTotal / 1.05) * 100) / 100;
    const totalGst = Math.round((order.itemsTotal - baseValue) * 100) / 100;
    const halfGst = Math.round((totalGst / 2) * 100) / 100;

    if (invSubtotal) invSubtotal.textContent = money(order.itemsTotal);
    if (invShipping) invShipping.textContent = (order.shippingFee === 0) ? "FREE" : money(order.shippingFee);
    if (invCgst) invCgst.textContent = money(halfGst);
    if (invSgst) invSgst.textContent = money(halfGst);
    if (invGrandTotal) invGrandTotal.textContent = money(order.grandTotal);

    invoiceModal.showModal();
  }

  function closeTaxInvoice() {
    if (invoiceModal && invoiceModal.open) invoiceModal.close();
  }

  // ==========================================================================
  // 10. CUSTOMER AUTH & PROFILE MANAGEMENT
  // ==========================================================================

  const authModal = document.querySelector("#auth-modal");
  const authNavTabs = document.querySelector("#auth-nav-tabs");
  const loginForm = document.querySelector("#login-form");
  const registerForm = document.querySelector("#register-form");
  const userNameText = document.querySelector("#user-name-text");
  const userAvatarBadge = document.querySelector("#user-avatar-badge");
  const tabProfileBtn = document.querySelector("#tab-profile-btn");

  function openAuthModal(initialTab = "login") {
    if (!authModal) return;

    updateAuthHeaderUI();

    if (currentUser && currentUser.role !== 'admin' && currentUser.id !== 'admin_master') {
      switchAuthTab("profile");
      renderCustomerProfile();
    } else {
      switchAuthTab(initialTab === "admin-login" ? "login" : initialTab);
    }

    authModal.showModal();
  }

  function closeAuthModal() {
    if (authModal && authModal.open) authModal.close();
  }

  function switchAuthTab(targetTab) {
    document.querySelectorAll(".auth-tab").forEach(tab => {
      tab.classList.toggle("active", tab.dataset.target === targetTab);
    });

    document.querySelectorAll(".auth-tab-panel").forEach(panel => {
      panel.classList.toggle("active", panel.id === `auth-panel-${targetTab}`);
    });

    if (authModal) {
      authModal.classList.toggle("studio-mode", targetTab === "custom-studio");
    }

    const authModalEyebrow = document.querySelector("#auth-modal-eyebrow");
    const authModalTitle = document.querySelector("#auth-modal-title");

    if (targetTab === "custom-studio") {
      if (authModalEyebrow) authModalEyebrow.textContent = "CUSTOMER EXCLUSIVE STUDIO";
      if (authModalTitle) authModalTitle.textContent = "Design Your Custom T-Shirt";
      renderSavedCustomerUploads();
      if (typeof applyOverlayPosition === "function") {
        setTimeout(applyOverlayPosition, 60);
      }
    } else if (targetTab === "profile" && currentUser) {
      if (authModalEyebrow) authModalEyebrow.textContent = "CUSTOMER PORTAL";
      if (authModalTitle) authModalTitle.textContent = `Hello, ${(currentUser.name || "Shopper").split(" ")[0]}`;
    } else if (targetTab === "login") {
      if (authModalEyebrow) authModalEyebrow.textContent = "CUSTOMER PORTAL";
      if (authModalTitle) authModalTitle.textContent = "Welcome to Uprumm";
    } else if (targetTab === "register") {
      if (authModalEyebrow) authModalEyebrow.textContent = "CUSTOMER PORTAL";
      if (authModalTitle) authModalTitle.textContent = "Create an Account";
    } else if (targetTab === "admin-login") {
      if (authModalEyebrow) authModalEyebrow.textContent = "STORE ADMINISTRATOR";
      if (authModalTitle) authModalTitle.textContent = "Admin Studio Account";
    }
  }

  function updateAuthHeaderUI() {
    const adminPillBtn = document.querySelector("#admin-open-btn");
    const footerAdminBtn = document.querySelector("#footer-admin-btn");
    const headerAdminDirectBtn = document.querySelector("#header-admin-direct-btn");
    const mobAdminDirectBtn = document.querySelector("#mob-admin-direct-btn");
    const tabAdminLoginBtn = document.querySelector("#tab-admin-login-btn");

    if (adminPillBtn) adminPillBtn.style.display = "none";
    if (footerAdminBtn) footerAdminBtn.style.display = "none";
    if (headerAdminDirectBtn) headerAdminDirectBtn.style.display = "none";
    if (mobAdminDirectBtn) mobAdminDirectBtn.style.display = "none";
    if (tabAdminLoginBtn) tabAdminLoginBtn.style.display = "none";

    const tabLoginBtn = document.querySelector("#tab-login-btn");
    const tabRegisterBtn = document.querySelector("#tab-register-btn");
    const tabProfileBtn = document.querySelector("#tab-profile-btn");
    const tabCustomStudioBtn = document.querySelector("#tab-custom-studio-btn");
    const authModalEyebrow = document.querySelector("#auth-modal-eyebrow");
    const authModalTitle = document.querySelector("#auth-modal-title");

    const navTrackBtn = document.querySelector("#nav-track-btn");
    const footerTrackBtn = document.querySelector("#footer-track-btn");
    const mobOrdersBtn = document.querySelector("#mob-orders-btn");
    const navAccountBtn = document.querySelector("#nav-account-btn");
    const mobAccountLabel = document.querySelector("#mob-account-label");

    if (currentUser) {
      if (userNameText) userNameText.textContent = (currentUser.name || "User").split(" ")[0];
      if (userAvatarBadge) userAvatarBadge.textContent = (currentUser.name || "U").charAt(0).toUpperCase();
      if (navAccountBtn) navAccountBtn.textContent = `My Account (${(currentUser.name || "User").split(" ")[0]})`;
      if (mobAccountLabel) mobAccountLabel.textContent = (currentUser.name || "Account").split(" ")[0];

      if (tabLoginBtn) tabLoginBtn.style.display = "none";
      if (tabRegisterBtn) tabRegisterBtn.style.display = "none";
      if (tabProfileBtn) {
        tabProfileBtn.style.display = "inline-flex";
        tabProfileBtn.textContent = "My Account";
      }
      if (tabCustomStudioBtn) tabCustomStudioBtn.style.display = "inline-flex";

      if (authModalEyebrow) authModalEyebrow.textContent = "CUSTOMER PORTAL";
      if (authModalTitle) authModalTitle.textContent = `Hello, ${(currentUser.name || "Shopper").split(" ")[0]}`;

      if (navTrackBtn) navTrackBtn.style.display = "inline-flex";
      if (mobOrdersBtn) mobOrdersBtn.style.display = "flex";
      if (footerTrackBtn) footerTrackBtn.style.display = "none";

    } else {
      if (userNameText) userNameText.textContent = "Sign In";
      if (userAvatarBadge) userAvatarBadge.textContent = "👤";
      if (navAccountBtn) navAccountBtn.textContent = "Sign In / Account";
      if (mobAccountLabel) mobAccountLabel.textContent = "Account";

      if (tabLoginBtn) tabLoginBtn.style.display = "inline-flex";
      if (tabRegisterBtn) tabRegisterBtn.style.display = "inline-flex";
      if (tabProfileBtn) tabProfileBtn.style.display = "none";
      if (tabCustomStudioBtn) tabCustomStudioBtn.style.display = "none";

      if (authModalEyebrow) authModalEyebrow.textContent = "CUSTOMER PORTAL";
      if (authModalTitle) authModalTitle.textContent = "Welcome to Uprumm";

      if (navTrackBtn) navTrackBtn.style.display = "none";
      if (mobOrdersBtn) mobOrdersBtn.style.display = "none";
      if (footerTrackBtn) footerTrackBtn.style.display = "none";
    }
  }

  function handleAdminLoginSuccess(email = "tudurajanikanta@gmail.com") {
    isAdminLoggedIn = true;
    currentUser = {
      id: "admin_master",
      name: "Rajanikanta Tudu (Administrator)",
      email: email || "tudurajanikanta@gmail.com",
      phone: "9749535523",
      address: "Uprumm Studio HQ, Plot 14",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400072",
      role: "admin"
    };
    persistStore();
    updateAuthHeaderUI();
    closeAuthModal();
    showToast("⚡ Logged in as Studio Admin! Exclusively showing Management Section...");
    showManagementSection("adm-overview");
  }

  function renderCustomerProfile() {
    const adminCard = document.querySelector("#admin-manager-badge-card");

    if (isAdminLoggedIn) {
      if (adminCard) adminCard.style.display = "block";
      const profDisplayName = document.querySelector("#prof-display-name");
      const profDisplayEmail = document.querySelector("#prof-display-email");
      const profAvatarLetter = document.querySelector("#prof-avatar-letter");
      const profBadgeTag = document.querySelector("#prof-badge-tag");

      if (profDisplayName) profDisplayName.textContent = "Rajanikanta Tudu (Administrator)";
      if (profDisplayEmail) profDisplayEmail.textContent = currentUser ? currentUser.email : "tudurajanikanta@gmail.com";
      if (profAvatarLetter) profAvatarLetter.textContent = "⚡";
      if (profBadgeTag) {
        profBadgeTag.textContent = "STORE ADMINISTRATOR ACCESS";
        profBadgeTag.className = "badge-tag lime";
      }
    } else {
      if (adminCard) adminCard.style.display = "none";
      const profBadgeTag = document.querySelector("#prof-badge-tag");
      if (profBadgeTag) {
        profBadgeTag.textContent = "UPRUMM CLUB MEMBER";
        profBadgeTag.className = "badge-tag green";
      }
    }

    if (!currentUser && !isAdminLoggedIn) return;

    const profDisplayName = document.querySelector("#prof-display-name");
    const profDisplayEmail = document.querySelector("#prof-display-email");
    const profAvatarLetter = document.querySelector("#prof-avatar-letter");
    const profOrderCount = document.querySelector("#prof-order-count");
    const profOrdersList = document.querySelector("#prof-orders-list");

    const profAddrName = document.querySelector("#prof-addr-name");
    const profAddrLine = document.querySelector("#prof-addr-line");
    const profAddrCity = document.querySelector("#prof-addr-city");
    const profAddrPhone = document.querySelector("#prof-addr-phone");

    if (!isAdminLoggedIn && currentUser) {
      if (profDisplayName) profDisplayName.textContent = currentUser.name;
      if (profDisplayEmail) profDisplayEmail.textContent = currentUser.email;
      if (profAvatarLetter) profAvatarLetter.textContent = currentUser.name.charAt(0).toUpperCase();
    }

    if (currentUser) {
      if (profAddrName) profAddrName.textContent = currentUser.name;
      if (profAddrLine) profAddrLine.textContent = currentUser.address || "No address added yet";
      if (profAddrCity) profAddrCity.textContent = `${currentUser.city || 'Mumbai'}, ${currentUser.state || 'Maharashtra'} - ${currentUser.pincode || '400050'}`;
      if (profAddrPhone) profAddrPhone.textContent = `Phone: +91 ${currentUser.phone}`;
    }

    // Get orders placed by this customer (or all orders in admin/demo mode)
    const userOrders = isAdminLoggedIn
      ? orders
      : orders.filter(o => o.customer && o.customer.email && o.customer.email.toLowerCase() === (currentUser?.email || "").toLowerCase());

    if (profOrderCount) profOrderCount.textContent = `${userOrders.length} Order${userOrders.length === 1 ? '' : 's'}`;

    if (profOrdersList) {
      if (userOrders.length === 0) {
        profOrdersList.innerHTML = `<p style="font-size:12px; color:var(--muted);">No past orders found yet.</p>`;
      } else {
        profOrdersList.innerHTML = userOrders.map(o => `
          <div class="prof-order-card">
            <div class="poc-header">
              <strong>Order #${o.id}</strong>
              <span class="badge-tag green">${o.fulfillmentStatus.toUpperCase()}</span>
            </div>
            <div class="poc-items">
              ${o.items.map(it => `${it.qty}x ${it.name} (${it.size})`).join(', ')} · <strong>${money(o.grandTotal)}</strong>
            </div>
            <div class="poc-actions">
              <button class="button button-outline" style="min-height:32px; padding:0 12px; font-size:10px;" data-action="track-order-btn" data-id="${o.id}">
                Track Live <span>↗</span>
              </button>
              <button class="button button-dark" style="min-height:32px; padding:0 12px; font-size:10px;" data-action="view-invoice" data-order-id="${o.id}">
                Invoice <span>📄</span>
              </button>
            </div>
          </div>
        `).join('');
      }
    }

    renderSavedCustomerUploads();
  }

  // ==========================================================================
  // 10B. MEMBER CUSTOM UPLOADS STUDIO
  // ==========================================================================

  let custUploadedLogoData = null;
  let custSelectedColor = "Classic Black";
  let custSelectedHex = "#18191a";
  let custSelectedSize = "M";
  let custSelectedPlacement = "Center Chest";
  let custTeeImg = "assets/images/black-tee-front.jpg";

  function getCustomerUploadsKey() {
    const uid = currentUser ? (currentUser.id || currentUser.email) : "guest";
    return `uprumm_custom_uploads_${uid}`;
  }

  function getSavedCustomerUploads() {
    try {
      return JSON.parse(localStorage.getItem(getCustomerUploadsKey()) || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveCustomerUpload(item) {
    const list = getSavedCustomerUploads();
    list.unshift(item);
    localStorage.setItem(getCustomerUploadsKey(), JSON.stringify(list));
  }

  function renderSavedCustomerUploads() {
    const listEl = document.querySelector("#cust-saved-list");
    if (!listEl) return;

    const saved = getSavedCustomerUploads();
    if (saved.length === 0) {
      listEl.innerHTML = `<p style="font-size:11px; color:var(--muted); grid-column:1/-1;">No custom uploads yet. Upload your logo above to create your custom drop.</p>`;
      return;
    }

    listEl.innerHTML = saved.map((item, idx) => `
      <div class="cust-saved-item">
        <div class="cust-saved-thumb">
          <img src="${item.logo}" alt="Custom Print">
        </div>
        <div class="cust-saved-meta">
          <strong>${item.name || 'Custom Graphic Tee'}</strong>
          <span>${item.color} · ${item.size} · ${money(item.price || 999)}</span>
        </div>
        <button type="button" class="button button-outline" style="min-height:26px; padding:0 8px; font-size:9px;" data-action="reorder-custom" data-idx="${idx}">
          Re-Add to Bag 🛍️
        </button>
      </div>
    `).join('');

    listEl.querySelectorAll('[data-action="reorder-custom"]').forEach(btn => {
      btn.addEventListener("click", function () {
        const idx = parseInt(btn.dataset.idx, 10);
        const item = saved[idx];
        if (item) {
          addCustomItemToCart(item);
        }
      });
    });
  }

  function getCustomProducts() {
    try {
      return JSON.parse(localStorage.getItem("uprumm_custom_products") || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveCustomProduct(customProd) {
    try {
      const list = getCustomProducts().filter(p => String(p.id) !== String(customProd.id));
      list.unshift(customProd);
      localStorage.setItem("uprumm_custom_products", JSON.stringify(list));
    } catch (e) {
      console.warn("Custom product storage notice:", e);
    }
  }

  function addCustomItemToCart(customData) {
    const customProdId = customData.id || (999000 + Math.floor(Math.random() * 1000));
    const itemKey = `${customProdId}-${customData.size || 'M'}`;
    const clothImage = customData.teeImg || (customData.color === "Pure White" ? "assets/images/white-tee-front.jpg" : "assets/images/black-tee-front.jpg");

    const customProd = {
      id: customProdId,
      name: customData.name || `Custom Logo Tee (${customData.placement ? customData.placement.split(' ')[0] : 'Chest'})`,
      subtitle: `${customData.color} · Size ${customData.size || 'M'} · 240 GSM Bio-Washed`,
      price: 999,
      comparePrice: 1499,
      category: "custom",
      isCustom: true,
      badge: "CUSTOM DROP",
      image: clothImage,
      logoOverlay: customData.logo,
      customLogo: customData.logo,
      color: customData.hex || (customData.color === "Pure White" ? "#ffffff" : "#18191a"),
      colors: [customData.hex || (customData.color === "Pure White" ? "#ffffff" : "#18191a")],
      stock: { S: 50, M: 50, L: 50, XL: 50, XXL: 50 },
      description: `Custom customer t-shirt print with personal logo artwork. Placement: ${customData.placement || 'Center Chest'}. Size: ${customData.size || 'M'}.`,
      createdAtTimestamp: Date.now()
    };

    saveCustomProduct(customProd);

    const existingIdx = products.findIndex(p => String(p.id) === String(customProdId));
    if (existingIdx !== -1) {
      products[existingIdx] = customProd;
    } else {
      products.unshift(customProd);
    }

    const existingCartIdx = cart.findIndex(c => c.key === itemKey);
    if (existingCartIdx !== -1) {
      cart[existingCartIdx].qty = (cart[existingCartIdx].qty || 1) + 1;
    } else {
      cart.push({ key: itemKey, id: customProdId, size: customData.size || 'M', qty: 1 });
    }

    persistStore();
    renderCart();
    renderCatalog();
    showToast(`🎉 Custom T-shirt (${customData.color}, ${customData.size || 'M'}) added to your bag & catalog!`);
    closeAuthModal();
    openCart();
  }

  // Pre-configured Vector Artworks (Usable across Customizer & Admin Studio)
  const SAMPLE_CULTURAL_LOGO = "data:image/svg+xml;utf8," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320">
      <defs>
        <radialGradient id="crestGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="goldMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fef08a"/>
          <stop offset="35%" stop-color="#fbbf24"/>
          <stop offset="70%" stop-color="#d97706"/>
          <stop offset="100%" stop-color="#78350f"/>
        </linearGradient>
      </defs>
      <circle cx="160" cy="160" r="150" fill="url(#crestGlow)"/>
      <circle cx="160" cy="160" r="142" fill="none" stroke="url(#goldMetallic)" stroke-width="3" stroke-dasharray="8 6"/>
      <circle cx="160" cy="160" r="128" fill="#0f172a" fill-opacity="0.95" stroke="url(#goldMetallic)" stroke-width="2.5"/>
      <g stroke="url(#goldMetallic)" stroke-width="2" fill="none" opacity="0.85">
        <line x1="160" y1="36" x2="160" y2="48"/>
        <line x1="160" y1="272" x2="160" y2="284"/>
        <line x1="36" y1="160" x2="48" y2="160"/>
        <line x1="272" y1="160" x2="284" y2="160"/>
        <line x1="72" y1="72" x2="81" y2="81"/>
        <line x1="248" y1="248" x2="239" y2="239"/>
        <line x1="248" y1="72" x2="239" y2="81"/>
        <line x1="72" y1="248" x2="81" y2="239"/>
      </g>
      <polygon points="160,70 192,102 222,92 206,138 160,174 114,138 98,92 128,102" fill="url(#goldMetallic)" stroke="#ffffff" stroke-width="2"/>
      <circle cx="160" cy="122" r="18" fill="#0f172a" stroke="url(#goldMetallic)" stroke-width="3"/>
      <circle cx="160" cy="122" r="8" fill="#fbbf24"/>
      <text x="160" y="210" fill="#ffffff" font-family="'Outfit', -apple-system, sans-serif" font-size="20" font-weight="900" letter-spacing="4" text-anchor="middle">UPRUMM</text>
      <text x="160" y="232" fill="#fbbf24" font-family="'Outfit', -apple-system, sans-serif" font-size="10.5" font-weight="800" letter-spacing="3" text-anchor="middle">WEAR YOUR ROOTS</text>
      <line x1="110" y1="244" x2="210" y2="244" stroke="url(#goldMetallic)" stroke-width="1.5"/>
      <text x="160" y="258" fill="#94a3b8" font-family="sans-serif" font-size="8.5" font-weight="700" letter-spacing="2" text-anchor="middle">HANSDA EDITION</text>
    </svg>
  `);

  const SAMPLE_TOKYO_LOGO = "data:image/svg+xml;utf8," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320">
      <rect width="320" height="320" rx="36" fill="#0f172a"/>
      <circle cx="160" cy="160" r="110" fill="#e11d48" opacity="0.9"/>
      <text x="160" y="175" fill="#ffffff" font-family="'Space Grotesk', -apple-system, sans-serif" font-size="76" font-weight="900" text-anchor="middle">東京</text>
      <text x="160" y="240" fill="#ffffff" font-family="'Space Grotesk', -apple-system, sans-serif" font-size="14" font-weight="800" letter-spacing="6" text-anchor="middle">STREET CLUB</text>
    </svg>
  `);

  const SAMPLE_MINIMAL_LOGO = "data:image/svg+xml;utf8," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320">
      <circle cx="160" cy="160" r="130" fill="none" stroke="#ffffff" stroke-width="8"/>
      <polygon points="160,80 230,220 90,220" fill="none" stroke="#ffffff" stroke-width="8"/>
      <circle cx="160" cy="175" r="24" fill="#ffffff"/>
    </svg>
  `);

  const SAMPLE_PRESET_LOGOS = {
    hansda: SAMPLE_CULTURAL_LOGO,
    tokyo: SAMPLE_TOKYO_LOGO,
    minimal: SAMPLE_MINIMAL_LOGO
  };

  let pendingPhotoUpload = null;
  let pendingLogoUpload = null;

  function initCustomerUploadStudio() {
    const fileInput = document.querySelector("#cust-logo-file-input");
    const browseBtn = document.querySelector("#cust-browse-btn");
    const dropArea = document.querySelector("#cust-file-drop");
    const previewLogoImg = document.querySelector("#cust-preview-logo-img");
    const logoOverlay = document.querySelector("#cust-logo-overlay");
    const ghostPlaceholder = document.querySelector("#cust-ghost-placeholder");
    const ghostPlacementLabel = document.querySelector("#cust-ghost-placement-label");
    const fileNameText = document.querySelector("#cust-file-name-text");
    const addBagBtn = document.querySelector("#cust-add-to-bag-btn");
    const teeBaseImg = document.querySelector("#cust-tee-base-img");
    const teeCanvas = document.querySelector("#cust-tee-canvas");
    const placementSelect = document.querySelector("#cust-placement-select");
    const currentPlacementText = document.querySelector("#cust-current-placement-text");
    const scaleSlider = document.querySelector("#cust-scale-slider");
    const scaleVal = document.querySelector("#cust-scale-val");
    const viewFrontBtn = document.querySelector("#cust-view-front-btn");
    const viewBackBtn = document.querySelector("#cust-view-back-btn");
    const sampleArtBtn = document.querySelector("#cust-sample-art-btn");
    const clearArtBtn = document.querySelector("#cust-clear-art-btn");

    const TEE_VIEW_IMAGES = {
      "Classic Black": {
        front: "assets/images/black-tee-front.jpg",
        back: "assets/images/black-tee-back.jpg"
      },
      "Pure White": {
        front: "assets/images/white-tee-front.jpg",
        back: "assets/images/white-tee-back.jpg"
      }
    };

    let activeView = "front"; // "front" or "back"
    let currentTopPercent = 38;
    let currentLeftPercent = 50;
    let currentWidthPercent = 40;

    function updateScaleButtonsUI(val) {
      const rounded = Math.round(val);
      document.querySelectorAll(".cust-scale-btn").forEach(btn => {
        const scale = parseInt(btn.dataset.scale, 10);
        btn.classList.toggle("active", Math.abs(scale - rounded) <= 3);
      });
    }

    function applyOverlayPosition() {
      if (!logoOverlay) return;
      logoOverlay.style.top = `${currentTopPercent}%`;
      logoOverlay.style.left = `${currentLeftPercent}%`;
      logoOverlay.style.width = `${currentWidthPercent}%`;
      logoOverlay.style.height = `${currentWidthPercent}%`;

      if (scaleVal) scaleVal.textContent = `${Math.round(currentWidthPercent)}%`;
      if (scaleSlider && parseInt(scaleSlider.value, 10) !== Math.round(currentWidthPercent)) {
        scaleSlider.value = Math.round(currentWidthPercent);
      }
      updateScaleButtonsUI(currentWidthPercent);
    }

    function setPlacement(name, top, left, width, view) {
      custSelectedPlacement = name;
      currentTopPercent = top;
      currentLeftPercent = left;
      currentWidthPercent = width;

      if (view && view !== activeView) {
        switchView(view);
      }

      applyOverlayPosition();

      if (currentPlacementText) currentPlacementText.textContent = name;
      if (ghostPlacementLabel) ghostPlacementLabel.textContent = name;
      if (placementSelect) placementSelect.value = name;

      // Update active chip state
      document.querySelectorAll(".cust-place-btn").forEach(btn => {
        if (btn.dataset.placement === name) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }

    function switchView(view) {
      activeView = view;
      if (viewFrontBtn && viewBackBtn) {
        viewFrontBtn.classList.toggle("active", activeView === "front");
        viewBackBtn.classList.toggle("active", activeView === "back");
      }

      const colorData = TEE_VIEW_IMAGES[custSelectedColor] || TEE_VIEW_IMAGES["Classic Black"];
      if (teeBaseImg) {
        teeBaseImg.src = activeView === "back" ? colorData.back : colorData.front;
      }
      custTeeImg = teeBaseImg ? teeBaseImg.src : "";
    }

    // View toggle buttons
    if (viewFrontBtn) {
      viewFrontBtn.addEventListener("click", () => {
        switchView("front");
        if (custSelectedPlacement.includes("Back")) {
          setPlacement("Center Chest", 38, 50, 42, "front");
        }
      });
    }

    if (viewBackBtn) {
      viewBackBtn.addEventListener("click", () => {
        switchView("back");
        if (!custSelectedPlacement.includes("Back")) {
          setPlacement("Full Back Graphic", 44, 50, 54, "back");
        }
      });
    }

    // Placement preset chips
    document.querySelectorAll(".cust-place-btn").forEach(btn => {
      btn.addEventListener("click", function () {
        const name = btn.dataset.placement;
        const top = parseFloat(btn.dataset.top);
        const left = parseFloat(btn.dataset.left);
        const width = parseFloat(btn.dataset.width);
        const view = btn.dataset.view || "front";
        setPlacement(name, top, left, width, view);
      });
    });

    // Nudge D-Pad Controls
    const nudgeUpBtn = document.querySelector("#cust-nudge-up");
    const nudgeDownBtn = document.querySelector("#cust-nudge-down");
    const nudgeLeftBtn = document.querySelector("#cust-nudge-left");
    const nudgeRightBtn = document.querySelector("#cust-nudge-right");
    const nudgeCenterBtn = document.querySelector("#cust-nudge-center");

    if (nudgeUpBtn) {
      nudgeUpBtn.addEventListener("click", () => {
        currentTopPercent = Math.max(12, currentTopPercent - 2.5);
        applyOverlayPosition();
        if (currentPlacementText) currentPlacementText.textContent = "Custom Position";
        document.querySelectorAll(".cust-place-btn").forEach(b => b.classList.remove("active"));
      });
    }
    if (nudgeDownBtn) {
      nudgeDownBtn.addEventListener("click", () => {
        currentTopPercent = Math.min(85, currentTopPercent + 2.5);
        applyOverlayPosition();
        if (currentPlacementText) currentPlacementText.textContent = "Custom Position";
        document.querySelectorAll(".cust-place-btn").forEach(b => b.classList.remove("active"));
      });
    }
    if (nudgeLeftBtn) {
      nudgeLeftBtn.addEventListener("click", () => {
        currentLeftPercent = Math.max(15, currentLeftPercent - 2.5);
        applyOverlayPosition();
        if (currentPlacementText) currentPlacementText.textContent = "Custom Position";
        document.querySelectorAll(".cust-place-btn").forEach(b => b.classList.remove("active"));
      });
    }
    if (nudgeRightBtn) {
      nudgeRightBtn.addEventListener("click", () => {
        currentLeftPercent = Math.min(85, currentLeftPercent + 2.5);
        applyOverlayPosition();
        if (currentPlacementText) currentPlacementText.textContent = "Custom Position";
        document.querySelectorAll(".cust-place-btn").forEach(b => b.classList.remove("active"));
      });
    }
    if (nudgeCenterBtn) {
      nudgeCenterBtn.addEventListener("click", () => {
        setPlacement("Center Chest", 38, 50, currentWidthPercent, "front");
      });
    }

    // Scale slider & Scale Preset Chips
    if (scaleSlider) {
      scaleSlider.addEventListener("input", function () {
        currentWidthPercent = parseInt(scaleSlider.value, 10);
        applyOverlayPosition();
      });
    }

    document.querySelectorAll(".cust-scale-btn").forEach(btn => {
      btn.addEventListener("click", function () {
        const scale = parseInt(btn.dataset.scale, 10);
        if (!isNaN(scale)) {
          currentWidthPercent = scale;
          if (scaleSlider) scaleSlider.value = scale;
          applyOverlayPosition();
        }
      });
    });

    // Click/Tap anywhere on shirt canvas to place print immediately
    let isDraggingRecently = false;
    if (teeCanvas) {
      teeCanvas.addEventListener("click", function (e) {
        if (e.target.closest("#cust-logo-overlay") || isDraggingRecently) return;
        const rect = teeCanvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        currentLeftPercent = Math.max(15, Math.min(85, Math.round((clickX / rect.width) * 100)));
        currentTopPercent = Math.max(12, Math.min(85, Math.round((clickY / rect.height) * 100)));

        applyOverlayPosition();
        if (currentPlacementText) currentPlacementText.textContent = "Custom Position";
        document.querySelectorAll(".cust-place-btn").forEach(b => b.classList.remove("active"));
      });
    }

    // Interactive Dragging on Canvas (Mouse & Touch)
    if (logoOverlay && teeCanvas) {
      let isDragging = false;
      let startX = 0, startY = 0;
      let initialLeft = 50, initialTop = 38;

      function onDragStart(clientX, clientY) {
        isDragging = true;
        logoOverlay.classList.add("dragging");
        startX = clientX;
        startY = clientY;
        initialLeft = currentLeftPercent;
        initialTop = currentTopPercent;
      }

      function onDragMove(clientX, clientY) {
        if (!isDragging) return;
        const rect = teeCanvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const deltaX = ((clientX - startX) / rect.width) * 100;
        const deltaY = ((clientY - startY) / rect.height) * 100;

        currentLeftPercent = Math.max(15, Math.min(85, Math.round((initialLeft + deltaX) * 10) / 10));
        currentTopPercent = Math.max(12, Math.min(85, Math.round((initialTop + deltaY) * 10) / 10));

        applyOverlayPosition();
        if (currentPlacementText) currentPlacementText.textContent = "Custom Position";
        document.querySelectorAll(".cust-place-btn").forEach(b => b.classList.remove("active"));
      }

      function onDragEnd() {
        if (!isDragging) return;
        isDragging = false;
        logoOverlay.classList.remove("dragging");
        isDraggingRecently = true;
        setTimeout(() => { isDraggingRecently = false; }, 150);
      }

      logoOverlay.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragStart(e.clientX, e.clientY);
      });

      window.addEventListener("mousemove", (e) => {
        if (isDragging) {
          e.preventDefault();
          onDragMove(e.clientX, e.clientY);
        }
      });

      window.addEventListener("mouseup", () => {
        if (isDragging) onDragEnd();
      });

      logoOverlay.addEventListener("touchstart", (e) => {
        if (e.touches && e.touches[0]) {
          e.preventDefault();
          e.stopPropagation();
          onDragStart(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: false });

      window.addEventListener("touchmove", (e) => {
        if (isDragging && e.touches && e.touches[0]) {
          e.preventDefault();
          onDragMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: false });

      window.addEventListener("touchend", () => {
        if (isDragging) onDragEnd();
      });
    }

    // Sample Cultural Artwork Demo Button
    if (sampleArtBtn) {
      sampleArtBtn.addEventListener("click", () => {
        custUploadedLogoData = SAMPLE_CULTURAL_LOGO;
        if (previewLogoImg) {
          previewLogoImg.src = custUploadedLogoData;
          previewLogoImg.style.display = "block";
        }
        if (ghostPlaceholder) {
          ghostPlaceholder.style.display = "none";
        }
        if (clearArtBtn) {
          clearArtBtn.style.display = "inline-flex";
        }
        if (fileNameText) {
          fileNameText.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; margin-top:6px;">
              <img src="${custUploadedLogoData}" alt="Hansda Cultural Insignia" style="width:38px; height:38px; object-fit:contain; background:#ffffff; border:1.5px solid #cbd5e1; border-radius:4px; padding:2px; flex-shrink:0;">
              <div>
                <strong style="color:var(--ink); font-size:11px; display:block;">Sample: Hansda Cultural Insignia</strong>
                <span style="color:#16a34a; font-weight:700; font-size:10px;">✓ Vector SVG Thumbnail Active</span>
              </div>
            </div>
          `;
        }
        if (addBagBtn) {
          addBagBtn.disabled = false;
          addBagBtn.innerHTML = `Add Custom T-Shirt to Bag (₹999) <span>🛍️</span>`;
        }
        applyOverlayPosition();
        showToast("👑 Sample Hansda Cultural Insignia loaded! Drag to position or choose presets.");
      });
    }

    // Clear / Remove Logo Button
    if (clearArtBtn) {
      clearArtBtn.addEventListener("click", () => {
        custUploadedLogoData = null;
        if (previewLogoImg) {
          previewLogoImg.src = "";
          previewLogoImg.style.display = "none";
        }
        if (ghostPlaceholder) {
          ghostPlaceholder.style.display = "flex";
        }
        if (clearArtBtn) {
          clearArtBtn.style.display = "none";
        }
        if (fileInput) fileInput.value = "";
        if (fileNameText) {
          fileNameText.textContent = "Click to browse or drag & drop transparent PNG, SVG, or high-res JPG";
        }
        if (addBagBtn) {
          addBagBtn.disabled = true;
          addBagBtn.innerHTML = `Upload Artwork to Add to Bag (₹999)`;
        }
        showToast("Logo removed. You can upload an image or test with sample artwork.");
      });
    }

    // Browse and drag & drop for file upload
    if (browseBtn && fileInput) {
      browseBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }

    if (dropArea && fileInput) {
      dropArea.addEventListener("click", (e) => {
        if (e.target.closest("#cust-browse-btn")) return;
        fileInput.click();
      });

      dropArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropArea.style.borderColor = "var(--lime)";
      });

      dropArea.addEventListener("dragleave", () => {
        dropArea.style.borderColor = "var(--ink)";
      });

      dropArea.addEventListener("drop", (e) => {
        e.preventDefault();
        dropArea.style.borderColor = "var(--ink)";
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleLogoFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (fileInput) {
      fileInput.addEventListener("change", function () {
        if (fileInput.files && fileInput.files[0]) {
          handleLogoFile(fileInput.files[0]);
        }
      });
    }

    function handleLogoFile(file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        custUploadedLogoData = e.target.result;
        if (previewLogoImg) {
          previewLogoImg.src = custUploadedLogoData;
          previewLogoImg.style.display = "block";
        }
        if (ghostPlaceholder) {
          ghostPlaceholder.style.display = "none";
        }
        if (clearArtBtn) {
          clearArtBtn.style.display = "inline-flex";
        }
        if (logoOverlay) {
          logoOverlay.style.display = "flex";
        }
        applyOverlayPosition();

        if (fileNameText) {
          fileNameText.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; margin-top:6px;">
              <img src="${custUploadedLogoData}" alt="Artwork Thumbnail" style="width:38px; height:38px; object-fit:contain; background:#ffffff; border:1.5px solid #cbd5e1; border-radius:4px; padding:2px; flex-shrink:0;">
              <div>
                <strong style="color:var(--ink); font-size:11px; display:block;">${file.name}</strong>
                <span class="cust-file-status" style="color:#16a34a; font-weight:700; font-size:10px;">✓ Artwork Thumbnail Active (${Math.round(file.size / 1024)} KB)</span>
              </div>
            </div>
          `;
        }
        if (addBagBtn) {
          addBagBtn.disabled = false;
          addBagBtn.innerHTML = `Add Custom T-Shirt to Bag (₹999) <span>🛍️</span>`;
        }
        showToast("🎨 Logo uploaded! Drag on shirt or use position buttons to adjust.");

        // Upload to server storage in background
        fetch(getApiUrl('/api/upload'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl: custUploadedLogoData, name: file.name })
        }).then(r => r.ok ? r.json() : null).then(data => {
          if (data && data.url) {
            custUploadedLogoData = data.url;
            const statusSpan = fileNameText?.querySelector('.cust-file-status');
            if (statusSpan) {
              statusSpan.textContent = '✓ Saved to Server';
            }
          }
        }).catch(() => { });
      };
      reader.readAsDataURL(file);
    }

    // Color chips
    document.querySelectorAll(".cust-color-chip").forEach(chip => {
      chip.addEventListener("click", function () {
        document.querySelectorAll(".cust-color-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        custSelectedColor = chip.dataset.color || "Classic Black";
        custSelectedHex = chip.dataset.hex || "#18191a";

        const colorData = TEE_VIEW_IMAGES[custSelectedColor] || TEE_VIEW_IMAGES["Classic Black"];
        if (teeBaseImg) {
          teeBaseImg.src = activeView === "back" ? colorData.back : colorData.front;
        }
        custTeeImg = teeBaseImg ? teeBaseImg.src : "";
      });
    });

    // Size chips
    document.querySelectorAll(".cust-size-chip").forEach(chip => {
      chip.addEventListener("click", function () {
        document.querySelectorAll(".cust-size-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        custSelectedSize = chip.dataset.size || "M";
      });
    });

    // Initial overlay setup
    applyOverlayPosition();

    // Add to bag button
    if (addBagBtn) {
      addBagBtn.addEventListener("click", function () {
        if (!custUploadedLogoData) {
          showToast("Please upload a logo or graphic design first!");
          return;
        }

        const customData = {
          id: Date.now(),
          name: `Custom Tee - ${custSelectedPlacement}`,
          color: custSelectedColor,
          hex: custSelectedHex,
          size: custSelectedSize,
          placement: custSelectedPlacement,
          view: activeView,
          logo: custUploadedLogoData,
          teeImg: custTeeImg || (teeBaseImg ? teeBaseImg.src : ""),
          price: 999,
          date: new Date().toLocaleDateString()
        };

        saveCustomerUpload(customData);
        renderSavedCustomerUploads();
        addCustomItemToCart(customData);
      });
    }
  }

  // Handle Customer Login submission (STRICTLY for registered customer accounts)
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = document.querySelector("#login-email")?.value.trim();
      const password = document.querySelector("#login-password")?.value.trim();

      if (!email || !password) {
        showToast("Please enter both email and password.");
        return;
      }

      let user = null;

      try {
        const res = await fetch(getApiUrl("/api/users/login"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.user && data.user.role !== 'admin' && data.user.id !== 'admin_master') {
            user = data.user;
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          showToast(errData.error || "Invalid email or password. Only registered customer accounts can sign in.");
          return;
        }
      } catch (err) {
        console.warn("[Customer Auth] Server login notice:", err.message);
        // Fallback for offline mode: match ONLY registered customer accounts (never admin)
        user = users.find(u =>
          u &&
          u.email &&
          u.email.toLowerCase() === email.toLowerCase() &&
          u.password === password &&
          u.role !== 'admin' &&
          u.id !== 'admin_master' &&
          (u.email || '').toLowerCase() !== 'tudurajanikanta@gmail.com'
        );
      }

      if (user && user.role !== 'admin' && user.id !== 'admin_master' && (user.email || '').toLowerCase() !== 'tudurajanikanta@gmail.com') {
        currentUser = user;
        isAdminLoggedIn = false;
        persistStore();
        updateAuthHeaderUI();
        switchAuthTab("profile");
        renderCustomerProfile();
        showToast(`Welcome back, ${(user.name || "Member").split(" ")[0]}!`);
      } else {
        showToast("Invalid email or password. Only registered customer accounts can sign in.");
      }
    });
  }

  // Handle Register submission
  if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const name = document.querySelector("#reg-name")?.value.trim();
      const email = document.querySelector("#reg-email")?.value.trim();
      const phone = document.querySelector("#reg-phone")?.value.trim();
      const password = document.querySelector("#reg-password")?.value.trim();
      const address = document.querySelector("#reg-address")?.value.trim() || "Address on File";
      const city = document.querySelector("#reg-city")?.value.trim() || "Mumbai";
      const pincode = document.querySelector("#reg-pincode")?.value.trim() || "400001";

      if (!name || !email || !password) {
        showToast("Please provide your name, email ID, and password.");
        return;
      }

      if (users.find(u => u && u.email && u.email.toLowerCase() === email.toLowerCase())) {
        showToast("An account with this email already exists.");
        return;
      }

      const newUser = {
        id: "usr_" + Date.now(),
        name,
        email: email.toLowerCase(),
        phone: phone || "",
        password,
        address,
        city,
        state: "India",
        pincode,
        joinedDate: new Date().toISOString().split("T")[0]
      };

      try {
        const res = await fetch(getApiUrl('/api/users'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser)
        });
        if (res.ok) {
          const serverUser = await res.json();
          if (serverUser) {
            Object.assign(newUser, serverUser);
          }
        }
      } catch (err) {
        console.warn('User sync notice:', err.message);
      }

      users.push(newUser);
      currentUser = newUser;
      isAdminLoggedIn = false;
      persistStore();
      updateAuthHeaderUI();
      switchAuthTab("profile");
      renderCustomerProfile();
      showToast(`Account created! Welcome to Uprumm Print Club.`);
    });
  }


  // ==========================================================================
  // 11. ADMIN STUDIO DASHBOARD (FULL OVERVIEW, ORDERS, PRODUCTS, STOCK)
  // ==========================================================================

  const customerStorefrontView = document.querySelector("#customer-storefront-view");
  const adminManagementView = document.querySelector("#admin-management-view");
  const adminPreviewBanner = document.querySelector("#admin-preview-banner");
  const productEditorModal = document.querySelector("#product-editor-modal");
  const productEditorForm = document.querySelector("#product-editor-form");

  function showManagementSection(activeTab = "adm-overview") {
    if (!isAdminLoggedIn) {
      handleAdminLoginSuccess("tudurajanikanta@gmail.com");
      return;
    }

    if (window.location.hash !== "#admin") {
      try {
        history.pushState(null, document.title, window.location.pathname + "#admin");
      } catch (e) {
        window.location.hash = "#admin";
      }
    }

    // Close all customer popups, modals, and drawers
    closeCart();
    closeCheckout();
    closeProductDetail();
    closeAuthModal();
    closeOrderTracking();
    closeTaxInvoice();

    // Exclusively show the management section and hide the customer storefront
    if (customerStorefrontView) customerStorefrontView.style.display = "none";
    if (adminPreviewBanner) adminPreviewBanner.style.display = "none";
    if (adminManagementView) adminManagementView.style.display = "flex";

    document.body.style.overflow = "hidden";
    switchAdminTab(activeTab);
  }

  function showCustomerStorefront(previewMode = false) {
    if (adminManagementView) adminManagementView.style.display = "none";
    if (customerStorefrontView) customerStorefrontView.style.display = "block";

    document.body.style.overflow = "";

    if (window.location.hash === "#admin") {
      try {
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
      } catch (e) { }
    }

    if (previewMode && isAdminLoggedIn) {
      if (adminPreviewBanner) adminPreviewBanner.style.display = "flex";
    } else {
      if (adminPreviewBanner) adminPreviewBanner.style.display = "none";
    }

    // Always reset storefront filter to "All tees" so newly added drops are immediately visible
    activeFilter = "all";
    document.querySelectorAll(".filter").forEach(b => {
      b.classList.toggle("active", b.dataset.filter === "all");
    });
    showAll = true;

    renderCatalog();
    updateAuthHeaderUI();

    // Trigger non-blocking sync with server database to ensure newly published drops are live
    syncProductsFromServer(true);
  }

  // Smoothly navigates the user from Admin to a specific product on the live customer storefront
  function navigateToProductOnStorefront(productId) {
    showCustomerStorefront(true);
    setTimeout(() => {
      const card = document.querySelector(`.product-card[data-product-id="${productId}"]`);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.classList.add("product-card-highlight");
        setTimeout(() => card.classList.remove("product-card-highlight"), 3500);
      } else {
        const shopEl = document.querySelector("#shop");
        if (shopEl) shopEl.scrollIntoView({ behavior: "smooth" });
      }
    }, 150);
  }

  function openAdminDashboard(activeTab = "adm-overview") {
    showManagementSection(activeTab);
  }

  function closeAdminDashboard() {
    showCustomerStorefront(true);
  }

  function switchAdminTab(tabId) {
    document.querySelectorAll(".admin-nav-item").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabId);
    });

    document.querySelectorAll(".admin-quick-pill").forEach(pill => {
      const isActive = pill.dataset.tab === tabId;
      pill.classList.toggle("active", isActive);
      if (isActive && typeof pill.scrollIntoView === 'function') {
        pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    });

    document.querySelectorAll(".admin-panel").forEach(panel => {
      panel.classList.toggle("active", panel.id === tabId);
    });

    // Auto-close mobile drawer sidebar when switching tabs
    const adminSidebar = document.querySelector("#admin-sidebar");
    const adminOverlay = document.querySelector("#admin-sidebar-overlay");
    if (adminSidebar) adminSidebar.classList.remove("open");
    if (adminOverlay) adminOverlay.classList.remove("open");

    const titleEl = document.querySelector("#adm-active-tab-title");
    const titles = {
      "adm-overview": "Studio Overview & KPIs",
      "adm-products": "T-Shirt Products & Custom Drops",
      "adm-orders": "Customer Orders & Shipment Status",
      "adm-customers": "Customer Accounts & Profiles",
      "adm-stock": "Size-Wise Stock & Inventory Control",
      "adm-settings": "Store Preferences & Shipping Rules"
    };

    if (titleEl && titles[tabId]) titleEl.textContent = titles[tabId];

    if (tabId === "adm-overview") {
      renderAdminOverview();
    } else if (tabId === "adm-products") {
      renderAdminProductsTable();
    } else if (tabId === "adm-orders") {
      renderAdminOrdersTable();
    } else if (tabId === "adm-customers") {
      renderAdminCustomersTable();
    } else if (tabId === "adm-stock") {
      renderAdminStockTable();
    } else if (tabId === "adm-settings") {
      populateSettingsForm();
    }
  }

  function populateSettingsForm() {
    const freeThreshInput = document.querySelector("#set-free-threshold");
    const stdFeeInput = document.querySelector("#set-std-fee");
    const expFeeInput = document.querySelector("#set-exp-fee");

    if (freeThreshInput) freeThreshInput.value = settings.freeShippingThreshold ?? 1499;
    if (stdFeeInput) stdFeeInput.value = settings.standardShippingFee ?? 99;
    if (expFeeInput) expFeeInput.value = settings.expressShippingFee ?? 149;
  }

  function updateMediaStatusUI() {
    // Media storage is handled directly by self-hosted local server disk storage (/uploads/)
  }

  function renderAdminOverview() {
    // 1. Calculate KPIs
    const totalRev = orders.reduce((sum, o) => sum + (o.paymentStatus === "PAID" ? o.grandTotal : 0), 0);
    const activeOrdersCount = orders.filter(o => o.fulfillmentStatus !== "delivered").length;
    const totalProductsCount = products.length;

    let lowStockCount = 0;
    products.forEach(p => {
      Object.values(p.stock || {}).forEach(st => {
        if (st <= 4) lowStockCount++;
      });
    });

    const kpiRev = document.querySelector("#kpi-revenue");
    const kpiOrd = document.querySelector("#kpi-orders");
    const kpiProd = document.querySelector("#kpi-products");
    const kpiLow = document.querySelector("#kpi-low-stock");

    if (kpiRev) kpiRev.textContent = money(totalRev);
    if (kpiOrd) kpiOrd.textContent = `${activeOrdersCount} Active`;
    if (kpiProd) kpiProd.textContent = `${totalProductsCount} T-Shirts`;
    if (kpiLow) kpiLow.textContent = `${lowStockCount} Sizes`;

    // 2. Recent orders table
    const recentOrdersTbody = document.querySelector("#adm-recent-orders-tbody");
    if (recentOrdersTbody) {
      if (!orders.length) {
        recentOrdersTbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center; padding:24px; color:var(--muted); font-size:12px;">
              No store orders placed yet. Customer orders will appear here with live tracking.
            </td>
          </tr>
        `;
      } else {
        recentOrdersTbody.innerHTML = orders.slice(0, 5).map(o => `
          <tr>
            <td><strong>${o.id}</strong></td>
            <td>${o.customer?.name || 'Customer'}</td>
            <td>${money(o.grandTotal || 0)}</td>
            <td><span class="badge-tag ${o.paymentStatus === 'PAID' ? 'green' : ''}">${o.paymentStatus || 'PAID'}</span></td>
            <td><span class="badge-tag">${(o.fulfillmentStatus || 'placed').toUpperCase()}</span></td>
          </tr>
        `).join('');
      }
    }

    // 3. Products table
    renderAdminProductsTable();

    // 4. Orders table
    renderAdminOrdersTable();

    // 5. Customers table
    renderAdminCustomersTable();

    // 6. Stock matrix table
    renderAdminStockTable();
  }

  let activeAdminProdCategory = 'all';
  let adminProdSearchTerm = '';

  function renderAdminProductsTable() {
    const tbody = document.querySelector("#adm-products-tbody");
    if (!tbody) return;

    // Update Category Pill Counts
    const countAll = document.querySelector("#count-all");
    const countGraphic = document.querySelector("#count-graphic");
    const countMinimal = document.querySelector("#count-minimal");
    const countCustom = document.querySelector("#count-custom");
    const countLowStock = document.querySelector("#count-low-stock");

    const totalDrops = products.length;
    const graphicDrops = products.filter(p => (p.category || 'graphic') === 'graphic').length;
    const minimalDrops = products.filter(p => p.category === 'minimal').length;
    const customDrops = products.filter(p => p.category === 'custom' || p.isCustom).length;
    const lowStockDrops = products.filter(p => Object.values(p.stock || {}).reduce((a, b) => a + b, 0) < 15).length;

    if (countAll) countAll.textContent = totalDrops;
    if (countGraphic) countGraphic.textContent = graphicDrops;
    if (countMinimal) countMinimal.textContent = minimalDrops;
    if (countCustom) countCustom.textContent = customDrops;
    if (countLowStock) countLowStock.textContent = lowStockDrops;

    if (!products.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:40px 20px; color:var(--muted);">
            <div style="font-size:28px; margin-bottom:8px;">👕</div>
            <strong style="color:var(--ink); font-size:14px; display:block; margin-bottom:4px;">No T-Shirt drops in catalog</strong>
            <span style="font-size:12px;">Click <strong>"+ Add New Drop"</strong> above to publish your first drop!</span>
          </td>
        </tr>
      `;
      return;
    }

    // Apply active category and search filter
    let filtered = [...products];

    if (activeAdminProdCategory === 'graphic') {
      filtered = filtered.filter(p => (p.category || 'graphic') === 'graphic');
    } else if (activeAdminProdCategory === 'minimal') {
      filtered = filtered.filter(p => p.category === 'minimal');
    } else if (activeAdminProdCategory === 'custom') {
      filtered = filtered.filter(p => p.category === 'custom' || p.isCustom);
    } else if (activeAdminProdCategory === 'low-stock') {
      filtered = filtered.filter(p => Object.values(p.stock || {}).reduce((a, b) => a + b, 0) < 15);
    }

    if (adminProdSearchTerm && adminProdSearchTerm.trim()) {
      const q = adminProdSearchTerm.trim().toLowerCase();
      filtered = filtered.filter(p => {
        const name = (p.name || '').toLowerCase();
        const sub = (p.subtitle || '').toLowerCase();
        const badge = (p.badge || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        const idStr = String(p.id);
        return name.includes(q) || sub.includes(q) || badge.includes(q) || cat.includes(q) || idStr.includes(q);
      });
    }

    if (!filtered.length) {
      tbody.innerHTML = `
        <tr class="adm-prod-row empty">
          <td colspan="6" style="text-align:center; padding:36px 16px; color:var(--muted);">
            <div style="font-size:24px; margin-bottom:6px;">🔍</div>
            <strong style="color:var(--ink); font-size:13px; display:block; margin-bottom:4px;">No drops found matching criteria</strong>
            <span style="font-size:11px;">Category: <strong>${activeAdminProdCategory}</strong> · Query: "${adminProdSearchTerm || 'None'}"</span>
            <div style="margin-top:10px;">
              <button type="button" class="button button-outline" id="adm-clear-prod-filter" style="min-height:28px; padding:0 12px; font-size:11px;">
                Reset Filter
              </button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(p => {
      const totalStock = Object.values(p.stock || {}).reduce((a, b) => a + b, 0);
      const hasDesign = !!p.logoOverlay;
      const cat = (p.category || 'graphic').toLowerCase();

      let catBadgeHtml = '';
      if (cat === 'custom' || p.isCustom) {
        catBadgeHtml = '<span class="badge-tag" style="background:#f3e8ff; color:#6b21a8; border-color:#d8b4fe;">🎨 CUSTOM DROP</span>';
      } else if (cat === 'minimal') {
        catBadgeHtml = '<span class="badge-tag" style="background:#f1f5f9; color:#0f172a; border-color:#cbd5e1;">⬛ MINIMAL</span>';
      } else {
        catBadgeHtml = '<span class="badge-tag" style="background:#ecfccb; color:#365314; border-color:#bef264;">👕 GRAPHIC DROP</span>';
      }

      return `
        <tr class="adm-prod-row">
          <td class="adm-col-product">
            <div class="adm-prod-info-group">
              <div class="adm-prod-thumb-wrap" title="T-Shirt Drop Preview">
                <img src="${p.image}" class="adm-table-thumb" alt="${p.name}">
                ${hasDesign ? `<div class="adm-prod-thumb-overlay"><img src="${p.logoOverlay}"></div>` : ''}
              </div>
              ${hasDesign ? `
                <div class="adm-prod-art-thumb" title="Uploaded Artwork Thumbnail">
                  <img src="${p.logoOverlay}" alt="Artwork">
                </div>
              ` : ''}
              <div class="adm-prod-meta-text">
                <strong class="adm-prod-name">${p.name}</strong>
                <span class="adm-prod-subtitle">${p.subtitle || '240 GSM Heavy Cotton'}</span>
                <div class="adm-prod-tags">
                  ${p.badge ? `<span class="adm-tag-badge">${p.badge}</span>` : ''}
                  ${hasDesign ? `<span class="adm-tag-print">🎨 Active Print</span>` : `<span class="adm-tag-plain">Plain Blank</span>`}
                  <span class="adm-tag-id">ID: #${p.id}</span>
                </div>
              </div>
            </div>
          </td>
          <td class="adm-col-cat" data-label="Category">${catBadgeHtml}</td>
          <td class="adm-col-price" data-label="Price">
            <div class="adm-price-wrap">
              <strong>${money(p.price)}</strong>
              ${p.comparePrice ? `<del>${money(p.comparePrice)}</del>` : ''}
            </div>
          </td>
          <td class="adm-col-sizes" data-label="Sizes">
            <div class="adm-sizes-wrap">
              <span class="adm-label-mob">Sizes:</span>
              <span class="adm-sizes-txt">S, M, L, XL, XXL</span>
            </div>
          </td>
          <td class="adm-col-stock" data-label="Stock">
            <div class="adm-stock-wrap">
              <span class="adm-label-mob">Stock:</span>
              <strong style="color:${totalStock < 15 ? 'var(--red)' : 'inherit'};">${totalStock} units</strong>
              ${totalStock < 15 ? `<span class="adm-stock-low">LOW</span>` : ''}
            </div>
          </td>
          <td class="adm-col-actions" data-label="Actions">
            <div class="adm-actions-group">
              <button class="action-pill view-live" data-action="adm-view-prod-live" data-id="${p.id}" title="View this drop live on website">👁️ View Live ↗</button>
              <button class="action-pill edit" data-action="adm-edit-prod" data-id="${p.id}">Edit</button>
              ${hasDesign ? `<button class="action-pill" style="color:#d97706; border-color:#d97706;" data-action="adm-remove-design" data-id="${p.id}" title="Delete design artwork, keep tee">✕ Remove Artwork</button>` : ''}
              <button class="action-pill delete" data-action="adm-del-prod" data-id="${p.id}" title="Delete T-shirt from store">Delete Drop</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderAdminOrdersTable() {
    const tbody = document.querySelector("#adm-orders-tbody");
    if (!tbody) return;

    const filterVal = document.querySelector("#adm-order-status-filter")?.value || "all";
    const orderSearchQuery = (document.querySelector("#adm-order-search")?.value || "").trim().toLowerCase();

    if (!orders.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:36px 16px; color:var(--muted);">
            <div style="font-size:24px; margin-bottom:6px;">📦</div>
            <strong style="color:var(--ink); font-size:13px; display:block; margin-bottom:4px;">No customer orders placed yet</strong>
            <span style="font-size:11px;">When shoppers complete checkout or place custom orders, they will appear here with live fulfillment controls and courier tracking.</span>
          </td>
        </tr>
      `;
      return;
    }

    let filteredOrders = orders.filter(o => filterVal === "all" || (o.fulfillmentStatus || 'placed').toLowerCase() === filterVal);
    if (orderSearchQuery) {
      filteredOrders = filteredOrders.filter(o => {
        const id = (o.id || '').toLowerCase();
        const custName = (o.customer?.name || '').toLowerCase();
        const custPhone = (o.customer?.phone || '').toLowerCase();
        const awb = (o.awb || '').toLowerCase();
        const city = (o.customer?.city || '').toLowerCase();
        return id.includes(orderSearchQuery) || custName.includes(orderSearchQuery) || custPhone.includes(orderSearchQuery) || awb.includes(orderSearchQuery) || city.includes(orderSearchQuery);
      });
    }

    if (!filteredOrders.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:32px 16px; color:var(--muted);">
            <div style="font-size:22px; margin-bottom:6px;">🔍</div>
            <strong style="color:var(--ink); font-size:13px; display:block; margin-bottom:4px;">No orders found matching filter</strong>
            <span style="font-size:11px;">Status: <strong>${filterVal}</strong>${orderSearchQuery ? ` · Search query: "${orderSearchQuery}"` : ''}</span>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filteredOrders.map(o => {
      const nextStatuses = {
        "placed": "confirmed",
        "confirmed": "printing",
        "printing": "shipped",
        "shipped": "delivered",
        "delivered": "delivered"
      };
      const curStatus = (o.fulfillmentStatus || 'placed').toLowerCase();
      const next = nextStatuses[curStatus] || 'confirmed';

      return `
        <tr>
          <td><strong>${o.id}</strong></td>
          <td style="white-space:nowrap; font-size:11px;">${o.date}</td>
          <td>
            <strong>${o.customer?.name || 'Customer'}</strong>
            <span style="display:block; font-size:10px; color:var(--muted);">${o.customer?.city || 'India'} · ${o.customer?.phone || 'N/A'}</span>
          </td>
          <td>${o.items?.length || 1} pcs</td>
          <td><strong>${money(o.grandTotal)}</strong></td>
          <td><span class="badge-tag ${o.paymentStatus === 'PAID' ? 'green' : ''}">${o.paymentStatus || 'PENDING'}</span></td>
          <td><span class="badge-tag">${curStatus.toUpperCase()}</span></td>
          <td>
            <span class="adm-awb-badge" data-action="adm-edit-awb" data-id="${o.id}" style="cursor:pointer; display:inline-flex; align-items:center; gap:4px; padding:3px 8px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:4px;" title="Click to update courier AWB tracking number">
              <code style="font-size:10.5px; font-weight:700;">${o.awb || '+ Add AWB'}</code>
            </span>
          </td>
          <td style="white-space:nowrap;">
            ${curStatus !== 'delivered' ? `
              <button class="action-pill advance" data-action="adm-advance-order" data-id="${o.id}" data-next="${next}" title="Advance status to ${next}">
                Mark ${next.toUpperCase()} →
              </button>
            ` : `<span style="font-size:10px; color:var(--green); font-weight:700;">DELIVERED ✓</span>`}
            <button class="action-pill awb" data-action="adm-edit-awb" data-id="${o.id}" title="Set or update Courier AWB tracking number">✏️ AWB</button>
            <button class="action-pill edit" data-action="view-invoice" data-order-id="${o.id}">Tax Invoice</button>
            <button class="action-pill del-order" data-action="adm-del-order" data-id="${o.id}" title="Delete test/cancelled order">✕</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderAdminCustomersTable() {
    const tbody = document.querySelector("#adm-customers-tbody");
    if (!tbody) return;

    // Strictly show ONLY registered customers (Filter out administrator accounts)
    const customerUsers = (users || []).filter(u =>
      u && u.role !== 'admin' && u.id !== 'admin_master' && (u.email || '').toLowerCase() !== 'tudurajanikanta@gmail.com'
    );

    if (!customerUsers.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:36px 16px; color:var(--muted);">
            <div style="font-size:24px; margin-bottom:6px;">👥</div>
            <strong style="color:var(--ink); font-size:13px; display:block; margin-bottom:4px;">No registered customer accounts yet</strong>
            <span style="font-size:11px;">Customer profiles, shipping destinations, and lifetime spend will appear here when shoppers register or place orders.</span>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = customerUsers.map(u => {
      const userOrders = orders.filter(o => o.customer && o.customer.email && u.email && o.customer.email.toLowerCase() === u.email.toLowerCase());
      const totalSpent = userOrders.reduce((s, o) => s + (o.paymentStatus === "PAID" ? o.grandTotal : 0), 0);

      return `
        <tr>
          <td><strong>${u.name}</strong></td>
          <td>${u.email}</td>
          <td>+91 ${u.phone}</td>
          <td>${u.city || 'Mumbai'}, ${u.state || 'MH'}</td>
          <td>${userOrders.length} orders</td>
          <td><strong>${money(totalSpent)}</strong></td>
          <td style="font-size:11px; color:var(--muted);">${u.joinedDate || '2026-10-01'}</td>
        </tr>
      `;
    }).join('');
  }

  function renderAdminStockTable() {
    const tbody = document.querySelector("#adm-stock-tbody");
    if (!tbody) return;

    if (!products.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding:36px 20px; color:var(--muted);">
            <div style="font-size:24px; margin-bottom:6px;">📈</div>
            <strong style="color:var(--ink); font-size:13px; display:block; margin-bottom:4px;">No products in catalog</strong>
            <span style="font-size:11px;">Add a new drop to manage size-wise inventory.</span>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = products.map(p => {
      const stock = p.stock || { S: 0, M: 0, L: 0, XL: 0, XXL: 0 };
      const total = Object.values(stock).reduce((a, b) => a + b, 0);

      return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="position:relative; width:44px; height:44px; border-radius:4px; overflow:hidden; background:#e7e4dd; flex-shrink:0; border:1px solid rgba(0,0,0,0.1);">
                <img src="${p.image}" class="adm-table-thumb" alt="${p.name}" style="width:100%; height:100%; object-fit:cover; display:block;">
                ${p.logoOverlay ? `<div style="position:absolute; top:36%; left:50%; transform:translate(-50%, -50%); width:38%; pointer-events:none; z-index:2; display:flex; align-items:center; justify-content:center;"><img src="${p.logoOverlay}" style="width:100% !important; height:auto !important; max-height:100% !important; object-fit:contain !important; display:block !important; filter:drop-shadow(0 1px 3px rgba(0,0,0,0.6));"></div>` : ''}
              </div>
              ${p.logoOverlay ? `
                <div style="position:relative; width:30px; height:30px; border-radius:4px; background:#ffffff; border:1.5px solid #cbd5e1; display:flex; align-items:center; justify-content:center; padding:2px; flex-shrink:0; box-shadow:0 1px 2px rgba(0,0,0,0.06);" title="Uploaded Artwork">
                  <img src="${p.logoOverlay}" alt="Artwork" style="max-width:100%; max-height:100%; object-fit:contain; display:block;">
                </div>
              ` : ''}
              <div style="min-width:120px;">
                <strong style="display:block; font-size:12.5px;">${p.name}</strong>
                ${p.logoOverlay ? `<span style="font-size:9px; color:#16a34a; font-weight:700; display:block;">🎨 Custom Artwork</span>` : `<span style="font-size:9.5px; color:#64748b;">${p.category || 'graphic'}</span>`}
              </div>
            </div>
          </td>
          ${["S", "M", "L", "XL", "XXL"].map(s => `
            <td>
              <div class="adm-stock-stepper">
                <button class="stock-adjust-btn" data-action="stock-adj" data-id="${p.id}" data-size="${s}" data-delta="-1">−</button>
                <span class="stock-val editable ${stock[s] <= 4 ? 'low' : ''}" data-action="stock-set-direct" data-id="${p.id}" data-size="${s}" title="Click to enter exact stock quantity">${stock[s]}</span>
                <button class="stock-adjust-btn" data-action="stock-adj" data-id="${p.id}" data-size="${s}" data-delta="1">+</button>
              </div>
            </td>
          `).join('')}
          <td><strong>${total}</strong></td>
          <td>
            ${total <= 10 ? `<span class="badge-tag" style="background:var(--red);">LOW STOCK</span>` : `<span class="badge-tag green">HEALTHY</span>`}
          </td>
        </tr>
      `;
    }).join('');
  }

  // ==========================================================================
  // 12. PRODUCT EDITOR (PHOTO & LOGO UPLOAD ENGINE)
  // ==========================================================================

  function openProductEditor(productToEdit = null) {
    if (!productEditorModal || !productEditorForm) return;

    currentUploadedPhoto = null;
    currentUploadedLogo = null;

    const pemProdId = document.querySelector("#pem-prod-id");
    const pemTitle = document.querySelector("#pem-title");
    const pemName = document.querySelector("#pem-name");
    const pemSubtitle = document.querySelector("#pem-subtitle");
    const pemPrice = document.querySelector("#pem-price");
    const pemCategory = document.querySelector("#pem-category");
    const pemBadge = document.querySelector("#pem-badge");
    const pemDesc = document.querySelector("#pem-description");

    const pemStockS = document.querySelector("#pem-stock-s");
    const pemStockM = document.querySelector("#pem-stock-m");
    const pemStockL = document.querySelector("#pem-stock-l");
    const pemStockXl = document.querySelector("#pem-stock-xl");
    const pemStockXxl = document.querySelector("#pem-stock-xxl");

    const previewBaseImg = document.querySelector("#pem-preview-base-img");
    const logoOverlay = document.querySelector("#pem-logo-overlay");
    const previewLogoImg = document.querySelector("#pem-preview-logo-img");

    if (productToEdit) {
      if (pemProdId) pemProdId.value = productToEdit.id;
      if (pemTitle) pemTitle.textContent = "Edit T-Shirt Drop";
      if (pemName) pemName.value = productToEdit.name;
      if (pemSubtitle) pemSubtitle.value = productToEdit.subtitle;
      if (pemPrice) pemPrice.value = productToEdit.price;
      if (pemCategory) pemCategory.value = productToEdit.category;
      if (pemBadge) pemBadge.value = productToEdit.badge || "";
      if (pemDesc) pemDesc.value = productToEdit.description || "";

      const st = productToEdit.stock || { S: 10, M: 15, L: 12, XL: 8, XXL: 5 };
      if (pemStockS) pemStockS.value = st.S;
      if (pemStockM) pemStockM.value = st.M;
      if (pemStockL) pemStockL.value = st.L;
      if (pemStockXl) pemStockXl.value = st.XL;
      if (pemStockXxl) pemStockXxl.value = st.XXL;

      currentUploadedPhoto = productToEdit.image;
      currentUploadedLogo = productToEdit.logoOverlay;

      if (previewBaseImg) previewBaseImg.src = productToEdit.image;
      const removeLogoBtn = document.querySelector("#pem-remove-logo-btn");
      const logoStatus = document.querySelector("#pem-logo-status");
      const dropPhotoMsg = document.querySelector("#drop-photo-msg");
      const dropLogoMsg = document.querySelector("#drop-logo-msg");

      const photoUrlInput = document.querySelector("#pem-photo-url-input");
      const logoUrlInput = document.querySelector("#pem-logo-url-input");
      const photoUrlStatus = document.querySelector("#pem-photo-url-status");
      const logoUrlStatus = document.querySelector("#pem-logo-url-status");
      const clearPhotoUrlBtn = document.querySelector("#pem-clear-photo-url-btn");
      const clearLogoUrlBtn = document.querySelector("#pem-clear-logo-url-btn");

      const isPhotoUrl = productToEdit.image && (productToEdit.image.startsWith('http://') || productToEdit.image.startsWith('https://') || productToEdit.image.startsWith('/uploads/'));
      if (photoUrlInput) photoUrlInput.value = isPhotoUrl ? productToEdit.image : '';
      if (clearPhotoUrlBtn) clearPhotoUrlBtn.style.display = isPhotoUrl ? 'inline' : 'none';
      if (photoUrlStatus) {
        photoUrlStatus.textContent = isPhotoUrl ? '✓ Web Image URL Active' : 'Enter any public image URL or CDN web link';
        photoUrlStatus.className = isPhotoUrl ? 'url-status-msg status-success' : 'url-status-msg';
      }
      setUploadMode('photo', isPhotoUrl ? 'url' : 'file');

      if (dropPhotoMsg && productToEdit.image) {
        dropPhotoMsg.innerHTML = `
          <div class="drop-thumb-preview">
            <img src="${productToEdit.image}" alt="Mockup Thumbnail">
            <div class="dt-details">
              <span class="dt-name">${productToEdit.name}</span>
              <span class="dt-status">✓ Mockup Thumbnail Active</span>
            </div>
          </div>
        `;
      }

      const isLogoUrl = productToEdit.logoOverlay && (productToEdit.logoOverlay.startsWith('http://') || productToEdit.logoOverlay.startsWith('https://') || productToEdit.logoOverlay.startsWith('/uploads/'));
      if (logoUrlInput) logoUrlInput.value = isLogoUrl ? productToEdit.logoOverlay : '';
      if (clearLogoUrlBtn) clearLogoUrlBtn.style.display = isLogoUrl ? 'inline' : 'none';
      if (logoUrlStatus) {
        logoUrlStatus.textContent = isLogoUrl ? '✓ Graphic Artwork URL Active' : 'Paste transparent PNG, SVG, or WebP web link';
        logoUrlStatus.className = isLogoUrl ? 'url-status-msg status-success' : 'url-status-msg';
      }
      setUploadMode('logo', isLogoUrl ? 'url' : 'file');

      if (productToEdit.logoOverlay && logoOverlay && previewLogoImg) {
        logoOverlay.style.display = "flex";
        previewLogoImg.src = productToEdit.logoOverlay;
        previewLogoImg.style.display = "block";
        if (removeLogoBtn) removeLogoBtn.style.display = "inline-flex";
        if (logoStatus) logoStatus.innerHTML = `<strong style="color:var(--green)">✓ Graphic Artwork Thumbnail Active</strong>`;
        if (dropLogoMsg) {
          dropLogoMsg.innerHTML = `
            <div class="drop-thumb-preview">
              <img src="${productToEdit.logoOverlay}" alt="Design Thumbnail">
              <div class="dt-details">
                <span class="dt-name">Custom Graphic Artwork</span>
                <span class="dt-status">✓ Design Thumbnail Active</span>
              </div>
            </div>
          `;
        }
      } else {
        if (logoOverlay) logoOverlay.style.display = "none";
        if (previewLogoImg) previewLogoImg.src = "";
        if (removeLogoBtn) removeLogoBtn.style.display = "none";
        if (logoStatus) logoStatus.textContent = "No design overlay (plain tee)";
        if (dropLogoMsg) {
          dropLogoMsg.innerHTML = `<span class="upload-icon">🎨</span><p>Upload transparent logo or graphic design</p><small>PNG or SVG recommended</small>`;
        }
      }
    } else {
      if (pemProdId) pemProdId.value = "";
      if (pemTitle) pemTitle.textContent = "Add New T-Shirt Drop";
      productEditorForm.reset();

      const defaultPhoto = "assets/images/img.jpeg";
      currentUploadedPhoto = defaultPhoto;
      currentUploadedLogo = null;
      if (previewBaseImg) previewBaseImg.src = defaultPhoto;
      if (logoOverlay) logoOverlay.style.display = "none";
      if (previewLogoImg) previewLogoImg.src = "";
      const removeLogoBtn = document.querySelector("#pem-remove-logo-btn");
      const logoStatus = document.querySelector("#pem-logo-status");
      const dropPhotoMsg = document.querySelector("#drop-photo-msg");
      const dropLogoMsg = document.querySelector("#drop-logo-msg");
      const photoUrlInput = document.querySelector("#pem-photo-url-input");
      const logoUrlInput = document.querySelector("#pem-logo-url-input");
      const photoUrlStatus = document.querySelector("#pem-photo-url-status");
      const logoUrlStatus = document.querySelector("#pem-logo-url-status");
      const clearPhotoUrlBtn = document.querySelector("#pem-clear-photo-url-btn");
      const clearLogoUrlBtn = document.querySelector("#pem-clear-logo-url-btn");

      if (photoUrlInput) photoUrlInput.value = "";
      if (logoUrlInput) logoUrlInput.value = "";
      if (clearPhotoUrlBtn) clearPhotoUrlBtn.style.display = "none";
      if (clearLogoUrlBtn) clearLogoUrlBtn.style.display = "none";
      if (photoUrlStatus) {
        photoUrlStatus.textContent = "Enter any public image URL or CDN web link";
        photoUrlStatus.className = "url-status-msg";
      }
      if (logoUrlStatus) {
        logoUrlStatus.textContent = "Paste transparent PNG, SVG, or WebP web link";
        logoUrlStatus.className = "url-status-msg";
      }
      setUploadMode('photo', 'file');
      setUploadMode('logo', 'file');

      if (removeLogoBtn) removeLogoBtn.style.display = "none";
      if (logoStatus) logoStatus.textContent = "No design overlay (plain tee)";
      if (dropPhotoMsg) {
        dropPhotoMsg.innerHTML = `<span class="upload-icon">📷</span><p>Click to browse or drop T-shirt image</p><small>PNG, JPG, WebP supported</small>`;
      }
      if (dropLogoMsg) {
        dropLogoMsg.innerHTML = `<span class="upload-icon">🎨</span><p>Upload transparent logo or graphic design</p><small>PNG or SVG recommended</small>`;
      }
    }

    productEditorModal.showModal();
  }

  function closeProductEditor() {
    if (productEditorModal && productEditorModal.open) productEditorModal.close();
  }

  // Helper to upload image/artwork to server to keep localStorage small
  async function uploadImageFile(file, isLogo = false) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async function (evt) {
        const dataUrl = evt.target.result;
        try {
          const res = await fetch(getApiUrl('/api/upload'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataUrl, name: file.name })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.url) {
              resolve(data.url);
              return;
            }
          }
        } catch (e) {
          console.warn('Upload API notice:', e);
        }
        resolve(dataUrl);
      };
      reader.onerror = function () {
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
  }

  // Lightweight client-side image resizer to ensure phone photos and logos never exceed payload or localStorage limits
  function compressImageIfNeeded(dataUrl, maxDimension = 900, mimeType = 'image/jpeg') {
    return new Promise((resolve) => {
      if (!dataUrl || !dataUrl.startsWith('data:image')) return resolve(dataUrl);
      if (dataUrl.length < 150000) return resolve(dataUrl);
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (mimeType === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(mimeType, mimeType === 'image/png' ? undefined : 0.82));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  // Helper to switch upload mode between 'file' and 'url'
  function setUploadMode(type, mode) {
    if (type === 'photo') {
      const tabFile = document.querySelector("#pem-photo-tab-file");
      const tabUrl = document.querySelector("#pem-photo-tab-url");
      const fileArea = document.querySelector("#drop-photo-area");
      const urlWrap = document.querySelector("#pem-photo-url-wrap");
      if (mode === 'url') {
        if (tabUrl) tabUrl.classList.add("active");
        if (tabFile) tabFile.classList.remove("active");
        if (fileArea) fileArea.style.display = "none";
        if (urlWrap) urlWrap.style.display = "block";
      } else {
        if (tabFile) tabFile.classList.add("active");
        if (tabUrl) tabUrl.classList.remove("active");
        if (fileArea) fileArea.style.display = "block";
        if (urlWrap) urlWrap.style.display = "none";
      }
    } else if (type === 'logo') {
      const tabFile = document.querySelector("#pem-logo-tab-file");
      const tabUrl = document.querySelector("#pem-logo-tab-url");
      const fileArea = document.querySelector("#drop-logo-area");
      const urlWrap = document.querySelector("#pem-logo-url-wrap");
      if (mode === 'url') {
        if (tabUrl) tabUrl.classList.add("active");
        if (tabFile) tabFile.classList.remove("active");
        if (fileArea) fileArea.style.display = "none";
        if (urlWrap) urlWrap.style.display = "block";
      } else {
        if (tabFile) tabFile.classList.add("active");
        if (tabUrl) tabUrl.classList.remove("active");
        if (fileArea) fileArea.style.display = "block";
        if (urlWrap) urlWrap.style.display = "none";
      }
    }
  }

  // Wire Tab Buttons for Base Photo & Logo upload modes
  const pemPhotoTabFile = document.querySelector("#pem-photo-tab-file");
  const pemPhotoTabUrl = document.querySelector("#pem-photo-tab-url");
  if (pemPhotoTabFile) pemPhotoTabFile.addEventListener("click", () => setUploadMode('photo', 'file'));
  if (pemPhotoTabUrl) {
    pemPhotoTabUrl.addEventListener("click", () => {
      setUploadMode('photo', 'url');
      const urlInput = document.querySelector("#pem-photo-url-input");
      if (urlInput) urlInput.focus();
    });
  }

  const pemLogoTabFile = document.querySelector("#pem-logo-tab-file");
  const pemLogoTabUrl = document.querySelector("#pem-logo-tab-url");
  if (pemLogoTabFile) pemLogoTabFile.addEventListener("click", () => setUploadMode('logo', 'file'));
  if (pemLogoTabUrl) {
    pemLogoTabUrl.addEventListener("click", () => {
      setUploadMode('logo', 'url');
      const urlInput = document.querySelector("#pem-logo-url-input");
      if (urlInput) urlInput.focus();
    });
  }

  // Apply Photo URL with live preview and validation
  function applyPhotoUrl(rawUrl, showToastNotice = true) {
    const url = (rawUrl || '').trim();
    const statusEl = document.querySelector("#pem-photo-url-status");
    const clearBtn = document.querySelector("#pem-clear-photo-url-btn");
    const previewBaseImg = document.querySelector("#pem-preview-base-img");
    const dropPhotoMsg = document.querySelector("#drop-photo-msg");
    const urlInput = document.querySelector("#pem-photo-url-input");

    if (!url) {
      if (statusEl) {
        statusEl.textContent = "Please enter or paste an image URL";
        statusEl.className = "url-status-msg status-error";
      }
      return false;
    }

    if (urlInput && urlInput.value !== url) urlInput.value = url;

    // Apply immediately to currentUploadedPhoto & preview
    currentUploadedPhoto = url;
    if (previewBaseImg) previewBaseImg.src = url;
    if (clearBtn) clearBtn.style.display = "inline";

    const testImg = new Image();
    if (statusEl) {
      statusEl.textContent = "Verifying image URL... ⏳";
      statusEl.className = "url-status-msg";
    }

    testImg.onload = function () {
      if (statusEl) {
        statusEl.textContent = "✓ Image link verified & preview active!";
        statusEl.className = "url-status-msg status-success";
      }
      if (dropPhotoMsg) {
        dropPhotoMsg.innerHTML = `
          <div class="drop-thumb-preview">
            <img src="${url}" alt="Mockup Thumbnail">
            <div class="dt-details">
              <span class="dt-name">Web Photo URL</span>
              <span class="dt-status">✓ Image URL Active</span>
            </div>
          </div>
        `;
      }
      if (showToastNotice) showToast("T-Shirt mockup photo URL applied!");
    };

    testImg.onerror = function () {
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/uploads/') || url.startsWith('assets/')) {
        if (statusEl) {
          statusEl.textContent = "✓ Web image URL linked (preview active)";
          statusEl.className = "url-status-msg status-success";
        }
        if (dropPhotoMsg) {
          dropPhotoMsg.innerHTML = `
            <div class="drop-thumb-preview">
              <img src="${url}" alt="Mockup Thumbnail" onerror="this.src='assets/images/img.jpeg'">
              <div class="dt-details">
                <span class="dt-name">Web Photo URL</span>
                <span class="dt-status">✓ Image URL Active</span>
              </div>
            </div>
          `;
        }
        if (showToastNotice) showToast("Mockup image URL applied!");
      } else {
        if (statusEl) {
          statusEl.textContent = "✕ Invalid image link. Please use http:// or https:// URL";
          statusEl.className = "url-status-msg status-error";
        }
      }
    };

    testImg.src = url;
    return true;
  }

  // Apply Logo / Graphic Artwork URL with live preview and validation
  function applyLogoUrl(rawUrl, showToastNotice = true) {
    const url = (rawUrl || '').trim();
    const statusEl = document.querySelector("#pem-logo-url-status");
    const clearBtn = document.querySelector("#pem-clear-logo-url-btn");
    const logoOverlay = document.querySelector("#pem-logo-overlay");
    const previewLogoImg = document.querySelector("#pem-preview-logo-img");
    const removeLogoBtn = document.querySelector("#pem-remove-logo-btn");
    const logoStatus = document.querySelector("#pem-logo-status");
    const dropLogoMsg = document.querySelector("#drop-logo-msg");
    const urlInput = document.querySelector("#pem-logo-url-input");

    if (!url) {
      if (statusEl) {
        statusEl.textContent = "Please enter or paste an artwork URL";
        statusEl.className = "url-status-msg status-error";
      }
      return false;
    }

    if (urlInput && urlInput.value !== url) urlInput.value = url;

    currentUploadedLogo = url;
    if (previewLogoImg) {
      previewLogoImg.src = url;
      previewLogoImg.style.display = "block";
    }
    if (logoOverlay) logoOverlay.style.display = "flex";
    if (removeLogoBtn) removeLogoBtn.style.display = "inline-flex";
    if (clearBtn) clearBtn.style.display = "inline";

    const testImg = new Image();
    if (statusEl) {
      statusEl.textContent = "Verifying artwork URL... ⏳";
      statusEl.className = "url-status-msg";
    }

    testImg.onload = function () {
      if (statusEl) {
        statusEl.textContent = "✓ Artwork URL verified & overlaid!";
        statusEl.className = "url-status-msg status-success";
      }
      if (logoStatus) {
        logoStatus.innerHTML = `<strong style="color:var(--green)">✓ Web Graphic Artwork URL Active</strong>`;
      }
      if (dropLogoMsg) {
        dropLogoMsg.innerHTML = `
          <div class="drop-thumb-preview">
            <img src="${url}" alt="Design Thumbnail">
            <div class="dt-details">
              <span class="dt-name">Web Graphic Artwork</span>
              <span class="dt-status">✓ Artwork URL Active</span>
            </div>
          </div>
        `;
      }
      if (showToastNotice) showToast("Custom artwork URL overlaid on T-shirt!");
    };

    testImg.onerror = function () {
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/uploads/') || url.startsWith('data:')) {
        if (statusEl) {
          statusEl.textContent = "✓ Artwork link applied";
          statusEl.className = "url-status-msg status-success";
        }
        if (logoStatus) {
          logoStatus.innerHTML = `<strong style="color:var(--green)">✓ Web Graphic Artwork URL Active</strong>`;
        }
        if (dropLogoMsg) {
          dropLogoMsg.innerHTML = `
            <div class="drop-thumb-preview">
              <img src="${url}" alt="Design Thumbnail">
              <div class="dt-details">
                <span class="dt-name">Web Graphic Artwork</span>
                <span class="dt-status">✓ Artwork URL Active</span>
              </div>
            </div>
          `;
        }
        if (showToastNotice) showToast("Artwork URL applied!");
      } else {
        if (statusEl) {
          statusEl.textContent = "✕ Invalid artwork link. Please use http:// or https:// URL";
          statusEl.className = "url-status-msg status-error";
        }
      }
    };

    testImg.src = url;
    return true;
  }

  // Wire URL Apply & Clear Buttons
  const pemApplyPhotoUrlBtn = document.querySelector("#pem-apply-photo-url-btn");
  const pemPhotoUrlInput = document.querySelector("#pem-photo-url-input");
  const pemClearPhotoUrlBtn = document.querySelector("#pem-clear-photo-url-btn");

  if (pemApplyPhotoUrlBtn && pemPhotoUrlInput) {
    pemApplyPhotoUrlBtn.addEventListener("click", () => applyPhotoUrl(pemPhotoUrlInput.value));
    pemPhotoUrlInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyPhotoUrl(pemPhotoUrlInput.value);
      }
    });
  }

  if (pemClearPhotoUrlBtn) {
    pemClearPhotoUrlBtn.addEventListener("click", () => {
      if (pemPhotoUrlInput) pemPhotoUrlInput.value = "";
      pemClearPhotoUrlBtn.style.display = "none";
      const statusEl = document.querySelector("#pem-photo-url-status");
      if (statusEl) {
        statusEl.textContent = "Enter any public image URL or CDN web link";
        statusEl.className = "url-status-msg";
      }
      const defaultPhoto = "assets/images/img.jpeg";
      currentUploadedPhoto = defaultPhoto;
      const previewBaseImg = document.querySelector("#pem-preview-base-img");
      if (previewBaseImg) previewBaseImg.src = defaultPhoto;
      const dropPhotoMsg = document.querySelector("#drop-photo-msg");
      if (dropPhotoMsg) {
        dropPhotoMsg.innerHTML = `<span class="upload-icon">📷</span><p>Click to browse or drop T-shirt image</p><small>PNG, JPG, WebP supported from computer or phone</small>`;
      }
      showToast("Photo URL cleared. Restored default mockup.");
    });
  }

  const pemApplyLogoUrlBtn = document.querySelector("#pem-apply-logo-url-btn");
  const pemLogoUrlInput = document.querySelector("#pem-logo-url-input");
  const pemClearLogoUrlBtn = document.querySelector("#pem-clear-logo-url-btn");

  if (pemApplyLogoUrlBtn && pemLogoUrlInput) {
    pemApplyLogoUrlBtn.addEventListener("click", () => applyLogoUrl(pemLogoUrlInput.value));
    pemLogoUrlInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyLogoUrl(pemLogoUrlInput.value);
      }
    });
  }

  if (pemClearLogoUrlBtn) {
    pemClearLogoUrlBtn.addEventListener("click", () => {
      if (pemLogoUrlInput) pemLogoUrlInput.value = "";
      pemClearLogoUrlBtn.style.display = "none";
      const statusEl = document.querySelector("#pem-logo-url-status");
      if (statusEl) {
        statusEl.textContent = "Paste transparent PNG, SVG, or WebP web link";
        statusEl.className = "url-status-msg";
      }
      currentUploadedLogo = "__REMOVED__";
      const logoOverlay = document.querySelector("#pem-logo-overlay");
      const previewLogoImg = document.querySelector("#pem-preview-logo-img");
      const removeLogoBtn = document.querySelector("#pem-remove-logo-btn");
      const logoStatus = document.querySelector("#pem-logo-status");
      const dropLogoMsg = document.querySelector("#drop-logo-msg");

      if (logoOverlay) logoOverlay.style.display = "none";
      if (previewLogoImg) previewLogoImg.src = "";
      if (removeLogoBtn) removeLogoBtn.style.display = "none";
      if (logoStatus) logoStatus.textContent = "No design overlay (plain tee)";
      if (dropLogoMsg) {
        dropLogoMsg.innerHTML = `<span class="upload-icon">🎨</span><p>Upload transparent logo or graphic design</p><small>PNG or SVG recommended</small>`;
      }
      showToast("Artwork URL cleared.");
    });
  }

  // Handle Photo & Logo File Uploads with INSTANT visual feedback
  const photoInput = document.querySelector("#pem-photo-input");
  const logoInput = document.querySelector("#pem-logo-input");

  if (photoInput) {
    photoInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async function (evt) {
        const rawDataUrl = evt.target.result;
        const dataUrl = await compressImageIfNeeded(rawDataUrl, 900, 'image/jpeg');
        currentUploadedPhoto = dataUrl;

        const previewBaseImg = document.querySelector("#pem-preview-base-img");
        if (previewBaseImg) previewBaseImg.src = dataUrl;

        const dropMsg = document.querySelector("#drop-photo-msg");
        if (dropMsg) {
          dropMsg.innerHTML = `
            <div class="drop-thumb-preview">
              <img src="${dataUrl}" alt="Mockup Thumbnail">
              <div class="dt-details">
                <span class="dt-name">${file.name}</span>
                <span class="dt-status">✓ Mockup Thumbnail Active</span>
              </div>
            </div>
          `;
        }
        showToast("T-Shirt mockup thumbnail updated!");

        // Upload to server in background
        pendingPhotoUpload = fetch(getApiUrl('/api/upload'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl, name: file.name })
        }).then(r => r.ok ? r.json() : null).then(data => {
          if (data && data.url) {
            currentUploadedPhoto = data.url;
            if (dropMsg) {
              const statusEl = dropMsg.querySelector('.dt-status');
              if (statusEl) {
                statusEl.textContent = '✓ Saved to Server';
              }
            }
          }
        }).catch(() => { });
      };
      reader.readAsDataURL(file);
    });
  }

  if (logoInput) {
    logoInput.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async function (evt) {
        const rawDataUrl = evt.target.result;
        const dataUrl = await compressImageIfNeeded(rawDataUrl, 600, 'image/png');
        currentUploadedLogo = dataUrl;

        const logoOverlay = document.querySelector("#pem-logo-overlay");
        const previewLogoImg = document.querySelector("#pem-preview-logo-img");
        const removeLogoBtn = document.querySelector("#pem-remove-logo-btn");
        const logoStatus = document.querySelector("#pem-logo-status");

        if (previewLogoImg) {
          previewLogoImg.src = dataUrl;
          previewLogoImg.style.display = "block";
        }
        if (logoOverlay) {
          logoOverlay.style.display = "flex";
        }
        if (removeLogoBtn) {
          removeLogoBtn.style.display = "inline-flex";
        }
        if (logoStatus) {
          logoStatus.innerHTML = `<strong style="color:var(--green)">✓ Graphic Artwork Thumbnail Active</strong>`;
        }

        const dropMsg = document.querySelector("#drop-logo-msg");
        if (dropMsg) {
          dropMsg.innerHTML = `
            <div class="drop-thumb-preview">
              <img src="${dataUrl}" alt="Design Thumbnail">
              <div class="dt-details">
                <span class="dt-name">${file.name}</span>
                <span class="dt-status">✓ Design Thumbnail Active</span>
              </div>
            </div>
          `;
        }
        showToast("Custom design thumbnail overlaid on T-shirt!");

        // Upload to server in background
        pendingLogoUpload = fetch(getApiUrl('/api/upload'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl, name: file.name })
        }).then(r => r.ok ? r.json() : null).then(data => {
          if (data && data.url) {
            currentUploadedLogo = data.url;
            if (dropMsg) {
              const statusEl = dropMsg.querySelector('.dt-status');
              if (statusEl) {
                statusEl.textContent = '✓ Saved to Server';
              }
            }
          }
        }).catch(() => { });
      };
      reader.readAsDataURL(file);
    });
  }

  // Handle Remove / Delete Design Artwork from T-Shirt
  const pemRemoveLogoBtn = document.querySelector("#pem-remove-logo-btn");
  if (pemRemoveLogoBtn) {
    pemRemoveLogoBtn.addEventListener("click", function () {
      currentUploadedLogo = "__REMOVED__";
      const logoOverlay = document.querySelector("#pem-logo-overlay");
      const previewLogoImg = document.querySelector("#pem-preview-logo-img");
      const logoStatus = document.querySelector("#pem-logo-status");
      const dropMsg = document.querySelector("#drop-logo-msg");
      const logoInput = document.querySelector("#pem-logo-input");
      const logoUrlInput = document.querySelector("#pem-logo-url-input");
      const clearLogoUrlBtn = document.querySelector("#pem-clear-logo-url-btn");
      const logoUrlStatus = document.querySelector("#pem-logo-url-status");

      if (logoInput) logoInput.value = "";
      if (logoUrlInput) logoUrlInput.value = "";
      if (clearLogoUrlBtn) clearLogoUrlBtn.style.display = "none";
      if (logoUrlStatus) {
        logoUrlStatus.textContent = "Paste transparent PNG, SVG, or WebP web link";
        logoUrlStatus.className = "url-status-msg";
      }
      if (logoOverlay) logoOverlay.style.display = "none";
      if (previewLogoImg) previewLogoImg.src = "";
      pemRemoveLogoBtn.style.display = "none";
      if (logoStatus) logoStatus.innerHTML = `<span style="color:#e53e3e; font-weight:700;">✕ Design artwork removed (plain tee)</span>`;
      if (dropMsg) dropMsg.innerHTML = `<span class="upload-icon">🎨</span><p>Upload transparent logo or graphic design</p><small>PNG or SVG recommended</small>`;
      showToast("Design artwork deleted! Tee will be saved as plain minimal.");
    });
  }

  // Wire Publish & View Live on Website button
  let shouldAutoViewLiveOnSubmit = false;
  const pemPublishViewBtn = document.querySelector("#pem-publish-view-btn");
  if (pemPublishViewBtn && productEditorForm) {
    pemPublishViewBtn.addEventListener("click", () => {
      shouldAutoViewLiveOnSubmit = true;
      if (typeof productEditorForm.requestSubmit === "function") {
        productEditorForm.requestSubmit();
      } else {
        productEditorForm.dispatchEvent(new Event("submit", { cancelable: true }));
      }
    });
  }

  // Handle Product Editor Form Submission
  if (productEditorForm) {
    productEditorForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      // Auto-adopt entered photo or logo URL if user typed it without clicking "Apply"
      const enteredPhotoUrl = document.querySelector("#pem-photo-url-input")?.value.trim();
      if (enteredPhotoUrl && (!currentUploadedPhoto || currentUploadedPhoto === "assets/images/img.jpeg")) {
        currentUploadedPhoto = enteredPhotoUrl;
      }

      const enteredLogoUrl = document.querySelector("#pem-logo-url-input")?.value.trim();
      if (enteredLogoUrl && currentUploadedLogo !== "__REMOVED__" && !currentUploadedLogo) {
        currentUploadedLogo = enteredLogoUrl;
      }

      // Await background uploads if currently in flight
      const submitBtn = productEditorForm.querySelector('button[type="submit"]');
      const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      if (pendingPhotoUpload || pendingLogoUpload) {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = 'Saving artwork... 👕';
        }
        try {
          if (pendingPhotoUpload) {
            await Promise.race([pendingPhotoUpload, new Promise(r => setTimeout(r, 8000))]).catch(() => { });
          }
          if (pendingLogoUpload) {
            await Promise.race([pendingLogoUpload, new Promise(r => setTimeout(r, 8000))]).catch(() => { });
          }
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = origBtnHtml;
          }
        }
      }

      const editId = document.querySelector("#pem-prod-id")?.value;
      const name = document.querySelector("#pem-name")?.value.trim();
      const subtitle = document.querySelector("#pem-subtitle")?.value.trim();
      const price = Number(document.querySelector("#pem-price")?.value) || 899;
      const category = (document.querySelector("#pem-category")?.value || "graphic").toLowerCase();
      const badge = document.querySelector("#pem-badge")?.value.trim() || "NEW DROP";
      const description = document.querySelector("#pem-description")?.value.trim() || "";

      const stock = {
        S: Number(document.querySelector("#pem-stock-s")?.value) || 0,
        M: Number(document.querySelector("#pem-stock-m")?.value) || 0,
        L: Number(document.querySelector("#pem-stock-l")?.value) || 0,
        XL: Number(document.querySelector("#pem-stock-xl")?.value) || 0,
        XXL: Number(document.querySelector("#pem-stock-xxl")?.value) || 0
      };

      const editIdNum = editId ? Number(editId) : null;

      if (editId) {
        // Update existing product
        const prod = products.find(p => (editIdNum && p.id === editIdNum) || String(p.id) === String(editId));
        if (prod) {
          const finalImage = currentUploadedPhoto || prod.image || "assets/images/img.jpeg";
          prod.name = name;
          prod.subtitle = subtitle;
          prod.price = price;
          prod.category = category;
          prod.badge = badge;
          prod.description = description;
          prod.stock = stock;
          prod.image = finalImage;
          if (currentUploadedLogo === "__REMOVED__") {
            prod.logoOverlay = null;
          } else if (currentUploadedLogo !== null) {
            prod.logoOverlay = currentUploadedLogo;
          }

          prod._pendingSave = true;
          inFlightProductWrites.set(String(prod.id), prod);

          persistStore();
          renderCatalog();
          renderAdminOverview();
          renderAdminProductsTable();
          renderAdminStockTable();
          broadcastCatalogSync('update', prod);

          const shouldViewLive = shouldAutoViewLiveOnSubmit || (e.submitter && e.submitter.id === "pem-publish-view-btn");
          shouldAutoViewLiveOnSubmit = false;
          closeProductEditor();

          // Reset admin catalog filters so the updated drop is 100% visible in the table
          activeAdminProdCategory = 'all';
          adminProdSearchTerm = '';
          const searchInput = document.querySelector("#adm-prod-search");
          if (searchInput) searchInput.value = '';
          const pillsCont = document.querySelector("#adm-prod-cat-pills");
          if (pillsCont) {
            pillsCont.querySelectorAll(".adm-cat-pill").forEach(el => el.classList.toggle("active", el.dataset.cat === 'all'));
          }

          if (shouldViewLive) {
            navigateToProductOnStorefront(prod.id);
            showToast(`✓ Updated "${name}"! Viewing live on website.`);
          } else {
            renderAdminOverview();
            renderAdminProductsTable();
            renderAdminStockTable();
            setTimeout(() => {
              const row = document.querySelector(`#adm-products-tbody button[data-id="${prod.id}"]`)?.closest('tr');
              if (row) {
                row.classList.add('adm-prod-row-highlight');
                if (typeof row.scrollIntoView === 'function') row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            }, 80);
            showToast(`✓ Updated drop: "${name}"! Changes saved.`, 'View on Website 🌐 ↗', () => {
              navigateToProductOnStorefront(prod.id);
            });
          }

          // Sync update to Management API
          fetch(getApiUrl(`/api/management/products/${prod.id}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(prod)
          }).then(async r => {
            inFlightProductWrites.delete(String(prod.id));
            if (!r.ok) {
              const errTxt = await r.text();
              console.error('Product PUT failed:', r.status, errTxt);
              return;
            }
            const updated = await r.json();
            const idx = products.findIndex(p => p.id === prod.id);
            if (idx !== -1 && updated) {
              products[idx] = { ...prod, ...updated, _pendingSave: false };
              persistStore();
            }
            broadcastCatalogSync('update', updated || prod);
          }).catch(err => {
            inFlightProductWrites.delete(String(prod.id));
            console.warn('Product PUT error:', err);
          });
        }
      } else {
        // Add new product
        const finalImage = currentUploadedPhoto || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=85";
        const tempId = Date.now();
        const newProduct = {
          id: tempId,
          createdAtTimestamp: tempId,
          _pendingSave: true,
          name,
          subtitle,
          price,
          comparePrice: Math.round(price * 1.35),
          category,
          badge,
          description,
          stock,
          image: finalImage,
          logoOverlay: currentUploadedLogo && currentUploadedLogo !== "__REMOVED__" ? currentUploadedLogo : null,
          color: "#e8e5dd",
          colors: ["#e8e5dd", "#242522", "#c7d4b5"]
        };

        // Ensure newly added product ID is never filtered out by deletedProductIds
        deletedProductIds.delete(tempId);
        deletedProductIds.delete(Number(tempId));
        deletedProductIds.delete(String(tempId));
        try {
          localStorage.setItem("uprumm_deleted_products", JSON.stringify([...deletedProductIds]));
        } catch (e) { }

        // Shield this product from any premature background sync overwrite
        inFlightProductWrites.set(String(tempId), newProduct);

        products.unshift(newProduct);
        persistStore();
        renderCatalog();
        renderAdminOverview();
        renderAdminProductsTable();
        renderAdminStockTable();

        const shouldViewLive = shouldAutoViewLiveOnSubmit || (e.submitter && e.submitter.id === "pem-publish-view-btn");
        shouldAutoViewLiveOnSubmit = false;
        closeProductEditor();

        // Reset admin catalog filters so the new drop is 100% visible at the top of the table
        activeAdminProdCategory = 'all';
        adminProdSearchTerm = '';
        const searchInput = document.querySelector("#adm-prod-search");
        if (searchInput) searchInput.value = '';
        const pillsCont = document.querySelector("#adm-prod-cat-pills");
        if (pillsCont) {
          pillsCont.querySelectorAll(".adm-cat-pill").forEach(el => el.classList.toggle("active", el.dataset.cat === 'all'));
        }

        if (shouldViewLive) {
          // Navigates to live card on website when clicking "Publish & View on Website"
          navigateToProductOnStorefront(tempId);
          showToast(`✓ Published drop: ${name}! Live on website.`);
        } else {
          // Admin clicked "Save & Publish Drop" from within the Admin Suite -> Stay in Admin Suite!
          renderAdminOverview();
          renderAdminProductsTable();
          renderAdminStockTable();
          setTimeout(() => {
            const firstRow = document.querySelector('#adm-products-tbody tr');
            if (firstRow) {
              firstRow.classList.add('adm-prod-row-highlight');
              if (typeof firstRow.scrollIntoView === 'function') firstRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }, 80);
          showToast(`✓ Published "${name}"! Drop is live in catalog & website.`, 'View Live on Website 🌐 ↗', () => {
            navigateToProductOnStorefront(tempId);
          });
        }

        // Sync new product to Management API
        fetch(getApiUrl('/api/management/products'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProduct)
        }).then(async r => {
          if (!r.ok) {
            inFlightProductWrites.delete(String(tempId));
            const errTxt = await r.text();
            console.error('Product POST failed:', r.status, errTxt);
            showToast(`⚠️ Sync notice (${r.status}): Drop is saved locally.`);
            return;
          }
          const saved = await r.json();
          console.log('[Management API] Product saved to live DB:', saved);

          inFlightProductWrites.delete(String(tempId));
          if (saved && saved.id) inFlightProductWrites.delete(String(saved.id));

          const idx = products.findIndex(p => String(p.id) === String(tempId) || (saved && String(p.id) === String(saved.id)));
          if (idx !== -1 && saved) {
            products[idx] = { ...newProduct, ...saved, _pendingSave: false };
          }
          persistStore();
          renderCatalog();
          renderAdminOverview();
          renderAdminProductsTable();
          renderAdminStockTable();
          broadcastCatalogSync('add', saved || newProduct);
        }).catch(err => {
          inFlightProductWrites.delete(String(tempId));
          console.warn('Product POST error:', err);
          showToast(`⚠️ Offline: Saved locally on this device.`);
        });
      }

      closeProductEditor();
    });
  }

  // ==========================================================================
  // 13. GLOBAL EVENT LISTENERS & DELEGATION
  // ==========================================================================

  document.addEventListener("click", function (e) {
    // Quick Add + to Bag (Evaluated before open-detail so tapping quick-add button adds to bag)
    const quickAddBtn = e.target.closest('[data-action="quick-add"]');
    if (quickAddBtn) {
      e.stopPropagation();
      e.preventDefault();
      const id = quickAddBtn.dataset.id;
      if (id) {
        addToCart(id, "M");
        openCart();
      }
      return;
    }

    // Open Product Detail Modal
    const openDetailTrigger = e.target.closest('[data-action="open-detail"]');
    if (openDetailTrigger) {
      e.preventDefault();
      const id = openDetailTrigger.dataset.id;
      if (id) openProductDetail(id);
      return;
    }

    // Modal Size Selection
    const sizeBtn = e.target.closest('.size-option');
    if (sizeBtn && !sizeBtn.disabled) {
      document.querySelectorAll('.size-option').forEach(b => b.classList.remove('selected'));
      sizeBtn.classList.add('selected');
      selectedSize = sizeBtn.dataset.size;
      updateModalStockIndicator();
      return;
    }

    // Modal Add to Bag Button
    const modalAddBtn = e.target.closest("#btn-modal-add-to-bag");
    if (modalAddBtn && modalProduct) {
      addToCart(modalProduct.id, selectedSize);
      closeProductDetail();
      openCart();
      return;
    }

    // Cart Quantity Controls
    const qtyInc = e.target.closest('[data-action="qty-inc"]');
    if (qtyInc) {
      const idx = qtyInc.dataset.index !== undefined ? parseInt(qtyInc.dataset.index, 10) : -1;
      updateCartItemQty(qtyInc.dataset.key, 1, idx);
      return;
    }

    const qtyDec = e.target.closest('[data-action="qty-dec"]');
    if (qtyDec) {
      const idx = qtyDec.dataset.index !== undefined ? parseInt(qtyDec.dataset.index, 10) : -1;
      updateCartItemQty(qtyDec.dataset.key, -1, idx);
      return;
    }

    // Remove Cart Item
    const removeBtn = e.target.closest('[data-action="remove-item"]');
    if (removeBtn) {
      const idx = removeBtn.dataset.index !== undefined ? parseInt(removeBtn.dataset.index, 10) : -1;
      removeCartItem(removeBtn.dataset.key, idx);
      return;
    }

    // Cart Continue Shopping
    const continueShopBtn = e.target.closest("#continue-shopping-btn");
    if (continueShopBtn) {
      closeCart();
      return;
    }

    // Start Checkout from Cart
    const startCheckoutBtn = e.target.closest("#start-checkout-btn");
    if (startCheckoutBtn) {
      openCheckout();
      return;
    }

    // Checkout Navigation Stepper
    if (e.target.id === "btn-to-step-2") {
      // Validate step 1 fields
      const name = document.querySelector("#co-name")?.value.trim();
      const phone = document.querySelector("#co-phone")?.value.trim();
      const email = document.querySelector("#co-email")?.value.trim();
      const address = document.querySelector("#co-address")?.value.trim();
      const pincode = document.querySelector("#co-pincode")?.value.trim();

      if (!name || !phone || !email || !address || !pincode) {
        showToast("Please fill in all required shipping fields");
        return;
      }
      setCheckoutStep(2);
      return;
    }

    if (e.target.id === "btn-back-to-1") {
      setCheckoutStep(1);
      return;
    }

    if (e.target.id === "btn-to-step-3") {
      setCheckoutStep(3);
      return;
    }

    if (e.target.id === "btn-back-to-2") {
      setCheckoutStep(2);
      return;
    }

    // Shipping Method change
    const socCard = e.target.closest('.shipping-option-card');
    if (socCard) {
      document.querySelectorAll('.shipping-option-card').forEach(c => c.classList.remove('selected'));
      socCard.classList.add('selected');
      const radio = socCard.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
      updateCheckoutSummary();
      return;
    }

    // Payment Method change
    const pmCard = e.target.closest('.payment-method-card');
    if (pmCard) {
      document.querySelectorAll('.payment-method-card').forEach(c => c.classList.remove('selected'));
      pmCard.classList.add('selected');
      const radio = pmCard.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
      updateCheckoutSummary();
      return;
    }

    // Order Success Buttons
    if (e.target.id === "osm-track-btn") {
      const orderRef = document.querySelector("#osm-order-id")?.textContent;
      openOrderTracking(orderRef);
      return;
    }

    if (e.target.id === "osm-invoice-btn") {
      const orderRef = document.querySelector("#osm-order-id")?.textContent;
      openTaxInvoice(orderRef);
      return;
    }

    if (e.target.id === "osm-continue-btn") {
      if (orderSuccessModal) orderSuccessModal.close();
      return;
    }

    // Order Tracking Invoice Button
    const viewInvoiceBtn = e.target.closest('[data-action="view-invoice"]');
    if (viewInvoiceBtn) {
      openTaxInvoice(viewInvoiceBtn.dataset.orderId);
      return;
    }

    const trackOrderBtn = e.target.closest('[data-action="track-order-btn"]');
    if (trackOrderBtn) {
      openOrderTracking(trackOrderBtn.dataset.id);
      return;
    }

    // Auth Tabs
    const authTab = e.target.closest('.auth-tab');
    if (authTab) {
      switchAuthTab(authTab.dataset.target);
      return;
    }

    // Logout Buttons (Customer Profile, Admin Suite Topbar, Admin Suite Sidebar, Preview Banner)
    if (
      e.target.id === "prof-logout-btn" ||
      e.target.closest("#adm-top-logout-btn") ||
      e.target.closest("#admin-side-logout-btn") ||
      e.target.closest("#banner-logout-btn")
    ) {
      currentUser = null;
      isAdminLoggedIn = false;
      persistStore();
      showCustomerStorefront(false);
      updateAuthHeaderUI();
      switchAuthTab("login");
      const adminCard = document.querySelector("#admin-manager-badge-card");
      if (adminCard) adminCard.style.display = "none";
      showToast("Logged out successfully");
      return;
    }

    // Admin Preview Buttons (Top Action Bar or Sidebar)
    if (
      e.target.closest("#adm-preview-top-btn") ||
      e.target.closest("#admin-side-preview-btn")
    ) {
      window.location.hash = "#preview";
      showCustomerStorefront(true);
      showToast("Storefront Preview: Viewing as customer");
      const shopEl = document.querySelector("#shop");
      if (shopEl) shopEl.scrollIntoView({ behavior: "smooth" });
      return;
    }

    // Direct Header Admin Button / Return to Management Section
    if (
      e.target.closest("#banner-return-to-admin-btn") ||
      e.target.closest("#header-admin-direct-btn") ||
      e.target.closest("#mob-admin-direct-btn")
    ) {
      window.location.hash = "#admin";
      showManagementSection("adm-overview");
      return;
    }

    // Launch Custom Studio from Customer Account Profile
    if (e.target.id === "prof-launch-studio-btn" || e.target.closest("#prof-launch-studio-btn")) {
      switchAuthTab("custom-studio");
      return;
    }

    // Return to Profile from Custom Studio in Customer Account
    if (e.target.id === "cust-back-to-profile-btn" || e.target.closest("#cust-back-to-profile-btn")) {
      switchAuthTab("profile");
      return;
    }

    // Open Custom Studio from Storefront / Catalog Empty State
    if (e.target.closest('[data-action="open-cust-studio-account"]')) {
      if (currentUser) {
        openAuthModal("custom-studio");
      } else {
        openAuthModal("login");
        showToast("Please sign in to access the Custom T-Shirt Studio in your Customer Account.");
      }
      return;
    }

    // Admin Sidebar Tabs
    const adminNavBtn = e.target.closest('.admin-nav-item');
    if (adminNavBtn) {
      switchAdminTab(adminNavBtn.dataset.tab);
      return;
    }

    // Admin Mobile Quick Navigation Pills
    const adminQuickPill = e.target.closest('.admin-quick-pill');
    if (adminQuickPill) {
      switchAdminTab(adminQuickPill.dataset.tab);
      return;
    }

    // Toggle Admin Mobile Sidebar Drawer
    const admMenuBtn = e.target.closest('#admin-mobile-menu-btn');
    if (admMenuBtn) {
      const adminSidebar = document.querySelector("#admin-sidebar");
      const adminOverlay = document.querySelector("#admin-sidebar-overlay");
      if (adminSidebar) adminSidebar.classList.toggle("open");
      if (adminOverlay) adminOverlay.classList.toggle("open");
      return;
    }

    // Close Admin Mobile Sidebar Drawer
    const admCloseBtn = e.target.closest('#admin-sidebar-close-btn, #admin-sidebar-overlay');
    if (admCloseBtn) {
      const adminSidebar = document.querySelector("#admin-sidebar");
      const adminOverlay = document.querySelector("#admin-sidebar-overlay");
      if (adminSidebar) adminSidebar.classList.remove("open");
      if (adminOverlay) adminOverlay.classList.remove("open");
      return;
    }

    // Admin Advance Order Status
    const advOrderBtn = e.target.closest('[data-action="adm-advance-order"]');
    if (advOrderBtn) {
      const orderId = advOrderBtn.dataset.id;
      const nextStatus = advOrderBtn.dataset.next;
      const ord = orders.find(o => o.id === orderId);
      if (ord) {
        ord.fulfillmentStatus = nextStatus;
        persistStore();
        renderAdminOrdersTable();
        renderAdminOverview();
        showToast(`Order #${orderId} marked as ${nextStatus.toUpperCase()}`);
        broadcastCatalogSync('order_status', { id: orderId, fulfillmentStatus: nextStatus });

        // Sync updated status to Management API
        fetch(getApiUrl(`/api/management/orders/${orderId}/status`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fulfillmentStatus: nextStatus })
        }).catch(err => console.warn('Order status sync error:', err));
      }
      return;
    }

    // Admin Stock Matrix Adjusters
    const stockAdjBtn = e.target.closest('[data-action="stock-adj"]');
    if (stockAdjBtn) {
      const prodId = stockAdjBtn.dataset.id;
      const size = stockAdjBtn.dataset.size;
      const delta = Number(stockAdjBtn.dataset.delta);
      const prod = products.find(p => String(p.id) === String(prodId) || p.id === Number(prodId));
      if (prod && prod.stock) {
        prod.stock[size] = Math.max(0, (prod.stock[size] || 0) + delta);
        persistStore();
        renderAdminStockTable();
        renderAdminProductsTable();
        renderCatalog();
        broadcastCatalogSync('stock', { id: prodId, stock: prod.stock });

        // Sync stock to Management API
        fetch(getApiUrl(`/api/management/products/${prodId}/stock`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ size, delta })
        }).catch(err => console.warn('Stock PUT error:', err));
      }
      return;
    }

    // Admin View Product Live on Website
    const viewLiveBtn = e.target.closest('[data-action="adm-view-prod-live"]') || e.target.closest('[data-action="view-live-drop"]');
    if (viewLiveBtn) {
      const prodId = viewLiveBtn.dataset.id;
      navigateToProductOnStorefront(prodId);
      const prod = products.find(p => String(p.id) === String(prodId));
      showToast(`Viewing "${prod ? prod.name : 'T-Shirt drop'}" live on storefront`);
      return;
    }

    // Admin Edit Product
    const editProdBtn = e.target.closest('[data-action="adm-edit-prod"]');
    if (editProdBtn) {
      const prodId = editProdBtn.dataset.id;
      const prod = products.find(p => p.id === Number(prodId) || String(p.id) === String(prodId));
      if (prod) openProductEditor(prod);
      return;
    }

    // Admin Remove / Delete Graphic Design Artwork from T-Shirt
    const remDesignBtn = e.target.closest('[data-action="adm-remove-design"]');
    if (remDesignBtn) {
      const prodId = Number(remDesignBtn.dataset.id) || remDesignBtn.dataset.id;
      const prod = products.find(p => p.id === prodId || String(p.id) === String(prodId) || Number(p.id) === Number(prodId));
      if (prod && confirm(`Remove graphic design artwork from "${prod.name}" and turn it into a plain minimal tee on the website?`)) {
        prod.logoOverlay = null;
        persistStore();
        renderCatalog();
        renderAdminOverview();
        renderAdminProductsTable();
        renderAdminStockTable();
        broadcastCatalogSync('update', prod);
        showToast(`Design artwork deleted from ${prod.name}! Reflected on website.`);

        fetch(getApiUrl(`/api/management/products/${prodId}/remove-design`), {
          method: 'PUT'
        }).then(r => r.json()).then(res => {
          console.log('[Management API] Remove design confirmed:', res);
        }).catch(err => console.warn('Remove design error:', err));
      }
      return;
    }

    // Admin Delete Product
    const delProdBtn = e.target.closest('[data-action="adm-del-prod"]');
    if (delProdBtn) {
      const prodId = Number(delProdBtn.dataset.id) || delProdBtn.dataset.id;
      if (confirm("Are you sure you want to delete this T-shirt from the store?")) {
        // 1. Record deleted ID permanently so it will NEVER auto-appear
        deletedProductIds.add(prodId);
        deletedProductIds.add(Number(prodId));
        deletedProductIds.add(String(prodId));
        try {
          localStorage.setItem("uprumm_deleted_products", JSON.stringify([...deletedProductIds]));
        } catch (e) { }

        // 2. Remove immediately from memory state and UI
        products = products.filter(p => p.id !== prodId && String(p.id) !== String(prodId) && Number(p.id) !== Number(prodId));

        // 3. Remove permanently from custom products localStorage to prevent ghost revival
        try {
          const savedCustom = JSON.parse(localStorage.getItem("uprumm_custom_products") || "[]");
          if (Array.isArray(savedCustom)) {
            const updatedCustom = savedCustom.filter(cp => cp && String(cp.id) !== String(prodId) && Number(cp.id) !== Number(prodId));
            localStorage.setItem("uprumm_custom_products", JSON.stringify(updatedCustom));
          }
        } catch (e) { }

        // 4. Remove from cart if present
        if (Array.isArray(cart)) {
          cart = cart.filter(item => item && String(item.id) !== String(prodId) && Number(item.id) !== Number(prodId));
          try {
            localStorage.setItem("uprumm_cart", JSON.stringify(cart));
          } catch (e) { }
          if (typeof updateCartBadge === 'function') updateCartBadge();
          if (typeof renderCartItems === 'function') renderCartItems();
        }

        persistStore();
        renderCatalog();
        renderAdminOverview();
        renderAdminProductsTable();
        renderAdminStockTable();
        broadcastCatalogSync('delete', { id: prodId });
        showToast("Product deleted from catalog and website");

        // Sync delete to Management API
        inFlightProductWrites.set('del_' + prodId, { id: prodId, isDelete: true });
        fetch(getApiUrl(`/api/management/products/${prodId}`), {
          method: 'DELETE'
        }).then(r => r.json()).then(res => {
          console.log('[Management API] Product delete confirmed:', res);
        }).catch(err => console.warn('Delete sync error:', err))
          .finally(() => {
            inFlightProductWrites.delete('del_' + prodId);
          });
      }
      return;
    }

    // Preset Mockup Image Buttons in Product Editor
    const presetBtn = e.target.closest('.preset-img-btn');
    if (presetBtn) {
      const url = presetBtn.dataset.url;
      currentUploadedPhoto = url;
      const previewBaseImg = document.querySelector("#pem-preview-base-img");
      if (previewBaseImg) previewBaseImg.src = url;
      const urlInput = document.querySelector("#pem-photo-url-input");
      if (urlInput) urlInput.value = url;
      const statusEl = document.querySelector("#pem-photo-url-status");
      if (statusEl) {
        statusEl.textContent = `✓ Preset "${presetBtn.textContent.trim()}" URL active`;
        statusEl.className = "url-status-msg status-success";
      }
      const clearBtn = document.querySelector("#pem-clear-photo-url-btn");
      if (clearBtn) clearBtn.style.display = "inline";
      const dropPhotoMsg = document.querySelector("#drop-photo-msg");
      if (dropPhotoMsg) {
        dropPhotoMsg.innerHTML = `
          <div class="drop-thumb-preview">
            <img src="${url}" alt="Mockup Thumbnail">
            <div class="dt-details">
              <span class="dt-name">${presetBtn.textContent.trim()}</span>
              <span class="dt-status">✓ Preset Mockup Selected</span>
            </div>
          </div>
        `;
      }
      showToast("Preset mockup photo applied!");
      return;
    }

    // Preset Logo / Graphic Design Buttons in Product Editor
    const presetLogoBtn = e.target.closest('.preset-logo-btn');
    if (presetLogoBtn) {
      const presetKey = presetLogoBtn.dataset.preset;
      const logoSvg = (typeof SAMPLE_PRESET_LOGOS !== 'undefined' && SAMPLE_PRESET_LOGOS[presetKey]) ? SAMPLE_PRESET_LOGOS[presetKey] : SAMPLE_CULTURAL_LOGO;
      currentUploadedLogo = logoSvg;

      const logoOverlay = document.querySelector("#pem-logo-overlay");
      const previewLogoImg = document.querySelector("#pem-preview-logo-img");
      const removeLogoBtn = document.querySelector("#pem-remove-logo-btn");
      const logoStatus = document.querySelector("#pem-logo-status");
      const dropLogoMsg = document.querySelector("#drop-logo-msg");

      if (previewLogoImg) {
        previewLogoImg.src = logoSvg;
        previewLogoImg.style.display = "block";
      }
      if (logoOverlay) {
        logoOverlay.style.display = "flex";
      }
      if (removeLogoBtn) {
        removeLogoBtn.style.display = "inline-flex";
      }
      if (logoStatus) {
        logoStatus.innerHTML = `<strong style="color:var(--green)">✓ Graphic Artwork Thumbnail Active</strong>`;
      }

      if (dropLogoMsg) {
        dropLogoMsg.innerHTML = `
          <div class="drop-thumb-preview">
            <img src="${logoSvg}" alt="Design Thumbnail">
            <div class="dt-details">
              <span class="dt-name">Sample: ${presetLogoBtn.textContent}</span>
              <span class="dt-status">✓ Design Thumbnail Active</span>
            </div>
          </div>
        `;
      }
      showToast(`Sample design "${presetLogoBtn.textContent}" overlaid on T-shirt!`);
      return;
    }

    // Admin Edit Courier AWB Tracking Number
    const editAwbBtn = e.target.closest('[data-action="adm-edit-awb"]');
    if (editAwbBtn) {
      const orderId = editAwbBtn.dataset.id;
      const ord = orders.find(o => o.id === orderId);
      if (ord) {
        const newAwb = prompt(`Enter Delhivery / Blue Dart AWB Courier Tracking Number for Order #${orderId}:`, ord.awb || "");
        if (newAwb !== null) {
          ord.awb = newAwb.trim();
          persistStore();
          renderAdminOrdersTable();
          renderAdminOverview();
          showToast(`✓ AWB updated for Order #${orderId}: ${ord.awb || 'None'}`);

          fetch(getApiUrl(`/api/management/orders/${orderId}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ awb: ord.awb })
          }).catch(err => console.warn('AWB sync error:', err));
        }
      }
      return;
    }

    // Admin Delete Order (Cancelled / Test order cleanup)
    const delOrderBtn = e.target.closest('[data-action="adm-del-order"]');
    if (delOrderBtn) {
      const orderId = delOrderBtn.dataset.id;
      if (confirm(`Permanently delete Order #${orderId}? This cannot be undone.`)) {
        orders = orders.filter(o => o.id !== orderId);
        persistStore();
        renderAdminOrdersTable();
        renderAdminOverview();
        showToast(`Order #${orderId} deleted.`);

        fetch(getApiUrl(`/api/management/orders/${orderId}`), {
          method: 'DELETE'
        }).catch(err => console.warn('Order delete error:', err));
      }
      return;
    }

    // Admin Direct Stock Quantity Setting (click on number)
    const stockDirectBtn = e.target.closest('[data-action="stock-set-direct"]');
    if (stockDirectBtn) {
      const prodId = stockDirectBtn.dataset.id;
      const size = stockDirectBtn.dataset.size;
      const prod = products.find(p => String(p.id) === String(prodId) || p.id === Number(prodId));
      if (prod && prod.stock) {
        const currentQty = prod.stock[size] ?? 0;
        const inputVal = prompt(`Set exact stock count for "${prod.name}" (Size ${size}):`, currentQty);
        if (inputVal !== null && inputVal.trim() !== '') {
          const newQty = parseInt(inputVal.trim(), 10);
          if (!isNaN(newQty) && newQty >= 0) {
            prod.stock[size] = newQty;
            persistStore();
            renderAdminStockTable();
            renderAdminProductsTable();
            renderCatalog();
            broadcastCatalogSync('stock', { id: prodId, stock: prod.stock });
            showToast(`✓ Set "${prod.name}" Size ${size} stock to ${newQty}`);

            fetch(getApiUrl(`/api/management/products/${prodId}/stock`), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ size, setQuantity: newQty })
            }).catch(err => console.warn('Stock PUT error:', err));
          } else {
            showToast("Please enter a valid stock number (0 or higher).");
          }
        }
      }
      return;
    }

    // Reset / Clear Data in Settings (Clean slate)
    if (e.target.id === "adm-reset-data-btn") {
      if (confirm("Clear catalog, orders, and cache to start with a 100% clean slate?")) {
        localStorage.clear();
        deletedProductIds.clear();
        SAMPLE_PRODUCT_IDS.forEach(id => deletedProductIds.add(id));
        products = [];
        cart = [];
        users = [];
        currentUser = null;
        orders = [];
        settings = DEFAULT_SETTINGS;
        persistStore();
        renderCatalog();
        renderCart();
        renderAdminOverview();
        updateAuthHeaderUI();
        showToast("✓ Store catalog reset to a clean slate (0 demo items)!");

        fetch(getApiUrl('/api/management/reset-catalog'), { method: 'POST' })
          .then(r => r.json())
          .then(() => {
            products = [];
            persistStore();
            renderCatalog();
            renderAdminOverview();
            renderAdminProductsTable();
            renderAdminStockTable();
          })
          .catch(() => { });
      }
      return;
    }

    // Close Modals
    if (e.target.id === "close-cart-btn" || e.target.closest("#close-cart-btn") || (e.target === overlay && cartDrawer?.classList.contains("open"))) {
      closeCart();
      return;
    }
    if (e.target.id === "close-checkout-btn" || e.target.closest("#close-checkout-btn")) {
      closeCheckout();
      return;
    }
    if (e.target.id === "close-product-modal-btn" || e.target.closest("#close-product-modal-btn")) {
      closeProductDetail();
      return;
    }
    if (e.target.id === "close-auth-btn" || e.target.closest("#close-auth-btn")) {
      closeAuthModal();
      return;
    }
    if (e.target.id === "close-tracking-btn" || e.target.closest("#close-tracking-btn")) {
      closeOrderTracking();
      return;
    }
    if (e.target.id === "close-invoice-btn" || e.target.closest("#close-invoice-btn")) {
      closeTaxInvoice();
      return;
    }
    if (e.target.id === "close-admin-top-btn" || e.target.closest("#close-admin-top-btn")) {
      showCustomerStorefront(true);
      return;
    }
    if (e.target.id === "close-pem-btn" || e.target.closest("#close-pem-btn") || e.target.id === "pem-cancel-btn" || e.target.closest("#pem-cancel-btn")) {
      closeProductEditor();
      return;
    }
    if (e.target.id === "print-invoice-btn") {
      window.print();
      return;
    }
  });

  // ==========================================================================
  // 14. HEADER & NAVIGATION TRIGGERS
  // ==========================================================================

  // Cart Open Triggers
  document.querySelectorAll(".cart-open").forEach(btn => btn.addEventListener("click", openCart));
  const cartOpenBtn = document.querySelector("#cart-open-btn");
  if (cartOpenBtn) cartOpenBtn.addEventListener("click", openCart);
  const mobCartBtn = document.querySelector("#mob-cart-btn");
  if (mobCartBtn) mobCartBtn.addEventListener("click", openCart);

  // User Auth Triggers
  const userBtn = document.querySelector("#user-btn");
  if (userBtn) userBtn.addEventListener("click", () => openAuthModal());
  const navAccountBtn = document.querySelector("#nav-account-btn");
  if (navAccountBtn) navAccountBtn.addEventListener("click", () => openAuthModal());
  const mobAccountBtn = document.querySelector("#mob-account-btn");
  if (mobAccountBtn) mobAccountBtn.addEventListener("click", () => openAuthModal());
  const footerAuthBtn = document.querySelector("#footer-auth-btn");
  if (footerAuthBtn) footerAuthBtn.addEventListener("click", () => openAuthModal());

  // Admin Portal Triggers
  const adminOpenBtn = document.querySelector("#admin-open-btn");
  if (adminOpenBtn) adminOpenBtn.addEventListener("click", () => openAdminDashboard());
  const footerAdminBtn = document.querySelector("#footer-admin-btn");
  if (footerAdminBtn) footerAdminBtn.addEventListener("click", () => openAdminDashboard());

  // Order Tracking Triggers
  const navTrackBtn = document.querySelector("#nav-track-btn");
  if (navTrackBtn) navTrackBtn.addEventListener("click", () => openOrderTracking());
  const mobOrdersBtn = document.querySelector("#mob-orders-btn");
  if (mobOrdersBtn) mobOrdersBtn.addEventListener("click", () => openOrderTracking());
  const footerTrackBtn = document.querySelector("#footer-track-btn");
  if (footerTrackBtn) footerTrackBtn.addEventListener("click", () => openOrderTracking());
  const trDownloadInvBtn = document.querySelector("#tr-download-invoice-btn");
  if (trDownloadInvBtn) {
    trDownloadInvBtn.addEventListener("click", () => {
      const targetId = trackingSearchInput?.value;
      if (targetId) openTaxInvoice(targetId);
    });
  }

  // Footer Shipping Info Trigger
  const footerShippingBtn = document.querySelector("#footer-shipping-btn");
  if (footerShippingBtn) {
    footerShippingBtn.addEventListener("click", () => {
      showToast(`Free shipping on orders above ${money(settings.freeShippingThreshold || 1499)}! Fast 3-day express dispatch across India.`);
    });
  }

  // Edit Customer Address in Profile Modal
  const editAddrBtn = document.querySelector("#edit-address-btn");
  if (editAddrBtn) {
    editAddrBtn.addEventListener("click", () => {
      if (!currentUser) return;
      const newAddr = prompt("Enter your street shipping address:", currentUser.address || "");
      if (newAddr !== null && newAddr.trim() !== "") {
        currentUser.address = newAddr.trim();
        const newCity = prompt("Enter your city and state (e.g. Mumbai, Maharashtra):", `${currentUser.city || 'Mumbai'}, ${currentUser.state || 'Maharashtra'}`);
        if (newCity) {
          currentUser.city = newCity.split(",")[0]?.trim() || "Mumbai";
          currentUser.state = newCity.split(",")[1]?.trim() || "Maharashtra";
        }
        const newPin = prompt("Enter 6-digit Pincode:", currentUser.pincode || "400001");
        if (newPin) currentUser.pincode = newPin.trim();
        persistStore();
        renderCustomerProfile();
        showToast("Shipping address updated successfully!");
        fetch(getApiUrl('/api/users'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentUser)
        }).catch(() => { });
      }
    });
  }

  // Admin Overview: View All Orders Shortcut
  const gotoAllOrdersBtn = document.querySelector("#goto-all-orders");
  if (gotoAllOrdersBtn) {
    gotoAllOrdersBtn.addEventListener("click", () => {
      switchAdminTab("adm-orders");
    });
  }

  // Admin Catalog & Custom Products: Category Filter Pills
  const admCatPillsContainer = document.querySelector("#adm-prod-cat-pills");
  if (admCatPillsContainer) {
    admCatPillsContainer.addEventListener("click", (e) => {
      const pill = e.target.closest(".adm-cat-pill");
      if (!pill) return;
      admCatPillsContainer.querySelectorAll(".adm-cat-pill").forEach(el => el.classList.remove("active"));
      pill.classList.add("active");
      activeAdminProdCategory = pill.dataset.cat || 'all';
      renderAdminProductsTable();
    });
  }

  // Admin Catalog & Custom Products: Live Search Input
  const admProdSearch = document.querySelector("#adm-prod-search");
  if (admProdSearch) {
    admProdSearch.addEventListener("input", (e) => {
      adminProdSearchTerm = e.target.value;
      renderAdminProductsTable();
    });
  }

  // Delegate Reset Filter Button click
  document.addEventListener("click", (e) => {
    if (e.target.id === "adm-clear-prod-filter") {
      activeAdminProdCategory = 'all';
      adminProdSearchTerm = '';
      if (admProdSearch) admProdSearch.value = '';
      if (admCatPillsContainer) {
        admCatPillsContainer.querySelectorAll(".adm-cat-pill").forEach(el => el.classList.toggle("active", el.dataset.cat === 'all'));
      }
      renderAdminProductsTable();
    }
  });

  // Export Catalog JSON helper
  async function exportCatalogJson() {
    try {
      showToast("Generating catalog management JSON export...");
      let exportData = null;
      try {
        const res = await fetch(getApiUrl('/api/management/catalog-config'));
        if (res.ok) exportData = await res.json();
      } catch (e) { }

      if (!exportData || !exportData.products) {
        exportData = {
          metadata: {
            title: "Uprumm Master Catalog & Custom Products Management",
            schemaVersion: "2.0.0",
            exportedAt: new Date().toISOString(),
            totalProducts: products.length
          },
          categories: [
            { id: "graphic", name: "Graphic Drops", icon: "👕" },
            { id: "minimal", name: "Minimal Heavyweight", icon: "⬛" },
            { id: "custom", name: "Custom Print Drops", icon: "🎨" }
          ],
          products: products
        };
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `uprumm_catalog_management_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("✓ Catalog JSON exported successfully!");
    } catch (err) {
      console.error("Export error:", err);
      showToast("⚠️ Could not export catalog JSON");
    }
  }

  // Dynamic Real-Time Catalog Sync Helper
  async function forceCatalogRefresh() {
    try {
      const res = await fetch(getApiUrl('/api/management/products?_t=' + Date.now()));
      if (res.ok) {
        const liveProds = await res.json();
        if (Array.isArray(liveProds)) {
          products = liveProds.filter(p => p && !deletedProductIds.has(Number(p.id)) && !deletedProductIds.has(String(p.id)));
          persistStore();
          renderCatalog();
          renderAdminOverview();
          renderAdminProductsTable();
          renderAdminStockTable();
        }
      }
    } catch (err) {
      console.warn('Dynamic catalog refresh notice:', err);
    }
  }

  // Admin Orders: Live Status Filter & Search
  const admOrderStatusFilter = document.querySelector("#adm-order-status-filter");
  if (admOrderStatusFilter) {
    admOrderStatusFilter.addEventListener("change", () => {
      renderAdminOrdersTable();
    });
  }

  const admOrderSearch = document.querySelector("#adm-order-search");
  if (admOrderSearch) {
    admOrderSearch.addEventListener("input", () => {
      renderAdminOrdersTable();
    });
  }

  // Tracking Search Input Submit
  const trSearchSubmit = document.querySelector("#tracking-search-submit");
  if (trSearchSubmit) {
    trSearchSubmit.addEventListener("click", () => {
      const q = trackingSearchInput?.value;
      if (q) renderOrderTracking(q);
    });
  }

  if (trackingSearchInput) {
    trackingSearchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        renderOrderTracking(trackingSearchInput.value);
      }
    });
  }

  // Admin Add Product Triggers
  const admAddProdBtn = document.querySelector("#adm-add-product-btn");
  if (admAddProdBtn) admAddProdBtn.addEventListener("click", () => openProductEditor());
  const admAddProdBtn2 = document.querySelector("#adm-add-prod-btn2");
  if (admAddProdBtn2) admAddProdBtn2.addEventListener("click", () => openProductEditor());

  // Promo Customizer Buttons
  const promoUploadBtn = document.querySelector("#promo-upload-btn");
  if (promoUploadBtn) promoUploadBtn.addEventListener("click", () => openProductEditor());
  const heroCreateBtn = document.querySelector("#hero-create-btn");
  if (heroCreateBtn) heroCreateBtn.addEventListener("click", () => openProductEditor());

  // Search Modal
  const searchOpenBtn = document.querySelector("#search-open-btn");
  const searchModal = document.querySelector("#search-modal");
  const searchInput = document.querySelector("#search-input");
  const searchResults = document.querySelector("#search-results");
  const mobSearchBtn = document.querySelector("#mob-search-btn");

  function openSearch() {
    if (!searchModal) return;
    searchModal.showModal();
    setTimeout(() => { if (searchInput) searchInput.focus(); }, 100);
  }

  if (searchOpenBtn) searchOpenBtn.addEventListener("click", openSearch);
  if (mobSearchBtn) mobSearchBtn.addEventListener("click", openSearch);

  if (searchInput && searchResults) {
    searchInput.addEventListener("input", function (e) {
      const q = e.target.value.trim().toLowerCase();
      if (!q) {
        searchResults.innerHTML = "";
        return;
      }
      const matches = products.filter(p => (p.name + " " + p.subtitle + " " + p.category).toLowerCase().includes(q));
      searchResults.innerHTML = matches.length ? matches.map(p => `
        <div class="search-result" data-action="open-detail" data-id="${p.id}" tabindex="0">
          <img src="${p.image}" alt="">
          <div>
            <strong>${p.name}</strong>
            <span>${money(p.price)} · ${p.subtitle}</span>
          </div>
        </div>
      `).join('') : `<p style="font-size:12px; color:var(--muted); padding:16px 0;">No matching T-shirts found.</p>`;
    });
  }

  const closeSearchBtn = document.querySelector("#close-search-btn");
  if (closeSearchBtn) {
    closeSearchBtn.addEventListener("click", () => {
      if (searchModal && searchModal.open) searchModal.close();
    });
  }

  // Catalog Filter Buttons
  document.querySelectorAll(".filter").forEach(btn => {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      activeFilter = this.dataset.filter;
      showAll = true;
      renderCatalog();
    });
  });

  // Sort Dropdown
  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      activeSort = this.value;
      renderCatalog();
    });
  }

  if (showAllBtn) {
    showAllBtn.addEventListener("click", function () {
      showAll = true;
      renderCatalog();
    });
  }

  // Mobile Menu Toggle
  const menuToggle = document.querySelector("#menu-toggle");
  const mainNav = document.querySelector("#main-nav");
  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", function () {
      const open = mainNav.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.textContent = open ? "×" : "☰";
    });

    document.querySelectorAll(".main-nav a, .main-nav button").forEach(a => {
      a.addEventListener("click", () => {
        mainNav.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.textContent = "☰";
      });
    });
  }

  // Pincode Lookup Auto-Complete (Indian Cities/States)
  const coPincode = document.querySelector("#co-pincode");
  if (coPincode) {
    coPincode.addEventListener("input", function (e) {
      const val = e.target.value.trim();
      if (val.length === 6) {
        if (PINCODE_MAP[val]) {
          const info = PINCODE_MAP[val];
          const coCity = document.querySelector("#co-city");
          const coState = document.querySelector("#co-state");
          if (coCity) coCity.value = info.city;
          if (coState) coState.value = info.state;
          showToast(`Pincode verified: ${info.city}, ${info.state}`);
        } else {
          // Fallback based on first digit of Indian Pincode
          const digit = val.charAt(0);
          const stateGuess = {
            "1": { city: "Delhi / North", state: "Delhi" },
            "2": { city: "Lucknow", state: "Uttar Pradesh" },
            "3": { city: "Jaipur / Ahmedabad", state: "Rajasthan" },
            "4": { city: "Mumbai / Pune", state: "Maharashtra" },
            "5": { city: "Hyderabad / Bengaluru", state: "Telangana" },
            "6": { city: "Chennai / Kochi", state: "Tamil Nadu" },
            "7": { city: "Kolkata", state: "West Bengal" },
            "8": { city: "Patna", state: "Bihar" }
          }[digit] || { city: "City", state: "India" };

          const coCity = document.querySelector("#co-city");
          const coState = document.querySelector("#co-state");
          if (coCity && !coCity.value) coCity.value = stateGuess.city;
          if (coState && !coState.value) coState.value = stateGuess.state;
        }
      }
    });
  }

  // Cart Quick Pincode Checker
  const cartPincodeInput = document.querySelector("#cart-pincode-input");
  const cartPincodeCheckBtn = document.querySelector("#cart-pincode-check-btn");
  const cartPincodeStatus = document.querySelector("#cart-pincode-status");

  if (cartPincodeCheckBtn && cartPincodeInput && cartPincodeStatus) {
    cartPincodeCheckBtn.addEventListener("click", () => {
      const val = cartPincodeInput.value.trim();
      if (val.length !== 6 || isNaN(val)) {
        cartPincodeStatus.textContent = "Please enter a valid 6-digit Indian pincode.";
        cartPincodeStatus.style.color = "var(--red)";
        return;
      }
      const info = PINCODE_MAP[val];
      if (info) {
        cartPincodeStatus.textContent = `✓ Delivery available to ${info.city}, ${info.state} in ${info.days}-${info.days + 1} business days.`;
        cartPincodeStatus.style.color = "var(--green)";
      } else {
        cartPincodeStatus.textContent = `✓ Standard Pan-India delivery in 3-5 business days via Delhivery.`;
        cartPincodeStatus.style.color = "var(--green)";
      }
    });
  }

  // Store Settings Form Submission
  const settingsForm = document.querySelector("#store-settings-form");
  if (settingsForm) {
    settingsForm.addEventListener("submit", function (e) {
      e.preventDefault();
      settings.freeShippingThreshold = Number(document.querySelector("#set-free-threshold")?.value) || 1499;
      settings.standardShippingFee = Number(document.querySelector("#set-std-fee")?.value) || 99;
      settings.expressShippingFee = Number(document.querySelector("#set-exp-fee")?.value) || 149;

      persistStore();
      const annThresh = document.querySelector("#announcement-threshold");
      if (annThresh) annThresh.textContent = money(settings.freeShippingThreshold);

      // Sync settings to MongoDB Atlas / server
      fetch(getApiUrl('/api/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      }).catch(err => console.warn('Settings sync error:', err));

      showToast("Store & Payment settings saved successfully!");
    });
  }

  // Newsletter Form
  const newsletterForm = document.querySelector("#newsletter-form");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const email = document.querySelector("#newsletter-email")?.value;
      const msg = document.querySelector("#newsletter-message");
      if (msg) msg.textContent = `Thanks! ${email} has been subscribed to the Uprumm Drop List.`;
      showToast("Subscribed to drop alerts!");
      e.target.reset();
    });
  }

  // Contact Us Modal
  const contactModal = document.querySelector("#contact-modal");
  const openContactModalBtn = document.querySelector("#open-contact-modal-btn");
  const footerContactLinkBtn = document.querySelector("#footer-contact-link-btn");
  const closeContactModalBtn = document.querySelector("#close-contact-modal-btn");
  const contactForm = document.querySelector("#contact-form");

  function openContactModal() {
    if (!contactModal) return;
    contactModal.showModal();
  }

  function closeContactModal() {
    if (!contactModal) return;
    contactModal.close();
  }

  if (openContactModalBtn) openContactModalBtn.addEventListener("click", openContactModal);
  if (footerContactLinkBtn) footerContactLinkBtn.addEventListener("click", openContactModal);
  if (closeContactModalBtn) closeContactModalBtn.addEventListener("click", closeContactModal);

  if (contactModal) {
    contactModal.addEventListener("click", function (e) {
      const rect = contactModal.getBoundingClientRect();
      const inBox = (rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX && e.clientX <= rect.left + rect.width);
      if (!inBox) contactModal.close();
    });
  }

  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const name = document.querySelector("#cm-name")?.value || "Friend";
      const topic = document.querySelector("#cm-topic")?.value || "Inquiry";
      showToast(`Thank you, ${name}! Your message has been sent to tudurajanikanta@gmail.com.`);
      contactForm.reset();
      closeContactModal();
    });
  }

  // Keyboard navigation & Dialog backdrops
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeCart();
      closeProductDetail();
      closeCheckout();
      closeAuthModal();
      closeOrderTracking();
      closeTaxInvoice();
      closeAdminDashboard();
      closeProductEditor();
      closeContactModal();
    }
  });

  // Native <dialog> backdrop click to close
  document.querySelectorAll("dialog").forEach(dlg => {
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg) {
        if (dlg.id === "product-editor-modal") closeProductEditor();
        else if (dlg.id === "auth-modal") closeAuthModal();
        else if (dlg.id === "product-modal") closeProductDetail();
        else if (dlg.id === "checkout-modal") closeCheckout();
        else if (dlg.id === "order-tracking-modal") closeOrderTracking();
        else if (dlg.id === "invoice-modal") closeTaxInvoice();
        else if (dlg.id === "contact-modal") closeContactModal();
        else dlg.close();
      }
    });
  });

  // Year in footer
  const yearEl = document.querySelector("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Initial Boot
  updateAuthHeaderUI();
  renderCatalog();
  renderCart();
  initCustomerUploadStudio();
  startMultiDeviceSyncEngine();

  // Initial Boot View Routing
  if (window.location.hash === "#admin") {
    showManagementSection("adm-overview");
  } else if (isAdminLoggedIn) {
    showCustomerStorefront(true);
  } else {
    showCustomerStorefront(false);
  }

  // Handle URL hash navigation (e.g. #admin, #preview, #shop, #collections, etc.)
  window.addEventListener("hashchange", function () {
    if (window.location.hash === "#admin") {
      showManagementSection("adm-overview");
    } else {
      showCustomerStorefront(isAdminLoggedIn);
      if (window.location.hash === "#shop" || window.location.hash === "#preview") {
        setTimeout(() => {
          const shopEl = document.querySelector("#shop");
          if (shopEl) shopEl.scrollIntoView({ behavior: "smooth" });
        }, 80);
      } else if (window.location.hash === "#custom-studio" || window.location.hash === "#custom-studio-section") {
        if (currentUser) {
          openAuthModal("custom-studio");
        } else {
          openAuthModal("login");
          showToast("Please sign in to access the Custom T-Shirt Studio in your Customer Account.");
        }
      }
    }
  });

  console.log("⚡ Uprumm E-Commerce Platform loaded successfully.");
})();
