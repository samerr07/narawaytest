/**
 * routes/contracts.js — Contract lifecycle management
 *
 * GET   /api/contracts                    — List contracts for current user (client or vendor)
 * GET   /api/contracts/:contract_id       — Get single contract
 * PATCH /api/contracts/:contract_id/respond — Vendor accepts or declines contract
 */
const express   = require('express');
const router    = express.Router();
const Contract  = require('../models/Contract');
const User      = require('../models/User');
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');
const { generateId, asyncHandler, sendError } = require('../utils/helpers');
const { sendContractAccepted } = require('../utils/email');

async function notify(userId, type, message, relatedId) {
  try { await Notification.create({ notification_id: generateId('ntf_'), user_id: userId, type, message, related_id: relatedId }); } catch {}
}

// GET /api/contracts
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const query = req.user.role === 'client'
    ? { client_id: req.user.user_id }
    : { vendor_id: req.user.user_id };
  const contracts = await Contract.find(query).sort({ createdAt: -1 }).lean();
  return res.json(contracts);
}));

// GET /api/contracts/:contract_id
router.get('/:contract_id', requireAuth, asyncHandler(async (req, res) => {
  const c = await Contract.findOne({ contract_id: req.params.contract_id }).lean();
  if (!c) return sendError(res, 404, 'Contract not found');
  if (c.client_id !== req.user.user_id && c.vendor_id !== req.user.user_id && req.user.role !== 'admin')
    return sendError(res, 403, 'Access denied');
  return res.json(c);
}));

// PATCH /api/contracts/:contract_id/respond — vendor accept/decline
router.patch('/:contract_id/respond', requireAuth, asyncHandler(async (req, res) => {
  const { action, notes } = req.body;  // action: 'accept' | 'decline'
  if (!['accept', 'decline'].includes(action)) return sendError(res, 400, 'action must be accept or decline');

  const contract = await Contract.findOne({ contract_id: req.params.contract_id });
  if (!contract) return sendError(res, 404, 'Contract not found');
  if (contract.vendor_id !== req.user.user_id) return sendError(res, 403, 'Not your contract');
  if (contract.status !== 'pending_vendor_acceptance') return sendError(res, 400, 'Contract already responded to');

  contract.status      = action === 'accept' ? 'active' : 'vendor_declined';
  contract.vendor_notes = notes || '';
  await contract.save();

  // Notify client
  const msg = action === 'accept'
    ? `${req.user.name} accepted the contract for "${contract.rfq_title}"`
    : `${req.user.name} declined the contract for "${contract.rfq_title}"`;
  await notify(contract.client_id, `contract_${action}ed`, msg, contract.contract_id);

  if (action === 'accept') {
    const clientUser = await User.findOne({ user_id: contract.client_id }).lean();
    if (clientUser) sendContractAccepted({ clientEmail: clientUser.email, rfqTitle: contract.rfq_title, vendorName: req.user.name });
  }

  return res.json(contract);
}));

module.exports = router;
