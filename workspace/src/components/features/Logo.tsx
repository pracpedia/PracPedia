'use client';

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * PracPedia text-based logo.
 *
 * "Prac" — Outfit (geometric, modern, clean) in cyan, bold uppercase
 * "Pedia" — DM Serif Display (high-contrast serif, elegant) in amber, italic
 *
 * The sharp contrast between a geometric sans and a high-contrast serif
 * creates a distinctive, memorable brand mark.
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
        className="text-amber-400 italic"
        style={{ fontFamily: 'var(--font-dm-serif-display), Georgia, serif' }}
      >
        Pedia
      </span>
    </span>
  );
};
