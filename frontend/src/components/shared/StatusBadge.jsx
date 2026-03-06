/**
 * StatusBadge.jsx — Reusable status badge
 *
 * Covers: RFQ status, bid status, vendor verification, contract status.
 * Single source of truth for all status colors across the platform.
 *
 * Usage:  <StatusBadge status="open" />
 *         <StatusBadge status="awarded" className="ml-2" />
 *
 * Developer note (Naraway team):
 *   Add new statuses to STATUS_CONFIG only — never define inline status styles
 *   elsewhere. Tailwind requires full class strings (no dynamic `bg-${color}-500`).
 */

import React from 'react';

// Maps every platform status → human label + full Tailwind classes
const STATUS_CONFIG = {
  // ── RFQ lifecycle (server.py state machine: open → bidding_closed → awarded → completed)
  open:           { label: 'Open',           cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  bidding_closed: { label: 'Bidding Closed', cls: 'bg-amber-500/10  text-amber-400  border-amber-500/20'  },
  awarded:        { label: 'Awarded',        cls: 'bg-sky-500/10    text-sky-400    border-sky-500/20'    },
  completed:      { label: 'Completed',      cls: 'bg-slate-500/10  text-slate-400  border-slate-500/20'  },
  cancelled:      { label: 'Cancelled',      cls: 'bg-red-500/10    text-red-400    border-red-500/20'    },
  draft:          { label: 'Draft',          cls: 'bg-slate-500/10  text-slate-400  border-slate-500/20'  },

  // ── Bid lifecycle (submitted → shortlisted → accepted | rejected → contract_signed)
  submitted:         { label: 'Submitted',         cls: 'bg-sky-500/10     text-sky-400     border-sky-500/20'     },
  shortlisted:       { label: 'Shortlisted',       cls: 'bg-amber-500/10   text-amber-400   border-amber-500/20'   },
  accepted:          { label: 'Accepted',          cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  rejected:          { label: 'Rejected',          cls: 'bg-red-500/10     text-red-400     border-red-500/20'     },
  contract_signed:   { label: 'Contract Signed',   cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  contract_declined: { label: 'Contract Declined', cls: 'bg-red-500/10     text-red-400     border-red-500/20'     },

  // ── Vendor verification (admin workflow: pending → verified | rejected)
  pending:  { label: 'Pending',  cls: 'bg-amber-500/10   text-amber-400   border-amber-500/20'   },
  verified: { label: 'Verified', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },

  // ── Contract lifecycle (pending_vendor_acceptance → active | vendor_declined)
  pending_vendor_acceptance: { label: 'Awaiting Acceptance', cls: 'bg-amber-500/10   text-amber-400   border-amber-500/20'   },
  active:          { label: 'Active',   cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  vendor_declined: { label: 'Declined', cls: 'bg-red-500/10     text-red-400     border-red-500/20'     },
};

/**
 * @param {string} status    — Key from STATUS_CONFIG (e.g. 'open', 'verified')
 * @param {string} className — Optional extra Tailwind classes
 */
export default function StatusBadge({ status, className = '' }) {
  const cfg = STATUS_CONFIG[status] || {
    label: status?.replace(/_/g, ' ') || 'Unknown',
    cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-sm font-semibold capitalize border ${cfg.cls} ${className}`}>
      {cfg.label}
    </span>
  );
}
