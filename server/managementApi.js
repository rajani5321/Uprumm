import express from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import Product from './models/Product.js';
import Order from './models/Order.js';
import User from './models/User.js';
import Setting from './models/Setting.js';
import { isDbConnected } from './db.js';
import { dynamicStore, INITIAL_PRODUCTS } from './dynamicStore.js';
import { bumpSyncVersion, getSyncStatus } from './syncState.js';
import { requireAdminAuth, sanitizeUser } from './security.js';

const router = express.Router();

async function triggerJsonSync(type = 'products') {
  try {
    await bumpSyncVersion(type);
  } catch (err) {
    console.warn('[Sync Notice]', err.message);
  }
}

// Ultra-fast multi-device sync status check endpoint
router.get('/sync-status', async (req, res) => {
  res.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.header('Pragma', 'no-cache');
  const status = await getSyncStatus();
  res.json(status);
});

// Get permanently deleted product IDs so all clients can immediately purge them
router.get('/deleted-ids', (req, res) => {
  res.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.json({ deletedIds: Array.from(dynamicStore.deletedIds) });
});

// Helper to construct flexible ID match query (supports numeric ID, string ID, and Mongo _id)
function buildIdQuery(rawId) {
  const numId = Number(rawId);
  const conditions = [];

  if (!isNaN(numId)) {
    conditions.push({ id: numId });
  }
  conditions.push({ id: String(rawId) });

  if (mongoose.Types.ObjectId.isValid(rawId)) {
    conditions.push({ _id: rawId });
  }

  return { $or: conditions };
}

// ==========================================================================
// 1. DASHBOARD & ANALYTICS OVERVIEW (PROTECTED)
// ==========================================================================

