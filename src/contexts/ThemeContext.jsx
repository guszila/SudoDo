import { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
      // Sync the persisted theme into local state after the settings subscription resolves.
      // This is an intentional external-store synchronization.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentThemeId(settings.theme);
      localStorage.setItem('color_theme', settings.theme);
    }
  }, [settings?.theme, isLoading]);

  const currentTheme = THEMES[currentThemeId] || THEMES[DEFAULT_THEME];

  const applyThemeVariables = useCallback(() => {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark') || currentTheme.forceDark;

    root.style.setProperty('--theme-gradient-light', currentTheme.gradient);
    root.style.setProperty('--theme-gradient-dark', currentTheme.darkGradient);

    const activeAccent = isDark ? (currentTheme.darkAccent || currentTheme.accent) : currentTheme.accent;
    const activeAccentLight = isDark ? (currentTheme.darkAccentLight || currentTheme.accentLight) : currentTheme.accentLight;
    const activeNavActive = isDark ? (currentTheme.darkNavActive || currentTheme.darkAccent || currentTheme.navActive) : currentTheme.navActive;
    const activeSectionLabel = isDark ? (currentTheme.darkSectionLabel || currentTheme.darkAccent || currentTheme.sectionLabel) : currentTheme.sectionLabel;

    root.style.setProperty('--theme-accent', activeAccent);
    root.style.setProperty('--theme-accent-dark', isDark ? currentTheme.darkAccent : currentTheme.accentDark);
    root.style.setProperty('--theme-accent-light', activeAccentLight);
    root.style.setProperty('--theme-accent-border', currentTheme.accentBorder);
    root.style.setProperty('--theme-toggle-on', isDark ? activeAccent : currentTheme.toggleOn);
    root.style.setProperty('--theme-nav-active', activeNavActive);
    root.style.setProperty('--theme-section-label', activeSectionLabel);
    root.style.setProperty('--theme-avatar-bg', currentTheme.avatarBg);
    root.style.setProperty('--theme-avatar-text', currentTheme.avatarText);

    // Override Tailwind's primary colors with solid, high-contrast colors (never semi-transparent!)
    root.style.setProperty('--color-primary-50', activeAccentLight);
    root.style.setProperty('--color-primary-100', activeAccentLight);
    root.style.setProperty('--color-primary-200', isDark ? activeAccentLight : currentTheme.accentLight);
    root.style.setProperty('--color-primary-300', isDark ? activeAccentLight : currentTheme.accent);
    root.style.setProperty('--color-primary-400', activeAccent);
    root.style.setProperty('--color-primary-500', activeAccent);
    root.style.setProperty('--color-primary-600', isDark ? activeAccentLight : currentTheme.accentDark);
    root.style.setProperty('--color-primary-700', isDark ? activeAccentLight : currentTheme.accentDark);
    root.style.setProperty('--color-primary-800', isDark ? '#ffffff' : currentTheme.accentDark);
    root.style.setProperty('--color-primary-900', isDark ? '#ffffff' : currentTheme.accentDark);

    const baseColor = isDark
      ? (currentTheme.id === 'oled' ? '#09090b' : currentTheme.id === 'midnight' ? '#1a1a2e' : '#1e1b4b')
      : (currentTheme.id === 'teal' ? '#d4f5ee' : currentTheme.id === 'rose' ? '#ffe8f5' : currentTheme.id === 'blue' ? '#d4e8ff' : currentTheme.id === 'amber' ? '#fff0d4' : currentTheme.id === 'emerald' ? '#dcfce7' : currentTheme.id === 'mocha' ? '#f5ebe0' : '#e8d5f5');
    
    root.style.setProperty('--theme-base-color', baseColor);
    
    const metaTheme = document.querySelector('meta[name="theme-color"]:not([media])');
    if (metaTheme) {
      metaTheme.setAttribute('content', baseColor);
    }
  }, [currentTheme]);

  useEffect(() => {
    applyThemeVariables();

    // Listen for dark class additions/removals on documentElement (e.g. toggled in settings or system mode)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          applyThemeVariables();
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, [applyThemeVariables]);

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
