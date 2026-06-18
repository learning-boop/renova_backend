const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const { chat } = require('../services/claude');

const router = express.Router();

// Rate limit chat messages
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { error: 'Too many messages. Please slow down.' },
});

// POST /api/chat/session — start a new chat session
router.post('/session', async (req, res, next) => {
  try {
    const { clientName, clientEmail } = req.body;
    const sessionKey = uuidv4();

    const result = await pool.query(
      `INSERT INTO chat_sessions (session_key, client_name, client_email)
       VALUES ($1, $2, $3)
       RETURNING id, session_key, created_at`,
      [sessionKey, clientName || null, clientEmail || null]
    );

    res.status(201).json({
      sessionId: result.rows[0].id,
      sessionKey: result.rows[0].session_key,
      createdAt: result.rows[0].created_at,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/chat/message — send a message in a session
router.post('/message', chatLimiter, async (req, res, next) => {
  try {
    const { sessionKey, message } = req.body;

    if (!sessionKey || !message) {
      return res.status(400).json({ error: 'sessionKey and message are required.' });
    }

    // Get session
    const sessionResult = await pool.query(
      `SELECT * FROM chat_sessions WHERE session_key = $1 AND status = 'active'`,
      [sessionKey]
    );

    if (sessionResult.rowCount === 0) {
      return res.status(404).json({ error: 'Session not found or closed.' });
    }

    const session = sessionResult.rows[0];

    // Load conversation history (last 20 messages)
    const historyResult = await pool.query(
      `SELECT role, content FROM chat_messages
       WHERE session_id = $1
       ORDER BY created_at ASC
       LIMIT 20`,
      [session.id]
    );

    const history = historyResult.rows;

    // Get Claude's response
    const assistantReply = await chat(history, message.trim());

    // Persist both messages
    await pool.query(
      `INSERT INTO chat_messages (session_id, role, content) VALUES ($1, $2, $3), ($1, $4, $5)`,
      [session.id, 'user', message.trim(), 'assistant', assistantReply]
    );

    // Update session timestamp
    await pool.query(
      `UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1`,
      [session.id]
    );

    res.json({ reply: assistantReply });
  } catch (err) {
    next(err);
  }
});

// GET /api/chat/history/:sessionKey — fetch message history
router.get('/history/:sessionKey', async (req, res, next) => {
  try {
    const { sessionKey } = req.params;

    const sessionResult = await pool.query(
      `SELECT id FROM chat_sessions WHERE session_key = $1`,
      [sessionKey]
    );

    if (sessionResult.rowCount === 0) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const messages = await pool.query(
      `SELECT role, content, created_at FROM chat_messages
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionResult.rows[0].id]
    );

    res.json({ messages: messages.rows });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/chat/session/:sessionKey — close a session
router.delete('/session/:sessionKey', async (req, res, next) => {
  try {
    const { sessionKey } = req.params;

    await pool.query(
      `UPDATE chat_sessions SET status = 'closed', updated_at = NOW()
       WHERE session_key = $1`,
      [sessionKey]
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
