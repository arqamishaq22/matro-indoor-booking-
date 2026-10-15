/**
 * DetailDialog.jsx — accessible modal with focus trap + Esc-to-close.
 * Used by all admin pages for detail views, confirmations, and forms.
 */
import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';

const DetailDialog = ({ title, onClose, children }) => {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const previousFocus = document.activeElement;
    const focusable = () => Array.from(dialog.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ));
    focusable()[0]?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusable();
      if (!items.length) {
        event.preventDefault();
        dialog.focus();
      } else if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault();
        items[items.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === items[items.length - 1]) {
        event.preventDefault();
        items[0].focus();
      }
    };

    dialog.addEventListener('keydown', handleKeyDown);
    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <div
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.55)' }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-detail-title"
        tabIndex={-1}
        className="admin-dialog-panel"
        style={{ width: 'min(100%, 600px)', maxHeight: 'min(85dvh, 760px)', overflowY: 'auto', padding: '1.25rem', borderRadius: 'var(--radius-xl)', background: 'var(--bg-surface-card)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-lg)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
          <h2 id="admin-detail-title" style={{ margin: 0, fontSize: 'var(--text-lg)' }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close details" style={{ border: 0, background: 'transparent', color: 'var(--text-muted)', padding: '0.25rem' }}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
};

export default DetailDialog;
