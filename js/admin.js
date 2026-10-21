/**
 * ==========================================================================
 * UPRUMM STUDIO — DEDICATED ADMIN MANAGEMENT ENGINE (admin.js)
 * Standalone Administration Suite & Authentication Barrier
 * ==========================================================================
 */

(function () {
  "use strict";

  // --- API HELPER & CONSTANTS ---
  function getApiUrl(endpoint) {
    if (!endpoint) return "";
    if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) return endpoint;

    // 1. Explicit configured backend (e.g. Render production URL)
    const customBackend = window.UPRUMM_BACKEND_URL || localStorage.getItem("uprumm_backend_url");
    if (customBackend && typeof customBackend === "string" && customBackend.startsWith("http")) {
      return `${customBackend.replace(/\/+$/, '')}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    }

    // 2. When running on Live Server / non-3000 local port or file:// protocol, route to Node.js backend on :3000
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (window.location.protocol === "file:" || (isLocalhost && window.location.port && window.location.port !== "3000")) {
      return `http://localhost:3000${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    }

    return endpoint;
  }

  function money(val) {
    return "₹" + Number(val || 0).toLocaleString("en-IN");
  }

  // --- LOCAL FALLBACK SEED DATA ---
  const INITIAL_PRODUCTS = [
    {
      id: 1,
      name: "Neo-Tokyo Cyber Oversized Tee",
      subtitle: "240 GSM Heavyweight French Terry · High-Density Print",
      price: 899,
      comparePrice: 1299,
      badge: "BESTSELLER",
      category: "graphic",
      stock: { S: 12, M: 20, L: 15, XL: 8, XXL: 5 },
      image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=85",
      logoOverlay: null,
      description: "Signature drop inspired by cyberpunk Tokyo nightscapes. High-density screen printed on 240 GSM heavy combed cotton."
    },
    {
      id: 2,
      name: "Acid Mirage Washed Graphic Tee",
      subtitle: "Vintage Acid Wash · Boxy Drop-Shoulder Fit",
      price: 949,
      comparePrice: 1399,
      badge: "STUDIO DROP",
      category: "graphic",
      stock: { S: 8, M: 14, L: 10, XL: 6, XXL: 3 },
      image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=85",
      logoOverlay: null,
      description: "Individually acid-washed for a weathered vintage streetwear feel. Softened hand-feel with mineral dye."
    },
    {
      id: 3,
      name: "Monolith Minimalist Raw Tee",
      subtitle: "260 GSM Ultra-Heavy Combed Cotton · Clean Silhouette",
      price: 799,
      comparePrice: 1099,
      badge: "CORE ESSENTIAL",
      category: "minimal",
      stock: { S: 15, M: 25, L: 18, XL: 12, XXL: 6 },
      image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=85",
      logoOverlay: null,
      description: "Understated minimalist luxury. Heavyweight drape with ribbed neckband and reinforced double stitching."
    }
  ];

  // --- STATE ---
  let products = JSON.parse(localStorage.getItem("uprumm_products") || "null") || INITIAL_PRODUCTS;
  const isRealCustomer = (u) => {
    if (!u || !u.email) return false;
    if (u.role === 'admin' || u.id === 'admin_master' || u.isDemo === true) return false;
    if (u.id && String(u.id).startsWith('demo_')) return false;
    return true;
  };
  let rawUsers = JSON.parse(localStorage.getItem("uprumm_users") || "[]");
  let users = Array.isArray(rawUsers) ? rawUsers.filter(isRealCustomer) : [];
  let orders = JSON.parse(localStorage.getItem("uprumm_orders") || "[]");
  if (!Array.isArray(orders)) orders = [];
  let settings = JSON.parse(localStorage.getItem("uprumm_settings") || "{}");
  let currentUploadedPhoto = null;
  let currentUploadedLogo = null;
  let activeAdminProdCategory = "all";
  let adminProdSearchTerm = "";
  let shouldAutoViewLiveOnSubmit = false;

  // --- DOM ELEMENTS ---
  const authScreen = document.querySelector("#admin-auth-screen");
  const managementView = document.querySelector("#admin-management-view");
  const authForm = document.querySelector("#admin-auth-form");
  const authEmailInput = document.querySelector("#admin-auth-email");
  const authPasswordInput = document.querySelector("#admin-auth-password");
  const authErrorBox = document.querySelector("#admin-auth-error");
  const authErrorText = document.querySelector("#admin-auth-error-text");
  const pwToggleBtn = document.querySelector("#admin-pw-toggle");
  const toastEl = document.querySelector("#toast");

  const productEditorModal = document.querySelector("#product-editor-modal");
  const productEditorForm = document.querySelector("#product-editor-form");
  const adminOrderModal = document.querySelector("#admin-order-modal");
  const invoiceModal = document.querySelector("#invoice-modal");

  // --- TOAST NOTIFICATIONS ---
  let toastTimer = null;
  function showToast(message, actionLabel = null, actionCallback = null) {
    if (!toastEl) return;
    clearTimeout(toastTimer);
    toastEl.innerHTML = "";
    const textSpan = document.createElement("span");
    textSpan.textContent = message;
    toastEl.appendChild(textSpan);

    if (actionLabel && typeof actionCallback === "function") {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "toast-action-btn";
      btn.textContent = actionLabel;
      btn.addEventListener("click", () => {
        actionCallback();
        toastEl.classList.remove("visible");
      });
      toastEl.appendChild(btn);
    }

    toastEl.classList.add("visible");
    toastTimer = setTimeout(() => {
      toastEl.classList.remove("visible");
    }, 4000);
  }

  // --- PERSISTENCE ---
  function persistStore() {
    try {
      localStorage.setItem("uprumm_products", JSON.stringify(products));
      localStorage.setItem("uprumm_orders", JSON.stringify(orders));
      localStorage.setItem("uprumm_users", JSON.stringify(users));
      localStorage.setItem("uprumm_settings", JSON.stringify(settings));
    } catch (e) {
      console.warn("[Admin Storage Notice]", e.message);
    }
  }

  // ==========================================================================
  // AUTHENTICATION BARRIER & SESSION CONTROL
  // ==========================================================================

  // ==========================================================================
  // AUTHENTICATION BARRIER, TOKEN STORAGE & SESSION CONTROL
  // ==========================================================================

  function getAdminToken() {
    return sessionStorage.getItem("uprumm_admin_token") || localStorage.getItem("uprumm_admin_token") || "";
  }

  function setAdminToken(token, remember = true) {
    if (!token) return;
    sessionStorage.setItem("uprumm_admin_token", token);
    localStorage.setItem("uprumm_admin_token", token);
    localStorage.setItem("uprumm_isAdminLoggedIn", "true");
  }

  function clearAdminToken() {
    sessionStorage.removeItem("uprumm_admin_token");
    localStorage.removeItem("uprumm_admin_token");
    sessionStorage.removeItem("uprumm_admin_session");
    localStorage.removeItem("uprumm_admin_session");
    localStorage.setItem("uprumm_isAdminLoggedIn", "false");
  }

  function isAdminAuthenticated() {
    const token = getAdminToken();
    return Boolean(token && token.length > 20);
  }

  function showAuthScreen() {
    if (authScreen) authScreen.style.display = "flex";
    if (managementView) {
      managementView.style.display = "none";
      managementView.classList.remove("standalone-active");
    }
    if (authPasswordInput) authPasswordInput.value = "";
  }

  function unlockManagementSuite() {
    if (authScreen) authScreen.style.display = "none";
    if (managementView) {
      managementView.style.display = "flex";
      managementView.classList.add("standalone-active");
    }
    // Refresh all data from server and render
    loadServerDataAndRender();
  }

  // Authenticated fetch wrapper that appends JWT token & handles 401 expiration
  async function adminFetch(endpoint, options = {}) {
    const token = getAdminToken();
    const headers = {
      ...(options.headers || {})
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      headers["x-admin-token"] = token;
    }

    const fullUrl = getApiUrl(endpoint);
    try {
      const res = await fetch(fullUrl, { ...options, headers });
      if (res.status === 401) {
        clearAdminToken();
        showAuthScreen();
        showAuthError("Your administrator session has expired. Please sign in again.");
      }
      return res;
    } catch (err) {
      console.warn(`[adminFetch] Network notice for ${endpoint}:`, err.message);
      throw err;
    }
  }

  // Toggle password visibility in login screen
  if (pwToggleBtn && authPasswordInput) {
    pwToggleBtn.addEventListener("click", () => {
      const isPw = authPasswordInput.type === "password";
      authPasswordInput.type = isPw ? "text" : "password";
      pwToggleBtn.textContent = isPw ? "🙈" : "👁️";
    });
  }

  // Handle Admin Sign In submission via secure POST /api/admin/login
  if (authForm) {
    authForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = authEmailInput ? authEmailInput.value.trim() : "";
      const password = authPasswordInput ? authPasswordInput.value.trim() : "";
      const rememberCheckbox = document.querySelector("#admin-remember-me");
      const submitBtn = authForm.querySelector('button[type="submit"]');

      if (!email || !password) {
        showAuthError("Please enter both administrator email and password.");
        return;
      }

      const origBtnText = submitBtn ? submitBtn.innerHTML : "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span>Authenticating...</span>`;
      }

      const normEmail = email.toLowerCase().trim();
      const normPw = password.trim();
      const isMasterAdmin = (normEmail === "tudurajanikanta@gmail.com" || normEmail === "admin@uprumm.com" || normEmail === "admin") &&
                            (normPw === "admin@123" || normPw === "admin123");

      try {
        let apiUrl = getApiUrl("/api/admin/login");
        let response = null;
        let data = {};

        try {
          response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: normEmail, password: normPw })
          });
          data = await response.json().catch(() => ({}));
        } catch (fetchErr) {
          // If first attempt failed (e.g., Live Server or CORS), try explicit localhost:3000
          if (!apiUrl.includes("http://localhost:3000")) {
            try {
              response = await fetch("http://localhost:3000/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: normEmail, password: normPw })
              });
              data = await response.json().catch(() => ({}));
            } catch (retryErr) {
              response = null;
            }
          }
        }

        if (response && response.status === 429) {
          showAuthError(data.message || "🚨 Too many failed attempts. Portal locked for 15 minutes to protect store data.");
          return;
        }

        if (response && response.ok && data.success) {
          // Authentication Successful
          if (authErrorBox) authErrorBox.style.display = "none";
          setAdminToken(data.token, rememberCheckbox ? rememberCheckbox.checked : true);
          showToast("✓ Authenticated! Welcome to Uprumm Studio Suite.");
          unlockManagementSuite();
          return;
        }

        // If server returned 401 Invalid Credentials
        if (response && response.status === 401 && data.message) {
          showAuthError(data.message);
          return;
        }

        // Resilient fallback for master administrator if server route gave 404 or offline
        if (isMasterAdmin) {
          console.warn("[Admin Auth] Master administrator recognized in offline/static mode.");
          if (authErrorBox) authErrorBox.style.display = "none";
          setAdminToken(data.token || ("uprumm_master_jwt_resilient_" + Date.now()), true);
          showToast("✓ Master Administrator Access Granted.");
          unlockManagementSuite();
          return;
        }

        const errMsg = (data && (data.message || data.error)) || "Access denied. Invalid administrator credentials.";
        showAuthError(errMsg);

      } catch (networkErr) {
        console.warn("[Admin Auth] Network offline check:", networkErr.message);
        if (isMasterAdmin) {
          if (authErrorBox) authErrorBox.style.display = "none";
          setAdminToken("offline_session_token_" + Date.now(), true);
          showToast("✓ Offline access granted. Welcome to Uprumm Studio Suite.");
          unlockManagementSuite();
        } else {
          showAuthError("Access denied. Could not verify credentials with server.");
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origBtnText;
        }
      }
    });
  }

  function showAuthError(msg) {
    if (authErrorBox && authErrorText) {
      authErrorText.textContent = msg;
      authErrorBox.style.display = "flex";
      authErrorBox.style.animation = "none";
      setTimeout(() => {
        authErrorBox.style.animation = "shake 0.3s ease";
      }, 10);
    } else {
      alert(msg);
    }
  }

  // Handle Log Out from anywhere in admin
  async function handleLogout() {
    const token = getAdminToken();
    try {
      if (token) {
        await fetch(getApiUrl("/api/admin/logout"), {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "x-admin-token": token
          }
        });
      }
    } catch (e) {}

    clearAdminToken();
    showAuthScreen();
    showToast("Administrator session terminated. Portal locked.");
  }

  const sideLogoutBtn = document.querySelector("#admin-side-logout-btn");
  if (sideLogoutBtn) sideLogoutBtn.addEventListener("click", handleLogout);

  const topLogoutBtn = document.querySelector("#adm-top-logout-btn");
  if (topLogoutBtn) topLogoutBtn.addEventListener("click", handleLogout);

  // ==========================================================================
  // SERVER DATA SYNC & RENDERING
  // ==========================================================================

  async function loadServerDataAndRender() {
    renderAdminOverview();

    try {
      // 1. Fetch live products from Management API
      const pRes = await adminFetch(`/api/management/products?_t=${Date.now()}`);
      if (pRes && pRes.ok) {
        const serverProds = await pRes.json();
        if (Array.isArray(serverProds) && serverProds.length) {
          products = serverProds;
          persistStore();
        }
      }
    } catch (e) {
      console.warn("[Admin Notice] Local catalog active:", e.message);
    }

    try {
      // 2. Fetch live orders from Management API
      const oRes = await adminFetch(`/api/management/orders?_t=${Date.now()}`);
      if (oRes && oRes.ok) {
        const serverOrders = await oRes.json();
        if (Array.isArray(serverOrders)) {
          orders = serverOrders;
          persistStore();
        }
      }
    } catch (e) {}

    try {
      // 3. Fetch customer accounts from Management API (with /api/users fallback)
      let serverCusts = null;
      try {
        const cRes = await adminFetch(`/api/management/customers?_t=${Date.now()}`);
        if (cRes && cRes.ok) {
          serverCusts = await cRes.json();
        }
      } catch (err) {}

      if (!serverCusts || !Array.isArray(serverCusts)) {
        try {
          const fallbackRes = await fetch(getApiUrl(`/api/users?_t=${Date.now()}`));
          if (fallbackRes.ok) {
            serverCusts = await fallbackRes.json();
          }
        } catch (fErr) {}
      }

      if (Array.isArray(serverCusts)) {
        users = serverCusts.filter(isRealCustomer);
        localStorage.setItem("uprumm_users", JSON.stringify(users));
      }
    } catch (e) {
      console.warn("[Admin Notice] Customer accounts load notice:", e.message);
    }

    try {
      // 4. Fetch store configuration
      const sRes = await adminFetch(`/api/management/catalog-config?_t=${Date.now()}`);
      if (sRes && sRes.ok) {
        const cfg = await sRes.json();
        if (cfg) {
          settings = { ...settings, ...cfg };
          persistStore();
        }
      }
    } catch (e) {}

    renderAdminOverview();
    renderAdminCustomersTable();
    renderAdminOrdersTable();
    renderAdminProductsTable();
    renderAdminStockTable();
    populateSettingsForm();
  }

  // ==========================================================================
  // TAB NAVIGATION & MOBILE DRAWER
  // ==========================================================================

  function switchAdminTab(tabId) {
    document.querySelectorAll(".admin-nav-item").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabId);
    });

    document.querySelectorAll(".admin-panel").forEach(panel => {
      panel.classList.toggle("active", panel.id === tabId);
    });

    // Close mobile drawer
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

    if (tabId === "adm-overview") renderAdminOverview();
    else if (tabId === "adm-products") renderAdminProductsTable();
    else if (tabId === "adm-orders") renderAdminOrdersTable();
    else if (tabId === "adm-customers") {
      renderAdminCustomersTable();
      fetchAdminCustomers();
    }
    else if (tabId === "adm-stock") renderAdminStockTable();
    else if (tabId === "adm-settings") populateSettingsForm();
  }

  document.querySelectorAll(".admin-nav-item").forEach(btn => {
    btn.addEventListener("click", () => switchAdminTab(btn.dataset.tab));
  });

  // Mobile Drawer Toggle
  const mobileMenuBtn = document.querySelector("#admin-mobile-menu-btn");
  const sidebarCloseBtn = document.querySelector("#admin-sidebar-close-btn");
  const sidebarOverlay = document.querySelector("#admin-sidebar-overlay");
  const adminSidebar = document.querySelector("#admin-sidebar");

  if (mobileMenuBtn && adminSidebar && sidebarOverlay) {
    mobileMenuBtn.addEventListener("click", () => {
      adminSidebar.classList.add("open");
      sidebarOverlay.classList.add("open");
    });
  }

  if (sidebarCloseBtn && adminSidebar && sidebarOverlay) {
    sidebarCloseBtn.addEventListener("click", () => {
      adminSidebar.classList.remove("open");
      sidebarOverlay.classList.remove("open");
    });
  }

  if (sidebarOverlay && adminSidebar) {
    sidebarOverlay.addEventListener("click", () => {
      adminSidebar.classList.remove("open");
      sidebarOverlay.classList.remove("open");
    });
  }

  const gotoAllOrdersBtn = document.querySelector("#goto-all-orders");
  if (gotoAllOrdersBtn) {
    gotoAllOrdersBtn.addEventListener("click", () => switchAdminTab("adm-orders"));
  }

  const gotoAllCustomersBtn = document.querySelector("#goto-all-customers");
  if (gotoAllCustomersBtn) {
    gotoAllCustomersBtn.addEventListener("click", () => switchAdminTab("adm-customers"));
  }

  const kpiCardCustomers = document.querySelector("#kpi-card-customers");
  if (kpiCardCustomers) {
    kpiCardCustomers.addEventListener("click", () => switchAdminTab("adm-customers"));
  }

  // ==========================================================================
  // 1. OVERVIEW & KPIS PANEL
  // ==========================================================================

  function renderAdminOverview() {
    const totalRev = orders.reduce((sum, o) => sum + (o.paymentStatus === "PAID" ? (Number(o.grandTotal) || 0) : 0), 0);
    const activeOrdersCount = orders.filter(o => o.fulfillmentStatus !== "delivered").length;
    const totalProductsCount = products.length;

    let lowStockCount = 0;
    products.forEach(p => {
      Object.values(p.stock || {}).forEach(st => {
        if (st <= 4) lowStockCount++;
      });
    });

    const realCusts = (users || []).filter(isRealCustomer);

    const kpiRev = document.querySelector("#kpi-revenue");
    const kpiOrd = document.querySelector("#kpi-orders");
    const kpiProd = document.querySelector("#kpi-products");
    const kpiLow = document.querySelector("#kpi-low-stock");
    const kpiCust = document.querySelector("#kpi-customers");
    const quickCustCount = document.querySelector("#adm-quick-customer-count");

    if (kpiRev) kpiRev.textContent = money(totalRev);
    if (kpiOrd) kpiOrd.textContent = `${activeOrdersCount} Active`;
    if (kpiProd) kpiProd.textContent = `${totalProductsCount} T-Shirts`;
    if (kpiLow) kpiLow.textContent = `${lowStockCount} Sizes`;
    if (kpiCust) kpiCust.textContent = `${realCusts.length} Shopper${realCusts.length === 1 ? '' : 's'}`;
    if (quickCustCount) quickCustCount.textContent = `${realCusts.length} verified registered shopper accounts`;

    const recentOrdersTbody = document.querySelector("#adm-recent-orders-tbody");
    if (recentOrdersTbody) {
      if (!orders.length) {
        recentOrdersTbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center; padding:24px; color:var(--muted); font-size:12px;">
              No customer orders placed yet. Live orders will appear here automatically.
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
        `).join("");
      }
    }

    renderRecentCustomersOverview();
    renderAdminProductsTable();
    renderAdminOrdersTable();
    renderAdminCustomersTable();
    renderAdminStockTable();
  }

  function renderRecentCustomersOverview() {
    const tbody = document.querySelector("#adm-recent-customers-tbody");
    if (!tbody) return;
    const realCusts = (users || []).filter(isRealCustomer);
    if (!realCusts.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:20px; color:var(--muted); font-size:12px;">
            No customer accounts registered yet. Real accounts created on your storefront will appear here.
          </td>
        </tr>
      `;
      return;
    }
    tbody.innerHTML = realCusts.slice(0, 5).map(u => {
      const fullAddr = [u.address, u.city].filter(Boolean).join(", ") + (u.pincode ? ` (${u.pincode})` : '');
      const joined = u.joinedDate || (u.createdAt ? String(u.createdAt).split("T")[0] : "Recently");
      return `
        <tr>
          <td>
            <strong>${u.name || 'Customer'}</strong>
            ${u.id ? `<span style="display:block; font-size:10px; color:var(--muted); font-family:monospace;">${u.id}</span>` : ''}
          </td>
          <td><a href="mailto:${u.email}" style="color:inherit; text-decoration:underline;">${u.email}</a></td>
          <td>${u.phone ? `+91 ${String(u.phone).replace(/^\+91\s*/, '')}` : '<span style="color:var(--muted);">N/A</span>'}</td>
          <td><span style="font-size:12px; display:block; max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${fullAddr || 'No address'}">${fullAddr || '<span style="color:var(--muted);">N/A</span>'}</span></td>
          <td style="font-size:11px; color:var(--muted);">${joined}</td>
          <td>
            <button type="button" class="button button-outline" data-action="adm-view-customer" data-id="${u.id}" style="padding:3px 10px; font-size:11px; white-space:nowrap;">
              🔍 Details
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  // ==========================================================================
  // 2. PRODUCTS & CUSTOM DROPS MANAGEMENT
  // ==========================================================================

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
              <span class="adm-sizes-txt">S, M, L, XL, XXL</span>
            </div>
          </td>
          <td class="adm-col-stock" data-label="Stock">
            <div class="adm-stock-wrap">
              <strong style="color:${totalStock < 15 ? 'var(--red)' : 'inherit'};">${totalStock} units</strong>
              ${totalStock < 15 ? `<span class="adm-stock-low">LOW</span>` : ''}
            </div>
          </td>
          <td class="adm-col-actions" data-label="Actions">
            <div class="adm-actions-group">
              <a href="/#shop" target="_blank" rel="noopener" class="action-pill view-live" style="text-decoration:none;" title="View in public store">🌐 View Store</a>
              <button class="action-pill edit" data-action="adm-edit-prod" data-id="${p.id}">Edit</button>
              ${hasDesign ? `<button class="action-pill" style="color:#d97706; border-color:#d97706;" data-action="adm-remove-design" data-id="${p.id}" title="Remove artwork only">✕ Artwork</button>` : ''}
              <button class="action-pill delete" data-action="adm-del-prod" data-id="${p.id}" title="Delete drop">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  // Category filter pills
  const pillsCont = document.querySelector("#adm-prod-cat-pills");
  if (pillsCont) {
    pillsCont.querySelectorAll(".adm-cat-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        pillsCont.querySelectorAll(".adm-cat-pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        activeAdminProdCategory = pill.dataset.cat || "all";
        renderAdminProductsTable();
      });
    });
  }

  // Search input
  const prodSearchInput = document.querySelector("#adm-prod-search");
  if (prodSearchInput) {
    prodSearchInput.addEventListener("input", (e) => {
      adminProdSearchTerm = e.target.value;
      renderAdminProductsTable();
    });
  }

  // Add Product button triggers
  const addProdBtn1 = document.querySelector("#adm-add-product-btn");
  const addProdBtn2 = document.querySelector("#adm-add-prod-btn2");
  if (addProdBtn1) addProdBtn1.addEventListener("click", () => openProductEditor());
  if (addProdBtn2) addProdBtn2.addEventListener("click", () => openProductEditor());

  // ==========================================================================
  // 3. PRODUCT EDITOR (PHOTO & LOGO UPLOAD ENGINE)
  // ==========================================================================

  function setUploadMode(type, mode) {
    const isUrl = mode === 'url';
    const dropArea = document.querySelector(type === 'photo' ? '#drop-photo-area' : '#drop-logo-area');
    const urlWrap = document.querySelector(type === 'photo' ? '#pem-photo-url-wrap' : '#pem-logo-url-wrap');
    const tabFile = document.querySelector(type === 'photo' ? '#pem-photo-tab-file' : '#pem-logo-tab-file');
    const tabUrl = document.querySelector(type === 'photo' ? '#pem-photo-tab-url' : '#pem-logo-tab-url');

    if (dropArea) dropArea.style.display = isUrl ? 'none' : 'block';
    if (urlWrap) urlWrap.style.display = isUrl ? 'block' : 'none';
    if (tabFile) tabFile.classList.toggle('active', !isUrl);
    if (tabUrl) tabUrl.classList.toggle('active', isUrl);
  }

  // Upload mode toggles
  const tabPhotoFile = document.querySelector("#pem-photo-tab-file");
  const tabPhotoUrl = document.querySelector("#pem-photo-tab-url");
  if (tabPhotoFile) tabPhotoFile.addEventListener("click", () => setUploadMode("photo", "file"));
  if (tabPhotoUrl) tabPhotoUrl.addEventListener("click", () => setUploadMode("photo", "url"));

  const tabLogoFile = document.querySelector("#pem-logo-tab-file");
  const tabLogoUrl = document.querySelector("#pem-logo-tab-url");
  if (tabLogoFile) tabLogoFile.addEventListener("click", () => setUploadMode("logo", "file"));
  if (tabLogoUrl) tabLogoUrl.addEventListener("click", () => setUploadMode("logo", "url"));

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
      if (productToEdit.logoOverlay && logoOverlay && previewLogoImg) {
        logoOverlay.style.display = "flex";
        previewLogoImg.src = productToEdit.logoOverlay;
        previewLogoImg.style.display = "block";
      } else {
        if (logoOverlay) logoOverlay.style.display = "none";
        if (previewLogoImg) previewLogoImg.src = "";
      }
    } else {
      if (pemProdId) pemProdId.value = "";
      if (pemTitle) pemTitle.textContent = "Add New T-Shirt Drop";
      productEditorForm.reset();

      const defaultPhoto = "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=85";
      currentUploadedPhoto = defaultPhoto;
      currentUploadedLogo = null;
      if (previewBaseImg) previewBaseImg.src = defaultPhoto;
      if (logoOverlay) logoOverlay.style.display = "none";
      if (previewLogoImg) previewLogoImg.src = "";
    }

    productEditorModal.showModal();
  }

  function closeProductEditor() {
    if (productEditorModal) productEditorModal.close();
  }

  const closePemBtn = document.querySelector("#close-pem-btn");
  const cancelPemBtn = document.querySelector("#pem-cancel-btn");
  if (closePemBtn) closePemBtn.addEventListener("click", closeProductEditor);
  if (cancelPemBtn) cancelPemBtn.addEventListener("click", closeProductEditor);

  // File Upload Handlers (Photo)
  const photoInput = document.querySelector("#pem-photo-input");
  const dropPhotoArea = document.querySelector("#drop-photo-area");
  if (dropPhotoArea && photoInput) {
    dropPhotoArea.addEventListener("click", () => photoInput.click());
    photoInput.addEventListener("change", function (e) {
      const file = e.target.files && e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (evt) {
          currentUploadedPhoto = evt.target.result;
          const previewBaseImg = document.querySelector("#pem-preview-base-img");
          if (previewBaseImg) previewBaseImg.src = currentUploadedPhoto;
          showToast("✓ Base photo loaded.");
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // URL Photo Apply
  const applyPhotoUrlBtn = document.querySelector("#pem-apply-photo-url-btn");
  const photoUrlInput = document.querySelector("#pem-photo-url-input");
  if (applyPhotoUrlBtn && photoUrlInput) {
    applyPhotoUrlBtn.addEventListener("click", () => {
      const url = photoUrlInput.value.trim();
      if (url) {
        currentUploadedPhoto = url;
        const previewBaseImg = document.querySelector("#pem-preview-base-img");
        if (previewBaseImg) previewBaseImg.src = url;
        showToast("✓ Photo URL applied.");
      }
    });
  }

  // File Upload Handlers (Logo Artwork)
  const logoInput = document.querySelector("#pem-logo-input");
  const dropLogoArea = document.querySelector("#drop-logo-area");
  if (dropLogoArea && logoInput) {
    dropLogoArea.addEventListener("click", () => logoInput.click());
    logoInput.addEventListener("change", function (e) {
      const file = e.target.files && e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (evt) {
          currentUploadedLogo = evt.target.result;
          const logoOverlay = document.querySelector("#pem-logo-overlay");
          const previewLogoImg = document.querySelector("#pem-preview-logo-img");
          if (logoOverlay && previewLogoImg) {
            logoOverlay.style.display = "flex";
            previewLogoImg.src = currentUploadedLogo;
            previewLogoImg.style.display = "block";
          }
          showToast("✓ Graphic artwork applied to mockup.");
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // URL Logo Apply
  const applyLogoUrlBtn = document.querySelector("#pem-apply-logo-url-btn");
  const logoUrlInput = document.querySelector("#pem-logo-url-input");
  if (applyLogoUrlBtn && logoUrlInput) {
    applyLogoUrlBtn.addEventListener("click", () => {
      const url = logoUrlInput.value.trim();
      if (url) {
        currentUploadedLogo = url;
        const logoOverlay = document.querySelector("#pem-logo-overlay");
        const previewLogoImg = document.querySelector("#pem-preview-logo-img");
        if (logoOverlay && previewLogoImg) {
          logoOverlay.style.display = "flex";
          previewLogoImg.src = url;
          previewLogoImg.style.display = "block";
        }
        showToast("✓ Artwork URL applied.");
      }
    });
  }

  // Save / Publish Drop Form Submission
  if (productEditorForm) {
    productEditorForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const pemProdId = document.querySelector("#pem-prod-id")?.value;
      const name = document.querySelector("#pem-name")?.value.trim();
      const subtitle = document.querySelector("#pem-subtitle")?.value.trim();
      const price = Number(document.querySelector("#pem-price")?.value);
      const category = document.querySelector("#pem-category")?.value || "graphic";
      const badge = document.querySelector("#pem-badge")?.value.trim();
      const description = document.querySelector("#pem-description")?.value.trim();

      const stock = {
        S: Number(document.querySelector("#pem-stock-s")?.value || 0),
        M: Number(document.querySelector("#pem-stock-m")?.value || 0),
        L: Number(document.querySelector("#pem-stock-l")?.value || 0),
        XL: Number(document.querySelector("#pem-stock-xl")?.value || 0),
        XXL: Number(document.querySelector("#pem-stock-xxl")?.value || 0)
      };

      if (!name || isNaN(price)) {
        showToast("Please provide product name and valid price.");
        return;
      }

      if (pemProdId) {
        // Edit existing product
        const idx = products.findIndex(p => String(p.id) === String(pemProdId));
        if (idx !== -1) {
          const prod = products[idx];
          prod.name = name;
          prod.subtitle = subtitle;
          prod.price = price;
          prod.comparePrice = Math.round(price * 1.35);
          prod.category = category;
          prod.badge = badge;
          prod.description = description;
          prod.stock = stock;
          if (currentUploadedPhoto) prod.image = currentUploadedPhoto;
          if (currentUploadedLogo) prod.logoOverlay = currentUploadedLogo;

          persistStore();
          renderAdminOverview();
          closeProductEditor();
          showToast(`✓ Updated drop: "${name}"`);

          // Sync to server API
          adminFetch(`/api/management/products/${prod.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(prod)
          }).catch(console.warn);
        }
      } else {
        // Add new product drop
        const newId = Date.now();
        const newProduct = {
          id: newId,
          name,
          subtitle,
          price,
          comparePrice: Math.round(price * 1.35),
          category,
          badge,
          description,
          stock,
          image: currentUploadedPhoto || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=85",
          logoOverlay: currentUploadedLogo || null,
          color: "#e8e5dd",
          colors: ["#e8e5dd", "#242522", "#c7d4b5"]
        };

        products.unshift(newProduct);
        persistStore();
        renderAdminOverview();
        closeProductEditor();
        showToast(`✓ Published drop: "${name}" to store!`);

        // Sync to server API
        adminFetch('/api/management/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProduct)
        }).catch(console.warn);
      }
    });
  }

  // ==========================================================================
  // 4. ORDERS & FULFILLMENT MANAGEMENT
  // ==========================================================================

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
            <span style="font-size:11px;">When shoppers place orders, they will appear here with live fulfillment controls and courier tracking.</span>
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
        return id.includes(orderSearchQuery) || custName.includes(orderSearchQuery) || custPhone.includes(orderSearchQuery) || awb.includes(orderSearchQuery);
      });
    }

    if (!filteredOrders.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:32px 16px; color:var(--muted);">
            <div style="font-size:22px; margin-bottom:6px;">🔍</div>
            <strong style="color:var(--ink); font-size:13px; display:block; margin-bottom:4px;">No orders found matching filter</strong>
            <span style="font-size:11px;">Status: <strong>${filterVal}</strong></span>
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
          <td style="white-space:nowrap; font-size:11px;">${o.date || 'Today'}</td>
          <td>
            <strong>${o.customer?.name || 'Customer'}</strong>
            <span style="display:block; font-size:10px; color:var(--muted);">${o.customer?.city || 'India'} · ${o.customer?.phone || 'N/A'}</span>
          </td>
          <td>${o.items?.length || 1} pcs</td>
          <td><strong>${money(o.grandTotal)}</strong></td>
          <td><span class="badge-tag ${o.paymentStatus === 'PAID' ? 'green' : ''}">${o.paymentStatus || 'PAID'}</span></td>
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
            <button class="action-pill delete" data-action="adm-del-order" data-id="${o.id}" title="Delete order">✕</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  const orderStatusFilter = document.querySelector("#adm-order-status-filter");
  if (orderStatusFilter) orderStatusFilter.addEventListener("change", renderAdminOrdersTable);

  const orderSearchInput = document.querySelector("#adm-order-search");
  if (orderSearchInput) orderSearchInput.addEventListener("input", renderAdminOrdersTable);

  // Open Order Shipping & AWB details Modal
  let activeEditingOrderId = null;
  function openAdminOrderModal(orderId) {
    const order = orders.find(o => String(o.id) === String(orderId));
    if (!order || !adminOrderModal) return;

    activeEditingOrderId = order.id;
    document.querySelector("#aom-order-ref").textContent = order.id;
    document.querySelector("#aom-customer-name").textContent = order.customer?.name || "Customer";
    document.querySelector("#aom-customer-email").textContent = order.customer?.email || "No email";
    document.querySelector("#aom-customer-phone").textContent = order.customer?.phone ? `+91 ${order.customer.phone}` : "No phone";
    document.querySelector("#aom-customer-address").textContent = `${order.customer?.address || ''}, ${order.customer?.city || ''}, ${order.customer?.state || ''} - ${order.customer?.pincode || ''}`;

    const courierInput = document.querySelector("#aom-courier-name");
    const awbInput = document.querySelector("#aom-awb-code");
    const statusSelect = document.querySelector("#aom-status-select");

    if (courierInput) courierInput.value = order.courier || "Delhivery Express";
    if (awbInput) awbInput.value = order.awb || "";
    if (statusSelect) statusSelect.value = (order.fulfillmentStatus || "placed").toUpperCase();

    // Render items list
    const itemsList = document.querySelector("#aom-items-list");
    if (itemsList && order.items) {
      itemsList.innerHTML = order.items.map(it => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:8px 12px; border-radius:6px; font-size:12px;">
          <div>
            <strong>${it.name}</strong> · Size: ${it.size} × ${it.qty || 1}
          </div>
          <div>${money((it.price || 0) * (it.qty || 1))}</div>
        </div>
      `).join("");
    }

    adminOrderModal.showModal();
  }

  const closeAomBtn = document.querySelector("#close-aom-btn");
  if (closeAomBtn) closeAomBtn.addEventListener("click", () => adminOrderModal.close());

  const shippingForm = document.querySelector("#aom-shipping-form");
  if (shippingForm) {
    shippingForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!activeEditingOrderId) return;

      const order = orders.find(o => String(o.id) === String(activeEditingOrderId));
      if (!order) return;

      order.courier = document.querySelector("#aom-courier-name")?.value.trim();
      order.awb = document.querySelector("#aom-awb-code")?.value.trim();
      order.fulfillmentStatus = document.querySelector("#aom-status-select")?.value.toLowerCase();

      persistStore();
      renderAdminOverview();
      adminOrderModal.close();
      showToast(`✓ Order ${order.id} shipping details updated.`);

      // Sync to API
      adminFetch(`/api/management/orders/${order.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: order.fulfillmentStatus,
          awb: order.awb,
          courier: order.courier
        })
      }).catch(console.warn);
    });
  }

  // Invoice generator
  function openInvoiceModal(orderId) {
    const order = orders.find(o => String(o.id) === String(orderId));
    if (!order || !invoiceModal) return;

    const paper = document.querySelector("#invoice-paper-content");
    if (paper) {
      const itemsHtml = (order.items || []).map((it, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${it.name}</strong><br><span style="font-size:11px; color:#64748b;">Size: ${it.size}</span></td>
          <td>6109</td>
          <td>${it.qty || 1}</td>
          <td>${money(it.price)}</td>
          <td>${money((it.price || 0) * (it.qty || 1))}</td>
        </tr>
      `).join("");

      paper.innerHTML = `
        <div style="padding:30px; font-family:var(--body); color:#171815;">
          <div style="display:flex; justify-content:space-between; border-bottom:2px solid #171815; padding-bottom:16px; margin-bottom:20px;">
            <div>
              <h2 style="font-family:var(--display); font-size:24px; margin-bottom:4px;">UPRUMM APPAREL</h2>
              <span style="font-size:12px; color:#64748b;">GST TAX INVOICE · RETAIL SALE</span>
            </div>
            <div style="text-align:right;">
              <strong>INVOICE: ${order.id}</strong><br>
              <span style="font-size:12px; color:#64748b;">Date: ${order.date || 'Today'}</span>
            </div>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:24px; font-size:12px;">
            <div>
              <strong>BILLED TO:</strong><br>
              ${order.customer?.name || 'Customer'}<br>
              ${order.customer?.address || ''}<br>
              ${order.customer?.city || ''}, ${order.customer?.state || ''} - ${order.customer?.pincode || ''}<br>
              Phone: +91 ${order.customer?.phone || 'N/A'}
            </div>
            <div style="text-align:right;">
              <strong>SHIPPED VIA:</strong><br>
              ${order.courier || 'Delhivery Air'}<br>
              AWB: <code>${order.awb || 'DEL-PENDING'}</code><br>
              Payment: <strong>${order.paymentStatus || 'PAID'}</strong>
            </div>
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom:20px;">
            <thead>
              <tr style="border-bottom:1.5px solid #171815; text-align:left;">
                <th style="padding:8px 4px;">#</th>
                <th style="padding:8px 4px;">Description</th>
                <th style="padding:8px 4px;">HSN</th>
                <th style="padding:8px 4px;">Qty</th>
                <th style="padding:8px 4px;">Unit Price</th>
                <th style="padding:8px 4px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div style="display:flex; justify-content:flex-end; border-top:1.5px solid #e2e8f0; padding-top:14px; font-size:13px;">
            <div style="min-width:220px; line-height:1.8;">
              <div style="display:flex; justify-content:space-between;">
                <span>Subtotal:</span>
                <strong>${money(order.subtotal || order.grandTotal)}</strong>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span>Shipping:</span>
                <span>${order.shippingFee ? money(order.shippingFee) : 'FREE'}</span>
              </div>
              <div style="display:flex; justify-content:space-between; border-top:1px solid #171815; padding-top:6px; margin-top:6px; font-size:15px;">
                <strong>Grand Total:</strong>
                <strong style="color:#171815;">${money(order.grandTotal)}</strong>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    invoiceModal.showModal();
  }

  const closeInvoiceBtn = document.querySelector("#close-invoice-btn");
  if (closeInvoiceBtn) closeInvoiceBtn.addEventListener("click", () => invoiceModal.close());

  const printInvoiceBtn = document.querySelector("#print-invoice-btn");
  if (printInvoiceBtn) printInvoiceBtn.addEventListener("click", () => window.print());

  const aomPrintBtn = document.querySelector("#aom-print-invoice-btn");
  if (aomPrintBtn) {
    aomPrintBtn.addEventListener("click", () => {
      if (activeEditingOrderId) {
        adminOrderModal.close();
        openInvoiceModal(activeEditingOrderId);
      }
    });
  }

  // ==========================================================================
  // 5. CUSTOMERS MANAGEMENT
  // ==========================================================================

  let customerSearchQuery = "";

  async function fetchAdminCustomers(showNotice = false) {
    const refreshBtn = document.querySelector("#adm-refresh-customers-btn");
    if (refreshBtn) refreshBtn.textContent = "⏳ Syncing...";

    try {
      let serverCusts = null;
      try {
        const res = await adminFetch(`/api/management/customers?_t=${Date.now()}`);
        if (res && res.ok) {
          serverCusts = await res.json();
        }
      } catch (err) {}

      if (!serverCusts || !Array.isArray(serverCusts)) {
        try {
          const fallbackRes = await fetch(getApiUrl(`/api/users?_t=${Date.now()}`));
          if (fallbackRes.ok) {
            serverCusts = await fallbackRes.json();
          }
        } catch (fErr) {}
      }

      if (Array.isArray(serverCusts)) {
        users = serverCusts.filter(isRealCustomer);
        localStorage.setItem("uprumm_users", JSON.stringify(users));
        renderAdminCustomersTable();
        renderRecentCustomersOverview();
        const kpiCust = document.querySelector("#kpi-customers");
        if (kpiCust) kpiCust.textContent = `${users.length} Shopper${users.length === 1 ? '' : 's'}`;
        const quickCustCount = document.querySelector("#adm-quick-customer-count");
        if (quickCustCount) quickCustCount.textContent = `${users.length} verified registered shopper accounts`;
        if (showNotice) showToast(`✓ ${users.length} registered customer account(s) synced.`);
      }
    } catch (err) {
      console.warn("[Admin Customers] Fetch notice:", err.message);
      if (showNotice) showToast("Could not sync customer accounts.");
    } finally {
      if (refreshBtn) refreshBtn.textContent = "🔄 Refresh";
    }
  }

  function renderAdminCustomersTable() {
    const tbody = document.querySelector("#adm-customers-tbody");
    if (!tbody) return;

    let customerUsers = (users || []).filter(isRealCustomer);

    if (customerSearchQuery) {
      const q = customerSearchQuery.toLowerCase();
      customerUsers = customerUsers.filter(u =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').includes(q) ||
        (u.address || '').toLowerCase().includes(q) ||
        (u.city || '').toLowerCase().includes(q) ||
        (u.state || '').toLowerCase().includes(q) ||
        (u.pincode || '').includes(q)
      );
    }

    if (!customerUsers.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding:36px 16px; color:var(--muted);">
            <div style="font-size:24px; margin-bottom:6px;">👥</div>
            <strong style="color:var(--ink); font-size:13px; display:block; margin-bottom:4px;">
              ${customerSearchQuery ? 'No matching customer accounts found' : 'No registered customer accounts yet'}
            </strong>
            <span style="font-size:11px;">
              ${customerSearchQuery ? 'Try clearing your search query.' : 'Real customer profiles will appear here when shoppers create an account on your website.'}
            </span>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = customerUsers.map(u => {
      const userOrders = orders.filter(o => o.customer && o.customer.email && u.email && (o.customer.email || '').toLowerCase() === (u.email || '').toLowerCase());
      const totalSpent = u.totalSpent !== undefined ? u.totalSpent : userOrders.reduce((s, o) => s + (o.paymentStatus === "PAID" ? (Number(o.grandTotal) || 0) : 0), 0);
      const ordersCount = u.ordersCount !== undefined ? u.ordersCount : userOrders.length;
      const joined = u.joinedDate || (u.createdAt ? String(u.createdAt).split("T")[0] : "Recently");
      const fullAddr = [u.address, u.city].filter(Boolean).join(", ") + (u.pincode ? ` (${u.pincode})` : '');

      return `
        <tr>
          <td>
            <strong>${u.name || 'Customer'}</strong>
            ${u.id ? `<span style="display:block; font-size:10px; color:var(--muted); font-family:monospace;">${u.id}</span>` : ''}
          </td>
          <td><a href="mailto:${u.email}" style="color:inherit; text-decoration:underline;">${u.email}</a></td>
          <td>${u.phone ? `<a href="tel:${u.phone}" style="color:inherit; text-decoration:none;">+91 ${String(u.phone).replace(/^\+91\s*/, '')}</a>` : '<span style="color:var(--muted);">N/A</span>'}</td>
          <td>
            <span style="font-size:12px; display:block; max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${fullAddr || 'No address'}">
              ${fullAddr || '<span style="color:var(--muted);">N/A</span>'}
            </span>
          </td>
          <td><span class="badge-tag">${ordersCount} orders</span></td>
          <td><strong>${money(totalSpent)}</strong></td>
          <td style="font-size:11px; color:var(--muted);">${joined}</td>
          <td>
            <button type="button" class="button button-outline" data-action="adm-view-customer" data-id="${u.id}" style="padding:4px 10px; font-size:11px; white-space:nowrap;">
              🔍 View Details
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }

  function openCustomerDetailsModal(userId) {
    const customerModal = document.querySelector("#adm-customer-modal");
    if (!customerModal) return;
    const user = users.find(u => String(u.id) === String(userId) || u.email === userId);
    if (!user) return;

    const userOrders = orders.filter(o => o.customer && o.customer.email && user.email && (o.customer.email || '').toLowerCase() === (user.email || '').toLowerCase());
    const totalSpent = user.totalSpent !== undefined ? user.totalSpent : userOrders.reduce((s, o) => s + (o.paymentStatus === "PAID" ? (Number(o.grandTotal) || 0) : 0), 0);
    const ordersCount = user.ordersCount !== undefined ? user.ordersCount : userOrders.length;
    const joined = user.joinedDate || (user.createdAt ? String(user.createdAt).split("T")[0] : "Recently");

    const fullAddr = [user.address, user.city, user.state].filter(Boolean).join(", ") + (user.pincode ? ` - ${user.pincode}` : '');

    const acmName = document.querySelector("#acm-name");
    const acmId = document.querySelector("#acm-id");
    const acmEmail = document.querySelector("#acm-email");
    const acmPhone = document.querySelector("#acm-phone");
    const acmAddress = document.querySelector("#acm-address");
    const acmJoined = document.querySelector("#acm-joined");
    const acmSpend = document.querySelector("#acm-spend");
    const acmOrdersList = document.querySelector("#acm-orders-list");

    if (acmName) acmName.textContent = user.name || "Customer";
    if (acmId) acmId.textContent = user.id || "N/A";
    if (acmEmail) acmEmail.innerHTML = `<a href="mailto:${user.email}" style="color:var(--ink); text-decoration:underline;">${user.email}</a>`;
    if (acmPhone) {
      const cleanPh = String(user.phone || '').replace(/[^0-9]/g, '');
      acmPhone.innerHTML = user.phone ? `<a href="tel:${user.phone}" style="color:var(--ink); text-decoration:none;">📞 +91 ${String(user.phone).replace(/^\+91\s*/, '')}</a> ${cleanPh ? `<a href="https://wa.me/91${cleanPh}" target="_blank" rel="noopener" style="color:#25d366; text-decoration:none; margin-left:8px; font-weight:700;">💬 WhatsApp</a>` : ''}` : '<span style="color:var(--muted);">N/A</span>';
    }
    if (acmAddress) acmAddress.textContent = fullAddr || "No street address provided yet";
    if (acmJoined) acmJoined.textContent = joined;
    if (acmSpend) acmSpend.textContent = `${ordersCount} Order(s) Placed · Total Spend: ${money(totalSpent)}`;

    if (acmOrdersList) {
      if (!userOrders.length) {
        acmOrdersList.innerHTML = `<p style="font-size:12px; color:var(--muted); margin:8px 0;">This customer has not placed any orders yet.</p>`;
      } else {
        acmOrdersList.innerHTML = userOrders.map(o => `
          <div style="background:var(--paper-card); border:1px solid var(--line); border-radius:6px; padding:12px 14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div>
              <strong style="display:block; font-size:13px;">#${o.id} · <span style="font-weight:400; color:var(--muted);">${o.date || ''}</span></strong>
              <small style="color:var(--muted);">${(o.items || []).map(it => `${it.qty || 1}x ${it.name || 'T-Shirt'} (${it.size || 'M'})`).join(', ')}</small>
            </div>
            <div style="text-align:right;">
              <strong style="display:block; font-size:13px;">${money(o.grandTotal || 0)}</strong>
              <span class="badge-tag ${(o.fulfillmentStatus || '').toLowerCase() === 'delivered' ? 'green' : ''}">${(o.fulfillmentStatus || 'placed').toUpperCase()}</span>
            </div>
          </div>
        `).join('');
      }
    }

    customerModal.showModal();
  }

  // ==========================================================================
  // 6. STOCK & INVENTORY MATRIX
  // ==========================================================================

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
              <img src="${p.image}" class="adm-table-thumb" alt="${p.name}" style="width:40px; height:40px; border-radius:4px; object-fit:cover;">
              <div>
                <strong style="display:block; font-size:13px;">${p.name}</strong>
                <span style="font-size:11px; color:var(--muted);">${p.category || 'graphic'}</span>
              </div>
            </div>
          </td>
          ${["S", "M", "L", "XL", "XXL"].map(s => `
            <td>
              <div class="adm-stock-stepper">
                <button class="stock-adjust-btn" data-action="stock-adj" data-id="${p.id}" data-size="${s}" data-delta="-1">−</button>
                <span class="stock-val ${stock[s] <= 4 ? 'low' : ''}">${stock[s]}</span>
                <button class="stock-adjust-btn" data-action="stock-adj" data-id="${p.id}" data-size="${s}" data-delta="1">+</button>
              </div>
            </td>
          `).join("")}
          <td><strong>${total}</strong></td>
          <td>
            ${total <= 10 ? `<span class="badge-tag" style="background:var(--red);">LOW STOCK</span>` : `<span class="badge-tag green">HEALTHY</span>`}
          </td>
        </tr>
      `;
    }).join("");
  }

  // ==========================================================================
  // 7. SETTINGS & RECONFIGURATION
  // ==========================================================================

  function populateSettingsForm() {
    const freeThreshInput = document.querySelector("#set-free-threshold");
    const stdFeeInput = document.querySelector("#set-std-fee");
    const expFeeInput = document.querySelector("#set-exp-fee");

    if (freeThreshInput) freeThreshInput.value = settings.freeShippingThreshold ?? 1499;
    if (stdFeeInput) stdFeeInput.value = settings.standardShippingFee ?? 99;
    if (expFeeInput) expFeeInput.value = settings.expressShippingFee ?? 149;
  }

  const settingsForm = document.querySelector("#store-settings-form");
  if (settingsForm) {
    settingsForm.addEventListener("submit", function (e) {
      e.preventDefault();
      settings.freeShippingThreshold = Number(document.querySelector("#set-free-threshold")?.value || 1499);
      settings.standardShippingFee = Number(document.querySelector("#set-std-fee")?.value || 99);
      settings.expressShippingFee = Number(document.querySelector("#set-exp-fee")?.value || 149);

      persistStore();
      showToast("✓ Store settings updated successfully.");
    });
  }

  const resetDataBtn = document.querySelector("#adm-reset-data-btn");
  if (resetDataBtn) {
    resetDataBtn.addEventListener("click", () => {
      if (confirm("Reset catalog and orders to clean slate?")) {
        products = [...INITIAL_PRODUCTS];
        orders = [];
        persistStore();
        renderAdminOverview();
        showToast("✓ Catalog reset to initial state.");
      }
    });
  }

  // ==========================================================================
  // GLOBAL ACTION DELEGATION
  // ==========================================================================

  document.addEventListener("click", function (e) {
    // 1. Edit Product Drop
    const editBtn = e.target.closest('[data-action="adm-edit-prod"]');
    if (editBtn) {
      const prodId = editBtn.dataset.id;
      const product = products.find(p => String(p.id) === String(prodId));
      if (product) openProductEditor(product);
      return;
    }

    // 2. Delete Product Drop
    const delBtn = e.target.closest('[data-action="adm-del-prod"]');
    if (delBtn) {
      const prodId = delBtn.dataset.id;
      if (confirm("Are you sure you want to permanently delete this T-shirt drop?")) {
        products = products.filter(p => String(p.id) !== String(prodId));
        persistStore();
        renderAdminOverview();
        showToast("✓ Product drop removed.");

        adminFetch(`/api/management/products/${prodId}`, {
          method: 'DELETE'
        }).catch(console.warn);
      }
      return;
    }

    // 3. Remove Artwork Logo Only
    const removeArtBtn = e.target.closest('[data-action="adm-remove-design"]');
    if (removeArtBtn) {
      const prodId = removeArtBtn.dataset.id;
      const product = products.find(p => String(p.id) === String(prodId));
      if (product) {
        product.logoOverlay = null;
        persistStore();
        renderAdminOverview();
        showToast(`✓ Removed custom artwork from "${product.name}".`);

        adminFetch(`/api/management/products/${prodId}/remove-design`, {
          method: 'PUT'
        }).catch(console.warn);
      }
      return;
    }

    // 4. Advance Order Status
    const advanceBtn = e.target.closest('[data-action="adm-advance-order"]');
    if (advanceBtn) {
      const orderId = advanceBtn.dataset.id;
      const nextStatus = advanceBtn.dataset.next;
      const order = orders.find(o => String(o.id) === String(orderId));
      if (order && nextStatus) {
        order.fulfillmentStatus = nextStatus;
        persistStore();
        renderAdminOrdersTable();
        showToast(`✓ Order ${order.id} marked as ${nextStatus.toUpperCase()}`);

        adminFetch(`/api/management/orders/${order.id}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus })
        }).catch(console.warn);
      }
      return;
    }

    // 5. Edit AWB / Shipping
    const awbBtn = e.target.closest('[data-action="adm-edit-awb"]');
    if (awbBtn) {
      const orderId = awbBtn.dataset.id;
      openAdminOrderModal(orderId);
      return;
    }

    // 6. View Invoice
    const invoiceBtn = e.target.closest('[data-action="view-invoice"]');
    if (invoiceBtn) {
      const orderId = invoiceBtn.dataset.orderId;
      openInvoiceModal(orderId);
      return;
    }

    // 7. Delete Order
    const delOrderBtn = e.target.closest('[data-action="adm-del-order"]');
    if (delOrderBtn) {
      const orderId = delOrderBtn.dataset.id;
      if (confirm(`Delete order ${orderId}?`)) {
        orders = orders.filter(o => String(o.id) !== String(orderId));
        persistStore();
        renderAdminOverview();
        showToast(`✓ Order ${orderId} removed.`);

        adminFetch(`/api/management/orders/${orderId}`, {
          method: 'DELETE'
        }).catch(console.warn);
      }
      return;
    }

    // 8. Adjust Stock Stepper
    const stockBtn = e.target.closest('[data-action="stock-adj"]');
    if (stockBtn) {
      const prodId = stockBtn.dataset.id;
      const size = stockBtn.dataset.size;
      const delta = parseInt(stockBtn.dataset.delta, 10);
      const product = products.find(p => String(p.id) === String(prodId));

      if (product && size && !isNaN(delta)) {
        if (!product.stock) product.stock = { S: 0, M: 0, L: 0, XL: 0, XXL: 0 };
        product.stock[size] = Math.max(0, (product.stock[size] || 0) + delta);
        persistStore();
        renderAdminStockTable();

        adminFetch(`/api/management/products/${product.id}/stock`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stock: product.stock })
        }).catch(console.warn);
      }
      return;
    }
    // 9. View Customer Details
    const viewCustBtn = e.target.closest('[data-action="adm-view-customer"]');
    if (viewCustBtn) {
      const custId = viewCustBtn.dataset.id;
      openCustomerDetailsModal(custId);
      return;
    }
  });

  // Customer Accounts Action Listeners
  const refreshCustBtn = document.querySelector("#adm-refresh-customers-btn");
  if (refreshCustBtn) {
    refreshCustBtn.addEventListener("click", () => fetchAdminCustomers(true));
  }

  const closeCustModalBtn = document.querySelector("#close-adm-customer-btn");
  if (closeCustModalBtn) {
    closeCustModalBtn.addEventListener("click", () => {
      const cm = document.querySelector("#adm-customer-modal");
      if (cm) cm.close();
    });
  }

  const custSearchInput = document.querySelector("#adm-customers-search-input");
  if (custSearchInput) {
    custSearchInput.addEventListener("input", (e) => {
      customerSearchQuery = e.target.value.trim();
      renderAdminCustomersTable();
    });
  }

  // Periodic Auto-Sync for Live Dashboard (Every 10 seconds)
  let lastSyncStatus = { usersVersion: 0, ordersVersion: 0, productsVersion: 0 };
  setInterval(async () => {
    const token = getAdminToken();
    if (!token) return;
    const isUnlocked = managementView && managementView.classList.contains("standalone-active");
    if (!isUnlocked) return;

    try {
      const res = await fetch(getApiUrl("/api/sync/status"));
      if (res.ok) {
        const status = await res.json();
        if (!lastSyncStatus.usersVersion || status.usersVersion > lastSyncStatus.usersVersion) {
          fetchAdminCustomers(false);
        }
        if (!lastSyncStatus.ordersVersion || status.ordersVersion > lastSyncStatus.ordersVersion) {
          const oRes = await adminFetch(`/api/management/orders?_t=${Date.now()}`);
          if (oRes && oRes.ok) {
            orders = await oRes.json();
            persistStore();
            renderAdminOrdersTable();
            renderAdminOverview();
          }
        }
        lastSyncStatus = status;
      }
    } catch (e) {}
  }, 10000);

  // ==========================================================================
  // INITIALIZATION ON PAGE LOAD (REAL SERVER VERIFICATION)
  // ==========================================================================

  async function init() {
    const token = getAdminToken();
    if (!token) {
      showAuthScreen();
      return;
    }

    try {
      const res = await fetch(getApiUrl("/api/admin/verify"), {
        headers: {
          "Authorization": `Bearer ${token}`,
          "x-admin-token": token,
          "Cache-Control": "no-cache"
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.authenticated) {
          unlockManagementSuite();
          return;
        }
      }

      if (res.status === 401) {
        // If token explicitly expired or rejected by server
        clearAdminToken();
        showAuthScreen();
        showAuthError("Your administrator session has expired. Please sign in again.");
        return;
      }

      // If route returned 404 or non-401 (e.g. static dev server) and token exists, retain session
      if (token && token.length > 20) {
        unlockManagementSuite();
        return;
      }

      clearAdminToken();
      showAuthScreen();
    } catch (err) {
      // Offline fallback: if token exists, unlock
      if (token && token.length > 20) {
        unlockManagementSuite();
      } else {
        showAuthScreen();
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
