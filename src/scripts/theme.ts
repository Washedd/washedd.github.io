import { isThemeName, type ThemeName } from '../lib/types';

const STORAGE_KEY = 'ethanos-theme';

export function readTheme(): ThemeName {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isThemeName(stored)) {
      return stored;
    }
  } catch {
    return 'dark';
  }
  return 'dark';
}

export function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    return;
  }
}
