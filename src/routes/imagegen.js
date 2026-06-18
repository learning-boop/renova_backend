const express = require('express');
const { rateLimit } = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const pool = require('../db/pool');
const { generateTreatmentPreview } = require('../services/fal');

const router = express.Router();

// Rate limit image generation (expensive operation)
const imageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Image generation limit reached. Please try again in an hour.' },
});

// Store uploads in memory and forward to fal.ai
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed.'));
    }
  },
});

const VALID_TREATMENTS = [
  'smooth-lines', 'face-sculpt', 'skin-glow', 'collagen-restore',
  'clear-skin', 'neck-renewal', 'full-face-refresh', 'stay-youthful',
];

// POST /api/imagegen/preview — generate treatment preview
router.post('/preview', imageLimiter, upload.single('image'), async (req, res, next) => {
  try {
    const { treatment, sessionKey } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a photo.' });
    }

    if (!treatment || !VALID_TREATMENTS.includes(treatment)) {
      return res.status(400).json({ error: 'Invalid treatment selected.' });
    }

    // Convert uploaded file to base64 data URL for fal.ai
    const base64 = req.file.buffer.toString('base64');
    const imageUrl = `data:${req.file.mimetype};base64,${base64}`;

    // Resolve session ID if provided
    let sessionId = null;
    if (sessionKey) {
      const s = await pool.query(
        `SELECT id FROM chat_sessions WHERE session_key = $1`,
        [sessionKey]
      );
      if (s.rowCount > 0) sessionId = s.rows[0].id;
    }

    // Save pending record
    const record = await pool.query(
      `INSERT INTO image_generations (session_id, treatment, prompt, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id`,
      [sessionId, treatment, treatment]
    );
    const generationId = record.rows[0].id;

    // Generate via fal.ai
    const { resultUrl, falRequestId } = await generateTreatmentPreview(imageUrl, treatment);

    // Update record
    await pool.query(
      `UPDATE image_generations
       SET result_url = $1, fal_request_id = $2, status = 'done'
       WHERE id = $3`,
      [resultUrl, falRequestId, generationId]
    );

    res.json({
      success: true,
      generationId,
      resultUrl,
      disclaimer: 'This is an AI-generated simulation. Actual results will vary and depend on individual factors. A personal consultation is recommended.',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/imagegen/:id — fetch a generation result
router.get('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, treatment, result_url, status, created_at FROM image_generations WHERE id = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Generation not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
