/**
 * VenuePage.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Placeholder — full venue listing page coming soon.
 * No router dependency: uses a plain button to scroll back to home.
 * ─────────────────────────────────────────────────────────────────────────
 */
import React from 'react';

const VenuePage = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
    <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">
      Venues
    </h1>
    <p className="text-[var(--text-secondary)] text-center max-w-prose">
      Full venue listing page — coming soon. Use the{' '}
      <a href="#home" className="text-[var(--brand-primary)] hover:underline">
        home page
      </a>{' '}
      to browse available venues for now.
    </p>
    <a
      href="#home"
      className="px-6 py-3 rounded-xl bg-[var(--brand-primary)] text-white font-bold text-sm hover:opacity-90 transition-opacity"
    >
      ← Back to Home
    </a>
  </div>
);

export default VenuePage;
