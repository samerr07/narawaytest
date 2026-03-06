/**
 * models/Bid.js — Bid schema
 *
 * State machine:
 *   submitted → shortlisted → accepted | rejected → contract_signed | contract_declined
 */
const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
  bid_id:           { type: String, required: true, unique: true, index: true },
  rfq_id:           { type: String, required: true, index: true },
  vendor_id:        { type: String, required: true },
  vendor_name:      { type: String },
  vendor_company:   { type: String },

  // Bid details submitted by vendor
  price_per_unit:   { type: Number, required: true },  // ₹/kWh
  quantity_mw:      { type: Number, required: true },
  delivery_timeline: { type: String },
  notes:            { type: String },

  // Lifecycle
  status:           { type: String, enum: ['submitted', 'shortlisted', 'accepted', 'rejected', 'contract_signed', 'contract_declined'], default: 'submitted' },
  is_shortlisted:   { type: Boolean, default: false },

  // AI ranking results (Scope 1.1.b — populated by /bids/rank endpoint)
  ai_score:         { type: Number },
  ai_analysis:      {
    strengths:      [{ type: String }],
    gaps:           [{ type: String }],
    recommendation: { type: String },
  },
}, { timestamps: true });

module.exports = mongoose.model('Bid', bidSchema, 'bids');
