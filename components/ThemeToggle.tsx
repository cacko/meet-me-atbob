import React from 'react';
import { Themes } from '../types';

interface ThemeToggleProps {
  themes: Themes;
  currentThemeKey: string;
  onThemeChange: (themeKey: string) => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ themes, currentThemeKey, onThemeChange }) => {
  const themeKeys = Object.keys(themes);
  const currentIndex = themeKeys.indexOf(currentThemeKey);

  const handleNext = () => {
    const nextIndex = (currentIndex + 1) % themeKeys.length;
    onThemeChange(themeKeys[nextIndex]);
  };

  const handlePrev = () => {
    const prevIndex = (currentIndex - 1 + themeKeys.length) % themeKeys.length;
    onThemeChange(themeKeys[prevIndex]);
  };

  const currentThemeName = themes[currentThemeKey]?.name || 'Select Theme';

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center bg-bg-light/80 backdrop-blur-sm rounded-full shadow-lg">
      <button
        onClick={handlePrev}
        aria-label="Previous theme"
        className="px-3 py-2 text-text-base hover:text-primary transition-colors duration-200 rounded-l-full focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <span className="px-4 text-sm font-heading text-text-base whitespace-nowrap" aria-current="page">
        {currentThemeName}
      </span>

      <button
        onClick={handleNext}
        aria-label="Next theme"
        className="px-3 py-2 text-text-base hover:text-primary transition-colors duration-200 rounded-r-full focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};