/**
 * routes/admin.js — Admin governance (Scope 1.1.e)
 *
 * GET   /api/admin/analytics       — Platform KPIs for overview dashboard
 * GET   /api/admin/users           — All users list
 * PATCH /api/admin/users/:user_id  — Update user role / is_active / verification_status
 * GET   /api/admin/vendors         — All vendor profiles with user info
 * GET   /api/admin/rfqs            — All RFQs
 * GET   /api/admin/contracts       — All contracts
 */
const express   = require('express');
const router    = express.Router();
const User      = require('../models/User');
const RFQ       = require('../models/RFQ');
const Bid       = require('../models/Bid');
const VendorProfile = require('../models/VendorProfile');
const Contract  = require('../models/Contract');
const Notification = require('../models/Notification');
const { requireAuth, requireRole } = require('../middleware/auth');
const { generateId, asyncHandler, sendError } = require('../utils/helpers');
const { sendVendorVerified } = require('../utils/email');

// All admin routes require admin role
router.use(requireAuth, requireRole('admin'));

// GET /api/admin/analytics
router.get('/analytics', asyncHandler(async (req, res) => {
  const [totalUsers, totalClients, totalVendors, openRfqs, awardedRfqs, totalRfqs, totalBids, pendingVendors, verifiedVendors] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'client' }),
    User.countDocuments({ role: 'vendor' }),
    RFQ.countDocuments({ status: 'open' }),
    RFQ.countDocuments({ status: 'awarded' }),
    RFQ.countDocuments(),
    Bid.countDocuments(),
    VendorProfile.countDocuments({ verification_status: 'pending' }),
    VendorProfile.countDocuments({ verification_status: 'verified' }),
  ]);
  return res.json({ total_users: totalUsers, total_clients: totalClients, total_vendors: totalVendors, open_rfqs: openRfqs, awarded_rfqs: awardedRfqs, total_rfqs: totalRfqs, total_bids: totalBids, pending_vendors: pendingVendors, verified_vendors: verifiedVendors });
}));

// GET /api/admin/users
router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
  return res.json(users);
}));

// PATCH /api/admin/users/:user_id
router.patch('/users/:user_id', asyncHandler(async (req, res) => {
  const { role, is_active, verification_status } = req.body;
  const user = await User.findOne({ user_id: req.params.user_id });
  if (!user) return sendError(res, 404, 'User not found');

  if (role)      user.role      = role;
  if (is_active !== undefined) user.is_active = is_active;
  await user.save();

  // If verification_status is being set, update vendor profile
  if (verification_status) {
    const vp = await VendorProfile.findOneAndUpdate(
      { user_id: user.user_id },
      { $set: { verification_status } },
      { new: true }
    );
    if (verification_status === 'verified' && vp) {
      sendVendorVerified({ vendorEmail: user.email, companyName: vp.company_name || user.name });
      // Notify vendor
      try {
        await Notification.create({ notification_id: generateId('ntf_'), user_id: user.user_id, type: 'vendor_verified', message: `Your company has been verified on Renergizr! You can now bid on all RFQs.` });
      } catch {}
    }
  }

  const { password, ...safe } = user.toObject();
  return res.json(safe);
}));

// GET /api/admin/vendors
router.get('/vendors', asyncHandler(async (req, res) => {
  const profiles = await VendorProfile.find().sort({ createdAt: -1 }).lean();
  // Attach user email to each profile
  const userIds  = profiles.map(p => p.user_id);
  const users    = await User.find({ user_id: { $in: userIds } }).select('user_id email name').lean();
  const userMap  = Object.fromEntries(users.map(u => [u.user_id, u]));
  const result   = profiles.map(p => ({ ...p, user: userMap[p.user_id] || null }));
  return res.json(result);
}));

// GET /api/admin/rfqs
router.get('/rfqs', asyncHandler(async (req, res) => {
  const rfqs = await RFQ.find().sort({ createdAt: -1 }).lean();
  return res.json(rfqs);
}));

// GET /api/admin/contracts
router.get('/contracts', asyncHandler(async (req, res) => {
  const contracts = await Contract.find().sort({ createdAt: -1 }).lean();
  return res.json(contracts);
}));

module.exports = router;
