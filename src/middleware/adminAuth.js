const crypto = require('crypto');

function timingSafeEqual(a, b) {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function adminAuth(req, res, next) {
  const key = process.env.ADMIN_API_KEY;

  if (!key) {
    return res.status(503).json({ error: 'Admin access not configured.' });
  }

  const auth = req.headers['authorization'];
  if (!auth || !timingSafeEqual(auth, `Bearer ${key}`)) {
    return res.status(401).json({ error: 'Unauthorised.' });
  }

  next();
}

module.exports = adminAuth;
