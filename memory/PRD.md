# Renergizr Industries - B2B Energy Trading Platform

## Problem Statement
Build a B2B energy trading marketplace for Renergizr Industries Private Limited (per MOU). Platform connects energy buyers (clients) posting RFQs with verified energy vendors. AI-powered bid ranking, carbon credits tracking, and regulatory compliance.

## Architecture
- **Frontend**: React + Tailwind CSS + Recharts (dark industrial theme)
- **Backend**: FastAPI + MongoDB (motor async driver)
- **Auth**: JWT sessions (email/password) + Emergent Google OAuth
- **AI Engine**: Gemini 2.0 Flash via emergentintegrations (bid ranking + gap analysis)
- **Email**: Resend (configured, requires RESEND_API_KEY in backend/.env)
- **Design**: Dark navy (#020617) + Sky blue (#0EA5E9) accent + Chivo/Inter fonts

## User Personas
1. **Energy Buyers (Client role)**: Post RFQs, review bids, use AI analysis, award contracts
2. **Energy Vendors (Vendor role)**: Bid on RFQs, manage profile + certifications, accept/decline contracts
3. **Platform Admin (Admin role)**: Verify vendors, manage users, platform oversight, contracts oversight

## Core Features Implemented ✅

### Landing Page (Company Website)
- Live energy market ticker (Solar, Wind, CCTS Carbon, EU CBAM)
- Hero section with live market data widget
- About Renergizr (company story, INR 3.8L invested)
- 6-feature bento grid (RFQ, AI Ranking, Vendor Verification, Carbon Credits, Market Intelligence, CBAM Compliance)
- How It Works (3 steps)
- Carbon Credits & CCTS section (India ₹20,000 Cr CCTS, EU CBAM context)
- For Clients + For Vendors sections
- News & Insights (Finshots, LiveMint article links)
- Compliance badges (CCTS, MNRE, CEA, CBAM, ISO 14001, GreenPro)
- Contact form
- SEO meta tags (title, description, OG tags)
- Comprehensive footer

### Authentication
- JWT email/password login + registration
- Google OAuth (Emergent-managed)
- Role selection: Client / Vendor
- Session management (7-day cookies)

### Client Module
- Dashboard with stats (RFQs, bids, awarded)
- Energy price trend chart (6-month)
- Carbon market widget
- 4-step RFQ creation (Basic → Technical Specs → Logistics → Financial)
- RFQ detail with bid price comparison chart
- AI ranking (Gemini Flash) with gap analysis
- Close Bidding button (transitions RFQ to bidding_closed)
- Shortlist bids (toggle shortlisting)
- Award Contract modal (with contract terms + payment schedule customization)
- Auto-reject all other bids when contract awarded
- Contract management page (/client/contracts) with expand/collapse details
- Workflow steps visualization (4 steps shown in sidebar)

### Vendor Module
- Dashboard with profile completion tracker
- Carbon Credits widget (balance + market value at CCTS rate)
- CCTS Carbon Price trend chart
- Marketplace with search + filter by energy type
- 3-tab vendor profile (Company Info / Energy & Capacity / Compliance & Docs)
- Real document upload (base64, per doc type, PDF/JPG/PNG up to 10MB)
- Uploaded docs list with status
- Carbon credits section with market value calculator
- Regulatory document management (7 doc types)
- Green certifications (7 certification types)
- Bid submission with price, quantity, timeline, notes
- Bid status tracking (submitted → shortlisted → accepted → contract_signed)
- Contract acceptance/decline UI with notes
- Vendor contracts page (/vendor/contracts)

### Admin Dashboard
- Overview: stats + platform bar chart + energy price charts + CCTS carbon chart
- Users tab: role management, activate/deactivate
- Vendors tab: CCTS verification (verify/reject workflow)
- RFQs tab: all RFQs oversight
- Admin contracts overview (/api/admin/contracts)

### Notification System ✅ (Real, Database-backed)
- In-app notifications (MongoDB `notifications` collection)
- Navbar bell icon with unread count badge (live refresh every 30s)
- Notification dropdown with emoji type icons + timestamps
- Mark single notification as read (on click)
- Mark all as read button
- Triggered on: new bid, bid shortlisted, contract awarded, contract accepted/declined, vendor verified/rejected, bidding closed

### Email Notifications ✅ (Ready - needs RESEND_API_KEY)
- Resend integration implemented (graceful degradation if key not set)
- HTML emails sent for: new bid, contract awarded, contract accepted/declined, vendor verified
- Configure: add `RESEND_API_KEY=re_xxx` to /app/backend/.env + `SENDER_EMAIL=your@domain.com`

### Document Upload ✅ (Real)
- Base64 file upload stored in MongoDB `vendor_documents` collection
- One document per type per vendor (upsert)
- Admin can access documents for verification workflow
- Supported: PDF, JPG, PNG up to 10MB

### Full Trading Workflow ✅
State Machine:
- RFQ: `open` → `bidding_closed` → `awarded` → `completed` | `cancelled`
- Bid: `submitted` → `shortlisted` → `accepted` | `rejected` → `contract_signed` | `contract_declined`
- Contract: `pending_vendor_acceptance` → `active` | `vendor_declined`

### API Endpoints
- Auth: register, login, google/session, me, logout
- RFQs: CRUD, status update, close-bidding, award/{bid_id}
- Bids: submit, list, status update, shortlist, AI ranking
- Contracts: list, get, respond (vendor accept/decline)
- Vendor: profile CRUD, documents upload/list, my bids
- Admin: users, vendors (with notifications), analytics, rfqs, contracts
- Market: /api/market/insights (public, simulated data)
- Notifications: get, mark-read, read-all

## Seed Data (Test Credentials)
- **Admin**: admin@renergizr.com / Admin@123
- **Client 1**: buyer1@acme.com / Client@123
- **Client 2**: buyer2@tatapower.com / Client@123
- **Vendor 1**: vendor1@greensun.com / Vendor@123 (CCTS Verified, 12,500 tCO2e)
- **Vendor 2**: vendor2@windpower.com / Vendor@123 (Pending verification)

## Dates
- Jan 2026: Platform MVP (auth, RFQ, bids, AI ranking)
- Feb 2026: Major update (carbon credits, market data, comprehensive landing page, compliance docs)
- Feb 2026 v2: Deep trading workflow, notification system, document upload, contract management, email notifications

## Prioritized Backlog

### P0 (Critical for Production)
- Real payment integration (Stripe/Razorpay) for platform fees + transaction fees
- Configure RESEND_API_KEY for actual email delivery
- Real carbon credit API integration (registry data)
- Push notifications (browser/mobile)

### P1 (High Value)
- RFQ templates by energy type
- Vendor shortlisting (client can invite specific vendors to bid)
- Bid negotiation workflow (counter-offers)
- Multi-language support (Hindi, Marathi)
- Mobile app (React Native)
- Analytics dashboard for vendors (win rate, pricing benchmark)
- Admin document viewer (read uploaded vendor docs for verification)

### P2 (Future)
- Carbon trading marketplace (buy/sell credits between vendors)
- Energy price alerts (push + email when market moves)
- Integration with MNRE/CEA API for real regulatory verification
- Invoice & PO generation post-award (PDF generation)
- Enterprise SSO (SAML)
- White-label version for large energy companies
- Live data feed for market prices (replace simulation)
- API documentation (Swagger/OpenAPI export)
- Deployment guide (Docker + Kubernetes)

## Tech Debt / Known Issues
- Market insights data is simulated (not live feed)
- Document data stored as base64 in MongoDB (should use cloud storage for production scale)
- Email not delivered (RESEND_API_KEY needs to be configured)
- No email verification on registration
- server.py is monolithic (~1000 lines) - should split into routers for scale
