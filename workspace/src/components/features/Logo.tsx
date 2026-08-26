'use client';

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * PracPedia text-based logo.
 * "Prac" in cyan, "Pedia" in amber — distinct colors.
 * Uses Space Grotesk font (loaded via next/font in layout.tsx).
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
      className={`font-bold tracking-tight ${sizeClasses[size]} ${className}`}
      style={{ fontFamily: 'var(--font-space-grotesk), ui-sans-serif, system-ui, sans-serif' }}
    >
      <span className="text-cyan-400">Prac</span>
      <span className="text-amber-400">Pedia</span>
    </span>
  );
};
