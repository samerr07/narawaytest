/**
 * server.js — Renergizr Express application entry point
 *
 * Tech stack: Node.js 20 + Express 4 + MongoDB (Mongoose)
 * Hosted on: AWS ECS Fargate (backend) / S3+CloudFront (frontend)
 *
 * Route prefix: /api/*
 *   /api/auth/*          — JWT auth (register, login, me, logout, google/session)
 *   /api/rfqs/*          — RFQ + bids + AI ranking (Scope 1.1.a, 1.1.b, 1.1.c)
 *   /api/vendor/*        — Vendor profile + documents + bids (Scope 1.1.d)
 *   /api/contracts/*     — Contract lifecycle
 *   /api/notifications/* — In-app notifications
 *   /api/admin/*         — Admin governance (Scope 1.1.e)
 *   /api/market/*        — Market insights (public)
 *   /api/grid/*          — 5G/6G real-time grid balancing (Scope 1.1.f)
 *   /api/contact         — Contact form (Scope 1.1.i)
 *
 * Security: helmet (headers), cors (origins), rate-limit, cookie-parser
 * Logging:  morgan HTTP logs + winston app logs
 */

require('dotenv').config();
const express     = require('express');
const cookieParser = require('cookie-parser');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const rateLimit   = require('express-rate-limit');

const { connectDB }    = require('./config/db');
const logger           = require('./utils/logger');
const { sendError }    = require('./utils/helpers');

// ── Route modules ─────────────────────────────────────────────────────────────
const authRoutes          = require('./routes/auth');
const rfqRoutes           = require('./routes/rfqs');
const vendorRoutes        = require('./routes/vendors');
const contractRoutes      = require('./routes/contracts');
const notificationRoutes  = require('./routes/notifications');
const adminRoutes         = require('./routes/admin');
const marketRoutes        = require('./routes/market');
const gridRoutes          = require('./routes/grid');
const contactRoutes       = require('./routes/contact');

// ── App setup ─────────────────────────────────────────────────────────────────
const app = express();

// Security headers (AWS-safe: disable CSP for now, configure per environment)
app.use(helmet({ contentSecurityPolicy: false }));

// CORS — allow React dev server + production domain
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000' || 'http://localhost:3001').split(',').map(s => s.trim());
app.use(cors({
  origin:      (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,   // required for cookie-based auth
}));

// Body parsers
app.use(express.json({ limit: '15mb' }));      // 15MB for base64 document uploads
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// HTTP request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Global rate limiter: 200 req/15 min per IP (prevents brute force)
const limiter = rateLimit({
  windowMs:       15 * 60 * 1000,
  max:            200,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { detail: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/rfqs',          rfqRoutes);
app.use('/api/vendor',        vendorRoutes);
app.use('/api/contracts',     contractRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/market',        marketRoutes);
app.use('/api/grid',          gridRoutes);
app.use('/api/contact',       contactRoutes);

// Health check (for AWS ALB / ECS health check target)
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404 handler
app.use((req, res) => sendError(res, 404, `Route ${req.method} ${req.path} not found`));

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  sendError(res, 500, process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message);
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = 8000;

(async () => {
  await connectDB();
  app.listen(PORT, () => logger.info(`Renergizr API running on port ${PORT}`));
})();

module.exports = app;  // exported for Jest tests
