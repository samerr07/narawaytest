/**
 * routes/contact.js — Contact form (MOU Scope 1.1.i — static company website)
 * POST /api/contact — Stores contact enquiry from Landing page form
 */
const express   = require('express');
const router    = express.Router();
const mongoose  = require('mongoose');
const { generateId, asyncHandler, sendError } = require('../utils/helpers');

// Inline model for contact messages
const Contact = mongoose.models.Contact || mongoose.model('Contact', new mongoose.Schema({
  contact_id: { type: String, required: true, unique: true },
  name:       { type: String, required: true },
  email:      { type: String, required: true },
  company:    { type: String },
  message:    { type: String, required: true },
  status:     { type: String, default: 'new' },
}, { timestamps: true }), 'contacts');

router.post('/', asyncHandler(async (req, res) => {
  const { name, email, company, message } = req.body;
  if (!name || !email || !message) return sendError(res, 400, 'name, email and message are required');

  await Contact.create({ contact_id: generateId('cnt_'), name, email, company, message });
  return res.json({ success: true, message: 'Thank you! We will be in touch shortly.' });
}));

module.exports = router;
