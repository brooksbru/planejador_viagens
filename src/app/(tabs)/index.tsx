import { StyleSheet, Text, View } from 'react-native';

import { EmptyScreen } from '@/components/EmptyScreen';
import { useTheme } from '@/theme';

/** Mapa vazio por enquanto. A amostra abaixo serve pra conferir as fontes embarcadas. */
export default function Mapa() {
  const { colors, typography, numbers, space, layout } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <EmptyScreen title="Mapa" hint="O mapa com a névoa chega na Fase 1." />
      <View style={{ padding: layout.screenMargin, gap: space[2] }}>
        <Text style={[typography.place, { color: colors.textPrimary }]}>
          Miradouro de Santa Luzia
        </Text>
        <View style={[styles.row, { gap: space[2] }]}>
          <Text
            style={[
              typography.displayXl,
              numbers.numHero,
              styles.hero,
              { color: colors.achievement },
            ]}
          >
            34%
          </Text>
          <Text style={[typography.bodyL, { color: colors.textSecondary }]}>aberto em Lisboa</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'baseline' },
  // Largura mínima pro número não empurrar o layout quando mudar (Fraunces é proporcional).
  hero: { minWidth: 96, textAlign: 'right' },
});
