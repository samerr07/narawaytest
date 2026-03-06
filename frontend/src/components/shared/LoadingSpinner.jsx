/**
 * LoadingSpinner.jsx — Reusable loading indicator
 *
 * Replaces the inline spinner pattern repeated in every component:
 *   <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
 *
 * Usage:
 *   <LoadingSpinner />                    // default medium sky spinner
 *   <LoadingSpinner size="lg" />          // large (page load)
 *   <LoadingSpinner size="sm" color="white" />   // small white (inside buttons)
 *   <LoadingSpinner fullPage />           // full-screen centered (route loading)
 */

import React from 'react';

// Size → Tailwind width/height/border classes
const SIZE_MAP = {
  sm: 'w-4 h-4 border-2',   // inside buttons
  md: 'w-6 h-6 border-2',   // inline loading states
  lg: 'w-10 h-10 border-2', // page-level loading
};

// Color → Tailwind border classes (must be full strings for Tailwind purge)
const COLOR_MAP = {
  sky:   'border-sky-500   border-t-transparent',
  white: 'border-white     border-t-transparent',
  slate: 'border-slate-500 border-t-transparent',
};

/**
 * @param {'sm'|'md'|'lg'}            size     — Spinner size (default 'md')
 * @param {'sky'|'white'|'slate'}     color    — Spinner color (default 'sky')
 * @param {boolean}                   fullPage — Centers on full viewport (route loading)
 * @param {string}                    className — Extra classes
 */
export default function LoadingSpinner({ size = 'md', color = 'sky', fullPage = false, className = '' }) {
  const spinner = (
    <div className={`rounded-full animate-spin ${SIZE_MAP[size] || SIZE_MAP.md} ${COLOR_MAP[color] || COLOR_MAP.sky} ${className}`} />
  );

  if (fullPage) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
}
