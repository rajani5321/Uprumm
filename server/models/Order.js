import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  id: { type: mongoose.Schema.Types.Mixed, default: 1 },
  name: { type: String, default: '' },
  title: { type: String, default: '' },
  price: { type: Number, default: 0 },
  size: { type: String, default: 'M' },
  color: { type: String, default: '' },
  qty: { type: Number, default: 1 },
  image: { type: String, default: '' }
}, { _id: false, strict: false });

const OrderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  date: { type: String, default: () => new Date().toISOString().replace('T', ' ').substring(0, 16) },
  customer: {
    name: { type: String, default: 'Customer' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' }
  },
  items: [OrderItemSchema],
  subtotal: { type: Number, default: 0 },
  itemsTotal: { type: Number, default: 0 },
  shippingFee: { type: Number, default: 0 },
  codFee: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  paymentMethod: { type: String, default: 'Razorpay Online' },
  paymentId: { type: String, default: '' },
  paymentStatus: { type: String, default: 'PAID' },
  fulfillmentStatus: {
    type: String,
    enum: ['placed', 'confirmed', 'printing', 'shipped', 'delivered'],
    default: 'confirmed'
  },
  awb: { type: String, default: '' },
  courier: { type: String, default: 'BlueDart Priority Air' },
  estimatedDelivery: { type: String, default: 'In 3-4 business days' },
  createdAt: { type: Date, default: Date.now }
}, { strict: false });

// Ensure item title and name are both populated
OrderSchema.pre('validate', function() {
  if (this.items && Array.isArray(this.items)) {
    this.items.forEach(item => {
      if (!item.name && item.title) item.name = item.title;
      if (!item.title && item.name) item.title = item.name;
    });
  }
});

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
