# ⚡ Uprumm E-Commerce Bruno API Collection

Complete API Collection for testing and managing the **Uprumm E-Commerce Platform**, designed for [Bruno](https://www.usebruno.com/) (fast, Git-friendly, open-source API client).

---

## 🚀 How to Open in Bruno

1. Download and install **[Bruno](https://www.usebruno.com/downloads)** if you haven't already.
2. Open Bruno and click **"Open Collection"**.
3. Select the `bruno` folder located at the root of this project:
   ```
   c:\Users\rajan\OneDrive\Documents\GitHub\Uprumm\bruno
   ```
4. In the top-right corner of Bruno, select your environment:
   - **`Local`** ➔ `http://localhost:3000` (for local development)
   - **`Production`** ➔ `https://uprumm.vercel.app` (for live deployment)

---

## 📁 Collection Structure

### 1. `1-Products`
- `Get All Products` ➔ `GET /api/products` — Retrieve all active catalog & custom drops.
- `Get Single Product` ➔ `GET /api/products/:id` — Retrieve a single product by ID.

### 2. `2-Management-Catalog` (Admin Studio)
- `Studio Overview Stats` ➔ `GET /api/management/overview` — Live KPIs (revenue, active orders, total drops, low stock counts).
- `Get Management Products` ➔ `GET /api/management/products` — Live products list for admin catalog.
- `Create New Product Drop` ➔ `POST /api/management/products` — Add a new custom drop with sizes, prices, and photo/artwork.
- `Update Product Drop` ➔ `PUT /api/management/products/:id` — Edit an existing product drop (uses `{{productId}}`).
- `Adjust Product Stock` ➔ `PUT /api/management/products/:id/stock` — Adjust size-wise stock count (uses `{{productId}}`).
- `Remove Design Artwork` ➔ `PUT /api/management/products/:id/remove-design` — Turn graphic tee into plain minimal tee (uses `{{productId}}`).
- `Delete Product Drop` ➔ `DELETE /api/management/products/:id` — Permanently delete any product from store and database (uses `{{productId}}`).
- `Get Deleted Product IDs` ➔ `GET /api/management/deleted-ids` — List permanently blacklisted product IDs.
- `Reset Catalog to Demo Seed` ➔ `POST /api/management/reset-catalog` — Restore fresh demo drops.

> 💡 **Managing Any Product in Bruno**:
> Set `productId` in your active Bruno environment (`Local` or `Production`), or override it in Bruno's request variable tab to instantly manage ANY product in the catalog!

### 3. `3-Orders`
- `Get All Orders` ➔ `GET /api/management/orders` — List customer orders with items, pricing, and courier details.
- `Create Store Order` ➔ `POST /api/orders` — Place a new customer order.
- `Update Order Fulfillment Status` ➔ `PUT /api/management/orders/:id/status` — Mark order status (`placed`, `confirmed`, `printing`, `shipped`, `delivered`).
- `Update Courier AWB Number` ➔ `PUT /api/management/orders/:id` — Set Delhivery / Blue Dart AWB courier tracking number.
- `Delete Order` ➔ `DELETE /api/management/orders/:id` — Delete cancelled or test order.

### 4. `4-Customers`
- `Get All Customers` ➔ `GET /api/management/customers` — Customer accounts with lifetime spend and order history.
- `Register or Update Customer` ➔ `POST /api/users` — Register a customer account or update profile details.
- `Update Customer Details` ➔ `PUT /api/management/customers/:id` — Admin update for customer contact info.
- `Delete Customer` ➔ `DELETE /api/management/customers/:id` — Delete customer account.

### 5. `5-Settings-Sync`
- `Get Store Settings` ➔ `GET /api/management/settings` — Razorpay credentials, shipping rates, and store config.
- `Update Store Settings` ➔ `POST /api/settings` — Update shipping thresholds, fees, and gateway mode.
- `Check Multi-Device Sync Status` ➔ `GET /api/sync/status` — Ultra-fast sync version checking for real-time multi-device sync.

### 6. `6-Payments`
- `Create Razorpay Order` ➔ `POST /api/create-order` — Generate Razorpay Order ID for online checkout.
- `Verify Payment Signature` ➔ `POST /api/verify-payment` — Verify payment signature after checkout.

### 7. `7-Media-Upload` (Self-Hosted Local Storage)
- `Upload Mockup or Artwork` ➔ `POST /api/upload` — Upload T-shirt mockup or transparent logo artwork directly to local disk (`uploads/` directory).
- `Media Storage Status` ➔ `GET /api/media/status` — Inspect local storage status and storage folder path.

---

## 🛠️ Testing with Bruno CLI (Optional)

If you have `@usebruno/cli` installed globally, you can also run all requests from your terminal:

```bash
bru run --env Local
```
