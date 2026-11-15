/**
 * Tokens do design, traduzidos de docs/referencias/tokens/*.css.
 *
 * Os nomes são os mesmos do CSS em camelCase (--surface-raised → surfaceRaised)
 * pra facilitar a comparação. As regras de uso no fim dos arquivos CSS valem
 * aqui também; as principais estão repetidas nos comentários abaixo.
 */

// Cores ---------------------------------------------------------------------

export type ColorTokens = {
  bg: string;
  surface: string;
  surfaceRaised: string;
  border: string;

  action: string;
  /** No celular não existe hover: usamos como estado pressionado. */
  actionHover: string;
  onAction: string;

  /** Só em check-in feito, % desbloqueado e conquista. Nunca em botão comum. */
  achievement: string;
  achievementHover: string;
  onAchievement: string;

  fog: string;
  /** Obrigatório no tema claro (névoa quase branca sobre areia). */
  fogOutline: string;

  locked: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  success: string;
  danger: string;
  warning: string;

  /** Paisagem do mapa (estilo do Mapbox, em versão mais lavada). Nunca na interface. */
  terrainWater: string;
  terrainOlive: string;
  terrainForest: string;
  terrainSand: string;
};

const dark: ColorTokens = {
  bg: '#0C2630',
  surface: '#16404E',
  surfaceRaised: '#1F5464',
  border: '#2A5A6B',

  action: '#00C8FF',
  actionHover: '#4FD9FF',
  onAction: '#002733',

  achievement: '#8AEE1F',
  achievementHover: '#9DF53F',
  onAchievement: '#182D0A',

  fog: '#E4DECE',
  fogOutline: 'transparent',

  locked: '#4A7F8C',

  textPrimary: '#EFEADC',
  textSecondary: '#A9BFC6',
  textMuted: '#7F9BA4',

  success: '#8AEE1F',
  danger: '#FF7B8F',
  warning: '#F0B429',

  terrainWater: '#356879',
  terrainOlive: '#617E2A',
  terrainForest: '#28441A',
  terrainSand: '#D4CEB7',
};

const light: ColorTokens = {
  bg: '#F2EEE2',
  surface: '#FBF8F0',
  surfaceRaised: '#FFFFFF',
  border: '#D8D1C0',

  action: '#00768F',
  actionHover: '#005C71',
  onAction: '#FFFFFF',

  achievement: '#3F7A14',
  achievementHover: '#33630F',
  onAchievement: '#FFFFFF',

  fog: '#FBF8F0',
  fogOutline: '#9DA893',

  locked: '#5A7E88',

  textPrimary: '#152A32',
  textSecondary: '#42606C',
  textMuted: '#52707C',

  success: '#3F7A14',
  danger: '#B3243C',
  warning: '#8A5A00',

  terrainWater: '#8FB0BA',
  terrainOlive: '#A9C077',
  terrainForest: '#7FA954',
  terrainSand: '#EDE6D8',
};

export const colors = { dark, light };

// Tipografia ----------------------------------------------------------------

/**
 * No Android cada peso é uma família própria (o nome é o do arquivo em
 * assets/fonts), por isso o peso vai no fontFamily e não em fontWeight.
 * Só três pesos por família (regra 5).
 */
export const fonts = {
  ui400: 'HankenGrotesk-Regular',
  ui500: 'HankenGrotesk-Medium',
  ui600: 'HankenGrotesk-SemiBold',
  /** Fraunces com SOFT 45 e WONK 1 já aplicados (scripts/fonts). */
  display600: 'Fraunces-SemiBold',
  display700: 'Fraunces-Bold',
} as const;

type TextToken = { fontFamily: string; fontSize: number; lineHeight: number };

/**
 * Fraunces só em número, nome de lugar e título de conquista, e nunca abaixo
 * de 20px (regras 1 e 2). Corpo de texto nunca abaixo de 15px; 11px só em
 * rótulo curto e maiúsculo (regra 3).
 */
export const typography = {
  // Fraunces
  displayXl: { fontFamily: fonts.display700, fontSize: 44, lineHeight: 48 },
  displayL: { fontFamily: fonts.display700, fontSize: 28, lineHeight: 32 },
  place: { fontFamily: fonts.display600, fontSize: 24, lineHeight: 30 },
  achievement: { fontFamily: fonts.display600, fontSize: 20, lineHeight: 26 },

  // Hanken Grotesk
  heading: { fontFamily: fonts.ui600, fontSize: 19, lineHeight: 26 },
  bodyL: { fontFamily: fonts.ui400, fontSize: 17, lineHeight: 26 },
  body: { fontFamily: fonts.ui400, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.ui600, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.ui400, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: fonts.ui500, fontSize: 11, lineHeight: 14 },
} satisfies Record<string, TextToken>;

/**
 * Números.
 * numHero: número isolado (perfil, card de cidade, conquista). Fraunces é
 *   proporcional, então o container precisa de largura mínima pra não empurrar
 *   o layout quando o número muda. Nunca animar a contagem (regra 7).
 * numList: número em coluna. Hanken Grotesk com algarismos tabulares.
 */
export const numbers = {
  numHero: { fontFamily: fonts.display700 },
  numList: { fontFamily: fonts.ui400, fontVariant: ['tabular-nums' as const] },
};

// Espaçamento e forma (grade de 4: valor fora da grade é bug) ---------------

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
} as const;

export const layout = {
  /** Alvo de toque mínimo, mesmo com ícone menor (vale pros pinos). */
  touchMin: 48,
  screenMargin: space[4],
  cardPadding: space[4],
} as const;

export const radius = {
  card: 12,
  control: 8,
  pill: 999,
} as const;
