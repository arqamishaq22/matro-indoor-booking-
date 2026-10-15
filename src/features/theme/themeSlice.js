import { createSlice } from '@reduxjs/toolkit';

/**
 * Applies the current theme mode to the document root element (data attribute and class).
 */
export const applyThemeToDocument = (mode) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  root.classList.remove('light', 'dark');
  root.classList.add(mode);
};

/**
 * Resolves initial theme mode on startup:
 * 1. Read saved theme from localStorage
 * 2. Otherwise detect user's system preference
 * 3. Default to 'light' if no preference exists
 */
export const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';

  try {
    // 1. Read saved theme from localStorage ('theme' or legacy 'matro_theme')
    const saved = localStorage.getItem('theme') || localStorage.getItem('matro_theme');
    if (saved === 'light' || saved === 'dark') {
      applyThemeToDocument(saved);
      return saved;
    }

    // 2. Detect system preference
    if (window.matchMedia) {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        applyThemeToDocument('dark');
        return 'dark';
      }
      if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        applyThemeToDocument('light');
        return 'light';
      }
    }
  } catch {
    // Fallback if localStorage or matchMedia fails (e.g. strict privacy mode)
  }

  // 3. Default to light if no preference exists
  applyThemeToDocument('light');
  return 'light';
};

const initialTheme = getInitialTheme();

export const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    mode: initialTheme
  },
  reducers: {
    toggleTheme: (state) => {
      const nextMode = state.mode === 'dark' ? 'light' : 'dark';
      state.mode = nextMode;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('theme', nextMode);
        } catch {
          // Ignore write errors in restricted storage environments
        }
        applyThemeToDocument(nextMode);
      }
    },
    setTheme: (state, action) => {
      const nextMode = action.payload === 'dark' ? 'dark' : 'light';
      state.mode = nextMode;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('theme', nextMode);
        } catch {
          // Ignore write errors
        }
        applyThemeToDocument(nextMode);
      }
    }
  }
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
