import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashCustomerPassword,
  signAdminToken,
  verifyAdminToken,
  revokeAdminToken,
  sanitizeUser,
  validateAdminCredentials
} from '../server/security.js';
import { INITIAL_SETTINGS } from '../server/dynamicStore.js';

test('Security Module - Password Hashing', () => {
  const password = 'securePassword123!';
  const hashed = hashCustomerPassword(password);
  assert.ok(typeof hashed === 'string' && hashed.length === 64, 'Hashed password should be a 64-char hex string');
  
  // Re-hashing same password should match deterministic HMAC
  const secondHash = hashCustomerPassword(password);
  assert.strictEqual(hashed, secondHash, 'Hashing the same password must produce identical result');
  
  // Empty password returns empty string
  assert.strictEqual(hashCustomerPassword(''), '');
});

test('Security Module - Admin JWT Tokens', () => {
  const token = signAdminToken({ email: 'admin@test.com' });
  assert.ok(typeof token === 'string' && token.length > 20, 'JWT token should be generated');

  const decoded = verifyAdminToken(token);
  assert.ok(decoded, 'Token should verify successfully');
  assert.strictEqual(decoded.email, 'admin@test.com');
  assert.strictEqual(decoded.role, 'admin');

  // Token revocation test
  revokeAdminToken(token);
  const decodedAfterRevoke = verifyAdminToken(token);
  assert.strictEqual(decodedAfterRevoke, null, 'Revoked token must not verify');
});

test('Security Module - Admin Credential Validation', () => {
  assert.strictEqual(validateAdminCredentials('admin@uprumm.com', 'admin@123'), true);
  assert.strictEqual(validateAdminCredentials('invalid@example.com', 'wrongpassword'), false);
  assert.strictEqual(validateAdminCredentials('', ''), false);
});

test('Security Module - User Sanitization', () => {
  const sensitiveUser = {
    _id: '123',
    name: 'Test Customer',
    email: 'customer@test.com',
    password: 'supersecretpassword123',
    role: 'customer'
  };

  const safeUser = sanitizeUser(sensitiveUser);
  assert.strictEqual(safeUser.password, undefined, 'Password must be stripped from sanitized user');
  assert.strictEqual(safeUser.name, 'Test Customer');
  assert.strictEqual(safeUser.email, 'customer@test.com');
});

test('Dynamic Store - Initial Settings Integrity', () => {
  assert.ok(INITIAL_SETTINGS, 'INITIAL_SETTINGS should be defined');
  assert.strictEqual(INITIAL_SETTINGS.key, 'global_settings');
  assert.ok(typeof INITIAL_SETTINGS.freeShippingThreshold === 'number');
  assert.ok(typeof INITIAL_SETTINGS.standardShippingFee === 'number');
});
