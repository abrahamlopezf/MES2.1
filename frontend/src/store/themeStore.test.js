import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useThemeStore } from './themeStore';

describe('theme preference', () => {
  beforeEach(() => {
    localStorage.removeItem('tf-theme-storage');
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
    useThemeStore.getState().setTheme('dark');
  });

  it('keeps explicit light and dark selections', () => {
    useThemeStore.getState().setTheme('light');
    expect(useThemeStore.getState()).toMatchObject({ theme: 'light', themePreference: 'light' });
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    useThemeStore.getState().setTheme('dark');
    expect(useThemeStore.getState()).toMatchObject({ theme: 'dark', themePreference: 'dark' });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('resolves automatic mode from the operating system without persisting a false explicit choice', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    useThemeStore.getState().setTheme('system');

    expect(useThemeStore.getState()).toMatchObject({ theme: 'dark', themePreference: 'system' });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(JSON.parse(localStorage.getItem('tf-theme-storage')).state.themePreference).toBe('system');

    window.matchMedia.mockReturnValue({ matches: false });
    useThemeStore.getState().setTheme('system');
    expect(useThemeStore.getState().theme).toBe('light');
    expect(useThemeStore.getState().themePreference).toBe('system');
  });

  it('ignores unsupported theme preferences', () => {
    useThemeStore.getState().setTheme('contrast');
    expect(useThemeStore.getState().themePreference).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
