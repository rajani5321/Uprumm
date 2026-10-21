import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  subtitle: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  comparePrice: { type: Number },
  category: { type: String, default: 'graphic' },
  badge: { type: String, default: '' },
  description: { type: String, default: '' },
  image: { type: String, required: true },
  logoOverlay: { type: String, default: null },
  color: { type: String, default: '#18191a' },
  colors: [{ type: String }],
  stock: {
    S: { type: Number, default: 10, min: 0 },
    M: { type: Number, default: 15, min: 0 },
    L: { type: Number, default: 12, min: 0 },
    XL: { type: Number, default: 8, min: 0 },
    XXL: { type: Number, default: 5, min: 0 }
  },
  createdAt: { type: Date, default: Date.now }
}, { strict: false });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
