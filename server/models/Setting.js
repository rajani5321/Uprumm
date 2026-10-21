import mongoose from 'mongoose';

const SettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'global_settings' },
  razorpayKeyId: { type: String, default: 'rzp_test_uprumm_demo' },
  razorpayMode: { type: String, enum: ['simulation', 'live'], default: 'simulation' },
  freeShippingThreshold: { type: Number, default: 1499 },
  standardShippingFee: { type: Number, default: 99 },
  expressShippingFee: { type: Number, default: 149 },
  hasInitializedCatalog: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now }
}, { strict: false });

export default mongoose.models.Setting || mongoose.model('Setting', SettingSchema);
