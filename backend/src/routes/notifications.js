/**
 * routes/notifications.js — In-app notifications
 *
 * GET  /api/notifications          — List notifications for current user (newest first)
 * PATCH /api/notifications/:id/read — Mark single notification as read
 * POST  /api/notifications/read-all — Mark all as read
 */
const express  = require('express');
const router   = express.Router();
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

// GET /api/notifications
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user_id: req.user.user_id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return res.json(notifications);
}));

// PATCH /api/notifications/:id/read
router.patch('/:id/read', requireAuth, asyncHandler(async (req, res) => {
  await Notification.updateOne(
    { notification_id: req.params.id, user_id: req.user.user_id },
    { $set: { is_read: true } }
  );
  return res.json({ success: true });
}));

// POST /api/notifications/read-all
router.post('/read-all', requireAuth, asyncHandler(async (req, res) => {
  await Notification.updateMany({ user_id: req.user.user_id, is_read: false }, { $set: { is_read: true } });
  return res.json({ success: true });
}));

module.exports = router;
