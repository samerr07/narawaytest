/**
 * routes/auth.js — Authentication routes
 *
 * POST /api/auth/register  — Email/password registration with role selection
 * POST /api/auth/login     — Email/password login → sets JWT cookie
 * GET  /api/auth/me        — Returns current user (used by React AuthProvider on load)
 * POST /api/auth/logout    — Clears JWT cookie
 * POST /api/auth/google/session — Exchanges Emergent OAuth session_id for JWT cookie
 *
 * JWT payload: { user_id, role }
 * Cookie: httpOnly, sameSite: 'lax', secure in production, maxAge: 7 days
 */

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const axios    = require('axios');
const router   = express.Router();
const User     = require('../models/User');
const VendorProfile = require('../models/VendorProfile');
const { generateId, asyncHandler, sendError } = require('../utils/helpers');
const { requireAuth } = require('../middleware/auth');

const COOKIE_NAME = process.env.COOKIE_NAME || 'session_token';
const JWT_SECRET  = process.env.JWT_SECRET || 'ghgfjgkgukgkuukhkh';
const COOKIE_OPTS = {
  httpOnly:  true,
  sameSite:  'lax',
  secure:    process.env.NODE_ENV === 'production',
  maxAge:    7 * 24 * 60 * 60 * 1000,  // 7 days in ms
};

/** Sign a JWT for a user */
function signToken(user) {
  return jwt.sign({ user_id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

/** Strip password from user object before sending to client */
function safeUser(user) {
  const { password, __v, _id, ...safe } = user.toObject ? user.toObject() : user;
  return safe;
}

// POST /api/auth/register
// router.post('/register', asyncHandler(async (req, res) => {
//   const { name, email, password, role = 'client', company = '' } = req.body;
//   console.log(req.body)
//   if (!name || !email || !password) return sendError(res, 400, 'name, email and password are required');
//   if (!['client', 'vendor'].includes(role)) return sendError(res, 400, 'role must be client or vendor');

//   const existing = await User.findOne({ email: email.toLowerCase() });
//   if (existing) return sendError(res, 400, 'Email already registered');

//   const hashed = await bcrypt.hash(password, 12);
//   const user = await User.create({
//     user_id:  generateId('usr_'),
//     name,
//     email:    email.toLowerCase(),
//     password: hashed,
//     role,
//     company,
//   });

//   // Auto-create vendor profile so /api/vendor/profile always has a record
//   if (role === 'vendor') {
//     await VendorProfile.create({
//       vendor_id:    generateId('vnd_'),
//       user_id:      user.user_id,
//       company_name: company || name,
//     });
//   }

//   const token = signToken(user);
//   res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
//   // return res.status(201).json(safeUser(user));
//   return res.status(201).json({ user: safeUser(user) });
// }));

router.post('/register', asyncHandler(async (req, res) => {

  console.log("----- REGISTER REQUEST START -----");
  console.log("Request Body:", req.body);

  const { name, email, password, role = 'client', company = '' } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    console.log("❌ Missing required fields");
    return sendError(res, 400, 'name, email and password are required');
  }

  console.log("✅ Required fields present");

  // Validate role
  if (!['client', 'vendor'].includes(role)) {
    console.log("❌ Invalid role:", role);
    return sendError(res, 400, 'role must be client or vendor');
  }

  console.log("✅ Role valid:", role);

  // Check if user already exists
  console.log("🔍 Checking if user already exists...");

  const existing = await User.findOne({ email: email.toLowerCase() });

  if (existing) {
    console.log("❌ User already exists with email:", email);
    return sendError(res, 400, 'Email already registered');
  }

  console.log("✅ Email is unique");

  // Hash password
  console.log("🔐 Hashing password...");
  const hashed = await bcrypt.hash(password, 12);

  // Create user
  console.log("👤 Creating user...");

  const user = await User.create({
    user_id: generateId('usr_'),
    name,
    email: email.toLowerCase(),
    password: hashed,
    role,
    company,
  });

  console.log("✅ User created:", user.user_id);

  // Create vendor profile if vendor
  if (role === 'vendor') {
    console.log("🏢 Creating vendor profile...");

    await VendorProfile.create({
      vendor_id: generateId('vnd_'),
      user_id: user.user_id,
      company_name: company || name,
    });

    console.log("✅ Vendor profile created");
  }

  // Generate token
  console.log("🔑 Generating JWT token...");
  const token = signToken(user);

  // Set cookie
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);

  console.log("🍪 Cookie set");

  console.log("----- REGISTER SUCCESS -----");

  return res.status(201).json({
    user: safeUser(user)
  });

}));
// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return sendError(res, 400, 'email and password are required');

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.password) return sendError(res, 401, 'Invalid credentials');
  if (!user.is_active) return sendError(res, 403, 'Account deactivated. Contact admin.');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return sendError(res, 401, 'Invalid credentials');

  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
  return res.json(safeUser(user));
}));

// GET /api/auth/me — called by React AuthProvider on every page load
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findOne({ user_id: req.user.user_id }).lean();
  if (!user) return sendError(res, 404, 'User not found');
  const { password, ...safe } = user;
  return res.json(safe);
}));

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  return res.json({ success: true });
});

// POST /api/auth/google/session — Emergent Google OAuth callback
// Emergent returns a session_id in the URL fragment; frontend posts it here.
router.post('/google/session', asyncHandler(async (req, res) => {
  const { session_id, role = 'client' } = req.body;
  if (!session_id) return sendError(res, 400, 'session_id required');

  // Exchange session_id for user profile via Emergent API
  const emergentRes = await axios.get(
    `https://auth.emergent.sh/session/${session_id}`,
    { timeout: 10000 }
  );
  const profile = emergentRes.data;
  if (!profile?.email) return sendError(res, 400, 'Invalid Emergent session');

  // Find or create user
  let user = await User.findOne({ email: profile.email.toLowerCase() });
  if (!user) {
    user = await User.create({
      user_id:   generateId('usr_'),
      name:      profile.name || profile.email.split('@')[0],
      email:     profile.email.toLowerCase(),
      role:      ['client', 'vendor'].includes(role) ? role : 'client',
      google_id: profile.sub || profile.id,
    });
    if (user.role === 'vendor') {
      await VendorProfile.create({
        vendor_id:    generateId('vnd_'),
        user_id:      user.user_id,
        company_name: user.name,
      });
    }
  }

  if (!user.is_active) return sendError(res, 403, 'Account deactivated');

  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
  const { password, ...safe } = user.toObject();
  return res.json({ user: safe });
}));

module.exports = router;
