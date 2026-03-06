/**
 * models/User.js — User schema
 * Roles: 'client' | 'vendor' | 'admin'
 * Sessions are JWT cookies — no server-side session storage needed.
 */
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  user_id:    { type: String, required: true, unique: true, index: true },
  name:       { type: String, required: true },
  email:      { type: String, required: true, unique: true, lowercase: true },
  password:   { type: String },               // null for Google OAuth users
  role:       { type: String, enum: ['client', 'vendor', 'admin'], default: 'client' },
  company:    { type: String, default: '' },
  is_active:  { type: Boolean, default: true },
  // Vendor-specific: verification status set by admin (Scope 1.1.g)
  verification_status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  google_id:  { type: String },               // populated for Google OAuth users
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema, 'users');
