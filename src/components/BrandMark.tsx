import React from 'react';

/** The ARX triangle mark, used as the logo everywhere in the app. */
export const BrandMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22L2 2h20L12 22z" />
    <path d="M12 22V2" />
    <path d="M2 2l10 10 10-10" />
  </svg>
);

/**
 * A branded stand-in for a generic spinner: the triangle mark gently
 * pulsing in scale/opacity. Cheap, memorable, reinforces the logo instead of
 * a plain library spinner icon. Use for prominent/slow waits (full-page
 * loading, the main generate button, the output panel's waiting state);
 * small inline utility spinners (tiny icon-only buttons) can stay as a
 * regular spinner since the triangle reads better at a bit more size.
 */
export const BrandLoader: React.FC<{ className?: string }> = ({ className }) => (
  <BrandMark className={`animate-pulse ${className ?? ''}`} />
);
