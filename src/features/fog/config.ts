/**
 * Parâmetros da névoa que são decisão de produto. Ficam juntos aqui pra
 * serem fáceis de ajustar.
 */
export const FOG_CONFIG = {
  /** Raio, em metros, da área que um check-in abre de forma permanente. */
  holeRadiusMeters: 300,
  /** Raio mínimo na tela (pontos), pra área aberta não sumir com o zoom longe. */
  minHoleRadiusPx: 5,
  /** Redução da resolução de render da névoa. 2 = metade em cada eixo. */
  renderScale: 2,
} as const;
