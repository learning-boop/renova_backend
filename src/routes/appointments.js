const express = require('express');
const { rateLimit } = require('express-rate-limit');
const pool = require('../db/pool');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'Too many booking requests. Please try again later.' },
});

// POST /api/appointments — book an appointment (client facing)
router.post('/', bookingLimiter, async (req, res, next) => {
  try {
    const { name, email, phone, service, preferred_date, preferred_time, notes } = req.body;

    if (!name || !email || !service || !preferred_date || !preferred_time) {
      return res.status(400).json({
        error: 'Name, email, service, preferred_date, and preferred_time are required.',
      });
    }

    if (name.trim().length > 150) {
      return res.status(400).json({ error: 'Name is too long.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(preferred_date)) {
      return res.status(400).json({ error: 'preferred_date must be in YYYY-MM-DD format.' });
    }

    if (new Date(preferred_date) < new Date().setHours(0, 0, 0, 0)) {
      return res.status(400).json({ error: 'preferred_date cannot be in the past.' });
    }

    const result = await pool.query(
      `INSERT INTO appointments (name, email, phone, service, preferred_date, preferred_time, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        phone || null,
        service.trim(),
        preferred_date,
        preferred_time.trim(),
        notes ? notes.trim() : null,
      ]
    );

    res.status(201).json({
      success: true,
      id: result.rows[0].id,
      message: "Your appointment request has been received. We'll confirm shortly.",
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments — list all appointments (admin)
router.get('/', adminAuth, async (req, res, next) => {
  try {
    const { status, date } = req.query;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 200);
    const offset = Math.max(parseInt(req.query.offset) || 0, 0);

    const params = [];
    const conditions = [];

    if (status) {
      if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status filter.' });
      }
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (date) {
      params.push(date);
      conditions.push(`preferred_date = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const result = await pool.query(
      `SELECT * FROM appointments ${where}
       ORDER BY preferred_date ASC, preferred_time ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ data: result.rows, count: result.rowCount });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/:id — get single appointment (admin)
router.get('/:id', adminAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM appointments WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/appointments/:id/status — update status (admin)
router.patch('/:id/status', adminAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be pending, confirmed, cancelled, or completed.' });
    }

    const result = await pool.query(
      `UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/appointments/:id — cancel/delete an appointment (admin)
router.delete('/:id', adminAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM appointments WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
