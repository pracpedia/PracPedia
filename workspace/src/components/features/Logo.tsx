'use client';

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * PracPedia text-based logo.
 * "Prac" — Space Grotesk (geometric sans-serif, techy) in cyan
 * "Pedia" — Playfair Display (elegant serif, scholarly) in amber
 *
 * The contrast between the two fonts represents the blend of
 * practical (techy, hands-on) + encyclopedia (scholarly, knowledge).
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
      className={`font-bold tracking-tight inline-flex items-baseline ${sizeClasses[size]} ${className}`}
    >
      <span
        className="text-cyan-400"
        style={{ fontFamily: 'var(--font-space-grotesk), ui-sans-serif, system-ui, sans-serif' }}
      >
        Prac
      </span>
      <span
        className="text-amber-400 italic"
        style={{ fontFamily: 'var(--font-playfair-display), Georgia, serif' }}
      >
        Pedia
      </span>
    </span>
  );
};
