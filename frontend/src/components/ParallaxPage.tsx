'use client';

import { ReactNode } from 'react';

interface ParallaxPageProps {
  backgroundImage: string;
  title?: string;
  children: ReactNode;
}

/**
 * A component that creates a parallax effect with a background image.
 */

export default function ParallaxPage({ backgroundImage, title, children }: ParallaxPageProps) {
  return (
    <div
      className="relative w-full min-h-screen bg-cover bg-top bg-fixed"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundColor: '#f3f4f6',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 pt-16 relative z-10">
        <div className="backdrop-blur-sm bg-white/80 p-6 rounded shadow-md">
          {title && (
            <h1 className="text-3xl font-bold text-center text-teal-800 mb-6">
              {title}
            </h1>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
