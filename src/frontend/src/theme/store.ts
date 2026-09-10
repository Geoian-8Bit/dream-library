import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isStyleId, type StyleId } from './themes';

interface ThemeStore {
  styleId: StyleId;
  setStyle: (id: StyleId) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      styleId: 'clay',
      setStyle: (id) => set({ styleId: id }),
    }),
    {
      name: 'dream-library:style',
      // Si llega un valor antiguo o corrupto, caer al default.
      onRehydrateStorage: () => (state) => {
        if (state && !isStyleId(state.styleId)) state.styleId = 'clay';
      },
    },
  ),
);
