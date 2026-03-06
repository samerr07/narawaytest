/**
 * utils/helpers.js — Shared utility functions
 *
 * Developer note (Naraway team):
 *   generateId() mirrors the Python uuid4 hex[:12] pattern so IDs look the same
 *   across old data and new Node.js backend.
 */

const { v4: uuidv4 } = require('uuid');

/**
 * generateId — creates a short prefixed unique ID.
 * Examples: "rfq_a3b9c1d2e0f1", "bid_8f4e2c1a9b7d"
 * @param {string} prefix  — e.g. 'rfq_', 'bid_', 'usr_'
 */
function generateId(prefix = '') {
  return `${prefix}${uuidv4().replace(/-/g, '').slice(0, 12)}`;
}

/**
 * asyncHandler — wraps async route handlers so uncaught errors
 * are forwarded to Express error middleware (avoids try/catch everywhere).
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * sendError — standardised error response matching the Python backend shape.
 * Frontend checks: err.response?.data?.detail
 */
function sendError(res, status, detail) {
  return res.status(status).json({ detail });
}

module.exports = { generateId, asyncHandler, sendError };
