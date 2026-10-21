import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Automatically load .env if present (for local development); on Render, environment variables are injected via dashboard
const localEnvPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(localEnvPath) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(localEnvPath);
  } catch (e) {}
}

import { connectDB, isDbConnected } from './db.js';
import { seedDatabaseIfEmpty, INITIAL_PRODUCTS } from './seed.js';
import Product from './models/Product.js';
import Order from './models/Order.js';
import User from './models/User.js';
import Setting from './models/Setting.js';
import managementRouter from './managementApi.js';
import { dynamicStore } from './dynamicStore.js';
import { bumpSyncVersion, getSyncStatus } from './syncState.js';
import {
  signAdminToken,
  verifyAdminToken,
  revokeAdminToken,
  checkLoginRateLimit,
  recordFailedLogin,
  recordSuccessfulLogin,
  validateAdminCredentials,
  extractToken,
  requireAdminAuth,
  sanitizeUser,
  hashCustomerPassword,
  getClientIp
} from './security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const rootDir = path.join(__dirname, '..');

app.use(express.json({ limit: '50mb' }));

// Production Security Headers (Hardening against XSS, clickjacking, MIME sniffing)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Ensure Vercel rewrites and parameter forwarding preserve original request paths for Express
app.use((req, res, next) => {
  try {
    const urlObj = new URL(req.url, 'http://localhost');
    const forwardedPath = urlObj.searchParams.get('__path');
    if (forwardedPath) {
      urlObj.searchParams.delete('__path');
      const remainingQuery = urlObj.search ? urlObj.search : '';
      req.url = forwardedPath + remainingQuery;
    } else {
      const matchedPath = req.headers['x-matched-path'] || req.headers['x-forwarded-url'] || req.originalUrl;
      if (matchedPath && matchedPath.startsWith('/api') && req.url !== matchedPath && !matchedPath.includes('/api/index.js')) {
        const qIndex = req.url.indexOf('?');
        const query = qIndex !== -1 ? req.url.slice(qIndex) : '';
        req.url = matchedPath + (matchedPath.includes('?') ? '' : query);
      }
    }
  } catch (e) {}
  next();
});

// CORS & No-Cache middleware (supports Live Server, Vercel, and prevents stale cache)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-admin-token');
  res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.static(rootDir));
app.use('/uploads', express.static(path.join(rootDir, 'uploads')));

// Connect to MongoDB Atlas (in local mode only)
if (!process.env.VERCEL) {
  connectDB().then(async connected => {
    if (connected) {
      await seedDatabaseIfEmpty();
    } else {
      console.log('⚡ Operating with dynamic in-memory catalog store.');
    }
  });
}

// ==========================================================================
// DEDICATED SEPARATE ADMIN SECTION PORTAL
// ==========================================================================
app.get(['/admin', '/admin/', '/admin.html'], (req, res) => {
  res.sendFile(path.join(rootDir, 'admin.html'));
});

// ==========================================================================
// ADMIN AUTHENTICATION, JWT SIGNING & RATE LIMITING APIS
// ==========================================================================

app.post('/api/admin/login', (req, res) => {
  const clientIp = getClientIp(req);
  const rateLimit = checkLoginRateLimit(clientIp);

  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: rateLimit.message,
      rateLimited: true
    });
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Administrator email and password are required.' });
  }

  const isValid = validateAdminCredentials(email, password);
  if (!isValid) {
    const failedCount = recordFailedLogin(clientIp);
    const remaining = Math.max(0, 5 - failedCount);
    return res.status(401).json({
      error: 'Invalid Credentials',
      message: remaining > 0
        ? `Access denied. ${remaining} attempt(s) remaining before security lockout.`
        : 'Access denied. Account locked due to repeated failed attempts.',
      attemptsRemaining: remaining
    });
  }

  recordSuccessfulLogin(clientIp);
  const token = signAdminToken({ email: email.toLowerCase().trim() });

  return res.json({
    success: true,
    token,
    admin: {
      email: email.toLowerCase().trim(),
      role: 'admin',
      name: 'Uprumm Master Administrator'
    },
    expiresIn: '24h'
  });
});

app.get('/api/admin/verify', (req, res) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ authenticated: false, error: 'Authorization token missing.' });
  }

  const payload = verifyAdminToken(token);
  if (!payload) {
    return res.status(401).json({ authenticated: false, error: 'Administrator session expired or invalid.' });
  }

  return res.json({
    authenticated: true,
    admin: payload
  });
});

