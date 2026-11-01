// ─── Idempotency Protection Middleware (Big Tech Architecture) ───
// Prevents duplicate transactions and multi-click race conditions.
// Keeps an in-memory cache of in-flight and recently completed mutations.

const idempotencyStore = new Map();

// Auto-cleanup stale keys every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of idempotencyStore.entries()) {
    if (now - item.timestamp > 30000) {
      idempotencyStore.delete(key);
    }
  }
}, 60000);

function idempotency(ttlSeconds = 10) {
  const ttlMs = ttlSeconds * 1000;

  return (req, res, next) => {
    // Only apply to state-mutating requests (POST, PUT, DELETE)
    if (req.method === 'GET') {
      return next();
    }

    // Determine unique idempotency key
    const headerKey = req.headers['x-idempotency-key'];
    const userId = req.user ? req.user.id : 'anon';
    const payloadHash = JSON.stringify(req.body || {});
    const key = headerKey
      ? `key:${headerKey}`
      : `idem:${userId}:${req.baseUrl}${req.path}:${payloadHash.length}:${payloadHash.slice(0, 80)}`;

    const existing = idempotencyStore.get(key);

    if (existing) {
      if (existing.status === 'in-flight') {
        return res.status(409).json({
          error: 'Duplicate request in flight. Please wait a moment.',
          retryAfter: 1,
        });
      }

      if (existing.status === 'completed' && Date.now() - existing.timestamp < ttlMs) {
        res.setHeader('X-Idempotent-Replay', 'true');
        return res.status(existing.statusCode).json(existing.body);
      }
    }

    // Mark as in-flight
    idempotencyStore.set(key, {
      status: 'in-flight',
      timestamp: Date.now(),
    });

    // Intercept json response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      idempotencyStore.set(key, {
        status: 'completed',
        statusCode: res.statusCode,
        body,
        timestamp: Date.now(),
      });
      return originalJson(body);
    };

    next();
  };
}

module.exports = { idempotency };
