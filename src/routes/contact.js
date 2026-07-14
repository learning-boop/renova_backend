const express = require('express');
const { rateLimit } = require('express-rate-limit');
const pool = require('../db/pool');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// Stricter rate limit for form submissions
const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'Too many submissions. Please try again later.' },
});

// POST /api/contact — submit contact form
router.post('/', formLimiter, async (req, res, next) => {
  try {
    const { name, email, phone, service, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    if (name.trim().length > 150) {
      return res.status(400).json({ error: 'Name is too long.' });
    }

    if (message.trim().length > 5000) {
      return res.status(400).json({ error: 'Message is too long. Maximum 5000 characters.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    const result = await pool.query(
      `INSERT INTO contacts (name, email, phone, service, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [name.trim(), email.trim().toLowerCase(), phone || null, service || null, message.trim()]
    );

    res.status(201).json({
      success: true,
      id: result.rows[0].id,
      message: "Thank you! We'll be in touch soon.",
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/contact — list all submissions (admin use)
router.get('/', adminAuth, async (req, res, next) => {
  try {
    const { status } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    let query = `SELECT * FROM contacts`;
    const params = [];

    if (status) {
      if (!['new', 'read', 'replied'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status filter.' });
      }
      params.push(status);
      query += ` WHERE status = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({ data: result.rows, count: result.rowCount });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/contact/:id/status — update contact status
router.patch('/:id/status', adminAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['new', 'read', 'replied'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    const result = await pool.query(
      `UPDATE contacts SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Contact not found.' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
