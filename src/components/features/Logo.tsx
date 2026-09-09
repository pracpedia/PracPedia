'use client';

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * PracPedia text-based logo.
 *
 * Both parts use Lobster Two — a playful, bold display font with
 * distinctive swashes and curves. "Prac" in cyan, "Pedia" in purple.
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
      style={{ fontFamily: 'var(--font-lobster-two), cursive' }}
    >
      <span className="text-cyan-400 font-bold">
        Prac
      </span>
      <span className="text-purple-400 font-bold italic">
        Pedia
      </span>
    </span>
  );
};
