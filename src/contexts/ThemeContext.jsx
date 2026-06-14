import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSettings } from './SettingsContext';
import { THEMES, DEFAULT_THEME } from '../constants/themes';

const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
  const { settings, updateSettings, isLoading } = useSettings();
  
  // Local state to ensure immediate UI updates before Firebase saves
  const [currentThemeId, setCurrentThemeId] = useState(() => {
    return localStorage.getItem('color_theme') || DEFAULT_THEME;
  });

  // Sync local state when settings loads or changes from elsewhere
  useEffect(() => {
    if (!isLoading && settings?.theme) {
      setCurrentThemeId(settings.theme);
      localStorage.setItem('color_theme', settings.theme);
    }
  }, [settings?.theme, isLoading]);

  const currentTheme = THEMES[currentThemeId] || THEMES[DEFAULT_THEME];

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-gradient-light', currentTheme.gradient);
    root.style.setProperty('--theme-gradient-dark', currentTheme.darkGradient);
    root.style.setProperty('--theme-accent', currentTheme.accent);
    root.style.setProperty('--theme-accent-dark', currentTheme.accentDark);
    root.style.setProperty('--theme-accent-light', currentTheme.accentLight);
    root.style.setProperty('--theme-accent-border', currentTheme.accentBorder);
    root.style.setProperty('--theme-toggle-on', currentTheme.toggleOn);
    root.style.setProperty('--theme-nav-active', currentTheme.navActive);
    root.style.setProperty('--theme-section-label', currentTheme.sectionLabel);
    root.style.setProperty('--theme-avatar-bg', currentTheme.avatarBg);
    root.style.setProperty('--theme-avatar-text', currentTheme.avatarText);

    // Explicitly override Tailwind's primary colors so classes like text-primary-500 work immediately
    root.style.setProperty('--color-primary-50', currentTheme.accentLight);
    root.style.setProperty('--color-primary-100', currentTheme.accentLight);
    root.style.setProperty('--color-primary-200', currentTheme.accentLight);
    root.style.setProperty('--color-primary-300', currentTheme.accentBorder);
    root.style.setProperty('--color-primary-400', currentTheme.accent);
    root.style.setProperty('--color-primary-500', currentTheme.accent);
    root.style.setProperty('--color-primary-600', currentTheme.accentDark);
    root.style.setProperty('--color-primary-700', currentTheme.accentDark);
    root.style.setProperty('--color-primary-800', currentTheme.accentDark);
    root.style.setProperty('--color-primary-900', currentTheme.accentDark);
  }, [currentTheme]);

  const setTheme = (id) => {
    setCurrentThemeId(id);
    localStorage.setItem('color_theme', id);
    const updates = { theme: id };
    
    // Auto-enable dark theme mode for Midnight, disable if switching away from Midnight
    // and currently in forced dark mode state.
    if (THEMES[id]?.forceDark) {
      updates.themeMode = 'dark';
    } else if (settings?.theme === 'midnight' && !THEMES[id]?.forceDark) {
      // If we are leaving midnight theme, we turn off dark mode to be nice.
      // (User can always turn it back on manually)
      updates.themeMode = 'light';
    }

    updateSettings(updates);
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}
