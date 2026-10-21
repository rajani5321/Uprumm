import Product from './models/Product.js';
import User from './models/User.js';
import Setting from './models/Setting.js';
import { INITIAL_PRODUCTS, INITIAL_SETTINGS, INITIAL_USERS } from './dynamicStore.js';

export { INITIAL_PRODUCTS };

export async function seedDatabaseIfEmpty() {
  try {
    let settings = await Setting.findOne({ key: 'global_settings' });
    if (!settings) {
      settings = await Setting.create(INITIAL_SETTINGS);
      console.log('⚙️ Initialized default store settings in MongoDB.');
    } else if (!settings.hasInitializedCatalog) {
      settings.hasInitializedCatalog = true;
      await settings.save();
    }

    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      await User.create(INITIAL_USERS[0]);
      console.log('👑 Created default admin user in MongoDB.');
    }

    // Seed master catalog products into MongoDB if empty
    const productCount = await Product.countDocuments();
    if (productCount === 0 && Array.isArray(INITIAL_PRODUCTS) && INITIAL_PRODUCTS.length > 0) {
      await Product.insertMany(INITIAL_PRODUCTS);
      console.log(`📦 Seeded ${INITIAL_PRODUCTS.length} master products into MongoDB Atlas from dynamic memory.`);
    }
  } catch (err) {
    console.warn('Database seed notice:', err.message);
  }
}

