'use client';

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * PracPedia logo — renders the pracpedia-logo.png image from /public.
 *
 * Used everywhere: sidebar, header, landing page, footer, auth pages.
 * Change the file at public/pracpedia-logo.png to update the logo
 * across the entire app.
 */
export const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const sizePx = {
    sm: 24,
    md: 32,
    lg: 40,
    xl: 56,
  };

  return (
    <img
      src="/pracpedia-logo.png"
      alt="PracPedia"
      width={sizePx[size]}
      height={sizePx[size]}
      className={`object-contain ${className}`}
      style={{ maxHeight: sizePx[size], width: 'auto' }}
    />
  );
};