router.get('/overview', requireAdminAuth, async (req, res) => {
  try {
    const [allOrders, allProducts, allUsers] = await Promise.all([
      dynamicStore.getAllOrders(),
      dynamicStore.getAllProducts(),
      dynamicStore.getAllUsers()
    ]);

    const totalRevenue = allOrders.reduce((sum, o) => {
      return o.paymentStatus === 'PAID' ? sum + (Number(o.grandTotal) || 0) : sum;
    }, 0);

    const ordersByStatus = {
      placed: 0,
      confirmed: 0,
      printing: 0,
      shipped: 0,
      delivered: 0
    };

    allOrders.forEach(o => {
      const st = (o.fulfillmentStatus || 'placed').toLowerCase();
      if (ordersByStatus[st] !== undefined) {
        ordersByStatus[st]++;
      } else {
        ordersByStatus.placed++;
      }
    });

    const lowStockItems = [];
    allProducts.forEach(p => {
      const stock = p.stock || {};
      const totalUnits = Object.values(stock).reduce((a, b) => a + Number(b || 0), 0);
      const isLow = Object.values(stock).some(qty => Number(qty || 0) <= 5) || totalUnits <= 15;
      if (isLow) {
        lowStockItems.push({
          id: p.id,
          name: p.name,
          totalUnits,
          stock
        });
      }
    });

    res.json({
      dbConnected: isDbConnected(),
      totalRevenue,
      totalOrders: allOrders.length,
      ordersByStatus,
      totalProducts: allProducts.length,
      totalCustomers: allUsers.filter(u => u.role !== 'admin').length,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      recentOrders: allOrders.slice(0, 10),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Management overview error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Alias for /overview
router.get('/stats', requireAdminAuth, (req, res) => {
  res.redirect(307, req.baseUrl + '/overview');
});

// ==========================================================================
// 2. PRODUCT & DESIGN DROPS MANAGEMENT
// ==========================================================================

// Get all products
router.get('/products', async (req, res) => {
  try {
    const products = await dynamicStore.getAllProducts();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new product / design drop (PROTECTED)
router.post('/products', requireAdminAuth, async (req, res) => {
  try {
    const productData = { ...req.body };
    if (!productData.name) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const created = await dynamicStore.upsertProduct(productData);
    await triggerJsonSync('products');
    return res.status(201).json(created);
  } catch (err) {
    console.error('Management create product error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get single product (PUBLIC FOR STOREFRONT DETAILS)
router.get('/products/:id', async (req, res) => {
  try {
    const product = await dynamicStore.getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update product / design (PROTECTED)
router.put('/products/:id', requireAdminAuth, async (req, res) => {
  try {
    const rawId = req.params.id;
    const updateData = { ...req.body };
    delete updateData._id;

    const updated = await dynamicStore.upsertProduct({ id: rawId, ...updateData });
    await triggerJsonSync('products');
    return res.json(updated);
  } catch (err) {
    console.error('Management update product error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete product / design permanently (PROTECTED)
router.delete('/products/:id', requireAdminAuth, async (req, res) => {
  try {
    const rawId = req.params.id;
    const result = await dynamicStore.deleteProduct(rawId);
    await triggerJsonSync('products');
    return res.json({
      success: true,
      message: `Product drop ${rawId} permanently deleted from store`,
      deletedId: rawId,
      deletedProduct: result.deletedDoc
    });
  } catch (err) {
    console.error('Management delete product error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Remove just the graphic artwork / logo overlay from a product (turn into plain tee) (PROTECTED)
router.put('/products/:id/remove-design', requireAdminAuth, async (req, res) => {
  try {
    const rawId = req.params.id;
    const updated = await dynamicStore.upsertProduct({ id: rawId, logoOverlay: null });
    await triggerJsonSync('products');
    return res.json({
      success: true,
      message: 'Graphic artwork removed successfully. Tee is now plain minimal.',
      product: updated
    });
  } catch (err) {
    console.error('Management remove design error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Adjust stock for product sizes (PROTECTED)
router.put('/products/:id/stock', requireAdminAuth, async (req, res) => {
  try {
    const rawId = req.params.id;
    const { size, quantity, setQuantity, delta, stock } = req.body;
    let stockObj = {};

    const exactQty = setQuantity !== undefined ? setQuantity : quantity;

    if (stock && typeof stock === 'object') {
      stockObj = stock;
    } else if (size && exactQty !== undefined) {
      stockObj[size] = Math.max(0, Number(exactQty));
    } else if (size && delta !== undefined) {
      const current = await dynamicStore.getProductById(rawId);
      const currQty = (current && current.stock && current.stock[size]) || 0;
      stockObj[size] = Math.max(0, currQty + Number(delta));
    }

    const updatedStock = await dynamicStore.updateStock(rawId, stockObj);
    await triggerJsonSync('products');
    return res.json({ success: true, stock: updatedStock });
  } catch (err) {
    console.error('Management update stock error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================================================
// 2B. DYNAMIC CATALOG & CUSTOM PRODUCTS MANAGEMENT
// ==========================================================================

// Get organized catalog management config (PROTECTED)
router.get('/catalog-config', requireAdminAuth, async (req, res) => {
  try {
    const liveProducts = await dynamicStore.getAllProducts();
    const catConfig = {
      metadata: {
        title: "Uprumm Master Catalog & Dynamic Products Management",
        schemaVersion: "3.0.0",
        updatedAt: new Date().toISOString(),
        brand: "Uprumm Apparel Co.",
        storageMode: isDbConnected() ? "MongoDB Atlas Real-Time" : "Dynamic In-Memory Management",
        totalProducts: liveProducts.length,
        activeCategories: ["graphic", "minimal", "custom"]
      },
      categories: [
        { id: "graphic", name: "Graphic Drops", icon: "👕", defaultPrice: 999 },
        { id: "minimal", name: "Minimal Heavyweight", icon: "⬛", defaultPrice: 799 },
        { id: "custom", name: "Custom Print Drops", icon: "🎨", defaultPrice: 999 }
      ],
      customStudioSpecifications: {
        fabric: "240 GSM Bio-Washed Combed Heavy Cotton",
        defaultSizes: ["S", "M", "L", "XL", "XXL"]
      },
      products: liveProducts
    };

    res.json(catConfig);
  } catch (err) {
    console.error('Management get catalog-config error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Import catalog drops / custom products dynamically (PROTECTED)
router.post('/import-catalog', requireAdminAuth, async (req, res) => {
  try {
    const payload = req.body;
    let itemsToImport = [];

    if (Array.isArray(payload)) {
      itemsToImport = payload;
    } else if (payload && Array.isArray(payload.products)) {
      itemsToImport = payload.products;
    } else {
      return res.status(400).json({ error: 'Invalid format. Expected an array of products or an object with a "products" array.' });
    }

    if (itemsToImport.length === 0) {
      return res.status(400).json({ error: 'No products found in import payload.' });
    }

    const imported = [];
    for (const item of itemsToImport) {
      if (!item.name) continue;
      const cleanItem = { ...item };
      const rawId = cleanItem.id || Date.now() + Math.floor(Math.random() * 1000);
      cleanItem.id = Number(rawId) || rawId;
      const saved = await dynamicStore.upsertProduct(cleanItem);
      imported.push(saved);
    }

    await triggerJsonSync('products');
    res.json({
      success: true,
      count: imported.length,
      message: `Successfully loaded ${imported.length} drops into dynamic product store.`
    });
  } catch (err) {
    console.error('Management import catalog error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Force synchronization (PROTECTED)
router.post('/sync-catalog', requireAdminAuth, async (req, res) => {
  try {
    await triggerJsonSync('products');
    const currentProducts = await dynamicStore.getAllProducts();
    return res.json({
      success: true,
      message: 'Dynamic product management system live and synchronized.',
      count: currentProducts.length,
      products: currentProducts
    });
  } catch (err) {
    console.error('Management sync catalog error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reset / clear catalog to clean slate (PROTECTED)
router.post('/reset-catalog', requireAdminAuth, async (req, res) => {
  try {
    dynamicStore.products = [];
    dynamicStore.deletedIds = new Set(['101', '102', '103', '104', '105', '1792240982930', 101, 102, 103, 104, 105, 1792240982930]);
    dynamicStore.saveToDisk();
    if (isDbConnected()) {
      try {
        await Product.deleteMany({});
      } catch (e) {}
    }
    await triggerJsonSync('products');

    res.json({
      success: true,
      message: 'Master dynamic catalog reset to a clean slate (0 products).',
      count: 0,
      products: []
    });
  } catch (err) {
    console.error('Management reset catalog error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Upload artwork / mockup photo endpoint (PROTECTED)
router.post('/upload', requireAdminAuth, (req, res) => {
  try {
    const { dataUrl, name } = req.body;
    if (!dataUrl) return res.status(400).json({ error: 'dataUrl is required' });

    const matches = dataUrl.match(/^data:([A-Za-z0-9\-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid data URL format' });
    }

    const mimeType = matches[1].toLowerCase();
    const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowedMimes.includes(mimeType)) {
      return res.status(400).json({ error: 'Unsupported file type. Only PNG, JPG, WEBP, and SVG images are allowed.' });
    }

    const base64Data = matches[2];
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('svg') ? 'svg' : mimeType.includes('webp') ? 'webp' : 'jpg';
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const safeName = (name || 'design').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const fileName = `${safeName}_${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    const url = `/uploads/${fileName}`;
    console.log(`[Upload API] Saved artwork: ${url}`);
    res.json({ success: true, url, fileName });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================================================
// 3. ORDER LIFECYCLE & SHIPPING MANAGEMENT
// ==========================================================================

// Get all orders with optional filter ?status=... (PROTECTED)
router.get('/orders', requireAdminAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status && req.query.status !== 'all') {
      filter.fulfillmentStatus = req.query.status;
    }

    if (isDbConnected()) {
      const orders = await Order.find(filter).sort({ createdAt: -1 }).lean();
      return res.json(orders);
    }
    const allOrders = await dynamicStore.getAllOrders();
    if (filter.fulfillmentStatus) {
      return res.json(allOrders.filter(o => o.fulfillmentStatus === filter.fulfillmentStatus));
    }
    res.json(allOrders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single order details (PROTECTED)
router.get('/orders/:id', requireAdminAuth, async (req, res) => {
  try {
    const query = buildIdQuery(req.params.id);
    if (isDbConnected()) {
      const order = await Order.findOne(query).lean();
      if (!order) return res.status(404).json({ error: 'Order not found' });
      return res.json(order);
    }
    const order = await dynamicStore.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Advance or update order status (PROTECTED)
router.put('/orders/:id/status', requireAdminAuth, async (req, res) => {
  try {
    const rawId = req.params.id;
    const { fulfillmentStatus, courier, awb, estimatedDelivery } = req.body;

    const allowed = ['placed', 'confirmed', 'printing', 'shipped', 'delivered'];
    if (fulfillmentStatus && !allowed.includes(fulfillmentStatus)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${allowed.join(', ')}`
      });
    }

    if (isDbConnected()) {
      const query = buildIdQuery(rawId);
      const updateFields = {};
      if (fulfillmentStatus) updateFields.fulfillmentStatus = fulfillmentStatus;
      if (courier) updateFields.courier = courier;
      if (awb) updateFields.awb = awb;
      if (estimatedDelivery) updateFields.estimatedDelivery = estimatedDelivery;

      const updated = await Order.findOneAndUpdate(
        query,
        { $set: updateFields },
        { returnDocument: 'after' }
      );

      if (!updated) return res.status(404).json({ error: 'Order not found' });
      await triggerJsonSync('orders');
      return res.json(updated);
    }

    await triggerJsonSync('orders');
    res.json({ id: rawId, fulfillmentStatus });
  } catch (err) {
    console.error('Management update order status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update full order (PROTECTED)
router.put('/orders/:id', requireAdminAuth, async (req, res) => {
  try {
    const rawId = req.params.id;
    const updateData = { ...req.body };
    delete updateData._id;

    if (isDbConnected()) {
      const query = buildIdQuery(rawId);
      const updated = await Order.findOneAndUpdate(
        query,
        { $set: updateData },
        { returnDocument: 'after', upsert: true }
      );
      await triggerJsonSync('orders');
      return res.json(updated);
    }

    await triggerJsonSync('orders');
    res.json({ id: rawId, ...updateData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete order (PROTECTED)
router.delete('/orders/:id', requireAdminAuth, async (req, res) => {
  try {
    const rawId = req.params.id;
    if (isDbConnected()) {
      const query = buildIdQuery(rawId);
      const deleted = await Order.findOneAndDelete(query);
      await triggerJsonSync('orders');
      return res.json({
        success: true,
        message: `Order ${rawId} deleted`,
        deletedOrder: deleted
      });
    }
    await triggerJsonSync('orders');
    res.json({ success: true, id: rawId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================================================
// 4. CUSTOMER ACCOUNTS MANAGEMENT (PROTECTED & SANITIZED)
// ==========================================================================

// Get all registered customers with spend analysis (PASSWORDS STRIPPED)
router.get('/customers', requireAdminAuth, async (req, res) => {
  try {
    let rawUsers = [];
    let rawOrders = [];

    if (isDbConnected()) {
      try {
        const [dbUsers, dbOrders] = await Promise.all([
          User.find().sort({ createdAt: -1 }).lean(),
          Order.find().lean()
        ]);
        rawUsers = dbUsers || [];
        rawOrders = dbOrders || [];
      } catch (err) {
        console.warn('[Management API] Customers DB query notice:', err.message);
      }
    }

    // Merge with dynamicStore users (memory and disk cache) so no registered customer is ever lost
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
    const allUsers = Array.from(userMap.values());
    const realCustomers = allUsers.filter(u => {
      if (!u || !u.email) return false;
      if (u.role === 'admin' || u.id === 'admin_master' || u.isDemo === true) return false;
      if (u.id && String(u.id).startsWith('demo_')) return false;
      return true;
    });

    const storeOrders = await dynamicStore.getAllOrders();
    const orderMap = new Map();
    (storeOrders || []).forEach(o => {
      const id = o.orderId || o.id;
      if (id) orderMap.set(String(id), o);
    });
    rawOrders.forEach(o => {
      const id = o.orderId || o.id;
      if (id) orderMap.set(String(id), { ...orderMap.get(String(id)), ...o });
    });
    const allOrders = Array.from(orderMap.values());

    const customersWithStats = realCustomers.map(u => {
      const userOrders = allOrders.filter(o =>
        o.customer && o.customer.email && u.email &&
        String(o.customer.email).toLowerCase() === String(u.email).toLowerCase()
      );
      const totalSpent = userOrders.reduce((sum, o) => {
        return o.paymentStatus === 'PAID' ? sum + (Number(o.grandTotal) || 0) : sum;
      }, 0);

      const safeUser = sanitizeUser(u);
      return {
        ...safeUser,
        ordersCount: userOrders.length,
        totalSpent,
        lastOrderDate: userOrders[0]?.date || null
      };
    });

    return res.json(customersWithStats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alias for /users
router.get('/users', requireAdminAuth, (req, res) => {
  res.redirect(307, req.baseUrl + '/customers');
});

// Update customer details (PROTECTED)
router.put('/customers/:id', requireAdminAuth, async (req, res) => {
  try {
    const rawId = req.params.id;
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.password; // Do not allow direct password overwrite via this endpoint

    if (isDbConnected()) {
      const query = buildIdQuery(rawId);
      const updated = await User.findOneAndUpdate(
        query,
        { $set: updateData },
        { returnDocument: 'after' }
      );
      if (!updated) return res.status(404).json({ error: 'Customer not found' });
      return res.json(sanitizeUser(updated));
    }

    res.json(sanitizeUser({ id: rawId, ...updateData }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete customer (PROTECTED)
router.delete('/customers/:id', requireAdminAuth, async (req, res) => {
  try {
    const rawId = req.params.id;
    if (isDbConnected()) {
      const query = buildIdQuery(rawId);
      await User.findOneAndDelete(query);
      return res.json({ success: true, message: `Customer ${rawId} deleted` });
    }
    res.json({ success: true, id: rawId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================================================
// 5. STORE SETTINGS & RESTORE CATALOG (PROTECTED)
// ==========================================================================

// Get settings
router.get('/settings', requireAdminAuth, async (req, res) => {
  try {
    if (isDbConnected()) {
      const settings = await Setting.findOne({ key: 'global_settings' }).lean();
      if (settings) return res.json(settings);
    }
    res.json({
      key: 'global_settings',
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_TolWE9ZjRag5R7',
      razorpayMode: 'live',
      freeShippingThreshold: 1499,
      standardShippingFee: 99,
      expressShippingFee: 149
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update settings (PROTECTED)
router.put('/settings', requireAdminAuth, async (req, res) => {
  try {
    const settingsData = { ...req.body };
    if (isDbConnected()) {
      const updated = await Setting.findOneAndUpdate(
        { key: 'global_settings' },
        { ...settingsData, key: 'global_settings', updatedAt: new Date() },
        { returnDocument: 'after', upsert: true }
      );
      await dynamicStore.updateSettings(settingsData);
      await triggerJsonSync('settings');
      return res.json(updated);
    }
    const updated = await dynamicStore.updateSettings(settingsData);
    await triggerJsonSync('settings');
    res.json(updated || settingsData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/settings', requireAdminAuth, async (req, res) => {
  try {
    const settingsData = { ...req.body };
    if (isDbConnected()) {
      const updated = await Setting.findOneAndUpdate(
        { key: 'global_settings' },
        { ...settingsData, key: 'global_settings', updatedAt: new Date() },
        { returnDocument: 'after', upsert: true }
      );
      await dynamicStore.updateSettings(settingsData);
      await triggerJsonSync('settings');
      return res.json(updated);
    }
    const updated = await dynamicStore.updateSettings(settingsData);
    await triggerJsonSync('settings');
    res.json(updated || settingsData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================================================
// 6. DYNAMIC DATABASE EXPORT API (PROTECTED)
// ==========================================================================

router.get('/export-json', requireAdminAuth, async (req, res) => {
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

router.post('/sync-json', requireAdminAuth, async (req, res) => {
  await bumpSyncVersion('products');
  res.json({ success: true, message: 'Dynamic product management active. Real-time in-memory and database sync.' });
});

router.get('/download-json/:collection', requireAdminAuth, async (req, res) => {
  const collection = req.params.collection.replace(/\.json$/, '');
  let data = [];
  if (collection === 'products') data = await dynamicStore.getAllProducts();
  else if (collection === 'orders') data = await dynamicStore.getAllOrders();
  else if (collection === 'users') data = (await dynamicStore.getAllUsers()).map(u => sanitizeUser(u));
  else if (collection === 'settings') data = await dynamicStore.getSettings();
  else return res.status(400).json({ error: `Invalid collection. Allowed: products, orders, users, settings` });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${collection}.json"`);
  res.send(JSON.stringify(data, null, 2));
});

export default router;
