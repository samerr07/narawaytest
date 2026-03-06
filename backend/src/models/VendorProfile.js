/**
 * models/VendorProfile.js — Vendor profile schema (Scope 1.1.d, 1.1.g)
 *
 * 3-tab structure mirrors the VendorProfile.jsx UI:
 *   Tab 1: Company Info (name, description, location, website, contact)
 *   Tab 2: Energy & Capacity (energy_types, capacity_mw, carbon_credits)
 *   Tab 3: Compliance & Docs (certifications, regulatory_docs — stored in separate collection)
 *
 * verification_status is managed by admin (Scope 1.1.g — vendor governance).
 * Carbon credits tracked for CCTS compliance.
 */
const mongoose = require('mongoose');

const vendorProfileSchema = new mongoose.Schema({
  vendor_id:           { type: String, required: true, unique: true, index: true },
  user_id:             { type: String, required: true, unique: true },

  // Tab 1 — Company Info
  company_name:        { type: String, default: '' },
  description:         { type: String, default: '' },
  location:            { type: String, default: '' },
  website:             { type: String, default: '' },
  contact_person:      { type: String, default: '' },
  contact_phone:       { type: String, default: '' },

  // Tab 2 — Energy & Capacity
  energy_types:        [{ type: String }],
  capacity_mw:         { type: Number, default: 0 },
  carbon_credits_ccts: { type: Number, default: 0 },  // tCO2e balance

  // Tab 3 — Compliance
  certifications:      [{ type: String }],

  // Admin governance (Scope 1.1.g)
  verification_status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  rejection_reason:    { type: String },
}, { timestamps: true });

module.exports = mongoose.model('VendorProfile', vendorProfileSchema, 'vendor_profiles');
