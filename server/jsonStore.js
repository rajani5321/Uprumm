import { dynamicStore, INITIAL_PRODUCTS, INITIAL_SETTINGS, INITIAL_USERS } from './dynamicStore.js';

export function getFilePath(collectionName) {
  return '';
}

export function readJson(collectionName, defaultValue = []) {
  if (collectionName === 'products' || collectionName === 'catalog_management') {
    return dynamicStore.products || INITIAL_PRODUCTS;
  }
  if (collectionName === 'orders') return dynamicStore.orders || [];
  if (collectionName === 'users') return dynamicStore.users || INITIAL_USERS;
  if (collectionName === 'settings') return dynamicStore.settings || INITIAL_SETTINGS;
  return defaultValue;
}

export function writeJson(collectionName, data) {
  // Pure dynamic store: file writes are deprecated and skipped safely
  return true;
}

export async function syncDatabaseToJson(models) {
  return true;
}

export default {
  readJson,
  writeJson,
  getFilePath,
  syncDatabaseToJson
};
