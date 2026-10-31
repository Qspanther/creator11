// ─── High-Speed In-Memory Micro-Cache Middleware ───
// Eliminates repetitive SQLite query storms during traffic surges.
// Serves repeated GET requests from RAM in <1ms without hitting disk.

const cacheStore = new Map();

/**
 * In-memory cache middleware
 * @param {number} ttlSeconds Time-to-live in seconds
 */
function memoryCache(ttlSeconds = 5) {
  const ttlMs = ttlSeconds * 1000;

  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Do not cache authenticated user-specific requests
    if (req.headers.authorization && !req.originalUrl.startsWith('/tournaments') && !req.originalUrl.startsWith('/creators')) {
      return next();
    }

    const cacheKey = `${req.originalUrl || req.url}`;
    const cached = cacheStore.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp < ttlMs)) {
      res.setHeader('X-Cache-Status', 'HIT');
      res.setHeader('Content-Type', 'application/json');
      return res.send(cached.body);
    }

    // Intercept res.send / res.json
    const originalSend = res.send.bind(res);

    res.send = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheStore.set(cacheKey, {
          timestamp: Date.now(),
          body: typeof body === 'string' ? body : JSON.stringify(body),
        });
      }
      res.setHeader('X-Cache-Status', 'MISS');
      return originalSend(body);
    };

    next();
  };
}

/**
 * Purge all or specific cached routes (e.g. when an admin mutates tournaments or creators)
 */
function purgeCache(prefix = '') {
  if (!prefix) {
    cacheStore.clear();
  } else {
    for (const key of cacheStore.keys()) {
      if (key.startsWith(prefix)) {
        cacheStore.delete(key);
      }
    }
  }
}

module.exports = { memoryCache, purgeCache };

