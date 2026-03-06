/**
 * models/Contract.js — Contract schema
 *
 * State machine:
 *   pending_vendor_acceptance → active | vendor_declined
 *   active → completed (future — when delivery period ends)
 *
 * Created automatically when client awards a bid (POST /api/rfqs/:id/award/:bid_id).
 * Vendor responds via PATCH /api/contracts/:id/respond.
 */
const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  contract_id:          { type: String, required: true, unique: true, index: true },
  rfq_id:               { type: String, required: true },
  rfq_title:            { type: String },
  bid_id:               { type: String, required: true },

  // Parties
  client_id:            { type: String, required: true },
  client_company:       { type: String },
  vendor_id:            { type: String, required: true },
  vendor_company:       { type: String },

  // Core terms (pulled from bid + RFQ at award time)
  energy_type:          { type: String },
  price_per_unit:       { type: Number },   // ₹/kWh
  quantity_mw:          { type: Number },
  delivery_location:    { type: String },
  delivery_timeline:    { type: String },
  start_date:           { type: String },
  end_date:             { type: String },
  payment_schedule:     { type: String },
  advance_payment_pct:  { type: Number },
  contract_terms:       { type: String },

  // Calculated at award time
  estimated_annual_value_inr: { type: Number },

  // Lifecycle
  status:               { type: String, enum: ['pending_vendor_acceptance', 'active', 'vendor_declined', 'completed'], default: 'pending_vendor_acceptance' },
  vendor_notes:         { type: String },   // filled when vendor accepts/declines
}, { timestamps: true });

// Virtual: created_at alias for frontend compatibility
contractSchema.virtual('created_at').get(function () { return this.createdAt; });
contractSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Contract', contractSchema, 'contracts');
