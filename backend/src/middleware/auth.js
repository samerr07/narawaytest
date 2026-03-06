/**
 * middleware/auth.js — JWT authentication middleware
 *
 * Reads the JWT from either:
 *   1. Authorization header: "Bearer <token>"
 *   2. Cookie: session_token (set by login/register endpoints)
 *
 * Attaches req.user = { user_id, role, name, email } on success.
 * Returns 401 if token is missing or invalid.
 *
 * Developer note (Naraway team):
 *   Use requireAuth on all protected routes.
 *   Use requireRole('admin') to additionally restrict to admin users.
 */

const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const { sendError } = require('../utils/helpers');

/**
 * requireAuth — verifies JWT and populates req.user.
 * Attach to any route that needs authentication.
 */
async function requireAuth(req, res, next) {
  try {
    // 1. Try Authorization header (Bearer token — used by API clients)
    let token = null;
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }

    // 2. Fall back to cookie (used by React frontend with withCredentials: true)
    if (!token) {
      token = req.cookies?.[process.env.COOKIE_NAME || 'session_token'];
    }

    if (!token) return sendError(res, 401, 'Not authenticated');

    // Verify and decode JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user from DB to get current role/active status
    const user = await User.findOne({ user_id: decoded.user_id }).lean();
    if (!user || !user.is_active) return sendError(res, 401, 'User not found or deactivated');

    // Attach minimal user object to request
    req.user = {
      user_id: user.user_id,
      role:    user.role,
      name:    user.name,
      email:   user.email,
    };

    next();
  } catch (err) {
    return sendError(res, 401, 'Invalid or expired token');
  }
}

/**
 * requireRole — additional role check AFTER requireAuth.
 * Usage: router.get('/admin/...', requireAuth, requireRole('admin'), handler)
 *
 * @param {...string} roles — Allowed roles (e.g. 'admin', 'client')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return sendError(res, 401, 'Not authenticated');
    if (!roles.includes(req.user.role)) return sendError(res, 403, 'Insufficient permissions');
    next();
  };
}

module.exports = { requireAuth, requireRole };
