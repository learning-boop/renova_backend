function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${err.message}`);

  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err.message?.includes('anthropic') || err.constructor?.name === 'APIError') {
    return res.status(502).json({ error: 'AI service temporarily unavailable.' });
  }

  res.status(500).json({ error: 'Something went wrong. Please try again.' });
}

module.exports = errorHandler;
