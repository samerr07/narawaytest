/**
 * models/Notification.js — In-app notification schema
 *
 * Notifications are created server-side on key events:
 *   new_bid, bid_shortlisted, contract_awarded, contract_accepted,
 *   contract_declined, vendor_verified, vendor_rejected, bidding_closed
 *
 * Frontend polls GET /api/notifications every 30s and shows the unread count badge.
 */
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  notification_id: { type: String, required: true, unique: true },
  user_id:         { type: String, required: true, index: true },
  type:            { type: String, required: true },
  message:         { type: String, required: true },
  is_read:         { type: Boolean, default: false },
  related_id:      { type: String },   // rfq_id, bid_id, or contract_id for deep linking
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema, 'notifications');
