const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { chat } = require('../services/claude');

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { error: 'Too many messages. Please slow down.' },
});

// POST /api/chat/message — stateless: frontend sends full history + new message
router.post('/message', chatLimiter, async (req, res, next) => {
  try {
    const { messages, message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required.' });
    }

    if (message.trim().length > 2000) {
      return res.status(400).json({ error: 'Message is too long. Maximum 2000 characters.' });
    }

    // Validate and sanitise history — only accept well-formed user/assistant turns
    const VALID_ROLES = new Set(['user', 'assistant']);
    const history = (Array.isArray(messages) ? messages : [])
      .filter(
        (m) =>
          m &&
          typeof m === 'object' &&
          VALID_ROLES.has(m.role) &&
          typeof m.content === 'string' &&
          m.content.length > 0
      )
      .slice(-40) // cap at 40 turns to limit API cost
      .map((m) => ({ role: m.role, content: m.content }));

    const reply = await chat(history, message.trim());

    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
