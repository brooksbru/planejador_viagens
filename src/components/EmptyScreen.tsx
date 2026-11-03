import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

/** Placeholder das abas enquanto as telas reais não existem. */
export function EmptyScreen({ title, hint }: { title: string; hint: string }) {
  const { colors, typography, layout, space } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
          paddingTop: insets.top + space[5],
          paddingHorizontal: layout.screenMargin,
          gap: space[2],
        },
      ]}
    >
      <Text style={[typography.heading, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[typography.body, { color: colors.textSecondary }]}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
