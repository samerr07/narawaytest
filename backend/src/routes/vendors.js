/**
 * routes/vendors.js — Vendor profile management (Scope 1.1.d, 1.1.g)
 *
 * GET  /api/vendor/profile         — Get own vendor profile
 * PUT  /api/vendor/profile         — Update own vendor profile
 * POST /api/vendor/documents       — Upload compliance document (base64, up to 10MB)
 * GET  /api/vendor/documents       — List own documents
 * GET  /api/vendor/bids            — List own bids (across all RFQs)
 */
const express = require('express');
const router  = express.Router();
const VendorProfile = require('../models/VendorProfile');
const mongoose = require('mongoose');
const { requireAuth, requireRole } = require('../middleware/auth');
const { generateId, asyncHandler, sendError } = require('../utils/helpers');

// Vendor document schema (stored inline in MongoDB — base64)
// In production: move to S3 presigned upload
const VendorDoc = mongoose.models.VendorDocument || mongoose.model('VendorDocument', new mongoose.Schema({
  doc_id:      { type: String, required: true, unique: true },
  vendor_id:   { type: String, required: true, index: true },
  user_id:     { type: String, required: true },
  doc_type:    { type: String, required: true },
  filename:    { type: String },
  content_type:{ type: String },
  data:        { type: String },   // base64 encoded file content
  status:      { type: String, default: 'pending' },
}, { timestamps: true }), 'vendor_documents');

const Bid = require('../models/Bid');

// GET /api/vendor/profile
router.get('/profile', requireAuth, requireRole('vendor'), asyncHandler(async (req, res) => {
  let profile = await VendorProfile.findOne({ user_id: req.user.user_id }).lean();
  // Auto-create if missing (e.g. old users before the profile endpoint existed)
  if (!profile) {
    profile = await VendorProfile.create({
      vendor_id:    generateId('vnd_'),
      user_id:      req.user.user_id,
      company_name: req.user.name,
    });
  }
  return res.json(profile);
}));

// PUT /api/vendor/profile
router.put('/profile', requireAuth, requireRole('vendor'), asyncHandler(async (req, res) => {
  const allowed = [
    'company_name', 'description', 'location', 'website',
    'contact_person', 'contact_phone', 'energy_types',
    'capacity_mw', 'carbon_credits_ccts', 'certifications',
  ];
  const updates = {};
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const profile = await VendorProfile.findOneAndUpdate(
    { user_id: req.user.user_id },
    { $set: updates },
    { new: true, upsert: true }
  );
  return res.json(profile);
}));

// POST /api/vendor/documents — base64 file upload
router.post('/documents', requireAuth, requireRole('vendor'), asyncHandler(async (req, res) => {
  const { doc_type, filename, content_type, data } = req.body;
  if (!doc_type || !data) return sendError(res, 400, 'doc_type and data are required');

  // Enforce ~10MB limit on base64 data
  if (data.length > 14_000_000) return sendError(res, 400, 'File too large (max 10MB)');

  const profile = await VendorProfile.findOne({ user_id: req.user.user_id }).lean();
  if (!profile) return sendError(res, 404, 'Vendor profile not found');

  // Upsert: one document per type per vendor
  const doc = await VendorDoc.findOneAndUpdate(
    { vendor_id: profile.vendor_id, doc_type },
    { $set: { doc_id: generateId('doc_'), user_id: req.user.user_id, filename, content_type, data, status: 'pending' } },
    { new: true, upsert: true }
  );
  const { data: _, ...safe } = doc.toObject();  // never return base64 in list
  return res.status(201).json(safe);
}));

// GET /api/vendor/documents
router.get('/documents', requireAuth, requireRole('vendor'), asyncHandler(async (req, res) => {
  const profile = await VendorProfile.findOne({ user_id: req.user.user_id }).lean();
  if (!profile) return res.json([]);
  // Exclude base64 data from list response (only return metadata)
  const docs = await VendorDoc.find({ vendor_id: profile.vendor_id }).select('-data').lean();
  return res.json(docs);
}));

// GET /api/vendor/bids — vendor's own bids across all RFQs
router.get('/bids', requireAuth, requireRole('vendor'), asyncHandler(async (req, res) => {
  const bids = await Bid.find({ vendor_id: req.user.user_id }).sort({ createdAt: -1 }).lean();
  return res.json(bids);
}));

module.exports = router;
