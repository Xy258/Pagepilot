import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type Palette = 'Natural' | 'Obsidian' | 'Snow' | 'Midnight';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  palette: Palette;
  setPalette: (p: Palette) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [palette, setPaletteState] = useState<Palette>(() => {
    return (localStorage.getItem('palette') as Palette) || 'Natural';
  });

  const setPalette = (p: Palette) => {
    setPaletteState(p);
    if (p === 'Obsidian' || p === 'Midnight') setTheme('dark');
    if (p === 'Snow' || p === 'Natural') setTheme('light');
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.setAttribute('data-palette', palette);
    localStorage.setItem('theme', theme);
    localStorage.setItem('palette', palette);
  }, [theme, palette]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, palette, setPalette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

