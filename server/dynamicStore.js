import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Product from './models/Product.js';
import Order from './models/Order.js';
import User from './models/User.js';
import Setting from './models/Setting.js';
import { isDbConnected } from './db.js';
import { bumpSyncVersion } from './syncState.js';

const STORE_FILE = path.join(process.cwd(), 'server', '.dynamic_store.json');

export const INITIAL_PRODUCTS = [];

export const INITIAL_SETTINGS = {
  key: "global_settings",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || "rzp_test_TolWE9ZjRag5R7",
  razorpayMode: "live",
  freeShippingThreshold: 1499,
  standardShippingFee: 99,
  expressShippingFee: 149,
  hasInitializedCatalog: true,
  deletedProductIds: ["101", "102", "103", "104", "105", "1792240982930"]
};

export const INITIAL_USERS = [];

// Single source of truth for dynamic catalog with persistent local cache and live MongoDB Atlas sync
class DynamicProductStore {
  constructor() {
    this.products = [...INITIAL_PRODUCTS];
    this.orders = [];
    this.settings = { ...INITIAL_SETTINGS };
    this.users = [];
    // Permanently blacklisted demo product IDs so they never auto-appear
    this.deletedIds = new Set(['101', '102', '103', '104', '105', '1792240982930', 101, 102, 103, 104, 105, 1792240982930]);
    this.loadFromDisk();
    this.products = this.products.filter(p => p && !this.deletedIds.has(String(p.id)) && !this.deletedIds.has(Number(p.id)));
    this.saveToDisk();
    console.log(`⚡ [Dynamic Store] Initialized with ${this.products.length} live products (Demo products permanently purged).`);
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.deletedIds)) {
          data.deletedIds.forEach(id => {
            this.deletedIds.add(String(id));
            const num = Number(id);
            if (!isNaN(num)) this.deletedIds.add(num);
          });
        }
        if (Array.isArray(data.products) && data.products.length > 0) {
          this.products = data.products.filter(p => p && !this.deletedIds.has(String(p.id)) && !this.deletedIds.has(Number(p.id)));
        }
        if (Array.isArray(data.orders)) {
          this.orders = data.orders;
        }
        if (Array.isArray(data.users)) {
          this.users = data.users.filter(u => {
            if (!u || !u.email) return false;
            if (u.role === 'admin' || u.id === 'admin_master' || u.isDemo === true) return false;
            if (u.id && String(u.id).startsWith('demo_')) return false;
            return true;
          });
        }
        if (data.settings && typeof data.settings === 'object') {
          this.settings = { ...this.settings, ...data.settings };
        }
      }
    } catch (e) {
      console.warn('[Dynamic Store] Disk load notice:', e.message);
    }
  }

  saveToDisk() {
    try {
      const data = {
        products: this.products.filter(p => p && !this.deletedIds.has(String(p.id)) && !this.deletedIds.has(Number(p.id))),
        orders: this.orders,
        users: (this.users || []).filter(u => {
          if (!u || !u.email) return false;
          if (u.role === 'admin' || u.id === 'admin_master' || u.isDemo === true) return false;
          if (u.id && String(u.id).startsWith('demo_')) return false;
          return true;
        }),
        settings: this.settings,
        deletedIds: Array.from(this.deletedIds),
        updatedAt: new Date().toISOString()
      };
      fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.warn('[Dynamic Store] Disk save notice:', e.message);
    }
  }

  buildIdQuery(rawId) {
    const numId = Number(rawId);
    const conditions = [];
    if (!isNaN(numId)) conditions.push({ id: numId });
    conditions.push({ id: String(rawId) });
    if (mongoose.Types.ObjectId.isValid(rawId)) conditions.push({ _id: rawId });
    return { $or: conditions };
  }

  // Retrieve all products
  async getAllProducts() {
    if (isDbConnected()) {
      try {
        const dbSetting = await Setting.findOne({ key: 'global_settings' }).lean();
        if (dbSetting && Array.isArray(dbSetting.deletedProductIds)) {
          dbSetting.deletedProductIds.forEach(id => {
            this.deletedIds.add(String(id));
            const num = Number(id);
            if (!isNaN(num)) this.deletedIds.add(num);
          });
        }

        const dbProducts = await Product.find().sort({ id: -1, createdAt: -1 }).lean();
        if (dbProducts && Array.isArray(dbProducts)) {
          // Filter out any deleted products
          const validDbProducts = dbProducts.filter(p => !this.deletedIds.has(String(p.id)) && !this.deletedIds.has(Number(p.id)));

          const dbMap = new Map();
          validDbProducts.forEach(p => dbMap.set(String(p.id), p));

          // Ensure any local product created in this store is synced to MongoDB
          for (const lp of this.products) {
            const idStr = String(lp.id);
            const idNum = Number(lp.id);
            if (!this.deletedIds.has(idStr) && !this.deletedIds.has(idNum) && !dbMap.has(idStr)) {
              dbMap.set(idStr, lp);
              try {
                const query = this.buildIdQuery(lp.id);
                Product.findOneAndUpdate(query, { $set: lp }, { upsert: true }).catch(() => {});
              } catch (e) {}
            }
          }

          this.products = Array.from(dbMap.values());
          this.saveToDisk();
          return this.products;
        }
      } catch (err) {
        console.warn('[Dynamic Store] DB fetch notice:', err.message);
      }
    }
    return this.products.filter(p => !this.deletedIds.has(String(p.id)) && !this.deletedIds.has(Number(p.id)));
  }

  // Retrieve single product
  async getProductById(id) {
    if (this.deletedIds.has(String(id)) || this.deletedIds.has(Number(id))) return null;
    if (isDbConnected()) {
      try {
        const dbProduct = await Product.findOne(this.buildIdQuery(id)).lean();
        if (dbProduct) return dbProduct;
      } catch (err) {}
    }
    return this.products.find(p => String(p.id) === String(id) || Number(p.id) === Number(id)) || null;
  }

  // Create or Upsert product
  async upsertProduct(productData) {
    const cleanData = { ...productData };
    if (!cleanData.id) {
      cleanData.id = Date.now();
    } else {
      cleanData.id = Number(cleanData.id) || cleanData.id;
    }

    const idStr = String(cleanData.id);
    const idNum = Number(cleanData.id);

    // Remove from deleted list
    this.deletedIds.delete(idStr);
    if (!isNaN(idNum)) this.deletedIds.delete(idNum);

    // Upsert in dynamic memory immediately
    const existingIdx = this.products.findIndex(p => String(p.id) === idStr || Number(p.id) === idNum);
    if (existingIdx !== -1) {
      this.products[existingIdx] = { ...this.products[existingIdx], ...cleanData };
    } else {
      this.products.unshift(cleanData);
    }

    this.saveToDisk();

    // Persist to MongoDB Atlas asynchronously if connected (Without blocking)
    if (isDbConnected()) {
      try {
        const query = this.buildIdQuery(cleanData.id);
        const saved = await Product.findOneAndUpdate(
          query,
          { $set: cleanData },
          { upsert: true, returnDocument: 'after' }
        );
        if (saved) {
          cleanData._id = saved._id;
        }
      } catch (err) {
        console.warn('[Dynamic Store] MongoDB upsert warning:', err.message);
      }
    }

    await bumpSyncVersion('products');
    console.log(`✓ [Dynamic Store] Product drop "${cleanData.name}" (ID: ${cleanData.id}) saved in dynamic store.`);
    return cleanData;
  }

  // Delete product permanently
  async deleteProduct(id) {
    const idStr = String(id);
    const idNum = Number(id);

    // Record as deleted
    this.deletedIds.add(idStr);
    if (!isNaN(idNum)) this.deletedIds.add(idNum);

    // Purge from dynamic memory immediately
    this.products = this.products.filter(p => String(p.id) !== idStr && Number(p.id) !== idNum);

    // Persist deleted ID into Setting permanently (in DB and memory)
    this.settings.deletedProductIds = Array.from(new Set([
      ...(this.settings.deletedProductIds || []),
      idStr
    ]));

    this.saveToDisk();

    let deletedDoc = null;
    if (isDbConnected()) {
      try {
        const query = this.buildIdQuery(id);
        deletedDoc = await Product.findOneAndDelete(query);
        await Setting.findOneAndUpdate(
          { key: 'global_settings' },
          { $addToSet: { deletedProductIds: idStr } },
          { upsert: true }
        );
      } catch (err) {
        console.warn('[Dynamic Store] MongoDB delete warning:', err.message);
      }
    }

    await bumpSyncVersion('products');
    console.log(`✓ [Dynamic Store] Product drop ${id} permanently deleted.`);
    return { success: true, deletedId: id, deletedDoc };
  }

  // Update stock count
  async updateStock(id, stockObj) {
    const idStr = String(id);
    const idNum = Number(id);

    const prod = this.products.find(p => String(p.id) === idStr || Number(p.id) === idNum);
    if (prod) {
      prod.stock = { ...(prod.stock || {}), ...stockObj };
    }

    this.saveToDisk();

    if (isDbConnected()) {
      try {
        const query = this.buildIdQuery(id);
        await Product.findOneAndUpdate(query, { $set: { stock: prod ? prod.stock : stockObj } });
      } catch (err) {}
    }

    await bumpSyncVersion('products');
    return prod ? prod.stock : stockObj;
  }

  // Decrement stock upon order checkout
  async decrementStock(items) {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (!item || !item.id) continue;
      const size = item.size || 'M';
      const qty = Number(item.quantity || item.qty || 1);
      const prod = this.products.find(p => String(p.id) === String(item.id) || Number(p.id) === Number(item.id));
      if (prod && prod.stock && prod.stock[size] !== undefined) {
        prod.stock[size] = Math.max(0, Number(prod.stock[size]) - qty);
      }

      if (isDbConnected()) {
        try {
          const query = this.buildIdQuery(item.id);
          const updateField = `stock.${size}`;
          await Product.findOneAndUpdate(query, { $inc: { [updateField]: -qty } });
        } catch (err) {}
      }
    }
    this.saveToDisk();
    await bumpSyncVersion('products');
  }

  // Orders management
  async getAllOrders() {
    if (isDbConnected()) {
      try {
        const dbOrders = await Order.find().sort({ createdAt: -1 }).lean();
        if (dbOrders && dbOrders.length > 0) {
          this.orders = dbOrders;
          return this.orders;
        }
      } catch (err) {}
    }
    return this.orders;
  }

  async saveOrder(orderData) {
    this.orders.unshift(orderData);
    this.saveToDisk();
    if (isDbConnected()) {
      try {
        await Order.findOneAndUpdate(
          { orderId: orderData.orderId },
          { $set: orderData },
          { upsert: true }
        );
      } catch (err) {
        console.warn('[Dynamic Store] Order DB save notice:', err.message);
      }
    }
    await bumpSyncVersion('orders');
    return orderData;
  }

  async updateOrderStatus(orderId, updateFields) {
    const ord = this.orders.find(o => o.orderId === orderId || o.id === orderId);
    if (ord) {
      Object.assign(ord, updateFields);
    }
    this.saveToDisk();
    if (isDbConnected()) {
      try {
        await Order.findOneAndUpdate(
          { $or: [{ orderId }, { id: orderId }] },
          { $set: updateFields }
        );
      } catch (err) {}
    }
    await bumpSyncVersion('orders');
    return ord;
  }

  // Settings management
  async getSettings() {
    if (isDbConnected()) {
      try {
        const dbSettings = await Setting.findOne({ key: 'global_settings' }).lean();
        if (dbSettings) {
          this.settings = { ...this.settings, ...dbSettings };
          return this.settings;
        }
      } catch (err) {}
    }
    return this.settings;
  }

  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveToDisk();
    if (isDbConnected()) {
      try {
        await Setting.findOneAndUpdate(
          { key: 'global_settings' },
          { $set: newSettings },
          { upsert: true }
        );
      } catch (err) {}
    }
    await bumpSyncVersion('settings');
    return this.settings;
  }

  // Users management
  async getAllUsers() {
    if (isDbConnected()) {
      try {
        const dbUsers = await User.find().lean();
        if (dbUsers && dbUsers.length > 0) {
          const userMap = new Map();
          this.users.forEach(u => {
            if (u && u.email) userMap.set(u.email.toLowerCase(), u);
          });
          dbUsers.forEach(u => {
            if (u && u.email) userMap.set(u.email.toLowerCase(), { ...userMap.get(u.email.toLowerCase()), ...u });
          });
          this.users = Array.from(userMap.values());
          this.saveToDisk();
        }
      } catch (err) {}
    }
    return (this.users || []).filter(u => {
      if (!u || !u.email) return false;
      if (u.role === 'admin' || u.id === 'admin_master' || u.isDemo === true) return false;
      if (u.id && String(u.id).startsWith('demo_')) return false;
      return true;
    });
  }

  async saveUser(userData) {
    if (!userData || !userData.email) return userData;
    const cleanEmail = String(userData.email).toLowerCase().trim();
    const cleanUser = {
      ...userData,
      email: cleanEmail,
      id: userData.id || ('usr_' + Date.now()),
      role: userData.role || 'customer',
      joinedDate: userData.joinedDate || new Date().toISOString().split('T')[0],
      createdAt: userData.createdAt || new Date()
    };

    const idx = this.users.findIndex(u => (u.email || '').toLowerCase() === cleanEmail || u.id === cleanUser.id);
    if (idx !== -1) {
      this.users[idx] = { ...this.users[idx], ...cleanUser };
    } else {
      this.users.push(cleanUser);
    }
    this.saveToDisk();

    if (isDbConnected()) {
      try {
        await User.findOneAndUpdate(
          { $or: [{ email: cleanEmail }, { id: cleanUser.id }] },
          { $set: cleanUser },
          { upsert: true, returnDocument: 'after' }
        );
      } catch (err) {
        console.warn('[Dynamic Store] User DB save notice:', err.message);
      }
    }

    await bumpSyncVersion('users');
    console.log(`✓ [Dynamic Store] User account "${cleanUser.name || cleanUser.email}" saved in dynamic store.`);
    return cleanUser;
  }
}

// Export single singleton dynamic store instance
export const dynamicStore = new DynamicProductStore();
export default dynamicStore;
