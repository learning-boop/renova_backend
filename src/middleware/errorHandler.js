function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${err.message}`);

  // Multer file errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 8MB.' });
  }

  // Validation errors surfaced as plain errors
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  // Anthropic API errors
  if (err.message?.includes('anthropic') || err.constructor?.name === 'APIError') {
    return res.status(502).json({ error: 'AI service temporarily unavailable.' });
  }

  res.status(500).json({ error: 'Something went wrong. Please try again.' });
}

module.exports = errorHandler;
