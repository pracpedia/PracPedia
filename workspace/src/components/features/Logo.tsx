'use client';

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * PracPedia text-based logo.
 *
 * "Prac" — Outfit (geometric sans, bold uppercase) in cyan
 * "Pedia" — Cormorant Garamond (literary serif, light italic) in amber
 *
 * Cormorant Garamond has delicate, flowing letterforms with graceful
 * curves — it evokes old manuscripts and encyclopedias while still
 * feeling refined and modern at display sizes.
 */
export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-3xl sm:text-4xl',
  };

  return (
    <span
      className={`inline-flex items-baseline ${sizeClasses[size]} ${className}`}
    >
      <span
        className="text-cyan-400 uppercase font-extrabold tracking-tight"
        style={{ fontFamily: 'var(--font-outfit), ui-sans-serif, system-ui, sans-serif' }}
      >
        Prac
      </span>
      <span
        className="text-amber-400 italic font-light"
        style={{ fontFamily: 'var(--font-cormorant-garamond), Georgia, serif' }}
      >
        Pedia
      </span>
    </span>
  );
};
