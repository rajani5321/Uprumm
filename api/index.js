import app from '../server/server.js';
import { connectDB } from '../server/db.js';

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (e) {
    console.warn('[Vercel DB Notice]', e.message);
  }

  try {
    const urlObj = new URL(req.url, 'http://localhost');
    const forwardedPath = urlObj.searchParams.get('__path');
    if (forwardedPath) {
      urlObj.searchParams.delete('__path');
      const remainingQuery = urlObj.search ? urlObj.search : '';
      req.url = forwardedPath + remainingQuery;
    } else {
      const matched = req.headers['x-matched-path'] || req.headers['x-forwarded-url'] || req.originalUrl;
      if (matched && matched.startsWith('/api') && !matched.includes('/api/index.js')) {
        const qIndex = req.url.indexOf('?');
        const query = qIndex !== -1 ? req.url.slice(qIndex) : '';
        req.url = matched + (matched.includes('?') ? '' : query);
      }
    }
  } catch (e) {
    console.warn('[Vercel Handler Notice] URL parse notice:', e.message);
  }

  return app(req, res);
}
