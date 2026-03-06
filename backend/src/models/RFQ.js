/**
 * models/RFQ.js — Request for Quote schema
 *
 * State machine (Scope 1.1.a):
 *   open → bidding_closed → awarded → completed | cancelled
 *
 * Fields mirror the 4-step CreateRFQ wizard:
 *   Step 1: title, description, energy_type
 *   Step 2: quantity_mw, voltage_kv, phase, add_on_services
 *   Step 3: delivery_location, delivery_start_date, delivery_end_date
 *   Step 4: price_ceiling, payment_terms, advance_payment_pct
 */
const mongoose = require('mongoose');

const rfqSchema = new mongoose.Schema({
  rfq_id:               { type: String, required: true, unique: true, index: true },
  client_id:            { type: String, required: true, index: true },
  client_name:          { type: String },

  // Step 1 — Basic Info
  title:                { type: String, required: true },
  description:          { type: String },
  energy_type:          { type: String, enum: ['solar', 'wind', 'hydro', 'thermal', 'green_hydrogen'], required: true },

  // Step 2 — Technical Specs
  quantity_mw:          { type: Number, required: true },
  voltage_kv:           { type: Number },
  phase:                { type: String },
  add_on_services:      [{ type: String }],

  // Step 3 — Logistics
  delivery_location:    { type: String },
  delivery_start_date:  { type: String },
  delivery_end_date:    { type: String },

  // Step 4 — Financial
  price_ceiling:        { type: Number },    // ₹/kWh
  payment_terms:        { type: String },
  advance_payment_pct:  { type: Number, default: 0 },

  // Lifecycle
  status:               { type: String, enum: ['draft', 'open', 'bidding_closed', 'awarded', 'completed', 'cancelled'], default: 'open' },
  awarded_bid_id:       { type: String },
  bid_count:            { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('RFQ', rfqSchema, 'rfqs');
