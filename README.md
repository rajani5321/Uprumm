# Uprumm — Complete Online Streetwear & Graphic Apparel Platform (v2.0)

A high-aesthetic, mobile-first e-commerce platform for **Uprumm**, designed for selling original printwear and enabling custom T-shirt & logo drops.

---

## ⚡ What's New in Version 2.0

### 1. Customer Accounts & Profile Management
- **User Registration & Login**: Full shopper onboarding with name, email, phone number, and password.
- **1-Click Demo Login**: Instant test authentication as sample customer *Priya Sharma*.
- **Customer Account Drawer**: View profile details, saved shipping addresses, and complete order history with real-time tracking badges.

### 2. Product & Custom Drop Management
- **Admin Product Studio**: Create, edit, and delete T-shirts directly from the dashboard.
- **Custom Photo Upload**: Upload your own T-shirt product photography (PNG, JPG, WebP) directly from your computer with automatic Base64 persistent storage.
- **Logo Artwork Overlay**: Upload custom transparent logos or graphic artwork and preview them live on the T-shirt canvas mockup.
- **Pricing & Multi-Size Inventory**: Set selling prices, compare-at prices, badge labels, and track inventory independently across sizes **S, M, L, XL, XXL**.

### 3. Online Payments (Razorpay Integration)
- **Official Razorpay Checkout SDK**: Loaded via `https://checkout.razorpay.com/v1/checkout.js`.
- **Dual Mode Operation**:
  - **Simulated Interactive Gateway** (Default): A branded Razorpay modal for testing UPI QR scanning, UPI ID (`user@okhdfcbank`), credit/debit cards, and Netbanking without live bank accounts.
  - **Live Gateway Mode**: Enter your `Razorpay Key ID` in Admin Settings to trigger live payment popups.
- **Cash on Delivery (COD)**: Supports cash or UPI payment on delivery with optional ₹49 handling fee.

### 4. Real-Time Order Management & Tracking
- **5-Step Shipment Stepper**: `Order Placed` ➔ `Confirmed & Paid` ➔ `Printing Studio Prep` ➔ `Dispatched / In Transit` ➔ `Delivered`.
- **Courier Integration**: Displays courier partner (**Delhivery Surface Express** or **BlueDart Priority Air**) and live AWB tracking codes (e.g. `DEL-77291884IN`).
- **GST Tax Invoices**: Generates formal, printable GST-compliant tax invoices with itemized tables, HSN codes (610910), and CGST/SGST tax breakdowns.

### 5. Merchant Admin Dashboard
- **Access**: Click **"⚡ Admin"** in the header or the mobile navigation bar.
- **Studio Overview**: Real-time KPI metrics for Gross Revenue, Active Orders, Total Products, and Low Stock Alerts.
- **Orders Manager**: 1-click order fulfillment advance (e.g. advance from *Confirmed* to *Printing*, *Shipped*, or *Delivered*).
- **Stock Matrix**: Size-by-size inventory grid with 1-click `+` and `−` stock adjusters and low-stock warnings.
- **Customer List**: Directory of registered customers, contact numbers, and lifetime order values.
- **Store Settings**: Configure Razorpay Key ID, gateway mode, and shipping fee thresholds.

### 6. Dynamic Shipping Integration
- **Indian Pincode Lookup**: Enter any 6-digit Indian pincode (e.g., `400001` Mumbai, `110001` Delhi, `560001` Bengaluru) to auto-populate City and State.
- **Dynamic Free Shipping Meter**: Visual progress bar in the bag showing how much more to add to qualify for Free Shipping (Default: ₹1,499).
- **Shipping Rates**: Standard Studio Delivery (₹99 or FREE over ₹1,499) vs Priority Express Air (₹149).

### 7. Mobile-First Shopping Experience
- **Sticky Bottom Navigation**: Quick access to *Shop*, *Search*, *Bag* (with live item counter), *Orders*, and *Account*.
- **Touch-Optimized Drawers**: Bottom sheets and sliding modals designed for one-handed mobile browsing.
- **Quick Add**: 1-tap cart additions directly from product cards.

---

## 📁 Project Directory Structure

The codebase is organized into clean, modular folders:

```text
c:\Uprumm\
├── index.html                  # Main storefront HTML entry point
├── package.json                # Project dependencies and npm start/dev scripts
├── package-lock.json
├── README.md                   # Documentation and guide
├── css\
│   └── styles.css              # Complete design system, dark mode & animations
├── js\
│   └── app.js                  # Frontend store logic, cart, admin studio, and auth
├── server\
│   └── server.js               # Express API backend & static file server
├── assets\
│   ├── images\                 # High-resolution product photos & mockups
│   │   └── README.md
│   └── icons\                  # SVG & PNG brand icons and badges
│       └── README.md
└── uploads\                    # Directory for user-uploaded custom drops & logos
    └── README.md
```

---

## 🚀 How to Run Locally

### Option A: Static Browser Run (Zero Setup)
Simply double-click `index.html` or open with VS Code Live Server. All data, products, uploaded images, and accounts persist in your browser's `localStorage`.

### Option B: Node.js Express Server
Run the companion backend server for local serving and API endpoints:
```bash
# 1. Install dependencies (if not already installed)
npm install

# 2. Start the server
npm start
```
Then visit **`http://localhost:3000`** in your browser.

---