app.post('/api/admin/logout', (req, res) => {
  const token = extractToken(req);
  if (token) {
    revokeAdminToken(token);
  }
  return res.json({ success: true, message: 'Administrator session revoked successfully.' });
});

// ==========================================================================
// MOUNT MANAGEMENT & ADMIN STUDIO APIS
// ==========================================================================
app.use(['/api/management', '/management', '/api/admin'], managementRouter);

// Real-Time Cross-Device Sync Status Endpoint (ultra-fast, cache-busting)
app.get(['/api/sync/status', '/sync/status', '/api/sync/version', '/sync/version'], async (req, res) => {
  res.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.header('Pragma', 'no-cache');
  const status = await getSyncStatus();
  res.json(status);
});

// ==========================================================================
// 1. CONFIGURATION & HEALTH ENDPOINTS (Render & Cloud Monitoring)
// ==========================================================================

app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'uprumm-backend',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    dbConnected: isDbConnected(),
    environment: process.env.NODE_ENV || 'production'
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    currency: 'INR',
    freeShippingThreshold: 1499,
    standardShippingFee: 99,
    expressShippingFee: 149,
    paymentMethod: 'Cash on Delivery (COD)',
    isDbConnected: isDbConnected()
  });
});

// ==========================================================================
// 2. PRODUCTS API (DYNAMIC CATALOG SYSTEM)
// ==========================================================================

