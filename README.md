# Renergizr Industries – AI-Powered B2B Energy Trading Platform

> **Status:** MVP Live (v1.2, Feb 2026)  
> **Owner:** Renergizr Industries Private Limited  
> **Confidentiality:** Proprietary – Not for public redistribution

---

## 1. Overview

Renergizr Industries is building India’s first AI-powered B2B energy trading marketplace. The platform connects industrial energy buyers with verified energy vendors through structured RFQs, competitive bidding, AI-driven bid ranking, carbon credit tracking, and regulatory compliance workflows — all within a single digital system.

The platform is designed for enterprise energy procurement and compliance with:
- India’s Carbon Credit Trading Scheme (CCTS)
- MNRE and CEA procurement guidelines
- EU Carbon Border Adjustment Mechanism (CBAM) readiness

---

## 2. Problem Statement

Enterprise energy procurement in India is currently:
- Fragmented across brokers, emails, and offline negotiations  
- Slow (60–90 day sales cycles)  
- Lacking transparent vendor comparison  
- Poorly integrated with carbon compliance workflows  

Renergizr solves this by providing:
- A unified RFQ-based marketplace  
- AI-assisted bid evaluation  
- Built-in carbon and compliance visibility  
- Structured contract workflows  

---

## 3. Core Capabilities

### Marketplace & Trading
- RFQ creation and lifecycle management  
- Vendor bid submission and comparison  
- AI-powered bid ranking with gap analysis  
- Shortlisting and contract award workflow  

### Carbon & Compliance
- Carbon credits portfolio tracking  
- CCTS & CBAM price visibility  
- Vendor compliance document management  
- Certification-based vendor verification  

### Platform Operations
- In-app notifications (real-time)  
- Email notifications (Resend integration)  
- Admin verification workflows  
- Platform analytics  

---

## 4. User Roles

### Energy Buyers (Clients)
- Create RFQs  
- Review bids with AI ranking  
- Award and manage contracts  
- Track carbon exposure and pricing  

### Energy Vendors
- Maintain verified profiles  
- Bid on RFQs  
- Upload compliance documents  
- Accept or decline awarded contracts  

### Platform Admins
- Verify vendors and documents  
- Manage users and roles  
- Oversee RFQs, bids, and contracts  
- Monitor platform analytics  

---

## 5. System Architecture

**Frontend**
- React 18  
- Tailwind CSS  
- Recharts (charts)  
- Dark industrial design system  

**Backend**
- FastAPI (Python 3.11)  
- MongoDB (Motor async driver)  
- JWT-based authentication  

**AI Engine**
- Gemini 2.0 Flash  
- Bid ranking and gap analysis  

**Integrations**
- Google OAuth (Emergent integrations)  
- Email delivery via Resend  

---

## 6. Trading Workflows (State Machines)

### RFQ Lifecycle
```text
OPEN → BIDDING_CLOSED → AWARDED → COMPLETED | CANCELLED
