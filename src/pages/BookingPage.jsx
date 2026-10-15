/**
 * BookingPage.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Placeholder — full booking page coming soon.
 * No router dependency: uses a plain anchor to scroll back to home.
 * ─────────────────────────────────────────────────────────────────────────
 */
import React from 'react';

const BookingPage = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
    <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">
      Book a Court
    </h1>
    <p className="text-[var(--text-secondary)] text-center max-w-prose">
      Full booking page — coming soon. Use the Quick Booking widget on the{' '}
      <a href="#home" className="text-[var(--brand-primary)] hover:underline">
        home page
      </a>{' '}
      to check availability for now.
    </p>
    <a
      href="#home"
      className="px-6 py-3 rounded-xl bg-[var(--brand-primary)] text-white font-bold text-sm hover:opacity-90 transition-opacity"
    >
      ← Back to Home
    </a>
  </div>
);

export default BookingPage;