app.get(['/api/products', '/products'], async (req, res) => {
  try {
    const products = await dynamicStore.getAllProducts();
    return res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get(['/api/products/:id', '/api/management/products/:id'], async (req, res) => {
  try {
    const rawId = req.params.id;
    const product = await dynamicStore.getProductById(rawId);
    if (!product) {
      return res.status(404).json({ error: `Product ${rawId} not found` });
    }
    return res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', requireAdminAuth, async (req, res) => {
  try {
    const productData = req.body;
    if (!productData.name) {
      return res.status(400).json({ error: 'Product name is required' });
    }
    const created = await dynamicStore.upsertProduct(productData);
    return res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', requireAdminAuth, async (req, res) => {
  try {
    const rawId = req.params.id;
    const updateData = { ...req.body };
    delete updateData._id;
    const updated = await dynamicStore.upsertProduct({ id: rawId, ...updateData });
    res.json(updated);
  } catch (err) {
    console.error('Product update error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', requireAdminAuth, async (req, res) => {
  try {
    const rawId = req.params.id;
    const result = await dynamicStore.deleteProduct(rawId);
    res.json({ success: true, message: `Product ${rawId} deleted`, deleted: result.deletedDoc });
  } catch (err) {
    console.error('Product delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Direct Image / Artwork Upload Endpoint (Local filesystem storage, Direct URL support + persistent dataUrl fallback)
app.post('/api/upload', async (req, res) => {
  try {
    const dataUrl = req.body.dataUrl || req.body.data;
    const name = req.body.name || req.body.filename;
    const directUrl = (req.body.url || req.body.imageUrl || (typeof dataUrl === 'string' && (dataUrl.startsWith('http://') || dataUrl.startsWith('https://') || dataUrl.startsWith('/uploads/') || dataUrl.startsWith('assets/')) ? dataUrl : null))?.trim();

    // 0. Direct URL submission (URL-based photo upload feature)
    if (directUrl) {
      console.log(`[Server Upload API] Registered web photo URL: ${directUrl}`);
      return res.json({
        success: true,
        url: directUrl,
        secure_url: directUrl,
        fileName: name || 'web-image.jpg',
        provider: 'url'
      });
    }

    if (!dataUrl) return res.status(400).json({ error: 'dataUrl or url is required' });

    // 1. On Vercel (read-only filesystem), return persistent base64 dataUrl directly
    if (process.env.VERCEL) {
      return res.json({ success: true, url: dataUrl, fileName: name || 'design.png', provider: 'dataUrl' });
    }

    // 2. Local filesystem storage (/uploads/*.png)
    const matches = dataUrl.match(/^data:([A-Za-z0-9\-+\/]+);base64,([\s\S]+)$/);
    if (!matches || matches.length < 3) {
      return res.json({ success: true, url: dataUrl, fileName: name || 'design.png', provider: 'dataUrl' });
    }

    const mimeType = matches[1].toLowerCase();
    const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowedMimes.includes(mimeType)) {
      return res.status(400).json({ error: 'Unsupported file type. Only PNG, JPG, WEBP, and SVG images are allowed.' });
    }

    const base64Data = matches[2];
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('svg') ? 'svg' : mimeType.includes('webp') ? 'webp' : 'jpg';
    const uploadsDir = path.join(rootDir, 'uploads');
    
    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const safeName = (name || 'design').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
      const fileName = `${safeName}_${Date.now()}.${ext}`;
      const filePath = path.join(uploadsDir, fileName);

      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      const url = `/uploads/${fileName}`;
      console.log(`[Server Upload API] Saved artwork locally: ${url}`);
      res.json({ success: true, url, secure_url: url, fileName, provider: 'local' });
    } catch (fsErr) {
      console.warn('[Server Upload API] Filesystem write notice:', fsErr.message);
      res.json({ success: true, url: dataUrl, secure_url: dataUrl, fileName: name || 'design.png', provider: 'dataUrl' });
    }
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Media Storage Status Endpoint
app.get('/api/media/status', (req, res) => {
  res.json({
    configured: true,
    provider: 'local-filesystem',
    storagePath: '/uploads'
  });
});

// ==========================================================================
// 3. ORDERS API (MONGODB / FALLBACK)
// ==========================================================================

app.get('/api/orders', async (req, res) => {
  try {
    if (isDbConnected()) {
      const dbOrders = await Order.find().sort({ createdAt: -1 }).lean();
      return res.json(dbOrders);
    }
  } catch (err) {
    console.warn('DB orders fetch fallback:', err.message);
  }
  res.json([]);
});

app.post('/api/orders', async (req, res) => {
  try {
    const orderData = req.body || {};
    if (orderData.items && Array.isArray(orderData.items)) {
      orderData.items = orderData.items.map(it => ({
        ...it,
        name: it.name || it.title || 'Uprumm Custom Tee',
        title: it.title || it.name || 'Uprumm Custom Tee'
      }));
    }

    // Auto-save customer profile from order into dynamicStore
    if (orderData.customer && orderData.customer.email) {
      try {
        await dynamicStore.saveUser({
          id: 'usr_' + Date.now(),
          name: orderData.customer.name || 'Customer',
          email: orderData.customer.email,
          phone: orderData.customer.phone || '',
          address: orderData.customer.address || '',
          city: orderData.customer.city || '',
          state: orderData.customer.state || '',
          pincode: orderData.customer.pincode || '',
          role: 'customer'
        });
      } catch (e) {}
    }

    if (isDbConnected()) {
      const newOrder = await Order.create(orderData);
      await dynamicStore.saveOrder(newOrder.toObject ? newOrder.toObject() : newOrder);
      await bumpSyncVersion('orders');
      await bumpSyncVersion('products');
      return res.status(201).json(newOrder);
    }

    const saved = await dynamicStore.saveOrder(orderData);
    await bumpSyncVersion('orders');
    res.status(201).json(saved || orderData);
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:id', requireAdminAuth, async (req, res) => {
  try {
    const id = req.params.id;
    if (isDbConnected()) {
      const updateData = { ...req.body };
      delete updateData._id;
      delete updateData.id;
      const updated = await Order.findOneAndUpdate(
        { id },
        { $set: updateData },
        { returnDocument: 'after', upsert: true }
      );
      await bumpSyncVersion('orders');
      if (updated) return res.json(updated);
    }
    await bumpSyncVersion('orders');
    res.json({ id, ...req.body });
  } catch (err) {
    console.error('Order update error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/orders/:id', requireAdminAuth, async (req, res) => {
  try {
    const id = req.params.id;
    if (isDbConnected()) {
      await Order.findOneAndDelete({ id });
      await bumpSyncVersion('orders');
      return res.json({ success: true, id });
    }
    await bumpSyncVersion('orders');
    res.json({ success: true, id });
  } catch (err) {
    console.error('Order deletion error:', err);
    res.status(500).json({ error: err.message });
  }
});


// ==========================================================================
// 4. USERS & CUSTOMERS API (SANITIZED & SECURED)
// ==========================================================================

app.get(['/api/users', '/users'], async (req, res) => {
  const isRealCustomer = (u) => {
    if (!u || !u.email) return false;
    if (u.role === 'admin' || u.id === 'admin_master' || u.isDemo === true) return false;
    if (u.id && String(u.id).startsWith('demo_')) return false;
    return true;
  };

  try {
    let rawUsers = [];
    if (isDbConnected()) {
      try {
        const users = await User.find({ role: { $ne: 'admin' }, id: { $ne: 'admin_master' } }).sort({ createdAt: -1 }).lean();
        rawUsers = users || [];
      } catch (err) {
        console.warn('DB users fetch notice:', err.message);
      }
    }

    const storeUsers = await dynamicStore.getAllUsers();
    const userMap = new Map();
    (storeUsers || []).forEach(u => {
      if (u && u.email) userMap.set(String(u.email).toLowerCase(), u);
    });
    rawUsers.forEach(u => {
      if (u && u.email) {
        const key = String(u.email).toLowerCase();
        userMap.set(key, { ...userMap.get(key), ...u });
      }
    });

    const allUsers = Array.from(userMap.values()).filter(isRealCustomer);
    return res.json(allUsers.map(u => sanitizeUser(u)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/users', '/users'], async (req, res) => {
  try {
    const userData = { ...req.body };
    if (!userData.email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const cleanEmail = String(userData.email).toLowerCase().trim();
    userData.email = cleanEmail;
    userData.id = userData.id || ('usr_' + Date.now());
    userData.role = userData.role || 'customer';
    userData.joinedDate = userData.joinedDate || new Date().toISOString().split('T')[0];

    if (userData.password) {
      userData.password = hashCustomerPassword(userData.password);
    }

    if (isDbConnected()) {
      let existing = await User.findOne({ email: cleanEmail });
      if (existing) {
        Object.assign(existing, userData);
        await existing.save();
        await dynamicStore.saveUser(existing.toObject ? existing.toObject() : existing);
        await bumpSyncVersion('users');
        return res.json(sanitizeUser(existing));
      }
      const newUser = await User.create(userData);
      await dynamicStore.saveUser(newUser.toObject ? newUser.toObject() : newUser);
      await bumpSyncVersion('users');
      return res.status(201).json(sanitizeUser(newUser));
    }

    const saved = await dynamicStore.saveUser(userData);
    await bumpSyncVersion('users');
    res.status(201).json(sanitizeUser(saved || userData));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Customer Sign In Endpoint (Public Storefront - STRICTLY for registered customers)
app.post(['/api/users/login', '/api/auth/login'], async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanPassword = String(password).trim();
    const hashedPassword = hashCustomerPassword(cleanPassword);

    // Explicitly block the administrator account from customer storefront login
    if (cleanEmail === 'tudurajanikanta@gmail.com') {
      return res.status(401).json({
        error: 'Invalid customer credentials. Only accounts registered on the customer portal can sign in here.'
      });
    }

    let matchedUser = null;

    if (isDbConnected()) {
      const dbUser = await User.findOne({
        email: cleanEmail,
        role: { $ne: 'admin' },
        id: { $ne: 'admin_master' }
      }).lean();
      if (dbUser) {
        if (dbUser.password === hashedPassword || dbUser.password === cleanPassword) {
          matchedUser = dbUser;
        }
      }
    }

    if (!matchedUser) {
      const allUsers = await dynamicStore.getAllUsers();
      const storeUser = allUsers.find(u =>
        u &&
        String(u.email || '').toLowerCase() === cleanEmail &&
        u.role !== 'admin' &&
        u.id !== 'admin_master' &&
        String(u.email || '').toLowerCase() !== 'tudurajanikanta@gmail.com'
      );
      if (storeUser) {
        if (storeUser.password === hashedPassword || storeUser.password === cleanPassword) {
          matchedUser = storeUser;
        }
      }
    }

    if (!matchedUser) {
      return res.status(401).json({
        error: 'Invalid email or password. Only registered customer accounts can sign in here.'
      });
    }

    return res.json({
      success: true,
      user: sanitizeUser(matchedUser)
    });
  } catch (err) {
    console.error('Customer login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================================================
// 5. SETTINGS API
// ==========================================================================

app.get(['/api/settings', '/settings'], async (req, res) => {
  try {
    if (isDbConnected()) {
      const setting = await Setting.findOne({ key: 'global_settings' }).lean();
      if (setting) return res.json(setting);
    }
  } catch (err) {
    console.warn('DB settings fetch fallback:', err.message);
  }
  res.json({
    paymentMethod: 'Cash on Delivery (COD)',
    freeShippingThreshold: 1499,
    standardShippingFee: 99,
    expressShippingFee: 149
  });
});

app.post(['/api/settings', '/settings'], requireAdminAuth, async (req, res) => {
  try {
    const settingsData = req.body;
    if (isDbConnected()) {
      const updated = await Setting.findOneAndUpdate(
        { key: 'global_settings' },
        { ...settingsData, key: 'global_settings', updatedAt: new Date() },
        { returnDocument: 'after', upsert: true }
      );
      await dynamicStore.updateSettings(settingsData);
      await bumpSyncVersion('settings');
      return res.json(updated);
    }
    const updated = await dynamicStore.updateSettings(settingsData);
    await bumpSyncVersion('settings');
    res.json(updated || settingsData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================================================
// 6. CASH ON DELIVERY (COD) ORDER VERIFICATION
// ==========================================================================

// Create Order endpoint (Universal Cash on Delivery confirmation)
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, notes } = req.body;
    const orderId = 'cod_' + crypto.randomBytes(8).toString('hex');
    res.json({
      id: orderId,
      entity: 'order',
      amount: Math.round((amount || 0) * 100),
      amount_paid: 0,
      amount_due: Math.round((amount || 0) * 100),
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      status: 'created',
      payment_method: 'Cash on Delivery (COD)',
      notes: notes || {},
      created_at: Math.floor(Date.now() / 1000)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Payment endpoint
app.post('/api/verify-payment', (req, res) => {
  res.json({
    verified: true,
    paymentMethod: 'Cash on Delivery (COD)',
    message: 'Cash on Delivery verified for shipment'
  });
});

// ==========================================================================
// 7. DYNAMIC DATABASE EXPORT & REAL-TIME API (PROTECTED)
// ==========================================================================

app.get('/api/database/json', requireAdminAuth, async (req, res) => {
  try {
    const [products, orders, users, settings] = await Promise.all([
      dynamicStore.getAllProducts(),
      dynamicStore.getAllOrders(),
      dynamicStore.getAllUsers(),
      dynamicStore.getSettings()
    ]);
    res.json({
      exportedAt: new Date().toISOString(),
      storageMode: isDbConnected() ? 'MongoDB Atlas (Real-Time)' : 'Dynamic In-Memory Management',
      products,
      orders,
      users: users.map(u => sanitizeUser(u)),
      settings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/database/download/:file', requireAdminAuth, async (req, res) => {
  const fileName = req.params.file.replace(/\.json$/, '');
  let data = [];
  if (fileName === 'products') data = await dynamicStore.getAllProducts();
  else if (fileName === 'orders') data = await dynamicStore.getAllOrders();
  else if (fileName === 'users') data = (await dynamicStore.getAllUsers()).map(u => sanitizeUser(u));
  else if (fileName === 'settings') data = await dynamicStore.getSettings();
  else return res.status(400).json({ error: `Invalid file. Allowed: products, orders, users, settings` });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}.json"`);
  res.send(JSON.stringify(data, null, 2));
});

app.post('/api/database/sync', requireAdminAuth, async (req, res) => {
  await bumpSyncVersion('products');
  res.json({ success: true, message: 'Dynamic product management system synchronized in real time' });
});

// Fallback for SPA routing (only for non-API routes)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: `API route not found: ${req.path}` });
  }
  res.sendFile(path.join(rootDir, 'index.html'));
});

// Start listener on 0.0.0.0 (required for Render, Docker, and Cloud)
const isDirectExecution = process.argv[1] && (process.argv[1].endsWith('server.js') || fileURLToPath(import.meta.url) === path.resolve(process.argv[1]));
if (!process.env.VERCEL && isDirectExecution) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Uprumm Server is listening on http://0.0.0.0:${PORT} (Render / Cloud / Local)`);
    console.log(`📦 Separate Admin Portal: http://localhost:${PORT}/admin`);
    console.log(`🛒 Public Storefront:    http://localhost:${PORT}/\n`);
  });
}

export default app;
