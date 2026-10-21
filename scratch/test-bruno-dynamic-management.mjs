import assert from 'assert';

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('--- Starting Bruno & Local Storage Verification ---');

  // 1. Check media storage status
  console.log('1. Checking /api/media/status...');
  const mediaRes = await fetch(`${BASE_URL}/api/media/status`);
  const mediaStatus = await mediaRes.json();
  console.log('Media Status:', mediaStatus);
  assert.strictEqual(mediaStatus.provider, 'local-filesystem');
  assert.strictEqual(mediaStatus.configured, true);

  // 2. Upload test image to local disk
  console.log('2. Testing /api/upload to local disk...');
  const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'bruno_test_tee.png',
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    })
  });
  const uploadData = await uploadRes.json();
  console.log('Upload Result:', uploadData);
  assert.ok(uploadData.secure_url.startsWith('/uploads/'));
  assert.strictEqual(uploadData.provider, 'local');

  // 3. Get all products and ensure no cloudinary
  console.log('3. Checking /api/products for any Cloudinary URLs...');
  const prodRes = await fetch(`${BASE_URL}/api/products`);
  const products = await prodRes.json();
  console.log(`Found ${products.length} active products.`);
  const anyCloudinary = JSON.stringify(products).includes('cloudinary');
  assert.strictEqual(anyCloudinary, false, 'No products should contain cloudinary URLs');

  // 4. Create new product drop via Bruno-style management API
  console.log('4. Testing POST /api/management/products (Create Product Drop)...');
  const createRes = await fetch(`${BASE_URL}/api/management/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bruno Custom Drop Test Tee',
      price: 799,
      category: 'graphic',
      badge: 'LIMITED',
      image: uploadData.secure_url,
      stock: { S: 10, M: 20, L: 15, XL: 5, XXL: 2 }
    })
  });
  const created = await createRes.json();
  console.log('Created Product ID:', created.id);
  assert.ok(created.id);
  const testProductId = created.id;

  // 5. Get single product using testProductId (Bruno: {{baseUrl}}/api/products/{{productId}})
  console.log(`5. Testing GET /api/products/${testProductId}...`);
  const getSingleRes = await fetch(`${BASE_URL}/api/products/${testProductId}`);
  const singleProd = await getSingleRes.json();
  assert.strictEqual(singleProd.id, testProductId);
  assert.strictEqual(singleProd.name, 'Bruno Custom Drop Test Tee');

  // 6. Update product drop (Bruno: {{baseUrl}}/api/management/products/{{productId}})
  console.log(`6. Testing PUT /api/management/products/${testProductId}...`);
  const updateRes = await fetch(`${BASE_URL}/api/management/products/${testProductId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      price: 849,
      badge: 'SELLING FAST'
    })
  });
  const updated = await updateRes.json();
  assert.strictEqual(updated.price, 849);
  assert.strictEqual(updated.badge, 'SELLING FAST');

  // 7. Adjust stock (Bruno: {{baseUrl}}/api/management/products/{{productId}}/stock)
  console.log(`7. Testing PUT /api/management/products/${testProductId}/stock...`);
  const stockRes = await fetch(`${BASE_URL}/api/management/products/${testProductId}/stock`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      size: 'M',
      setQuantity: 42
    })
  });
  const stockUpdated = await stockRes.json();
  assert.strictEqual(stockUpdated.stock.M, 42);

  // 8. Delete product drop (Bruno: {{baseUrl}}/api/management/products/{{productId}})
  console.log(`8. Testing DELETE /api/management/products/${testProductId}...`);
  const delRes = await fetch(`${BASE_URL}/api/management/products/${testProductId}`, {
    method: 'DELETE'
  });
  const delResult = await delRes.json();
  assert.strictEqual(delResult.success, true);

  // 9. Verify product is gone
  const verifyRes = await fetch(`${BASE_URL}/api/products/${testProductId}`);
  assert.strictEqual(verifyRes.status, 404);

  console.log('✅ ALL TESTS PASSED: Cloudinary removed & dynamic product management working flawlessly!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
