import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { colors, layout, numbers, radius, space, typography, type ColorTokens } from './tokens';

/** Preferência da pessoa. Escuro é o padrão do app, não o do sistema. */
export type ThemeMode = 'dark' | 'light' | 'system';
export type ColorScheme = 'dark' | 'light';

export type Theme = {
  mode: ThemeMode;
  scheme: ColorScheme;
  colors: ColorTokens;
  typography: typeof typography;
  numbers: typeof numbers;
  space: typeof space;
  layout: typeof layout;
  radius: typeof radius;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<Theme | null>(null);

export function resolveScheme(mode: ThemeMode, system: string | null | undefined): ColorScheme {
  if (mode !== 'system') return mode;
  return system === 'light' ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // A persistência da escolha entra junto com a tela de Perfil (Fase 5).
  const [mode, setMode] = useState<ThemeMode>('dark');
  const system = useColorScheme();
  const scheme = resolveScheme(mode, system);

  const theme = useMemo<Theme>(
    () => ({
      mode,
      scheme,
      colors: colors[scheme],
      typography,
      numbers,
      space,
      layout,
      radius,
      setMode,
    }),
    [mode, scheme],
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme precisa estar dentro de <ThemeProvider>');
  return theme;
}
