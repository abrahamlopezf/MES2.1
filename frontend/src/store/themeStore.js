import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const isThemePreference = (value) => ['light', 'dark', 'system'].includes(value);

const getSystemTheme = () => (
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
);

const applyTheme = (preference) => {
  const theme = preference === 'system' ? getSystemTheme() : preference;
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
  }
  return theme;
};

export const useThemeStore = create(
  persist(
    (set, get) => ({
      // `theme` is the resolved value consumed by existing chart components.
      // `themePreference` preserves the user's explicit/system choice.
      theme: applyTheme('dark'),
      themePreference: 'dark',
      toggleTheme: () =>
        get().setTheme(get().theme === 'light' ? 'dark' : 'light'),
      setTheme: (newTheme) =>
        isThemePreference(newTheme) && set({
          theme: applyTheme(newTheme),
          themePreference: newTheme,
        }),
    }),
    {
      name: 'tf-theme-storage',
      version: 1,
      partialize: ({ theme, themePreference }) => ({ theme, themePreference }),
      migrate: (persistedState) => ({
        ...persistedState,
        themePreference: isThemePreference(persistedState?.themePreference)
          ? persistedState.themePreference
          : (persistedState?.theme === 'light' ? 'light' : 'dark'),
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const preference = isThemePreference(state.themePreference) ? state.themePreference : 'dark';
        state.setTheme(preference);
      },
    }
  )
);

if (typeof window !== 'undefined' && window.matchMedia) {
  const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const onSystemThemeChange = () => {
    const state = useThemeStore.getState();
    if (state.themePreference === 'system') state.setTheme('system');
  };

  systemThemeQuery.addEventListener?.('change', onSystemThemeChange);
  // Safari versions before 14 use the legacy MediaQueryList listener API.
  if (!systemThemeQuery.addEventListener) systemThemeQuery.addListener?.(onSystemThemeChange);
}
