import React from 'react';

/**
 * Container — max-width layout wrapper.
 * Uses Tailwind utilities for layout; fluid padding comes from the CSS
 * custom-property token `--container-padding` (clamp(1rem, 4vw, 1.5rem)).
 */
const Container = ({ children, className = '', style = {}, id }) => (
  <div
    id={id}
    className={`w-full max-w-[1280px] mx-auto min-w-0 container-wrap ${className}`}
    style={{
      paddingLeft:  'var(--container-padding)',
      paddingRight: 'var(--container-padding)',
      ...style,
    }}
  >
    {children}
  </div>
);

export default Container;
