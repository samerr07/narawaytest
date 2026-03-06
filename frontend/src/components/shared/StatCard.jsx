/**
 * StatCard.jsx — Reusable statistics card
 *
 * Replaces the repeated stat card pattern in:
 *   ClientDashboard, VendorDashboard, AdminDashboard, ContractsPage
 *
 * Usage:
 *   <StatCard label="Total RFQs" value={12} color="text-sky-400" icon={<FileText size={18} />} />
 *   <StatCard label="Active" value={5} color="text-emerald-400" testId="stat-active" />
 */

import React from 'react';

/**
 * @param {string}    label     — Descriptor shown below the value
 * @param {number}    value     — Numeric value to display
 * @param {string}    color     — Tailwind text color (e.g. 'text-sky-400')
 * @param {ReactNode} icon      — Optional Lucide icon element
 * @param {string}    testId    — Optional data-testid for E2E tests
 * @param {string}    className — Extra wrapper classes
 */
export default function StatCard({ label, value, color = 'text-white', icon, testId, className = '' }) {
  return (
    <div
      data-testid={testId}
      className={`bg-[#0F172A] border border-[#1E293B] rounded-sm p-4 ${className}`}
    >
      {/* Icon — only shown when provided */}
      {icon && <div className={`${color} mb-2`}>{icon}</div>}

      {/* Primary value */}
      <div className={`font-['Chivo'] font-black text-3xl ${color} mb-1`}>
        {value ?? '—'}
      </div>

      {/* Label */}
      <div className="text-xs text-slate-500 font-medium">{label}</div>
    </div>
  );
}
